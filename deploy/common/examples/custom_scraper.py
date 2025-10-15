#!/usr/bin/env python3
"""
Example: Building a Custom Job Board Scraper

This example demonstrates how to create a custom scraper for a job board
that doesn't have an existing integration.

Features:
- Extends JobScraperBase for consistent interface
- Implements rate limiting and error handling
- Includes retry logic with exponential backoff
- Follows best practices from docs/BEST_PRACTICES.md

Requirements:
- Python 3.13+
- httpx, tenacity

Usage:
    python examples/custom_scraper.py

Author: JobSentinel Contributors
License: MIT
"""

import asyncio
import sys
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential

# Add app/src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "app" / "src"))

# Import base classes and utilities
from sources.job_scraper_base import JobScraperBase
from utils.rate_limiter import RateLimiter
from utils.logging import get_logger
from utils.errors import ScraperError, RateLimitError, NetworkError

logger = get_logger(__name__)


class CustomJobBoardScraper(JobScraperBase):
    """
    Example custom scraper for a fictional job board API.

    This demonstrates the pattern for integrating any job board with:
    - REST API endpoints
    - API key authentication
    - JSON responses
    - Pagination support

    API Documentation: https://api.example-jobs.com/docs
    Rate Limits: 100 requests per hour
    Authentication: Bearer token
    """

    BASE_URL = "https://api.example-jobs.com/v1"

    def __init__(self, api_key: str):
        """
        Initialize the custom scraper.

        Args:
            api_key: API key from https://example-jobs.com/developers

        Raises:
            ValueError: If API key is invalid
        """
        super().__init__(name="custom_job_board")

        if not api_key or len(api_key) < 20:
            raise ValueError("Invalid API key format")

        self.api_key = api_key

        # Configure rate limiter (100 req/hour = ~1.67 req/min)
        # We use 60 requests per hour to stay safe
        self.rate_limiter = RateLimiter(max_requests=60, time_window=3600)  # 1 hour in seconds

        # HTTP client configuration
        self.timeout = httpx.Timeout(30.0, connect=10.0)
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "User-Agent": "JobSentinel/0.5.0 (https://github.com/cboyd0319/JobSentinel)",
            "Accept": "application/json",
        }

    async def search(
        self,
        keywords: str,
        location: Optional[str] = None,
        min_salary: Optional[int] = None,
        remote_only: bool = False,
        max_results: int = 100,
    ) -> List[Dict]:
        """
        Search for jobs matching criteria.

        Args:
            keywords: Job keywords (e.g., "python developer")
            location: Location filter (e.g., "San Francisco, CA")
            min_salary: Minimum annual salary in USD
            remote_only: Filter for remote jobs only
            max_results: Maximum number of jobs to return

        Returns:
            List of standardized job dictionaries

        Raises:
            RateLimitError: If rate limit is exceeded
            NetworkError: If network request fails
            ScraperError: For other scraping errors
        """
        logger.info(
            "Starting job search",
            extra={
                "scraper": self.name,
                "keywords": keywords,
                "location": location,
                "remote_only": remote_only,
            },
        )

        try:
            # Acquire rate limit token before making request
            await self.rate_limiter.acquire(self.BASE_URL)

            # Build query parameters
            params = {"q": keywords, "per_page": min(max_results, 100), "page": 1}  # API limit

            if location:
                params["location"] = location

            if min_salary:
                params["min_salary"] = min_salary

            if remote_only:
                params["remote"] = "true"

            # Make API request with retry logic
            response = await self._fetch_with_retry(
                url=f"{self.BASE_URL}/jobs/search", params=params
            )

            # Parse response
            data = response.json()
            jobs = self._parse_jobs(data.get("jobs", []))

            logger.info(
                "Job search completed",
                extra={
                    "scraper": self.name,
                    "keywords": keywords,
                    "job_count": len(jobs),
                    "duration_ms": response.elapsed.total_seconds() * 1000,
                },
            )

            return jobs

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.warning("Rate limit exceeded", extra={"scraper": self.name})
                raise RateLimitError(f"Rate limit exceeded for {self.name}") from e
            elif e.response.status_code == 401:
                logger.error("Authentication failed", extra={"scraper": self.name})
                raise ScraperError(f"Invalid API key for {self.name}") from e
            else:
                logger.error(f"HTTP error: {e.response.status_code}", extra={"scraper": self.name})
                raise ScraperError(f"HTTP error: {e}") from e

        except httpx.RequestError as e:
            logger.error(f"Network error: {e}", extra={"scraper": self.name})
            raise NetworkError(f"Network error: {e}") from e

        except Exception as e:
            logger.error(f"Unexpected error: {e}", extra={"scraper": self.name}, exc_info=True)
            raise ScraperError(f"Scraping failed: {e}") from e

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=60),
        retry=retry_if_exception_type((httpx.RequestError, httpx.TimeoutException)),
    )
    async def _fetch_with_retry(self, url: str, params: Dict) -> httpx.Response:
        """
        Fetch URL with exponential backoff retry.

        Retry strategy:
        - Attempt 1: Immediate
        - Attempt 2: Wait 4 seconds
        - Attempt 3: Wait 8 seconds
        - Then raise exception

        Args:
            url: URL to fetch
            params: Query parameters

        Returns:
            HTTP response

        Raises:
            httpx.HTTPStatusError: For HTTP errors
            httpx.RequestError: For network errors
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(url, params=params, headers=self.headers)

            # Check for rate limit headers
            if "X-RateLimit-Remaining" in response.headers:
                remaining = int(response.headers["X-RateLimit-Remaining"])
                if remaining < 10:
                    logger.warning(
                        f"Low rate limit: {remaining} requests remaining",
                        extra={"scraper": self.name},
                    )

            response.raise_for_status()
            return response

    def _parse_jobs(self, raw_jobs: List[Dict]) -> List[Dict]:
        """
        Parse API response into standardized format.

        Standardized format matches JobSentinel schema:
        - id: Unique identifier
        - title: Job title
        - company: Company name
        - location: Job location
        - description: Full job description
        - url: Link to job posting
        - salary_min: Minimum salary (optional)
        - salary_max: Maximum salary (optional)
        - date_posted: ISO 8601 date (optional)
        - source: Source identifier
        - raw: Original data for debugging

        Args:
            raw_jobs: Raw job data from API

        Returns:
            List of standardized job dictionaries
        """
        parsed = []

        for job in raw_jobs:
            try:
                # Extract and validate required fields
                job_id = job["id"]
                title = job["title"]
                company = job["company"]["name"]

                # Build standardized job dict
                parsed_job = {
                    "id": f"custom_{job_id}",
                    "title": title,
                    "company": company,
                    "location": job.get("location", {}).get("name"),
                    "description": job.get("description", ""),
                    "url": job.get("url", ""),
                    "source": self.name,
                    "raw": job,  # Keep original for debugging
                }

                # Optional fields
                if "salary" in job:
                    parsed_job["salary_min"] = job["salary"].get("min")
                    parsed_job["salary_max"] = job["salary"].get("max")

                if "posted_at" in job:
                    parsed_job["date_posted"] = job["posted_at"]

                parsed.append(parsed_job)

            except KeyError as e:
                # Log but don't fail entire scrape for one bad job
                logger.warning(
                    f"Missing required field in job: {e}", extra={"scraper": self.name, "job": job}
                )
                continue

            except Exception as e:
                logger.warning(f"Error parsing job: {e}", extra={"scraper": self.name, "job": job})
                continue

        return parsed


async def main():
    """
    Example usage of the custom scraper.
    """
    # Initialize scraper with API key
    # In production, load from environment variable
    api_key = "your_api_key_here"  # Replace with actual key

    try:
        scraper = CustomJobBoardScraper(api_key=api_key)

        # Search for Python jobs in San Francisco
        jobs = await scraper.search(
            keywords="python developer",
            location="San Francisco, CA",
            min_salary=120000,
            remote_only=False,
            max_results=10,
        )

        # Display results
        print(f"\n✓ Found {len(jobs)} jobs\n")

        for i, job in enumerate(jobs[:5], 1):
            print(f"{i}. {job['title']} at {job['company']}")
            print(f"   Location: {job.get('location', 'Not specified')}")
            if job.get("salary_min"):
                print(f"   Salary: ${job['salary_min']:,}+")
            print(f"   URL: {job.get('url', 'N/A')}")
            print()

    except ValueError as e:
        print(f"✗ Configuration error: {e}")
    except RateLimitError as e:
        print(f"✗ Rate limit exceeded: {e}")
    except NetworkError as e:
        print(f"✗ Network error: {e}")
    except ScraperError as e:
        print(f"✗ Scraper error: {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("Custom Job Board Scraper Example")
    print("=" * 60)
    print()

    # Run the example
    asyncio.run(main())
