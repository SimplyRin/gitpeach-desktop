#!/bin/bash

# Fix AppImage dependencies script
# This script ensures critical libraries are available for AppImage packaging

set -e

echo "=== AppImage Dependencies Fix ==="

# Check for essential libraries
echo "Checking for essential compression libraries..."
libs_to_check=("libz.so.1" "libbz2.so.1" "liblzma.so.5" "libzstd.so.1")

for lib in "${libs_to_check[@]}"; do
    if ldconfig -p | grep -q "$lib"; then
        echo "✓ Found $lib"
        ldconfig -p | grep "$lib" | head -1
    else
        echo "✗ Missing $lib"
    fi
done

# Create library symlinks if needed
echo "Creating library symlinks for AppImage packaging..."

# Standard library locations
lib_dirs=("/usr/lib/x86_64-linux-gnu" "/lib/x86_64-linux-gnu" "/usr/lib" "/lib")

create_symlink_if_needed() {
    local src="$1"
    local dest="$2"
    
    if [ -f "$src" ] && [ ! -f "$dest" ]; then
        echo "Creating symlink: $dest -> $src"
        sudo ln -sf "$src" "$dest" || echo "Failed to create symlink (may need sudo)"
    fi
}

# Ensure libz.so is available
for dir in "${lib_dirs[@]}"; do
    if [ -f "$dir/libz.so.1" ]; then
        create_symlink_if_needed "$dir/libz.so.1" "$dir/libz.so"
        break
    fi
done

# Set environment variables for electron-builder
export LD_LIBRARY_PATH="/usr/lib/x86_64-linux-gnu:/lib/x86_64-linux-gnu:/usr/lib:/lib:${LD_LIBRARY_PATH:-}"

echo "LD_LIBRARY_PATH set to: $LD_LIBRARY_PATH"

# Verify libraries are now accessible
echo "Final library check:"
for lib in "${libs_to_check[@]}"; do
    if ldconfig -p | grep -q "$lib"; then
        echo "✓ $lib is accessible"
    else
        echo "⚠ $lib may still not be accessible"
    fi
done

echo "=== Dependencies fix completed ==="
