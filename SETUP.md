# Setup Guide

**TL;DR:** Windows users run the installer. Everyone else: Python 3.12+, configure preferences, test.

## Windows (Easy Path)

Run `deploy/windows/My-Job-Finder.ps1`. It handles everything.

**What it does:**
- Installs Python 3.12+ if missing
- Sets up virtual environment  
- Installs dependencies
- Walks through configuration
- Tests everything

**Requirements:** Windows 10+ with PowerShell 5.1+

## Manual Setup (macOS/Linux)

```bash
# 1. Clone
git clone https://github.com/cboyd0319/job-search-automation
cd job-search-automation

# 2. Python setup
python3.12 -m venv .venv
source .venv/bin/activate  # Linux/macOS
pip install -r requirements.txt

# 3. Configure
cp config/user_prefs.example.json config/user_prefs.json
# Edit the file with your details

# 4. Test
python src/agent.py --dry-run
```

## Configuration

Edit `config/user_prefs.json`:

```json
{
  "keywords": ["python", "backend", "api"],
  "locations": ["San Francisco, CA", "Remote"],
  "salary_min": 120000,
  "blacklisted_companies": ["Meta"],
  "job_sources": {
    "jobswithgpt": {"enabled": true},
    "reed": {"enabled": true, "api_key": "get_from_reed_co_uk"}
  },
  "resume": {
    "enabled": true,
    "file_path": "/path/to/resume.pdf"
  }
}
```

**Key settings:**
- **keywords** - Skills you want (weighted scoring)
- **locations** - Cities or "Remote"
- **salary_min** - Hard minimum 
- **blacklisted_companies** - Skip these entirely
- **resume.file_path** - PDF/DOCX/TXT for ATS scoring

## Slack Notifications

```bash
python scripts/setup/slack/slack_setup.py
```

**What it does:**
- Walks you through Slack app creation
- Tests webhook
- Saves config to `.env`

**Manual method:** Get incoming webhook URL from Slack → add `SLACK_WEBHOOK_URL=your_url` to `.env` file.

## Job Sources

**JobsWithGPT (free, 500k+ jobs):**
- No setup required
- Covers most major sites

**Reed Jobs (UK focus, requires API key):**
- Get free API key from reed.co.uk
- Add to `user_prefs.json` under `job_sources.reed.api_key`

**JobSpy (aggregator, experimental):**
- Built-in fallback
- No API key needed

## Resume Analysis (Optional)

Point the system at your resume for ATS scoring:

```json
{
  "resume": {
    "enabled": true,
    "file_path": "/Users/you/Desktop/resume.pdf",
    "analysis_level": "detailed"
  }
}
```

**Test it:**
```bash
python utils/ats_analyzer.py /path/to/resume.pdf
```

**Supported formats:** PDF (best), DOCX (good), TXT (basic)

## First Run

```bash
# Test mode (no notifications)
python src/agent.py --dry-run

# Check what it found
cat data/jobs_database.db | head -5

# Run for real
python src/agent.py
```

## Troubleshooting

**No jobs found:**
- Check `logs/scraper.log` for errors
- Verify internet connection
- Try individual scrapers: `python sources/jobswithgpt_scraper.py`

**Import errors:**
- Check Python version: `python --version` (need 3.12+)
- Reinstall: `pip install -r requirements.txt`

**Permission errors (Windows):**
- Run PowerShell as Administrator
- Fix execution policy: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`

**Slack not working:**
- Test webhook: `python scripts/setup/slack/slack_setup.py --test-only`
- Check `.env` has correct `SLACK_WEBHOOK_URL`

## Cloud Deployment (Optional)

⚠️ **Costs $5-15/month.** Read `COST.md` first.

```bash
# Deploy to Google Cloud Run
python cloud/bootstrap.py --deploy

# Check costs
gcloud billing budgets list
```

**What you get:**
- Runs every 2 hours automatically
- Serverless (scales to zero when idle)
- Same notifications as local

**Shutdown:**
```bash
python cloud/bootstrap.py --destroy
```

## System Health Check

```bash
# Check everything
python scripts/monitoring/diagnostics.py

# PowerShell QA (Windows only)
./psqa.ps1 -Mode health
```

## Next Steps

1. **Test locally** with `--dry-run`
2. **Check one real run** 
3. **Tune your keywords** based on results
4. **Set up cloud** if you want automation
5. **Monitor costs** if using cloud

---

**Problems?** Check logs in `logs/` directory or open GitHub issue.