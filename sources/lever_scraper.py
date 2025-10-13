"""
Lever job board scraper.
Handles Lever-powered job boards using the official Postings API.
API Documentation: https://github.com/lever/postings-api
"""

from utils.logging import get_logger

from .job_scraper_base import (
    GenericJobExtractor,
    JobBoardScraper,
    extract_company_from_url,
    fetch_url,
)

logger = get_logger("sources.lever_scraper")


class LeverScraper(JobBoardScraper):
    """Scraper for Lever-powered job boards using official API."""

    def __init__(self):
        super().__init__(name="Lever", base_domains=["lever.co", "jobs.lever.co"])

    async def can_handle(self, url: str) -> bool:
        """Enhanced detection for Lever boards."""
        # Direct Lever domains
        if super().can_handle(url):
            return True

        # Try to detect Lever by API availability
        company_name = self.extract_company_name(url)
        test_url = f"https://api.lever.co/v0/postings/{company_name}"

        try:
            test_response = await fetch_url(test_url)
            if test_response.status_code == 200:
                test_data = test_response.json()
                if test_data and isinstance(test_data, list):
                    logger.info(f"Detected Lever board for {company_name}")
                    return True
        except Exception as e:
            logger.debug(f"Failed to detect Lever board for {company_name}: {e}")

        return False

    def extract_company_name(self, url: str) -> str:
        """Extract company name from Lever URL."""
        # Handle different Lever URL formats:
        # https://jobs.lever.co/stripe
        # https://stripe.lever.co/
        # https://api.lever.co/v0/postings/stripe

        if "jobs.lever.co" in url:
            # Format: https://jobs.lever.co/company-name
            parts = url.split("jobs.lever.co/")
            if len(parts) > 1:
                company = parts[1].split("/")[0].split("?")[0]
                return company.strip()

        if ".lever.co" in url and "jobs.lever.co" not in url and "api.lever.co" not in url:
            # Format: https://company-name.lever.co/
            parts = url.split("://")
            if len(parts) > 1:
                subdomain = parts[1].split(".lever.co")[0]
                return subdomain.strip()

        # Fallback to generic extraction
        return extract_company_from_url(url)

    async def scrape(self, board_url: str, fetch_descriptions: bool = True) -> list[dict]:
        """
        Scrape jobs from Lever board using official Postings API.

        API Endpoint: https://api.lever.co/v0/postings/{company_name}
        No authentication required for public postings.
        """
        logger.info(f"Starting Lever scrape for {board_url}")
        company_name = self.extract_company_name(board_url)

        # Build API URL with parameters
        api_base = f"https://api.lever.co/v0/postings/{company_name}"

        # API supports filtering by location, commitment, team, department
        # For now, fetch all jobs (can add filters later based on user prefs)
        # Note: Lever API returns JSON by default, no "mode" parameter needed
        params = {"limit": 100, "skip": 0}  # Max results per page  # Pagination offset

        all_jobs_data = []

        # Paginate through all jobs
        while True:
            try:
                # Build URL with current pagination
                param_str = "&".join([f"{k}={v}" for k, v in params.items()])
                api_url = f"{api_base}?{param_str}"

                logger.debug(f"Fetching Lever API: {api_url}")
                response = await fetch_url(api_url)

                if response.status_code != 200:
                    if params["skip"] == 0:
                        # First request failed
                        logger.warning(
                            f"Lever API failed for {company_name}: Status {response.status_code}"
                        )
                        return []
                    else:
                        # Pagination exhausted
                        break

                jobs_batch = response.json()

                if not jobs_batch or not isinstance(jobs_batch, list):
                    # No more jobs
                    break

                all_jobs_data.extend(jobs_batch)

                # Check if we got a full page (if less, we're done)
                if len(jobs_batch) < params["limit"]:
                    break

                # Move to next page
                params["skip"] += params["limit"]

                # Safety limit to avoid infinite loops
                if params["skip"] >= 1000:
                    logger.warning(f"Lever pagination limit reached for {company_name}")
                    break

            except Exception as e:
                logger.warning(f"Error fetching Lever jobs (offset {params['skip']}): {e}")
                break

        if not all_jobs_data:
            logger.warning(f"No jobs found for {company_name} via Lever API")
            return []

        logger.info(f"Found {len(all_jobs_data)} jobs for {company_name}")

        # Process the jobs data
        scraped_jobs = []
        extractor = GenericJobExtractor()

        for job in all_jobs_data:
            try:
                # Extract Lever-specific fields
                enhanced_fields = self._extract_lever_fields(job)

                # Create raw job data for normalization
                raw_job = {
                    "title": job.get("text", "N/A"),  # Lever uses "text" for job title
                    "url": job.get("hostedUrl", job.get("applyUrl", "#")),
                    "location": self._extract_location(job),
                    "description": job.get("description", "")
                    + "\n"
                    + job.get("descriptionPlain", ""),
                    "id": job.get("id", ""),
                }

                # Add Lever-specific enhanced fields
                raw_job.update(enhanced_fields)

                # Normalize to standard format
                normalized_job = extractor.normalize_job_data(
                    raw_job, company_name, "lever", board_url
                )

                scraped_jobs.append(normalized_job)

            except Exception as e:
                logger.warning(f"Error processing Lever job: {e}")
                continue

        logger.info(f"Successfully scraped {len(scraped_jobs)} jobs from {company_name}")
        return scraped_jobs

    def _extract_location(self, job: dict) -> str:
        """Extract location from Lever job data."""
        # Lever stores location in categories
        categories = job.get("categories", {})

        if isinstance(categories, dict):
            location = categories.get("location", "")
            if location:
                return location

        # Fallback to commitment or team if available
        commitment = categories.get("commitment", "")
        if "remote" in commitment.lower():
            return "Remote"

        return "Not Specified"

    def _extract_lever_fields(self, job: dict) -> dict:
        """Extract Lever-specific enhanced fields."""
        categories = job.get("categories", {})

        enhanced = {
            "ats_type": "lever",
            "posted_date": job.get("createdAt", ""),  # ISO 8601 timestamp
            "apply_url": job.get("applyUrl", ""),
            "hosted_url": job.get("hostedUrl", ""),
        }

        # Extract categories (team, department, commitment, location)
        if isinstance(categories, dict):
            enhanced["department"] = categories.get("department", "")
            enhanced["team"] = categories.get("team", "")
            enhanced["commitment"] = categories.get("commitment", "")  # Full-time, Part-time, etc.
            enhanced["location_category"] = categories.get("location", "")

        # Extract additional fields if present
        if "additional" in job:
            additional = job.get("additional", "")
            enhanced["additional_info"] = additional

        # Extract lists (workplaceType, tags)
        if "lists" in job:
            lists = job.get("lists", [])
            for list_item in lists:
                if isinstance(list_item, dict):
                    list_text = list_item.get("text", "")
                    content = list_item.get("content", "")

                    # Detect workplace type
                    if "remote" in list_text.lower() or "remote" in content.lower():
                        enhanced["remote_status"] = "Remote"
                    elif "hybrid" in list_text.lower() or "hybrid" in content.lower():
                        enhanced["remote_status"] = "Hybrid"
                    elif "on-site" in list_text.lower() or "office" in list_text.lower():
                        enhanced["remote_status"] = "On-site"

        return enhanced
