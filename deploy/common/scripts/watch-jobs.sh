#!/bin/bash
# Watch for new JSON files in scraped directory
# Uses RipGrep + entr for efficient file watching
# Reference: docs/RIPGREP_INTEGRATION.md Section 7

set -e

# Default directory
JOBS_DIR="${1:-data/scraped_jobs}"

# Check if ripgrep is installed
if ! command -v rg &> /dev/null; then
    echo "Error: ripgrep (rg) is not installed"
    echo "Install with:"
    echo "  macOS: brew install ripgrep"
    echo "  Linux: apt install ripgrep (Debian/Ubuntu)"
    echo "  Windows: winget install BurntSushi.ripgrep.MSVC"
    exit 1
fi

# Check if entr is installed
if ! command -v entr &> /dev/null; then
    echo "Error: entr is not installed"
    echo "Install with:"
    echo "  macOS: brew install entr"
    echo "  Linux: apt install entr (Debian/Ubuntu)"
    exit 1
fi

# Create jobs directory if it doesn't exist
mkdir -p "$JOBS_DIR"

echo "Watching $JOBS_DIR for new jobs..."
echo "Press Ctrl+C to stop"

# Watch for new JSON files in scraped directory
rg --files "$JOBS_DIR"/*.json 2>/dev/null | \
entr -p python -m jsa.cli score-new-jobs /_
