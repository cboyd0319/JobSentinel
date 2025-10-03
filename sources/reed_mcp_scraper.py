"""
Reed Jobs MCP scraper for UK job market.

Uses official Reed.co.uk API via MCP server.
Low risk - designed for programmatic access.
"""

from __future__ import annotations

import asyncio
import json
import os
from typing import Dict, List, Optional

from utils.logging import get_logger
from sources.job_scraper_base import JobBoardScraper, GenericJobExtractor

logger = get_logger("sources.reed_mcp_scraper")


class ReedMCPScraper(JobBoardScraper):
    """
    Scraper for Reed.co.uk jobs via MCP server.

    🇬🇧 UK-focused job board with official API.
    Risk Level: 🟢 LOW (official API, designed for programmatic access)
    """

    def __init__(self):
        super().__init__(name="Reed MCP", base_domains=["reed.co.uk"])
        self.extractor = GenericJobExtractor()
        self.api_key = self._get_api_key()

    def can_handle(self, url: str) -> bool:
        """Reed MCP is keyword-based, not URL-based."""
        return False  # Not used for URL scraping

    def _get_api_key(self) -> str:
        """Get Reed API key from environment or config."""
        api_key = os.environ.get("REED_API_KEY", "")
        if not api_key:
            logger.warning(
                "REED_API_KEY not set. Get free API key from https://www.reed.co.uk/developers"
            )
        return api_key

    async def scrape(
        self,
        board_url: str,
        fetch_descriptions: bool = True
    ) -> List[Dict]:
        """Not used - use search() instead."""
        logger.warning("Reed MCP doesn't scrape URLs. Use search() instead.")
        return []

    async def search(
        self,
        keywords: Optional[str] = None,
        location: Optional[str] = None,
        distance_miles: int = 10,
        permanent: Optional[bool] = None,
        contract: Optional[bool] = None,
        temp: Optional[bool] = None,
        part_time: Optional[bool] = None,
        full_time: Optional[bool] = None,
        minimum_salary: Optional[int] = None,
        maximum_salary: Optional[int] = None,
        results_to_take: int = 100
    ) -> List[Dict]:
        """
        Search Reed.co.uk jobs via MCP server.

        Args:
            keywords: Job search keywords (e.g., "python developer")
            location: Location name (e.g., "London")
            distance_miles: Search radius in miles (default: 10)
            permanent: Filter permanent roles
            contract: Filter contract roles
            temp: Filter temporary roles
            part_time: Filter part-time roles
            full_time: Filter full-time roles
            minimum_salary: Minimum salary in GBP (annual)
            maximum_salary: Maximum salary in GBP (annual)
            results_to_take: Max results (default: 100, max: 100 per request)

        Returns:
            List of normalized job dictionaries

        Note: Requires REED_API_KEY environment variable.
        Get free API key from https://www.reed.co.uk/developers
        """
        if not self.api_key:
            logger.error("REED_API_KEY not set. Cannot search Reed jobs.")
            return []

        logger.info(f"Searching Reed.co.uk for: {keywords or 'all jobs'}")

        try:
            # Import httpx here to avoid dependency if not using Reed
            import httpx

            # Build request parameters
            params = {
                "resultsToTake": min(results_to_take, 100)  # API limit
            }

            if keywords:
                params["keywords"] = keywords
            if location:
                params["locationName"] = location
                params["distancefromlocation"] = distance_miles
            if permanent is not None:
                params["permanent"] = str(permanent).lower()
            if contract is not None:
                params["contract"] = str(contract).lower()
            if temp is not None:
                params["temp"] = str(temp).lower()
            if part_time is not None:
                params["partTime"] = str(part_time).lower()
            if full_time is not None:
                params["fullTime"] = str(full_time).lower()
            if minimum_salary is not None:
                params["minimumSalary"] = minimum_salary
            if maximum_salary is not None:
                params["maximumSalary"] = maximum_salary

            # Call Reed API directly (MCP server would wrap this)
            # Using basic auth with API key as username
            auth = httpx.BasicAuth(self.api_key, "")

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    "https://www.reed.co.uk/api/1.0/search",
                    params=params,
                    auth=auth,
                    headers={"User-Agent": "Job-Scraper/1.0"}
                )

                if response.status_code != 200:
                    logger.error(
                        f"Reed API error: {response.status_code} - {response.text}"
                    )
                    return []

                data = response.json()
                jobs_data = data.get("results", [])

                logger.info(
                    f"Found {len(jobs_data)} jobs from Reed.co.uk "
                    f"(total available: {data.get('totalResults', 0)})"
                )

                return await self._process_results(jobs_data)

        except Exception as e:
            logger.error(f"Reed API search failed: {e}")
            return []

    async def get_job_details(self, job_id: str) -> Optional[Dict]:
        """
        Get detailed job information by ID.

        Args:
            job_id: Reed job ID

        Returns:
            Detailed job dictionary or None
        """
        if not self.api_key:
            logger.error("REED_API_KEY not set. Cannot get job details.")
            return None

        try:
            import httpx

            auth = httpx.BasicAuth(self.api_key, "")

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    f"https://www.reed.co.uk/api/1.0/jobs/{job_id}",
                    auth=auth,
                    headers={"User-Agent": "Job-Scraper/1.0"}
                )

                if response.status_code != 200:
                    logger.error(f"Reed API error for job {job_id}: {response.status_code}")
                    return None

                job_data = response.json()
                processed = await self._process_results([job_data])
                return processed[0] if processed else None

        except Exception as e:
            logger.error(f"Failed to get job details for {job_id}: {e}")
            return None

    async def _process_results(self, jobs_data: List[Dict]) -> List[Dict]:
        """Convert Reed API results to normalized schema."""
        normalized_jobs = []

        for job in jobs_data:
            # Reed API returns clean, structured data
            raw_job = {
                "title": job.get("jobTitle", "N/A"),
                "company": job.get("employerName", "Unknown"),
                "location": job.get("locationName", "UK"),
                "url": job.get("jobUrl", "#"),
                "description": job.get("jobDescription", ""),
                "id": str(job.get("jobId", "")),
                "posted_date": job.get("date", ""),
                "salary": self._format_salary(
                    job.get("minimumSalary"),
                    job.get("maximumSalary")
                ),
                "employment_type": self._get_employment_type(job),
                "external_job_id": str(job.get("jobId", "")),
            }

            # Add Reed-specific fields
            if job.get("expirationDate"):
                raw_job["expiration_date"] = job["expirationDate"]

            if job.get("applications"):
                raw_job["application_count"] = job["applications"]

            normalized_job = self.extractor.normalize_job_data(
                raw_job,
                raw_job["company"],
                "reed_mcp",
                raw_job["url"]
            )

            # Add GBP salary info if available
            if job.get("minimumSalary") or job.get("maximumSalary"):
                normalized_job["salary_min"] = job.get("minimumSalary")
                normalized_job["salary_max"] = job.get("maximumSalary")
                normalized_job["salary_currency"] = "GBP"
                normalized_job["salary_frequency"] = "yearly"

            normalized_jobs.append(normalized_job)

        return normalized_jobs

    def _format_salary(self, min_sal: Optional[int], max_sal: Optional[int]) -> str:
        """Format salary range as human-readable string."""
        if not min_sal and not max_sal:
            return ""

        if min_sal and max_sal and min_sal != max_sal:
            return f"£{min_sal:,} - £{max_sal:,}"
        elif max_sal:
            return f"£{max_sal:,}"
        elif min_sal:
            return f"£{min_sal:,}"

        return ""

    def _get_employment_type(self, job: Dict) -> str:
        """Determine employment type from Reed job flags."""
        types = []
        if job.get("contractType"):
            types.append(job["contractType"])

        # Reed uses boolean flags for job types
        if job.get("permanent"):
            types.append("Permanent")
        if job.get("contract"):
            types.append("Contract")
        if job.get("temp"):
            types.append("Temporary")

        # Full-time/Part-time
        if job.get("fullTime"):
            types.append("Full-time")
        elif job.get("partTime"):
            types.append("Part-time")

        return ", ".join(types) if types else "Full-time"


# Convenience function
async def search_reed_jobs(
    keywords: Optional[str] = None,
    location: Optional[str] = None,
    **kwargs
) -> List[Dict]:
    """
    Search Reed.co.uk jobs via API.

    Args:
        keywords: Job search keywords
        location: Location name (UK locations)
        **kwargs: Additional filters (see ReedMCPScraper.search())

    Returns:
        List of normalized job dictionaries

    Example:
        jobs = await search_reed_jobs(
            keywords="python developer",
            location="London",
            minimum_salary=50000,
            full_time=True
        )
    """
    scraper = ReedMCPScraper()
    return await scraper.search(keywords=keywords, location=location, **kwargs)
