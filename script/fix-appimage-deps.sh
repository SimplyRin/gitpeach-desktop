#!/bin/bash

# Fix AppImage dependencies script
# This script ensures critical libraries are available for AppImage packaging

set -e

echo "=== AppImage Dependencies Fix ==="

# Detect target architecture
ARCH=$(uname -m)
TARGET_ARCH="${TARGET_ARCH:-$ARCH}"

echo "Host architecture: $ARCH"
echo "Target architecture: $TARGET_ARCH"

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

# Standard library locations for both x64 and ARM64
lib_dirs_x64=("/usr/lib/x86_64-linux-gnu" "/lib/x86_64-linux-gnu" "/usr/lib" "/lib")
lib_dirs_arm64=("/usr/lib/aarch64-linux-gnu" "/lib/aarch64-linux-gnu" "/usr/lib" "/lib")

create_symlink_if_needed() {
    local src="$1"
    local dest="$2"
    
    if [ -f "$src" ] && [ ! -f "$dest" ]; then
        echo "Creating symlink: $dest -> $src"
        sudo ln -sf "$src" "$dest" || echo "Failed to create symlink (may need sudo)"
    fi
}

# Function to fix libraries for specific architecture
fix_libraries_for_arch() {
    local arch_dirs=("$@")
    
    for dir in "${arch_dirs[@]}"; do
        if [ -d "$dir" ]; then
            echo "Checking directory: $dir"
            
            # Ensure libz.so is available
            if [ -f "$dir/libz.so.1" ]; then
                create_symlink_if_needed "$dir/libz.so.1" "$dir/libz.so"
            fi
            
            # Ensure libbz2.so is available (handle different naming)
            if [ -f "$dir/libbz2.so.1.0" ]; then
                create_symlink_if_needed "$dir/libbz2.so.1.0" "$dir/libbz2.so.1"
                create_symlink_if_needed "$dir/libbz2.so.1.0" "$dir/libbz2.so"
            elif [ -f "$dir/libbz2.so.1" ]; then
                create_symlink_if_needed "$dir/libbz2.so.1" "$dir/libbz2.so"
            fi
            
            # Ensure liblzma.so is available
            if [ -f "$dir/liblzma.so.5" ]; then
                create_symlink_if_needed "$dir/liblzma.so.5" "$dir/liblzma.so"
            fi
            
            # Ensure libzstd.so is available
            if [ -f "$dir/libzstd.so.1" ]; then
                create_symlink_if_needed "$dir/libzstd.so.1" "$dir/libzstd.so"
            fi
        fi
    done
}

# Fix libraries for x64 architecture
echo "Fixing x64 libraries..."
fix_libraries_for_arch "${lib_dirs_x64[@]}"

# Fix libraries for ARM64 architecture if targeting ARM64 or if ARM64 libs are available
if [ "$TARGET_ARCH" = "aarch64" ] || [ "$TARGET_ARCH" = "arm64" ] || [ -d "/usr/lib/aarch64-linux-gnu" ]; then
    echo "Fixing ARM64 libraries..."
    fix_libraries_for_arch "${lib_dirs_arm64[@]}"
fi

# Set environment variables for electron-builder
export LD_LIBRARY_PATH="/usr/lib/x86_64-linux-gnu:/lib/x86_64-linux-gnu:/usr/lib/aarch64-linux-gnu:/lib/aarch64-linux-gnu:/usr/lib:/lib:${LD_LIBRARY_PATH:-}"

echo "LD_LIBRARY_PATH set to: $LD_LIBRARY_PATH"

# Also set environment for cross-compilation
if [ "$TARGET_ARCH" = "aarch64" ] || [ "$TARGET_ARCH" = "arm64" ]; then
    export CC=aarch64-linux-gnu-gcc
    export CXX=aarch64-linux-gnu-g++
    export AR=aarch64-linux-gnu-ar
    export STRIP=aarch64-linux-gnu-strip
    export PKG_CONFIG_PATH="/usr/lib/aarch64-linux-gnu/pkgconfig:${PKG_CONFIG_PATH:-}"
    
    echo "Cross-compilation environment set:"
    echo "CC=$CC"
    echo "CXX=$CXX"
    echo "PKG_CONFIG_PATH=$PKG_CONFIG_PATH"
fi

# Verify libraries are now accessible
echo "Final library check:"
for lib in "${libs_to_check[@]}"; do
    if ldconfig -p | grep -q "$lib"; then
        echo "✓ $lib is accessible"
    else
        echo "⚠ $lib may still not be accessible"
    fi
done

# Check for ARM64 specific libraries if available
if [ -d "/usr/lib/aarch64-linux-gnu" ]; then
    echo "ARM64 library check:"
    for lib in "${libs_to_check[@]}"; do
        if find /usr/lib/aarch64-linux-gnu /lib/aarch64-linux-gnu -name "$lib" 2>/dev/null | grep -q "$lib"; then
            echo "✓ ARM64 $lib found"
        else
            echo "⚠ ARM64 $lib not found"
        fi
    done
fi

echo "=== Dependencies fix completed ==="
