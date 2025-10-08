# Job Search Automation

⚠️ **Alpha software.** It works, but there are bugs. I use it daily. Test locally first.

## What It Does

I built this because hunting jobs manually sucks. This scrapes multiple sites, scores each role against your skills, and alerts you to matches worth checking.

**The Process:**

- Scrapes Indeed, LinkedIn, and Greenhouse (~500k+ jobs)
- Scores each job against your preferences
- Sends high‑scoring matches to Slack
- Stores everything locally (your data stays yours)

**Status:** Local mode works today. Cloud deployment typically costs **$5–15/month**.

---

## Quick Start

### Windows
Run the PowerShell helper:

```powershell
deploy\windows\My-Job-Finder.ps1
```

### macOS / Linux

```bash
git clone https://github.com/cboyd0319/job-search-automation
cd job-search-automation

python -m pip install -r requirements.txt

# Copy and edit your user preferences
cp config/user_prefs.example.json config/user_prefs.json

# Dry run (no side effects)
python src/agent.py --dry-run

# Actual run
python src/agent.py
```

---

## Features

- **Multi-site scraping** – Indeed, LinkedIn, Greenhouse
- **Smart scoring** – Keyword matching, salary filtering, company blacklists
- **Slack alerts** – High‑scoring matches with score breakdowns
- **Local‑first** – Your data stays on your machine
- **Cloud option** – Auto-runs every 2 hours (approx. **$5–15/month**)

---

## System Requirements

| Platform                         | Status        | Notes                         |
|----------------------------------|---------------|-------------------------------|
| Windows 10/11 + PowerShell 5.1+ | ✅ Supported  | Zero‑knowledge installer      |
| macOS 13+                        | ⚠️ Manual     | Python 3.12+ required         |
| Ubuntu/Linux                     | ⚠️ Manual     | Python 3.12+ required         |

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

```bash
# Test without running
python src/agent.py --dry-run

# Run once
python src/agent.py

# Background mode (Linux/macOS)
nohup python src/agent.py --daemon &

# Check logs
tail -f logs/agent.log
```

---

## Cloud Deployment (Optional)

⚠️ **Costs ~$5–15/month.** Read **SECURITY.md** first.

### One‑shot helper
```bash
python cloud/bootstrap.py --deploy
# ...
# To destroy:
python cloud/bootstrap.py --destroy
```

### GCP via Terraform (recommended)

```bash
cd terraform/gcp

terraform init
terraform plan
terraform apply
```

- Auto-runs every **2 hours**
- Scales to zero between runs

---

## PowerShell QA System

Built‑in quality assurance for Windows components.

```powershell
# System check
./psqa.ps1 -Mode health

# Analyze quality
./psqa.ps1 -Mode analyze

# Auto‑fix issues
./psqa.ps1 -Mode fix
```

See **QA.md** for details. PowerShell quality is **zero‑tolerance**—fix before commit.

---

## Troubleshooting

- **No jobs found:** Check `logs/scraper.log`
- **Slack not working:** `python scripts/setup/slack/slack_setup.py --test-only`
- **Import errors:** Verify Python **3.12+**, then reinstall `requirements.txt`
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
├── agent.py               # Main orchestrator
├── database.py            # SQLite storage
├── web_ui.py              # Local dashboard
sources/
├── jobswithgpt_scraper.py # GPT-powered scraper
├── reed_mcp_scraper.py    # Reed.co.uk API
└── greenhouse_scraper.py  # Greenhouse jobs
notify/
├── slack.py               # Slack notifications
└── emailer.py             # Email alerts (optional)
```

**Key files:**

- `config/user_prefs.json` – Your settings  
- `logs/agent.log` – Main log file  
- `data/jobs.db` – Job database (SQLite)  
- `psqa.ps1` – PowerShell quality checker

---

## Development

```bash
# PowerShell quality (Windows)
./psqa.ps1

# Python only
flake8 src/ && mypy src/

# Security scan
python -m bandit -r src/
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
Locally in `data/jobs.db`. Cloud deployments use separate databases.

**Why not use job boards' APIs?**  
Most don’t have public APIs; available ones are limited or expensive.

---

## Contributing

- **Before submitting:**  
  1) Run `./psqa.ps1`  
  2) Test with `--dry-run`  
  3) Ensure no secrets are committed  
  4) Keep changes simple

- **Bug reports:** Open a GitHub issue with logs and system info  
- **Code:** Fork → feature branch → PR with tests and style compliance  
- **Security issues:** Email the maintainer directly

---

## License

MIT License.

**Alpha software—use at your own risk.** I use it daily, but it has bugs.  
**Questions?** Check `TROUBLESHOOTING.md` or open a GitHub issue.
