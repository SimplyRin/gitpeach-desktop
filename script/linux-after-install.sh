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

# Update MIME database if available
if command -v update-mime-database >/dev/null 2>&1; then
    update-mime-database /usr/share/mime || true
fi

echo "Installation verification complete"
