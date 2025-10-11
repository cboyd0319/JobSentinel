# Quickstart Guide

Get JobSentinel running in under 5 minutes.

## Prerequisites Check

Before starting, verify you have:

| Requirement | How to Check | Install If Missing |
|-------------|--------------|-------------------|
| Python 3.13+ | `python3 --version` | [python.org/downloads](https://www.python.org/downloads/) |
| Git | `git --version` | [git-scm.com](https://git-scm.com/) |
| Internet connection | Browser test | - |

**Platform requirements:**
- Windows 11 (build 22000+)
- macOS 15+ (Sequoia)
- Ubuntu 22.04+ (or compatible Linux)

## Installation (Automated)

**Step 1:** Clone the repository
```bash
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel
```

**Step 2:** Run the installer
```bash
python3 scripts/install.py
```

The installer will:
1. Detect your platform and verify compatibility
2. Install Python 3.13.8 if needed (Windows only)
3. Create a virtual environment (`.venv/`)
4. Install all dependencies
5. Install Playwright browsers
6. Configure automation (Task Scheduler/launchd/cron)
7. Verify installation

**Step 3:** Configure your preferences
```bash
# Copy example config
cp config/user_prefs.example.json config/user_prefs.json

# Edit with your preferences
nano config/user_prefs.json  # or vim, code, etc.
```

**Minimal config to get started:**
```json
{
  "keywords": ["python", "backend", "engineer"],
  "locations": ["Remote"],
  "salary_min": 100000,
  "job_sources": {
    "jobswithgpt": { "enabled": true }
  },
  "slack": {
    "webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/HERE",
    "channel": "#job-alerts"
  }
}
```

**Step 4:** Set up Slack webhook (optional but recommended)

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name it "JobSentinel" and select your workspace
4. Under "Incoming Webhooks", toggle "Activate Incoming Webhooks"
5. Click "Add New Webhook to Workspace"
6. Select a channel (e.g., #job-alerts)
7. Copy the webhook URL to your config

**Step 5:** Run your first scrape
```bash
# Activate virtual environment
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Test configuration
python -m jsa.cli config-validate

# Run single scrape session
python -m jsa.cli run-once
```

You should see:
```
✅ Configuration valid
🔍 Scraping jobs from 1 source(s)...
📊 Found 42 jobs
🎯 23 high-scoring matches
📬 Sent alerts to Slack
✅ Scrape complete
```

## Installation (Manual)

If the automated installer fails, install manually:

```bash
# Step 1: Clone repo
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel

# Step 2: Create virtual environment
python3.13 -m venv .venv

# Step 3: Activate virtual environment
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Step 4: Install dependencies
pip install --upgrade pip
pip install -e .[dev,resume]

# Step 5: Install Playwright browsers
playwright install chromium

# Step 6: Copy config templates
cp config/user_prefs.example.json config/user_prefs.json
cp .env.example .env

# Step 7: Edit configs (see above for minimal config)
nano config/user_prefs.json

# Step 8: Test
python -m jsa.cli run-once
```

## Verification

Run these commands to verify installation:

```bash
# Check Python version
python --version  # Should show 3.13.x

# Check jsa module is installed
python -c "import jsa; print('✅ jsa module found')"

# Check Playwright
python -c "from playwright.sync_api import sync_playwright; print('✅ Playwright installed')"

# Validate config
python -m jsa.cli config-validate

# Check database
ls data/*.db  # Should see jobs.db
```

## Next Steps

### Schedule Automatic Runs

**Windows (Task Scheduler):**
```bash
# The installer already configured this
schtasks /query /tn "JobSentinel"
```

**macOS (launchd):**
```bash
# The installer already configured this
launchctl list | grep jobsentinel
```

**Linux (cron):**
```bash
# Edit crontab
crontab -e

# Add this line (runs every 2 hours)
0 */2 * * * cd /path/to/JobSentinel && .venv/bin/python -m jsa.cli run-once >> data/logs/cron.log 2>&1
```

### Explore Commands

```bash
# See all commands
python -m jsa.cli --help

# Dry-run (preview only, no alerts)
python -m jsa.cli run-once --dry-run

# Verbose output
python -m jsa.cli run-once --verbose

# Start web UI
python -m jsa.cli web --port 5000
```

### Configure More Sources

Edit `config/user_prefs.json` to enable more scrapers:

```json
{
  "job_sources": {
    "jobswithgpt": { "enabled": true },
    "reed": { 
      "enabled": true, 
      "api_key": "YOUR_REED_API_KEY"
    },
    "greenhouse": { "enabled": true },
    "lever": { "enabled": true }
  }
}
```

Get API keys:
- Reed: [reed.co.uk/developers](https://www.reed.co.uk/developers)

### Enable AI Scoring (Optional)

Add to `.env`:
```bash
LLM_ENABLED=true
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini
```

This uses GPT to enhance job scoring. Costs ~$0.01-0.05 per run.

## Troubleshooting

**"Python 3.13 not found"**
- Download from [python.org/downloads](https://www.python.org/downloads/)
- On Windows, check "Add Python to PATH" during installation

**"Permission denied" on macOS/Linux**
- Add execute permission: `chmod +x scripts/install.py`

**"Module not found" errors**
- Activate venv: `source .venv/bin/activate`
- Reinstall: `pip install -e .`

**"No jobs found"**
- Check internet connection
- Verify sources are enabled in config
- Run with `--verbose` to see scraper logs

**"Slack webhook failed"**
- Verify webhook URL in config
- Test webhook: `curl -X POST -H 'Content-type: application/json' --data '{"text":"test"}' YOUR_WEBHOOK_URL`

See [troubleshooting.md](troubleshooting.md) for more.

## Getting Help

- **Documentation:** [docs/README.md](README.md)
- **Issues:** [github.com/cboyd0319/JobSentinel/issues](https://github.com/cboyd0319/JobSentinel/issues)
- **Discussions:** [github.com/cboyd0319/JobSentinel/discussions](https://github.com/cboyd0319/JobSentinel/discussions)

## What's Next?

- [Configuration Guide](configuration.md) - Full config reference
- [Cloud Deployment](cloud-deployment.md) - Run in GCP/AWS
- [Architecture](ARCHITECTURE.md) - How it works under the hood
- [Contributing](../CONTRIBUTING.md) - Help improve JobSentinel
