#!/usr/bin/env bash
# JobSentinel macOS Setup Launcher
# Double-click this file to start the guided setup wizard.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ ! -x "$SCRIPT_DIR/setup.sh" ]]; then
  echo "Making setup.sh executable..."
  chmod +x "$SCRIPT_DIR/setup.sh"
fi

"$SCRIPT_DIR/setup.sh"
