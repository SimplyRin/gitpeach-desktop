#!/bin/bash

# GitHub Desktop Linux Post-Install Script

set -e

echo "GitHub Desktop Linux installation completed"

# Function to check and run command if available
run_if_available() {
    local cmd="$1"
    local description="$2"
    shift 2
    
    if command -v "$cmd" >/dev/null 2>&1; then
        echo "$description..."
        "$@" || {
            echo "Warning: $description failed, but continuing installation"
            return 0
        }
    else
        echo "Skipping $description ($cmd not available)"
    fi
}

# Verify Git is available
if command -v git >/dev/null 2>&1; then
    echo "Git is available: $(git --version)"
else
    echo "Warning: Git is not installed. GitHub Desktop requires Git to function properly."
    echo "Please install Git using your package manager:"
    echo "  Ubuntu/Debian: sudo apt install git"
    echo "  Red Hat/Fedora: sudo dnf install git"
fi

# Desktop file locations to check
DESKTOP_FILES=(
    "/usr/share/applications/github-desktop.desktop"
    "/usr/local/share/applications/github-desktop.desktop"
)

# Set proper permissions for desktop file if it exists
for DESKTOP_FILE in "${DESKTOP_FILES[@]}"; do
    if [ -f "$DESKTOP_FILE" ]; then
        echo "Found desktop file at: $DESKTOP_FILE"
        chmod 644 "$DESKTOP_FILE"
        echo "Set permissions for $(basename "$DESKTOP_FILE")"
        
        # Validate desktop file format
        if command -v desktop-file-validate >/dev/null 2>&1; then
            if desktop-file-validate "$DESKTOP_FILE"; then
                echo "Desktop file validation passed"
            else
                echo "Warning: Desktop file validation failed"
            fi
        fi
        break
    fi
done

# Check if any desktop file was found
FOUND_DESKTOP=false
for DESKTOP_FILE in "${DESKTOP_FILES[@]}"; do
    if [ -f "$DESKTOP_FILE" ]; then
        FOUND_DESKTOP=true
        break
    fi
done

if ! $FOUND_DESKTOP; then
    echo "Warning: No github-desktop.desktop file found in expected locations"
    echo "Expected locations:"
    for location in "${DESKTOP_FILES[@]}"; do
        echo "  $location"
    done
fi

# Update desktop database
run_if_available update-desktop-database "Updating desktop database" update-desktop-database /usr/share/applications
run_if_available update-desktop-database "Updating local desktop database" update-desktop-database /usr/local/share/applications

# Update MIME database
run_if_available update-mime-database "Updating MIME database" update-mime-database /usr/share/mime

# Update icon cache
run_if_available gtk-update-icon-cache "Updating GTK icon cache" gtk-update-icon-cache -f -t /usr/share/icons/hicolor
run_if_available update-icon-caches "Updating icon caches" update-icon-caches /usr/share/icons/hicolor

# Register MIME types if xdg-mime is available
if command -v xdg-mime >/dev/null 2>&1; then
    echo "Registering MIME types..."
    xdg-mime default github-desktop.desktop x-scheme-handler/x-github-client || echo "Failed to register x-github-client"
    xdg-mime default github-desktop.desktop x-scheme-handler/x-github-desktop-auth || echo "Failed to register x-github-desktop-auth"
    xdg-mime default github-desktop.desktop x-scheme-handler/x-github-desktop-dev-auth || echo "Failed to register x-github-desktop-dev-auth"
fi

# Refresh desktop environment caches
run_if_available kbuildsycoca5 "Updating KDE cache" kbuildsycoca5 --noincremental

# Final verification
echo ""
echo "Installation verification:"
echo "- Checking desktop file registration..."
if command -v desktop-file-install >/dev/null 2>&1; then
    echo "  desktop-file-install available: Yes"
else
    echo "  desktop-file-install available: No"
fi

echo "- Checking XDG utilities..."
for util in xdg-mime xdg-desktop-menu; do
    if command -v "$util" >/dev/null 2>&1; then
        echo "  $util: Available"
    else
        echo "  $util: Not available"
    fi
done

echo ""
echo "GitHub Desktop installation verification complete"
echo "The application should now appear in your desktop environment's application menu."
echo "If the application does not appear, try logging out and back in, or run:"
echo "  update-desktop-database ~/.local/share/applications"
