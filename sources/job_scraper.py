"""Unified job scraper interface.

Discovers the best scraper for a given careers URL and delegates the work to it.
"""

from __future__ import annotations

import asyncio
from typing import Dict, List, Optional

from utils.logging import get_logger

from .api_based_scrapers import (
    APIBasedScraper,
    MicrosoftCareersScraper,
    SpaceXCareersScraper,
)
from .greenhouse_scraper import GreenhouseScraper
from .lever_scraper import LeverScraper
from .jobswithgpt_scraper import JobsWithGPTScraper
from .job_scraper_base import JobBoardRegistry
from .playwright_scraper import PlaywrightScraper

logger = get_logger("sources.job_scraper")

_REGISTRY: Optional[JobBoardRegistry] = None


def _ensure_registry() -> JobBoardRegistry:
    """Ensure the global registry is initialised."""
    global _REGISTRY
    if _REGISTRY is not None:
        return _REGISTRY

    registry = JobBoardRegistry()

    # Register JobsWithGPT first - it has 500k+ jobs!
    # Note: It won't auto-handle URLs, but can be used for bulk searches
    registry.register(JobsWithGPTScraper())

    # Register ATS-specific scrapers
    registry.register(GreenhouseScraper())
    registry.register(LeverScraper())
    registry.register(MicrosoftCareersScraper())
    registry.register(SpaceXCareersScraper())

    # Playwright is the final fallback
    registry.register(PlaywrightScraper())

    logger.info("Registered %s job scrapers (including JobsWithGPT with 500k+ jobs!)", len(registry.scrapers))
    _REGISTRY = registry
    return registry


async def scrape_jobs(board_url: str, fetch_descriptions: bool = True) -> List[Dict]:
    """Scrape a careers page, selecting the most appropriate scraper."""
    registry = _ensure_registry()
    scraper = registry.get_scraper(board_url)
    if not scraper:
        logger.warning("No scraper registered for %s", board_url)
        return []

    if isinstance(scraper, APIBasedScraper) and not scraper.api_endpoints:
        # Derive the endpoint from the URL when the scraper has no defaults.
        scraper.api_endpoints = [board_url]

    return await scraper.scrape(board_url, fetch_descriptions)


def scrape_jobs_sync(board_url: str, fetch_descriptions: bool = True) -> List[Dict]:
    """Synchronous helper for scripts that are not async-aware."""
    return asyncio.run(scrape_jobs(board_url, fetch_descriptions))


def list_supported_platforms() -> List[str]:
    """Return all platform identifiers currently registered."""
    return _ensure_registry().list_supported_platforms()


def add_custom_scraper(scraper) -> None:
    """Allow callers to register bespoke scrapers at runtime."""
    registry = _ensure_registry()
    registry.register(scraper)
    logger.info("Registered custom scraper %s", scraper.name)


def scrape(board_url: str, fetch_descriptions: bool = True) -> List[Dict]:
    """Backward-compatible shim that keeps the legacy signature working."""
    return asyncio.run(scrape_jobs(board_url, fetch_descriptions))


async def search_jobs_by_keywords(
    keywords: List[str],
    locations: List[Dict] = None,
    titles: List[str] = None,
    distance: int = 50000,
    page: int = 1
) -> List[Dict]:
    """
    Search for jobs using JobsWithGPT's 500k+ job database.

    This provides much broader coverage than scraping individual company sites!

    Args:
        keywords: Search keywords (e.g., ["python", "machine learning", "remote"])
        locations: Location filters (e.g., [{"city": "San Francisco", "state": "CA"}])
        titles: Job title filters (e.g., ["Software Engineer", "DevOps Engineer"])
        distance: Search radius in meters (default: 50km)
        page: Page number for pagination

    Returns:
        List of normalized job dictionaries

    Example:
        jobs = await search_jobs_by_keywords(
            keywords=["python", "remote"],
            locations=[{"city": "Denver", "state": "CO"}],
            page=1
        )
    """
    registry = _ensure_registry()

    # Get the JobsWithGPT scraper
    jobswithgpt_scraper = None
    for scraper in registry.scrapers:
        if isinstance(scraper, JobsWithGPTScraper):
            jobswithgpt_scraper = scraper
            break

    if not jobswithgpt_scraper:
        logger.error("JobsWithGPT scraper not registered!")
        return []

    return await jobswithgpt_scraper.search(
        keywords=keywords,
        locations=locations,
        titles=titles,
        distance=distance,
        page=page
    )
