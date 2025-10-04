# Job Search Automation – Automated Job Discovery, Resume Scoring & Slack Alerts

> 🚨 **ALPHA SOFTWARE - NO LIABILITY WARNING** 🚨
>
> **This project is in active development and WILL have bugs.** I use it personally, but:
> 
> - **No Warranty:** This software is provided "as-is" without any warranties
> - **Your Risk:** I accept no liability for costs, lost opportunities, or system issues
> - **Test First:** Run locally for weeks before considering cloud deployment
> - **Review Everything:** False positives are common - manually verify all matches
> - **Real Money:** Cloud deployment costs $5-15/month - read [COST.md](COST.md) first
> - **Security Gaps:** Read [SECURITY.md](SECURITY.md) before deploying anywhere
>
> **By using this software, you acknowledge these risks and agree to use it at your own discretion.**

---

I built this because manual job searching is slow and repetitive. This platform scrapes multiple job sources, scores roles against your preferences (and resume), stores results locally, and pings only the high-signal jobs to Slack. Local-first, privacy-focused, and cost-transparent.

**Status:** Alpha. Local scraping + matching are usable; cloud + advanced resume analytics are evolving.

## Core Features

### 🔥 Automated Job Discovery
- **Multi-site scraping** – Searches Indeed, LinkedIn Jobs, Greenhouse, and 500k+ positions via MCP integrations
- **Parallel processing** – Completes full job board sweeps in 2-5 minutes
- **Intelligent deduplication** – Eliminates duplicate postings across platforms

### 🎯 Smart Job Matching  
- **Keyword scoring** – Weights matches based on your skill preferences
- **Location filtering** – Supports remote, hybrid, and geographic targeting
- **Salary analysis** – Filters by compensation requirements
- **Company exclusions** – Automatically skips blacklisted employers

### 🔔 Real-time Notifications
- **Slack integration** – Instant alerts (unified setup: `python scripts/slack_setup.py`)
- **Email digests** – Optional summaries
- **Job block details** – Includes rule score + AI score (if enabled)

### 🔒 Privacy & Control
- **Local-first** – All data stays on your computer by default
- **No tracking** – No analytics, telemetry, or data collection
- **Open source** – Full transparency, audit the code yourself
- **Cost transparency** – Free locally, ~$5-15/month for cloud deployment

**Bottom line:** Let automation hunt; you evaluate and apply.

## System Requirements

| Platform | Status | Notes |
| --- | --- | --- |
| Windows 11/10 + PowerShell 7 | ✅ Fully supported | Complete installer and automation |
| macOS 13+ | 🚧 Future enhancement | Manual Python setup required for now |
| Ubuntu/Debian/RHEL | 🚧 Future enhancement | Manual Python setup required for now |
| GCP Cloud Run | ✅ Fully supported | **COSTS MONEY** - Read COST.md first |
| AWS Fargate / Azure | 🚧 Future enhancement | Infrastructure ready, not implemented |

Python 3.11 or 3.12 works best. Node.js is not required. Network access is only needed for scraping targets and, optionally, Slack.

## Quick Start

**Completely new to this?** Use the zero-knowledge startup script:

```bash
git clone https://github.com/cboyd0319/job-search-automation.git
cd job-search-automation
python scripts/zero_knowledge_startup.py
```

This script assumes you know nothing about Python or job scrapers. It explains everything.

**Already familiar with Python?** Use the advanced setup wizard:

```bash
python scripts/setup_wizard.py
```

**Manual setup:**

```bash
# 1. Python environment
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 2. Configuration
cp config/user_prefs.example.json config/user_prefs.json
python scripts/slack_setup.py  # Unified Slack setup (wizard + test)

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
python scripts/slack_setup.py --webhook https://hooks.slack.com/services/AAA/BBB/CCC --no-test
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
