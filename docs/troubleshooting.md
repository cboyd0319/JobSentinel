# Troubleshooting

**Platform:** Windows 11+, macOS 14+, Ubuntu 22.04+  
**Database:** SQLite (built-in, zero setup)

## Common Issues

| Error | Fix |
|-------|-----|
| `python3: command not found` | Install Python 3.11+ from [python.org/downloads](https://www.python.org/downloads/). Windows: check "Add to PATH" |
| `Python 3.10.x found, but 3.11+ required` | Install Python 3.11+. macOS: `brew install python@3.11`. Linux: `sudo apt install python3.11` |
| `.venv/bin/activate: No such file` | Recreate venv: `rm -rf .venv && python3.11 -m venv .venv && source .venv/bin/activate && pip install -e .` |
| `ModuleNotFoundError: No module named 'jsa'` | Activate venv: `source .venv/bin/activate`, run `pip install -e .` |
| `Playwright executable not found` | `playwright install chromium`. Ubuntu needs deps: `sudo apt-get install libnss3 libnspr4 libatk1.0-0 ...` |
| `Permission denied: './scripts/install.py'` | `chmod +x scripts/install.py` or `python3 scripts/install.py` |
| `JSONDecodeError: Expecting property name` | Validate at [jsonlint.com](https://jsonlint.com/). Remove trailing commas, use double quotes |
| `AuthError: Invalid Slack webhook` | Test: `curl -X POST -H 'Content-type: application/json' --data '{"text":"test"}' YOUR_WEBHOOK_URL`. Check format: `https://hooks.slack.com/services/T.../B.../XXX` |
| `AuthenticationError: Invalid Reed API key` | Verify key at [reed.co.uk/developers](https://www.reed.co.uk/developers). Test: `curl -H "Authorization: Basic YOUR_KEY" "https://www.reed.co.uk/api/1.0/search?keywords=python"` |
| `Found 0 jobs` | Check sources enabled in config, verify API keys, run with `--verbose` |
| `HTTP 429: Too Many Requests` | Rate limited. Wait 60s, reduce scrape frequency in config |
| `SSL certificate verify failed` | `pip install --upgrade certifi`. macOS: run `/Applications/Python 3.11/Install Certificates.command` |
| `Database locked` | Close other processes using `data/jobs.db`, or wait 30s |
| Web UI shows blank page | Check logs: `python -m jsa.cli web --port 5000 --verbose`. Clear browser cache |

## Windows-Specific Issues

| Error | Fix |
|-------|-----|
| Execution Policy error | Run PowerShell as admin: `Set-ExecutionPolicy RemoteSigned` |
| Path too long errors | Enable long paths: Settings → System → About → Advanced system settings → Computer Name → Advanced → Environment Variables |
| Port already in use | Use different port: `python -m jsa.cli web --port 5001` |
| Shortcuts missing | Re-run `deployments/windows/local/setup-windows.bat` |
| Disk space error | Free up 1GB+ space, or extract to different drive |

## Quick checks

```bash
# Verify install
python --version  # Should be 3.11.x or higher
python -c "import jsa"  # No error = installed
python -m jsa.cli config-validate  # Check config

# Test Slack webhook
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"test"}' \
  YOUR_WEBHOOK_URL

# Debug scraper
python -m jsa.cli run-once --verbose --dry-run
```

## Cloud deployment

| Error | Fix |
|-------|-----|
| `google.auth.exceptions.DefaultCredentialsError` | `gcloud auth login && gcloud config set project YOUR_PROJECT_ID` |
| `Container failed to start` (Cloud Run) | Check logs: `gcloud logging read "resource.type=cloud_run_revision" --limit 50`. Test locally: `docker build -t jobsentinel . && docker run -p 8080:8080 jobsentinel` |
| Cloud Run out of memory | `gcloud run services update jobsentinel --memory 512Mi --timeout 300` |

## Getting help

1. Run with `--verbose`: `python -m jsa.cli run-once --verbose`
2. Check logs: `cat data/logs/app.log`
3. Open issue: [github.com/cboyd0319/JobSentinel/issues](https://github.com/cboyd0319/JobSentinel/issues)
   - Include: OS, Python version, full error, steps to reproduce, config (redact secrets)
4. Ask in [Discussions](https://github.com/cboyd0319/JobSentinel/discussions)
