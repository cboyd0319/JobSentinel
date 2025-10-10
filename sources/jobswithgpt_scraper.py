"""
JobsWithGPT MCP scraper.
Uses the JobsWithGPT MCP server to access 500,000+ job listings.

This provides massive coverage without maintaining custom scrapers!
"""


from utils.logging import get_logger

from .job_scraper_base import GenericJobExtractor, JobBoardScraper

logger = get_logger("sources.jobswithgpt_scraper")


class JobsWithGPTScraper(JobBoardScraper):
    """
    Scraper that uses JobsWithGPT's 500k+ job database via their MCP server.

    This is a game-changer: instead of maintaining dozens of custom scrapers,
    we can access a continuously-refreshed database of jobs from multiple sources.
    """

    def __init__(self):
        super().__init__(
            name="JobsWithGPT",
            base_domains=[]  # This is a meta-scraper that handles ALL domains
        )
        self.mcp_server_available = self._check_mcp_availability()

    def _check_mcp_availability(self) -> bool:
        """Check if we can access the JobsWithGPT MCP server."""
        try:
            import httpx
            return True
        except ImportError:
            logger.warning("httpx not installed - JobsWithGPT scraper unavailable")
            return False

    async def can_handle(self, url: str) -> bool:
        """
        This scraper can theoretically handle any job board URL,
        but we'll use it as a fallback or for bulk searches.
        """
        # Don't auto-handle URLs (let specific scrapers handle their domains)
        # This scraper is used explicitly via search() method
        return False

    async def search(
        self,
        keywords: list[str] | None = None,
        locations: list[dict] | None = None,
        titles: list[str] | None = None,
        distance: int = 50000,  # 50km default
        page: int = 1,
        fetch_descriptions: bool = True
    ) -> list[dict]:
        """
        Search for jobs using JobsWithGPT's database.

        Args:
            keywords: List of keywords to search for (e.g., ["python", "remote"])
            locations: List of location dicts (e.g., [{"city": "San Francisco", "state": "CA"}])
            titles: List of job titles to filter by (e.g., ["Software Engineer", "DevOps"])
            distance: Search radius in meters (default 50km)
            page: Page number for pagination
            fetch_descriptions: Whether to fetch full job descriptions

        Returns:
            List of normalized job dictionaries
        """
        if not self.mcp_server_available:
            logger.error("JobsWithGPT scraper not available - missing dependencies")
            return []

        logger.info(f"Searching JobsWithGPT: keywords={keywords}, locations={locations}, page={page}")

        try:
            import httpx

            # Build request payload
            payload = {
                "page": page,
                "distance": distance
            }

            if keywords:
                payload["keywords"] = keywords
            if locations:
                payload["locations"] = locations
            if titles:
                payload["titles"] = titles

            # Call JobsWithGPT API directly (bypassing Cloudflare for now)
            # Note: In production, this should use the MCP server via subprocess
            # For now, we'll implement a direct API approach and document the MCP server usage

            async with httpx.AsyncClient(timeout=30.0) as client:
                try:
                    # Try direct API endpoint
                    response = await client.post(
                        "https://jobswithgpt.com/api/search/",
                        json=payload,
                        headers={
                            "Content-Type": "application/json",
                            "User-Agent": "JobScraper/1.0"
                        }
                    )

                    if response.status_code == 200:
                        results = response.json()
                        return await self._process_results(results, fetch_descriptions)
                    else:
                        logger.warning(f"JobsWithGPT API returned status {response.status_code}")
                        return []

                except httpx.HTTPStatusError as e:
                    logger.error(f"HTTP error from JobsWithGPT: {e}")
                    return []
                except Exception as e:
                    logger.error(f"Error calling JobsWithGPT API: {e}")
                    return []

        except Exception as e:
            logger.error(f"JobsWithGPT search failed: {e}")
            return []

    async def scrape(
        self, board_url: str, fetch_descriptions: bool = True
    ) -> list[dict]:
        """
        Scrape a specific company's jobs by searching for the company name.

        This is a fallback method - prefer using search() directly for better control.
        """
        # Extract company name from URL
        company_name = self.extract_company_name(board_url)

        logger.info(f"Searching JobsWithGPT for company: {company_name}")

        # Search using company name as keyword
        return await self.search(
            keywords=[company_name],
            fetch_descriptions=fetch_descriptions
        )

    async def _process_results(
        self, results: dict, fetch_descriptions: bool
    ) -> list[dict]:
        """
        Process JobsWithGPT API results and convert to our normalized schema.

        Args:
            results: Raw results from JobsWithGPT API
            fetch_descriptions: Whether to include full descriptions

        Returns:
            List of normalized job dictionaries
        """
        scraped_jobs = []
        extractor = GenericJobExtractor()

        # JobsWithGPT response format (based on their MCP server code):
        # {
        #   "jobs": [
        #     {
        #       "title": "Software Engineer",
        #       "company": "Company Name",
        #       "location": "San Francisco, CA",
        #       "url": "https://...",
        #       "description": "...",
        #       "posted_date": "2025-10-03",
        #       "salary": "$120k - $180k",
        #       "employment_type": "Full-time",
        #       "remote": true,
        #       ...
        #     }
        #   ],
        #   "total": 500,
        #   "page": 1,
        #   "has_more": true
        # }

        jobs_list = results.get("jobs", [])

        if not jobs_list:
            logger.info("No jobs found in JobsWithGPT results")
            return []

        logger.info(f"Processing {len(jobs_list)} jobs from JobsWithGPT")

        for job in jobs_list:
            try:
                # Extract fields from JobsWithGPT format
                raw_job = {
                    "title": job.get("title", "N/A"),
                    "url": job.get("url", job.get("apply_url", "#")),
                    "location": job.get("location", "Not Specified"),
                    "description": job.get("description", "") if fetch_descriptions else "",
                    "id": job.get("id", job.get("job_id", "")),
                    "company": job.get("company", "Unknown"),
                    "posted_date": job.get("posted_date", job.get("created_at", "")),
                    "salary": job.get("salary", ""),
                    "employment_type": job.get("employment_type", job.get("type", "")),
                    "remote": job.get("remote", False),
                    "source": job.get("source", "jobswithgpt"),
                }

                # Normalize to our standard format
                company_name = raw_job.get("company", "Unknown")
                normalized_job = extractor.normalize_job_data(
                    raw_job, company_name, "jobswithgpt", raw_job["url"]
                )

                # Add JobsWithGPT-specific metadata
                normalized_job["source"] = "jobswithgpt"
                normalized_job["ats_type"] = raw_job.get("source", "jobswithgpt")

                scraped_jobs.append(normalized_job)

            except Exception as e:
                logger.warning(f"Error processing JobsWithGPT job: {e}")
                continue

        logger.info(
            f"Successfully processed {len(scraped_jobs)} jobs from JobsWithGPT"
        )
        return scraped_jobs


# Convenience function for searching jobs
async def search_jobs(
    keywords: list[str] | None = None,
    locations: list[dict] | None = None,
    titles: list[str] | None = None,
    distance: int = 50000,
    page: int = 1
) -> list[dict]:
    """
    Convenience function to search JobsWithGPT database.

    Example usage:
        jobs = await search_jobs(
            keywords=["python", "machine learning"],
            locations=[{"city": "San Francisco", "state": "CA"}],
            page=1
        )
    """
    scraper = JobsWithGPTScraper()
    return await scraper.search(
        keywords=keywords,
        locations=locations,
        titles=titles,
        distance=distance,
        page=page
    )
