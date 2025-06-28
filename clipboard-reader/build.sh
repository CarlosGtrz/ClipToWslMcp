#!/bin/bash

set -e

echo "Building Windows Clipboard Reader..."

# Clean previous builds
make clean

# Build the executable
make release

# Check if build was successful
if [ -f "clipreader.exe" ]; then
    echo "Build successful: clipreader.exe created"
    echo "File size: $(ls -lh clipreader.exe | awk '{print $5}')"
    
    # Test basic functionality if we're in a Windows environment or can access clipboard
    if command -v wine &> /dev/null; then
        echo "Testing with wine..."
        echo '{"jsonrpc":"2.0","method":"read_clipboard","id":1}' | wine ./clipreader.exe || echo "Wine test failed (this is expected in WSL)"
    else
        echo "Wine not available, skipping runtime test"
    fi
else
    echo "Build failed: clipreader.exe not found"
    exit 1
fi

echo "Windows Clipboard Reader build complete!"