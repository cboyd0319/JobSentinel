#!/bin/bash
# Watch for new JSON files in scraped directory
# Uses RipGrep + entr for efficient file watching
# Reference: docs/RIPGREP_INTEGRATION.md Section 7

set -e

# Default directory and callback
JOBS_DIR="${1:-data/scraped_jobs}"
CALLBACK_CMD="${2:-python -m jsa.cli health --verbose}"

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
echo "Callback: $CALLBACK_CMD"
echo "Press Ctrl+C to stop"
echo ""

# Watch for new JSON files in scraped directory
# The /_ placeholder in entr is replaced with the changed file path
# and passed as the last argument to the callback command
# The -p flag clears the screen, -s enables shell mode for /_ substitution
rg --files "$JOBS_DIR"/*.json 2>/dev/null | \
entr -ps "$CALLBACK_CMD /_"
