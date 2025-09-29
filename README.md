# Private Job Scraper & Filter

> **Heads-up:** This repo is my ongoing side project. I refactor often and sometimes break things. If you run into trouble, open an issue and I’ll take a look.

![Python 3.12.10](https://img.shields.io/badge/python-3.12.10-blue.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
[![CI/CD Pipeline](https://github.com/cboyd0319/job-private-scraper-filter/actions/workflows/ci.yml/badge.svg)](https://github.com/cboyd0319/job-private-scraper-filter/actions/workflows/ci.yml)
[![Security Scan](https://github.com/cboyd0319/job-private-scraper-filter/actions/workflows/security.yml/badge.svg)](https://github.com/cboyd0319/job-private-scraper-filter/actions/workflows/security.yml)
[![PowerShell Validation](https://github.com/cboyd0319/job-private-scraper-filter/actions/workflows/powershell-validation.yml/badge.svg)](https://github.com/cboyd0319/job-private-scraper-filter/actions/workflows/powershell-validation.yml)

I built this for friends who wanted a quiet helper watching their favorite job boards, scoring listings, and nudging them when something looks promising. It runs locally by default so your data stays on your machine.

## Table of contents

- [What it does](#what-it-does)
- [Supported job boards](#supported-job-boards)
- [Quick start](#quick-start)
- [Configuration](#configuration)
- [Notifications](#notifications)
- [Job filters](#job-filters)
- [Optional AI scoring](#optional-ai-scoring)
- [Cloud deployment](#cloud-deployment)
- [Usage](#usage)
- [Project layout](#project-layout)
- [Security & privacy](#security--privacy)
- [Contributing](#contributing)
- [License](#license)
- [Need help?](#need-help)

## What it does

- Polls job boards on a schedule (15 minutes by default)
- Filters and scores results with rules you control
- Sends Slack or email alerts when a match crosses your threshold
- Keeps everything local unless you opt into cloud deployment

## Supported job boards

- Greenhouse (example: Cloudflare, Stripe)
- Lever (example: Netflix, Uber)
- Workday (a lot of large companies)
- Generic JS-heavy career pages via Playwright

## Quick start

### Cloud Run shortcut (recommended)

The Cloud Run bootstrapper is the path I recommend while I keep polishing the cloud workflows:

```bash
python -m cloud.bootstrap --provider gcp
```

The script installs the Google Cloud SDK if needed, creates a fresh project, enables the APIs, schedules the poller, and sets budget alerts. You still have to confirm billing once (Google requirement) before the script continues.

### Local install (macOS/Linux)

```bash
git clone https://github.com/cboyd0319/job-private-scraper-filter.git
cd job-private-scraper-filter
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m playwright install chromium
cp .env.example .env
cp config/user_prefs.example.json config/user_prefs.json
# tweak .env and config/user_prefs.json for your filters and alerts
```

### Windows quick setup

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; irm "https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/setup_windows.ps1" | iex
```

Prefer a slower walkthrough? Check `docs/WINDOWS_SETUP_GUIDE.md`.

Local installs are still supported and I plan to revisit them once the cloud pieces settle, so feel free to file issues with anything you’d like to see there.

## Configuration

```bash
cp .env.example .env
cp config/user_prefs.example.json config/user_prefs.json
```

- `.env` holds notification secrets and feature toggles
- `config/user_prefs.json` stores boards, filters, and scoring thresholds

## Notifications

Add your webhook or SMTP settings to `.env`:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_app_password
DIGEST_TO=your_email@example.com
```

## Job filters

Example `config/user_prefs.json` snippet:

```json
{
  "companies": [
    { "id": "stripe", "board_type": "lever", "url": "https://jobs.lever.co/stripe" }
  ],
  "title_allowlist": ["Security Engineer", "DevSecOps"],
  "keywords_boost": ["Zero Trust", "Kubernetes", "AWS"],
  "location_constraints": ["Remote", "US"],
  "salary_floor_usd": 150000,
  "immediate_alert_threshold": 0.9
}
```

## Optional AI scoring

Set these if you want LLM help ranking roles (totally optional):

```bash
LLM_ENABLED=true
OPENAI_API_KEY=sk-your-api-key-here
```

## Cloud deployment

Legacy installers still exist if you want AWS or Azure:

```bash
# Google Cloud Run (legacy path)
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/install.sh | bash -s -- --cloud-deploy gcp

# AWS Lambda
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/install.sh | bash -s -- --cloud-deploy aws

# Azure Container Instances
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/install.sh | bash -s -- --cloud-deploy azure
```

Cost guardrails include spending alerts ($5/$10/$15), strict resource limits, a weekend pause, and an emergency stop if spending spikes. Details live in `docs/CLOUD_COSTS.md`.

## Usage

```bash
# scrape and send alerts
python3 -m src.agent --mode poll

# daily digest
python3 -m src.agent --mode digest

# notification smoke test
python3 -m src.agent --mode test

# health check
python3 -m src.agent --mode health

# clean old rows
python3 -m src.agent --mode cleanup
```

## Project layout

```text
├── src/           # core app code (agent, database, web_ui)
├── sources/       # job board scrapers
├── matchers/      # scoring and filter helpers
├── notify/        # outbound notifications
├── utils/         # shared helpers
├── scripts/       # install, deployment, security tooling
├── cloud/         # cloud bootstrap + guardrails
├── config/        # sample configs and linter settings
├── templates/     # optional web UI templates
├── docs/          # extra guides
└── data/          # local fixtures (optional)
```

## Security & privacy

- Runs locally by default; no telemetry
- Secrets stay in `.env`
- Run `scripts/precommit-security-scan.sh` before pushing to catch obvious issues

## Contributing

Pull requests are welcome. Fork the repo, branch off `main`, and include the commands you ran for testing (`pytest`, `python3 -m src.agent --mode health`, etc.). If you touch cloud or security bits, call that out in the PR body.

## License

MIT — see `LICENSE`.

## Need help?

- Browse `docs/` for platform-specific notes and troubleshooting
- Run `python3 -m src.agent --mode health`
- Open an issue with steps to reproduce if you hit a bug

Made with ❤️ — hope it helps you find a great gig.
