# Quickstart

Get JobSentinel running in 5 minutes.

## Prereqs

| Item | Check | Install |
|------|-------|---------|
| Python 3.13+ | `python3 --version` | [python.org/downloads](https://www.python.org/downloads/) |
| Git | `git --version` | [git-scm.com](https://git-scm.com/) |

## Install (Automated)

```bash
git clone https://github.com/cboyd0319/JobSentinel && cd JobSentinel
python3 scripts/install.py
```

The installer creates venv, installs deps, configures automation (Task Scheduler/launchd/cron).

## Configure

```bash
cp config/user_prefs.example.json config/user_prefs.json
nano config/user_prefs.json  # or vim, code, etc.
```

**Minimal config:**
```json
{
  "keywords": ["python", "backend"],
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

## Slack webhook (optional)

1. [api.slack.com/apps](https://api.slack.com/apps) → "Create New App" → "From scratch"
2. Under "Incoming Webhooks", toggle on
3. "Add New Webhook to Workspace" → select channel
4. Copy webhook URL to config

## Run

```bash
source .venv/bin/activate  # Windows: .venv\Scripts\activate
python -m jsa.cli run-once
```

Output:
```
✅ Configuration valid
🔍 Scraping 1 source
📊 Found 42 jobs
🎯 23 high-scoring matches
📬 Sent alerts to Slack
```

## Install (Manual)

```bash
git clone https://github.com/cboyd0319/JobSentinel && cd JobSentinel
python3.13 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e .
playwright install chromium
cp config/user_prefs.example.json config/user_prefs.json
# Edit config/user_prefs.json, then:
python -m jsa.cli run-once
```

## Verify

```bash
python --version  # 3.13.x
python -c "import jsa"  # No error = installed
python -m jsa.cli config-validate  # Should pass
```

## Schedule (optional)

**Linux/macOS cron (every 2 hours):**
```bash
crontab -e
# Add: 0 */2 * * * cd /path/to/JobSentinel && .venv/bin/python -m jsa.cli run-once >> data/logs/cron.log 2>&1
```

**Windows:** Task Scheduler (automated installer sets this up)

## More commands

```bash
python -m jsa.cli --help
python -m jsa.cli run-once --dry-run  # No alerts
python -m jsa.cli web --port 5000     # Web UI
```

## More sources

Edit `config/user_prefs.json`:
```json
{
  "job_sources": {
    "jobswithgpt": { "enabled": true },
    "reed": { "enabled": true, "api_key": "YOUR_REED_API_KEY" },
    "greenhouse": { "enabled": true },
    "lever": { "enabled": true }
  }
}
```

Reed API key: [reed.co.uk/developers](https://www.reed.co.uk/developers)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "Python 3.13 not found" | Install from [python.org/downloads](https://www.python.org/downloads/). Windows: check "Add to PATH" |
| "Module not found" | `source .venv/bin/activate && pip install -e .` |
| "No jobs found" | Enable sources in config, run with `--verbose` |
| "Slack webhook failed" | Test: `curl -X POST -H 'Content-type: application/json' --data '{"text":"test"}' YOUR_WEBHOOK_URL` |

See [troubleshooting.md](troubleshooting.md).

## Next

- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) — Cloud setup (GCP/AWS)
- [ARCHITECTURE.md](ARCHITECTURE.md) — System design
- [../CONTRIBUTING.md](../CONTRIBUTING.md) — Help improve JobSentinel
