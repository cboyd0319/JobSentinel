"""
Greenhouse job board scraper.
Handles Greenhouse-powered job boards (like Fivetran, Klaviyo, etc.)
"""

import asyncio
from typing import List, Dict
from .job_scraper_base import JobBoardScraper, GenericJobExtractor, fetch_url, extract_company_from_url, fetch_job_description
from utils.logging import get_logger

logger = get_logger("sources.greenhouse_scraper")


class GreenhouseScraper(JobBoardScraper):
    """Scraper for Greenhouse-powered job boards."""

    def __init__(self):
        super().__init__(
            name="Greenhouse",
            base_domains=["greenhouse.io", "boards.greenhouse.io"]
        )

    async def can_handle(self, url: str) -> bool:
        """Enhanced detection for Greenhouse boards."""
        # Direct Greenhouse domains
        if super().can_handle(url):
            return True

        # Try to detect Greenhouse by API availability
        company_name = self.extract_company_name(url)
        test_url = f"https://api.greenhouse.io/v1/boards/{company_name}/jobs"

        try:
            test_response = await fetch_url(test_url)
            if test_response.status_code == 200:
                test_data = test_response.json()
                if test_data and isinstance(
                        test_data, dict) and "jobs" in test_data:
                    logger.info(f"Detected Greenhouse board for {company_name}")
                    return True
        except Exception:
            pass

        return False

    async def scrape(self, board_url: str,
               fetch_descriptions: bool = True) -> List[Dict]:
        """Scrape jobs from Greenhouse board."""
        logger.info(f"Starting Greenhouse scrape for {board_url}")
        company_name = extract_company_from_url(board_url)

        # Try multiple Greenhouse API endpoints concurrently
        api_urls = [
            f"{board_url}?for=json",
            f"{board_url}/jobs.json",
            f"https://api.greenhouse.io/v1/boards/{company_name}/jobs",
        ]

        jobs_data = None
        responses = await asyncio.gather(*[fetch_url(url) for url in api_urls], return_exceptions=True)

        for i, response in enumerate(responses):
            api_url = api_urls[i]
            if isinstance(response, Exception):
                logger.debug(f"Greenhouse API failed for {api_url}: {response}")
                continue

            try:
                if response.status_code == 200:
                    data = response.json()
                    # Check if we got HTML content instead of JSON
                    if isinstance(data, dict) and "content" in data and "<html" in str(
                            data.get("content", "")):
                        logger.debug(
                            f"Got HTML content from {api_url}, skipping")
                        continue

                    # Handle both direct JSON response and wrapped response
                    if isinstance(data, dict) and "jobs" in data:
                        jobs_data = data["jobs"]
                    elif isinstance(data, list):
                        jobs_data = data
                    else:
                        jobs_data = [data] if isinstance(data, dict) else None

                    if jobs_data and len(jobs_data) > 0:
                        logger.info(f"✅ Greenhouse API succeeded: {api_url}")
                        break

            except Exception as e:
                logger.debug(f"Error processing response from {api_url}: {e}")
                continue

        # Try individual job API if URL looks like specific job
        if not jobs_data and "job" in board_url.lower():
            import re
            job_id_match = re.search(
                r'(?:gh_jid=|job/|jobs/)([0-9]+)', board_url)
            if job_id_match:
                job_id = job_id_match.group(1)
                logger.info(f"🔄 Trying individual job API for job {job_id}")
                individual_job = await self._try_individual_job_api(
                    job_id, company_name)
                if individual_job:
                    jobs_data = [individual_job]
                    logger.info(f"✅ Individual job API succeeded for {job_id}")

        if not jobs_data:
            logger.warning(
                f"All Greenhouse API methods failed for {board_url}")
            return []

        logger.info(f"Found {len(jobs_data)} jobs for {company_name}")

        # Process the jobs data
        scraped_jobs = []
        extractor = GenericJobExtractor()

        for job in jobs_data:
            try:
                # Extract enhanced Greenhouse fields
                enhanced_fields = self._extract_greenhouse_fields(job)

                # Get job description if requested
                job_description = job.get("content", "")
                if fetch_descriptions and job.get("absolute_url"):
                    try:
                        full_description = await fetch_job_description(
                                job["absolute_url"], ".content")
                        if full_description:
                            job_description = full_description
                    except Exception as e:
                        logger.warning(
                            f"Failed to fetch description for {job.get('title')}: {e}")

                # Create raw job data for normalization
                raw_job = {
                    'title': job.get("title", "N/A"),
                    'url': job.get("absolute_url", "#"),
                    'location': job.get("location", {}).get("name", "N/A"),
                    'description': job_description,
                    'id': job.get("id", ""),
                    'requisition_id': job.get("requisition_id", ""),
                }

                # Add Greenhouse-specific fields
                raw_job.update(enhanced_fields)

                # Normalize to standard format
                normalized_job = extractor.normalize_job_data(
                    raw_job, company_name, "greenhouse", board_url
                )

                scraped_jobs.append(normalized_job)

            except Exception as e:
                logger.warning(f"Error processing Greenhouse job: {e}")
                continue

        logger.info(
            f"Successfully scraped {len(scraped_jobs)} jobs from {company_name}")
        return scraped_jobs

    async def _try_individual_job_api(self, job_id: str, company: str) -> dict:
        """Try to fetch individual job data from Greenhouse API."""
        try:
            api_urls = [
                f"https://api.greenhouse.io/v1/boards/{company}/jobs/{job_id}",
                f"https://boards-api.greenhouse.io/v1/boards/{company}/jobs/{job_id}",
            ]

            responses = await asyncio.gather(*[fetch_url(url) for url in api_urls], return_exceptions=True)

            for response in responses:
                if isinstance(response, Exception):
                    continue
                try:
                    if response.status_code == 200:
                        job_data = response.json()
                        if job_data:
                            return job_data
                except Exception:
                    continue

            return None
        except Exception as e:
            logger.debug(f"Individual job API failed for {job_id}: {e}")
            return None
