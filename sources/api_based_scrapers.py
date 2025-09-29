"""
API-based job board scrapers.
For sites with discoverable or known APIs (Microsoft, SpaceX, etc.)
"""

from typing import List, Dict
from .job_scraper_base import JobBoardScraper, GenericJobExtractor, fetch_url
from utils.logging import get_logger

logger = get_logger("sources.api_based_scrapers")


class MicrosoftCareersScraper(JobBoardScraper):
    """Scraper for Microsoft careers using their discovered API."""

    def __init__(self):
        super().__init__(
            name="Microsoft Careers",
            base_domains=["jobs.careers.microsoft.com"]
        )

    def scrape(self, board_url: str,
               fetch_descriptions: bool = True) -> List[Dict]:
        """Scrape jobs from Microsoft careers API."""
        logger.info(f"🏢 Using Microsoft API scraper for {board_url}")

        # Microsoft API endpoint discovered through API discovery
        api_base = "https://gcsservices.careers.microsoft.com/search/api/v1/search"

        # Extract location from URL if present
        location_param = ""
        if "Colorado" in board_url:
            location_param = "&lc=Colorado%2C%20United%20States"

        # Build API URL with pagination
        api_url = f"{api_base}?l=en_us&pg=1&pgSz=100{location_param}"

        try:
            data = fetch_url(api_url)
            if data and 'operationResult' in data:
                jobs = self._extract_microsoft_jobs(data, api_url)
                logger.info(f"✅ Microsoft API returned {len(jobs)} jobs")
                return jobs
            else:
                logger.warning("Microsoft API returned unexpected data format")
                return []
        except Exception as e:
            logger.warning(f"Microsoft API scraping failed: {e}")
            return []

    def _extract_microsoft_jobs(self, data: dict, api_url: str) -> List[Dict]:
        """Extract jobs from Microsoft API response."""
        jobs = []
        extractor = GenericJobExtractor()

        try:
            result = data['operationResult']
            if 'result' in result and 'jobs' in result['result']:
                ms_jobs = result['result']['jobs']

                for job in ms_jobs:
                    raw_job = {
                        'title': job.get('title', 'N/A'),
                        'url': f"https://jobs.careers.microsoft.com/job/{job.get('jobId', '')}",
                        'location': job.get('location', 'N/A'),
                        'description': job.get('description', ''),
                        'id': job.get('jobId', ''),
                    }

                    normalized_job = extractor.normalize_job_data(
                        raw_job, "microsoft", "microsoft_api", api_url
                    )

                    jobs.append(normalized_job)

        except Exception as e:
            logger.warning(f"Error extracting Microsoft jobs: {e}")

        return jobs


class SpaceXCareersScraper(JobBoardScraper):
    """Scraper for SpaceX careers using their discovered API."""

    def __init__(self):
        super().__init__(
            name="SpaceX Careers",
            base_domains=["spacex.com"]
        )

    def scrape(self, board_url: str,
               fetch_descriptions: bool = True) -> List[Dict]:
        """Scrape jobs from SpaceX careers API."""
        logger.info(f"🚀 Using SpaceX API scraper for {board_url}")

        # SpaceX API endpoint discovered through API discovery
        api_url = "https://sxcontent9668.azureedge.us/cms-assets/job_posts.json"

        try:
            data = fetch_url(api_url)
            if data and isinstance(data, list):
                jobs = self._extract_spacex_jobs(data, board_url)
                logger.info(f"✅ SpaceX API returned {len(jobs)} jobs")
                return jobs
            else:
                logger.warning("SpaceX API returned unexpected data format")
                return []
        except Exception as e:
            logger.warning(f"SpaceX API scraping failed: {e}")
            return []

    def _extract_spacex_jobs(self, data: list, board_url: str) -> List[Dict]:
        """Extract jobs from SpaceX API response."""
        jobs = []
        extractor = GenericJobExtractor()

        try:
            for job_data in data[:100]:  # Limit for reasonable response time
                if isinstance(job_data, dict):
                    greenhouse_id = job_data.get('greenhouseId', '')
                    job_url = f"https://boards.greenhouse.io/spacex/jobs/{greenhouse_id}" if greenhouse_id else board_url

                    raw_job = {
                        'title': job_data.get('title', 'N/A'),
                        'url': job_url,
                        'location': job_data.get('location', 'N/A'),
                        'description': f"SpaceX {job_data.get('discipline', '')} position",
                        'id': greenhouse_id,
                        'department': job_data.get('discipline', ''),
                        'programs': job_data.get('programs', []),
                    }

                    normalized_job = extractor.normalize_job_data(
                        raw_job, "spacex", "spacex_api", board_url
                    )

                    jobs.append(normalized_job)

        except Exception as e:
            logger.warning(f"Error extracting SpaceX jobs: {e}")

        return jobs


class GenericAPIScraper(JobBoardScraper):
    """
    Generic API scraper that uses discovered APIs.
    Can handle unknown job boards with detectable APIs.
    """

    def __init__(self):
        super().__init__(
            name="Generic API",
            base_domains=[]  # Can handle any domain
        )

    def can_handle(self, url: str) -> bool:
        """This is a fallback scraper, so it can attempt any URL."""
        return True

    def scrape(self, board_url: str,
               fetch_descriptions: bool = True) -> List[Dict]:
        """
        Attempt to scrape using API discovery.
        This is the most generic approach for unknown sites.
        """
        logger.info(f"🔍 Using generic API discovery for {board_url}")

        try:
            # This would use the API discovery framework
            from .playwright_scraper import PlaywrightScraper
            playwright_scraper = PlaywrightScraper()
            return playwright_scraper.scrape_with_api_discovery(
                board_url, fetch_descriptions)

        except Exception as e:
            logger.warning(f"Generic API scraping failed: {e}")
            return []
