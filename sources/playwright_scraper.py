"""
Playwright-based scraper for dynamic content and API discovery.
Handles JavaScript-heavy sites and provides fallback for unknown platforms.
"""

import asyncio
from typing import List, Dict
from playwright.async_api import async_playwright
from .job_scraper_base import JobBoardScraper, APIDiscoveryMixin, GenericJobExtractor, fetch_url
from utils.logging import get_logger

logger = get_logger("sources.playwright_scraper")


class PlaywrightScraper(JobBoardScraper, APIDiscoveryMixin):
    """
    Playwright-based scraper with API discovery and enhanced content extraction.
    """

    def __init__(self):
        super().__init__(
            name="Playwright Dynamic",
            base_domains=[]  # Can handle any domain as fallback
        )

    def can_handle(self, url: str) -> bool:
        """This is a fallback scraper, so it can attempt any URL."""
        return True

    def scrape(self, board_url: str,
               fetch_descriptions: bool = True) -> List[Dict]:
        """
        Scrape using Playwright with API discovery and enhanced selectors.
        """
        logger.info(f"🎭 Using Playwright scraper for {board_url}")

        # Try API discovery first
        discovered_jobs = asyncio.run(
            self.scrape_with_api_discovery(
                board_url, fetch_descriptions))
        if discovered_jobs:
            return discovered_jobs

        # Fall back to enhanced content extraction
        content_jobs = asyncio.run(
            self.scrape_with_enhanced_selectors(
                board_url, fetch_descriptions))
        if content_jobs:
            return content_jobs

        # Final fallback to basic content extraction
        logger.warning(f"All Playwright methods failed for {board_url}")
        return []

    async def scrape_with_api_discovery(
            self, board_url: str, fetch_descriptions: bool = True) -> List[Dict]:
        """Scrape using API discovery."""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            try:
                # Start API discovery
                discovered_apis = await self.discover_job_apis(page, board_url)

                # Navigate to trigger API calls
                await page.goto(board_url, timeout=15000)
                await asyncio.sleep(3)

                await browser.close()

                # Test discovered APIs
                working_apis = []
                for api_info in discovered_apis:
                    try:
                        data = fetch_url(api_info['url'])
                        if data and self.contains_job_data(data):
                            working_apis.append({
                                'url': api_info['url'],
                                'data': data
                            })
                            logger.info(
                                f"✅ Working API found: {api_info['url']}")
                    except Exception as e:
                        logger.debug(
                            f"API test failed for {api_info['url']}: {e}")

                if working_apis:
                    return self._extract_from_discovered_apis(
                        working_apis, board_url)

            except Exception as e:
                logger.debug(f"API discovery failed: {e}")
                await browser.close()

            return []

    async def scrape_with_enhanced_selectors(
            self, board_url: str, fetch_descriptions: bool = True) -> List[Dict]:
        """Scrape using enhanced content selectors."""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            try:
                logger.info(f"🎯 Enhanced content extraction for {board_url}")

                await page.goto(board_url, wait_until='networkidle')
                await page.wait_for_timeout(3000)

                company_name = self.extract_company_name(board_url)
                jobs = []

                # Site-specific selector strategies
                if "spectrum.com" in board_url:
                    jobs = await self._extract_spectrum_jobs(page, company_name)
                elif "google.com" in board_url:
                    jobs = await self._extract_google_jobs(page, company_name)
                else:
                    jobs = await self._extract_generic_jobs(page, company_name, board_url)

                await browser.close()

                if jobs:
                    logger.info(
                        f"✅ Enhanced extraction found {len(jobs)} jobs")
                    return jobs

            except Exception as e:
                logger.warning(f"Enhanced content extraction failed: {e}")
                await browser.close()

            return []

    def _extract_from_discovered_apis(
            self, working_apis: List[Dict], board_url: str) -> List[Dict]:
        """Extract job data from discovered working APIs."""
        all_jobs = []

        for api_info in working_apis:
            try:
                data = api_info['data']
                company_name = self.extract_company_name(board_url)
                jobs = self._extract_jobs_from_api_response(
                    data, company_name, api_info['url'])
                all_jobs.extend(jobs)
                logger.info(
                    f"Extracted {len(jobs)} jobs from API: {api_info['url']}")
            except Exception as e:
                logger.warning(f"Failed to extract jobs from API: {e}")

        return all_jobs

    def _extract_jobs_from_api_response(
            self, data, company_name: str, api_url: str) -> List[Dict]:
        """Extract job data from various API response formats."""
        jobs = []
        extractor = GenericJobExtractor()

        try:
            # Handle different response formats
            job_list = []

            if isinstance(data, list):
                job_list = data
            elif isinstance(data, dict):
                # Look for job arrays in common structures
                for key, value in data.items():
                    if isinstance(value, list) and len(value) > 0:
                        if any(job_key in str(value[0]).lower() for job_key in [
                               'title', 'job', 'position']):
                            job_list = value
                            break

            # Process job list
            for item in job_list[:50]:  # Limit to 50 jobs
                if isinstance(item, dict):
                    normalized_job = extractor.normalize_job_data(
                        item, company_name, "discovered_api", api_url
                    )
                    jobs.append(normalized_job)

        except Exception as e:
            logger.warning(f"Error extracting jobs from API response: {e}")

        return jobs

    async def _extract_spectrum_jobs(
            self, page, company_name: str) -> List[Dict]:
        """Extract jobs from Spectrum careers using optimized selectors."""
        jobs = []
        extractor = GenericJobExtractor()
        selectors = [
            '[class*="job"]',
            '.search-result',
            '[data-automation-id="searchResultsJobTitle"]',
            '.job-tile',
            '.opportunity'
        ]

        for selector in selectors:
            try:
                elements = await page.query_selector_all(selector)
                if elements:
                    logger.info(
                        f"Spectrum: Found {len(elements)} elements with {selector}")

                    for element in elements[:20]:
                        try:
                            text = await element.text_content()
                            if text and len(text.strip()) > 10:
                                lines = [
                                    line.strip() for line in text.split('\n') if line.strip()]
                                if len(lines) >= 1:
                                    title = lines[0]
                                    location = lines[1] if len(
                                        lines) > 1 else "See Description"

                                    # Skip category headers
                                    if any(word in title.lower() for word in [
                                           'full time', 'part time', 'category']):
                                        continue

                                    raw_job = {
                                        'title': title,
                                        'location': location,
                                        'description': text,
                                    }

                                    normalized_job = extractor.normalize_job_data(
                                        raw_job, company_name, "spectrum_enhanced", "https://jobs.spectrum.com/search-jobs/"
                                    )
                                    jobs.append(normalized_job)

                        except Exception:
                            continue

                    if jobs:
                        break

            except Exception:
                continue

        return jobs

    async def _extract_google_jobs(
            self, page, company_name: str) -> List[Dict]:
        """Extract jobs from Google careers using optimized selectors."""
        jobs = []
        extractor = GenericJobExtractor()
        selectors = [
            '[data-automation-id="jobTitle"]',
            '.job-card',
            '[role="button"]'
        ]

        # Try to wait for job listings
        try:
            await page.wait_for_selector('[data-automation-id="jobTitle"]', timeout=5000)
        except BaseException:
            pass

        for selector in selectors:
            try:
                elements = await page.query_selector_all(selector)
                if elements:
                    logger.info(
                        f"Google: Found {len(elements)} elements with {selector}")

                    for element in elements[:15]:
                        try:
                            text = await element.text_content()
                            if text and len(text.strip()) > 5:
                                title = text.strip()

                                # Skip navigation elements
                                if any(word in title.lower() for word in [
                                       'apply', 'filter', 'sort', 'search', 'sign in']):
                                    continue

                                # Check if it looks like a job title
                                if any(word in title.lower() for word in [
                                       'engineer', 'manager', 'analyst', 'developer', 'specialist']):
                                    raw_job = {
                                        'title': title,
                                        'location': "Colorado, USA",
                                        'description': f"Google career opportunity: {title}",
                                    }

                                    normalized_job = extractor.normalize_job_data(
                                        raw_job, company_name, "google_enhanced", page.url
                                    )
                                    jobs.append(normalized_job)

                        except Exception:
                            continue

                    if jobs:
                        break

            except Exception:
                continue

        return jobs

    async def _extract_generic_jobs(
            self, page, company_name: str, board_url: str) -> List[Dict]:
        """Generic job extraction for unknown sites."""
        jobs = []
        extractor = GenericJobExtractor()
        generic_selectors = [
            '[class*="job"]',
            '[data-*="job"]',
            '.position',
            '.career',
            '.opportunity',
            '[role="listitem"]'
        ]

        for selector in generic_selectors:
            try:
                elements = await page.query_selector_all(selector)
                if elements and len(elements) > 0:
                    for element in elements[:10]:
                        try:
                            text = await element.text_content()
                            if text and len(text.strip()) > 10:
                                title = text.split('\n')[0].strip()
                                if len(title) > 5:
                                    raw_job = {
                                        'title': title,
                                        'location': "See Description",
                                        'description': text,
                                    }

                                    normalized_job = extractor.normalize_job_data(
                                        raw_job, company_name, "generic_enhanced", board_url
                                    )
                                    jobs.append(normalized_job)

                        except Exception:
                            continue

                    if jobs:
                        break

            except Exception:
                continue

        return jobs
