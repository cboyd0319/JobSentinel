#!/usr/bin/env bash
# Quick helper to report which Python version is available on this Mac.

set -euo pipefail

echo "Checking for Python 3..."
if command -v python3 >/dev/null 2>&1; then
  version=$(python3 --version 2>&1)
  echo "✅ Found: $version"
else
  echo "❌ Python 3 was not found on this Mac."
  echo "Download from https://www.python.org/downloads/ or install with Homebrew using:"
  echo "    brew install python@3.12"
fi

echo
read -p "Press Enter to close..."
