# ClipToWSL

ClipToWSL is a Model Context Protocol (MCP) server that enables AI coding agents like Claude Code to read Windows clipboard contents from within WSL (Windows Subsystem for Linux). This allows seamless access to clipboard data including text and images when working in WSL environments.

## Features

- **Cross-platform clipboard access**: Read Windows clipboard from WSL
- **Multiple content types**: Support for text and image clipboard data
- **Base64 image encoding**: Automatic PNG conversion and Base64 encoding for images
- **MCP protocol compliance**: Full integration with Claude Code and other MCP clients
- **Robust process management**: Automatic process lifecycle management with health checks
- **Error handling**: Comprehensive error handling and recovery mechanisms

## Architecture

The system consists of two main components:

1. **Windows Clipboard Reader** (`clipboard-reader/`): A C++ executable that uses Win32 APIs to access the Windows clipboard
2. **MCP Server** (`mcp-server/`): A TypeScript/Node.js server that manages the Windows executable and exposes clipboard functionality via MCP protocol

Communication between components uses JSON-RPC over stdin/stdout pipes.

## Prerequisites

### For Development/Building:
- WSL (Windows Subsystem for Linux)
- Ubuntu/Debian-based WSL distribution
- MinGW-w64 cross-compiler for Windows
- Node.js 18+
- TypeScript

### For Usage:
- WSL environment
- Node.js 18+
- Claude Code or other MCP-compatible client

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ClipToWslMcp
```

### 2. Install Dependencies

```bash
# Install system dependencies for building
sudo apt update
sudo apt install gcc-mingw-w64-x86-64-posix g++-mingw-w64-x86-64-posix

# Install Node.js dependencies
npm install -g typescript
cd mcp-server && npm install
```

### 3. Build the Project

```bash
# Build both components
npm run build

# Or build individually:
# Build Windows executable
cd clipboard-reader && ./build.sh

# Build MCP server
cd mcp-server && npm run build
```

## Configuration

### Claude Code Integration

Add the following configuration to your Claude Code settings:

**Linux/WSL**: `~/.config/claude-desktop/config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "clip-to-wsl": {
      "command": "node",
      "args": ["/full/path/to/ClipToWslMcp/mcp-server/dist/index.js"],
      "env": {
        "CLIPBOARD_EXE_PATH": "/full/path/to/ClipToWslMcp/clipboard-reader/clipreader.exe"
      }
    }
  }
}
```

**Important**: Replace `/full/path/to/ClipToWslMcp` with the actual absolute path to your ClipToWSL installation.

### Environment Variables

- `CLIPBOARD_EXE_PATH`: Path to the Windows clipboard reader executable (required)

## Usage

Once configured, the `read_clipboard` tool will be available in Claude Code:

### Text Clipboard
When you copy text to the Windows clipboard, you can ask Claude Code:
- "What's in my clipboard?"
- "Read the clipboard content"
- "Use the text from my clipboard"

### Image Clipboard
When you copy an image (screenshot, copied image, etc.), Claude Code can:
- View and analyze the image
- Describe what's in the image
- Process the image data

### Tool Parameters

The `read_clipboard` tool accepts an optional `format` parameter:
- `"auto"` (default): Automatically detect and return the best available format
- `"text"`: Force reading as text only
- `"image"`: Force reading as image only

## Testing

### Test the Windows Executable
```bash
cd clipboard-reader
echo '{"jsonrpc":"2.0","method":"read_clipboard","id":1}' | ./clipreader.exe
```

### Test the MCP Server
```bash
node test-server.js
```

### Test Integration
```bash
cd mcp-server
npm start
# In another terminal, send MCP requests to test functionality
```

## Troubleshooting

### Common Issues

1. **"Command not found" errors**
   - Ensure MinGW-w64 is properly installed: `x86_64-w64-mingw32-g++ --version`
   - Check that all paths in configuration are absolute paths

2. **Process communication timeout**
   - Verify the executable path is correct and accessible
   - Check that the Windows executable has proper permissions
   - Ensure the executable can run (test with direct execution)

3. **MCP tool not appearing in Claude Code**
   - Verify the configuration path and syntax
   - Check Claude Code logs for MCP server startup errors
   - Restart Claude Code after configuration changes

4. **Clipboard access failures**
   - Ensure you're running from within WSL with access to Windows clipboard
   - Check that Windows clipboard contains data
   - Verify no other applications are blocking clipboard access

### Debug Commands

```bash
# Check if executable was built successfully
ls -la clipboard-reader/clipreader.exe

# Test executable directly
echo '{"method":"read_clipboard","id":1}' | /path/to/clipreader.exe

# Check MCP server startup
cd mcp-server && node dist/index.js

# Monitor process communication
ps aux | grep clipreader
```

### Logs

The MCP server provides console logging for debugging:
- Process startup and shutdown events
- Health check results
- Error messages and stack traces
- Request/response communication logs

## Development

### Project Structure
```
ClipToWslMcp/
├── clipboard-reader/        # C++ Windows executable
│   ├── src/
│   │   ├── main.cpp        # JSON-RPC communication
│   │   ├── clipboard.cpp   # Windows clipboard access
│   │   ├── clipboard.h
│   │   ├── base64.cpp      # Base64 encoding
│   │   └── base64.h
│   ├── Makefile            # Build configuration
│   └── build.sh            # Build script
├── mcp-server/             # TypeScript MCP server
│   ├── src/
│   │   ├── index.ts        # Main server
│   │   ├── clipboard-manager.ts  # Process management
│   │   └── types.ts        # Type definitions
│   ├── package.json
│   └── tsconfig.json
├── shared/                 # Shared configuration
│   └── config.json         # Claude Code config template
└── docs/                   # Documentation
```

### Building from Source

1. Install development dependencies
2. Cross-compile the Windows executable using MinGW-w64
3. Build the TypeScript MCP server
4. Test integration between components

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Security Considerations

- The Windows executable runs with minimal permissions
- Clipboard data is processed locally without network transmission
- Process isolation prevents access to sensitive WSL environment
- Input validation prevents injection attacks
- Resource limits prevent memory exhaustion

## Performance

- **Memory usage**: Optimized for large images with streaming processing
- **Startup time**: Process reuse minimizes initialization overhead
- **Image handling**: Efficient PNG compression and Base64 encoding
- **Error recovery**: Automatic process restart on failures

## License

MIT License - see LICENSE file for details.

## Support

For issues, bug reports, or feature requests, please create an issue in the repository.