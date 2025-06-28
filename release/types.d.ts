export type ClipboardDataType = 'text' | 'image' | 'empty';
export interface ClipboardImageData {
    type: 'image';
    data: string;
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
export declare class ClipboardError extends Error {
    readonly code: number;
    readonly data?: any | undefined;
    constructor(message: string, code?: number, data?: any | undefined);
}
//# sourceMappingURL=types.d.ts.map