#!/bin/bash

# ClipToWSL MCP Server Release Builder

set -e

echo "🔧 Building ClipToWSL MCP Server release package..."

# Clean and recreate release directory
echo "📁 Cleaning release directory..."
rm -rf release/
mkdir -p release/

# Build the Windows executable with optimizations
echo "🏗️  Building optimized Windows executable..."
cd clipboard-reader
make clean
make release
cd ..

# Copy essential files to release
echo "📦 Copying essential files..."
cp clipboard-reader/clipreader.exe release/
cp -r mcp-server/dist/* release/

# Create simplified package.json for release
echo "📄 Creating release package.json..."
cat > release/package.json << 'EOF'
{
  "name": "clip-to-wsl-mcp",
  "version": "1.0.0",
  "description": "MCP server that enables reading Windows clipboard from WSL",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "node index.js"
  },
  "keywords": ["mcp", "clipboard", "wsl", "windows", "claude"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "bin": {
    "clip-to-wsl-mcp": "./index.js"
  }
}
EOF

# Create README for release
echo "📖 Creating release README..."
cat > release/README.md << 'EOF'
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

   **Location:** `~/.claude.json` (Linux/WSL)

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
EOF

# Create installation script
echo "🔧 Creating installation script..."
cat > release/install.sh << 'EOF'
#!/bin/bash

# ClipToWSL MCP Server Installation Script

set -e

echo "🔧 Installing ClipToWSL MCP Server..."

# Get current directory
INSTALL_DIR="$(pwd)"
echo "📁 Installation directory: $INSTALL_DIR"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node --version)"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Make executable have correct permissions
chmod +x clipreader.exe

# Create config template
cat > claude-config-example.json << EOL
{
  "mcpServers": {
    "clip-to-wsl": {
      "command": "node",
      "args": ["$INSTALL_DIR/index.js"],
      "env": {
        "CLIPBOARD_EXE_PATH": "$INSTALL_DIR/clipreader.exe"
      }
    }
  }
}
EOL

echo "✅ Installation complete!"
echo ""
echo "📋 Next steps:"
echo "1. Add the configuration from 'claude-config-example.json' to your Claude config file:"
echo "   ~/.config/claude-desktop/claude_desktop_config.json (Linux/WSL)"
echo "   %APPDATA%\\Claude\\claude_desktop_config.json (Windows)"
echo ""
echo "2. Restart Claude Desktop"
echo ""
echo "3. Test by copying something to Windows clipboard and asking Claude: 'What's in my clipboard?'"
echo ""
echo "🎉 Happy clipboard reading!"
EOF

# Make scripts executable
chmod +x release/install.sh
chmod +x release/clipreader.exe

# Display results
echo ""
echo "✅ Release package created successfully!"
echo ""
echo "📁 Release contents:"
ls -lh release/
echo ""
echo "📊 Executable size:"
ls -lh release/clipreader.exe
# Create version from package.json or use timestamp
VERSION=$(grep '"version"' mcp-server/package.json | sed 's/.*"version": "\(.*\)".*/\1/' || date +"%Y.%m.%d")
ARCHIVE_NAME="clip-to-wsl-mcp-v${VERSION}.zip"

echo "📦 Creating release archive: $ARCHIVE_NAME"
cd release/
zip -r "../$ARCHIVE_NAME" . -x "*.git*"
cd ..

echo ""
echo "✅ Release archive created: $ARCHIVE_NAME"
echo "📊 Archive size: $(ls -lh $ARCHIVE_NAME | awk '{print $5}')"

# Check if gh CLI is available for GitHub release
if command -v gh &> /dev/null; then
    echo ""
    echo "🚀 GitHub CLI detected. Create release? (y/n)"
    read -r CREATE_RELEASE
    
    if [[ "$CREATE_RELEASE" =~ ^[Yy]$ ]]; then
        echo "📝 Enter release notes (press Ctrl+D when done):"
        RELEASE_NOTES=$(cat)
        
        echo "🔄 Creating GitHub release v$VERSION..."
        gh release create "v$VERSION" "$ARCHIVE_NAME" \
            --title "ClipToWSL MCP v$VERSION" \
            --notes "$RELEASE_NOTES" \
            --latest
        
        echo "✅ GitHub release created successfully!"
        echo "🌐 Release URL: $(gh repo view --web)/releases/tag/v$VERSION"
    fi
else
    echo ""
    echo "💡 To create GitHub release automatically, install GitHub CLI:"
    echo "   https://cli.github.com/"
    echo ""
    echo "🎯 Manual release steps:"
    echo "   1. Go to: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\(.*\)\.git/\1/')/releases/new"
    echo "   2. Tag: v$VERSION"
    echo "   3. Upload: $ARCHIVE_NAME"
fi

echo ""
echo "🚀 Release ready for distribution!"