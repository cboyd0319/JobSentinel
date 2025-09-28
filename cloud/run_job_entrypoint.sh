#!/bin/sh
# Cloud Run Job entrypoint. Writes secret-backed configuration to disk and
# executes the polling workflow.

set -eu

APP_ROOT="/app"
USER_PREFS_FILE="$APP_ROOT/config/user_prefs.json"
MODE=${JOB_RUN_MODE:-poll}

cd "$APP_ROOT"

if [ -n "${USER_PREFS_JSON:-}" ]; then
    echo "📝 Writing user_prefs.json from Secret Manager"
    mkdir -p "$(dirname "$USER_PREFS_FILE")"
    printf '%s' "$USER_PREFS_JSON" > "$USER_PREFS_FILE"
fi

echo "🚀 Starting job scraper (mode: $MODE)"
exec python3 src/agent.py --mode "$MODE"
