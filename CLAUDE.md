# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClipToWSL is an MCP (Model Context Protocol) server that enables coding agents like Claude Code to read Windows clipboard contents from within WSL. The system consists of two components:

1. **Windows Clipboard Reader**: C++ executable that accesses Windows clipboard via Win32 API
2. **MCP Server**: TypeScript/Node.js server that communicates with the executable and exposes clipboard functionality to MCP clients

## Architecture

- **Communication**: stdin/stdout with JSON-RPC between WSL MCP server and Windows executable
- **Binary Data**: Base64 encoding for images, UTF-8 for text
- **Cross-compilation**: Windows executable built from WSL using MinGW-w64
- **Transport**: MCP stdio transport protocol

## Development Setup

### Prerequisites
```bash
# Install cross-compiler for Windows executables
sudo apt update
sudo apt install gcc-mingw-w64-x86-64-posix g++-mingw-w64-x86-64-posix

# Install Node.js 18+ and TypeScript
npm install -g typescript
```

### Build Commands

**Cross-compile Windows executable:**
```bash
cd clipboard-reader
x86_64-w64-mingw32-g++ --static -O2 -std=c++17 \
  -I./src \
  -o clipreader.exe \
  src/main.cpp src/clipboard.cpp src/base64.cpp \
  -lole32 -lgdi32 -lgdiplus -luser32
```

**Build MCP server:**
```bash
cd mcp-server
npm install
npm run build
```

**Test the system:**
```bash
# Test Windows executable directly
echo '{"method":"read_clipboard","id":1}' | /mnt/c/path/to/clipreader.exe

# Test MCP server
node mcp-server/dist/index.js
```

## Repository Structure

- `docs/` - Documentation including implementation plan
- `clipboard-reader/` - C++ Windows executable source code
- `mcp-server/` - TypeScript MCP server source code
- `shared/` - Shared configuration files
- `IMPLEMENTATION_PLAN.md` - Detailed implementation guide with checklists

## Key Implementation Details

### Technology Stack
- **Windows Component**: C++ with Win32 API, cross-compiled using MinGW-w64
- **MCP Server**: TypeScript/Node.js with @modelcontextprotocol/sdk
- **Communication**: JSON-RPC over stdin/stdout pipes
- **Image Handling**: PNG conversion with Base64 encoding

### JSON-RPC Protocol
- Request: `{"jsonrpc":"2.0","method":"read_clipboard","id":1}`
- Image Response: Base64-encoded PNG data with metadata
- Text Response: UTF-8 encoded text with metadata
- Error handling with proper JSON-RPC error codes

### Claude Code Integration
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "clip-to-wsl": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "CLIPBOARD_EXE_PATH": "/mnt/c/path/to/clipreader.exe"
      }
    }
  }
}
```

## Development Notes

- Windows executable must be built with static linking to avoid runtime dependencies
- MCP server manages child process lifecycle and handles stdin/stdout communication
- Base64 encoding is used for binary image data to work with JSON-RPC protocol
- Process communication includes proper error handling and graceful shutdown
- Cross-platform file paths require careful handling between WSL and Windows

Refer to `IMPLEMENTATION_PLAN.md` for complete implementation details with phase-by-phase checklists.