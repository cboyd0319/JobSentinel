> ⚠️ **Alpha software.** It works, but there are bugs. I use it daily. Test locally first.

# 🛰️ JobSentinel
**Self-hosted job search automation.** Scrape → de-dupe → score → alert. **Private by default.** Free locally; ~\$5/mo in your own cloud.

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Run%20with-Docker-blue.svg)](https://www.docker.com/)
[![Slack Alerts](https://img.shields.io/badge/Alerts-Slack-4A154B.svg?logo=slack)](https://slack.com/)
[![Privacy](https://img.shields.io/badge/Privacy-Local-first-black.svg)](#)
[![Status](https://img.shields.io/badge/Status-Alpha-yellow.svg)](#)

---

### 🔒 Why JobSentinel?
Job boards are noisy—paywalls, spam, and ghost listings waste your time.  
**JobSentinel automates the grind** and keeps your data **yours**:
- Scrapes multiple sources, filters junk, and **scores to your preferences**
- **Local-first + private** by design (no third-party SaaS siphoning your searches)
- **Free on your machine**; or run it in your own cloud for about **\$5/mo**

---

🧠 **Coming Soon**
- More source integrations (Lever, Workable, ZipRecruiter)
- Ghost-job detection scoring
- Optional notifications via Discord, Telegram, or email
- Web dashboard and quick setup UI

---
# Job Search Automation

## What It Does

I built this because hunting jobs manually sucks. This scrapes multiple sites, scores each role against your skills, and alerts you to matches worth checking.

**The Process:**

- Scrapes Greenhouse, Lever, JobsWithGPT, Reed, and JobSpy multi‑site aggregation (~500k+ jobs)
- Scores each job against your preferences
- Sends only high‑scoring matches to personal Slack
- Stores everything locally (your data ALWAYS stays yours)

**Status:** Local mode works today. Cloud deployment typically costs **$5–15/month**.

---

## Quick Start

### Windows
Use the guided installer:

```powershell
python scripts\setup\windows_local_installer.py
```

### macOS / Linux

```bash
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel

python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m pip install -e .[dev]

# Copy and edit your user preferences
cp config/user_prefs.example.json config/user_prefs.json

# Run web UI (new CLI)
jsa web --port 5000
```

---

## Features

- **Multi-site scraping** – Greenhouse, Lever, JobsWithGPT, Reed, JobSpy aggregation
- **Smart scoring** – Keyword matching, salary filtering, company blacklists
- **Slack alerts** – High‑scoring matches with score breakdowns
- **Local‑first** – Your data stays on your machine
- **Cloud option** – Auto-runs every 2 hours (approx. **$5–15/month**)

---

## System Requirements

| Platform                         | Status        | Notes                         |
|----------------------------------|---------------|-------------------------------|
| Windows 10/11 + PowerShell 5.1+ | ✅ Supported  | Guided installer available    |
| macOS 13+                        | ⚠️ Manual     | Python 3.11+ required         |
| Ubuntu/Linux                     | ⚠️ Manual     | Python 3.11+ required         |

---

## Configuration

Edit `config/user_prefs.json` and set your preferences. Example:

```json
{
  "keywords": ["python", "backend", "api"],
  "locations": ["San Francisco, CA", "Remote"],
  "salary_min": 120000,
  "blacklisted_companies": ["Meta"],
  "resume": {
    "enabled": true,
    "file_path": "/path/to/resume.pdf"
  },
  "job_sources": {
    "jobswithgpt": { "enabled": true },
    "reed": { "enabled": true, "api_key": "your_reed_key" }
  },
  "slack": {
    "webhook_url": "your_slack_webhook",
    "channel": "#job-alerts"
  }
}
```

**Get API keys:**  
- Reed: <https://reed.co.uk/developers>  
- Slack: Workspace settings → **Apps** → **Incoming Webhooks**

---

## Commands

### New CLI (modularized core)

After `pip install -e .`, use the typed CLI:

```bash
jsa web --port 5000           # run local web UI
jsa config-validate --path config/user_prefs.json
jsa health                    # print quick health summary
```


# 🛰️ JobSentinel  
**Self-hosted job intelligence system — private, automated, and free to run locally.**

JobSentinel scrapes multiple job sites, scores each role against your preferences, and alerts you only to high-value matches — automatically.  
It’s built for *anyone* who’s tired of endless scrolling, fake postings, and recruiter spam.

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Run%20with-Docker-blue.svg)](https://www.docker.com/)
[![Slack Alerts](https://img.shields.io/badge/Alerts-Slack-4A154B.svg?logo=slack)](https://slack.com/)
[![Privacy](https://img.shields.io/badge/Privacy-Local%20First-black.svg)](#)
[![Status](https://img.shields.io/badge/Status-Active-success.svg)](#)

---

### 🧩 What It Does

I built this because hunting jobs manually sucks.  
This scrapes multiple sites, scores each role against your skills, and alerts you to matches worth checking.

**The Process:**
- Scrapes Indeed, LinkedIn, and Greenhouse (~500k+ jobs)
- Scores each job against your preferences
- Sends high-scoring matches to Slack
- Stores everything locally (your data stays yours)

**Status:**  
✅ Local mode works today  
☁️ Cloud deployment typically costs **$5–15/month**

---

### ⚙️ Features

- 🌐 **Multi-site scraping** – Indeed, LinkedIn, Greenhouse  
- 🧠 **Smart scoring** – Keyword matching, salary filtering, company blacklists  
- 💬 **Slack alerts** – High-scoring matches with score breakdowns  
- 💾 **Local-first** – Your data stays on your machine  
- ☁️ **Cloud option** – Auto-runs every 2 hours (~$5–15/month)

---

### 🚀 Quick Start

```bash
# Clone the repo
./psqa.ps1 -Mode analyze
cd JobSentinel

# Run locally


# Or deploy to your own private cloud (GCP, AWS, Azure)
# Costs around $5–15/month for continuous operation
```

---
# Auto‑fix issues
./psqa.ps1 -Mode fix
```

PowerShell quality is **zero‑tolerance**—fix before commit.

---

## Troubleshooting

- **No jobs found:** Check `data/logs/*.log`
- **Slack not working:** `python scripts/setup/slack/slack_setup.py --test-only`
- **Import errors:** Verify Python **3.11+**, then reinstall `requirements.txt`
- **Permission issues (Windows):** Run PowerShell **as Administrator**

Test a single scraper:

```bash
python sources/jobswithgpt_scraper.py --test
```

Webhook smoke test:

```bash
curl -X POST -H 'Content-type: application/json'   --data '{"text":"Test"}' YOUR_WEBHOOK_URL
```

Rate limiting (example):

```json
{
  "request_delay": 2.0,
  "max_retries": 3
}
```

---

## Architecture

```text
src/
├── agent.py                  # Main orchestrator
├── database.py               # SQLite storage
├── web_ui.py                 # Legacy shim; new web lives in jsa.web
jsa/                         # New typed core package (under src/jsa)
├── web/app.py               # Flask app factory: create_app()
├── web/blueprints/*.py      # Split routes: main, skills, review, slack
├── http/sanitization.py     # Safe URL utilities
├── config.py                # Typed config facade
└── logging.py               # Structured logging wrapper
sources/
├── jobswithgpt_scraper.py    # JobsWithGPT API integration
├── reed_mcp_scraper.py       # Reed.co.uk API
├── jobspy_mcp_scraper.py     # JobSpy MCP multi‑site aggregation
├── greenhouse_scraper.py     # Greenhouse
└── lever_scraper.py          # Lever
notify/
├── slack.py                  # Slack notifications
└── emailer.py                # Email alerts (optional)
```

See also: docs/ARCHITECTURE.md for refactor overview.

---

## Quality Pipeline

Recommended dev workflow (inside a venv):

```bash
make fmt        # format
make lint       # ruff
make type       # mypy (strict on src/jsa)
make test-core  # tests for new core
make cov        # coverage for src/jsa
```

Optional: mutation tests

```bash
make mut  # requires: pip install mutmut
```

Legacy config files in config/ are retained for compatibility, but the root-level pyproject.toml is authoritative for packaging and tooling.

### MegaLinter (CI)

This repo includes a MegaLinter workflow that validates the full codebase with fast, pragmatic linters (Markdown, YAML, JSON, Shell, PowerShell, Dockerfile, secrets) and runs Python linters only on the new typed core and its tests. Reports are uploaded as CI artifacts under “mega-linter-reports”.

Local usage is optional; CI runs automatically on PRs and pushes to `main`.

---

## Contributing

We welcome contributions! Please see **[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)** for complete guidelines.

**Quick Start:**

1) Setup venv and install dev dependencies (see Quick Start above)
2) Enable pre-commit hooks:

```bash
pip install pre-commit
pre-commit install
pre-commit run --all-files
```

3) Before opening a PR:
- Run all quality checks: `pre-commit run --all-files`
- Ensure tests pass: `pytest`
- Review [Code Standards](docs/improvements/code-standards-compliance.md)
- Keep changes small and focused; add/adjust tests
- No secrets committed; read [docs/SECURITY.md](docs/SECURITY.md)


**Key files:**

- `config/user_prefs.json` – Your settings  
- `logs/agent.log` – Main log file  
- `data/jobs.sqlite` – Job database (SQLite)  
- `psqa.ps1` – PowerShell quality checker

---

## Development

```bash
# PowerShell quality (Windows)
./psqa.ps1

# Python quality (new core)
make fmt && make lint && make type && make test-core

# Security scan (core)
python -m bandit -r src/jsa
```

**Add a new job source:**

1. Create scraper in `sources/`
2. Inherit from `JobScraperBase`
3. Add it to `config/user_prefs.json`
4. Test with `--dry-run`

---

## Security Notes

- API keys live in config files—**never** commit them
- Local runs use local SQLite by default
- Scrapers respect `robots.txt`
- Built‑in rate limiting
- No personal data stored beyond job matches

**Cloud security:** Use **separate API keys** for local vs. cloud.

---

## FAQ

**How often should I run this?**  
Daily or every few hours. More frequent runs increase rate‑limit risk.

**What if a site blocks me?**  
Increase delays, use a VPN, or disable that source temporarily.

**Can I customize scoring?**  
Yes—see `matchers/rules.py` for keyword weights and scoring logic.

**Where is my data stored?**  
Locally in `data/jobs.sqlite`. Cloud deployments use separate databases.

**Why not use job boards' APIs?**  
Most don’t have public APIs; available ones are limited or expensive.

---

## Documentation

- **[docs/](docs/)** - Complete documentation including architecture, security policy, and code analysis
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and recent improvements
- **[CONTRIBUTING.md](docs/CONTRIBUTING.md)** - Contribution guidelines
- **[SECURITY.md](docs/SECURITY.md)** - Security policy and vulnerability reporting

---

## License

MIT License. See [LICENSE](LICENSE) for details.

**Alpha software—use at your own risk.** This is an active project with ongoing improvements.  
**Questions?** Open a GitHub issue or check the [documentation](docs/).
Health endpoint:

- GET `/healthz` returns `{ ok: bool, stats: { total_jobs, high_score_jobs } }`
