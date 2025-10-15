# Troubleshooting# Troubleshooting



Fix common issues fast.**Platform:** Windows 11+, macOS 15+, Ubuntu 22.04+  

**Database:** SQLite (built-in, zero setup)

## Quick diagnostics

## Common Issues

```bash

# Run health check| Error | Fix |

python -m jsa.cli health --verbose|-------|-----|

| `python3: command not found` | Install Python 3.11+ from [python.org/downloads](https://www.python.org/downloads/). Windows: check "Add to PATH" |

# Check logs| `Python 3.10.x found, but 3.11+ required` | Install Python 3.11+. macOS: `brew install python@3.11`. Linux: `sudo apt install python3.11` |

tail -n 50 logs/jobsentinel.log| `.venv/bin/activate: No such file` | Recreate venv: `rm -rf .venv && python3.11 -m venv .venv && source .venv/bin/activate && pip install -e .` |

| `ModuleNotFoundError: No module named 'jsa'` | Activate venv: `source .venv/bin/activate`, run `pip install -e .` |

# Validate config| `Playwright executable not found` | `playwright install chromium`. Ubuntu needs deps: `sudo apt-get install libnss3 libnspr4 libatk1.0-0 ...` |

python -m jsa.cli config-validate| `Permission denied: './scripts/install.py'` | `chmod +x scripts/install.py` or `python3 scripts/install.py` |

```| `JSONDecodeError: Expecting property name` | Validate at [jsonlint.com](https://jsonlint.com/). Remove trailing commas, use double quotes |

| `AuthError: Invalid Slack webhook` | Test: `curl -X POST -H 'Content-type: application/json' --data '{"text":"test"}' YOUR_WEBHOOK_URL`. Check format: `https://hooks.slack.com/services/T.../B.../XXX` |

## Installation issues| `AuthenticationError: Invalid Reed API key` | Verify key at [reed.co.uk/developers](https://www.reed.co.uk/developers). Test: `curl -H "Authorization: Basic YOUR_KEY" "https://www.reed.co.uk/api/1.0/search?keywords=python"` |

| `Found 0 jobs` | Check sources enabled in config, verify API keys, run with `--verbose` |

### "python: command not found"| `HTTP 429: Too Many Requests` | Rate limited. Wait 60s, reduce scrape frequency in config |

| `SSL certificate verify failed` | `pip install --upgrade certifi`. macOS: run `/Applications/Python 3.11/Install Certificates.command` |

**Windows:**| `Database locked` | Close other processes using `data/jobs.db`, or wait 30s |

```powershell| Web UI shows blank page | Check logs: `python -m jsa.cli web --port 5000 --verbose`. Clear browser cache |

# Check if installed

python --version## Windows-Specific Issues



# If missing: Download from python.org| Error | Fix |

# ⚠️ Check "Add Python to PATH" during install|-------|-----|

# Restart PowerShell after install| Execution Policy error | Run PowerShell as admin: `Set-ExecutionPolicy RemoteSigned` |

```| Path too long errors | Enable long paths: Settings → System → About → Advanced system settings → Computer Name → Advanced → Environment Variables |

| Port already in use | Use different port: `python -m jsa.cli web --port 5001` |

**macOS:**| Shortcuts missing | Re-run `setup-windows.bat` |

```bash| Disk space error | Free up 1GB+ space, or extract to different drive |

# Check if installed

python3 --version## Quick checks



# If missing or old:```bash

brew install python@3.12# Verify install

python --version  # Should be 3.11.x or higher

# Add to PATH (add to ~/.zshrc):python -c "import jsa"  # No error = installed

export PATH="/opt/homebrew/opt/python@3.12/bin:$PATH"python -m jsa.cli config-validate  # Check config

```

# Test Slack webhook

**Linux:**curl -X POST -H 'Content-type: application/json' \

```bash  --data '{"text":"test"}' \

# Ubuntu/Debian  YOUR_WEBHOOK_URL

sudo apt update && sudo apt install python3.12 python3.12-venv

# Debug scraper

# Fedorapython -m jsa.cli run-once --verbose --dry-run

sudo dnf install python3.12```

```

## Cloud deployment

### "Permission denied"

| Error | Fix |

**macOS/Linux:**|-------|-----|

```bash| `google.auth.exceptions.DefaultCredentialsError` | `gcloud auth login && gcloud config set project YOUR_PROJECT_ID` |

# Make script executable| `Container failed to start` (Cloud Run) | Check logs: `gcloud logging read "resource.type=cloud_run_revision" --limit 50`. Test locally: `docker build -t jobsentinel . && docker run -p 8080:8080 jobsentinel` |

chmod +x deploy/local/macos/setup-macos.sh| Cloud Run out of memory | `gcloud run services update jobsentinel --memory 512Mi --timeout 300` |



# Or run with bash## Getting help

bash deploy/local/macos/setup-macos.sh

```1. Run with `--verbose`: `python -m jsa.cli run-once --verbose`

2. Check logs: `cat data/logs/app.log`

**Windows:**3. Open issue: [github.com/cboyd0319/JobSentinel/issues](https://github.com/cboyd0319/JobSentinel/issues)

```powershell   - Include: OS, Python version, full error, steps to reproduce, config (redact secrets)

# Run PowerShell as Administrator4. Ask in [Discussions](https://github.com/cboyd0319/JobSentinel/discussions)

# Right-click PowerShell → "Run as administrator"
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "Module not found: jsa"

```bash
# Reinstall in virtual environment
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e .
```

### "Playwright browsers not found"

```bash
# Install browsers
playwright install chromium

# If fails on Linux:
playwright install-deps chromium
playwright install chromium
```

## Configuration issues

### "Config file not found"

```bash
# Copy example config
cp deploy/common/config/user_prefs.example.json deploy/common/config/user_prefs.json

# Edit with your preferences
nano deploy/common/config/user_prefs.json  # or open in text editor
```

### "Invalid config: [field] is required"

```bash
# Validate and see errors
python -m jsa.cli config-validate

# Common fixes:
# - Add at least one keyword
# - Add at least one location
# - Enable at least one job source
```

### "JSONDecodeError"

Your config has invalid JSON:

```bash
# Common errors:
# ❌ Missing comma: {"key": "value" "key2": "value2"}
# ✅ Add comma:    {"key": "value", "key2": "value2"}

# ❌ Trailing comma: ["item1", "item2",]
# ✅ Remove comma:   ["item1", "item2"]

# Validate JSON online: https://jsonlint.com
```

## Scraping issues

### "No jobs found"

**Too restrictive:**
```json
// Before (0 results)
{
  "keywords": ["senior principal staff python backend machine learning"],
  "min_salary": 300000
}

// After (42 results)
{
  "keywords": ["python", "backend"],
  "min_salary": 120000
}
```

**Check enabled sources:**
```bash
python -m jsa.cli config-validate

# Output shows:
# ✅ jobswithgpt: enabled
# ❌ reed: disabled (no API key)
```

### "Rate limit exceeded"

Job board blocked you for too many requests:

```bash
# Wait 1 hour, then:
# - Reduce scraping frequency
# - Check rate_limiter config in code
# - Add delays between requests
```

### "Timeout error"

Network too slow or job board down:

```bash
# Increase timeout (edit config)
"scraper_timeout": 60  # Default is 30s

# Check if site is down
curl -I https://jobswithgpt.com
```

### "Parse error: invalid HTML"

Job board changed their HTML structure:

1. Open GitHub issue: https://github.com/cboyd0319/JobSentinel/issues
2. Include error logs from `logs/jobsentinel.log`
3. Mention which job source failed

## Alert issues

### "Slack webhook failed"

**Test webhook:**
```bash
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text":"JobSentinel test"}'

# Expected: {"ok": true}
```

**Common errors:**

| Error | Fix |
|-------|-----|
| `invalid_payload` | Check JSON format in config |
| `channel_not_found` | Webhook deleted, create new one |
| `403 Forbidden` | Webhook URL wrong, regenerate |

**Fix:**
1. Create new webhook: https://api.slack.com/messaging/webhooks
2. Update `deploy/common/config/user_prefs.json`:
   ```json
   "alerts": {
     "slack": {
       "enabled": true,
       "webhook_url": "https://hooks.slack.com/services/YOUR/NEW/WEBHOOK"
     }
   }
   ```

### "Email alerts not working"

**Gmail users need App Password:**

1. Enable 2FA: https://myaccount.google.com/security
2. Create App Password: https://myaccount.google.com/apppasswords
3. Use App Password (not account password) in config

**Test SMTP:**
```bash
python -c "
import smtplib
server = smtplib.SMTP('smtp.gmail.com', 587)
server.starttls()
server.login('you@gmail.com', 'your_app_password')
server.quit()
print('✅ SMTP works')
"
```

**Common SMTP errors:**

| Error | Fix |
|-------|-----|
| `Authentication failed` | Use App Password, not account password |
| `SSL error` | Check port (587 for TLS, 465 for SSL) |
| `Connection refused` | Check firewall, try different SMTP server |

## Database issues

### "Database locked"

Two processes accessing SQLite at once:

```bash
# Find running processes
ps aux | grep jobsentinel

# Kill old processes
killall python  # macOS/Linux
# Windows: Task Manager → End "python.exe"

# Restart
python -m jsa.cli run-once
```

### "Database corrupted"

```bash
# Backup old database
mv data/jobs.sqlite data/jobs.sqlite.backup

# Create fresh database
python -m jsa.cli db-init

# Reimport jobs (if backup is recoverable)
sqlite3 data/jobs.sqlite.backup ".dump jobs" | sqlite3 data/jobs.sqlite
```

### "Disk full"

```bash
# Check database size
du -h data/jobs.sqlite

# Archive old jobs (keeps last 90 days)
python -m jsa.cli db-clean --older-than 90

# Vacuum database (reclaim space)
sqlite3 data/jobs.sqlite "VACUUM;"
```

## Performance issues

### "Scraping very slow"

**First run downloads ML models (~500MB):**
```bash
# Subsequent runs will be fast
# Models cache to: data/models/
```

**Check network:**
```bash
# Test speed to job boards
time curl -I https://jobswithgpt.com
# Should be <2s
```

**Reduce concurrent requests:**
```json
// In user_prefs.json
"scraper_config": {
  "max_concurrent": 3,  // Default is 5
  "request_delay": 2.0   // Seconds between requests
}
```

### "High memory usage"

```bash
# Check usage
ps aux | grep python

# Reduce batch size
"scoring_config": {
  "batch_size": 50  // Default is 100
}
```

### "Web UI slow"

```bash
# Reduce page size
# Default: 50 jobs per page
# Edit in web UI settings: 25 jobs per page

# Or clean old jobs
python -m jsa.cli db-clean --older-than 30
```

## Windows-specific issues

### "Windows Defender blocks launcher"

```powershell
# Add exclusion
Add-MpPreference -ExclusionPath "C:\Users\YourName\Desktop\JobSentinel"

# Or manually:
# Windows Security → Virus & threat protection → Exclusions → Add folder
```

### "Task Scheduler not running"

```powershell
# Check scheduled task
Get-ScheduledTask -TaskName "JobSentinel*"

# Check last run
Get-ScheduledTaskInfo -TaskName "JobSentinel Run"

# Re-create task
# Open: deploy/local/windows/launch-gui.bat
# Click "Schedule" button
```

### "PowerShell script won't run"

```powershell
# Check execution policy
Get-ExecutionPolicy

# Set to allow local scripts
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## macOS-specific issues

### "Gatekeeper blocks script"

```bash
# Right-click script → Open → Open (confirms)
# Or remove quarantine:
xattr -d com.apple.quarantine deploy/local/macos/setup-macos.sh
```

### "launchd job not running"

```bash
# Check if loaded
launchctl list | grep jobsentinel

# View logs
cat ~/Library/Logs/jobsentinel.log

# Reload job
launchctl unload ~/Library/LaunchAgents/com.jobsentinel.run.plist
launchctl load ~/Library/LaunchAgents/com.jobsentinel.run.plist
```

### "Homebrew not found"

```bash
# Install Homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add to PATH (for Apple Silicon)
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

## Linux-specific issues

### "systemd service won't start"

```bash
# Check service status
systemctl --user status jobsentinel

# View logs
journalctl --user -u jobsentinel -n 50

# Reload after config changes
systemctl --user daemon-reload
systemctl --user restart jobsentinel
```

### "Cron job not running"

```bash
# Check cron logs
grep CRON /var/log/syslog

# Test cron command manually
cd /path/to/JobSentinel && source .venv/bin/activate && python -m jsa.cli run-once

# Verify PATH in crontab
# Add to crontab:
PATH=/usr/local/bin:/usr/bin:/bin
```

## Web UI issues

### "Port already in use"

```bash
# Find process using port 8000
lsof -i :8000  # macOS/Linux
netstat -ano | findstr :8000  # Windows

# Kill process or use different port
python -m jsa.cli web --port 8001
```

### "Can't access from other devices"

```bash
# Bind to all interfaces
python -m jsa.cli web --host 0.0.0.0 --port 8000

# Access from other device
# http://YOUR_IP:8000

# Find your IP:
# macOS/Linux: ifconfig | grep "inet "
# Windows: ipconfig
```

### "Web UI won't load"

```bash
# Check if server running
curl http://localhost:8000

# Check logs
tail -f logs/jobsentinel.log

# Try clean start
pkill -f "jsa.cli web"  # Kill old server
python -m jsa.cli web --port 8000
```

## ML/AI issues

### "BERT model download fails"

```bash
# Check disk space (need ~1GB)
df -h

# Manual download
python -c "
from sentence_transformers import SentenceTransformer
model = SentenceTransformer('all-MiniLM-L6-v2')
"
```

### "Resume analysis crashes"

```bash
# Check dependencies
pip list | grep -E "pdfplumber|python-docx|spacy"

# Reinstall ML extras
pip install -e ".[resume,ml]"

# Download spaCy model
python -m spacy download en_core_web_lg
```

## Still stuck?

1. **Collect logs:**
   ```bash
   # Full debug log
   python -m jsa.cli run-once --log-level DEBUG > debug.log 2>&1
   ```

2. **Check known issues:**
   - https://github.com/cboyd0319/JobSentinel/issues

3. **Open new issue:**
   - https://github.com/cboyd0319/JobSentinel/issues/new
   - Include: OS, Python version, error message, logs

4. **Ask in discussions:**
   - https://github.com/cboyd0319/JobSentinel/discussions
