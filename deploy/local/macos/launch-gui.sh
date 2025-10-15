#!/usr/bin/env bash
#
# JobSentinel GUI Launcher (macOS Version)
#
# Launches the JobSentinel graphical user interface.
# This is the EASIEST way to use JobSentinel on macOS - just double-click!
#
# Version: 1.0.0
# Target: macOS 12+ (Monterey and later, 14+ recommended)
# Python: 3.11+ required (3.12+ recommended)
# No admin rights needed!
#
# Usage:
#   ./launch-gui.sh
#   OR double-click in Finder

set -e  # Exit on error
set -u  # Exit on undefined variable

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

print_banner() {
    echo ""
    echo "========================================================================"
    echo "                   JobSentinel GUI Launcher"
    echo "========================================================================"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

check_python() {
    # Try python3 first (standard on macOS), then python
    if command -v python3 &> /dev/null; then
        PYTHON_CMD="python3"
    elif command -v python &> /dev/null; then
        PYTHON_CMD="python"
    else
        return 1
    fi

    # Check version
    python_version=$($PYTHON_CMD --version 2>&1 | awk '{print $2}')
    python_major=$(echo "$python_version" | cut -d '.' -f 1)
    python_minor=$(echo "$python_version" | cut -d '.' -f 2)

    if [[ $python_major -ge 3 ]] && [[ $python_minor -ge 12 ]]; then
        print_success "Python $python_version detected"
        return 0
    elif [[ $python_major -eq 3 ]] && [[ $python_minor -eq 11 ]]; then
        print_success "Python $python_version detected (3.12+ recommended)"
        return 0
    else
        print_error "Python $python_version is too old (need 3.11+)"
        return 1
    fi
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

print_banner

# Check for Python
echo -e "${YELLOW}Checking requirements...${NC}"
echo ""

if ! check_python; then
    echo ""
    echo -e "${RED}Python 3.11+ is required but not found.${NC}"
    echo ""
    echo -e "${YELLOW}Please install Python from:${NC}"
    echo "  • Homebrew: brew install python@3.12"
    echo "  • python.org: https://www.python.org/downloads/"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Navigate to repository root (3 levels up from deploy/local/macos/)
REPO_ROOT="$( cd "$SCRIPT_DIR/../../.." && pwd )"

# Change to the repository root directory
cd "$REPO_ROOT" || {
    print_error "Failed to change to repository root directory"
    exit 1
}

echo -e "${CYAN}Repository root: $REPO_ROOT${NC}"
echo ""

echo ""
echo -e "${YELLOW}Launching JobSentinel GUI...${NC}"
echo ""

# Launch the GUI
if $PYTHON_CMD deploy/common/launcher_gui.py; then
    echo ""
    print_success "JobSentinel GUI closed normally"
    echo ""
else
    echo ""
    print_error "Failed to launch GUI"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "1. Make sure Python 3.12+ is installed"
    echo "2. Run: pip3 install -e ."
    echo "3. Check docs/MACOS_TROUBLESHOOTING.md"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi
