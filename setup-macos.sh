#!/usr/bin/env bash
# macOS Setup Script for JobSentinel
#
# This bash script provides automated setup for JobSentinel on macOS 15+.
# It handles all installation steps with proper error handling and user feedback.
#
# Requirements:
# - macOS 15+ (Sequoia or later)
# - Python 3.12+ installed
# - Bash 3.2+ or Zsh 5.0+ (default on modern macOS)
#
# No admin rights needed!
#
# Usage:
#   ./setup-macos.sh
#
# Or if you need to make it executable first:
#   chmod +x setup-macos.sh
#   ./setup-macos.sh

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Catch errors in pipelines

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo ""
echo "========================================================================"
echo "                     JobSentinel macOS Setup"
echo "========================================================================"
echo ""

# Check macOS version
echo -e "${YELLOW}Checking macOS version...${NC}"

if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}✗ This script is for macOS only. Detected: $OSTYPE${NC}"
    echo ""
    exit 1
fi

# Get macOS version
macos_version=$(sw_vers -productVersion)
macos_major=$(echo "$macos_version" | cut -d '.' -f 1)
macos_minor=$(echo "$macos_version" | cut -d '.' -f 2)

# macOS 15 = Sequoia (released 2024)
if [[ $macos_major -ge 15 ]] || [[ $macos_major -eq 14 && $macos_minor -ge 0 ]]; then
    echo -e "${GREEN}✓ macOS $macos_version detected${NC}"
else
    echo -e "${RED}✗ macOS 15+ required. Found: macOS $macos_version${NC}"
    echo ""
    echo -e "${YELLOW}Please upgrade to macOS 15 (Sequoia) or later to use JobSentinel.${NC}"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo ""

# Check for Python
echo -e "${YELLOW}Checking for Python...${NC}"

# Try python3 first (standard on macOS), then python
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo -e "${RED}✗ Python not found${NC}"
    echo ""
    echo -e "${YELLOW}Please install Python 3.12 or newer.${NC}"
    echo ""
    echo "Recommended installation methods:"
    echo "1. Homebrew (recommended):"
    echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    echo "   brew install python@3.12"
    echo ""
    echo "2. python.org:"
    echo "   https://www.python.org/downloads/"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check Python version
python_version=$($PYTHON_CMD --version 2>&1 | awk '{print $2}')
python_major=$(echo "$python_version" | cut -d '.' -f 1)
python_minor=$(echo "$python_version" | cut -d '.' -f 2)

if [[ $python_major -ge 3 ]] && [[ $python_minor -ge 12 ]]; then
    echo -e "${GREEN}✓ Python $python_version found${NC}"
else
    echo -e "${RED}✗ Python 3.12+ required. Found: Python $python_version${NC}"
    echo ""
    echo -e "${YELLOW}Please install Python 3.12 or newer:${NC}"
    echo "  brew install python@3.12"
    echo "  OR download from: https://www.python.org/downloads/"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo ""

# Check disk space
echo -e "${YELLOW}Checking disk space...${NC}"

free_space=$(df -h . | awk 'NR==2 {print $4}')
free_space_gb=$(df -g . | awk 'NR==2 {print $4}')

if [[ $free_space_gb -ge 1 ]]; then
    echo -e "${GREEN}✓ $free_space free${NC}"
else
    echo -e "${RED}✗ Only $free_space free. Need at least 1 GB.${NC}"
    echo ""
    echo -e "${YELLOW}Please free up some disk space and try again.${NC}"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo ""

# Check internet connectivity
echo -e "${YELLOW}Checking internet connection...${NC}"

if ping -c 1 -W 3 8.8.8.8 &> /dev/null; then
    echo -e "${GREEN}✓ Internet connected${NC}"
else
    echo -e "${RED}✗ No internet connection${NC}"
    echo ""
    echo -e "${YELLOW}Please connect to the internet and try again.${NC}"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo ""
echo "========================================================================"
echo -e "${GREEN}All checks passed! Ready to install.${NC}"
echo "========================================================================"
echo ""

# Confirm with user
read -p "Continue with installation? (y/n): " response
case "$response" in
    [yY][eE][sS]|[yY]) 
        echo ""
        ;;
    *)
        echo "Installation cancelled by user."
        exit 0
        ;;
esac

# Run Python setup script
echo -e "${CYAN}Starting setup wizard...${NC}"
echo ""

if $PYTHON_CMD scripts/macos_setup.py; then
    echo ""
    echo "========================================================================"
    echo -e "${GREEN}Setup completed successfully!${NC}"
    echo "========================================================================"
    echo ""
else
    echo ""
    echo "========================================================================"
    echo -e "${RED}Setup encountered errors.${NC}"
    echo ""
    echo -e "${YELLOW}For help, see: docs/MACOS_TROUBLESHOOTING.md${NC}"
    echo "========================================================================"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

read -p "Press Enter to exit..."
