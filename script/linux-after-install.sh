#!/bin/bash

# GitHub Desktop Linux Post-Install Script

set -e

echo "GitHub Desktop Linux installation completed"

# Verify Git is available
if command -v git >/dev/null 2>&1; then
    echo "Git is available: $(git --version)"
else
    echo "Warning: Git is not installed. GitHub Desktop requires Git to function properly."
    echo "Please install Git using your package manager:"
    echo "  Ubuntu/Debian: sudo apt install git"
    echo "  Red Hat/Fedora: sudo dnf install git"
fi

# Update desktop database if available
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database /usr/share/applications || true
fi

# Update icon cache if available
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t /usr/share/icons/hicolor || true
    # Force icon cache update with different flags for ARM64 compatibility
    gtk-update-icon-cache --force --ignore-theme-index /usr/share/icons/hicolor || true
fi

# Update MIME database if available
if command -v update-mime-database >/dev/null 2>&1; then
    update-mime-database /usr/share/mime || true
fi

# Additional steps for ARM64 icon visibility fix
ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    echo "ARM64 detected - applying additional icon fixes"
    
    # Ensure proper permissions on icon files
    if [ -d "/usr/share/icons/hicolor" ]; then
        find /usr/share/icons/hicolor -name "github-desktop.png" -exec chmod 644 {} \; || true
    fi
    
    # Force desktop entry validation
    if [ -f "/usr/share/applications/github-desktop.desktop" ]; then
        chmod 644 /usr/share/applications/github-desktop.desktop || true
        # Try to validate desktop entry if desktop-file-validate is available
        if command -v desktop-file-validate >/dev/null 2>&1; then
            desktop-file-validate /usr/share/applications/github-desktop.desktop || true
        fi
    fi
    
    # Update XDG desktop database specifically
    if command -v xdg-desktop-menu >/dev/null 2>&1; then
        xdg-desktop-menu forceupdate || true
    fi
    
    # Refresh icon theme cache with additional methods
    if command -v xdg-icon-resource >/dev/null 2>&1; then
        xdg-icon-resource forceupdate || true
    fi
    
    # Run comprehensive ARM64 icon fix script if available
    ARM64_FIX_SCRIPT="/usr/lib/github-desktop/fix-arm64-desktop-icons.sh"
    if [ -f "$ARM64_FIX_SCRIPT" ]; then
        echo "Running comprehensive ARM64 icon fix..."
        bash "$ARM64_FIX_SCRIPT" || true
    fi
fi

echo "Installation verification complete"
