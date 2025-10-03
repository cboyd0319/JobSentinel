# Getting Started

**Quick start guide to get your Job Finder running in 5 minutes.**

---

## 📋 Prerequisites

- **Python 3.11+** (3.12 or 3.13 recommended)
- **Git** (for cloning the repo)
- **Google Cloud account** (optional - only for cloud deployment)

---

## 🚀 Quick Start (Local)

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/cboyd0319/job-private-scraper-filter.git
cd job-private-scraper-filter

# Install dependencies
pip install -r requirements.txt
```

### 2. Configure Your Preferences

```bash
# Copy example config
cp config/user_prefs.example.json config/user_prefs.json

# Edit with your preferences
nano config/user_prefs.json
```

**Example configuration:**
```json
{
  "keywords": ["python", "devops", "kubernetes"],
  "job_titles": ["Software Engineer", "DevOps Engineer"],
  "locations": [
    {"city": "Denver", "state": "CO"},
    {"city": "Remote", "state": "US"}
  ],
  "minimum_salary": 100000,
  "experience_level": "mid-senior",
  "excluded_companies": ["BlockedCorp Inc"],
  "mcp_servers": {
    "jobswithgpt": {"enabled": true},
    "reed": {"enabled": false},
    "jobspy": {"enabled": false}
  }
}
```

### 3. Run Your First Search

```bash
# Run agent in scrape mode
python -m src.agent --mode scrape

# Check results
ls data/jobs/*.json
```

**That's it!** Jobs matching your preferences are now in `data/jobs/`.

---

## ☁️ Quick Start (Cloud)

Deploy to Google Cloud Run for automated daily scraping.

### Option 1: Automated Bootstrap (Recommended)

```bash
# Run cloud bootstrap
python -m cloud.bootstrap

# Follow prompts:
# 1. Authenticate with Google Cloud
# 2. Create/select project
# 3. Choose region
# 4. Configure budget alerts
# 5. Deploy Cloud Run job

# Job will run daily at 9 AM
```

### Option 2: Platform-Specific Installers

**Windows:**
```powershell
cd deploy/windows
.\install.ps1  # Opens GUI installer
```

**macOS/Linux:**
```bash
cd deploy/macos  # or deploy/linux
./install.sh
```

The installer handles:
- Tool checks (gcloud, terraform)
- Google Cloud authentication
- Infrastructure setup (Cloud Run, Artifact Registry, Secret Manager)
- Automated deployment
- Budget alerts configuration

### What Gets Deployed

Your Google Cloud project will include:
- **Cloud Run Job** - Serverless container (runs on schedule)
- **Artifact Registry** - Private container storage
- **Secret Manager** - Secure credential vault
- **Cloud Scheduler** - Automated triggers
- **VPC Network** - Private networking
- **Budget Alerts** - Cost monitoring ($10/month default)

All infrastructure is defined in `terraform/gcp/` for repeatability.

**Cost:** ~$0-5/month (mostly free tier)

---

## 📊 Check Status

### Local Mode
```bash
# Health check
python -m src.agent --mode health

# View logs
tail -f data/logs/application.log
```

### Cloud Mode
```bash
# Check deployment status
gcloud run jobs describe job-scraper --region=us-central1

# View recent logs
gcloud logging read "resource.type=cloud_run_job" --limit 50

# Trigger manual run
gcloud run jobs execute job-scraper --region=us-central1
```

---

## 🎯 What Happens Next?

### Automatic Daily Runs
- **Cloud:** Jobs scraped daily at 9 AM (configurable)
- **Local:** Set up cron/Task Scheduler for automation

### Job Filtering
Jobs are automatically filtered by:
- ✅ Keywords match (Python, DevOps, etc.)
- ✅ Location match (Denver, Remote, etc.)
- ✅ Salary requirements ($100k+)
- ✅ Experience level (mid-senior)
- ❌ Blocked companies excluded

### Notifications (Optional)
Configure Slack notifications in `config/user_prefs.json`:
```json
{
  "slack_webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
}
```

See [Slack Setup Guide](USER_GUIDE.md#slack-notifications) for details.

---

## 📚 Next Steps

- **[User Guide](USER_GUIDE.md)** - Daily usage, troubleshooting, notifications
- **[MCP Guide](MCP_GUIDE.md)** - Enable 500k+ jobs from JobsWithGPT
- **[Security Guide](SECURITY_GUIDE.md)** - Secure your deployment
- **[Developer Guide](DEVELOPER_GUIDE.md)** - Contribute to the project

---

## 🆘 Common Issues

### "Module not found" errors
```bash
# Make sure you're in the project directory
cd job-private-scraper-filter

# Reinstall dependencies
pip install -r requirements.txt
```

### "Permission denied" errors
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

### Google Cloud authentication fails
```bash
# Re-authenticate
gcloud auth login
gcloud auth application-default login
```

### No jobs found
- Check `config/user_prefs.json` - keywords might be too specific
- Review logs: `tail -f data/logs/application.log`
- Try broader keywords: `["software engineer", "developer"]`

**More troubleshooting:** See [User Guide - Troubleshooting](USER_GUIDE.md#troubleshooting)

---

## 🎓 Learning Resources

- **[Quick Reference](../QUICK_REFERENCE.md)** - Common commands cheat sheet
- **[Architecture Overview](DEVELOPER_GUIDE.md#architecture)** - How it works
- **[Roadmap](ROADMAP.md)** - Planned features

---

**Ready to go?** Run `python -m src.agent --mode scrape` and start finding jobs! 🚀
