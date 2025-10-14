# API Integration Guide

**Version:** 0.9.0  
**Last Updated:** October 14, 2025  
**Audience:** Developers adding new job board integrations

---

## 🎯 Overview

This guide provides step-by-step instructions for integrating new job boards and APIs into JobSentinel. Follow these patterns to ensure consistent, maintainable, and production-ready integrations.

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Integration Patterns](#integration-patterns)
3. [API Scraper Template](#api-scraper-template)
4. [HTML Scraper Template](#html-scraper-template)
5. [Testing Your Integration](#testing-your-integration)
6. [Rate Limiting & Resilience](#rate-limiting--resilience)
7. [Authentication Patterns](#authentication-patterns)
8. [Error Handling](#error-handling)
9. [Documentation Requirements](#documentation-requirements)
10. [Checklist](#checklist)

---

## 🚀 Quick Start

### Prerequisites

```bash
# 1. Set up development environment
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]

# 2. Create API key environment variable
echo "YOUR_API_NAME_API_KEY=your_key_here" >> .env

# 3. Test existing scrapers to understand patterns
python -m pytest tests/unit/test_jobswithgpt_scraper.py -v
```

### Integration Steps

1. **Research the API/website**
   - Read API documentation thoroughly
   - Test API endpoints with curl/Postman
   - Check rate limits and authentication requirements
   - Verify `robots.txt` for HTML scraping

2. **Choose integration pattern**
   - REST API → Use `APIBasedScraper` pattern
   - GraphQL API → Use GraphQL client pattern
   - HTML scraping → Use `PlaywrightScraper` pattern
   - MCP server → Use MCP client pattern

3. **Implement scraper**
   - Create new file in `sources/`
   - Extend base classes
   - Add configuration
   - Implement required methods

4. **Add tests**
   - Unit tests with mocked responses
   - Integration tests with real API (optional)
   - Error handling tests

5. **Document**
   - Add docstrings
   - Update this guide
   - Add example to `examples/`

---

## 🔌 Integration Patterns

### Pattern 1: REST API with JSON Responses

**Best for:** Job boards with official APIs (Indeed, Reed, Dice)

**Example:** Reed API Integration

```python
# sources/reed_scraper.py
from typing import List, Dict, Optional
from sources.job_scraper_base import JobScraperBase
from utils.rate_limiter import RateLimiter
from utils.logging import get_logger
import httpx

logger = get_logger(__name__)

class ReedScraper(JobScraperBase):
    """Reed.co.uk job board API scraper.
    
    API Documentation: https://www.reed.co.uk/developers
    Rate Limits: 5000 requests/day
    Authentication: API key in Basic Auth
    """
    
    BASE_URL = "https://www.reed.co.uk/api/1.0"
    
    def __init__(self, api_key: str):
        """Initialize Reed scraper.
        
        Args:
            api_key: Reed API key from https://www.reed.co.uk/developers/jobseeker
        
        Raises:
            ValueError: If API key is invalid
        """
        super().__init__(name="reed")
        
        if not api_key or len(api_key) < 20:
            raise ValueError("Invalid Reed API key")
        
        self.api_key = api_key
        self.rate_limiter = RateLimiter(
            max_requests=80,   # Stay well under 5000/day limit
            time_window=3600    # 1 hour window
        )
    
    async def search(
        self,
        keywords: str,
        location: Optional[str] = None,
        distance_miles: int = 10,
        min_salary: Optional[int] = None,
        max_results: int = 100
    ) -> List[Dict]:
        """Search for jobs on Reed.
        
        Args:
            keywords: Job keywords (e.g., "python developer")
            location: Location (e.g., "London")
            distance_miles: Search radius in miles
            min_salary: Minimum salary filter
            max_results: Maximum jobs to return
            
        Returns:
            List of job dictionaries
            
        Raises:
            ScraperError: If API request fails
            RateLimitError: If rate limit exceeded
        """
        await self.rate_limiter.acquire(self.BASE_URL)
        
        params = {
            "keywords": keywords,
            "resultsToTake": min(max_results, 100)  # API max per request
        }
        
        if location:
            params["locationName"] = location
            params["distancefromLocation"] = distance_miles
        
        if min_salary:
            params["minimumSalary"] = min_salary
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"{self.BASE_URL}/search",
                    params=params,
                    auth=(self.api_key, "")  # Basic auth with empty password
                )
                
                response.raise_for_status()
                data = response.json()
                
                jobs = self._parse_jobs(data.get("results", []))
                
                logger.info(
                    f"Reed API search completed",
                    extra={
                        "keywords": keywords,
                        "location": location,
                        "job_count": len(jobs)
                    }
                )
                
                return jobs
                
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                raise RateLimitError("Reed API rate limit exceeded") from e
            elif e.response.status_code == 401:
                raise AuthError("Invalid Reed API key") from e
            else:
                raise ScraperError(f"Reed API error: {e}") from e
                
        except httpx.RequestError as e:
            raise ScraperError(f"Network error accessing Reed API: {e}") from e
    
    def _parse_jobs(self, raw_jobs: List[Dict]) -> List[Dict]:
        """Parse Reed API response into standard format.
        
        Args:
            raw_jobs: Raw job data from Reed API
            
        Returns:
            Standardized job dictionaries
        """
        parsed = []
        
        for job in raw_jobs:
            try:
                parsed.append({
                    "id": f"reed_{job['jobId']}",
                    "title": job["jobTitle"],
                    "company": job["employerName"],
                    "location": job["locationName"],
                    "description": job["jobDescription"],
                    "url": job["jobUrl"],
                    "salary_min": job.get("minimumSalary"),
                    "salary_max": job.get("maximumSalary"),
                    "date_posted": job.get("date"),
                    "source": "reed",
                    "raw": job  # Keep original for debugging
                })
            except KeyError as e:
                logger.warning(f"Missing field in Reed job: {e}")
                continue
        
        return parsed
```

### Pattern 2: HTML Scraping with Playwright

**Best for:** Sites without APIs or requiring JavaScript rendering

**Example:** Greenhouse Jobs Scraper

```python
# sources/greenhouse_scraper.py
from typing import List, Dict
from playwright.async_api import async_playwright, Page
from sources.job_scraper_base import JobScraperBase
from utils.logging import get_logger

logger = get_logger(__name__)

class GreenhouseScraper(JobScraperBase):
    """Scraper for Greenhouse-hosted career pages.
    
    Greenhouse is a common ATS used by many companies.
    Each company has their own subdomain: company.greenhouse.io
    """
    
    def __init__(self):
        super().__init__(name="greenhouse")
    
    async def scrape_company(self, company_slug: str) -> List[Dict]:
        """Scrape all jobs from a company's Greenhouse page.
        
        Args:
            company_slug: Company identifier (e.g., "stripe" for stripe.greenhouse.io)
            
        Returns:
            List of job dictionaries
        """
        url = f"https://{company_slug}.greenhouse.io/jobs"
        
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            try:
                await page.goto(url, wait_until="networkidle", timeout=30000)
                
                # Wait for job listings to load
                await page.wait_for_selector(".opening", timeout=10000)
                
                jobs = await self._extract_jobs(page, company_slug)
                
                logger.info(f"Scraped {len(jobs)} jobs from {company_slug}")
                
                return jobs
                
            finally:
                await browser.close()
    
    async def _extract_jobs(self, page: Page, company: str) -> List[Dict]:
        """Extract job data from Greenhouse page.
        
        Args:
            page: Playwright page object
            company: Company slug
            
        Returns:
            Parsed job listings
        """
        jobs = []
        
        # Get all job elements
        job_elements = await page.query_selector_all(".opening")
        
        for element in job_elements:
            try:
                # Extract job details
                title_elem = await element.query_selector(".opening > a")
                title = await title_elem.inner_text() if title_elem else "Unknown"
                url = await title_elem.get_attribute("href") if title_elem else None
                
                location_elem = await element.query_selector(".location")
                location = await location_elem.inner_text() if location_elem else None
                
                dept_elem = await element.query_selector(".department")
                department = await dept_elem.inner_text() if dept_elem else None
                
                jobs.append({
                    "id": f"greenhouse_{company}_{hash(title + (location or ''))}",
                    "title": title.strip(),
                    "company": company.replace("-", " ").title(),
                    "location": location.strip() if location else None,
                    "department": department.strip() if department else None,
                    "url": url if url.startswith("http") else f"https://{company}.greenhouse.io{url}",
                    "source": "greenhouse"
                })
                
            except Exception as e:
                logger.warning(f"Error parsing job element: {e}")
                continue
        
        return jobs
```

### Pattern 3: MCP (Model Context Protocol) Integration

**Best for:** Job aggregators with MCP servers (JobsWithGPT, JobSpy)

```python
# sources/your_mcp_scraper.py
from typing import List, Dict, Optional
import asyncio
import subprocess
from sources.job_scraper_base import JobScraperBase
from utils.logging import get_logger

logger = get_logger(__name__)

class YourMCPScraper(JobScraperBase):
    """MCP-based scraper for YourAPI job aggregator.
    
    Communicates with MCP server via subprocess for access to job database.
    """
    
    def __init__(self, server_path: str):
        """Initialize MCP scraper.
        
        Args:
            server_path: Path to MCP server executable
        """
        super().__init__(name="your_api")
        self.server_path = server_path
        self.process = None
    
    async def __aenter__(self):
        """Start MCP server process."""
        self.process = await asyncio.create_subprocess_exec(
            "node",
            self.server_path,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Stop MCP server process."""
        if self.process:
            self.process.terminate()
            await self.process.wait()
    
    async def search(
        self,
        keywords: List[str],
        location: Optional[str] = None
    ) -> List[Dict]:
        """Search jobs via MCP protocol.
        
        Args:
            keywords: Search keywords
            location: Location filter
            
        Returns:
            Job listings
        """
        # Build MCP request
        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {
                "name": "search",
                "arguments": {
                    "keywords": keywords,
                    "location": location
                }
            }
        }
        
        # Send to MCP server
        self.process.stdin.write(json.dumps(request).encode() + b"\n")
        await self.process.stdin.drain()
        
        # Read response
        response_line = await self.process.stdout.readline()
        response = json.loads(response_line)
        
        if "error" in response:
            raise ScraperError(f"MCP error: {response['error']}")
        
        jobs = response.get("result", {}).get("jobs", [])
        return self._parse_jobs(jobs)
```

---

## 🧪 Testing Your Integration

### Unit Tests with Mocked Responses

```python
# tests/unit/test_your_scraper.py
import pytest
from unittest.mock import Mock, patch, AsyncMock
from sources.your_scraper import YourScraper

@pytest.mark.asyncio
async def test_scraper_success():
    """Test successful job scraping."""
    scraper = YourScraper(api_key="test_key")
    
    # Mock HTTP response
    mock_response = Mock()
    mock_response.json.return_value = {
        "jobs": [
            {
                "id": "123",
                "title": "Python Developer",
                "company": "Acme Corp",
                "location": "Remote"
            }
        ]
    }
    mock_response.status_code = 200
    
    with patch("httpx.AsyncClient.get", return_value=mock_response):
        jobs = await scraper.search(keywords="python")
    
    assert len(jobs) == 1
    assert jobs[0]["title"] == "Python Developer"

@pytest.mark.asyncio
async def test_scraper_rate_limit():
    """Test rate limit handling."""
    scraper = YourScraper(api_key="test_key")
    
    mock_response = Mock()
    mock_response.status_code = 429
    mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "Rate limit", request=Mock(), response=mock_response
    )
    
    with patch("httpx.AsyncClient.get", return_value=mock_response):
        with pytest.raises(RateLimitError):
            await scraper.search(keywords="python")

@pytest.mark.asyncio
async def test_scraper_invalid_response():
    """Test handling of malformed API responses."""
    scraper = YourScraper(api_key="test_key")
    
    mock_response = Mock()
    mock_response.json.return_value = {"invalid": "data"}
    mock_response.status_code = 200
    
    with patch("httpx.AsyncClient.get", return_value=mock_response):
        jobs = await scraper.search(keywords="python")
    
    assert jobs == []  # Should handle gracefully
```

### Integration Tests (Optional)

```python
# tests/integration/test_your_scraper_integration.py
import pytest
import os

@pytest.mark.integration
@pytest.mark.skipif(
    not os.getenv("YOUR_API_KEY"),
    reason="YOUR_API_KEY not set"
)
@pytest.mark.asyncio
async def test_real_api_search():
    """Integration test with real API (requires API key)."""
    from sources.your_scraper import YourScraper
    
    scraper = YourScraper(api_key=os.getenv("YOUR_API_KEY"))
    
    jobs = await scraper.search(
        keywords="python developer",
        location="Remote",
        max_results=5
    )
    
    assert len(jobs) > 0
    assert all("title" in job for job in jobs)
    assert all("company" in job for job in jobs)
```

---

## ⚡ Rate Limiting & Resilience

### Implementing Exponential Backoff

```python
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type
)

class YourScraper(JobScraperBase):
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=60),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException))
    )
    async def _fetch_with_retry(self, url: str) -> httpx.Response:
        """Fetch URL with exponential backoff retry.
        
        Retry strategy:
        - Attempt 1: Immediate
        - Attempt 2: Wait 4s
        - Attempt 3: Wait 8s
        - Then raise exception
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response
```

### Respecting Rate Limits

```python
from utils.rate_limiter import RateLimiter

class YourScraper(JobScraperBase):
    
    def __init__(self):
        super().__init__(name="your_api")
        
        # Configure rate limiter based on API docs
        self.rate_limiter = RateLimiter(
            max_requests=100,      # Max requests per window
            time_window=60,        # Window in seconds (60s = 1 min)
            backoff_factor=2.0     # Exponential backoff multiplier
        )
    
    async def search(self, **kwargs):
        # Acquire rate limit token before making request
        await self.rate_limiter.acquire("your_api")
        
        # Make API request
        response = await self._fetch(url)
        
        # Check for rate limit headers
        if "X-RateLimit-Remaining" in response.headers:
            remaining = int(response.headers["X-RateLimit-Remaining"])
            if remaining < 10:
                logger.warning(f"Low rate limit: {remaining} requests remaining")
        
        return response
```

---

## 🔐 Authentication Patterns

### API Key Authentication

```python
# Basic Auth
auth = (api_key, "")  # Username is API key, password is empty

# Header-based
headers = {"Authorization": f"Bearer {api_key}"}

# Query parameter (least secure, avoid if possible)
params = {"api_key": api_key}
```

### OAuth 2.0 Flow

```python
import httpx
from typing import Optional

class OAuthScraper(JobScraperBase):
    """Scraper with OAuth 2.0 authentication."""
    
    def __init__(self, client_id: str, client_secret: str):
        super().__init__(name="oauth_api")
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token: Optional[str] = None
        self.token_expires_at: Optional[float] = None
    
    async def _get_access_token(self) -> str:
        """Get or refresh OAuth access token."""
        import time
        
        # Return cached token if still valid
        if self.access_token and self.token_expires_at > time.time():
            return self.access_token
        
        # Request new token
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.example.com/oauth/token",
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret
                }
            )
            response.raise_for_status()
            data = response.json()
            
            self.access_token = data["access_token"]
            self.token_expires_at = time.time() + data["expires_in"] - 60  # 60s buffer
            
            return self.access_token
    
    async def search(self, **kwargs):
        token = await self._get_access_token()
        
        headers = {"Authorization": f"Bearer {token}"}
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.example.com/jobs",
                headers=headers,
                params=kwargs
            )
            return response.json()
```

---

## 🚨 Error Handling

### Standardized Error Types

```python
from utils.errors import (
    ScraperError,      # Base scraper error
    RateLimitError,    # Rate limit exceeded
    AuthError,         # Authentication failed
    ParseError,        # Failed to parse response
    NetworkError       # Network/connection error
)

class YourScraper(JobScraperBase):
    
    async def search(self, **kwargs):
        try:
            response = await self._fetch(url)
            jobs = self._parse_response(response)
            return jobs
            
        except httpx.TimeoutException as e:
            raise NetworkError(f"Request timeout: {e}") from e
            
        except httpx.RequestError as e:
            raise NetworkError(f"Network error: {e}") from e
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                raise AuthError("Invalid API credentials") from e
            elif e.response.status_code == 429:
                raise RateLimitError("Rate limit exceeded") from e
            else:
                raise ScraperError(f"HTTP error: {e}") from e
        
        except json.JSONDecodeError as e:
            raise ParseError(f"Invalid JSON response: {e}") from e
        
        except KeyError as e:
            raise ParseError(f"Missing expected field: {e}") from e
```

### Logging Best Practices

```python
from utils.structured_logging import get_logger

logger = get_logger(__name__)

async def search(self, keywords: str):
    logger.info(
        "Starting job search",
        extra={
            "scraper": self.name,
            "keywords": keywords,
            "timestamp": datetime.utcnow().isoformat()
        }
    )
    
    try:
        jobs = await self._fetch_jobs(keywords)
        
        logger.info(
            "Job search completed",
            extra={
                "scraper": self.name,
                "job_count": len(jobs),
                "keywords": keywords
            }
        )
        
        return jobs
        
    except Exception as e:
        logger.error(
            "Job search failed",
            extra={
                "scraper": self.name,
                "keywords": keywords,
                "error_type": type(e).__name__,
                "error_message": str(e)
            },
            exc_info=True  # Include full traceback
        )
        raise
```

---

## 📝 Documentation Requirements

### Docstring Template

```python
class YourScraper(JobScraperBase):
    """Scraper for YourAPI job board.
    
    YourAPI provides access to 50,000+ job listings across multiple industries.
    
    Features:
        - Keyword-based search
        - Location filtering
        - Salary range filtering
        - Company filtering
    
    Rate Limits:
        - 1000 requests per day
        - 10 requests per minute
    
    Authentication:
        - API key required (get from: https://yourapi.com/developers)
        - Key format: 32-character alphanumeric string
    
    Example:
        >>> scraper = YourScraper(api_key="your_key_here")
        >>> jobs = await scraper.search(
        ...     keywords="python developer",
        ...     location="Remote",
        ...     min_salary=100000
        ... )
        >>> print(f"Found {len(jobs)} jobs")
    
    References:
        - API Docs: https://yourapi.com/docs
        - Rate Limits: https://yourapi.com/docs/rate-limits
        - Examples: https://github.com/yourapi/examples
    """
    
    def search(
        self,
        keywords: str,
        location: Optional[str] = None,
        min_salary: Optional[int] = None
    ) -> List[Dict]:
        """Search for jobs matching criteria.
        
        Args:
            keywords: Job title or description keywords (e.g., "python developer")
            location: Geographic location (e.g., "San Francisco" or "Remote")
            min_salary: Minimum annual salary in USD (e.g., 100000)
        
        Returns:
            List of job dictionaries with standardized fields:
                - id (str): Unique job identifier
                - title (str): Job title
                - company (str): Company name
                - location (str): Job location
                - description (str): Full job description
                - url (str): Link to job posting
                - salary_min (int, optional): Minimum salary
                - salary_max (int, optional): Maximum salary
                - date_posted (str, optional): ISO 8601 date
                - source (str): Source identifier ("your_api")
        
        Raises:
            AuthError: If API key is invalid or expired
            RateLimitError: If rate limit is exceeded
            NetworkError: If network request fails
            ScraperError: For other scraper errors
        
        Example:
            >>> jobs = await scraper.search(
            ...     keywords="data scientist",
            ...     location="New York",
            ...     min_salary=120000
            ... )
            >>> for job in jobs[:3]:
            ...     print(f"{job['title']} at {job['company']}")
        """
        pass
```

### README Update

Add your scraper to the main README.md:

```markdown
## Supported Job Boards

| Source | Type | Auth Required | Rate Limit | Status |
|--------|------|---------------|------------|--------|
| JobsWithGPT | API | No | None | ✅ Active |
| Reed | API | Yes (API key) | 5000/day | ✅ Active |
| **YourAPI** | **API** | **Yes (API key)** | **1000/day** | ✅ **Active** |

### YourAPI Setup

1. Sign up at https://yourapi.com/signup
2. Get API key from https://yourapi.com/dashboard/api-keys
3. Add to `.env`:
   ```bash
   YOUR_API_KEY=your_key_here
   ```
4. Enable in `config/user_prefs.json`:
   ```json
   {
     "job_sources": {
       "your_api": {
         "enabled": true,
         "api_key": "${YOUR_API_KEY}"
       }
     }
   }
   ```
```

---

## ✅ Integration Checklist

Before submitting your integration:

### Code Quality
- [ ] Follows existing code style (Black formatting, Ruff compliant)
- [ ] All public methods have docstrings with examples
- [ ] Type hints on all function signatures
- [ ] Proper error handling with custom error types
- [ ] Structured logging with context

### Testing
- [ ] Unit tests with mocked responses (≥85% coverage)
- [ ] Tests for error cases (rate limits, auth failures, network errors)
- [ ] Integration test with real API (optional but recommended)
- [ ] All tests passing (`make test`)

### Documentation
- [ ] Docstrings on class and all public methods
- [ ] README.md updated with setup instructions
- [ ] Example added to `examples/your_api_demo.py`
- [ ] API_INTEGRATION_GUIDE.md updated (this file)

### Security
- [ ] No hardcoded API keys or secrets
- [ ] Credentials loaded from environment variables
- [ ] API key validation on initialization
- [ ] Secure default settings

### Reliability
- [ ] Rate limiting implemented per API docs
- [ ] Exponential backoff for retries
- [ ] Respects `robots.txt` (if HTML scraping)
- [ ] Timeout configured (30s default)
- [ ] Circuit breaker pattern for repeated failures

### Performance
- [ ] Async/await for all I/O operations
- [ ] Connection pooling enabled
- [ ] Response caching where appropriate
- [ ] Pagination support for large result sets

### Observability
- [ ] Structured logging with context
- [ ] Metrics collection (jobs scraped, errors, latency)
- [ ] Health check endpoint
- [ ] Error categorization

---

## 🎓 Examples

### Complete Example Integration

See `examples/custom_scraper_example.py` for a complete, documented example integrating a fictional job board.

### Real-World Examples

Study these existing integrations:

1. **JobsWithGPT Scraper** (`sources/jobswithgpt_scraper.py`)
   - MCP protocol integration
   - 500K+ job database access
   - Good example of external service integration

2. **Reed Scraper** (`sources/reed_mcp_scraper.py`)
   - REST API with Basic Auth
   - Rate limiting implementation
   - Pagination handling

3. **Greenhouse Scraper** (`sources/greenhouse_scraper.py`)
   - HTML scraping with Playwright
   - Dynamic content handling
   - Multi-company support

---

## 📞 Getting Help

1. **Read existing scrapers** in `sources/` directory
2. **Check test examples** in `tests/unit/`
3. **Review error handling** in `utils/errors.py`
4. **Ask in GitHub Discussions** with tag `integration-help`
5. **Open an issue** if you find bugs or missing features

---

## 🔄 Maintenance

### Updating Integrations

When APIs change:

1. Update scraper code
2. Update tests
3. Update documentation
4. Add note to CHANGELOG.md
5. Test backwards compatibility
6. Notify users of breaking changes

### Deprecating Integrations

If a job board shuts down or changes drastically:

1. Mark as deprecated in README
2. Add deprecation warning in code
3. Keep code for 2 releases before removal
4. Document migration path

---

**Version History:**
- 1.0.0 (Oct 12, 2025): Initial release

**Maintainers:** @cboyd0319

**License:** MIT
