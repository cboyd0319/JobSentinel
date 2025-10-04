# Job Finder

> ⚠️ **ALPHA SOFTWARE - Use with Caution**
>
> This project is in early development (Alpha stage). It works, but expect bugs, breaking changes, and rough edges.
> - Test locally before deploying to cloud
> - Review [SECURITY.md](SECURITY.md) and [COST.md](COST.md) before cloud deployment
> - Don't rely on this as your only job search tool
> - Back up your data regularly
>
> **Recommended:** Start with local deployment ($0 cost) and test thoroughly before moving to cloud.

---

I built this to keep my job search honest, fast, and private. It scrapes targeted job boards, scores each role against my rules, drops matches into SQLite, and pings Slack when something good shows up. Everything runs locally first, cost stays near zero, and every cloud deployment is optional and auditable.

## What You Get

- **Speed** – Concurrent scrapers, async scoring, and cached duplicates keep a full polling run under a few minutes
- **Security** – No secrets in the repo, SQLite stays encrypted-at-rest in cloud, Slack webhooks live only in `.env`
- **Cost Control** – Local by default ($0), GCP deployment caps resources, no always-on VM costs
- **Future Proofing** – Works on Windows → macOS → Linux. GCP works today, AWS and Azure stubs ready for infrastructure

**Cost:** $0 locally, ~$4-12/month on GCP (see [COST.md](COST.md) for full breakdown)

## System Requirements

| Platform | Status |
| --- | --- |
| Windows 11/10 + PowerShell 7 | ✅ Fully scripted installer |
| macOS 13+ | ✅ Shell installer + Python 3.11+ |
| Ubuntu/Debian/RHEL | ✅ Shell installer + Python 3.11+ |
| GCP Cloud Run (Cloud SQL Lite sync) | ✅ Terraform driven |
| AWS Fargate / Azure Container Apps | 🚧 placeholders ready for IaC |

Python 3.11 or 3.12 works best. Node.js is not required. Network access is only needed for scraping targets and, optionally, Slack.

## TL;DR Setup

**New here?** See [QUICK_START.md](QUICK_START.md) for step-by-step instructions.

### 1. Clone the repo

```bash
git clone https://github.com/cboyd0319/job-search-automation.git
cd job-search-automation
```

### 2. Install dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Configure secrets

```bash
cp config/user_prefs.example.json config/user_prefs.json
python scripts/slack_bootstrap.py
```

`scripts/slack_bootstrap.py` walks you through Slack workspace creation, imports the manifest, stores the webhook in `.env`, and sends a test message to confirm it works.

**New to Slack?** The wizard is designed for zero technical knowledge. Just follow the prompts!

### 4. Run the agent

```bash
python -m src.agent --mode poll
```

The agent pulls configured job boards, scores the results, and emits high-score alerts to Slack. `--mode digest` compiles a daily summary, `--mode cleanup` purges stale rows and cloud backups.

## Windows Installer

```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm https://raw.githubusercontent.com/cboyd0319/job-search-automation/main/deploy/windows/Install-Job-Finder.ps1 | iex
```

The script installs Python, creates the virtual environment, restores dependencies, drops a Start Menu shortcut, and opens the Slack helper when the webhook is missing.

## macOS / Linux Installer

```bash
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-search-automation/main/deploy/macos/install.sh | bash
# or
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-search-automation/main/deploy/linux/install.sh | bash
```

Both installers create `~/.config/job-finder`, place user preferences, and hook a systemd timer or launchd plist so the poller runs on schedule.

## Configuration

- `config/user_prefs.json` – Companies, keywords, thresholds (git-ignored, contains your preferences)
- `config/resume_parser.json` – Skill and title dictionaries used by the resume parser
- `.env` – Runtime secrets like `SLACK_WEBHOOK_URL`, database URLs, optional cloud overrides

**Pro tip:** Run `python -m utils.resume_parser <path-to-resume>` to auto-extract skills/titles from your resume, then edit the JSON to refine your preferences.

**New:** ATS-level resume scanner! Check your resume's compatibility with Applicant Tracking Systems:
```bash
python -m utils.ats_scanner <path-to-resume> [job-description.txt] [industry]
```

See [docs/RESUME_RESOURCES.md](docs/RESUME_RESOURCES.md) for templates, guides, and best practices.

## Database & Storage

- Local data lives in `data/jobs.sqlite` (async) and `data/jobs_unified.sqlite` (enriched view).
- `src/database.py` exposes async helpers and a sync session for the Flask UI (`python -m src.web_ui`).
- `cloud/providers/gcp/cloud_database.py` keeps a Cloud Storage backup in sync, guarded by a distributed lock and checksum verification.

Backups older than `BACKUP_RETENTION_DAYS` are removed automatically during the `cleanup` mode.

## Slack Notifications

Run the interactive setup wizard:

```bash
python scripts/slack_bootstrap.py
```

The wizard walks you through:
1. Creating a free Slack workspace (or using an existing one)
2. Creating a Slack app with the provided manifest
3. Getting your webhook URL
4. Testing the connection

The webhook URL is saved to `.env` (never committed to git).

**Detailed guide:** See [docs/SLACK_SETUP.md](docs/SLACK_SETUP.md) for step-by-step screenshots and troubleshooting.

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

## Cloud Deployments

⚠️ **Review [COST.md](COST.md) and [SECURITY.md](SECURITY.md) before deploying to cloud.**

### Google Cloud Platform (GCP)

**Cost:** ~$4-12/month | **Status:** ✅ Fully working

```bash
python -m cloud.bootstrap --provider gcp --log-level info
```

What this does:
- Installs Terraform (checksum verified from HashiCorp)
- Provisions Cloud Run + Artifact Registry + Cloud Scheduler
- Sets up budget alerts ($5, $10, $15)
- Uploads SQLite snapshot
- Prints a cost receipt with estimates

**Teardown:** `python -m cloud.teardown --provider gcp` (removes everything, stops all costs)

### AWS (Future)

**Cost:** ~$10-20/month (est.) | **Status:** 🚧 Planned

Infrastructure placeholders ready in `cloud/providers/aws`. Terraform modules pending.

### Azure (Future)

**Cost:** ~$10-15/month (est.) | **Status:** 🚧 Planned

Infrastructure placeholders ready in `cloud/providers/azure`. Terraform modules pending.

## Maintenance

| Command | What it does |
| --- | --- |
| `python -m src.agent --mode health` | Runs the health monitor and prints remediation hints. |
| `python -m src.agent --mode cleanup` | Purges old jobs and trims cloud backups. |
| `python scripts/slack_bootstrap.py` | Re-key the Slack webhook on demand. |
| `python -m compileall src utils sources cloud` | Quick syntax sanity check (used during CI). |

Logs land in `data/logs/`. The Flask UI (`python -m src.web_ui`) exposes the latest matches, lets me edit keywords, and surfaces log output in the browser.

## Testing & QA

- **Syntax** – `python3 -m compileall src utils sources cloud`.
- **Static analysis** – `python run_pylint.py` (optional target, honors `.pylintrc`).
- **Smoke run** – `python -m src.agent --mode poll` against example config; Slack test message confirms connectivity.
- **Terraform** – `python -m cloud.bootstrap --provider gcp --dry-run` ensures IaC plans cleanly.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Slack test fails | Re-run `scripts/slack_bootstrap.py`, confirm the webhook URL, and ensure the channel exists. |
| SQLite locked | The agent was interrupted mid-write. Wait a few seconds or rerun with `--mode cleanup`. |
| Playwright timeout | Set `SCRAPER_TIMEOUT=600` in `.env` or add a site-specific scraper in `sources/`. |
| Too many duplicates | Flush the in-memory cache via `utils/cache.job_cache.clear()` or bump `MAX_JOB_CACHE` in `.env`. |

## Security

**Key protections:**
- All secrets stay in `.env` (never committed to git)
- Terraform downloads are checksum-verified against HashiCorp manifests
- Slack manifests live under `config/` for scope auditing before install
- Database uses parameterized queries (no SQL injection)
- Cloud deployments use minimal IAM permissions

**Full details:** [SECURITY.md](SECURITY.md)

## Roadmap

1. Add Terraform modules for AWS Fargate and Azure Container Apps.
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
