# MCP Integration Guide

**Access 500,000+ jobs through Model Context Protocol (MCP) aggregators.**

---

## What is MCP?

MCP (Model Context Protocol) allows the Job Finder to connect to external job aggregators that continuously index hundreds of thousands of jobs from multiple sources.

**Available MCP Servers:**
- **JobsWithGPT** - 500k+ continuously-refreshed jobs (FREE)
- **Reed Jobs** - UK job market via official API (FREE with API key)
- **JobSpy** - Multi-site scraper (Indeed, ZipRecruiter, Glassdoor)

---

## Quick Start: JobsWithGPT (Recommended)

**Why:** 500,000+ jobs, no API key needed, actively maintained.

### 1. Enable in Config

Edit `config/user_prefs.json`:
```json
{
  "mcp_servers": {
    "jobswithgpt": {
      "enabled": true
    }
  }
}
```

### 2. Run Scraper

```bash
python -m src.agent --mode scrape
```

That's it! You're now searching 500k+ jobs.

---

## Reed Jobs (UK Market)

**Best for:** UK-based job seekers or international opportunities.

### 1. Get API Key

1. Go to https://www.reed.co.uk/developers
2. Sign up for free developer account
3. Copy your API key

### 2. Set Environment Variable

```bash
# Linux/macOS
export REED_API_KEY=your_key_here

# Windows PowerShell
$env:REED_API_KEY="your_key_here"

# Or add to .env file
echo "REED_API_KEY=your_key_here" >> .env
```

### 3. Enable in Config

```json
{
  "mcp_servers": {
    "reed": {
      "enabled": true,
      "distance_miles": 25,
      "results_per_request": 100
    }
  }
}
```

---

## JobSpy (Multi-Site Aggregator)

**⚠️ Advanced Users Only:** Aggressive scraper, higher risk of rate limiting.

### 1. Install JobSpy MCP Server

```bash
# Clone JobSpy MCP server
git clone https://github.com/borgius/jobspy-mcp-server.git
cd jobspy-mcp-server
npm install
```

### 2. Configure

```json
{
  "mcp_servers": {
    "jobspy": {
      "enabled": true,
      "server_path": "/path/to/jobspy-mcp-server/index.js",
      "default_sites": ["indeed", "zip_recruiter", "glassdoor"],
      "exclude_linkedin": true,
      "results_wanted": 50
    }
  }
}
```

**Site Options:**
- `indeed`
- `zip_recruiter`
- `glassdoor`
- `google` (Google Jobs)
- `linkedin` (⚠️ High risk - may violate ToS)
- `monster`

### 3. Security Isolation (Recommended)

Run JobSpy in Docker for safety:
```bash
docker-compose -f docker/docker-compose.mcp.yml up -d jobspy
```

See [Security Guide](SECURITY_GUIDE.md#docker-isolation) for details.

---

## MCP Security

### Rate Limiting

MCP servers are automatically rate-limited:

| Server | Requests/Hour | Reason |
|--------|---------------|--------|
| JobsWithGPT | 100 | Public API, moderate |
| Reed | 300 | Official API, higher tolerance |
| JobSpy | 50 | Aggressive scraper, conservative |

**Check rate limits:**
```python
from utils.rate_limiter import mcp_rate_limits

stats = mcp_rate_limits.get_all_stats()
print(stats)
```

### Input Validation

All MCP requests are automatically validated to prevent injection attacks:

```python
from utils.validators import validate_job_search

# Automatically blocks:
# - SQL injection: ' OR 1=1 --
# - Command injection: ; rm -rf /
# - Path traversal: ../../etc/passwd
# - XSS: <script>alert(1)</script>

validated = validate_job_search(
    keywords=["python", "devops"],  # ✅ Safe
    locations=[{"city": "Denver", "state": "CO"}]
)
```

### Secrets Scanning

TruffleHog automatically scans for accidentally committed secrets:
- API keys
- Tokens
- Passwords
- Private keys

**Pre-commit hook** blocks commits with secrets.

### Audit Logging

All MCP calls are logged to `logs/audit.jsonl`:

```bash
# View recent MCP calls
tail -f logs/audit.jsonl | jq

# Check for anomalies
python -c "
from utils.audit_log import anomaly_detector
anomaly_detector.print_anomaly_report(hours=24)
"
```

### Emergency Disable (Panic Button)

If an MCP server is compromised or misbehaving:

```bash
# Disable all MCP servers immediately
./scripts/mcp-panic-button.sh

# Disable specific server
./scripts/mcp-panic-button.sh jobspy

# Check status
./scripts/mcp-panic-button.sh --status

# Restore from backup
./scripts/mcp-panic-button.sh --restore
```

---

## Troubleshooting

### "Rate limit exceeded"

**Problem:** Too many requests to MCP server.

**Solution:**
```bash
# Wait 1 hour, or check wait time:
python -c "
from utils.rate_limiter import mcp_rate_limits
stats = mcp_rate_limits.get_limiter('jobswithgpt').get_stats()
print(f'Wait {stats[\"wait_time_seconds\"]:.0f} seconds')
"
```

### "MCP server not responding"

**Problem:** MCP server down or unreachable.

**Solutions:**
1. **Check server status**
   - JobsWithGPT: https://jobswithgpt.com (check if site is up)
   - Reed: https://www.reed.co.uk/developers (check API status)

2. **Disable temporarily**
   ```json
   {"mcp_servers": {"jobswithgpt": {"enabled": false}}}
   ```

3. **Check logs**
   ```bash
   tail -100 data/logs/application.log | grep -i "mcp"
   ```

### "JobSpy server not found"

**Problem:** JobSpy MCP server path incorrect.

**Solution:**
```json
{
  "mcp_servers": {
    "jobspy": {
      "server_path": "/absolute/path/to/jobspy-mcp-server/index.js"
    }
  }
}
```

Verify path exists:
```bash
ls -la /path/to/jobspy-mcp-server/index.js
```

### Cloudflare 403 Errors

**Problem:** JobsWithGPT blocked by Cloudflare bot protection.

**Solutions:**
1. **This is expected** without proper MCP setup
2. **Use official MCP server** (recommended - bypasses Cloudflare)
3. **Wait and retry** (temporary block, usually clears in 1 hour)

---

## API Integration Examples

### Search with JobsWithGPT

```python
from sources.jobswithgpt_scraper import JobsWithGPTScraper

async def search():
    scraper = JobsWithGPTScraper()
    jobs = await scraper.search(
        keywords=["python", "devops"],
        locations=[{"city": "Denver", "state": "CO"}],
        distance=50000,  # 50km radius
        page=1
    )
    return jobs

# Run
import asyncio
jobs = asyncio.run(search())
print(f"Found {len(jobs)} jobs")
```

### Search with Reed (UK)

```python
from sources.reed_mcp_scraper import ReedMCPScraper

async def search():
    scraper = ReedMCPScraper()
    jobs = await scraper.search(
        keywords="python developer",
        location="London",
        distance_miles=25,
        minimum_salary=50000,
        maximum_salary=100000
    )
    return jobs
```

### Search with JobSpy (Multi-Site)

```python
from sources.jobspy_mcp_scraper import JobSpyMCPScraper

async def search():
    scraper = JobSpyMCPScraper()
    jobs = await scraper.search(
        keywords=["python", "devops"],
        location="Denver, CO",
        site_names=["indeed", "zip_recruiter"],
        results_wanted=50,
        hours_old=72  # Last 3 days
    )
    return jobs
```

### Global Convenience Functions

```python
# High-level API - automatically uses enabled MCP servers
from sources.job_scraper import search_jobs_by_keywords

async def search():
    # Searches ALL enabled MCP servers + direct scrapers
    jobs = await search_jobs_by_keywords(
        keywords=["python", "devops"],
        locations=[{"city": "Denver", "state": "CO"}]
    )
    return jobs  # Deduplicated results from all sources
```

---

## Performance Optimization

### Deduplication

MCP aggregators often return duplicate jobs from multiple sources. Automatic deduplication uses:

1. **External ID** (highest priority)
   - Same Greenhouse/Lever job ID = duplicate

2. **Normalized URL** (removes tracking params)
   - `example.com/job/123?utm_source=indeed` = `example.com/job/123`

3. **Content fingerprint** (fallback)
   - Same company + title + description (first 255 chars) = duplicate

**Cache stats:**
```python
from utils.cache import job_cache

stats = job_cache.get_stats()
print(f"Cached {stats['job_hashes_count']} job hashes")
```

### Parallel Scraping

```bash
# Scrape multiple MCP servers in parallel
python -m src.agent --mode scrape --parallel 3
```

---

## Cost Analysis

| MCP Server | Cost | Jobs | Rate Limit | Notes |
|------------|------|------|------------|-------|
| **JobsWithGPT** | FREE | 500k+ | 100/hr | Best value |
| **Reed** | FREE | UK market | 300/hr | Official API |
| **JobSpy** | FREE | Multi-site | 50/hr | Higher risk |

**Recommended:** Start with JobsWithGPT only, add others if needed.

---

## MCP Quick Reference

### Commands

```bash
# Test MCP server
python examples/test_jobswithgpt.py

# Check rate limits
python -c "from utils.rate_limiter import mcp_rate_limits; print(mcp_rate_limits.get_all_stats())"

# View audit logs
tail -f logs/audit.jsonl | jq

# Emergency disable
./scripts/mcp-panic-button.sh

# Docker isolation
docker-compose -f docker/docker-compose.mcp.yml up -d
```

### Configuration Template

```json
{
  "mcp_servers": {
    "jobswithgpt": {
      "enabled": true
    },
    "reed": {
      "enabled": false,
      "api_key_env_var": "REED_API_KEY",
      "distance_miles": 25,
      "minimum_salary": 30000,
      "results_per_request": 100
    },
    "jobspy": {
      "enabled": false,
      "server_path": null,
      "default_sites": ["indeed", "zip_recruiter", "glassdoor"],
      "exclude_linkedin": true,
      "results_wanted": 50,
      "hours_old": 72
    }
  }
}
```

---

**Next:** [Security Guide](SECURITY_GUIDE.md) - Secure your MCP deployment
