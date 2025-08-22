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

# Ensure desktop file has correct permissions
DESKTOP_FILE="/usr/share/applications/github-desktop.desktop"
if [ -f "$DESKTOP_FILE" ]; then
    chmod 644 "$DESKTOP_FILE"
    echo "Desktop file permissions updated: $DESKTOP_FILE"
else
    echo "Warning: Desktop file not found at $DESKTOP_FILE"
fi

# Update desktop database if available
if command -v update-desktop-database >/dev/null 2>&1; then
    echo "Updating desktop database..."
    update-desktop-database /usr/share/applications || true
fi

# Update MIME database if available
if command -v update-mime-database >/dev/null 2>&1; then
    echo "Updating MIME database..."
    update-mime-database /usr/share/mime || true
fi

# Update icon cache if available
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    echo "Updating icon cache..."
    gtk-update-icon-cache -f -t /usr/share/icons/hicolor || true
fi

# Register URL scheme handlers
if command -v xdg-mime >/dev/null 2>&1; then
    echo "Registering URL scheme handlers..."
    xdg-mime default github-desktop.desktop x-scheme-handler/x-github-client || true
    xdg-mime default github-desktop.desktop x-scheme-handler/x-github-desktop-auth || true
    xdg-mime default github-desktop.desktop x-scheme-handler/x-github-desktop-dev-auth || true
fi

echo "Installation verification complete"
