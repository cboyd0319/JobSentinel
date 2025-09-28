#!/bin/sh
# Cloud Run Job entrypoint. Writes secret-backed configuration to disk and
# executes the polling workflow.

set -euo pipefail

APP_ROOT="/app"
USER_PREFS_FILE="$APP_ROOT/user_prefs.json"
MODE=${JOB_RUN_MODE:-poll}

cd "$APP_ROOT"

if [ -n "${USER_PREFS_JSON:-}" ]; then
    echo "📝 Writing user_prefs.json from Secret Manager"
    printf '%s' "$USER_PREFS_JSON" > "$USER_PREFS_FILE"
fi

echo "🚀 Starting job scraper (mode: $MODE)"
python src/agent.py --mode "$MODE"
