import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import {
  ClipboardResult,
  ClipboardManagerConfig,
  ClipboardError,
  JsonRpcRequest,
  JsonRpcResponse
} from './types.js';

export class ClipboardManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private requestId = 1;
  private pendingRequests = new Map<number, {
    resolve: (value: ClipboardResult) => void;
    reject: (error: ClipboardError) => void;
    timeout: NodeJS.Timeout;
  }>();
  private config: Required<ClipboardManagerConfig>;
  private isStarting = false;
  private isShuttingDown = false;

  constructor(config: ClipboardManagerConfig) {
    super();
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      healthCheckInterval: 60000,
      ...config
    };
  }

  async start(): Promise<void> {
    if (this.process || this.isStarting) {
      return;
    }

    this.isStarting = true;
    try {
      await this.spawnProcess();
      this.emit('started');
    } finally {
      this.isStarting = false;
    }
  }

  private async spawnProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.process = spawn(this.config.executablePath, [], {
          stdio: ['pipe', 'pipe', 'pipe'],
          windowsHide: true
        });

        if (!this.process.stdin || !this.process.stdout || !this.process.stderr) {
          throw new ClipboardError('Failed to access process stdio streams');
        }

        this.process.stdout.setEncoding('utf8');
        this.process.stderr.setEncoding('utf8');

        let responseBuffer = '';
        this.process.stdout.on('data', (data: string) => {
          responseBuffer += data;
          this.processResponses(responseBuffer);
        });

        this.process.stderr.on('data', (data: string) => {
          console.error('Clipboard reader stderr:', data);
          this.emit('error', new ClipboardError(`Process error: ${data}`));
        });

        this.process.on('error', (error) => {
          console.error('Process spawn error:', error);
          this.emit('error', new ClipboardError(`Process spawn failed: ${error.message}`));
          reject(error);
        });

        this.process.on('exit', (code, signal) => {
          console.log(`Process exited with code ${code}, signal ${signal}`);
          this.cleanup();
          if (!this.isShuttingDown) {
            this.emit('unexpected-exit', { code, signal });
          }
        });

        // Give the process a moment to start
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            resolve();
          } else {
            reject(new ClipboardError('Process failed to start properly'));
          }
        }, 1000);

      } catch (error) {
        reject(error instanceof ClipboardError ? error : new ClipboardError(`Spawn error: ${error}`));
      }
    });
  }

  private processResponses(buffer: string): void {
    const lines = buffer.split('\n');
    
    // Keep the last incomplete line in the buffer
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        try {
          const response: JsonRpcResponse = JSON.parse(line);
          this.handleResponse(response);
        } catch (error) {
          console.error('Failed to parse JSON response:', line, error);
        }
      }
    }
  }

  private handleResponse(response: JsonRpcResponse): void {
    const pending = this.pendingRequests.get(response.id);
    if (!pending) {
      console.warn('Received response for unknown request ID:', response.id);
      return;
    }

    this.pendingRequests.delete(response.id);
    clearTimeout(pending.timeout);

    if (response.error) {
      pending.reject(new ClipboardError(
        response.error.message,
        response.error.code,
        response.error.data
      ));
      return;
    }

    if (!response.result) {
      pending.reject(new ClipboardError('Response missing result'));
      return;
    }

    try {
      const result = this.parseClipboardResult(response.result);
      pending.resolve(result);
    } catch (error) {
      pending.reject(error instanceof ClipboardError ? error : 
        new ClipboardError(`Failed to parse result: ${error}`));
    }
  }

  private parseClipboardResult(result: any): ClipboardResult {
    if (!result.type) {
      throw new ClipboardError('Result missing type field');
    }

    switch (result.type) {
      case 'text':
        if (typeof result.data !== 'string') {
          throw new ClipboardError('Text result missing or invalid data field');
        }
        return {
          type: 'text',
          data: result.data,
          encoding: result.encoding || 'utf-8',
          size: result.size || result.data.length
        };

      case 'image':
        if (typeof result.data !== 'string') {
          throw new ClipboardError('Image result missing or invalid data field');
        }
        return {
          type: 'image',
          data: result.data,
          mimeType: result.mimeType || 'image/png',
          width: result.width,
          height: result.height,
          size: result.size || 0
        };

      case 'empty':
        return {
          type: 'empty',
          message: result.message || 'Clipboard is empty'
        };

      default:
        throw new ClipboardError(`Unknown result type: ${result.type}`);
    }
  }

  async readClipboard(format: 'auto' | 'text' | 'image' = 'auto'): Promise<ClipboardResult> {
    if (!this.process) {
      await this.start();
    }

    if (!this.process || !this.process.stdin) {
      throw new ClipboardError('Process not available');
    }

    const requestId = this.requestId++;
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'read_clipboard',
      params: { format },
      id: requestId
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new ClipboardError('Request timeout'));
      }, this.config.timeout);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      try {
        const requestLine = JSON.stringify(request) + '\n';
        this.process!.stdin!.write(requestLine);
      } catch (error) {
        this.pendingRequests.delete(requestId);
        clearTimeout(timeout);
        reject(new ClipboardError(`Failed to send request: ${error}`));
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.process || this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new ClipboardError('Manager shutting down'));
    }
    this.pendingRequests.clear();

    // Try graceful shutdown first
    if (this.process.stdin) {
      this.process.stdin.end();
    }

    // Wait a bit for graceful shutdown
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill();
        }
        resolve();
      }, 5000);

      if (this.process) {
        this.process.once('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      } else {
        clearTimeout(timeout);
        resolve();
      }
    });

    this.cleanup();
    this.emit('stopped');
  }

  private cleanup(): void {
    this.process = null;
    this.isShuttingDown = false;

    // Clear any remaining pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new ClipboardError('Process terminated'));
    }
    this.pendingRequests.clear();
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.readClipboard();
      return true;
    } catch (error) {
      return false;
    }
  }
}