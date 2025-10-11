# Troubleshooting Guide

Common issues and solutions for JobSentinel.

## Installation Issues

### Python 3.13 Not Found

**Symptoms:**
```
python3: command not found
```
or
```
Python 3.12.x found, but 3.13+ required
```

**Solutions:**

**Windows:**
1. Download Python 3.13.8 from [python.org/downloads](https://www.python.org/downloads/)
2. Run installer, **check "Add Python to PATH"**
3. Restart terminal
4. Verify: `python --version`

**macOS:**
```bash
# Using Homebrew
brew install python@3.13

# Or download from python.org
# After install, verify:
python3.13 --version
```

**Linux (Ubuntu 22.04+):**
```bash
sudo apt update
sudo apt install python3.13 python3.13-venv python3.13-dev
```

### Virtual Environment Activation Fails

**Symptoms:**
```
.venv/bin/activate: No such file or directory
```

**Solutions:**
```bash
# Recreate virtual environment
rm -rf .venv
python3.13 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e .
```

### Playwright Installation Fails

**Symptoms:**
```
playwright.driver.DriverException: Playwright executable not found
```

**Solutions:**
```bash
# Install Playwright browsers
playwright install chromium

# If that fails, install system dependencies first
# Ubuntu/Debian:
sudo apt-get install libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
  libxrandr2 libgbm1 libasound2

# Then retry:
playwright install chromium
```

### Permission Denied (macOS/Linux)

**Symptoms:**
```
Permission denied: './scripts/install.py'
```

**Solutions:**
```bash
# Add execute permission
chmod +x scripts/install.py

# Or run with python explicitly
python3 scripts/install.py
```

## Configuration Issues

### Invalid Config Format

**Symptoms:**
```
JSONDecodeError: Expecting property name enclosed in double quotes
```

**Solutions:**
- Validate JSON syntax at [jsonlint.com](https://jsonlint.com/)
- Common errors:
  - Trailing commas: `{"key": "value",}`  (remove trailing comma)
  - Single quotes: `{'key': 'value'}` (use double quotes)
  - Missing commas: `{"a": 1 "b": 2}` (add comma between properties)

**Example valid config:**
```json
{
  "keywords": ["python", "backend"],
  "locations": ["Remote"],
  "salary_min": 100000,
  "job_sources": {
    "jobswithgpt": { "enabled": true }
  }
}
```

### Slack Webhook Not Working

**Symptoms:**
```
AuthError: Invalid Slack webhook URL
```
or
```
HTTP 404: Invalid webhook URL
```

**Solutions:**

1. **Verify webhook URL format:**
   ```
   https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
   ```

2. **Test webhook directly:**
   ```bash
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"JobSentinel test"}' \
     YOUR_WEBHOOK_URL
   ```

3. **Check webhook is active:**
   - Go to [api.slack.com/apps](https://api.slack.com/apps)
   - Select your app
   - Check "Incoming Webhooks" is enabled

4. **Regenerate webhook if needed:**
   - Delete old webhook
   - Create new webhook to same channel
   - Update config with new URL

### API Key Invalid

**Symptoms:**
```
AuthenticationError: Invalid Reed API key
```

**Solutions:**

1. **Verify API key format** (no extra spaces/newlines)

2. **Check key hasn't expired:**
   - Reed: [reed.co.uk/developers](https://www.reed.co.uk/developers)
   - OpenAI: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

3. **Test API key:**
   ```bash
   # Reed API test
   curl -H "Authorization: Basic YOUR_BASE64_ENCODED_KEY" \
     "https://www.reed.co.uk/api/1.0/search?keywords=python"
   ```

4. **Regenerate key** if compromised

## Runtime Issues

### No Jobs Found

**Symptoms:**
```
✅ Configuration valid
🔍 Scraping jobs from 1 source(s)...
📊 Found 0 jobs
```

**Solutions:**

1. **Check sources are enabled:**
   ```json
   {
     "job_sources": {
       "jobswithgpt": { "enabled": true }  // Verify this is true
     }
   }
   ```

2. **Verify internet connection:**
   ```bash
   ping google.com
   ```

3. **Check for scraper errors (verbose mode):**
   ```bash
   python -m jsa.cli run-once --verbose
   ```

4. **Test individual scrapers:**
   ```bash
   python examples/jobswithgpt_demo.py
   ```

5. **Check if site is blocking:**
   - Job sites may block automated requests
   - Solution: Add delays in scraper config
   - Or use proxy/VPN

### SSL Certificate Errors

**Symptoms:**
```
SSLError: [SSL: CERTIFICATE_VERIFY_FAILED]
```

**Solutions:**

**macOS:**
```bash
# Run certificate installer
/Applications/Python 3.13/Install Certificates.command
```

**All platforms:**
```bash
# Update certifi
pip install --upgrade certifi

# Or disable SSL verification (NOT RECOMMENDED for production)
export PYTHONHTTPSVERIFY=0
```

### Module Import Errors

**Symptoms:**
```
ModuleNotFoundError: No module named 'jsa'
```

**Solutions:**

1. **Activate virtual environment:**
   ```bash
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   ```

2. **Reinstall package:**
   ```bash
   pip install -e .
   ```

3. **Check Python path:**
   ```bash
   python -c "import sys; print(sys.path)"
   # Should include your project directory
   ```

4. **Verify installation:**
   ```bash
   pip list | grep JobSentinel
   ```

### Database Locked

**Symptoms:**
```
sqlite3.OperationalError: database is locked
```

**Solutions:**

1. **Check for running processes:**
   ```bash
   # Find processes using database
   lsof data/jobs.db  # macOS/Linux
   # Kill if necessary
   ```

2. **Close web UI** if running

3. **Wait and retry** (another process may be writing)

4. **Backup and recreate database:**
   ```bash
   cp data/jobs.db data/jobs.db.backup
   rm data/jobs.db
   python -m jsa.cli run-once  # Creates new database
   ```

## Performance Issues

### Slow Scraping

**Symptoms:**
- Takes >10 minutes to scrape
- High CPU/memory usage

**Solutions:**

1. **Disable headless browser for debugging:**
   - Edit scraper to set `headless=False`
   - Helps identify stuck pages

2. **Reduce concurrent scrapers:**
   ```json
   {
     "max_concurrent_scrapers": 2  // Default is 5
   }
   ```

3. **Increase timeouts:**
   ```json
   {
     "scraper_timeout": 60  // Default is 30
   }
   ```

4. **Check system resources:**
   ```bash
   # Monitor CPU/memory
   top  # or htop on Linux
   ```

### High Memory Usage

**Symptoms:**
- Memory usage >1GB
- System becomes slow

**Solutions:**

1. **Close other applications**

2. **Reduce Playwright instances:**
   ```json
   {
     "max_browser_contexts": 1  // Default is 3
   }
   ```

3. **Clear old jobs from database:**
   ```bash
   python -m jsa.cli cleanup --days 30
   ```

4. **Increase system swap** (if available)

## Cloud Deployment Issues

### GCP Authentication Failed

**Symptoms:**
```
google.auth.exceptions.DefaultCredentialsError
```

**Solutions:**

1. **Authenticate gcloud:**
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Set credentials explicitly:**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```

3. **Verify permissions:**
   - Service account needs: Cloud Run Admin, Cloud Scheduler Admin, Storage Admin

### Cloud Run Deployment Fails

**Symptoms:**
```
ERROR: Container failed to start
```

**Solutions:**

1. **Check container logs:**
   ```bash
   gcloud logging read "resource.type=cloud_run_revision" --limit 50
   ```

2. **Verify Dockerfile:**
   - Test locally: `docker build -t jobsentinel .`
   - Run locally: `docker run -p 8080:8080 jobsentinel`

3. **Check environment variables:**
   ```bash
   gcloud run services describe jobsentinel --format="value(spec.template.spec.containers[0].env)"
   ```

4. **Increase memory/timeout:**
   ```bash
   gcloud run services update jobsentinel --memory 512Mi --timeout 300
   ```

## Getting Help

If none of these solutions work:

1. **Enable verbose logging:**
   ```bash
   python -m jsa.cli run-once --verbose
   ```

2. **Check logs:**
   ```bash
   cat data/logs/app.log
   ```

3. **Create a GitHub issue:**
   - URL: https://github.com/cboyd0319/JobSentinel/issues
   - Include:
     - OS and Python version
     - Full error message
     - Steps to reproduce
     - Relevant config (redact secrets!)

4. **Ask in Discussions:**
   - https://github.com/cboyd0319/JobSentinel/discussions

## Additional Resources

- [Quickstart Guide](quickstart.md)
- [Configuration Reference](configuration.md)
- [Architecture](ARCHITECTURE.md)
- [Security Policy](../SECURITY.md)
