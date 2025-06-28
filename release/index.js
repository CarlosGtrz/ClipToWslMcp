#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ClipboardManager } from './clipboard-manager.js';
import { ClipboardError } from './types.js';
import path from 'path';
// Configuration
const CLIPBOARD_EXE_PATH = process.env.CLIPBOARD_EXE_PATH ||
    path.join(process.cwd(), '..', 'clipboard-reader', 'clipreader.exe');
// Tool schema
const ReadClipboardSchema = z.object({
    format: z.enum(['auto', 'text', 'image']).optional().default('auto'),
});
class ClipToWSLServer {
    server;
    clipboardManager;
    constructor() {
        this.server = new Server({
            name: 'clip-to-wsl',
            version: '1.0.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.clipboardManager = new ClipboardManager({
            executablePath: CLIPBOARD_EXE_PATH,
            timeout: 30000,
            retryAttempts: 3,
        });
        this.setupEventHandlers();
        this.setupRequestHandlers();
    }
    setupEventHandlers() {
        this.clipboardManager.on('error', (error) => {
            console.error('ClipboardManager error:', error);
        });
        this.clipboardManager.on('unexpected-exit', ({ code, signal }) => {
            console.warn(`Clipboard process exited unexpectedly: code=${code}, signal=${signal}`);
        });
        process.on('SIGINT', async () => {
            console.log('Received SIGINT, shutting down...');
            await this.shutdown();
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            console.log('Received SIGTERM, shutting down...');
            await this.shutdown();
            process.exit(0);
        });
    }
    setupRequestHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: 'read_clipboard',
                        description: 'Read the current Windows clipboard content (text or image)',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                format: {
                                    type: 'string',
                                    enum: ['auto', 'text', 'image'],
                                    default: 'auto',
                                    description: 'Format to read from clipboard (auto=detect best format, text=force text, image=force image)',
                                },
                            },
                            additionalProperties: false,
                        },
                    },
                ],
            };
        });
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;
            if (name !== 'read_clipboard') {
                throw new Error(`Unknown tool: ${name}`);
            }
            try {
                const { format } = ReadClipboardSchema.parse(args || {});
                const result = await this.clipboardManager.readClipboard(format);
                const toolResult = {
                    content: [],
                    isError: false,
                };
                switch (result.type) {
                    case 'text':
                        toolResult.content.push({
                            type: 'text',
                            text: result.data,
                        });
                        break;
                    case 'image':
                        toolResult.content.push({
                            type: 'image',
                            data: result.data,
                            mimeType: result.mimeType,
                        });
                        break;
                    case 'empty':
                        toolResult.content.push({
                            type: 'text',
                            text: result.message,
                        });
                        break;
                    default:
                        throw new Error(`Unexpected result type: ${result.type}`);
                }
                return toolResult;
            }
            catch (error) {
                console.error('Tool execution error:', error);
                const errorMessage = error instanceof ClipboardError
                    ? error.message
                    : `Clipboard read failed: ${error}`;
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${errorMessage}`,
                        },
                    ],
                    isError: true,
                };
            }
        });
    }
    async start() {
        console.log('Starting ClipToWSL MCP Server...');
        console.log(`Clipboard executable path: ${CLIPBOARD_EXE_PATH}`);
        try {
            // Start the clipboard manager
            await this.clipboardManager.start();
            console.log('ClipboardManager started successfully');
            // Test the connection
            const healthCheck = await this.clipboardManager.healthCheck();
            if (healthCheck) {
                console.log('Health check passed');
            }
            else {
                console.warn('Health check failed, but continuing anyway');
            }
            // Connect to MCP transport
            const transport = new StdioServerTransport();
            await this.server.connect(transport);
            console.log('ClipToWSL MCP Server running');
        }
        catch (error) {
            console.error('Failed to start server:', error);
            throw error;
        }
    }
    async shutdown() {
        console.log('Shutting down ClipToWSL MCP Server...');
        try {
            await this.clipboardManager.stop();
            console.log('ClipboardManager stopped');
        }
        catch (error) {
            console.error('Error stopping ClipboardManager:', error);
        }
        try {
            await this.server.close();
            console.log('MCP Server closed');
        }
        catch (error) {
            console.error('Error closing MCP Server:', error);
        }
    }
}
// Main execution
async function main() {
    const server = new ClipToWSLServer();
    try {
        await server.start();
    }
    catch (error) {
        console.error('Server failed to start:', error);
        process.exit(1);
    }
}
// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch((error) => {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}
//# sourceMappingURL=index.js.map