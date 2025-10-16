#!/usr/bin/env bash
# JobSentinel macOS Setup Launcher
# Double-click this file to start the guided setup wizard.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [[ ! -x "setup.sh" ]]; then
  echo "Making setup.sh executable..."
  chmod +x setup.sh
fi

./setup.sh
