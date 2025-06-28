import { EventEmitter } from 'events';
import { ClipboardResult, ClipboardManagerConfig } from './types.js';
export declare class ClipboardManager extends EventEmitter {
    private process;
    private requestId;
    private pendingRequests;
    private config;
    private isStarting;
    private isShuttingDown;
    constructor(config: ClipboardManagerConfig);
    start(): Promise<void>;
    private spawnProcess;
    private processResponses;
    private handleResponse;
    private parseClipboardResult;
    readClipboard(format?: 'auto' | 'text' | 'image'): Promise<ClipboardResult>;
    stop(): Promise<void>;
    private cleanup;
    isRunning(): boolean;
    healthCheck(): Promise<boolean>;
}
//# sourceMappingURL=clipboard-manager.d.ts.map