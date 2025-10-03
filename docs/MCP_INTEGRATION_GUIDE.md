# MCP Server Integration Guide

Practical guide for integrating free, open-source MCP servers into the job scraper.

---

## Quick Start

**Current Status:**
- ✅ **JobsWithGPT**: Already integrated (`sources/jobswithgpt_scraper.py`)
- ⏸️ **LinkedIn MCP**: Ready to integrate (high risk, see ToS warnings)
- ⏸️ **JobSpy MCP**: Ready to integrate (medium risk, multi-site)
- ⏸️ **Job Searchoor**: Ready to integrate (low complexity)
- ⏸️ **Reed Jobs**: Ready to integrate (UK-focused, official API)

---

## 1. LinkedIn MCP Server (stickerdaniel)

### 1.1 Installation

**Prerequisites:**
- Docker installed
- LinkedIn account (preferably a burner/separate account)
- Linux/macOS/Windows with Docker support

**Step 1: Get LinkedIn Cookie**
```bash
# 1. Log into LinkedIn in your browser
# 2. Open Developer Tools (F12)
# 3. Go to Application > Cookies > https://www.linkedin.com
# 4. Find cookie named "li_at"
# 5. Copy the value (looks like: AQEDARxxxxxxxx...)
```

**Step 2: Configure Claude Desktop**

Edit `~/.config/claude/claude_desktop_config.json` (macOS/Linux) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "-e",
        "LINKEDIN_COOKIE",
        "stickerdaniel/linkedin-mcp-server:latest"
      ],
      "env": {
        "LINKEDIN_COOKIE": "li_at=YOUR_COOKIE_VALUE_HERE"
      }
    }
  }
}
```

**Step 3: Restart Claude Desktop**

### 1.2 Integration into Job Scraper

Create `sources/linkedin_mcp_scraper.py`:

```python
"""LinkedIn job scraper using stickerdaniel's MCP server."""

from __future__ import annotations

import asyncio
import json
import subprocess
from typing import Dict, List, Optional

from utils.logging import get_logger
from utils.data_extractor import DataExtractor
from .job_scraper_base import JobBoardScraper

logger = get_logger("sources.linkedin_mcp_scraper")


class LinkedInMCPScraper(JobBoardScraper):
    """Scraper that uses LinkedIn MCP server for job search."""

    def __init__(self):
        super().__init__(name="LinkedIn MCP", priority=2)
        self.extractor = DataExtractor()

    def can_scrape(self, url: str) -> bool:
        """LinkedIn MCP is keyword-based, not URL-based."""
        return False  # Not used for URL scraping

    async def scrape(
        self,
        url: str,
        fetch_descriptions: bool = True
    ) -> List[Dict]:
        """Not used - use search() instead."""
        logger.warning("LinkedIn MCP doesn't scrape URLs. Use search() instead.")
        return []

    async def search(
        self,
        keywords: Optional[List[str]] = None,
        location: Optional[str] = None,
        limit: int = 25
    ) -> List[Dict]:
        """
        Search LinkedIn jobs via MCP server.

        Args:
            keywords: Job search keywords (e.g., ["python", "engineer"])
            location: Location filter (e.g., "San Francisco, CA")
            limit: Max results (default 25, max 100)

        Returns:
            List of normalized job dictionaries

        ⚠️ WARNING: This uses LinkedIn session cookie scraping.
        - Use a burner LinkedIn account
        - Throttle requests (max 1 per 5-10 seconds)
        - Accept ToS violation risk
        """
        if not keywords:
            logger.warning("No keywords provided for LinkedIn search")
            return []

        search_query = " ".join(keywords)
        logger.info(f"Searching LinkedIn for: {search_query}")

        try:
            # Call LinkedIn MCP server via Docker
            # This matches the MCP protocol for the server
            mcp_request = {
                "method": "tools/call",
                "params": {
                    "name": "search_jobs",
                    "arguments": {
                        "query": search_query,
                        "location": location or "",
                        "limit": min(limit, 100)
                    }
                }
            }

            # Execute MCP call via subprocess
            result = subprocess.run(
                [
                    "docker",
                    "run",
                    "--rm",
                    "-i",
                    "-e",
                    f"LINKEDIN_COOKIE={self._get_linkedin_cookie()}",
                    "stickerdaniel/linkedin-mcp-server:latest"
                ],
                input=json.dumps(mcp_request).encode(),
                capture_output=True,
                timeout=60
            )

            if result.returncode != 0:
                logger.error(f"LinkedIn MCP error: {result.stderr.decode()}")
                return []

            response = json.loads(result.stdout.decode())
            jobs_data = response.get("result", {}).get("jobs", [])

            logger.info(f"Found {len(jobs_data)} jobs from LinkedIn MCP")

            return await self._process_results(jobs_data)

        except subprocess.TimeoutExpired:
            logger.error("LinkedIn MCP request timed out")
            return []
        except Exception as e:
            logger.error(f"LinkedIn MCP search failed: {e}")
            return []

    async def _process_results(self, jobs_data: List[Dict]) -> List[Dict]:
        """Convert LinkedIn MCP results to normalized schema."""
        normalized_jobs = []

        for job in jobs_data:
            raw_job = {
                "title": job.get("title", "N/A"),
                "company": job.get("company", {}).get("name", "Unknown"),
                "location": job.get("location", "Not Specified"),
                "url": job.get("url", "#"),
                "description": job.get("description", ""),
                "id": job.get("jobId", ""),
                "posted_date": job.get("listedAt", ""),
            }

            normalized_job = self.extractor.normalize_job_data(
                raw_job,
                raw_job["company"],
                "linkedin_mcp",
                raw_job["url"]
            )

            normalized_jobs.append(normalized_job)

        return normalized_jobs

    def _get_linkedin_cookie(self) -> str:
        """
        Get LinkedIn session cookie from environment or config.

        Returns li_at cookie value.
        """
        import os
        cookie = os.environ.get("LINKEDIN_COOKIE", "")
        if not cookie:
            logger.error("LINKEDIN_COOKIE environment variable not set!")
        return cookie


# Convenience function
async def search_linkedin_jobs(
    keywords: List[str],
    location: Optional[str] = None,
    limit: int = 25
) -> List[Dict]:
    """Search LinkedIn jobs via MCP server."""
    scraper = LinkedInMCPScraper()
    return await scraper.search(keywords=keywords, location=location, limit=limit)
```

### 1.3 Usage Example

```python
import asyncio
from sources.linkedin_mcp_scraper import search_linkedin_jobs

async def main():
    # Search for Python engineer jobs in SF
    jobs = await search_linkedin_jobs(
        keywords=["python", "engineer"],
        location="San Francisco, CA",
        limit=25
    )

    print(f"Found {len(jobs)} jobs")
    for job in jobs[:5]:
        print(f"- {job['title']} at {job['company']}")

asyncio.run(main())
```

### 1.4 Risk Mitigation

**Rate Limiting:**
```python
import time

async def safe_linkedin_search(keywords, location, max_per_day=50):
    """Throttled LinkedIn search to avoid bans."""
    # Add delay between requests
    await asyncio.sleep(10)  # 10 second delay

    jobs = await search_linkedin_jobs(keywords, location, limit=25)

    # Track daily usage (implement counter in config)
    # If counter > max_per_day, skip search

    return jobs
```

---

## 2. JobSpy MCP Server (borgius)

### 2.1 Installation

**Prerequisites:**
- Node.js v16+
- npm

**Step 1: Clone and Install**
```bash
git clone https://github.com/borgius/jobspy-mcp-server.git
cd jobspy-mcp-server
npm install
```

**Step 2: Configure Claude Desktop**
```json
{
  "mcpServers": {
    "jobspy": {
      "command": "node",
      "args": ["/path/to/jobspy-mcp-server/src/index.js"],
      "env": {
        "ENABLE_SSE": "0"
      }
    }
  }
}
```

### 2.2 Integration into Job Scraper

Create `sources/jobspy_mcp_scraper.py`:

```python
"""Multi-site job scraper using JobSpy MCP server."""

from __future__ import annotations

import asyncio
import json
import subprocess
from typing import Dict, List, Optional

from utils.logging import get_logger
from utils.data_extractor import DataExtractor
from .job_scraper_base import JobBoardScraper

logger = get_logger("sources.jobspy_mcp_scraper")


class JobSpyMCPScraper(JobBoardScraper):
    """Scraper that aggregates Indeed, LinkedIn, ZipRecruiter, etc."""

    def __init__(self):
        super().__init__(name="JobSpy MCP", priority=3)
        self.extractor = DataExtractor()
        self.mcp_script_path = "/path/to/jobspy-mcp-server/src/index.js"

    def can_scrape(self, url: str) -> bool:
        """JobSpy is keyword-based, not URL-based."""
        return False

    async def search(
        self,
        keywords: Optional[List[str]] = None,
        location: Optional[str] = None,
        site_names: Optional[List[str]] = None,
        results_wanted: int = 50,
        hours_old: int = 72
    ) -> List[Dict]:
        """
        Search multiple job boards simultaneously.

        Args:
            keywords: Search keywords
            location: Location filter
            site_names: Specific sites (e.g., ["indeed", "linkedin"])
                       If None, searches all sites
            results_wanted: Max results per site
            hours_old: Only jobs posted within this timeframe

        Returns:
            List of normalized job dictionaries
        """
        if not keywords:
            logger.warning("No keywords provided for JobSpy search")
            return []

        search_query = " ".join(keywords)
        logger.info(f"Searching JobSpy for: {search_query}")

        try:
            mcp_request = {
                "method": "tools/call",
                "params": {
                    "name": "search_jobs",
                    "arguments": {
                        "query": search_query,
                        "location": location or "Remote",
                        "site_names": site_names or ["indeed", "linkedin", "zip_recruiter"],
                        "results_wanted": results_wanted,
                        "hours_old": hours_old
                    }
                }
            }

            # Call JobSpy MCP server
            result = subprocess.run(
                ["node", self.mcp_script_path],
                input=json.dumps(mcp_request).encode(),
                capture_output=True,
                timeout=120  # Longer timeout for multi-site
            )

            if result.returncode != 0:
                logger.error(f"JobSpy MCP error: {result.stderr.decode()}")
                return []

            response = json.loads(result.stdout.decode())
            jobs_data = response.get("result", {}).get("jobs", [])

            logger.info(f"Found {len(jobs_data)} jobs from JobSpy MCP")

            return await self._process_results(jobs_data)

        except Exception as e:
            logger.error(f"JobSpy MCP search failed: {e}")
            return []

    async def _process_results(self, jobs_data: List[Dict]) -> List[Dict]:
        """Convert JobSpy results to normalized schema."""
        normalized_jobs = []

        for job in jobs_data:
            raw_job = {
                "title": job.get("title", "N/A"),
                "company": job.get("company", "Unknown"),
                "location": job.get("location", "Not Specified"),
                "url": job.get("job_url", "#"),
                "description": job.get("description", ""),
                "id": job.get("id", ""),
                "posted_date": job.get("date_posted", ""),
                "salary": job.get("compensation", ""),
            }

            normalized_job = self.extractor.normalize_job_data(
                raw_job,
                raw_job["company"],
                f"jobspy_{job.get('site', 'unknown')}",
                raw_job["url"]
            )

            normalized_jobs.append(normalized_job)

        return normalized_jobs


# Convenience function
async def search_multi_site_jobs(
    keywords: List[str],
    location: Optional[str] = None,
    sites: Optional[List[str]] = None
) -> List[Dict]:
    """Search multiple job boards via JobSpy MCP."""
    scraper = JobSpyMCPScraper()
    return await scraper.search(
        keywords=keywords,
        location=location,
        site_names=sites
    )
```

### 2.3 Usage Example

```python
import asyncio
from sources.jobspy_mcp_scraper import search_multi_site_jobs

async def main():
    # Search Indeed and ZipRecruiter for DevOps jobs
    jobs = await search_multi_site_jobs(
        keywords=["devops", "kubernetes"],
        location="Denver, CO",
        sites=["indeed", "zip_recruiter"]  # Skip LinkedIn to reduce risk
    )

    print(f"Found {len(jobs)} jobs across multiple sites")

asyncio.run(main())
```

---

## 3. Job Searchoor (0xDAEF0F)

### 3.1 Installation

**Prerequisites:**
- Node.js v16+
- npm/npx

**Step 1: Configure Claude Desktop**
```json
{
  "mcpServers": {
    "job-search": {
      "command": "npx",
      "args": ["-y", "job-searchoor"]
    }
  }
}
```

### 3.2 Integration (Minimal Example)

Create `sources/searchoor_mcp_scraper.py`:

```python
"""Minimal job scraper using Job Searchoor MCP."""

from __future__ import annotations

import json
import subprocess
from typing import Dict, List, Optional

from utils.logging import get_logger
from utils.data_extractor import DataExtractor
from .job_scraper_base import JobBoardScraper

logger = get_logger("sources.searchoor_mcp_scraper")


class SearchoorMCPScraper(JobBoardScraper):
    """Simple scraper using Job Searchoor MCP."""

    def __init__(self):
        super().__init__(name="Searchoor MCP", priority=4)
        self.extractor = DataExtractor()

    def can_scrape(self, url: str) -> bool:
        return False

    async def search(
        self,
        keywords: List[str],
        keywords_exclude: Optional[List[str]] = None,
        since_when: str = "7d",  # "1d", "7d", "30d"
        remote_only: bool = False
    ) -> List[Dict]:
        """
        Simple job search via Searchoor.

        Args:
            keywords: Keywords to search (include)
            keywords_exclude: Keywords to exclude
            since_when: How far back to search (1d, 7d, 30d)
            remote_only: Filter remote jobs only
        """
        mcp_request = {
            "method": "tools/call",
            "params": {
                "name": "get_jobs",
                "arguments": {
                    "keywords": keywords,
                    "keywords_exclude": keywords_exclude or [],
                    "sinceWhen": since_when,
                    "remote": remote_only
                }
            }
        }

        try:
            result = subprocess.run(
                ["npx", "-y", "job-searchoor"],
                input=json.dumps(mcp_request).encode(),
                capture_output=True,
                timeout=30
            )

            if result.returncode != 0:
                logger.error(f"Searchoor error: {result.stderr.decode()}")
                return []

            response = json.loads(result.stdout.decode())
            jobs_data = response.get("result", {}).get("jobs", [])

            logger.info(f"Found {len(jobs_data)} jobs from Searchoor")

            return await self._process_results(jobs_data)

        except Exception as e:
            logger.error(f"Searchoor search failed: {e}")
            return []

    async def _process_results(self, jobs_data: List[Dict]) -> List[Dict]:
        """Convert Searchoor results to normalized schema."""
        # Similar to other scrapers
        normalized_jobs = []
        for job in jobs_data:
            raw_job = {
                "title": job.get("title", "N/A"),
                "company": job.get("company", "Unknown"),
                "location": job.get("location", "Remote"),
                "url": job.get("url", "#"),
                "description": job.get("description", ""),
            }
            normalized_job = self.extractor.normalize_job_data(
                raw_job, raw_job["company"], "searchoor", raw_job["url"]
            )
            normalized_jobs.append(normalized_job)

        return normalized_jobs
```

---

## 4. Reed Jobs MCP (UK Focus)

### 4.1 Installation

**Prerequisites:**
- Node.js v16+
- Reed API key (free from https://www.reed.co.uk/developers)

**Step 1: Get API Key**
```bash
# 1. Go to https://www.reed.co.uk/developers
# 2. Sign up for free account
# 3. Copy API key
```

**Step 2: Clone and Configure**
```bash
git clone https://github.com/kld3v/reed_jobs_mcp.git
cd reed_jobs_mcp
npm install
```

**Step 3: Configure `mcp.json`**
```json
{
  "reed_api_key": "YOUR_REED_API_KEY_HERE"
}
```

**Step 4: Configure Claude Desktop**
```json
{
  "mcpServers": {
    "reed-jobs": {
      "command": "node",
      "args": ["/path/to/reed_jobs_mcp/index.js"]
    }
  }
}
```

### 4.2 Integration (UK Jobs)

Create `sources/reed_mcp_scraper.py` (similar pattern to others).

---

## 5. Integration Strategy

### 5.1 Recommended Approach

**Primary Source:**
- ✅ JobsWithGPT (already integrated, 500k+ jobs, low risk)

**Supplementary Sources (opt-in):**
- ⚠️ LinkedIn MCP (high value, high risk - user chooses)
- ⚠️ JobSpy MCP (broad coverage, medium risk)
- ✅ Reed Jobs (UK users, official API, low risk)

**Fallback:**
- ✅ Existing ATS scrapers (Greenhouse, Lever, etc.)

### 5.2 User Configuration

Add to `config/user_prefs.json`:

```json
{
  "mcp_servers": {
    "linkedin_enabled": false,
    "linkedin_cookie": "",
    "linkedin_max_per_day": 50,
    "jobspy_enabled": false,
    "jobspy_sites": ["indeed", "zip_recruiter"],
    "reed_enabled": false,
    "reed_api_key": ""
  }
}
```

### 5.3 Update `src/agent.py`

```python
async def scrape_with_mcp_fallback():
    """Smart scraping with MCP servers as primary, ATS as fallback."""
    prefs = config_manager.get_user_preferences()
    all_jobs = []

    # 1. JobsWithGPT (always enabled, 500k+ jobs)
    logger.info("Searching JobsWithGPT...")
    jobswithgpt_jobs = await search_jobs_by_keywords(
        keywords=prefs.get("keywords_boost", []),
        locations=build_locations_from_prefs(prefs),
        page=1
    )
    all_jobs.extend(jobswithgpt_jobs)

    # 2. LinkedIn MCP (opt-in, high value)
    if prefs.get("mcp_servers", {}).get("linkedin_enabled"):
        logger.info("Searching LinkedIn MCP...")
        linkedin_jobs = await search_linkedin_jobs(
            keywords=prefs.get("keywords_boost", []),
            location=prefs.get("location_preferences", {}).get("cities", [None])[0]
        )
        all_jobs.extend(linkedin_jobs)

    # 3. Fallback to traditional ATS scrapers
    companies = config_manager.get_companies()
    for company in companies:
        logger.info(f"Scraping {company.id} (ATS fallback)...")
        jobs = await scrape_jobs(company.url, fetch_descriptions=True)
        all_jobs.extend(jobs)

    # Deduplicate and return
    return deduplicate_jobs(all_jobs)
```

---

## 6. Testing

### 6.1 Test Each MCP Server

```bash
# Test LinkedIn MCP
python examples/test_linkedin_mcp.py

# Test JobSpy MCP
python examples/test_jobspy_mcp.py

# Test Job Searchoor
python examples/test_searchoor_mcp.py

# Test Reed Jobs
python examples/test_reed_mcp.py
```

### 6.2 Integration Test

```bash
# Full integration test with all MCP servers
python examples/test_all_mcp_servers.py
```

---

## 7. Monitoring & Metrics

Track MCP server health:

```python
# Add to src/health_check.py

async def check_mcp_server_health():
    """Check if MCP servers are responding."""
    health = {}

    # Test JobsWithGPT
    try:
        jobs = await search_jobs_by_keywords(["test"], page=1)
        health["jobswithgpt"] = "ok" if len(jobs) > 0 else "warning"
    except Exception as e:
        health["jobswithgpt"] = f"error: {e}"

    # Test LinkedIn MCP (if enabled)
    if config.get("linkedin_enabled"):
        try:
            jobs = await search_linkedin_jobs(["test"], limit=1)
            health["linkedin_mcp"] = "ok" if len(jobs) > 0 else "warning"
        except Exception as e:
            health["linkedin_mcp"] = f"error: {e}"

    return health
```

---

## 8. Troubleshooting

### LinkedIn MCP: "Cookie expired"
**Solution:** Re-authenticate and get new `li_at` cookie

### JobSpy: "No results found"
**Solution:** Site may be down or rate-limited. Try different site or wait.

### Searchoor: "Command not found"
**Solution:** Ensure Node.js and npx are installed

### Reed Jobs: "Invalid API key"
**Solution:** Verify API key from Reed Developer Portal

---

## 9. Best Practices

1. **Always start with JobsWithGPT** (500k+ jobs, low risk)
2. **Use LinkedIn MCP sparingly** (burner account, throttle requests)
3. **Monitor daily usage** (track requests per MCP server)
4. **Implement rate limiting** (avoid bans)
5. **Respect ToS** (read and comply with each platform's terms)
6. **User opt-in** (require explicit consent for high-risk sources)
7. **Fallback gracefully** (if MCP fails, use ATS scrapers)

---

*Document created: 2025-10-03*
*Last updated: 2025-10-03*
*Owner: Chad Boyd (@cboyd0319)*
