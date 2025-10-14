"""
Generic JavaScript-heavy site scraper.
Handles modern job boards that render content via JavaScript (Ashby, Workable, etc.).

Features:
- Automatic JS execution and waiting
- API endpoint discovery
- Multiple extraction strategies
- Comprehensive error handling

Supported platforms:
- Ashby (jobs.ashbyhq.com)
- Workable (*.workable.com)
- Generic JS-rendered job boards
"""

import asyncio
import json
import re
from typing import Any
from urllib.parse import urljoin, urlparse

from playwright.async_api import async_playwright

from utils.logging import get_logger

from .job_scraper_base import (
    APIDiscoveryMixin,
    JobBoardScraper,
    create_job_hash,
    extract_company_from_url,
)

logger = get_logger("sources.generic_js_scraper")


class GenericJSScraper(JobBoardScraper, APIDiscoveryMixin):
    """
    Generic scraper for JavaScript-heavy job boards.
    
    Uses Playwright to execute JavaScript and extract jobs using multiple strategies:
    1. API endpoint discovery (preferred)
    2. DOM extraction after JS execution
    3. JSON embedded in page source
    """

    # Common selectors for job listings across platforms
    JOB_SELECTORS = [
        # Ashby-specific
        'div[data-testid="job-posting"]',
        'div[class*="JobPosting"]',
        'div[class*="job-posting"]',
        # Workable-specific
        'li[data-ui="job"]',
        'div[class*="job-item"]',
        # Generic
        'article[class*="job"]',
        'div[class*="position"]',
        'li[class*="opening"]',
        '[role="article"]',
    ]

    # Patterns for extracting JSON from page source
    JSON_PATTERNS = [
        r'window\.__INITIAL_STATE__\s*=\s*({.+?});',
        r'window\.__APOLLO_STATE__\s*=\s*({.+?});',
        r'window\.DATA\s*=\s*({.+?});',
        r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.+?)</script>',
    ]

    def __init__(self):
        super().__init__(
            name="Generic JS Scraper",
            base_domains=["ashbyhq.com", "workable.com"],
        )

    def can_handle(self, url: str) -> bool:
        """Check if this scraper can handle the given URL."""
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        
        # Explicitly supported platforms
        if any(d in domain for d in self.base_domains):
            return True
        
        # Generic fallback for any HTTPS job board URL
        # This scraper should be tried after platform-specific scrapers
        return "job" in url.lower() or "career" in url.lower()

    async def scrape(self, board_url: str, fetch_descriptions: bool = True) -> list[dict]:
        """
        Scrape jobs using multiple strategies.
        
        Args:
            board_url: URL of the job board to scrape
            fetch_descriptions: Whether to fetch full job descriptions
            
        Returns:
            List of job dictionaries
        """
        logger.info(f"🔧 Using Generic JS scraper for {board_url}")
        
        # Try strategies in order of preference
        strategies = [
            ("API Discovery", self._scrape_via_api_discovery),
            ("DOM Extraction", self._scrape_via_dom),
            ("JSON Extraction", self._scrape_via_json),
        ]
        
        for strategy_name, strategy_func in strategies:
            try:
                logger.debug(f"Trying strategy: {strategy_name}")
                jobs = await strategy_func(board_url, fetch_descriptions)
                
                if jobs:
                    logger.info(
                        f"✅ {strategy_name} succeeded: found {len(jobs)} jobs"
                    )
                    return jobs
                    
                logger.debug(f"{strategy_name} returned no jobs, trying next strategy")
                
            except Exception as e:
                logger.warning(f"{strategy_name} failed: {e}")
                continue
        
        logger.warning(f"All scraping strategies failed for {board_url}")
        return []

    async def _scrape_via_api_discovery(
        self, board_url: str, fetch_descriptions: bool
    ) -> list[dict]:
        """
        Strategy 1: Discover and use API endpoints.
        
        Monitors network traffic to find API calls that return job data.
        """
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            # Track API requests
            api_requests = []
            
            async def handle_response(response):
                """Capture potential job API responses."""
                if response.ok and "json" in response.headers.get("content-type", ""):
                    try:
                        data = await response.json()
                        # Check if response contains job data
                        if self._looks_like_job_data(data):
                            api_requests.append({
                                "url": response.url,
                                "data": data,
                            })
                    except Exception:
                        pass
            
            page.on("response", handle_response)
            
            try:
                # Navigate and wait for content to load
                await page.goto(board_url, timeout=30000, wait_until="networkidle")
                
                # Additional wait for lazy-loaded content
                await asyncio.sleep(2)
                
            finally:
                await browser.close()
            
            # Extract jobs from discovered API responses
            if api_requests:
                return self._extract_from_api_responses(api_requests, board_url)
            
            return []

    async def _scrape_via_dom(
        self, board_url: str, fetch_descriptions: bool
    ) -> list[dict]:
        """
        Strategy 2: Extract jobs from rendered DOM.
        
        Waits for JavaScript to execute, then scrapes the rendered HTML.
        """
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            try:
                await page.goto(board_url, timeout=30000, wait_until="networkidle")
                
                # Try to find job listings using common selectors
                jobs = []
                for selector in self.JOB_SELECTORS:
                    try:
                        elements = await page.query_selector_all(selector)
                        if elements:
                            logger.debug(
                                f"Found {len(elements)} elements with selector: {selector}"
                            )
                            
                            for element in elements[:50]:  # Limit to 50 jobs
                                job_data = await self._extract_job_from_element(
                                    element, board_url
                                )
                                if job_data:
                                    jobs.append(job_data)
                            
                            if jobs:
                                break
                                
                    except Exception as e:
                        logger.debug(f"Selector {selector} failed: {e}")
                        continue
                
                return jobs
                
            finally:
                await browser.close()

    async def _scrape_via_json(
        self, board_url: str, fetch_descriptions: bool
    ) -> list[dict]:
        """
        Strategy 3: Extract JSON data embedded in page source.
        
        Many modern sites embed data in <script> tags for hydration.
        """
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            try:
                await page.goto(board_url, timeout=30000)
                content = await page.content()
                
                # Try to extract JSON from page source
                for pattern in self.JSON_PATTERNS:
                    matches = re.finditer(pattern, content, re.DOTALL)
                    
                    for match in matches:
                        try:
                            json_str = match.group(1)
                            data = json.loads(json_str)
                            
                            if self._looks_like_job_data(data):
                                return self._extract_jobs_from_json(data, board_url)
                                
                        except (json.JSONDecodeError, IndexError):
                            continue
                
                return []
                
            finally:
                await browser.close()

    async def _extract_job_from_element(
        self, element: Any, board_url: str
    ) -> dict | None:
        """
        Extract job data from a DOM element.
        
        Args:
            element: Playwright element handle
            board_url: Base URL for resolving relative links
            
        Returns:
            Job dictionary or None if extraction fails
        """
        try:
            # Extract title
            title_selectors = [
                'h2', 'h3', '[class*="title"]', '[class*="position"]'
            ]
            title = None
            for sel in title_selectors:
                title_el = await element.query_selector(sel)
                if title_el:
                    title = await title_el.inner_text()
                    break
            
            if not title:
                return None
            
            # Extract location
            location_selectors = [
                '[class*="location"]', '[class*="office"]', '[data-location]'
            ]
            location = "Not specified"
            for sel in location_selectors:
                loc_el = await element.query_selector(sel)
                if loc_el:
                    location = await loc_el.inner_text()
                    break
            
            # Extract link
            link_el = await element.query_selector('a[href]')
            url = None
            if link_el:
                url = await link_el.get_attribute('href')
                if url and not url.startswith('http'):
                    url = urljoin(board_url, url)
            
            if not url:
                url = board_url
            
            # Extract company
            company = extract_company_from_url(board_url)
            
            # Extract description (if available)
            description = await element.inner_text()
            
            job = {
                "title": title.strip(),
                "company": company,
                "location": location.strip(),
                "url": url,
                "description": description[:1000],  # Truncate to 1000 chars
                "remote": self._detect_remote(location, description),
                "source": "generic_js",
            }
            
            # Add hash for deduplication
            job["hash"] = create_job_hash(
                job["company"], job["title"], job["description"]
            )
            
            return job
            
        except Exception as e:
            logger.debug(f"Failed to extract job from element: {e}")
            return None

    def _extract_from_api_responses(
        self, api_requests: list[dict], board_url: str
    ) -> list[dict]:
        """Extract jobs from discovered API responses."""
        jobs = []
        
        for request in api_requests:
            try:
                data = request["data"]
                extracted = self._extract_jobs_from_json(data, board_url)
                jobs.extend(extracted)
            except Exception as e:
                logger.debug(f"Failed to extract from API response: {e}")
                continue
        
        return jobs

    def _extract_jobs_from_json(self, data: Any, board_url: str) -> list[dict]:
        """
        Extract jobs from JSON data structure.
        
        Handles various common JSON structures used by job boards.
        """
        jobs = []
        company = extract_company_from_url(board_url)
        
        def extract_recursive(obj: Any, path: str = ""):
            """Recursively search for job-like objects."""
            if isinstance(obj, dict):
                # Check if this dict looks like a job posting
                if self._is_job_object(obj):
                    job = self._normalize_job_object(obj, company, board_url)
                    if job:
                        jobs.append(job)
                
                # Recurse into nested objects
                for key, value in obj.items():
                    extract_recursive(value, f"{path}.{key}")
                    
            elif isinstance(obj, list):
                for item in obj:
                    extract_recursive(item, path)
        
        extract_recursive(data)
        return jobs

    def _is_job_object(self, obj: dict) -> bool:
        """Check if a dictionary represents a job posting."""
        # Must have at least a title field
        title_fields = ["title", "name", "position", "jobTitle", "positionTitle"]
        has_title = any(field in obj for field in title_fields)
        
        if not has_title:
            return False
        
        # Should have location or company
        location_fields = ["location", "office", "city", "locations"]
        company_fields = ["company", "employer", "organization"]
        
        has_location = any(field in obj for field in location_fields)
        has_company = any(field in obj for field in company_fields)
        
        return has_location or has_company

    def _normalize_job_object(
        self, obj: dict, company: str, board_url: str
    ) -> dict | None:
        """Normalize a job object to standard format."""
        try:
            # Extract title
            title = (
                obj.get("title") 
                or obj.get("name")
                or obj.get("position")
                or obj.get("jobTitle")
                or obj.get("positionTitle")
            )
            
            if not title:
                return None
            
            # Extract location
            location = (
                obj.get("location")
                or obj.get("office")
                or obj.get("city")
                or "Not specified"
            )
            
            if isinstance(location, dict):
                location = location.get("name") or str(location)
            
            # Extract URL
            url = obj.get("url") or obj.get("link") or obj.get("applyUrl")
            if url and not url.startswith("http"):
                url = urljoin(board_url, url)
            if not url:
                url = board_url
            
            # Extract description
            description = (
                obj.get("description")
                or obj.get("summary")
                or obj.get("details")
                or ""
            )
            
            job = {
                "title": str(title).strip(),
                "company": company,
                "location": str(location).strip(),
                "url": url,
                "description": str(description)[:1000],
                "remote": self._detect_remote(str(location), str(description)),
                "source": "generic_js",
            }
            
            job["hash"] = create_job_hash(
                job["company"], job["title"], job["description"]
            )
            
            return job
            
        except Exception as e:
            logger.debug(f"Failed to normalize job object: {e}")
            return None

    @staticmethod
    def _looks_like_job_data(data: Any) -> bool:
        """Check if data structure likely contains job information."""
        if not isinstance(data, (dict, list)):
            return False
        
        # Convert to list if dict
        if isinstance(data, dict):
            data = [data]
        
        # Look for job-related keywords in keys
        job_keywords = [
            "job", "position", "posting", "opening", "role", "career", "vacancy"
        ]
        
        def has_job_keywords(obj: Any) -> bool:
            if isinstance(obj, dict):
                keys_str = " ".join(str(k).lower() for k in obj.keys())
                return any(keyword in keys_str for keyword in job_keywords)
            return False
        
        # Check first few items
        for item in data[:5]:
            if has_job_keywords(item):
                return True
            
            # Check nested structures
            if isinstance(item, dict):
                for value in item.values():
                    if isinstance(value, (dict, list)) and has_job_keywords(value):
                        return True
        
        return False

    @staticmethod
    def _detect_remote(location: str, description: str) -> bool:
        """Detect if a job is remote based on location and description."""
        remote_keywords = [
            "remote", "work from home", "wfh", "distributed", "anywhere"
        ]
        
        text = f"{location} {description}".lower()
        return any(keyword in text for keyword in remote_keywords)
