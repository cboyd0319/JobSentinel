"""
Unified job scraper interface.
Automatically routes URLs to the best available scraper.
"""

from typing import List, Dict
from .job_scraper_base import JobBoardRegistry
from .greenhouse_scraper import GreenhouseScraper
from .api_based_scrapers import MicrosoftCareersScraper, SpaceXCareersScraper
from .playwright_scraper import PlaywrightScraper
from utils.logging import get_logger

logger = get_logger("sources.job_scraper")

# Global registry instance
_registry = None


def get_job_scraper_registry() -> JobBoardRegistry:
    """Get the global job scraper registry, initializing if needed."""
    global _registry
    if _registry is None:
        _registry = JobBoardRegistry()

        # Register scrapers in order of preference
        # More specific scrapers first, generic ones last
        _registry.register(GreenhouseScraper())
        _registry.register(MicrosoftCareersScraper())
        _registry.register(SpaceXCareersScraper())
        _registry.register(PlaywrightScraper())  # Fallback for everything else

        logger.info(
            f"Initialized job scraper registry with {len(_registry.scrapers)} scrapers")

    return _registry


def scrape_jobs(board_url: str, fetch_descriptions: bool = True) -> List[Dict]:
    """
    Scrape jobs from any supported job board.
    Automatically selects the best scraper for the URL.

    Args:
        board_url: URL of the job board to scrape
        fetch_descriptions: Whether to fetch full job descriptions

    Returns:
        List of normalized job dictionaries
    """
    logger.info(f"Scraping jobs from: {board_url}")

    registry = get_job_scraper_registry()

    # Try to find a specific scraper for this URL
    scraper = registry.get_scraper(board_url)

    if scraper:
        try:
            jobs = scraper.scrape(board_url, fetch_descriptions)
            logger.info(
                f"Successfully scraped {
                    len(jobs)} jobs using {
                    scraper.name}")
            return jobs
        except Exception as e:
            logger.error(f"Scraper {scraper.name} failed for {board_url}: {e}")

            # Fall back to Playwright scraper
            logger.info("Falling back to Playwright scraper")
            playwright_scraper = PlaywrightScraper()
            return playwright_scraper.scrape(board_url, fetch_descriptions)

    else:
        # Use Playwright as default fallback
        logger.info("No specific scraper found, using Playwright fallback")
        playwright_scraper = PlaywrightScraper()
        return playwright_scraper.scrape(board_url, fetch_descriptions)


def list_supported_platforms() -> List[str]:
    """List all supported job board platforms."""
    registry = get_job_scraper_registry()
    return registry.list_supported_platforms()


def add_custom_scraper(scraper):
    """Add a custom scraper to the registry."""
    registry = get_job_scraper_registry()
    registry.register(scraper)
    logger.info(f"Added custom scraper: {scraper.name}")


# Backward compatibility function
def scrape(board_url: str, fetch_descriptions: bool = True) -> List[Dict]:
    """
    Backward compatibility function.
    Maps to the new unified scrape_jobs function.
    """
    return scrape_jobs(board_url, fetch_descriptions)
