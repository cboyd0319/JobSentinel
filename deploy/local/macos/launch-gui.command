#!/usr/bin/env bash
# JobSentinel GUI launcher helper for macOS.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ ! -x "$SCRIPT_DIR/launch-gui.sh" ]]; then
  echo "Making launch-gui.sh executable..."
  chmod +x "$SCRIPT_DIR/launch-gui.sh"
fi

"$SCRIPT_DIR/launch-gui.sh"
