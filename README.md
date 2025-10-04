# Job Search Automation

> ⚠️ **ALPHA SOFTWARE - BUYER BEWARE**
>
> This software is rough. I use it daily, but it breaks sometimes.
>
> - It will crash. Plan for it.
> - It will find false positives. Review everything.
> - Cloud deployment costs real money. Read [COST.md](COST.md) first.
> - Security isn't perfect. Read [SECURITY.md](SECURITY.md).
>
> **No warranty. Use at your own risk.** Test locally for weeks before considering cloud.

---

I built this because job searching sucks and I wanted it to suck less.

It scrapes job boards, scores jobs against your criteria, dumps everything into SQLite, and pings Slack when something good shows up. Runs locally first (free), cloud optional (costs money).

**It works. Could be better. Ship first, polish later.**

## What You Get

- **Fast scraping** – Hits multiple job boards in parallel, finishes in 2-5 minutes
- **Smart filtering** – Only shows jobs that match your criteria
- **Instant alerts** – Slack notifications when good jobs appear
- **Privacy first** – Everything runs on your computer, no data sent to third parties
- **Cost control** – Free locally, known costs in cloud (~$5-15/month)

**Bottom line:** Automates the boring parts of job searching so you can focus on applying.

## System Requirements

| Platform | Status | Notes |
| --- | --- | --- |
| Windows 11/10 + PowerShell 7 | ✅ Fully supported | Complete installer and automation |
| macOS 13+ | 🚧 Future enhancement | Manual Python setup required for now |
| Ubuntu/Debian/RHEL | 🚧 Future enhancement | Manual Python setup required for now |
| GCP Cloud Run | ✅ Fully supported | **COSTS MONEY** - Read COST.md first |
| AWS Fargate / Azure | 🚧 Future enhancement | Infrastructure ready, not implemented |

Python 3.11 or 3.12 works best. Node.js is not required. Network access is only needed for scraping targets and, optionally, Slack.

## TL;DR Setup

## Quick Start\n\n**Completely new to this?** Use the zero-knowledge startup script:\n\n```bash\ngit clone https://github.com/cboyd0319/job-search-automation.git\ncd job-search-automation\npython scripts/zero_knowledge_startup.py\n```\n\nThis script assumes you know nothing about Python or job scrapers. It explains everything.\n\n**Already familiar with Python?** Use the advanced setup wizard:\n\n```bash\npython scripts/setup_wizard.py\n```

**Manual setup:**

```bash
# 1. Python environment
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 2. Configuration
cp config/user_prefs.example.json config/user_prefs.json
python scripts/slack_bootstrap.py  # Sets up Slack notifications

# 3. Test run
python -m src.agent --mode poll
```

If it works, you'll see jobs in your terminal and (maybe) Slack notifications.

## Windows One-Click Install

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm https://raw.githubusercontent.com/cboyd0319/job-search-automation/main/deploy/windows/Install-Job-Finder.ps1 | iex
```

⚠️ **This downloads and runs code from the internet.** Review the script first if you're paranoid (you should be).

Installs Python, sets up everything, adds a Start Menu shortcut.

## macOS / Linux Installation (Future Enhancement)

⚠️ **Currently Windows-only.** macOS and Linux installers are planned but not yet implemented.

For now on macOS/Linux:
1. Install Python 3.11+
2. Clone this repo
3. Run: `python scripts/zero_knowledge_startup.py`
4. Manual scheduling setup required

## Configuration

**Three files control everything:**

1. `config/user_prefs.json` – What jobs you want (copy from `user_prefs.example.json`)
2. `.env` – Your secrets (Slack webhook, email passwords)
3. `config/resume_parser.json` – Skills dictionary (optional)

**Pro tip:** Let the resume parser do the work:

```bash
python -m utils.resume_parser your-resume.pdf
```

Extracts your skills automatically. Saves 20+ minutes of manual typing.

**Bonus:** Check if your resume passes ATS filters:

```bash
python -m utils.ats_scanner your-resume.pdf
```

Shows what applicant tracking systems see. Most resumes fail this.

## Database & Storage

- Local data lives in `data/jobs.sqlite` (async) and `data/jobs_unified.sqlite` (enriched view).
- `src/database.py` exposes async helpers and a sync session for the Flask UI (`python -m src.web_ui`).
- `cloud/providers/gcp/cloud_database.py` keeps a Cloud Storage backup in sync, guarded by a distributed lock and checksum verification.

Backups older than `BACKUP_RETENTION_DAYS` are removed automatically during the `cleanup` mode.

## Slack Setup

```bash
python scripts/slack_bootstrap.py
```

The script walks you through creating a Slack app and getting a webhook URL. Takes 5 minutes if you follow directions.

Stuck? Check [docs/SLACK_SETUP.md](docs/SLACK_SETUP.md) for screenshots.

**Skip Slack?** Fine. You'll get results in the terminal and web UI instead.

## Email Notifications (Optional)

Want job digests in your inbox? Configure email notifications:

```bash
# Add to .env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS=your_app_password
DIGEST_TO=recipient@example.com

# Test configuration
python -c "from notify.emailer import test_email_config; test_email_config()"
```

**Full guide:** [docs/EMAIL_SETUP.md](docs/EMAIL_SETUP.md) - Gmail, Outlook, Yahoo setup with troubleshooting

## Cloud Deployment (GCP Only)

⚠️ **This costs real money.** Read [COST.md](COST.md) first. Seriously.

**GCP deployment** (~$5-15/month):

```bash
python -m cloud.bootstrap --provider gcp --log-level info
```

This:
- Installs Terraform
- Provisions Cloud Run, storage, scheduler
- Sets budget alerts (you're welcome)
- Uploads your data

**To shut down and stop costs:**

```bash
python -m cloud.teardown --provider gcp
```

**AWS/Azure:** Future enhancements only. Windows + GCP is the current focus.

### AWS (Future Enhancement)

**Status:** 🚧 Not implemented - placeholder code only

No working deployment available yet.

### Azure (Future Enhancement)

**Status:** 🚧 Not implemented - placeholder code only

No working deployment available yet.

## Daily Commands

```bash
# Search for jobs now
python -m src.agent --mode poll

# View results in browser
python -m src.web_ui  # then open http://localhost:5000

# Clean up old data
python -m src.agent --mode cleanup

# Fix Slack notifications
python scripts/slack_bootstrap.py

# Check system health
python -m src.agent --mode health
```

**Logs:** Check `data/logs/` when things go wrong.

## Testing & QA

- **Syntax** – `python3 -m compileall src utils sources cloud`.
- **Static analysis** – `python run_pylint.py` (optional target, honors `.pylintrc`).
- **Smoke run** – `python -m src.agent --mode poll` against example config; Slack test message confirms connectivity.
- **Terraform** – `python -m cloud.bootstrap --provider gcp --dry-run` ensures IaC plans cleanly.

## When Things Break

**Common fixes:**

```bash
# Slack stopped working
python scripts/slack_bootstrap.py

# Database errors
python -m src.agent --mode cleanup

# Scraper timeouts (add to .env)
echo "SCRAPER_TIMEOUT=600" >> .env

# Check what went wrong
ls data/logs/
```

**Still broken?** 
1. Check the error logs in `data/logs/`
2. Try the zero-knowledge startup script: `python scripts/zero_knowledge_startup.py`
3. Open a GitHub issue with the error message

## Security

**Key protections:**
- All secrets stay in `.env` (never committed to git)
- Terraform downloads are checksum-verified against HashiCorp manifests
- Slack manifests live under `config/` for scope auditing before install
- Database uses parameterized queries (no SQL injection)
- Cloud deployments use minimal IAM permissions

**Full details:** [SECURITY.md](SECURITY.md)

## Roadmap

1. Add Terraform modules for AWS Fargate and Azure Container Apps (future enhancement).
2. Expand MCP integrations for wider job coverage.
3. Push structured metrics (OpenTelemetry) into the cloud deploy.

---

## Documentation

### Getting Started
- **[QUICK_START.md](QUICK_START.md)** ⭐ – Fast onboarding (5 minutes)
- **[Getting Started](docs/GETTING_STARTED.md)** – Comprehensive first-time setup

### Essential Guides
- **[Slack Setup](docs/SLACK_SETUP.md)** – Zero-knowledge Slack configuration
- **[Email Setup](docs/EMAIL_SETUP.md)** – Email digest configuration (Gmail, Outlook, Yahoo)
- **[Resume Resources](docs/RESUME_RESOURCES.md)** – ATS scanner, templates, optimization
- **[Cost Transparency](COST.md)** – Real costs, calculator, shutdown procedures
- **[Security Guide](SECURITY.md)** – Security practices, incident response

### Reference
- **[User Guide](docs/USER_GUIDE.md)** – Feature documentation
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** – Contributing and development
- **[Project Improvements](PROJECT_IMPROVEMENTS.md)** – Detailed changelog
- **[Final Summary](FINAL_SUMMARY.md)** – Executive summary of recent updates

---

## Questions or Issues?

If something breaks or you need help:

1. Check the troubleshooting section above
2. Review the [docs/](docs/) directory
3. Open an issue on GitHub with:
   - What you tried to do
   - What happened instead
   - Relevant log output (from `data/logs/`)

---

**Project Status:** Alpha (expect bugs and breaking changes)
