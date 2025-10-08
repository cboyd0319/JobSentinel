# Job Search Automation# Job Search Automation



**TL;DR:** Scrapes jobs, scores them, sends matches to Slack. Works locally. Use daily.**TL;DR:** Scrapes jobs, scores them, sends good matches to Slack.



**Status:** Alpha but stable. I run it daily. Test first, report bugs.⚠️ **Alpha software.** It works but has bugs. I use it daily. Test locally first.



## What This Does## What It Does



I built this because job hunting sucks. Manual searching is slow, inconsistent, wastes time.I built this because hunting jobs manually sucks. This scrapes multiple sites, scores each role against your skills, alerts you to matches worth checking.



**The flow:****The Process:**

- Scrapes Indeed, LinkedIn, Greenhouse (500k+ jobs)- Scrapes Indeed, LinkedIn, Greenhouse (500k+ jobs)

- Scores against your skills/preferences- Scores each job against your preferences

- Sends high matches to Slack with reasoning- Sends high-scoring matches to Slack  

- Your data stays local- Stores everything locally (your data stays yours)



**Cost:** Free locally. Cloud deployment runs $5-15/month.**Status:** Local mode works. Cloud costs $5-15/month.



## Quick Start## Quick Start



**Windows:** Run `deploy/windows/My-Job-Finder.ps1` (handles everything)**Windows:** Run `deploy/windows/My-Job-Finder.ps1`  

**Others:** See [SETUP.md](SETUP.md)

**macOS/Linux:**

```bash```bash

git clone https://github.com/cboyd0319/job-search-automation# Basic flow

cd job-search-automationgit clone https://github.com/cboyd0319/job-search-automation

python3.12 -m venv .venv && source .venv/bin/activatecd job-search-automation

pip install -r requirements.txtpython -m pip install -r requirements.txt

cp config/user_prefs.example.json config/user_prefs.jsoncp config/user_prefs.example.json config/user_prefs.json

# Edit config with your details# Edit config with your details  

python src/agent.py --dry-run  # testpython src/agent.py --dry-run  # test

python src/agent.py            # runpython src/agent.py           # run

``````



## Configuration## Features



Edit `config/user_prefs.json`:- **Multi-site scraping** - Indeed, LinkedIn, Greenhouse (500k+ jobs)

- **Smart scoring** - Keyword matching, salary filtering, company blacklists

```json- **Slack alerts** - High-scoring matches with score breakdowns

{- **Local-first** - Your data stays on your machine

  "keywords": ["python", "backend", "remote"],- **Cloud option** - Auto-runs every 2 hours ($5-15/month)

  "locations": ["San Francisco", "Remote"],

  "salary_min": 120000,## System Requirements

  "blacklisted_companies": ["Meta", "Amazon"],

  "job_sources": {| Platform | Status | Notes |

    "jobswithgpt": {"enabled": true},| --- | --- | --- |

    "reed": {"enabled": true, "api_key": "your_reed_key"}| Windows 10/11 + PowerShell 5.1+ | ✅ Supported | Zero-knowledge installer |

  },| macOS 13+ | 🚧 Manual setup | Python 3.12+ required |

  "slack": {| Ubuntu/Linux | 🚧 Manual setup | Python 3.12+ required |

    "webhook_url": "your_slack_webhook",

    "channel": "#job-alerts"## Configuration

  }

}Edit `config/user_prefs.json`:

```

```json

**Get API keys:**{

- Reed: [reed.co.uk/developers](https://reed.co.uk/developers)  "keywords": ["python", "backend", "api"],

- Slack webhook: Workspace settings > Apps > Incoming Webhooks  "locations": ["San Francisco, CA", "Remote"],

  "salary_min": 120000,

## Commands  "blacklisted_companies": ["Meta"],

  "resume": {

```bash    "enabled": true,

# Test without running    "file_path": "/path/to/resume.pdf"

python src/agent.py --dry-run  }

}

# Run once```

python src/agent.py

## Documentation

# Background mode (Linux/macOS)

nohup python src/agent.py --daemon &- **[SETUP.md](SETUP.md)** - Setup guide for all platforms

- **[QA.md](QA.md)** - PowerShell quality assurance system

# Check what's happening- **[SECURITY.md](SECURITY.md)** - Security practices and cloud costs

tail -f logs/agent.log- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and fixes

```

## Cloud Deployment (Optional)

## Cloud Deployment (Optional)

⚠️ **Costs $5-15/month.** Read [SECURITY.md](SECURITY.md) first.

**GCP (recommended):**

```bash```bash

# Deploy to Cloud Runpython cloud/bootstrap.py --deploy

cd terraform/gcp```

terraform init

terraform planAuto-runs every 2 hours. Shutdown: `python cloud/bootstrap.py --destroy`

terraform apply

```## PowerShell QA System



**Costs ~$5-15/month.** Runs every 2 hours. Auto-scales to zero between runs.Built-in quality assurance for Windows components:



⚠️ **Security:** Your API keys go to GCP. Use separate keys for cloud vs local.```bash

./psqa.ps1 -Mode health     # system check

## Troubleshooting./psqa.ps1 -Mode analyze    # check quality  

./psqa.ps1 -Mode fix        # auto-fix issues

**No jobs found:**```

```bash

# Check logsSee [QA.md](QA.md) for details.

tail logs/scraper.log

## Troubleshooting

# Test individual scrapers  

python sources/jobswithgpt_scraper.py --test**No jobs found:** Check `logs/scraper.log`  

```**Slack not working:** Run `python scripts/setup/slack/slack_setup.py --test-only`  

**Import errors:** Check Python version (need 3.12+), reinstall requirements  

**Slack not working:****Permission issues (Windows):** Run PowerShell as Administrator

```bash

# Test webhookFull guide: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

curl -X POST -H 'Content-type: application/json' \

  --data '{"text":"Test"}' YOUR_WEBHOOK_URL## Contributing



# Check config**Bug reports:** Open GitHub issue with logs and system info  

grep SLACK_WEBHOOK_URL config/user_prefs.json**Code:** Fork, create feature branch, follow code style, add tests, submit PR  

```**Security issues:** Email maintainer directly



**Import errors:**## License

```bash

# Check Python (need 3.12+)MIT License. Alpha software - use at your own risk. I use it daily but it has bugs.

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