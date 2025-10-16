#!/usr/bin/env bash
# JobSentinel GUI launcher helper for macOS.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -x "launch-gui.sh" ]]; then
  echo "Making launch-gui.sh executable..."
  chmod +x launch-gui.sh
fi

./launch-gui.sh
