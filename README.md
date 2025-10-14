# JobSentinel

Private job search automation that runs on your machine.

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![Version](https://img.shields.io/badge/Version-0.6.0+-brightgreen.svg)](#)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646cff.svg)](https://vitejs.dev/)

**TL;DR**: Scrape job boards, score against your preferences, get real-time alerts. Runs locally for $0 or cloud-scheduled for ~$5-15/mo. **NEW:** React 19, Vite 7, Tailwind 4, WebSocket support!

## What it is

JobSentinel scrapes public job boards (Greenhouse, Lever, Reed, JobsWithGPT, JobSpy), normalizes the data, scores jobs against your preferences (keywords, salary, location), and sends real-time alerts via Slack or WebSocket. All data stays local in PostgreSQL (privacy-first, single-user). Modern React 19 UI with live updates. No login-required scraping, no telemetry.

### ✨ What's New (v0.6.0+)
- **React 19, Vite 7, Tailwind CSS 4** - Latest frontend stack
- **WebSocket Support** - Real-time job updates in the browser
- **PostgreSQL-First** - Local PostgreSQL for cross-platform deployment
- **Enhanced Setup Wizard** - Automated PostgreSQL setup assistance
- **Cross-Platform** - Works seamlessly on macOS, Linux, and Windows

## Why it exists

Finding relevant jobs across multiple boards is manual and time-consuming. Commercial tools cost $50-100/mo and often sell your data. JobSentinel runs on your machine for $0 (or ~$5-15/mo cloud-scheduled) and keeps your data private.

**Target users:** Job seekers who want automated search without paying monthly fees or sharing personal data with third parties.

## Quickstart

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
| Python | 3.11+ | Backend runtime |
| PostgreSQL | 15+ | Local database (required) |
| Node.js | 20+ | Frontend build (React 19) |
| Git | Any | Clone repo |
| Slack webhook | - | Alerts (optional) |
| Reed API key | - | Reed jobs (optional) |

## Install

**Quick Start (Recommended):**
```bash
# Interactive setup wizard (with automatic PostgreSQL installation)
python -m jsa.cli setup

# Guides you through:
# - Automatic PostgreSQL installation and configuration
# - Keywords and preferences
# - Job sources
# - Slack notifications
```

**Manual Installation:**
```bash
# 1. Install PostgreSQL 15+ (if not already installed)
# macOS: brew install postgresql@15 && brew services start postgresql@15
# Ubuntu/Debian: sudo apt install postgresql-15 && sudo systemctl start postgresql
# Windows: Download from https://www.postgresql.org/download/windows/

# 2. Backend setup
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e .
playwright install chromium

# 3. Frontend (for Web UI)
cd frontend
npm install
npm run build
cd ..

# 4. Configuration
cp config/user_prefs.example.json config/user_prefs.json
# Edit with your preferences
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

**Job scoring** — Multi-factor algorithm: skills 40%, salary 25%, location 20%, company 10%, recency 5%

**Scam detection** — FBI IC3 + FTC + BBB patterns; filters MLM and ghost job postings

**Resume analysis** — 13 industry profiles (Tech, Healthcare, Finance, Legal, etc.) with ATS optimization

**ML capabilities** — BERT semantic matching, sentiment analysis, skills gap analysis (optional, $0 cost)

**Security** — OWASP ASVS 5.0 patterns: input validation, rate limiting, SQL injection detection

**Reliability** — Circuit breakers, exponential backoff, health checks

See [docs/ADVANCED_FEATURES.md](docs/ADVANCED_FEATURES.md) for details.

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

**Data in:** Job site HTML/JSON. **Data out:** Slack webhooks, PostgreSQL (local)

**Trust boundaries:** API keys in `.env`, no telemetry, all storage local

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).



## Security

**Secrets:** `.env` or env vars; never commit. Required: `SLACK_WEBHOOK_URL`. Optional: `OPENAI_API_KEY`, Reed API key

**Least privilege:** Scrapers read-only, Slack webhook `incoming-webhook` scope, PostgreSQL user permissions

**Supply chain:** Dependencies pinned in `pyproject.toml`, Playwright from official CDN

**Disclosure:** Email security@yourdomain.tld (see [SECURITY.md](SECURITY.md)). Response: 3 business days

## Performance

**Local:** 10-50 jobs/min, ~200-500 MB RAM, PostgreSQL ~1-5 MB per 1k jobs

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

**Getting started:**
- [BEGINNER_GUIDE.md](docs/BEGINNER_GUIDE.md) — New to terminals
- [quickstart.md](docs/quickstart.md) — 5-minute setup
- [troubleshooting.md](docs/troubleshooting.md) — Common errors

**Features:**
- [ADVANCED_FEATURES.md](docs/ADVANCED_FEATURES.md) — ML, security, reliability
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — System design
- [API_SPECIFICATION.md](docs/API_SPECIFICATION.md) — REST API

**Strategic Planning:**
- [CAPABILITIES_GAP_ANALYSIS.md](docs/CAPABILITIES_GAP_ANALYSIS.md) — Roadmap to world's best job search tool
- [EXECUTIVE_SUMMARY_GAP_ANALYSIS.md](docs/EXECUTIVE_SUMMARY_GAP_ANALYSIS.md) — Executive summary (2-page)
- [COMPARISON.md](docs/COMPARISON.md) — vs AIHawk, Teal, Huntr, JobScan

**Operations:**
- [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) — Cloud setup
- [SRE_RUNBOOK.md](docs/SRE_RUNBOOK.md) — Incident response

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, tests, and PR checklist.

## License

MIT — see [LICENSE](LICENSE). Use freely, keep attribution. One-liner: You can use, modify, and distribute this freely for any purpose (commercial or not) as long as you include the original license.
