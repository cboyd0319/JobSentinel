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
from .reed_mcp_scraper import ReedMCPScraper
from .jobspy_mcp_scraper import JobSpyMCPScraper
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

    # Register MCP aggregators first (broad coverage)
    # JobsWithGPT: 500k+ jobs, low risk
    registry.register(JobsWithGPTScraper())

    # Reed MCP: UK jobs, official API, low risk
    # Only registers if REED_API_KEY is set
    try:
        reed_scraper = ReedMCPScraper()
        if reed_scraper.api_key:
            registry.register(reed_scraper)
            logger.info("✅ Reed MCP registered (UK jobs available)")
        else:
            logger.debug("Reed MCP not registered (no API key)")
    except Exception as e:
        logger.debug(f"Reed MCP registration skipped: {e}")

    # JobSpy MCP: Multi-site aggregator, medium-high risk
    # Only registers if JobSpy server is found
    try:
        jobspy_scraper = JobSpyMCPScraper()
        if jobspy_scraper.mcp_server_path:
            registry.register(jobspy_scraper)
            logger.info("✅ JobSpy MCP registered (multi-site aggregation available)")
        else:
            logger.debug("JobSpy MCP not registered (server not found)")
    except Exception as e:
        logger.debug(f"JobSpy MCP registration skipped: {e}")

    # Register ATS-specific scrapers
    registry.register(GreenhouseScraper())
    registry.register(LeverScraper())
    registry.register(MicrosoftCareersScraper())
    registry.register(SpaceXCareersScraper())

    # Playwright is the final fallback
    registry.register(PlaywrightScraper())

    logger.info(
        "Registered %s job scrapers (JobsWithGPT: 500k+, Reed: UK, JobSpy: multi-site)",
        len(registry.scrapers)
    )
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


async def search_reed_jobs(
    keywords: Optional[str] = None,
    location: Optional[str] = None,
    **kwargs
) -> List[Dict]:
    """
    Search Reed.co.uk jobs (UK market) via official API.

    Requires REED_API_KEY environment variable.
    Get free API key from https://www.reed.co.uk/developers

    Args:
        keywords: Job search keywords (e.g., "python developer")
        location: UK location name (e.g., "London")
        **kwargs: Additional filters (distance_miles, minimum_salary, etc.)

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
    registry = _ensure_registry()

    # Get the Reed scraper
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
    keywords: List[str],
    location: Optional[str] = None,
    sites: Optional[List[str]] = None,
    results_per_site: int = 50,
    hours_old: int = 72
) -> List[Dict]:
    """
    Search multiple job boards via JobSpy MCP (Indeed, ZipRecruiter, etc.).

    ⚠️ Risk Level: MEDIUM-HIGH
    - Aggregates multiple scrapers (brittle, may break)
    - Some sites may violate ToS
    - Use as supplementary source only

    Requires JobSpy MCP server installed.
    Install from: https://github.com/borgius/jobspy-mcp-server

    Args:
        keywords: Search keywords (e.g., ["python", "devops"])
        location: Location filter (e.g., "Denver, CO")
        sites: Specific sites to search (default: ["indeed", "zip_recruiter", "glassdoor"])
               Note: LinkedIn excluded by default to reduce ToS risk
        results_per_site: Max results per site (default: 50)
        hours_old: Only jobs posted within this timeframe (default: 72)

    Returns:
        List of normalized job dictionaries

    Example:
        jobs = await search_multi_site_jobs(
            keywords=["python", "remote"],
            location="Remote",
            sites=["indeed", "zip_recruiter"],
            results_per_site=25
        )
    """
    registry = _ensure_registry()

    # Get the JobSpy scraper
    jobspy_scraper = None
    for scraper in registry.scrapers:
        if isinstance(scraper, JobSpyMCPScraper):
            jobspy_scraper = scraper
            break

    if not jobspy_scraper:
        logger.error(
            "JobSpy MCP scraper not registered! "
            "Install from: https://github.com/borgius/jobspy-mcp-server"
        )
        return []

    # Default to safer sites (exclude LinkedIn)
    if sites is None:
        sites = ["indeed", "zip_recruiter", "glassdoor", "google"]

    return await jobspy_scraper.search(
        keywords=keywords,
        location=location,
        site_names=sites,
        results_wanted=results_per_site,
        hours_old=hours_old
    )
