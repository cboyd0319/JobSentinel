#!/usr/bin/env bash
set -euo pipefail

PY=${PYTHON:-"$(dirname "$0")/../.venv/bin/python"}

echo "[lint] Ruff (lightweight rules: E,F)"
"$PY" -m ruff check .

echo "[typecheck] mypy"
"$PY" -m mypy . || {
  echo "\nType checking failed (baseline allows gradual tightening)." >&2
  exit 1
}

echo "\nAll lint & type checks passed."
