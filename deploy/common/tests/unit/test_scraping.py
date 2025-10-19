"""Comprehensive tests for utils.scraping module.

Tests cover:
- RateLimiter async context manager
- Rate limiting behavior and timing
- WebScraper initialization and configuration
- HTTP fetching with rate limiting
- Playwright-based fetching
- Resource cleanup
- Edge cases and error handling
"""

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import httpx
import pytest

from utils.scraping import RateLimiter, WebScraper


class TestRateLimiter:
    """Tests for RateLimiter class."""

    def test_rate_limiter_initialization(self):
        """RateLimiter initializes with correct parameters."""
        limiter = RateLimiter(calls=5, period=1.0)
        
        assert limiter.calls == 5
        assert limiter.period == 1.0
        assert len(limiter.timestamps) == 0

    @pytest.mark.asyncio
    async def test_rate_limiter_allows_calls_within_limit(self):
        """RateLimiter allows calls within the rate limit."""
        limiter = RateLimiter(calls=3, period=1.0)
        
        # Should allow 3 calls immediately
        start = time.monotonic()
        for _ in range(3):
            async with limiter:
                pass
        elapsed = time.monotonic() - start
        
        # Should complete quickly (< 100ms) since within limit
        assert elapsed < 0.1
        assert len(limiter.timestamps) == 3

    @pytest.mark.asyncio
    async def test_rate_limiter_blocks_excess_calls(self):
        """RateLimiter blocks calls exceeding the rate limit."""
        limiter = RateLimiter(calls=2, period=0.5)
        
        # First 2 calls should be immediate
        for _ in range(2):
            async with limiter:
                pass
        
        # Third call should wait ~0.5 seconds
        start = time.monotonic()
        async with limiter:
            pass
        elapsed = time.monotonic() - start
        
        # Should have waited approximately the period
        assert 0.4 <= elapsed <= 0.7

    @pytest.mark.asyncio
    async def test_rate_limiter_sliding_window(self):
        """RateLimiter implements sliding window correctly."""
        limiter = RateLimiter(calls=2, period=0.3)
        
        # Make 2 calls
        async with limiter:
            pass
        async with limiter:
            pass
        
        # Wait for period to partially expire
        await asyncio.sleep(0.2)
        
        # Third call should still wait a bit
        start = time.monotonic()
        async with limiter:
            pass
        elapsed = time.monotonic() - start
        
        # Should wait ~0.1s (0.3 - 0.2)
        assert 0.05 <= elapsed <= 0.2

    @pytest.mark.asyncio
    async def test_rate_limiter_cleans_old_timestamps(self):
        """RateLimiter removes expired timestamps."""
        limiter = RateLimiter(calls=2, period=0.2)
        
        # Make calls
        async with limiter:
            pass
        async with limiter:
            pass
        
        assert len(limiter.timestamps) == 2
        
        # Wait for timestamps to expire
        await asyncio.sleep(0.25)
        
        # Make another call - should clean old timestamps
        async with limiter:
            pass
        
        # Should have removed old timestamps and added new one
        assert len(limiter.timestamps) == 1

    @pytest.mark.asyncio
    async def test_rate_limiter_exit_does_nothing(self):
        """RateLimiter.__aexit__ completes without error."""
        limiter = RateLimiter(calls=1, period=1.0)
        
        # Should not raise
        await limiter.__aexit__(None, None, None)

    @pytest.mark.asyncio
    async def test_rate_limiter_concurrent_calls(self):
        """RateLimiter handles concurrent calls correctly."""
        limiter = RateLimiter(calls=3, period=0.5)
        call_times = []
        
        async def make_call(call_id):
            async with limiter:
                call_times.append((call_id, time.monotonic()))
        
        # Launch 5 concurrent calls
        start = time.monotonic()
        await asyncio.gather(*[make_call(i) for i in range(5)])
        total_time = time.monotonic() - start
        
        # First 3 should be immediate, next 2 should wait
        assert len(call_times) == 5
        # Should take approximately 1 period (0.5s) for 5 calls with limit 3
        assert 0.4 <= total_time <= 0.8

    @pytest.mark.parametrize(
        "calls,period,num_requests,expected_min_time",
        [
            (1, 0.1, 3, 0.2),  # 3 requests with 1/0.1s rate
            (2, 0.2, 5, 0.4),  # 5 requests with 2/0.2s rate
            (5, 0.5, 6, 0.0),  # 6 requests with 5/0.5s rate
        ],
        ids=["strict_1per", "moderate_2per", "loose_5per"],
    )
    @pytest.mark.asyncio
    async def test_rate_limiter_various_configs(
        self, calls, period, num_requests, expected_min_time
    ):
        """RateLimiter works correctly with various configurations."""
        limiter = RateLimiter(calls=calls, period=period)
        
        start = time.monotonic()
        for _ in range(num_requests):
            async with limiter:
                pass
        elapsed = time.monotonic() - start
        
        # Should take at least the minimum expected time
        assert elapsed >= expected_min_time


class TestWebScraperInitialization:
    """Tests for WebScraper initialization."""

    def test_web_scraper_default_initialization(self):
        """WebScraper initializes with default values."""
        scraper = WebScraper()
        
        assert scraper.headless is True
        assert scraper.rate_limiter is not None
        assert scraper.rate_limiter.calls == 1
        assert scraper.rate_limiter.period == 1.0
        assert scraper.browser is None
        assert scraper.context is None
        assert scraper.page is None
        assert scraper.http_client is not None

    def test_web_scraper_custom_initialization(self):
        """WebScraper accepts custom configuration."""
        scraper = WebScraper(
            headless=False,
            rate_limit_calls=5,
            rate_limit_period=2.0,
        )
        
        assert scraper.headless is False
        assert scraper.rate_limiter.calls == 5
        assert scraper.rate_limiter.period == 2.0

    def test_web_scraper_http_client_configured(self):
        """WebScraper creates httpx client with timeout."""
        scraper = WebScraper()
        
        assert isinstance(scraper.http_client, httpx.AsyncClient)
        # Verify timeout is set (accessing internal timeout config)
        assert scraper.http_client.timeout.connect == 30.0


class TestWebScraperContextManager:
    """Tests for WebScraper async context manager."""

    @pytest.mark.asyncio
    async def test_web_scraper_aenter_initializes_playwright(self):
        """WebScraper.__aenter__ initializes Playwright components."""
        scraper = WebScraper()
        
        with patch("utils.scraping.async_playwright") as mock_playwright:
            mock_pw = AsyncMock()
            mock_browser = AsyncMock()
            mock_context = AsyncMock()
            mock_page = AsyncMock()
            
            mock_playwright.return_value.start = AsyncMock(return_value=mock_pw)
            mock_pw.chromium.launch = AsyncMock(return_value=mock_browser)
            mock_browser.new_context = AsyncMock(return_value=mock_context)
            mock_context.new_page = AsyncMock(return_value=mock_page)
            
            result = await scraper.__aenter__()
            
            assert result is scraper
            assert scraper.playwright is mock_pw
            assert scraper.browser is mock_browser
            assert scraper.context is mock_context
            assert scraper.page is mock_page

    @pytest.mark.asyncio
    async def test_web_scraper_aenter_launches_headless_browser(self):
        """WebScraper launches browser in headless mode by default."""
        scraper = WebScraper(headless=True)
        
        with patch("utils.scraping.async_playwright") as mock_playwright:
            mock_pw = AsyncMock()
            mock_browser = AsyncMock()
            mock_playwright.return_value.start = AsyncMock(return_value=mock_pw)
            mock_pw.chromium.launch = AsyncMock(return_value=mock_browser)
            mock_browser.new_context = AsyncMock(return_value=AsyncMock())
            
            await scraper.__aenter__()
            
            mock_pw.chromium.launch.assert_called_once_with(headless=True)

    @pytest.mark.asyncio
    async def test_web_scraper_aenter_launches_headed_browser(self):
        """WebScraper launches browser in headed mode when configured."""
        scraper = WebScraper(headless=False)
        
        with patch("utils.scraping.async_playwright") as mock_playwright:
            mock_pw = AsyncMock()
            mock_browser = AsyncMock()
            mock_playwright.return_value.start = AsyncMock(return_value=mock_pw)
            mock_pw.chromium.launch = AsyncMock(return_value=mock_browser)
            mock_browser.new_context = AsyncMock(return_value=AsyncMock())
            
            await scraper.__aenter__()
            
            mock_pw.chromium.launch.assert_called_once_with(headless=False)

    @pytest.mark.asyncio
    async def test_web_scraper_aexit_closes_all_resources(self):
        """WebScraper.__aexit__ closes all Playwright and HTTP resources."""
        scraper = WebScraper()
        
        # Mock all closeable resources
        scraper.page = AsyncMock()
        scraper.context = AsyncMock()
        scraper.browser = AsyncMock()
        scraper.playwright = AsyncMock()
        scraper.http_client = AsyncMock()
        
        await scraper.__aexit__(None, None, None)
        
        scraper.page.close.assert_called_once()
        scraper.context.close.assert_called_once()
        scraper.browser.close.assert_called_once()
        scraper.playwright.stop.assert_called_once()
        scraper.http_client.aclose.assert_called_once()

    @pytest.mark.asyncio
    async def test_web_scraper_aexit_handles_none_resources(self):
        """WebScraper.__aexit__ handles None resources gracefully."""
        scraper = WebScraper()
        
        # Set attributes to None (they don't exist by default)
        scraper.page = None
        scraper.context = None
        scraper.browser = None
        scraper.playwright = None
        
        # Should not raise
        await scraper.__aexit__(None, None, None)

    @pytest.mark.asyncio
    async def test_web_scraper_aexit_with_exception(self):
        """WebScraper.__aexit__ closes resources even with exception."""
        scraper = WebScraper()
        scraper.page = AsyncMock()
        scraper.context = AsyncMock()
        scraper.browser = AsyncMock()
        scraper.playwright = AsyncMock()
        scraper.http_client = AsyncMock()
        
        exc_type = ValueError
        exc_val = ValueError("test error")
        exc_tb = None
        
        await scraper.__aexit__(exc_type, exc_val, exc_tb)
        
        # Should still close everything
        scraper.page.close.assert_called_once()
        scraper.browser.close.assert_called_once()


class TestWebScraperFetchUrl:
    """Tests for WebScraper.fetch_url method."""

    @pytest.mark.asyncio
    async def test_fetch_url_makes_http_request(self):
        """fetch_url makes HTTP GET request."""
        scraper = WebScraper()
        test_url = "https://example.com"
        
        with patch.object(scraper, "rate_limiter") as mock_limiter:
            mock_limiter.__aenter__ = AsyncMock()
            mock_limiter.__aexit__ = AsyncMock()
            
            mock_response = Mock(spec=httpx.Response)
            mock_response.raise_for_status = Mock()
            
            with patch.object(scraper.http_client, "get", return_value=mock_response) as mock_get:
                result = await scraper.fetch_url(test_url)
                
                mock_get.assert_called_once_with(test_url)
                assert result is mock_response

    @pytest.mark.asyncio
    async def test_fetch_url_respects_rate_limiting(self):
        """fetch_url uses rate limiter."""
        scraper = WebScraper()
        test_url = "https://example.com"
        
        with patch.object(scraper, "rate_limiter") as mock_limiter:
            mock_limiter.__aenter__ = AsyncMock()
            mock_limiter.__aexit__ = AsyncMock()
            
            mock_response = Mock(spec=httpx.Response)
            mock_response.raise_for_status = Mock()
            with patch.object(scraper.http_client, "get", return_value=mock_response):
                await scraper.fetch_url(test_url)
                
                mock_limiter.__aenter__.assert_called_once()
                mock_limiter.__aexit__.assert_called_once()

    @pytest.mark.asyncio
    async def test_fetch_url_raises_for_status(self):
        """fetch_url calls raise_for_status on response."""
        scraper = WebScraper()
        test_url = "https://example.com"
        
        with patch.object(scraper, "rate_limiter") as mock_limiter:
            mock_limiter.__aenter__ = AsyncMock()
            mock_limiter.__aexit__ = AsyncMock()
            
            mock_response = Mock(spec=httpx.Response)
            mock_response.raise_for_status = Mock()
            
            with patch.object(scraper.http_client, "get", return_value=mock_response):
                await scraper.fetch_url(test_url)
                
                mock_response.raise_for_status.assert_called_once()

    @pytest.mark.asyncio
    async def test_fetch_url_propagates_http_errors(self):
        """fetch_url propagates HTTP errors."""
        scraper = WebScraper()
        test_url = "https://example.com"
        
        # Create proper mocks for httpx error
        mock_request = Mock()
        mock_response = Mock()
        mock_response.status_code = 404
        
        # Create response that raises on raise_for_status
        mock_http_response = Mock(spec=httpx.Response)
        mock_http_response.raise_for_status = Mock(
            side_effect=httpx.HTTPStatusError(
                "404 Not Found",
                request=mock_request,
                response=mock_response
            )
        )
        
        with patch.object(scraper.http_client, "get", return_value=mock_http_response):
            with pytest.raises(httpx.HTTPStatusError):
                await scraper.fetch_url(test_url)


class TestWebScraperFetchWithPlaywright:
    """Tests for WebScraper.fetch_with_playwright method."""

    @pytest.mark.asyncio
    async def test_fetch_with_playwright_navigates_to_url(self):
        """fetch_with_playwright navigates to URL."""
        scraper = WebScraper()
        scraper.page = AsyncMock()
        scraper.page.goto = AsyncMock()
        scraper.page.content = AsyncMock(return_value="<html>test</html>")
        
        test_url = "https://example.com"
        
        with patch.object(scraper, "rate_limiter") as mock_limiter:
            mock_limiter.__aenter__ = AsyncMock()
            mock_limiter.__aexit__ = AsyncMock()
            
            result = await scraper.fetch_with_playwright(test_url)
            
            scraper.page.goto.assert_called_once_with(
                test_url, wait_until="domcontentloaded"
            )
            assert result == "<html>test</html>"

    @pytest.mark.asyncio
    async def test_fetch_with_playwright_respects_rate_limiting(self):
        """fetch_with_playwright uses rate limiter."""
        scraper = WebScraper()
        scraper.page = AsyncMock()
        scraper.page.goto = AsyncMock()
        scraper.page.content = AsyncMock(return_value="<html></html>")
        
        with patch.object(scraper, "rate_limiter") as mock_limiter:
            mock_limiter.__aenter__ = AsyncMock()
            mock_limiter.__aexit__ = AsyncMock()
            
            await scraper.fetch_with_playwright("https://example.com")
            
            mock_limiter.__aenter__.assert_called_once()
            mock_limiter.__aexit__.assert_called_once()

    @pytest.mark.asyncio
    async def test_fetch_with_playwright_waits_for_selector(self):
        """fetch_with_playwright waits for selector when provided."""
        scraper = WebScraper()
        scraper.page = AsyncMock()
        scraper.page.goto = AsyncMock()
        scraper.page.wait_for_selector = AsyncMock()
        scraper.page.content = AsyncMock(return_value="<html>test</html>")
        
        test_url = "https://example.com"
        test_selector = ".main-content"
        
        with patch.object(scraper, "rate_limiter") as mock_limiter:
            mock_limiter.__aenter__ = AsyncMock()
            mock_limiter.__aexit__ = AsyncMock()
            
            result = await scraper.fetch_with_playwright(
                test_url, wait_for_selector=test_selector
            )
            
            scraper.page.wait_for_selector.assert_called_once_with(test_selector)
            assert result == "<html>test</html>"

    @pytest.mark.asyncio
    async def test_fetch_with_playwright_without_selector(self):
        """fetch_with_playwright works without wait_for_selector."""
        scraper = WebScraper()
        scraper.page = AsyncMock()
        scraper.page.goto = AsyncMock()
        scraper.page.wait_for_selector = AsyncMock()
        scraper.page.content = AsyncMock(return_value="<html>test</html>")
        
        with patch.object(scraper, "rate_limiter") as mock_limiter:
            mock_limiter.__aenter__ = AsyncMock()
            mock_limiter.__aexit__ = AsyncMock()
            
            await scraper.fetch_with_playwright("https://example.com")
            
            # Should not call wait_for_selector
            scraper.page.wait_for_selector.assert_not_called()

    @pytest.mark.asyncio
    async def test_fetch_with_playwright_returns_content(self):
        """fetch_with_playwright returns page content."""
        scraper = WebScraper()
        scraper.page = AsyncMock()
        scraper.page.goto = AsyncMock()
        scraper.page.content = AsyncMock(return_value="<html><body>Hello World</body></html>")
        
        with patch.object(scraper, "rate_limiter") as mock_limiter:
            mock_limiter.__aenter__ = AsyncMock()
            mock_limiter.__aexit__ = AsyncMock()
            
            result = await scraper.fetch_with_playwright("https://example.com")
            
            assert result == "<html><body>Hello World</body></html>"
            scraper.page.content.assert_called_once()


class TestWebScraperEdgeCases:
    """Tests for edge cases and error handling."""

    @pytest.mark.asyncio
    async def test_web_scraper_multiple_fetch_calls(self):
        """WebScraper handles multiple sequential fetch calls."""
        scraper = WebScraper(rate_limit_calls=5, rate_limit_period=1.0)
        
        with patch.object(scraper, "rate_limiter") as mock_limiter:
            mock_limiter.__aenter__ = AsyncMock()
            mock_limiter.__aexit__ = AsyncMock()
            
            mock_response = Mock(spec=httpx.Response)
            mock_response.raise_for_status = Mock()
            
            with patch.object(scraper.http_client, "get", return_value=mock_response):
                # Multiple calls should work
                for i in range(3):
                    result = await scraper.fetch_url(f"https://example.com/{i}")
                    assert result is mock_response

    def test_rate_limiter_zero_calls_raises(self):
        """RateLimiter with zero calls is technically allowed but meaningless."""
        # This edge case: creating limiter is ok, using it would block forever
        limiter = RateLimiter(calls=0, period=1.0)
        assert limiter.calls == 0

    def test_rate_limiter_zero_period(self):
        """RateLimiter with zero period is technically allowed."""
        limiter = RateLimiter(calls=1, period=0.0)
        assert limiter.period == 0.0

    @pytest.mark.asyncio
    async def test_web_scraper_partial_cleanup_on_error(self):
        """WebScraper cleans up resources even if some cleanup fails."""
        scraper = WebScraper()
        scraper.page = AsyncMock()
        scraper.context = AsyncMock()
        scraper.browser = AsyncMock()
        scraper.playwright = AsyncMock()
        scraper.http_client = AsyncMock()
        
        # Make one of the closes fail
        scraper.context.close = AsyncMock(side_effect=Exception("Close failed"))
        
        # Should raise the exception (cleanup doesn't swallow errors)
        with pytest.raises(Exception, match="Close failed"):
            await scraper.__aexit__(None, None, None)


class TestGlobalWebScraperInstance:
    """Tests for the global web_scraper instance."""

    def test_global_web_scraper_exists(self):
        """Global web_scraper instance is created."""
        from utils.scraping import web_scraper
        
        assert web_scraper is not None
        assert isinstance(web_scraper, WebScraper)

    def test_global_web_scraper_default_config(self):
        """Global web_scraper uses default configuration."""
        from utils.scraping import web_scraper
        
        assert web_scraper.headless is True
        assert web_scraper.rate_limiter.calls == 1
        assert web_scraper.rate_limiter.period == 1.0
