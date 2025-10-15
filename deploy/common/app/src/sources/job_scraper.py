"""Unified job scraper interface.

Discovers the best scraper for a given careers URL and delegates the work to it.
"""

from __future__ import annotations

import asyncio

from utils.logging import get_logger

from .api_based_scrapers import (
    APIBasedScraper,
    MicrosoftCareersScraper,
    SpaceXCareersScraper,
)
from .greenhouse_scraper import GreenhouseScraper
from .job_scraper_base import JobBoardRegistry
from .jobspy_mcp_scraper import JobSpyMCPScraper
from .jobswithgpt_scraper import JobsWithGPTScraper
from .lever_scraper import LeverScraper
from .playwright_scraper import PlaywrightScraper
from .reed_mcp_scraper import ReedMCPScraper

logger = get_logger("sources.job_scraper")

_REGISTRY: JobBoardRegistry | None = None


def _ensure_registry() -> JobBoardRegistry:
    """Ensure the global registry is initialised."""
    global _REGISTRY
    if _REGISTRY is not None:
        return _REGISTRY

    registry = JobBoardRegistry()

    # Core / broad scrapers
    registry.register(JobsWithGPTScraper())

    # Reed MCP (if API key present)
    try:
        reed_scraper = ReedMCPScraper()
        if reed_scraper.api_key:
            registry.register(reed_scraper)
            logger.info("[OK] Reed MCP registered (UK jobs available)")
        else:
            logger.debug("Reed MCP not registered (no API key)")
    except Exception as e:
        logger.debug(f"Reed MCP registration skipped: {e}")

    # JobSpy MCP (if server found)
    try:
        jobspy_scraper = JobSpyMCPScraper()
        if jobspy_scraper.mcp_server_path:
            registry.register(jobspy_scraper)
            logger.info("[OK] JobSpy MCP registered (multi-site aggregation available)")
        else:
            logger.debug("JobSpy MCP not registered (server not found)")
    except Exception as e:
        logger.debug(f"JobSpy MCP registration skipped: {e}")

    # ATS-specific scrapers
    registry.register(GreenhouseScraper())
    registry.register(LeverScraper())
    registry.register(MicrosoftCareersScraper())
    registry.register(SpaceXCareersScraper())

    # Fallback
    registry.register(PlaywrightScraper())

    logger.info(
        "Registered %s job scrapers (JobsWithGPT: 500k+, Reed: UK, JobSpy: multi-site)",
        len(registry.scrapers),
    )
    _REGISTRY = registry
    return registry


async def scrape_jobs(board_url: str, fetch_descriptions: bool = True) -> list[dict]:
    """Scrape a careers page, selecting the most appropriate scraper."""
    registry = _ensure_registry()
    scraper = registry.get_scraper(board_url)
    if not scraper:
        logger.warning("No scraper registered for %s", board_url)
        return []
    if isinstance(scraper, APIBasedScraper) and not scraper.api_endpoints:
        scraper.api_endpoints = [board_url]
    return await scraper.scrape(board_url, fetch_descriptions)


def scrape_jobs_sync(board_url: str, fetch_descriptions: bool = True) -> list[dict]:
    """Synchronous helper for scripts that are not async-aware."""
    return asyncio.run(scrape_jobs(board_url, fetch_descriptions))


def list_supported_platforms() -> list[str]:
    """Return all platform identifiers currently registered."""
    return _ensure_registry().list_supported_platforms()


def add_custom_scraper(scraper) -> None:
    """Allow callers to register bespoke scrapers at runtime."""
    registry = _ensure_registry()
    registry.register(scraper)
    logger.info("Registered custom scraper %s", scraper.name)


def scrape(board_url: str, fetch_descriptions: bool = True) -> list[dict]:
    """Backward-compatible shim that keeps the legacy signature working."""
    return asyncio.run(scrape_jobs(board_url, fetch_descriptions))


async def search_jobs_by_keywords(
    keywords: list[str],
    locations: list[dict] = None,
    titles: list[str] = None,
    distance: int = 50000,
    page: int = 1,
) -> list[dict]:
    """Search JobsWithGPT aggregated database (500k+ jobs)."""
    registry = _ensure_registry()
    jobswithgpt_scraper = None
    for scraper in registry.scrapers:
        if isinstance(scraper, JobsWithGPTScraper):
            jobswithgpt_scraper = scraper
            break
    if not jobswithgpt_scraper:
        logger.error("JobsWithGPT scraper not registered!")
        return []
    return await jobswithgpt_scraper.search(
        keywords=keywords, locations=locations, titles=titles, distance=distance, page=page
    )


async def search_reed_jobs(
    keywords: str | None = None, location: str | None = None, **kwargs
) -> list[dict]:
    """Search Reed.co.uk jobs (requires REED_API_KEY)."""
    registry = _ensure_registry()
    reed_scraper = None
    for scraper in registry.scrapers:
        if isinstance(scraper, ReedMCPScraper):
            reed_scraper = scraper
            break
    if not reed_scraper:
        logger.error("Reed MCP scraper not registered! Set REED_API_KEY environment variable.")
        return []
    return await reed_scraper.search(keywords=keywords, location=location, **kwargs)


async def search_multi_site_jobs(
    keywords: list[str],
    location: str | None = None,
    sites: list[str] | None = None,
    results_per_site: int = 50,
    hours_old: int = 72,
) -> list[dict]:
    """Search multiple boards via JobSpy MCP (multi-site aggregator)."""
    registry = _ensure_registry()
    jobspy_scraper = None
    for scraper in registry.scrapers:
        if isinstance(scraper, JobSpyMCPScraper):
            jobspy_scraper = scraper
            break
    if not jobspy_scraper:
        logger.error(
            "JobSpy MCP scraper not registered! Install from: https://github.com/borgius/jobspy-mcp-server"
        )
        return []
    if sites is None:
        sites = ["indeed", "zip_recruiter", "glassdoor", "google"]
    return await jobspy_scraper.search(
        keywords=keywords,
        location=location,
        site_names=sites,
        results_wanted=results_per_site,
        hours_old=hours_old,
    )
