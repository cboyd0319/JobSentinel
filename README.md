# JobSentinel

Private job search automation that runs on your machine.

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://www.python.org/)
[![Version](https://img.shields.io/badge/Version-0.6.0-brightgreen.svg)](#)

**TL;DR**: Scrape job boards, score against your preferences, get Slack alerts. Runs locally for $0 or cloud-scheduled for ~$5-15/mo.

## What it is

JobSentinel scrapes public job boards (Greenhouse, Lever, Reed, JobsWithGPT, JobSpy), normalizes the data, scores jobs against your preferences (keywords, salary, location), and sends Slack alerts for high matches. All data stays local in SQLite. No login-required scraping, no telemetry.

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
| Python | 3.11+ | Runtime |
| Git | Any | Clone repo |
| Slack webhook | - | Alerts (optional) |
| Reed API key | - | Reed jobs (optional) |

## Install

**Automated:**
```bash
python3 scripts/install.py
```

**Manual:**
```bash
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e .
playwright install chromium
cp config/user_prefs.example.json config/user_prefs.json
```

## Usage

### Basic
```bash
python -m jsa.cli run-once
```

### Advanced
```bash
# Dry-run (no Slack alerts)
python -m jsa.cli run-once --dry-run

# Custom config
python -m jsa.cli run-once --config /path/to/custom.json

# Web UI
python -m jsa.cli web --port 5000
# Visit http://localhost:5000
```

## Configuration

| Name | Type | Default | Example | Notes |
|------|------|---------|---------|-------|
| keywords | list[str] | [] | ["python", "backend"] | Match job title/description |
| locations | list[str] | [] | ["Remote", "San Francisco"] | Location filters |
| salary_min | int | 0 | 120000 | Min salary USD |
| blacklisted_companies | list[str] | [] | ["Meta", "Amazon"] | Exclude companies |
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

**Data in:** Job site HTML/JSON. **Data out:** Slack webhooks, SQLite (local)

**Trust boundaries:** API keys in `.env`, no telemetry, all storage local

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).



## Security

**Secrets:** `.env` or env vars; never commit. Required: `SLACK_WEBHOOK_URL`. Optional: `OPENAI_API_KEY`, Reed API key

**Least privilege:** Scrapers read-only, Slack webhook `incoming-webhook` scope, SQLite file permissions

**Supply chain:** Dependencies pinned in `pyproject.toml`, Playwright from official CDN

**Disclosure:** Email security@yourdomain.tld (see [SECURITY.md](SECURITY.md)). Response: 3 business days

## Performance

**Local:** 10-50 jobs/min, ~200-500 MB RAM, SQLite ~1-5 MB per 1k jobs

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

**Operations:**
- [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) — Cloud setup
- [SRE_RUNBOOK.md](docs/SRE_RUNBOOK.md) — Incident response

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, tests, and PR checklist.

## License

MIT — see [LICENSE](LICENSE). Use freely, keep attribution. One-liner: You can use, modify, and distribute this freely for any purpose (commercial or not) as long as you include the original license.
