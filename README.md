# 🛰️ JobSentinel

> ⚠️ **Alpha software.** It works, but there are bugs. I use it daily. Test locally first.

**Self-hosted job search automation** — scrape → de‑dupe → score → alert.
**Private by default.** **$0 locally**, ~**$5–15/mo** in *your* cloud.

[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Privacy](https://img.shields.io/badge/Privacy-Local‑first-black.svg)](#security--privacy)
[![Slack Alerts](https://img.shields.io/badge/Alerts-Slack-4A154B.svg?logo=slack)](https://slack.com/)
[![Docker](https://img.shields.io/badge/Run%20with-Docker-blue.svg)](https://www.docker.com/)
![Status](https://img.shields.io/badge/Status-Alpha-yellow.svg)
![Cost](https://img.shields.io/badge/Cloud%20cost-%7E$5–15%2Fmo-informational)

---

## Why JobSentinel
Job boards are noisy—paywalls, spam, and ghost listings waste your time.
**JobSentinel automates the grind** and keeps your data **yours**:

- **Multi‑source scraping** with junk filters and **scoring to your preferences**.
- **Local‑first + private** by design (no third‑party SaaS siphoning your searches).
- **$0 on your machine**; or run continuously in **your** cloud for about **$5–15/mo**.
- **Slack alerts** for only the high‑value matches.

---

## Security & Privacy
- **Local‑first architecture:** jobs and preferences are stored on your machine (SQLite by default).
- **No account, no tracking, no rented SaaS.** You own the runtime and the data.
- **Secrets stay with you:** keep API keys in local config or environment variables; never commit them.
- **Isolated cloud:** for cloud use, keep a **separate DB and keys** in your own account (VPS/managed container).
- **Rate‑limit friendly:** built‑in delays/retries; scrapers are written to respect `robots.txt`.

> See **`SECURITY.md`** for reporting, scope, and hardening tips.

### Data‑Flow (local)
```
[ Job Sites ]  -->  [ Scrapers ]  -->  [ Scoring Engine ]  -->  [ Alerts (Slack) ]
                          |                   |
                      [ Config ]          [ SQLite DB ]
                              (All stored locally; no third parties)
```

---

## Cost
- **Local:** **$0** (runs on your laptop/desktop; you trigger it when you want).
- **Cloud (optional):** ~**$5–15/mo** for a tiny VM/container + a scheduler (e.g., cron/Actions). You keep full control.

**Local vs Cloud**

| Aspect          | Local (Default) | Cloud (Optional)            |
|-----------------|------------------|-----------------------------|
| Cost            | **$0**           | **~$5–15/mo**               |
| Privacy         | **Maximum**      | High (your account)         |
| Uptime          | Manual runs      | Scheduled/always‑on         |
| Secrets/DB      | Local files      | Separate, per‑env           |

---

## What it does (at a glance)
- **Scrapes** multiple sources (e.g., Greenhouse, Lever, JobsWithGPT, Reed, JobSpy aggregation).
- **Scores** jobs against your preferences (keywords, salary floor, company blacklist).
- **Notifies** you in Slack with a score breakdown and links.
- **Stores locally** by default; cloud uses separate storage and keys.

---

## Quick start

> **Prereqs:** Python 3.11+, Git. For cloud, a tiny VPS or container host.

### Windows (guided)
```powershell
python scripts\setup\windows_local_installer.py
```
*(Creates venv, installs deps, and sets up a local run.)*

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
```

### Minimal config (example)
```json
{
  "keywords": ["python", "backend", "api"],
  "locations": ["Remote", "San Francisco, CA"],
  "salary_min": 120000,
  "blacklisted_companies": ["Meta"],
  "job_sources": {
    "jobswithgpt": { "enabled": true },
    "reed":       { "enabled": true, "api_key": "your_reed_key" }
  },
  "slack": {
    "webhook_url": "your_slack_webhook",
    "channel": "#job-alerts"
  }
}
```

> **Notes**
> - Obtain required API keys where applicable (e.g., Reed API; Slack **Incoming Webhooks**).
> - Never commit secrets. Use `.env` or OS keychains if preferred.

---

## Typical usage
```bash
# Validate config
python -m jobsentinel.cli config-validate --path config/user_prefs.json

# Run a local scrape
python -m jobsentinel.cli run-once

# (Optional) Start the local web UI (if enabled in your build)
python -m jobsentinel.web --port 5000
```
> Command names can vary by release; use your repo’s CLI entry points if different.

---

## Features
- **Multi‑site scraping**
- **Smart scoring:** keywords, salary filters, company blacklists
- **Slack alerts:** score breakdowns for only the good stuff
- **Local‑first:** your data stays on your machine; cloud is optional
- **Cloud cadence:** typical every 2 hours on a micro instance (~$5–15/mo)

---

## System requirements
| Platform                  | Status       | Notes                         |
|--------------------------|--------------|-------------------------------|
| Windows 10/11 + PS 5.1+  | ✅ Supported | Guided installer available    |
| macOS 13+                | ⚠️ Manual    | Python 3.11+ required         |
| Ubuntu/Linux             | ⚠️ Manual    | Python 3.11+ required         |

---

## Security notes (TL;DR)
- **Never commit secrets.** Keep keys in local config or environment; rotate regularly.
- **Separate keys & DB** for cloud deployments.
- **Respect sites:** rate limit, back off, and follow `robots.txt`.

---

## Contributing
Issues and PRs welcome. Please see **`CONTRIBUTING.md`** and **`CODE_OF_CONDUCT.md`** (if present).
Tag issues with `good first issue` and `help wanted` to encourage community fixes.

---

## License
MIT — see **`LICENSE`**.
