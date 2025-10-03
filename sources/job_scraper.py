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
    registry.register(GreenhouseScraper())
    registry.register(LeverScraper())
    registry.register(MicrosoftCareersScraper())
    registry.register(SpaceXCareersScraper())
    registry.register(PlaywrightScraper())  # Generic fallback

    logger.info("Registered %s job scrapers", len(registry.scrapers))
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
