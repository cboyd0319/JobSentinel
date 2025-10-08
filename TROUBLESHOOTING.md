# Troubleshooting

**TL;DR:** Check logs first. Most issues are config, permissions, or network.

## Quick Fixes

**No jobs found:**
```bash
# Check scraper logs
cat logs/scraper.log | tail -20

# Test individual scrapers
python sources/jobswithgpt_scraper.py --test
python sources/reed_mcp_scraper.py --test
```

**Slack not working:**
```bash
# Test webhook
python scripts/setup/slack/slack_setup.py --test-only

# Check .env file
cat .env | grep SLACK_WEBHOOK_URL
```

**Import errors:**
```bash
# Check Python version (need 3.12+)
python --version

# Reinstall dependencies
pip install -r requirements.txt --upgrade
```

**Permission denied (Windows):**
```powershell
# Run as Administrator, then:
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Common Issues

### "ModuleNotFoundError" 

**Cause:** Missing dependencies or wrong Python version

**Fix:**
```bash
# Check Python version
python --version  # Need 3.12+

# Reinstall everything
pip install -r requirements.txt

# If still broken, nuke and restart
rm -rf .venv
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### "No jobs returned from any scraper"

**Cause:** Network issues, site changes, or bad config

**Debug:**
```bash
# Test network
curl -I https://jobswithgpt.com

# Check user preferences
cat config/user_prefs.json | jq .keywords

# Run with debug logging
LOG_LEVEL=DEBUG python src/agent.py --dry-run
```

### "Slack webhook invalid"

**Cause:** Wrong URL or expired webhook

**Fix:**
```bash
# Re-run setup
python scripts/setup/slack/slack_setup.py

# Manually test webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"Test from job scraper"}' \
  $SLACK_WEBHOOK_URL
```

### "Cloud deployment failed"

**Cause:** GCP auth, billing, or permissions

**Fix:**
```bash
# Check auth
gcloud auth list

# Check billing
gcloud billing accounts list

# Re-auth if needed
gcloud auth login
gcloud config set project your-project-id
```

### "Database locked" error

**Cause:** Multiple instances running

**Fix:**
```bash
# Kill existing processes
ps aux | grep agent.py | grep -v grep
kill -9 <process_id>

# Clean up lock file
rm -f data/.database.lock
```

## Windows-Specific Issues

### PowerShell execution policy

```powershell
# Check current policy
Get-ExecutionPolicy

# Fix if "Restricted"
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Python not found

```powershell
# Check if Python installed
python --version

# If not found, run installer
deploy/windows/My-Job-Finder.ps1
```

### WinGet issues

```powershell
# Update WinGet
winget upgrade --id Microsoft.Winget.Source

# If WinGet missing, get from Microsoft Store
```

## System Diagnostics

```bash
# Full system check
python scripts/monitoring/diagnostics.py

# JSON output for debugging
python scripts/monitoring/diagnostics.py --json

# PowerShell QA health (Windows)
./psqa.ps1 -Mode health
```

## Log Files

**Location:** `logs/` directory

**Key files:**
- `scraper.log` - Job scraping issues
- `agent.log` - Main application logs  
- `database.log` - SQLite issues
- `cloud.log` - Deployment logs (if using cloud)

**Useful commands:**
```bash
# Recent errors
grep -i error logs/*.log | tail -10

# Scraping stats
grep "Found.*jobs" logs/scraper.log | tail -5

# Slack notification logs
grep -i slack logs/agent.log | tail -5
```

## Performance Issues

### Slow scraping

**Check:** Network latency, rate limits, concurrent requests

**Fix:**
```bash
# Reduce concurrent requests in config
"scraping": {
  "concurrent_requests": 2,  # Lower this
  "delay_between_requests": 1.0  # Increase this
}
```

### High memory usage

**Check:** Large job databases, memory leaks

**Fix:**
```bash
# Clean old jobs (keeps last 30 days)
python scripts/utilities/cleanup_database.py --days 30

# Check database size
du -sh data/jobs_database.db
```

### Cloud costs too high

**Check:** Function invocation frequency, data transfer

**Fix:**
```bash
# Check current costs
gcloud billing budgets list

# Reduce run frequency
# Edit cloud/main.py scheduler config

# Set cost alerts
python cloud/bootstrap.py --set-budget 10  # $10/month limit
```

## Getting Help

**Before opening issue:**
1. Run diagnostics: `python scripts/monitoring/diagnostics.py`
2. Check recent logs: `tail -50 logs/agent.log`
3. Try `--dry-run` mode first

**GitHub issue template:**
```
Problem: [one sentence]

Steps to reproduce:
1. 
2. 
3. 

Expected: [what should happen]
Actual: [what actually happened]

System info:
[paste output of diagnostics.py]

Logs:
[paste relevant log excerpts]
```

**Security issues:** Email maintainer directly, don't post publicly.

---

**Still stuck?** Open GitHub issue with diagnostics output and logs.