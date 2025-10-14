"""
RemoteOK job board scraper.
Scrapes remote job listings from remoteok.com (previously remoteok.io)
"""

from utils.logging import get_logger

from .job_scraper_base import (
    GenericJobExtractor,
    JobBoardScraper,
    create_job_hash,
    fetch_url,
)

logger = get_logger("sources.remoteok_scraper")


class RemoteOKScraper(JobBoardScraper):
    """Scraper for RemoteOK job board."""

    def __init__(self):
        super().__init__(name="RemoteOK", base_domains=["remoteok.com", "remoteok.io"])

    async def scrape(self, board_url: str, fetch_descriptions: bool = True) -> list[dict]:
        """
        Scrape jobs from RemoteOK.

        RemoteOK provides a JSON API endpoint that returns job listings.
        API Documentation: https://remoteok.com/api
        """
        logger.info(f"Starting RemoteOK scrape for {board_url}")

        try:
            # Use the official RemoteOK API
            api_url = "https://remoteok.com/api"

            response = await fetch_url(api_url)
            if not response:
                logger.error(f"Failed to fetch RemoteOK API at {api_url}")
                return []

            # Handle different response formats
            if isinstance(response, dict):
                if "status_code" in response:
                    if response.get("status_code") != 200:
                        logger.error(f"RemoteOK API returned status {response.get('status_code')}")
                        return []
                    # Try to get JSON content
                    jobs_data = response.get("content")
                    if isinstance(jobs_data, str):
                        import json

                        try:
                            jobs_data = json.loads(jobs_data)
                        except json.JSONDecodeError:
                            logger.error("Failed to parse RemoteOK API response")
                            return []
                else:
                    jobs_data = response
            else:
                jobs_data = response

            if not isinstance(jobs_data, list):
                logger.warning(f"Unexpected API response format: {type(jobs_data)}")
                return []

            # Skip the first element (it's metadata about the API)
            if len(jobs_data) > 0 and isinstance(jobs_data[0], dict) and "legal" in jobs_data[0]:
                jobs_data = jobs_data[1:]

            logger.info(f"Found {len(jobs_data)} job listings from RemoteOK API")

            jobs = []
            extractor = GenericJobExtractor()

            for job_data in jobs_data:
                try:
                    # Extract basic fields
                    title = job_data.get("position", "")
                    company = job_data.get("company", "Unknown")
                    location = job_data.get("location", "Remote")
                    description = job_data.get("description", "")
                    job_url = job_data.get("url", "")

                    if not title or not company:
                        continue

                    # Create job hash
                    job_hash = create_job_hash(company, title, description[:250])

                    # Extract skills and salary
                    skills_info = extractor.extract_skills_from_description(description)
                    salary_info = extractor.extract_salary_from_description(description)

                    # Build normalized job data
                    normalized_job = {
                        "hash": job_hash,
                        "title": title,
                        "company": company,
                        "location": location,
                        "url": job_url,
                        "description": description[:5000] if description else "",
                        "job_board": self.name,
                        "source": "remoteok",
                        "seniority_level": extractor.extract_seniority_from_title(title),
                        "remote": True,  # All RemoteOK jobs are remote
                        "external_job_id": str(job_data.get("id", "")),
                        "posted_at": job_data.get("date", ""),
                    }

                    # Add tags if available
                    if "tags" in job_data and job_data["tags"]:
                        normalized_job["tags"] = str(job_data["tags"])

                    # Add skills and salary
                    if skills_info.get("required_skills"):
                        normalized_job["required_skills"] = str(skills_info["required_skills"])
                    if skills_info.get("technologies"):
                        normalized_job["technologies"] = str(skills_info["technologies"])
                    normalized_job.update(salary_info)

                    # Add salary if available in job data
                    if "salary_min" in job_data and job_data["salary_min"]:
                        normalized_job["salary_min"] = int(job_data["salary_min"])
                    if "salary_max" in job_data and job_data["salary_max"]:
                        normalized_job["salary_max"] = int(job_data["salary_max"])

                    jobs.append(normalized_job)

                except Exception as e:
                    logger.warning(f"Error parsing job data: {e}")
                    continue

            logger.info(f"Successfully scraped {len(jobs)} jobs from RemoteOK")
            return jobs

        except Exception as e:
            logger.error(f"RemoteOK scraping failed: {e}")
            return []
