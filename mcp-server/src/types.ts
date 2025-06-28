export type ClipboardDataType = 'text' | 'image' | 'empty';

export interface ClipboardImageData {
  type: 'image';
  data: string; // Base64 encoded PNG data
  mimeType: string;
  width?: number;
  height?: number;
  size: number;
}

export interface ClipboardTextData {
  type: 'text';
  data: string;
  encoding: string;
  size: number;
}

export interface ClipboardEmptyData {
  type: 'empty';
  message: string;
}

export type ClipboardResult = ClipboardImageData | ClipboardTextData | ClipboardEmptyData;

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: any;
  id: number;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number;
}

export interface ClipboardManagerConfig {
  executablePath: string;
  timeout?: number;
  retryAttempts?: number;
  healthCheckInterval?: number;
}

export class ClipboardError extends Error {
  constructor(
    message: string,
    public readonly code: number = -32603,
    public readonly data?: any
  ) {
    super(message);
    this.name = 'ClipboardError';
  }
}