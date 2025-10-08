# Job Search Automation

**TL;DR:** Scrapes jobs, scores them, sends good matches to Slack.

⚠️ **Alpha software.** It works but has bugs. I use it daily. Test locally first.

## What It Does

I built this because hunting jobs manually sucks. This scrapes multiple sites, scores each role against your skills, alerts you to matches worth checking.

**The Process:**
- Scrapes Indeed, LinkedIn, Greenhouse (500k+ jobs)
- Scores each job against your preferences
- Sends high-scoring matches to Slack  
- Stores everything locally (your data stays yours)

**Status:** Local mode works. Cloud costs $5-15/month.

## Quick Start

**Windows:** Run `deploy/windows/My-Job-Finder.ps1`  
**Others:** See [SETUP.md](SETUP.md)

```bash
# Basic flow
git clone https://github.com/cboyd0319/job-search-automation
cd job-search-automation
python -m pip install -r requirements.txt
cp config/user_prefs.example.json config/user_prefs.json
# Edit config with your details  
python src/agent.py --dry-run  # test
python src/agent.py           # run
```

## Features

- **Multi-site scraping** - Indeed, LinkedIn, Greenhouse (500k+ jobs)
- **Smart scoring** - Keyword matching, salary filtering, company blacklists
- **Slack alerts** - High-scoring matches with score breakdowns
- **Local-first** - Your data stays on your machine
- **Cloud option** - Auto-runs every 2 hours ($5-15/month)

## System Requirements

| Platform | Status | Notes |
| --- | --- | --- |
| Windows 10/11 + PowerShell 5.1+ | ✅ Supported | Zero-knowledge installer |
| macOS 13+ | 🚧 Manual setup | Python 3.12+ required |
| Ubuntu/Linux | 🚧 Manual setup | Python 3.12+ required |

## Configuration

Edit `config/user_prefs.json`:

```json
{
  "keywords": ["python", "backend", "api"],
  "locations": ["San Francisco, CA", "Remote"],
  "salary_min": 120000,
  "blacklisted_companies": ["Meta"],
  "resume": {
    "enabled": true,
    "file_path": "/path/to/resume.pdf"
  }
}
```

## Documentation

- **[SETUP.md](SETUP.md)** - Setup guide for all platforms
- **[QA.md](QA.md)** - PowerShell quality assurance system
- **[SECURITY.md](SECURITY.md)** - Security practices and cloud costs
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Common issues and fixes

## Cloud Deployment (Optional)

⚠️ **Costs $5-15/month.** Read [SECURITY.md](SECURITY.md) first.

```bash
python cloud/bootstrap.py --deploy
```

Auto-runs every 2 hours. Shutdown: `python cloud/bootstrap.py --destroy`

## PowerShell QA System

Built-in quality assurance for Windows components:

```bash
./psqa.ps1 -Mode health     # system check
./psqa.ps1 -Mode analyze    # check quality  
./psqa.ps1 -Mode fix        # auto-fix issues
```

See [QA.md](QA.md) for details.

## Troubleshooting

**No jobs found:** Check `logs/scraper.log`  
**Slack not working:** Run `python scripts/setup/slack/slack_setup.py --test-only`  
**Import errors:** Check Python version (need 3.12+), reinstall requirements  
**Permission issues (Windows):** Run PowerShell as Administrator

Full guide: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

## Contributing

**Bug reports:** Open GitHub issue with logs and system info  
**Code:** Fork, create feature branch, follow code style, add tests, submit PR  
**Security issues:** Email maintainer directly

## License

MIT License. Alpha software - use at your own risk. I use it daily but it has bugs.

---

**Questions?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md) or open GitHub issue.