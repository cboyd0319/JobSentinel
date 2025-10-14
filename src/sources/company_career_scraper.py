"""
Generic Company Career Pages scraper.
Scrapes job listings from company career pages using pattern detection.
"""

from utils.logging import get_logger

from .job_scraper_base import (
    APIDiscoveryMixin,
    GenericJobExtractor,
    JobBoardScraper,
    create_job_hash,
    fetch_url,
)

logger = get_logger("sources.company_career_scraper")


class CompanyCareerScraper(JobBoardScraper, APIDiscoveryMixin):
    """
    Generic scraper for company career pages.
    Uses pattern detection to identify job listings on any career page.
    """

    def __init__(self):
        super().__init__(
            name="CompanyCareer",
            base_domains=[],  # Can handle any domain
        )

    def can_handle(self, url: str) -> bool:
        """
        This is a fallback scraper that attempts to handle any company career page.
        Returns True if URL looks like a career/jobs page.
        """
        url_lower = url.lower()
        career_keywords = [
            "career",
            "careers",
            "jobs",
            "job",
            "work",
            "opportunities",
            "positions",
            "openings",
            "hiring",
        ]
        return any(keyword in url_lower for keyword in career_keywords)

    async def scrape(self, board_url: str, fetch_descriptions: bool = True) -> list[dict]:
        """
        Scrape jobs from generic company career page.

        Strategy:
        1. Try to detect and use any JSON APIs
        2. Fall back to HTML parsing with pattern detection
        3. Use heuristics to identify job listings
        """
        logger.info(f"Starting Company Career scrape for {board_url}")

        # First, try API discovery
        api_jobs = await self._try_api_discovery(board_url)
        if api_jobs:
            logger.info(f"Found {len(api_jobs)} jobs via API discovery")
            return api_jobs

        # Fall back to HTML parsing
        html_jobs = await self._scrape_html(board_url, fetch_descriptions)
        if html_jobs:
            logger.info(f"Found {len(html_jobs)} jobs via HTML parsing")
            return html_jobs

        logger.warning(f"No jobs found on {board_url}")
        return []

    async def _try_api_discovery(self, board_url: str) -> list[dict]:
        """Try to discover and use JSON APIs."""
        try:
            from playwright.async_api import async_playwright

            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()

                try:
                    # Monitor network requests
                    discovered_apis = await self.discover_job_apis(page, board_url)
                    await page.goto(board_url, timeout=15000)
                    await page.wait_for_timeout(3000)  # Wait for APIs to load

                    await browser.close()

                    # Try discovered APIs
                    for api_info in discovered_apis:
                        try:
                            response = await fetch_url(api_info["url"])
                            if response and self.contains_job_data(response):
                                jobs = self._extract_from_api_response(response, board_url)
                                if jobs:
                                    return jobs
                        except Exception as e:
                            logger.debug(f"Failed to use API {api_info['url']}: {e}")
                            continue

                except Exception as e:
                    logger.debug(f"API discovery failed: {e}")
                    await browser.close()

        except Exception as e:
            logger.debug(f"Playwright API discovery error: {e}")

        return []

    async def _scrape_html(self, board_url: str, fetch_descriptions: bool = True) -> list[dict]:
        """Scrape jobs from HTML using pattern detection."""
        try:
            response = await fetch_url(board_url)
            if not response or response.get("status_code") != 200:
                logger.error(f"Failed to fetch {board_url}")
                return []

            from bs4 import BeautifulSoup

            html_content = response.get("content", "")
            soup = BeautifulSoup(html_content, "html.parser")

            jobs = []

            # Extract company name from URL or page
            company_name = self._extract_company_name(board_url, soup)

            # Try multiple strategies to find job listings
            job_elements = self._find_job_listings(soup)

            logger.info(f"Found {len(job_elements)} potential job elements")

            for job_elem in job_elements:
                try:
                    job_data = self._extract_job_from_element(
                        job_elem, company_name, board_url, fetch_descriptions
                    )
                    if job_data:
                        jobs.append(job_data)
                except Exception as e:
                    logger.debug(f"Error extracting job from element: {e}")
                    continue

            return jobs

        except Exception as e:
            logger.error(f"HTML scraping failed: {e}")
            return []

    def _find_job_listings(self, soup) -> list:
        """Find job listing elements using various heuristics."""
        job_elements = []

        # Common class names for job listings
        job_classes = [
            "job",
            "position",
            "opening",
            "role",
            "career",
            "vacancy",
            "listing",
        ]

        # Try to find job containers
        def make_class_filter(cls_name):
            return lambda x: x and cls_name in str(x).lower()

        for tag in ["div", "li", "article", "section"]:
            for job_class in job_classes:
                # Find elements with class containing job-related keywords
                elements = soup.find_all(tag, class_=make_class_filter(job_class))
                if elements:
                    job_elements.extend(elements)

        # Remove duplicates while preserving order
        seen = set()
        unique_elements = []
        for elem in job_elements:
            elem_id = id(elem)
            if elem_id not in seen:
                seen.add(elem_id)
                unique_elements.append(elem)

        return unique_elements[:50]  # Limit to first 50 to avoid over-processing

    def _extract_job_from_element(
        self, elem, company_name: str, board_url: str, fetch_descriptions: bool
    ) -> dict | None:
        """Extract job data from a single element."""
        # Try to find title
        title_elem = elem.find(
            ["h2", "h3", "h4", "a"], class_=lambda x: x and "title" in str(x).lower()
        )
        if not title_elem:
            # Try any heading or strong link
            title_elem = elem.find(["h2", "h3", "h4", "strong"])
        if not title_elem:
            title_elem = elem.find("a")

        if not title_elem:
            return None

        title = title_elem.get_text(strip=True)
        if not title or len(title) < 3:
            return None

        # Extract location
        location = "See description"
        location_elem = elem.find(
            ["span", "div", "p"], class_=lambda x: x and "location" in str(x).lower()
        )
        if location_elem:
            location = location_elem.get_text(strip=True)

        # Extract URL
        job_url = board_url
        link_elem = elem.find("a", href=True)
        if link_elem:
            href = link_elem.get("href")
            if href.startswith("http"):
                job_url = href
            elif href.startswith("/"):
                from urllib.parse import urljoin

                job_url = urljoin(board_url, href)

        # Extract description
        description = ""
        desc_elem = elem.find(["p", "div"], class_=lambda x: x and "description" in str(x).lower())
        if desc_elem:
            description = desc_elem.get_text(strip=True)

        # Create job hash
        job_hash = create_job_hash(company_name, title, description[:250])

        # Extract additional info
        extractor = GenericJobExtractor()
        skills_info = extractor.extract_skills_from_description(description)
        salary_info = extractor.extract_salary_from_description(description)

        # Check for remote
        remote = "remote" in location.lower() or "remote" in description.lower()

        return {
            "hash": job_hash,
            "title": title,
            "company": company_name,
            "location": location,
            "url": job_url,
            "description": description[:5000] if description else "",
            "job_board": self.name,
            "source": "company_career",
            "seniority_level": extractor.extract_seniority_from_title(title),
            "remote": remote,
            "required_skills": str(skills_info.get("required_skills", [])),
            "technologies": str(skills_info.get("technologies", [])),
            **salary_info,
        }

    def _extract_company_name(self, url: str, soup) -> str:
        """Extract company name from URL or page."""
        from urllib.parse import urlparse

        # Try to get from page title
        title_tag = soup.find("title")
        if title_tag:
            title_text = title_tag.get_text()
            # Remove common suffixes
            for suffix in [" - Careers", " Careers", " Jobs", " | Jobs"]:
                if suffix in title_text:
                    company = title_text.split(suffix)[0].strip()
                    if company:
                        return company

        # Try to get from og:site_name
        og_site = soup.find("meta", property="og:site_name")
        if og_site and og_site.get("content"):
            return og_site["content"]

        # Fall back to domain name
        parsed = urlparse(url)
        domain_parts = parsed.netloc.replace("www.", "").split(".")
        if domain_parts:
            company = domain_parts[0].capitalize()
            return company

        return "Company"

    def _extract_from_api_response(self, response, board_url: str) -> list[dict]:
        """Extract jobs from API response."""
        try:
            # Handle different response formats
            if isinstance(response, dict):
                if "content" in response:
                    import json

                    data = json.loads(response["content"])
                else:
                    data = response
            else:
                data = response

            # Try to find job data in various structures
            jobs_data = None
            if isinstance(data, list):
                jobs_data = data
            elif isinstance(data, dict):
                # Try common keys
                for key in ["jobs", "results", "data", "positions", "openings"]:
                    if key in data:
                        jobs_data = data[key]
                        break

            if not jobs_data:
                return []

            # Normalize jobs
            company_name = self.extract_company_name(board_url)
            jobs = []

            for job_data in jobs_data:
                if not isinstance(job_data, dict):
                    continue

                normalized = GenericJobExtractor.normalize_job_data(
                    job_data, company_name, self.name, board_url
                )
                jobs.append(normalized)

            return jobs

        except Exception as e:
            logger.warning(f"Failed to extract from API response: {e}")
            return []
