# User Documentation

**TL;DR:** How to run, configure, and troubleshoot the job scraper.

## Basic Usage

**Run locally:**
```bash
python -m src.agent --mode poll
```

**Check what it found:**
```bash
ls data/jobs/
cat data/jobs/latest.json | jq
```

**View in web UI:**
```bash
python src/web_ui.py
# Open http://localhost:5000
```

## Configuration

**Key files:**
- `config/user_prefs.json` - Your job preferences
- `config/slack_app_manifest.json` - Slack integration

**Essential settings:**
```json
{
  "keywords": ["python", "devops", "remote"],
  "locations": ["Remote", "San Francisco"],
  "min_salary": 100000,
  "excluded_companies": ["Meta", "Uber"]
}
```

## Slack Setup

**Quick setup:**
```bash
python scripts/setup/slack/slack_setup.py
```

**Manual setup:**
1. Create Slack app at api.slack.com
2. Add bot token to config
3. Invite bot to channel
4. Test with: `python notify/slack.py test`

**Job file format:**
```json
{
  "title": "Senior Python Engineer",
  "company": "Acme Corp",
  "location": "Denver, CO",
  "salary": "$120k - $150k",
  "url": "https://jobs.example.com/12345",
  "description": "...",
  "match_score": 0.89,
  "matched_keywords": ["python", "kubernetes", "aws"],
  "scraped_at": "2025-10-03T10:00:00Z"
}
```

### Cleaning Up Old Jobs

```bash
# Delete jobs older than 30 days
python -m src.agent --mode cleanup --days 30

# Or manually
find data/jobs/ -name "*.json" -mtime +30 -delete
```

---

## Configuration

### User Preferences

Edit `config/user_prefs.json` to customize your search:

```json
{
  "keywords": ["python", "devops", "cloud"],
  "job_titles": ["Software Engineer", "DevOps Engineer", "SRE"],
  "locations": [
    {"city": "Denver", "state": "CO"},
    {"city": "Boulder", "state": "CO"},
    {"city": "Remote", "state": "US"}
  ],
  "minimum_salary": 100000,
  "maximum_distance_miles": 50,
  "experience_level": "mid-senior",
  "excluded_companies": [
    "BlockedCorp Inc",
    "Another Blocked Company"
  ],
  "excluded_keywords": ["blockchain", "crypto"],
  "work_authorization": ["US Citizen", "Green Card"],
  "remote_only": false
}
```

**Configuration Options:**

| Field | Type | Description |
|-------|------|-------------|
| `keywords` | Array | Skills/technologies to search for |
| `job_titles` | Array | Job titles to match |
| `locations` | Array | Cities/states to search in |
| `minimum_salary` | Number | Minimum annual salary in USD |
| `maximum_distance_miles` | Number | Search radius from location |
| `experience_level` | String | junior, mid, senior, or mid-senior |
| `excluded_companies` | Array | Companies to ignore |
| `excluded_keywords` | Array | Keywords to filter out |
| `remote_only` | Boolean | Only show remote jobs |

### Applying Changes

After editing config:

**Local:** Just run scraper again
```bash
python -m src.agent --mode scrape
```

**Cloud:** Redeploy to update config
```bash
python -m cloud.bootstrap --update-config
```

---

## Notifications

### Slack Notifications

Get instant alerts for high-match jobs in Slack.

#### 1. Create Slack Webhook

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name it "Job Finder", select your workspace
4. Click "Incoming Webhooks" → Activate
5. Click "Add New Webhook to Workspace"
6. Choose channel (e.g., `#job-alerts`)
7. Copy webhook URL

#### 2. Add to Config

Edit `config/user_prefs.json`:
```json
{
  "slack_webhook_url": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
  "slack_notify_threshold": 0.8
}
```

**Options:**
- `slack_webhook_url`: Your webhook URL from step 1
- `slack_notify_threshold`: Only notify for jobs with match score ≥ this value (0.0-1.0)

#### 3. Test Notification

```bash
python -m src.agent --mode test --test-type slack
```

You should see a test message in your Slack channel!

### Email Notifications (Coming Soon)

Email notifications are planned for v3.0. See [Roadmap](ROADMAP.md).

---

## Windows Users

### PowerShell Installation

Windows users can use the interactive installer:

```powershell
# Download and run bootstrap
irm https://raw.githubusercontent.com/cboyd0319/job-search-automation/main/deploy/windows/bootstrap.ps1 | iex
```

**Features:**
- ✅ One-click install (GUI)
- ✅ Automatic Python setup
- ✅ Desktop shortcut creation
- ✅ Windows Task Scheduler integration
- ✅ Auto-updates

### Windows Task Scheduler

Set up daily automated runs:

**Option 1: During Installation**
- Installer will offer to set up daily runs
- Choose time (default: 9 AM)
- Done!

**Option 2: Manual Setup**
```powershell
# Run setup script
.\deploy\windows\setup-scheduler.ps1
```

**Option 3: Task Scheduler GUI**
1. Open Task Scheduler (search in Start menu)
2. Create Task → Name: "Job Finder Daily"
3. Triggers → New → Daily at 9:00 AM
4. Actions → New → Start Program
   - Program: `python.exe`
   - Arguments: `-m src.agent --mode scrape`
   - Start in: `C:\Users\YourName\Desktop\job-search-automation`
5. Save

### Checking Windows Status

```powershell
# Check if scheduled task exists
Get-ScheduledTask -TaskName "Job Finder*"

# View last run
Get-ScheduledTaskInfo -TaskName "Job Finder Daily"

# Run manually
Start-ScheduledTask -TaskName "Job Finder Daily"
```

---

## Troubleshooting

### No Jobs Found

**Problem:** Scraper runs but finds no jobs matching your criteria.

**Solutions:**
1. **Broaden keywords**
   ```json
   // Too specific
   {"keywords": ["kubernetes", "istio", "eBPF"]}

   // Better
   {"keywords": ["kubernetes", "devops", "cloud"]}
   ```

2. **Check location**
   - Try adding "Remote" as a location
   - Increase `maximum_distance_miles`

3. **Lower salary requirements**
   - If `minimum_salary` is too high, jobs won't match

4. **Review exclusions**
   - Check `excluded_companies` and `excluded_keywords`
   - Remove overly broad exclusions

### Scraper Crashes

**Problem:** `python -m src.agent --mode scrape` crashes with error.

**Solutions:**

1. **Check logs first**
   ```bash
   tail -50 data/logs/application.log
   ```

2. **Common errors:**

   **"Module not found"**
   ```bash
   pip install -r requirements.txt
   ```

   **"Permission denied"**
   ```bash
   chmod +x scripts/*.sh
   ```

   **"Rate limit exceeded"**
   - Wait 1 hour and try again
   - MCP servers have rate limits (see [SETUP_GUIDE.md](SETUP_GUIDE.md))

   **"Connection timeout"**
   - Check internet connection
   - Some job sites may be temporarily down

3. **Run health check**
   ```bash
   python -m src.agent --mode health
   ```

### Cloud Deployment Issues

**Problem:** Cloud deployment fails or doesn't run.

**Solutions:**

1. **Authentication**
   ```bash
   # Re-authenticate
   gcloud auth login
   gcloud auth application-default login
   ```

2. **Check project exists**
   ```bash
   gcloud projects list
   gcloud config set project YOUR_PROJECT_ID
   ```

3. **View deployment logs**
   ```bash
   # Check Cloud Run job status
   gcloud run jobs describe job-scraper --region=us-central1

   # View recent execution logs
   gcloud logging read "resource.type=cloud_run_job" --limit 100
   ```

4. **Budget/quota issues**
   - Go to https://console.cloud.google.com/billing
   - Check if billing is enabled
   - Review quota limits

### Slack Notifications Not Working

**Problem:** Scraper runs but no Slack messages appear.

**Solutions:**

1. **Test webhook directly**
   ```bash
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test from Job Finder"}' \
     YOUR_WEBHOOK_URL
   ```

2. **Check webhook URL**
   - Must start with `https://hooks.slack.com/services/`
   - No spaces or line breaks
   - Test in browser (should show "invalid_payload" - that's OK!)

3. **Check threshold**
   ```json
   // If threshold too high, no jobs qualify
   {"slack_notify_threshold": 0.5}  // Lower = more notifications
   ```

4. **Run test notification**
   ```bash
   python -m src.agent --mode test --test-type slack
   ```

---

## Advanced Features

### Custom Scrapers

Add your own job board scrapers in `sources/`:

```python
# sources/my_custom_scraper.py
from sources.job_scraper import JobBoardScraper

class MyCustomScraper(JobBoardScraper):
    def __init__(self):
        super().__init__(name="My Job Board", base_domains=["myjobboard.com"])

    async def search(self, keywords, locations, **kwargs):
        # Your scraping logic
        return jobs

# Register in sources/job_scraper.py
def _ensure_registry():
    registry = JobBoardRegistry()
    registry.register(MyCustomScraper())
    return registry
```

See [Developer Guide](DEVELOPER_GUIDE.md#adding-scrapers) for details.

### API Access

Access job data programmatically:

```python
from sources.job_scraper import search_jobs_by_keywords

# Search for jobs
jobs = await search_jobs_by_keywords(
    keywords=["python", "devops"],
    locations=[{"city": "Denver", "state": "CO"}],
    page=1
)

for job in jobs:
    print(f"{job['title']} at {job['company']}")
```

### Database Integration

Export jobs to database:

```bash
# SQLite (default)
python -m src.agent --mode export --format sqlite --output jobs.db

# PostgreSQL
python -m src.agent --mode export --format postgres --connection "postgresql://..."

# CSV
python -m src.agent --mode export --format csv --output jobs.csv
```

### Filtering & Matching

Customize match scoring in `src/matcher.py`:

```python
# Adjust keyword weights
KEYWORD_WEIGHTS = {
    "python": 2.0,      # 2x weight for Python
    "kubernetes": 1.5,  # 1.5x weight for K8s
    "devops": 1.0       # Normal weight
}

# Adjust location radius
LOCATION_RADIUS_MILES = 50
```

---

## Performance Tips

### Faster Scraping

1. **Enable MCP aggregators** (500k+ jobs)
   ```json
   {"mcp_servers": {"jobswithgpt": {"enabled": true}}}
   ```

2. **Run in parallel**
   ```bash
   # 4 concurrent scrapers
   python -m src.agent --mode scrape --parallel 4
   ```

3. **Cache results**
   - Deduplication cache reduces repeat scraping
   - Stored in `data/cache/`

### Reduce Costs (Cloud)

1. **Adjust schedule** (less frequent = cheaper)
   ```bash
   # Weekly instead of daily
   gcloud scheduler jobs update job-scraper-trigger \
     --schedule="0 9 * * MON"
   ```

2. **Use spot instances** (GCP Preemptible)
   - Already configured in Cloud Run deployment
   - ~70% cost savings

3. **Set budget alerts**
   - Automatically configured during bootstrap
   - Default: $10/month alert

---

## Getting Help

- **Documentation:** Check other guides in `docs/`
- **Issues:** https://github.com/cboyd0319/job-search-automation/issues
- **Logs:** Always include logs when reporting issues
  ```bash
  tail -100 data/logs/application.log > error_log.txt
  ```

---

**Next:** [Setup Guide](SETUP_GUIDE.md) - Configure job sources and integrations
