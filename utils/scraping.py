import asyncio
import time
from collections import deque
from typing import Optional

import httpx
from playwright.async_api import async_playwright

from utils.logging import get_logger

logger = get_logger("utils.scraping")


class RateLimiter:
    """Limits the rate of requests to a specific domain."""

    def __init__(self, calls: int, period: float):
        self.calls = calls
        self.period = period
        self.timestamps = deque()

    async def __aenter__(self):
        while True:
            now = time.monotonic()
            while self.timestamps and self.timestamps[0] <= now - self.period:
                self.timestamps.popleft()

            if len(self.timestamps) < self.calls:
                self.timestamps.append(now)
                break
            else:
                # Calculate time to wait until the oldest call expires
                wait_time = self.period - (now - self.timestamps[0])
                await asyncio.sleep(wait_time)

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass


class WebScraper:
    """Handles web scraping operations with rate limiting and Playwright support."""

    def __init__(
        self,
        headless: bool = True,
        rate_limit_calls: int = 1,
        rate_limit_period: float = 1.0,
    ):
        self.headless = headless
        self.rate_limiter = RateLimiter(rate_limit_calls, rate_limit_period)
        self.browser = None
        self.context = None
        self.page = None
        self.http_client = httpx.AsyncClient(timeout=30.0)

    async def __aenter__(self):
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=self.headless)
        self.context = await self.browser.new_context()
        self.page = await self.context.new_page()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.page:
            await self.page.close()
        if self.context:
            await self.context.close()
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
        if self.http_client:
            await self.http_client.aclose()

    async def fetch_url(self, url: str) -> httpx.Response:
        """Fetches a URL using httpx with rate limiting."""
        async with self.rate_limiter:
            logger.debug(f"Fetching URL: {url}")
            response = await self.http_client.get(url)
            response.raise_for_status()  # Raise an exception for 4xx/5xx responses
            return response

    async def fetch_with_playwright(self, url: str, wait_for_selector: Optional[str] = None) -> str:
        """Fetches content from a URL using Playwright, handling JavaScript rendering."""
        async with self.rate_limiter:
            logger.debug(f"Fetching URL with Playwright: {url}")
            await self.page.goto(url, wait_until="domcontentloaded")
            if wait_for_selector:
                await self.page.wait_for_selector(wait_for_selector)
            content = await self.page.content()
            return content


web_scraper = WebScraper()  # Global instance for convenience
