# ClipToWSL MCP Server

ClipToWSL is a Model Context Protocol (MCP) server that enables AI coding agents like Claude Code to read Windows clipboard contents from within WSL (Windows Subsystem for Linux). This allows seamless access to clipboard data including text and images when working in WSL environments.

> **Quick Start**: For easy installation, download the [release package](release/) which includes pre-built binaries and automated setup scripts.

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

### Option 1: Quick Install (Recommended)

Download the [release package](release/) which includes pre-built binaries:

```bash
# 1. Download and extract the release package
wget <release-url> # or download manually
unzip clip-to-wsl-mcp-release.zip
cd release/

# 2. Run the automated installer
./install.sh

# 3. Follow the configuration instructions printed by the installer
```

The installer will:
- Install Node.js dependencies
- Set executable permissions
- Generate Claude Code configuration template
- Provide next steps for setup

### Option 2: Build from Source

For development or customization:

```bash
# 1. Clone the repository
git clone <repository-url>
cd ClipToWslMcp

# 2. Install build dependencies
sudo apt update
sudo apt install gcc-mingw-w64-x86-64-posix g++-mingw-w64-x86-64-posix
npm install -g typescript

# 3. Install Node.js dependencies
cd mcp-server && npm install && cd ..

# 4. Build the project
./create-release.sh  # Creates optimized release build
```

## Configuration

### Claude Code Integration

Add the following configuration to your Claude Code settings:

**Linux/WSL**: `~/.config/claude-desktop/claude_desktop_config.json`
**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

#### For Release Package Installation:
```json
{
  "mcpServers": {
    "clip-to-wsl": {
      "command": "node",
      "args": ["/path/to/release/index.js"],
      "env": {
        "CLIPBOARD_EXE_PATH": "/path/to/release/clipreader.exe"
      }
    }
  }
}
```

#### For Source Build Installation:
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

**Important**: Replace the paths with your actual installation directory. The automated installer creates a `claude-config-example.json` file with the correct paths for your system.

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
│   ├── Makefile            # Build configuration with optimizations
│   └── clipreader.exe      # Built executable (after build)
├── mcp-server/             # TypeScript MCP server
│   ├── src/
│   │   ├── index.ts        # Main server
│   │   ├── clipboard-manager.ts  # Process management
│   │   └── types.ts        # Type definitions
│   ├── dist/               # Compiled JavaScript (after build)
│   ├── package.json
│   └── tsconfig.json
├── release/                # Ready-to-use release package
│   ├── index.js           # Compiled MCP server
│   ├── clipreader.exe     # Optimized Windows executable
│   ├── package.json       # Runtime dependencies only
│   ├── install.sh         # Automated installer
│   └── README.md          # Installation instructions
├── create-release.sh       # Automated release builder
├── shared/                 # Shared configuration
│   └── config.json         # Claude Code config template
└── docs/                   # Documentation
```

### Building from Source

1. Install development dependencies (MinGW-w64, Node.js, TypeScript)
2. Cross-compile the Windows executable using MinGW-w64
3. Build the TypeScript MCP server
4. Use `./create-release.sh` to create optimized release package
5. Test integration between components

### Creating Release Package

The automated release builder creates a distribution-ready package:

```bash
./create-release.sh
```

This script:
- Builds optimized Windows executable with size optimization
- Compiles TypeScript to JavaScript
- Creates release package with runtime dependencies only
- Generates installation scripts and documentation
- Produces a standalone package ready for distribution

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