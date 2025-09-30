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


import asyncio
from typing import List, Dict

from sources.job_scraper_base import JobBoardRegistry
from sources.api_based_scrapers import APIBasedScraper
from sources.greenhouse_scraper import GreenhouseScraper
from sources.playwright_scraper import PlaywrightScraper
from utils.logging import get_logger

logger = get_logger("sources.job_scraper")

# Initialize registry
registry = JobBoardRegistry()

# Register scrapers
registry.register(APIBasedScraper("API-Based Scraper", [], [])) # Placeholder, actual endpoints passed at runtime
registry.register(GreenhouseScraper())
registry.register(PlaywrightScraper())


async def scrape_jobs(board_url: str, fetch_descriptions: bool = True) -> List[Dict]:
    """Scrape jobs from a given job board URL using the appropriate scraper."""
    scraper = registry.get_scraper(board_url)
    if scraper:
        # If it's an APIBasedScraper, we need to pass the api_endpoints dynamically
        if isinstance(scraper, APIBasedScraper):
            # This is a simplification. In a real scenario, api_endpoints would be configured
            # based on the board_url or a more sophisticated lookup.
            # For now, we'll assume a single API endpoint for demonstration.
            scraper.api_endpoints = [board_url] # Or derive from board_url

        return await scraper.scrape(board_url, fetch_descriptions)
    else:
        logger.warning(f"No specific scraper found for {board_url}. Falling back to generic.")
        # Fallback to a generic scraper if no specific one is found
        # This part might need more sophisticated logic depending on requirements
        return []



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
