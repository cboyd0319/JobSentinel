# Job Search Automation# Job Search Automation



⚠️ **Alpha software.** It works but has bugs. I use it daily. Test locally first.⚠️ **Alpha software.** It works but has bugs. I use it daily. Test locally first.



## What It Does## What It Does



I built this because hunting jobs manually sucks. This scrapes multiple sites, scores each role against your skills, alerts you to matches worth checking.I built this because hunting jobs manually sucks. This scrapes multiple sites, scores each role against your skills, alerts you to matches worth checking.



**The Process:****The Process:**

- Scrapes Indeed, LinkedIn, Greenhouse (500k+ jobs)- Scrapes Indeed, LinkedIn, Greenhouse (500k+ jobs)

- Scores each job against your preferences- Scores each job against your preferences

- Sends high-scoring matches to Slack  - Sends high-scoring matches to Slack  

- Stores everything locally (your data stays yours)- Stores everything locally (your data stays yours)



**Status:** Local mode works. Cloud costs $5-15/month.**Status:** Local mode works. Cloud costs $5-15/month.



## Quick Start



**Windows:** Run `deploy/windows/My-Job-Finder.ps1`  ## Quick Start## Quick Start



**macOS/Linux:****Windows:** Run `deploy/windows/My-Job-Finder.ps1`  

```bash

git clone https://github.com/cboyd0319/job-search-automation**macOS/Linux:**

cd job-search-automation```bash

python -m pip install -r requirements.txtgit clone https://github.com/cboyd0319/job-search-automation

cp config/user_prefs.example.json config/user_prefs.jsoncd job-search-automation

# Edit config with your details  python -m pip install -r requirements.txt

python src/agent.py --dry-run  # testcp config/user_prefs.example.json config/user_prefs.json

python src/agent.py           # run# Edit config with your details  

```python src/agent.py --dry-run  # test

python src/agent.py           # run

## Features```



- **Multi-site scraping** - Indeed, LinkedIn, Greenhouse (500k+ jobs)

- **Smart scoring** - Keyword matching, salary filtering, company blacklists

- **Slack alerts** - High-scoring matches with score breakdowns## Configuration## Features

- **Local-first** - Your data stays on your machine

- **Cloud option** - Auto-runs every 2 hours ($5-15/month)



## System RequirementsEdit `config/user_prefs.json`:- **Multi-site scraping** - Indeed, LinkedIn, Greenhouse (500k+ jobs)



| Platform | Status | Notes |- **Smart scoring** - Keyword matching, salary filtering, company blacklists

| --- | --- | --- |

| Windows 10/11 + PowerShell 5.1+ | ✅ Supported | Zero-knowledge installer |```json- **Slack alerts** - High-scoring matches with score breakdowns

| macOS 13+ | 🚧 Manual setup | Python 3.12+ required |

| Ubuntu/Linux | 🚧 Manual setup | Python 3.12+ required |{- **Local-first** - Your data stays on your machine



## Configuration  "keywords": ["python", "backend", "remote"],- **Cloud option** - Auto-runs every 2 hours ($5-15/month)



Edit `config/user_prefs.json`:  "locations": ["San Francisco", "Remote"],



```json  "salary_min": 120000,## System Requirements

{

  "keywords": ["python", "backend", "api"],  "blacklisted_companies": ["Meta", "Amazon"],

  "locations": ["San Francisco, CA", "Remote"],

  "salary_min": 120000,  "job_sources": {| Platform | Status | Notes |

  "blacklisted_companies": ["Meta"],

  "resume": {    "jobswithgpt": {"enabled": true},| --- | --- | --- |

    "enabled": true,

    "file_path": "/path/to/resume.pdf"    "reed": {"enabled": true, "api_key": "your_reed_key"}| Windows 10/11 + PowerShell 5.1+ | ✅ Supported | Zero-knowledge installer |

  }

}  },| macOS 13+ | 🚧 Manual setup | Python 3.12+ required |

```

  "slack": {| Ubuntu/Linux | 🚧 Manual setup | Python 3.12+ required |

**Get API keys:**

- Reed: [reed.co.uk/developers](https://reed.co.uk/developers)      "webhook_url": "your_slack_webhook",

- Slack webhook: Workspace settings > Apps > Incoming Webhooks  

    "channel": "#job-alerts"## Configuration

## Commands

  }

```bash

# Test without running}Edit `config/user_prefs.json`:

python src/agent.py --dry-run  

```

# Run once

python src/agent.py```json



# Background mode (Linux/macOS)**Get API keys:**{

nohup python src/agent.py --daemon &

- Reed: [reed.co.uk/developers](https://reed.co.uk/developers)  "keywords": ["python", "backend", "api"],

# Check what's happening

tail -f logs/agent.log- Slack webhook: Workspace settings > Apps > Incoming Webhooks  "locations": ["San Francisco, CA", "Remote"],

```

  "salary_min": 120000,

## Cloud Deployment (Optional)

## Commands  "blacklisted_companies": ["Meta"],

⚠️ **Costs $5-15/month.** Read [SECURITY.md](SECURITY.md) first.

  "resume": {

```bash

python cloud/bootstrap.py --deploy```bash    "enabled": true,

```

# Test without running    "file_path": "/path/to/resume.pdf"

Auto-runs every 2 hours. Shutdown: `python cloud/bootstrap.py --destroy`

python src/agent.py --dry-run  }

## PowerShell QA System

}

Built-in quality assurance for Windows components:

# Run once```

```bash

./psqa.ps1 -Mode health     # system checkpython src/agent.py

./psqa.ps1 -Mode analyze    # check quality  

./psqa.ps1 -Mode fix        # auto-fix issues## Documentation

```

# Background mode (Linux/macOS)

## Troubleshooting

nohup python src/agent.py --daemon &- **[SETUP.md](SETUP.md)** - Setup guide for all platforms

**No jobs found:** Check `logs/scraper.log`  

**Slack not working:** Run `python scripts/setup/slack/slack_setup.py --test-only`  - **[QA.md](QA.md)** - PowerShell quality assurance system

**Import errors:** Check Python version (need 3.12+), reinstall requirements  

**Permission issues (Windows):** Run PowerShell as Administrator# Check what's happening- **[SECURITY.md](SECURITY.md)** - Security practices and cloud costs



## Architecturetail -f logs/agent.log- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and fixes



``````

src/

├── agent.py          # Main orchestrator  ## Cloud Deployment (Optional)

├── database.py       # SQLite storage

├── web_ui.py         # Local dashboard## Cloud Deployment (Optional)

sources/

├── jobswithgpt_scraper.py  # GPT-powered scraper⚠️ **Costs $5-15/month.** Read [SECURITY.md](SECURITY.md) first.

├── reed_mcp_scraper.py     # Reed.co.uk API

└── greenhouse_scraper.py   # Greenhouse jobs**GCP (recommended):**

notify/

├── slack.py          # Slack notifications```bash```bash

└── emailer.py        # Email alerts (optional)

```# Deploy to Cloud Runpython cloud/bootstrap.py --deploy



**Key files:**cd terraform/gcp```

- `config/user_prefs.json` - Your settings

- `logs/agent.log` - Main log file  terraform init

- `data/jobs.db` - Job database (SQLite)

- `psqa.ps1` - PowerShell quality checkerterraform planAuto-runs every 2 hours. Shutdown: `python cloud/bootstrap.py --destroy`



## Developmentterraform apply



**Code quality:**```## PowerShell QA System

```bash

# Check everything

./psqa.ps1

**Costs ~$5-15/month.** Runs every 2 hours. Auto-scales to zero between runs.Built-in quality assurance for Windows components:

# Python only  

flake8 src/ && mypy src/



# Security scan⚠️ **Security:** Your API keys go to GCP. Use separate keys for cloud vs local.```bash

python -m bandit -r src/

```./psqa.ps1 -Mode health     # system check



**Add new job source:**## Troubleshooting./psqa.ps1 -Mode analyze    # check quality  

1. Create scraper in `sources/`

2. Inherit from `JobScraperBase`./psqa.ps1 -Mode fix        # auto-fix issues

3. Add to `config/user_prefs.json`

4. Test with `--dry-run`**No jobs found:**```



**PowerShell quality:** Zero tolerance. Fix before commit.```bash



## Security Notes# Check logsSee [QA.md](QA.md) for details.



- API keys in config files (not commits)  tail logs/scraper.log

- Local SQLite database (not cloud by default)

- Scrapers respect robots.txt## Troubleshooting

- Rate limiting built-in

- No personal data stored beyond job matches# Test individual scrapers  



⚠️ **Cloud security:** Separate API keys for local vs cloud deployment.python sources/jobswithgpt_scraper.py --test**No jobs found:** Check `logs/scraper.log`  



## FAQ```**Slack not working:** Run `python scripts/setup/slack/slack_setup.py --test-only`  



**Q: How often should I run this?**  **Import errors:** Check Python version (need 3.12+), reinstall requirements  

A: Daily or every few hours. More frequent = higher rate limit risk.

**Slack not working:****Permission issues (Windows):** Run PowerShell as Administrator

**Q: What if a site blocks me?**  

A: Increase delays, use VPN, or disable that source temporarily.```bash



**Q: Can I customize scoring?**  # Test webhookFull guide: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

A: Yes. Edit `matchers/rules.py` for keyword weights and scoring logic.

curl -X POST -H 'Content-type: application/json' \

**Q: Where's my data stored?**  

A: Locally in `data/jobs.db`. Cloud deployments use separate databases.  --data '{"text":"Test"}' YOUR_WEBHOOK_URL## Contributing



**Q: Why not use job boards' APIs?**  

A: Most don't have APIs. The ones that do are limited/expensive.

# Check config**Bug reports:** Open GitHub issue with logs and system info  

## Contributing

grep SLACK_WEBHOOK_URL config/user_prefs.json**Code:** Fork, create feature branch, follow code style, add tests, submit PR  

**Bug reports:** Open GitHub issue with logs and system info  

**Code:** Fork, create feature branch, follow code style, add tests, submit PR  ```**Security issues:** Email maintainer directly

**Security issues:** Email maintainer directly



## License

**Import errors:**## License

MIT License. Alpha software - use at your own risk. I use it daily but it has bugs.

```bash

---

# Check Python (need 3.12+)MIT License. Alpha software - use at your own risk. I use it daily but it has bugs.

**Questions?** Open GitHub issue.
python --version

---

# Reinstall deps

pip install -r requirements.txt --force-reinstall**Questions?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) or open GitHub issue.
```

**Permission issues (Windows):**
```powershell
# Run as admin, then:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Rate limited:**
Add delays in `config/scraper_settings.json`:
```json
{
  "request_delay": 2.0,
  "max_retries": 3
}
```

## Architecture

```
src/
├── agent.py          # Main orchestrator  
├── database.py       # SQLite storage
├── web_ui.py         # Local dashboard
sources/
├── jobswithgpt_scraper.py  # GPT-powered scraper
├── reed_mcp_scraper.py     # Reed.co.uk API
└── greenhouse_scraper.py   # Greenhouse jobs
notify/
├── slack.py          # Slack notifications
└── emailer.py        # Email alerts (optional)
```

**Key files:**
- `config/user_prefs.json` - Your settings
- `logs/agent.log` - Main log file  
- `data/jobs.db` - Job database (SQLite)
- `psqa.ps1` - PowerShell quality checker

## Development

**Code quality:**
```bash
# Check everything
./psqa.ps1

# Python only  
flake8 src/ && mypy src/

# Security scan
python -m bandit -r src/
```

**Add new job source:**
1. Create scraper in `sources/`
2. Inherit from `JobScraperBase`
3. Add to `config/user_prefs.json`
4. Test with `--dry-run`

**PowerShell quality:** Zero tolerance. Fix before commit.

## Security Notes

- API keys in config files (not commits)  
- Local SQLite database (not cloud by default)
- Scrapers respect robots.txt
- Rate limiting built-in
- No personal data stored beyond job matches

⚠️ **Cloud security:** Separate API keys for local vs cloud deployment.

## FAQ

**Q: How often should I run this?**  
A: Daily or every few hours. More frequent = higher rate limit risk.

**Q: What if a site blocks me?**  
A: Increase delays, use VPN, or disable that source temporarily.

**Q: Can I customize scoring?**  
A: Yes. Edit `matchers/rules.py` for keyword weights and scoring logic.

**Q: Where's my data stored?**  
A: Locally in `data/jobs.db`. Cloud deployments use separate databases.

**Q: Why not use job boards' APIs?**  
A: Most don't have APIs. The ones that do are limited/expensive.

## Contributing

**Before submitting:**
1. Run `./psqa.ps1` (PowerShell quality check)
2. Test with `--dry-run`  
3. Check no secrets in commits
4. Keep it simple

**Priority fixes:**
- Rate limit improvements
- New job sources
- Better scoring algorithms
- UI improvements

---

**Built for personal use.** Scale carefully. Respect rate limits. Don't abuse scrapers.

**License:** MIT. Use at your own risk. No warranty.