#!/bin/bash

# Snap package build script for GitPeach Desktop

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Building Snap package for GitPeach Desktop...${NC}"

# Check if .deb file exists
DEB_FILE=$(find dist -name "rin-gitpeach-desktop_*.deb" | head -n 1)
if [ -z "$DEB_FILE" ]; then
    echo -e "${RED}Error: No .deb file found in dist/ directory${NC}"
    echo -e "${YELLOW}Please build the Debian package first using: yarn package:linux${NC}"
    exit 1
fi

echo -e "${GREEN}Found .deb file: $DEB_FILE${NC}"

# Check if snapcraft is installed
if ! command -v snapcraft &> /dev/null; then
    echo -e "${RED}Error: snapcraft is not installed${NC}"
    echo -e "${YELLOW}Please install snapcraft:${NC}"
    echo "  sudo snap install snapcraft --classic"
    exit 1
fi

# Clean previous builds
echo -e "${GREEN}Cleaning previous builds...${NC}"
snapcraft clean 2>/dev/null || true
rm -f *.snap

# Build the snap package
echo -e "${GREEN}Building snap package...${NC}"
snapcraft --verbose

# Find the generated snap file
SNAP_FILE=$(find . -maxdepth 1 -name "*.snap" | head -n 1)
if [ -n "$SNAP_FILE" ]; then
    echo -e "${GREEN}Successfully built snap package: $SNAP_FILE${NC}"
    
    # Move to dist directory
    mv "$SNAP_FILE" dist/
    echo -e "${GREEN}Moved snap package to dist/ directory${NC}"
    
    # Display package info
    echo -e "${GREEN}Package information:${NC}"
    snap info "dist/$(basename "$SNAP_FILE")" 2>/dev/null || true
else
    echo -e "${RED}Error: No snap package was generated${NC}"
    exit 1
fi

echo -e "${GREEN}Snap package build completed successfully!${NC}"
