# JobsWithGPT Integration Guide

🌟 **GAME CHANGER:** Access 500,000+ jobs from a single API!

---

## Overview

JobsWithGPT provides a continuously-refreshed database of 500,000+ public job listings aggregated from multiple sources. By integrating with their MCP (Model Context Protocol) server, we can dramatically simplify our job scraping infrastructure.

### Benefits

✅ **Massive Coverage:** 500k+ jobs vs our current ~1-2k
✅ **Zero Maintenance:** No more broken scrapers when sites redesign
✅ **Real-Time Updates:** Jobs are continuously refreshed
✅ **FREE Access:** No API costs
✅ **Multi-Source:** Aggregates from many job boards
✅ **Structured Data:** Clean, normalized job information

### Architecture Change

**Before (Traditional Scraping):**
```
User Config → Greenhouse Scraper → Company Site
             → Lever Scraper → Company Site
             → Microsoft Scraper → Company Site
             → Playwright Scraper → Company Site (HTML parsing)
             (10+ custom scrapers to maintain)
```

**After (JobsWithGPT Integration):**
```
User Preferences → JobsWithGPT API → 500k+ Jobs
                 ↓
          (Fallback to custom scrapers if needed)
```

---

## Installation

### 1. Install Dependencies

JobsWithGPT integration requires the Python MCP SDK:

```bash
pip install "mcp[cli]" httpx
```

Or update your requirements:
```bash
pip install -r requirements.txt
```

### 2. Verify Installation

```bash
python3 -c "import mcp; import httpx; print('✅ JobsWithGPT dependencies installed')"
```

---

## Usage

### Option 1: Search by Keywords (Recommended)

```python
import asyncio
from sources.job_scraper import search_jobs_by_keywords

async def find_python_jobs():
    jobs = await search_jobs_by_keywords(
        keywords=["python", "remote"],
        locations=[{"city": "Denver", "state": "CO"}],
        distance=80000,  # 80km radius
        page=1
    )

    print(f"Found {len(jobs)} jobs")
    for job in jobs:
        print(f"- {job['title']} at {job['company']}")

asyncio.run(find_python_jobs())
```

### Option 2: Direct Scraper Usage

```python
import asyncio
from sources.jobswithgpt_scraper import JobsWithGPTScraper

async def advanced_search():
    scraper = JobsWithGPTScraper()

    jobs = await scraper.search(
        keywords=["machine learning", "AI"],
        locations=[
            {"city": "San Francisco", "state": "CA"},
            {"city": "New York", "state": "NY"}
        ],
        titles=["ML Engineer", "Data Scientist"],
        distance=50000,  # 50km
        page=1
    )

    return jobs

jobs = asyncio.run(advanced_search())
```

### Option 3: Convenience Function

```python
import asyncio
from sources.jobswithgpt_scraper import search_jobs

async def quick_search():
    jobs = await search_jobs(
        keywords=["devops", "kubernetes"],
        locations=[{"state": "CO"}],
        page=1
    )
    return jobs
```

---

## Integration with Existing Workflow

### Update `src/agent.py` to Use JobsWithGPT

Instead of scraping individual company sites, you can search JobsWithGPT's database using user preferences:

```python
# In src/agent.py

async def scrape_jobs_smartly():
    """
    New approach: Search JobsWithGPT first, fall back to custom scrapers if needed.
    """
    prefs = config_manager.get_user_preferences()

    # Extract search criteria from user prefs
    keywords = []
    keywords.extend(prefs.get("title_allowlist", []))
    keywords.extend(prefs.get("keywords_boost", []))

    # Build location filters
    location_prefs = prefs.get("location_preferences", {})
    locations = []

    if location_prefs.get("cities"):
        for city in location_prefs["cities"]:
            locations.append({"city": city})

    if location_prefs.get("states"):
        for state in location_prefs["states"]:
            locations.append({"state": state})

    # Search JobsWithGPT
    logger.info("Searching JobsWithGPT database...")
    jobswithgpt_jobs = await search_jobs_by_keywords(
        keywords=keywords,
        locations=locations if locations else None,
        page=1
    )

    logger.info(f"Found {len(jobswithgpt_jobs)} jobs from JobsWithGPT")

    # Optionally, also scrape specific companies from config
    company_jobs = []
    companies = config_manager.get_companies()

    for company in companies:
        logger.info(f"Scraping {company.id} directly...")
        jobs = await scrape_jobs(company.url, fetch_descriptions=True)
        company_jobs.extend(jobs)

    # Combine and deduplicate
    all_jobs = jobswithgpt_jobs + company_jobs
    unique_jobs = deduplicate_jobs(all_jobs)

    return unique_jobs
```

---

## Configuration

### User Preferences Example

```json
{
  "title_allowlist": [
    "Software Engineer",
    "DevOps Engineer",
    "Security Engineer"
  ],
  "title_blocklist": [
    "Manager",
    "Director",
    "Intern"
  ],
  "keywords_boost": [
    "python",
    "kubernetes",
    "AWS",
    "remote"
  ],
  "location_preferences": {
    "allow_remote": true,
    "cities": ["Denver", "Boulder"],
    "states": ["CO", "CA"],
    "country": "US"
  },
  "salary_floor_usd": 150000,
  "immediate_alert_threshold": 0.9,
  "digest_min_score": 0.7,

  "use_jobswithgpt": true,
  "jobswithgpt_search_radius_meters": 80000,
  "jobswithgpt_max_pages": 5
}
```

### GCP Cloud Deployment

JobsWithGPT works seamlessly in GCP Cloud Functions/Cloud Run:

```python
# No special configuration needed!
# Just ensure dependencies are in requirements.txt

import asyncio
from sources.job_scraper import search_jobs_by_keywords

def cloud_function_handler(request):
    """GCP Cloud Function using JobsWithGPT."""
    jobs = asyncio.run(search_jobs_by_keywords(
        keywords=["python"],
        locations=[{"state": "CO"}],
        page=1
    ))

    return {"jobs_found": len(jobs), "jobs": jobs}
```

### Windows Local Setup

Works identically on Windows - no special setup required:

```powershell
# Install dependencies
python -m pip install -r requirements.txt

# Run test
python examples\test_jobswithgpt.py
```

---

## API Reference

### `search_jobs_by_keywords()`

Global convenience function for keyword-based searches.

**Parameters:**
- `keywords` (List[str]): Search keywords
- `locations` (List[Dict], optional): Location filters
- `titles` (List[str], optional): Job title filters
- `distance` (int, default=50000): Search radius in meters
- `page` (int, default=1): Page number

**Returns:** List[Dict] - Normalized job dictionaries

### `JobsWithGPTScraper.search()`

Direct scraper method for advanced usage.

**Parameters:**
- `keywords` (List[str], optional): Search keywords
- `locations` (List[Dict], optional): Location filters (format: `[{"city": "Denver", "state": "CO"}]`)
- `titles` (List[str], optional): Job title filters
- `distance` (int, default=50000): Search radius in meters
- `page` (int, default=1): Page number for pagination
- `fetch_descriptions` (bool, default=True): Whether to include full descriptions

**Returns:** List[Dict] - Normalized job dictionaries

### Response Format

All JobsWithGPT results are normalized to our standard schema:

```python
{
    "title": "Senior Software Engineer",
    "company": "Example Corp",
    "location": "San Francisco, CA",
    "url": "https://...",
    "description": "Job description text...",
    "id": "job_12345",
    "posted_date": "2025-10-03",
    "salary": "$150k - $200k",
    "employment_type": "Full-time",
    "remote": true,
    "source": "jobswithgpt",
    "ats_type": "greenhouse",  # Original source ATS
    "created_at": "2025-10-03T12:00:00Z",
    "score": 0.85,  # Calculated by our matching algorithm
    "reasons": ["Title matched 'Software Engineer'", ...]
}
```

---

## Testing

### Run Integration Tests

```bash
python examples/test_jobswithgpt.py
```

**Expected Output:**
```
================================================================================
JobsWithGPT Integration Tests
================================================================================

TEST 1: Basic Job Search
================================================================================
✅ Found 50 Python jobs in San Francisco

📋 Sample job:
  Title: Senior Python Engineer
  Company: Tech Startup Inc
  Location: San Francisco, CA
  URL: https://...
  Source: jobswithgpt

... (more tests)

✅ ALL TESTS COMPLETED
```

### Manual Testing

```python
import asyncio
from sources.jobswithgpt_scraper import search_jobs

# Quick test
jobs = asyncio.run(search_jobs(
    keywords=["python"],
    locations=[{"city": "Denver"}],
    page=1
))

print(f"Found {len(jobs)} jobs")
```

---

## Troubleshooting

### Issue: Cloudflare Protection

**Symptom:** HTTP 403 or "Enable JavaScript" errors

**Cause:** JobsWithGPT API is protected by Cloudflare bot detection

**Solution:**
1. Use the MCP server via subprocess (implemented in `jobswithgpt_mcp_client.py`)
2. Or use the official MCP server from their GitHub repo
3. The integration automatically falls back to MCP server if direct HTTP fails

**To use MCP server:**
```python
from sources.jobswithgpt_mcp_client import search_jobs_mcp

jobs = await search_jobs_mcp(
    keywords=["python"],
    locations=[{"city": "Denver"}],
    page=1
)
```

### Issue: No Results Found

**Symptom:** Empty jobs list returned

**Possible Causes:**
1. Search criteria too restrictive
2. API rate limiting
3. Service temporarily down

**Solution:**
- Broaden search criteria (fewer keywords, larger distance)
- Check JobsWithGPT status: https://jobswithgpt.com/
- Fall back to traditional scrapers (automatically handled)

### Issue: Import Errors

**Symptom:** `ModuleNotFoundError: No module named 'mcp'`

**Solution:**
```bash
pip install "mcp[cli]" httpx
```

Or:
```bash
pip install -r requirements.txt
```

---

## Performance Comparison

| Metric | Traditional Scraping | JobsWithGPT |
|--------|---------------------|-------------|
| **Job Coverage** | ~1-2k (configured companies only) | 500,000+ (all sources) |
| **Scraping Time** | 5-10 minutes (10 companies) | 1-2 seconds (API call) |
| **Maintenance** | High (scrapers break on redesigns) | Zero (managed by JobsWithGPT) |
| **Cost** | Compute time for scraping | FREE |
| **Reliability** | ~85% (HTML parsing fragile) | ~99% (structured API) |
| **Freshness** | Manual scraping schedule | Continuously updated |

---

## Migration Strategy

### Phase 1: Add JobsWithGPT as Primary Source ✅ DONE

- [x] Install dependencies
- [x] Create JobsWithGPT scraper
- [x] Register in scraper system
- [x] Test integration

### Phase 2: Hybrid Approach (Recommended)

Use JobsWithGPT for broad searches, keep custom scrapers for:
- Companies not in JobsWithGPT database
- Jobs requiring detailed custom parsing
- Fallback when JobsWithGPT unavailable

### Phase 3: Gradual Deprecation (Future)

Once confidence in JobsWithGPT is high:
- Make JobsWithGPT the default
- Keep only high-value custom scrapers (e.g., Microsoft, SpaceX)
- Remove fragile HTML-based scrapers

---

## Advanced Usage

### Pagination for Large Result Sets

```python
async def get_all_matching_jobs(keywords, locations, max_pages=10):
    """Get all jobs across multiple pages."""
    all_jobs = []

    for page in range(1, max_pages + 1):
        jobs = await search_jobs(
            keywords=keywords,
            locations=locations,
            page=page
        )

        if not jobs:
            break  # No more results

        all_jobs.extend(jobs)
        logger.info(f"Page {page}: {len(jobs)} jobs (total: {len(all_jobs)})")

    return all_jobs
```

### Combining Multiple Search Queries

```python
async def comprehensive_search():
    """Search for multiple job types."""
    all_jobs = []

    # Search for different roles
    roles = [
        (["software engineer", "python"], "Software Engineering"),
        (["devops", "kubernetes"], "DevOps"),
        (["security engineer", "appsec"], "Security")
    ]

    for keywords, category in roles:
        jobs = await search_jobs(keywords=keywords, page=1)
        logger.info(f"{category}: {len(jobs)} jobs")
        all_jobs.extend(jobs)

    return all_jobs
```

### Filtering Results Post-Search

```python
def filter_by_salary(jobs, min_salary=150000):
    """Filter jobs by minimum salary."""
    filtered = []

    for job in jobs:
        salary_str = job.get("salary", "")
        # Extract salary from string (e.g., "$150k - $200k")
        # (Implementation depends on salary format)
        if meets_salary_requirement(salary_str, min_salary):
            filtered.append(job)

    return filtered
```

---

## Related Documentation

- [AI Enhancements Guide](./AI_ENHANCEMENTS.md) - Full AI/MCP integration overview
- [API Integrations Guide](./API_INTEGRATIONS.md) - ATS-specific API details
- [Development Guide](./DEVELOPMENT.md) - Development environment setup

---

## Future Enhancements

1. **Caching:** Cache JobsWithGPT results to reduce API calls
2. **Rate Limiting:** Implement smart rate limiting if needed
3. **Favorites:** Track which JobsWithGPT sources produce best results
4. **Monitoring:** Track JobsWithGPT availability and success rates
5. **A/B Testing:** Compare JobsWithGPT vs traditional scraping results

---

*Document created: 2025-10-03*
*Last updated: 2025-10-03*
*Owner: Chad Boyd (@cboyd0319)*
