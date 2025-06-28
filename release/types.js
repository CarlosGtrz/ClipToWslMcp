export class ClipboardError extends Error {
    code;
    data;
    constructor(message, code = -32603, data) {
        super(message);
        this.code = code;
        this.data = data;
        this.name = 'ClipboardError';
    }
}
//# sourceMappingURL=types.js.map