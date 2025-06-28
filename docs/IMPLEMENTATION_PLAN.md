# ClipToWSL MCP Implementation Plan

## Overview

ClipToWSL is an MCP (Model Context Protocol) server that enables coding agents like Claude Code to read Windows clipboard contents from within WSL. The system uses stdin/stdout communication between a WSL-hosted MCP server and a Windows executable that accesses the clipboard via Windows APIs.

## Architecture

### Communication Flow
```
Claude Code → WSL MCP Server → Windows Clipboard Reader Exe → Windows Clipboard API
                ↑ JSON-RPC over stdin/stdout ↑
```

### Technology Stack
- **Windows Clipboard Reader**: C++ with Win32 API, cross-compiled from WSL using MinGW-w64
- **MCP Server**: TypeScript/Node.js using @modelcontextprotocol/sdk
- **Communication**: stdin/stdout with JSON-RPC messages
- **Binary Data**: Base64 encoding for images, UTF-8 for text
- **Transport**: MCP stdio transport

### Project Structure
```
/
├── docs/
│   ├── Improved prompt.txt
│   └── IMPLEMENTATION_PLAN.md
├── clipboard-reader/           # C++ Windows executable
│   ├── src/
│   │   ├── main.cpp
│   │   ├── clipboard.cpp
│   │   ├── clipboard.h
│   │   ├── base64.cpp
│   │   └── base64.h
│   ├── CMakeLists.txt
│   ├── Makefile
│   └── build.sh
├── mcp-server/                # TypeScript MCP server
│   ├── src/
│   │   ├── index.ts
│   │   ├── clipboard-manager.ts
│   │   └── types.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── build/
│   └── dist/
├── shared/                    # Shared configuration
│   └── config.json
├── CLAUDE.md
├── README.md
└── package.json
```

## Implementation Phases

### Phase 1: Development Environment Setup

**Objective**: Prepare the development environment for cross-compilation and MCP development.

**Checklist:**
- [ ] Install MinGW-w64 cross-compiler in WSL Ubuntu
  ```bash
  sudo apt update
  sudo apt install gcc-mingw-w64-x86-64-posix g++-mingw-w64-x86-64-posix
  ```
- [ ] Install Node.js 18+ in WSL
- [ ] Install TypeScript and MCP SDK
  ```bash
  npm install -g typescript
  npm install @modelcontextprotocol/sdk
  ```
- [ ] Create project directory structure
- [ ] Initialize package.json files
- [ ] Setup Git repository (if not already done)
- [ ] Create build scripts for both components
- [ ] Test MinGW-w64 with simple "Hello World" program

**Success Criteria:**
- MinGW-w64 can compile Windows executables from WSL
- Node.js and TypeScript are properly installed
- Project structure is created and organized

### Phase 2: Windows Clipboard Reader Implementation

**Objective**: Create a C++ executable that reads Windows clipboard and communicates via stdin/stdout.

**Technical Requirements:**
- Read text using CF_TEXT/CF_UNICODETEXT formats
- Read images using CF_BITMAP/CF_DIB formats
- Convert images to PNG format
- Encode binary data as Base64
- Implement JSON-RPC communication over stdin/stdout
- Handle multiple clipboard formats with priority (image > text)

**Implementation Checklist:**

#### 2.1 Core Clipboard Functionality
- [ ] Create `clipboard.h` header with function declarations
- [ ] Implement `OpenClipboard()` wrapper with error handling
- [ ] Implement text reading function using `GetClipboardData(CF_TEXT)`
- [ ] Implement Unicode text reading using `GetClipboardData(CF_UNICODETEXT)`
- [ ] Implement bitmap reading using `GetClipboardData(CF_BITMAP)`
- [ ] Implement DIB reading using `GetClipboardData(CF_DIB)`
- [ ] Add clipboard format detection and prioritization
- [ ] Create RAII classes for clipboard resource management

#### 2.2 Image Processing
- [ ] Implement PNG conversion from Windows bitmap
- [ ] Add GDI+ integration for image format handling
- [ ] Create image metadata extraction (dimensions, format)
- [ ] Implement memory-efficient image processing
- [ ] Add error handling for corrupted/invalid images

#### 2.3 Base64 Encoding
- [ ] Create `base64.h` header file
- [ ] Implement Base64 encoding function
- [ ] Add input validation and error handling
- [ ] Optimize for performance with large images
- [ ] Test with various binary data sizes

#### 2.4 JSON-RPC Communication
- [ ] Implement JSON message parsing (simple string-based)
- [ ] Create message format structures
- [ ] Implement stdin reading loop
- [ ] Implement stdout JSON response writing
- [ ] Add error response handling
- [ ] Implement proper process termination

#### 2.5 Build System
- [ ] Create CMakeLists.txt for cross-compilation
- [ ] Create Makefile with MinGW-w64 targets
- [ ] Create build.sh script for automated building
- [ ] Add static linking configuration
- [ ] Test compilation from WSL environment
- [ ] Create debug and release build configurations

**Code Example - main.cpp structure:**
```cpp
#include <windows.h>
#include <iostream>
#include <string>
#include <json/json.h>
#include "clipboard.h"
#include "base64.h"

int main() {
    std::string line;
    while (std::getline(std::cin, line)) {
        try {
            // Parse JSON request
            if (line.find("read_clipboard") != std::string::npos) {
                ClipboardData data = ReadClipboard();
                
                if (data.type == ClipboardType::IMAGE) {
                    std::string base64 = EncodeBase64(data.binaryData);
                    std::cout << CreateImageResponse(base64) << std::endl;
                } else if (data.type == ClipboardType::TEXT) {
                    std::cout << CreateTextResponse(data.textData) << std::endl;
                }
            }
        } catch (const std::exception& e) {
            std::cout << CreateErrorResponse(e.what()) << std::endl;
        }
    }
    return 0;
}
```

**Success Criteria:**
- Executable reads Windows clipboard successfully
- Images are converted to PNG and Base64 encoded
- Text is properly extracted and UTF-8 encoded
- JSON-RPC communication works over stdin/stdout
- Cross-compilation produces working Windows executable

### Phase 3: MCP Server Implementation

**Objective**: Create a TypeScript MCP server that manages the Windows executable and exposes clipboard functionality.

**Technical Requirements:**
- Use @modelcontextprotocol/sdk with stdio transport
- Spawn and manage Windows executable as child process
- Implement MCP tools for clipboard access
- Convert Base64 data to MCP ImageContent
- Handle process lifecycle and error recovery

**Implementation Checklist:**

#### 3.1 MCP Server Setup
- [ ] Initialize TypeScript project with proper tsconfig.json
- [ ] Install and configure @modelcontextprotocol/sdk
- [ ] Setup MCP server with stdio transport
- [ ] Create basic server structure and entry point
- [ ] Implement proper TypeScript types and interfaces

#### 3.2 Child Process Management
- [ ] Create ClipboardManager class for process lifecycle
- [ ] Implement Windows executable spawning from WSL
- [ ] Setup stdin/stdout communication pipes
- [ ] Add process error handling and restart logic
- [ ] Implement graceful shutdown procedures
- [ ] Add process health monitoring

#### 3.3 MCP Tool Implementation
- [ ] Register `read_clipboard` tool with proper schema
- [ ] Implement tool handler function
- [ ] Add input validation and error handling
- [ ] Create proper MCP response formatting
- [ ] Add metadata extraction (timestamp, format, size)

#### 3.4 Data Processing
- [ ] Implement Base64 to Buffer conversion
- [ ] Create ImageContent objects for MCP protocol
- [ ] Add MIME type detection and handling
- [ ] Implement text content processing
- [ ] Add content validation and sanitization

#### 3.5 Configuration and Logging
- [ ] Create configuration management system
- [ ] Implement structured logging with appropriate levels
- [ ] Add environment variable support
- [ ] Create health check endpoints
- [ ] Add performance monitoring

**Code Example - index.ts structure:**
```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ClipboardManager } from './clipboard-manager.js';

const server = new McpServer({
  name: 'clip-to-wsl',
  version: '1.0.0'
});

const clipboardManager = new ClipboardManager();

server.registerTool('read_clipboard', {
  title: 'Read Windows Clipboard',
  description: 'Read the current Windows clipboard content (text or image)',
  inputSchema: z.object({
    format: z.enum(['auto', 'text', 'image']).optional().default('auto')
  })
}, async ({ format }) => {
  try {
    const result = await clipboardManager.readClipboard(format);
    
    if (result.type === 'image') {
      return {
        content: [{
          type: 'image',
          data: result.data,
          mimeType: 'image/png'
        }]
      };
    } else {
      return {
        content: [{
          type: 'text',
          text: result.data
        }]
      };
    }
  } catch (error) {
    throw new Error(`Failed to read clipboard: ${error.message}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

**Success Criteria:**
- MCP server successfully spawns Windows executable
- stdin/stdout communication works reliably
- Tools are properly registered and functional
- ImageContent and TextContent are correctly formatted
- Error handling and recovery work properly

### Phase 4: Integration & Testing

**Objective**: Integrate components, test the complete system, and prepare for deployment.

**Integration Checklist:**
- [ ] Test cross-compilation process end-to-end
- [ ] Verify WSL can execute Windows executable
- [ ] Test JSON-RPC communication between components
- [ ] Validate MCP protocol compliance
- [ ] Test with actual Claude Code integration

**Testing Checklist:**
- [ ] Unit tests for Base64 encoding/decoding
- [ ] Unit tests for clipboard reading functions
- [ ] Integration tests for process communication
- [ ] End-to-end tests with different clipboard content types
- [ ] Performance tests with large images
- [ ] Error handling and recovery tests
- [ ] Memory leak and resource cleanup tests

**Claude Code Integration:**
- [ ] Create Claude Code configuration template
- [ ] Test tool discovery and execution
- [ ] Validate image display in Claude Code
- [ ] Test text content processing
- [ ] Create troubleshooting documentation

**Performance Optimization:**
- [ ] Profile memory usage during image processing
- [ ] Optimize Base64 encoding performance
- [ ] Minimize process startup time
- [ ] Optimize JSON parsing and generation
- [ ] Test with various image sizes and formats

**Documentation:**
- [ ] Create user installation guide
- [ ] Document configuration options
- [ ] Create troubleshooting guide
- [ ] Add development setup instructions
- [ ] Create API documentation

**Success Criteria:**
- Complete system works with Claude Code
- All tests pass consistently
- Performance meets requirements
- Documentation is complete and accurate

## Technical Specifications

### JSON-RPC Message Formats

**Request (MCP Server → Windows Exe):**
```json
{
  "jsonrpc": "2.0",
  "method": "read_clipboard",
  "params": {
    "format": "auto"
  },
  "id": 1
}
```

**Response - Image (Windows Exe → MCP Server):**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "type": "image",
    "data": "iVBORw0KGgoAAAANSUhEUgAA...",
    "mimeType": "image/png",
    "width": 1920,
    "height": 1080,
    "size": 245760
  },
  "id": 1
}
```

**Response - Text (Windows Exe → MCP Server):**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "type": "text",
    "data": "Hello, World!",
    "encoding": "utf-8",
    "size": 13
  },
  "id": 1
}
```

**Error Response:**
```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32603,
    "message": "Clipboard access failed",
    "data": "OpenClipboard() returned false"
  },
  "id": 1
}
```

### Build Commands

**Cross-compile Windows executable from WSL:**
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

### Configuration

**Claude Code configuration (claude_desktop_config.json):**
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

## Security Considerations

- **Input Validation**: Validate all JSON inputs to prevent injection attacks
- **Resource Limits**: Implement timeouts and memory limits for large clipboard content
- **Process Isolation**: Ensure child process cannot access sensitive WSL environment
- **Error Information**: Avoid exposing system internals in error messages
- **File Permissions**: Ensure executable has minimal required permissions

## Performance Considerations

- **Base64 Encoding**: Use efficient algorithm for large images (>10MB)
- **Memory Management**: Stream large images rather than loading entirely in memory
- **Process Reuse**: Keep Windows executable running to avoid startup overhead
- **Caching**: Consider clipboard content caching with change detection
- **Compression**: PNG format provides good compression for screenshots

## Troubleshooting

### Common Issues

1. **Cross-compilation fails**: Ensure MinGW-w64 is properly installed
2. **Process communication timeout**: Check executable path and permissions
3. **Image conversion errors**: Verify GDI+ dependencies
4. **Base64 encoding issues**: Check memory limits and data size
5. **MCP registration fails**: Verify Claude Code configuration

### Debug Commands

```bash
# Test Windows executable directly
echo '{"method":"read_clipboard","id":1}' | /mnt/c/path/to/clipreader.exe

# Test MCP server
node dist/index.js

# Check process communication
ps aux | grep clipreader
```

This implementation plan provides a complete roadmap for creating the ClipToWSL MCP server with detailed checklists, code examples, and technical specifications needed for successful implementation.