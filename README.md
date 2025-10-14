# JobSentinel

Private job search automation that runs on your machine.

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![Version](https://img.shields.io/badge/Version-0.6.1-brightgreen.svg)](#)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff.svg)](https://vitejs.dev/)

**TL;DR**: Scrape job boards, score against your preferences, get real-time alerts. Runs locally for $0 or cloud-scheduled for ~$5-15/mo. **NEW:** React 19, Vite 7, Tailwind 4, WebSocket support!

## What it is

JobSentinel scrapes public job boards (Greenhouse, Lever, Reed, JobsWithGPT, JobSpy), normalizes the data, scores jobs against your preferences (keywords, salary, location), and sends real-time alerts via Slack or WebSocket. All data stays local in SQLite (privacy-first, single-user, zero setup). Modern React 19 UI with live updates. No login-required scraping, no telemetry.

### ✨ What's New (v0.6.1)
- **🔒 Privacy Dashboard** - Complete data transparency (UNIQUE in market!)
- **📦 Backup & Restore** - One-click data portability with checksums
- **🚀 Auto-Update** - Zero-admin updates for Windows (UNIQUE!)
- **SQLite Only** - Zero setup, zero admin rights, instant start
- **React 19, Vite 7, Tailwind CSS 4** - Latest frontend stack
- **WebSocket Support** - Real-time job updates in the browser
- **100% Privacy** - All data local, no cloud services required

## Why it exists

Finding relevant jobs across multiple boards is manual and time-consuming. Commercial tools cost $50-100/mo and often sell your data. JobSentinel runs on your machine for $0 (or ~$5-15/mo cloud-scheduled) and keeps your data private.

**Target users:** Job seekers who want automated search without paying monthly fees or sharing personal data with third parties.

## Quickstart

### 🪟 Windows 11+ (Recommended - **ZERO** Technical Knowledge Required!)

**🎯 NEW! Graphical Launcher - No Command Line Needed!**

**World's easiest installation. Just 3 clicks:**

1. **Download:** https://github.com/cboyd0319/JobSentinel/archive/refs/heads/main.zip
2. **Extract** to Desktop (right-click → "Extract All")
3. **Double-click:** `launch-gui.bat` in the folder

**That's it! A nice graphical window opens with buttons. No typing required!**

**✨ What Makes This Special:**
- 🖱️ **Graphical Interface** - Click buttons, no command line!
- ⚡ **Zero Setup** - Everything installs automatically
- 🔒 **100% Private** - All data stays on YOUR computer
- 💰 **FREE Forever** - No subscription, no trials, no hidden costs
- 🚫 **Zero Admin Rights** - Works on locked-down computers
- 📧 **Email Alerts** - Gmail, Outlook, or any email provider
- 🎨 **Modern UI** - Beautiful React 19 web interface

**Perfect for:**
- Job seekers with NO programming experience
- People who avoid command lines
- Anyone who values privacy and data ownership
- Users on corporate computers (no admin needed)

**New to terminals?** See [BEGINNER_GUIDE.md](docs/BEGINNER_GUIDE.md) - Complete zero-knowledge walkthrough!

### 🐧 macOS / Linux (Command Line)

```bash
git clone https://github.com/cboyd0319/JobSentinel && cd JobSentinel
python3 -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e .
playwright install chromium
cp config/user_prefs.example.json config/user_prefs.json
# Edit config/user_prefs.json with your keywords, locations, Slack webhook
python -m jsa.cli run-once
```

**New to terminals?** See [BEGINNER_GUIDE.md](docs/BEGINNER_GUIDE.md).

## Prereqs

| Item | Version | Why |
|------|---------|-----|
| Python | 3.11+ (3.12+ for Windows) | Backend runtime (includes SQLite) |
| Node.js | 20+ | Frontend build (React 19) - optional |
| Git | Any | Clone repo - optional (can download ZIP) |
| Slack webhook | - | Alerts (optional) |
| Reed API key | - | Reed jobs (optional) |

**Windows users:** The automated installer checks all requirements and provides clear instructions if anything is missing.

## Install

### 🪟 Windows 11 - Automated Installer (Recommended)

**The easiest way - perfect for non-technical users:**

1. **Download:** Get the ZIP from [GitHub](https://github.com/cboyd0319/JobSentinel/archive/refs/heads/main.zip)
2. **Extract:** Unzip to your Desktop
3. **Run:** Double-click `setup-windows.bat`
4. **Done!** Follow the 5-minute wizard

**✨ New Features:**
- ✅ Comprehensive system pre-check (catches issues before installation)
- ✅ Desktop shortcuts (one-click access, no command line needed)
- ✅ Enhanced error messages (clear fixes for every problem)
- ✅ Automated dependency installation
- ✅ Interactive configuration wizard
- ✅ SQLite database (zero setup, no admin rights)
- ✅ Health check validation
- ✅ First-run verification

See [BEGINNER_GUIDE.md](docs/BEGINNER_GUIDE.md) for detailed Windows setup.

### 🐧 All Platforms - Interactive Setup Wizard

**For users comfortable with command line:**

```bash
# Interactive setup wizard (SQLite automatic - no database installation needed!)
python -m jsa.cli setup

# Guides you through:
# - Keywords and preferences
# - Job sources
# - Slack notifications

# SQLite database configured automatically:
# ✅ ZERO setup - Instant start
# ✅ NO admin rights needed (Windows-friendly!)
# ✅ 100% private - Single file database (data/jobs.sqlite)
```

### 🛠️ Manual Installation (Advanced)

**For developers and power users:**

```bash
# 1. Backend setup (SQLite included, no database installation!)
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e .
playwright install chromium

# 2. Frontend (for Web UI)
cd frontend
npm install
npm run build
cd ..

# 3. Configuration
cp config/user_prefs.example.json config/user_prefs.json
# Edit with your preferences

# 4. Database
# SQLite is configured automatically - nothing to install!
# Database file created at: data/jobs.sqlite
```

## Usage

### Basic
```bash
python -m jsa.cli run-once
```

### Modern Web UI (React 19 + WebSocket)
```bash
# Start FastAPI backend
python -m jsa.cli api --port 8000

# In another terminal, start React frontend
cd frontend && npm run dev
# Visit http://localhost:3000

# Features:
# - Real-time job updates via WebSocket
# - Dashboard with statistics
# - Job search and filters
# - Application tracker
# - Resume analyzer
```

### Advanced CLI
```bash
# Dry-run (no Slack alerts)
python -m jsa.cli run-once --dry-run

# Custom config
python -m jsa.cli run-once --config /path/to/custom.json

# Health check
python -m jsa.cli health

# Legacy Flask UI (still available)
python -m jsa.cli web --port 5000
```

## Configuration

| Name | Type | Default | Example | Notes |
|------|------|---------|---------|-------|
| keywords | list[str] | [] | ["python", "backend"] | Match job title/description |
| locations | list[str] | [] | ["Remote", "San Francisco"] | Location filters |
| salary_min | int | 0 | 120000 | Min salary USD |
| denied_companies | list[str] | [] | ["Meta", "Amazon"] | Exclude companies |
| job_sources.*.enabled | bool | false | true | Enable source |
| job_sources.*.api_key | str | "" | "reed_abc123" | API key if needed |
| slack.webhook_url | str | "" | "https://hooks.slack.com/..." | Slack webhook |
| slack.channel | str | "#job-alerts" | "#engineering-jobs" | Target channel |

**Example:**
```json
{
  "keywords": ["python", "backend"],
  "locations": ["Remote"],
  "salary_min": 100000,
  "job_sources": {
    "jobswithgpt": { "enabled": true }
  },
  "slack": {
    "webhook_url": "YOUR_WEBHOOK_URL",
    "channel": "#job-alerts"
  }
}
```

## Features

### 🏆 World-Class Features (UNIQUE to JobSentinel)

**Privacy Dashboard** — Complete data transparency. See every byte stored, verify zero telemetry, export for compliance.
```bash
python -m jsa.cli privacy
```

**Backup & Restore** — One-click data portability. Standard tar.gz format, SHA-256 checksums, cross-platform.
```bash
python -m jsa.cli backup create
```

**Auto-Update** — Zero-admin updates. Automatic backup, health verification, rollback support. Windows-friendly!
```bash
python -m jsa.cli update
```

### 🚀 Core Features

**Windows 11 Ready** — Zero admin rights needed! Automated installer, SQLite database, 100% local setup

**Job scoring** — Multi-factor algorithm: skills 40%, salary 25%, location 20%, company 10%, recency 5%

**Scam detection** — FBI IC3 + FTC + BBB patterns; filters MLM and ghost job postings

**Resume analysis** — 13 industry profiles (Tech, Healthcare, Finance, Legal, etc.) with ATS optimization

**ML capabilities** — BERT semantic matching, sentiment analysis, skills gap analysis (optional, $0 cost)

**Security** — OWASP ASVS 5.0 patterns: input validation, rate limiting, SQL injection detection

**Reliability** — Circuit breakers, exponential backoff, health checks

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for technical details.

## Development

```bash
make dev    # Install dev dependencies
make test   # Run tests
make lint   # Ruff check
make fmt    # Black format
make type   # mypy type check
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for full dev setup.

## Architecture

```
Job Sites → Scrapers → Scoring → Slack Alerts
                ↓         ↓
              Config   SQLite
```

**Flow:** Scrape public job boards → score against prefs → alert high matches

**Data in:** Job site HTML/JSON. **Data out:** Slack webhooks, SQLite (local)

**Trust boundaries:** API keys in `.env`, no telemetry, all storage local

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).



## Security

**Secrets:** `.env` or env vars; never commit. Required: `SLACK_WEBHOOK_URL`. Optional: `OPENAI_API_KEY`, Reed API key

**Least privilege:** Scrapers read-only, Slack webhook `incoming-webhook` scope, database file permissions

**Supply chain:** Dependencies pinned in `pyproject.toml`, Playwright from official CDN

**Disclosure:** Email security@yourdomain.tld (see [SECURITY.md](SECURITY.md)). Response: 3 business days

## Performance

**Local:** 10-50 jobs/min, ~200-500 MB RAM, SQLite ~1-5 MB per 1k jobs (single file)

**Cloud:** 2hr intervals. GCP Cloud Run: ~$8/mo (1vCPU, 512MB). AWS Fargate Spot: ~$5/mo (0.25vCPU, 512MB)

## Troubleshooting

| Error | Fix |
|-------|-----|
| `ModuleNotFoundError: No module named 'jsa'` | Activate venv: `source .venv/bin/activate`, run `pip install -e .` |
| `Playwright executable not found` | `playwright install chromium` |
| `AuthError: Invalid Slack webhook` | Test webhook: `curl -X POST -H 'Content-type: application/json' --data '{"text":"test"}' YOUR_WEBHOOK_URL` |
| `No jobs found` | Enable sources in config, verify API keys, use `--verbose` |
| `SSL certificate verify failed` | `pip install --upgrade certifi`. macOS: run `/Applications/Python 3.11/Install Certificates.command` |

See [docs/troubleshooting.md](docs/troubleshooting.md).

## Roadmap

- [ ] Resume parser (auto-match skills from PDF/DOCX)
- [ ] Email digest (daily summary)
- [ ] Browser extension (one-click apply)

See [issues](https://github.com/cboyd0319/JobSentinel/issues).

## Documentation

**Essential guides:**
- [BEGINNER_GUIDE.md](docs/BEGINNER_GUIDE.md) — Zero-knowledge terminal guide
- [troubleshooting.md](docs/troubleshooting.md) — Common issues & solutions
- [CONTRIBUTING.md](CONTRIBUTING.md) — Development setup

**Technical references:**
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — System design & data flow
- [API_INTEGRATION_GUIDE.md](docs/API_INTEGRATION_GUIDE.md) — Add new job boards
- [BEST_PRACTICES.md](docs/BEST_PRACTICES.md) — Coding standards
- [AUTHORITATIVE_STANDARDS.md](docs/AUTHORITATIVE_STANDARDS.md) — 39+ industry standards

**Operations:**
- [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) — Production deployment (AWS, GCP, Azure)
- [SRE_RUNBOOK.md](docs/SRE_RUNBOOK.md) — Incident response & monitoring
- [AI_ML_ROADMAP.md](docs/AI_ML_ROADMAP.md) — AI/ML features & roadmap

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, tests, and PR checklist.

## License

MIT — see [LICENSE](LICENSE). Use freely, keep attribution. One-liner: You can use, modify, and distribute this freely for any purpose (commercial or not) as long as you include the original license.
