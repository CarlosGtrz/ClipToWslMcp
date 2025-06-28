# ClipToWSL MCP Server

An MCP (Model Context Protocol) server that enables Claude Code to read Windows clipboard contents from within WSL.

## Quick Installation

### Method 1: Direct Installation

1. **Download and extract** this release package to a directory (e.g., `~/clip-to-wsl-mcp/`)

2. **Install dependencies:**
   ```bash
   cd ~/clip-to-wsl-mcp/
   npm install
   ```

3. **Configure Claude Code** by adding to your Claude config file:

   **Location:** `~/.config/claude-desktop/claude_desktop_config.json` (Linux/WSL) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows)

   ```json
   {
     "mcpServers": {
       "clip-to-wsl": {
         "command": "node",
         "args": ["/home/username/clip-to-wsl-mcp/index.js"],
         "env": {
           "CLIPBOARD_EXE_PATH": "/home/username/clip-to-wsl-mcp/clipreader.exe"
         }
       }
     }
   }
   ```

   **⚠️ Important:** Replace `/home/username/clip-to-wsl-mcp/` with your actual installation path.

### Method 2: Global npm Installation (Alternative)

```bash
# From the release directory
npm install -g .

# Then configure Claude with:
# "command": "clip-to-wsl-mcp"
# "env": { "CLIPBOARD_EXE_PATH": "/path/to/clipreader.exe" }
```

## Testing the Installation

1. **Restart Claude Desktop** after configuration
2. **Copy something to Windows clipboard** (text or image)
3. **Ask Claude:** "What's in my clipboard?"

## Troubleshooting

- **Node.js 18+ required** - Check with `node --version`
- **Windows executable path** - Ensure `clipreader.exe` path is correct in config
- **WSL environment** - This server is designed to run in WSL, not native Windows
- **Permissions** - Ensure `clipreader.exe` has execute permissions: `chmod +x clipreader.exe`

## Usage

Once configured, Claude Code can:
- Read text from Windows clipboard
- Read images from Windows clipboard (returned as base64)
- Access clipboard contents without leaving WSL environment

## Support

For issues, check that:
1. Claude Desktop is restarted after configuration
2. File paths in config are absolute and correct
3. Node.js and npm are properly installed
4. You're running in WSL (not native Windows or pure Linux)
