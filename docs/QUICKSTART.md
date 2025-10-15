# Quickstart

Get JobSentinel running in 5 minutes.

## Prerequisites

| Item | Version | Why |
|------|---------|-----|
| Python | 3.12+ | Runtime (includes SQLite) |
| Git | Any | Clone repo (optional - can download ZIP) |
| Disk space | 1GB | App + models |

**Optional:**
- Slack webhook (for alerts)
- Reed API key (UK jobs)
- Email SMTP (for alerts)

## Installation

### Windows 11+

**Zero technical knowledge needed:**

1. Download: https://github.com/cboyd0319/JobSentinel/archive/refs/heads/main.zip
2. Extract to Desktop (right-click → "Extract All")
3. Double-click: `deploy/local/windows/launch-gui.bat`

Done. A GUI window opens with buttons.

**What happens:**
- Checks Python 3.12+ (auto-installs if missing)
- Creates virtual environment
- Installs dependencies
- Creates desktop shortcuts
- Opens launcher

**Shortcuts created:**
- `JobSentinel Launcher.lnk` → GUI
- `JobSentinel Web UI.lnk` → Browser interface
- `JobSentinel Run Once.lnk` → Single scrape

### macOS 15+ (Sequoia)

**Just as easy:**

1. Download: https://github.com/cboyd0319/JobSentinel/archive/refs/heads/main.zip
2. Extract to Desktop (double-click ZIP)
3. Double-click: `deploy/local/macos/setup-macos.sh`
   - If Gatekeeper blocks: Right-click → Open → Open

Done. Follow the 5-minute wizard.

**What happens:**
- Checks Python 3.12+ (guides Homebrew install if missing)
- Creates virtual environment
- Installs dependencies
- Creates `.command` files on Desktop
- Adds shell aliases

**Files created:**
- `JobSentinel-Launcher.command` → Double-click to launch
- `JobSentinel-Web.command` → Double-click for web UI

**Shell aliases added:**
```bash
jobsentinel-run      # Run once
jobsentinel-web      # Start web UI
jobsentinel-status   # Health check
```

### Linux

```bash
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
playwright install chromium
cp deploy/common/config/user_prefs.example.json deploy/common/config/user_prefs.json
# Edit config with your preferences
python -m jsa.cli run-once
```

## Configuration

### Quick config
```bash
# Interactive wizard (all platforms)
python -m jsa.cli setup

# Asks for:
# - Job keywords (e.g., "python, backend, remote")
# - Locations (e.g., "Remote, San Francisco")
# - Minimum salary
# - Companies to exclude
# - Alert preferences (Slack/email)
```

### Manual config

Edit `deploy/common/config/user_prefs.json`:

```json
{
  "keywords": ["python", "backend", "api"],
  "locations": ["Remote", "San Francisco"],
  "min_salary": 120000,
  "denied_companies": ["Meta", "Amazon"],
  "job_sources": {
    "jobswithgpt": {"enabled": true},
    "reed": {"enabled": false, "api_key": ""}
  },
  "alerts": {
    "slack": {
      "enabled": false,
      "webhook_url": ""
    },
    "email": {
      "enabled": false,
      "smtp_host": "smtp.gmail.com",
      "smtp_port": 587,
      "from_email": "",
      "password": ""
    }
  }
}
```

**Validate config:**
```bash
python -m jsa.cli config-validate
```

## First run

### GUI (Windows/macOS)
1. Open launcher (double-click shortcut)
2. Click "Start JobSentinel"
3. Watch activity log for progress
4. Jobs save to `data/jobs.sqlite`

### Command line (all platforms)
```bash
# Single scrape
python -m jsa.cli run-once

# Web UI
python -m jsa.cli web --port 8000
# Open: http://localhost:8000

# Scheduled (every 2 hours)
python -m jsa.cli run-daemon --interval 7200
```

## What happens during a run

1. **Scrape** - Fetch jobs from enabled sources (~30s)
2. **Score** - Match against your preferences (~10s)
3. **Alert** - Send high-scoring jobs (80+) to Slack/email
4. **Store** - Save to SQLite (`data/jobs.sqlite`)

**Typical output:**
```
[14:32:01] Starting job scrape...
[14:32:15] JobsWithGPT: 42 jobs found
[14:32:28] Scoring 42 jobs...
[14:32:32] 8 high-value matches (score 80+)
[14:32:35] Sent 8 alerts to Slack
[14:32:36] Done. 42 jobs saved.
```

## Alerts

### Slack (recommended)

1. Create webhook: https://api.slack.com/messaging/webhooks
2. Add to config:
   ```json
   "alerts": {
     "slack": {
       "enabled": true,
       "webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK"
     }
   }
   ```

### Email

```json
"alerts": {
  "email": {
    "enabled": true,
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "from_email": "you@gmail.com",
    "password": "app_password"
  }
}
```

**Gmail users:** Use App Password (not account password):
https://support.google.com/accounts/answer/185833

## Verify it works

```bash
# Health check
python -m jsa.cli health

# Expected output:
# ✅ Python 3.12.0
# ✅ SQLite 3.45.0
# ✅ Config valid
# ✅ Database connected
# ✅ Playwright ready
```

## Next steps

- **View jobs:** Run `python -m jsa.cli web` → http://localhost:8000
- **Schedule:** Set up cron (Linux) or Task Scheduler (Windows)
- **Customize:** Edit `deploy/common/config/user_prefs.json`
- **Add sources:** Get Reed API key, enable more scrapers

## Common issues

### "Python not found"
```bash
# Check version
python --version  # or python3 --version

# Need 3.12+
# Windows: Download from python.org
# macOS: brew install python@3.12
# Linux: apt install python3.12
```

### "Config not found"
```bash
# Copy example
cp deploy/common/config/user_prefs.example.json deploy/common/config/user_prefs.json
```

### "No jobs found"
- Check your keywords aren't too specific
- Lower minimum salary
- Enable more job sources
- Check `logs/` for errors

### "Slack alerts not working"
```bash
# Test webhook
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text":"Test alert"}'
```

More troubleshooting: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## Performance

| Metric | Value |
|--------|-------|
| Scrape time | 30-60s (per source) |
| Scoring | <5s (per 100 jobs) |
| Alert latency | <10s |
| Memory | <500MB |
| Disk | ~50MB per 1000 jobs |

Tested with 10,000+ jobs in SQLite.

## Get help

- Troubleshooting: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Issues: https://github.com/cboyd0319/JobSentinel/issues
- Discussions: https://github.com/cboyd0319/JobSentinel/discussions
