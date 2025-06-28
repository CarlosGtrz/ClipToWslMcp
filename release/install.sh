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
