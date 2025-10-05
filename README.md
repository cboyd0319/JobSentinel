# Job Search Automation

**TL;DR:** Scrapes jobs, scores them against your preferences, sends the good ones to Slack.

⚠️ **Alpha software.** It works but has bugs. I use it daily. Test locally first.

## What It Does

I built this because hunting jobs manually is slow. This scrapes multiple sites, scores each role against your skills, and alerts you to matches worth checking.

**The Process:**
- Scrapes Indeed, LinkedIn, Greenhouse (500k+ jobs)
- Scores each job against your preferences
- Sends high-scoring matches to Slack
- Stores everything locally (your data stays yours)

**Status:** Local mode works well. Cloud deployment works but costs $5-15/month.

## Features

**Job Discovery:**
- Multi-site scraping (parallel processing, 2-5 min sweeps)
- Smart deduplication across platforms
- Geographic and remote filtering

**Matching:**
- Keyword scoring weighted by your preferences  
- Salary filtering
- Company blacklists
- Rule-based + AI scoring

**Alerts:**
- Slack integration (`python scripts/setup/slack/slack_setup.py`)
- Email digests
- Score breakdowns included

**Privacy:**
- Local-first (no tracking, no telemetry)
- Open source (audit the code)
- Your data never leaves your machine (unless you deploy to cloud)

## System Requirements

| Platform | Status | Notes |
| --- | --- | --- |
| Windows 11/10 + PowerShell 7 | ✅ Fully supported | Complete installer and automation |
| macOS 13+ | 🚧 Future enhancement | Manual Python setup required for now |
| Ubuntu/Debian/RHEL | 🚧 Future enhancement | Manual Python setup required for now |
| GCP Cloud Run | ✅ Fully supported | **COSTS MONEY** - Read COST.md first |
## Requirements

- Python 3.11+ (3.12 recommended)
- Internet access for scraping
- Slack workspace (optional, for alerts)

## Quick Start

**New to Python?**
```bash
git clone https://github.com/cboyd0319/job-search-automation.git
cd job-search-automation
python scripts/emergency/zero_knowledge_startup.py
```

**Know Python already?**
```bash
python scripts/setup/dev/setup_wizard.py
```

**Manual setup:**
```bash
# Environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Config
cp config/user_prefs.example.json config/user_prefs.json
python scripts/setup/slack/slack_setup.py

# Test
python -m src.agent --mode poll
```

**Windows one-click:**
```powershell
irm https://raw.githubusercontent.com/cboyd0319/job-search-automation/main/deploy/windows/Install-Job-Finder.ps1 | iex
```

⚠️ **This downloads and runs code.** Review the script first.

## macOS / Linux Installation (Future Enhancement)

⚠️ **Currently Windows-only.** macOS and Linux installers are planned but not yet implemented.

For now on macOS/Linux:
1. Install Python 3.11+
2. Clone this repo
3. Run: `python scripts/emergency/zero_knowledge_startup.py`
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

## 🎯 Resume & ATS Analysis

Two layers currently:

1. **Parsing (`utils/resume_parser.py`)** – Extracts skills, titles, experience heuristic, education.
2. **Modular ATS Analyzer (`utils/ats_analyzer.py`)** – Scores resume (+ optional job description) across:
   - Keyword & fuzzy overlap
   - Taxonomy breadth / industry coverage
   - Section coverage
   - Formatting hygiene
   - Readability & action verbs
   - Experience alignment (required vs inferred)
   - Recency signals (latest years)

Quick programmatic usage:
```bash
python -c "from utils.ats_analyzer import analyze_resume; print(analyze_resume(resume_text=open('resume.txt','r',encoding='utf-8').read()).overall_score)"
```

Legacy monolithic scanner (`utils/ats_scanner.py`) still exists; new improvements target the modular analyzer.

Optional extras (OCR, fuzzy, spaCy):
```bash
pip install .[resume]
```

## Database & Storage

- Local data lives in `data/jobs.sqlite` (async) and `data/jobs_unified.sqlite` (enriched view).
- `src/database.py` exposes async helpers and a sync session for the Flask UI (`python -m src.web_ui`).
- `cloud/providers/gcp/cloud_database.py` keeps a Cloud Storage backup in sync, guarded by a distributed lock and checksum verification.

Backups older than `BACKUP_RETENTION_DAYS` are removed automatically during the `cleanup` mode.

## Slack Setup (Unified)

```bash
python scripts/slack_setup.py
```

Wizard flow: workspace → manifest import → enable incoming webhook → test → `.env` write. Non-interactive option:
```bash
python scripts/setup/slack/slack_setup.py --webhook https://hooks.slack.com/services/AAA/BBB/CCC --no-test
```
Docs: [docs/SLACK_SETUP.md](docs/SLACK_SETUP.md)

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

# Re-run Slack test / reconfigure
python scripts/slack_setup.py --test-only

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
python scripts/slack_setup.py --test-only

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

## Roadmap (High-Level)

- AWS & Azure deployment support (beyond GCP)
- Expanded skill taxonomy + weighting presets
- Lightweight semantic similarity (optional) for skill inference
- Web UI filtering & shortlisting
- Export formats (CSV / JSONL / Markdown digest)
- Improved PDF layout heuristics & language detection

---

## Documentation Map

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

**Project Status:** Alpha (expect breaking changes; pin a commit if stability matters)
