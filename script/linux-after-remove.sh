#!/bin/bash

# GitHub Desktop Linux Post-Remove Script

set -e

echo "GitHub Desktop Linux removal started"

# Update desktop database if available
if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database /usr/share/applications || true
fi

# Update MIME database if available
if command -v update-mime-database >/dev/null 2>&1; then
    update-mime-database /usr/share/mime || true
fi

echo "GitHub Desktop Linux removal completed"
