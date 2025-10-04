# Quick Start Guide

**⚠️ ALPHA SOFTWARE** - Read [LICENSE](LICENSE) for disclaimers

---

## First Time? Start Here

### 1. Install Python 3.11+

- **Windows:** Download from [python.org](https://python.org)
- **macOS:** `brew install python@3.11` or download from python.org
- **Linux:** `sudo apt install python3.11` (Debian/Ubuntu)

### 2. Clone & Install

```bash
git clone https://github.com/cboyd0319/job-search-automation.git
cd job-search-automation
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 3. Set Up Slack (5-10 minutes)

```bash
python scripts/slack_bootstrap.py
```

Follow the interactive prompts. **Zero technical knowledge required!**

Full guide: [docs/SLACK_SETUP.md](docs/SLACK_SETUP.md)

### 4. Configure Preferences

```bash
cp config/user_prefs.example.json config/user_prefs.json
```

Edit `config/user_prefs.json` with your preferences.

### 5. Run the Job Scraper

```bash
python -m src.agent --mode poll
```

---

## Quick Commands

### Job Scraping

```bash
# Run once
python -m src.agent --mode poll

# Daily digest
python -m src.agent --mode digest

# Cleanup old data
python -m src.agent --mode cleanup

# Health check
python -m src.agent --mode health
```

### Resume Scanner (NEW!)

```bash
# Basic ATS scan
python -m utils.ats_scanner your_resume.pdf

# Scan against job description
python -m utils.ats_scanner resume.pdf job_description.txt software_engineering

# Markdown report
python -m utils.ats_scanner resume.pdf job_desc.txt software_engineering markdown
```

**Industries:** `software_engineering`, `data_science`, `cybersecurity`, `cloud_engineering`

### Web UI

```bash
python -m src.web_ui
# Open http://127.0.0.1:5000
```

---

## Cloud Deployment (Optional)

**⚠️ Read [COST.md](COST.md) first!** (~$4-12/month)

### Google Cloud

```bash
python -m cloud.bootstrap --provider gcp --log-level info
```

### Teardown (Stop All Costs)

```bash
python -m cloud.teardown --provider gcp
```

---

## Essential Documentation

- **[README.md](README.md)** - Full project overview
- **[docs/SLACK_SETUP.md](docs/SLACK_SETUP.md)** - Slack configuration (zero-knowledge)
- **[docs/RESUME_RESOURCES.md](docs/RESUME_RESOURCES.md)** - Resume templates & ATS tips
- **[COST.md](COST.md)** - Complete cost breakdown ($0 local, ~$4-12/month GCP)
- **[SECURITY.md](SECURITY.md)** - Security best practices
- **[LICENSE](LICENSE)** - Alpha disclaimers (read this!)

---

## Troubleshooting

### Slack test fails

```bash
python scripts/slack_bootstrap.py
```

### Syntax check

```bash
python -m compileall src utils sources cloud
```

### Missing dependencies

```bash
pip install -r requirements.txt
```

### Logs

```bash
tail -f data/logs/*.log
```

---

## Cost Summary

| Deployment | Monthly Cost |
|-----------|-------------|
| **Local (Windows/macOS/Linux)** | **$0** |
| **GCP Cloud Run** | **~$4-12** |
| **AWS (future)** | ~$10-20 |
| **Azure (future)** | ~$10-15 |

**Recommendation:** Start local ($0), test thoroughly, then consider cloud.

---

## Security Checklist

Before running:

- [ ] Verify `.env` not in git: `git ls-files | grep .env` (should be empty)
- [ ] Read [SECURITY.md](SECURITY.md)
- [ ] Review [COST.md](COST.md) if deploying to cloud
- [ ] Set up Slack webhook (don't share URL publicly)
- [ ] Back up `data/jobs.sqlite` regularly

---

## Getting Help

1. **Check docs:** [docs/](docs/) directory
2. **Review logs:** `data/logs/`
3. **Run health check:** `python -m src.agent --mode health`
4. **GitHub issues:** Include error logs and what you tried

---

## What's New

### Ultimate ATS Resume Scanner ✨

Professional-grade resume optimization tool (equivalent to $50-100/year paid services):

- ✅ ATS compatibility score (0-100)
- ✅ Keyword optimization vs. job descriptions
- ✅ Formatting analysis (detects ATS-problematic elements)
- ✅ Section detection and validation
- ✅ Industry-specific keyword libraries
- ✅ OCR support for image-based PDFs
- ✅ Detailed fix suggestions

**Get started:** [docs/RESUME_RESOURCES.md](docs/RESUME_RESOURCES.md)

---

**Project Status:** Alpha (expect bugs, breaking changes)

**Support:** GitHub issues, documentation in [docs/](docs/)

**License:** MIT with alpha disclaimers - see [LICENSE](LICENSE)
