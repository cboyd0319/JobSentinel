# JobSentinel — Private job alerts on your machine

Local‑first job search automation that finds high‑match roles and pings you fast.

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12%2B-blue.svg)](https://www.python.org/)
[![Version](https://img.shields.io/badge/Version-0.9.0-brightgreen.svg)](#)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Docs](https://github.com/cboyd0319/JobSentinel/actions/workflows/docs-ci.yml/badge.svg)](https://github.com/cboyd0319/JobSentinel/actions/workflows/docs-ci.yml)
[![codecov](https://codecov.io/github/cboyd0319/JobSentinel/graph/badge.svg?token=QHEYIFQL0E)](https://codecov.io/github/cboyd0319/JobSentinel)

## TL;DR

Scrapes top job boards → scores against your preferences → sends alerts. 100% local. $0. No tracking. No subscriptions.

```bash
# Windows: Double-click deploy/local/windows/launch-gui.bat
# macOS: Double-click deploy/local/macos/launch-gui.sh
# Linux: See docs/QUICKSTART.md
```

## What it does

1. **Scrape** - Pull jobs from Greenhouse, Lever, Reed, JobsWithGPT, JobSpy
2. **Score** - Match keywords, salary, location, company preferences
3. **Alert** - Send high-value matches (80+ score) to Slack or email
4. **Store** - Save to local SQLite database

All data stays on your machine. No third-party tracking. No data sales.

## Quick start

### Windows 11+

1. Download: https://github.com/cboyd0319/JobSentinel/archive/refs/heads/main.zip
2. Extract to Desktop
3. Double-click: `deploy/local/windows/launch-gui.bat`

A GUI opens. Click buttons. No terminal needed.

### macOS 15+

1. Download: https://github.com/cboyd0319/JobSentinel/archive/refs/heads/main.zip
2. Extract to Desktop
3. Double-click: `deploy/local/macos/setup-macos.sh`
   - If blocked: Right-click → Open → Open

Follow the 5-minute wizard.

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

**First time using a terminal?** → [docs/QUICKSTART.md](docs/QUICKSTART.md)

## Prerequisites

- Python: 3.12+ (includes SQLite)
- Git: any version (optional—can download ZIP)
- Disk space: 1GB (app + models)

Optional
- Slack webhook (for alerts)
- Reed API key (UK jobs)
- Email SMTP (for alerts)

Installer checks requirements and guides you through missing items.

## Installation

See [docs/QUICKSTART.md](docs/QUICKSTART.md) for detailed setup.

**TL;DR:**
- Windows/macOS: Double-click installer, follow wizard (5 min)
- Linux: Clone, venv, install, configure (10 min)

## Usage

### GUI (Windows/macOS)

```bash
# Windows
deploy\local\windows\launch-gui.bat

# macOS
deploy/local/macos/launch-gui.sh
```

Click "Start JobSentinel" button. View logs in GUI.

### Command Line

```bash
# Single run
python -m jsa.cli run-once

# Scheduled (every 2 hours)
python -m jsa.cli run-daemon --interval 7200

# Web UI
python -m jsa.cli web --port 8000
# Open: http://localhost:8000

# Health check
python -m jsa.cli health
```

### Web UI Features

- Dashboard with job stats
- Search and filter jobs
- Application tracker
- Resume analyzer
- Real-time updates (WebSocket)
- Dark mode support
- WCAG 2.1 AA accessibility

## Configuration

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

### Key Configuration Options

- `keywords` (list[str], default `[]`): terms to match in title/description
- `locations` (list[str], default `[]`): allowed locations (e.g., “Remote”, “SF”)
- `min_salary` (int, default `0`): minimum annual salary (USD)
- `denied_companies` (list[str], default `[]`): companies to exclude
- `job_sources.*.enabled` (bool, default `false`): enable/disable a source
- `job_sources.*.api_key` (str, default `""`): API key for sources that need it
- `alerts.slack.webhook_url` (str, default `""`): Slack incoming webhook
- `alerts.email.smtp_host` (str, default `""`): SMTP host (e.g., `smtp.gmail.com`)

Validate config
```bash
python -m jsa.cli config-validate
```

## Architecture

```
Job Boards → Scrapers → Scorer → Alerts
     ↓          ↓         ↓        ↓
          SQLite     Config    Logs
```

**Flow:**
1. Scrapers fetch from public APIs/HTML (respects robots.txt, rate limits)
2. Normalize to standard format (source, title, company, location, salary, URL)
3. Score against preferences (skills 40%, salary 25%, location 20%, company 10%, recency 5%)
4. Alert on high matches (80+ score) via Slack/email
5. Store in SQLite (`data/jobs.sqlite`)

**Trust boundaries:**
- API keys in `.env` or environment variables
- All data local (no telemetry)
- Scrapers are read-only (no writes to job boards)

**Components:**
- `deploy/common/app/src/jsa/` - Core (CLI, web, DB)
- `deploy/common/app/sources/` - Job board scrapers
- `deploy/common/app/src/matchers/` - Scoring logic
- `deploy/common/app/src/notify/` - Alert systems
- `deploy/common/web/` - React UI

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for details.

## Security

- **Local-first:** All data on your machine
- **No telemetry:** Zero tracking, zero analytics
- **Secrets in `.env`:** Never hardcoded
- **Read-only scrapers:** Don't post to job boards
- **Rate limiting:** Respect job board limits
- **Input validation:** All external data validated
- **OWASP ASVS Level 2 compliant** (17 controls)

Report vulnerabilities: [SECURITY.md](SECURITY.md)

## Troubleshooting

### Top 5 Issues

**"Python not found"**
```bash
# Check version
python --version  # Need 3.12+

# Install:
# Windows: python.org
# macOS: brew install python@3.12
# Linux: apt install python3.12
```

**"Config not found"**
```bash
cp deploy/common/config/user_prefs.example.json deploy/common/config/user_prefs.json
```

**"No jobs found"**
- Keywords too specific? Try broader terms
- Minimum salary too high? Lower threshold
- Check enabled sources: `python -m jsa.cli config-validate`

**"Slack alerts not working"**
```bash
# Test webhook
curl -X POST "YOUR_WEBHOOK" \
  -H "Content-Type: application/json" \
  -d '{"text":"Test"}'
```

**"Database locked"**
```bash
# Kill other processes
ps aux | grep jobsentinel  # Find process
kill <PID>  # Kill it
```

**More help:** [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

## Performance

- Scrape time: 30–60s per source
- Scoring: <5s per 100 jobs
- Alert latency: <10s (Slack/email)
- Memory: <500MB (includes ML models)
- Disk: ~50MB per 1000 jobs
- Database: SQLite (<100MB typical)

Tested with 10,000+ jobs in SQLite.

## Roadmap

### v0.9.0 (Current)
- ✅ React 19 + Vite 7 UI
- ✅ Consolidated documentation
- ✅ Platform installers (Windows/macOS)
- ✅ WCAG 2.1 AA accessibility

### v1.0 (Q1 2026)
- [ ] GPT-4 integration (optional, cost-controlled)
- [ ] Multi-language support
- [ ] Browser extension
- [ ] Mobile companion app

See [docs/reference/AI_ML_ROADMAP.md](docs/reference/AI_ML_ROADMAP.md) for AI/ML features.

## Contributing

Contributions welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

**Before submitting:**
- [ ] Tests pass (`make test`)
- [ ] Lint passes (`make lint`)
- [ ] Type check passes (`make type`)
- [ ] Coverage ≥85% (`make cov`)
- [ ] No secrets committed

**Quick start for developers:**
```bash
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel
make dev  # Install dev dependencies
make test  # Run tests
```

## License

MIT License - see [LICENSE](LICENSE)

## Support

- **Documentation:** [docs/DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md)
- **Issues:** https://github.com/cboyd0319/JobSentinel/issues
- **Discussions:** https://github.com/cboyd0319/JobSentinel/discussions
- **Security:** [SECURITY.md](SECURITY.md)

### Support Policy

This is a single‑developer, personal project. Support is best‑effort with no SLAs.
Security issues are prioritized; feature requests and questions are handled as time allows.

---

**Made with ❤️ for job seekers who value privacy**
