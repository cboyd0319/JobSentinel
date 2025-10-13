"""
Rate limiting for MCP servers and external APIs.

Prevents abuse, API bans, and limits damage from compromised servers.
Cost: FREE (pure Python, no dependencies)
Impact: HIGH (prevents service disruption)
"""

import time
from collections import deque
from threading import Lock

from utils.logging import get_logger

logger = get_logger("rate_limiter")


class RateLimiter:
    """Token bucket rate limiter for API requests."""

    def __init__(self, max_requests: int, time_window_seconds: int, burst_size: int | None = None):
        """
        Initialize rate limiter.

        Args:
            max_requests: Maximum requests allowed in time window
            time_window_seconds: Time window in seconds
            burst_size: Maximum burst size (defaults to max_requests)
        """
        self.max_requests = max_requests
        self.time_window = time_window_seconds
        self.burst_size = burst_size or max_requests
        self.requests: deque = deque()
        self.lock = Lock()

        logger.info(
            f"Initialized RateLimiter: {max_requests} req/{time_window_seconds}s "
            f"(burst={self.burst_size})"
        )

    def is_allowed(self, tokens: int = 1) -> bool:
        """
        Check if request is allowed under rate limit.

        Args:
            tokens: Number of tokens to consume (default 1)

        Returns:
            True if request allowed, False if rate limited
        """
        with self.lock:
            now = time.time()
            cutoff = now - self.time_window

            # Remove expired requests
            while self.requests and self.requests[0] < cutoff:
                self.requests.popleft()

            # Check if under limit
            if len(self.requests) + tokens <= self.max_requests:
                # Add tokens
                for _ in range(tokens):
                    self.requests.append(now)
                return True

            return False

    def wait_if_needed(self, tokens: int = 1, timeout: float | None = None):
        """
        Block until request is allowed (with optional timeout).

        Args:
            tokens: Number of tokens to consume
            timeout: Maximum seconds to wait (None = wait forever)

        Raises:
            TimeoutError: If timeout exceeded
        """
        start_time = time.time()

        while not self.is_allowed(tokens):
            if timeout and (time.time() - start_time) > timeout:
                raise TimeoutError(
                    f"Rate limit timeout after {timeout}s "
                    f"(limit: {self.max_requests}/{self.time_window}s)"
                )

            # Sleep and retry
            time.sleep(0.1)

    def get_wait_time(self) -> float:
        """Get estimated wait time until next request allowed."""
        with self.lock:
            if len(self.requests) < self.max_requests:
                return 0.0

            # Calculate when oldest request expires
            oldest = self.requests[0]
            cutoff = oldest + self.time_window
            return max(0.0, cutoff - time.time())

    def reset(self):
        """Reset rate limiter (clear all requests)."""
        with self.lock:
            self.requests.clear()
            logger.info("Rate limiter reset")

    def get_stats(self) -> dict:
        """Get rate limiter statistics."""
        with self.lock:
            now = time.time()
            cutoff = now - self.time_window

            # Count valid requests
            valid_requests = sum(1 for req in self.requests if req >= cutoff)

            return {
                "max_requests": self.max_requests,
                "time_window_seconds": self.time_window,
                "current_requests": valid_requests,
                "remaining": max(0, self.max_requests - valid_requests),
                "wait_time_seconds": self.get_wait_time(),
            }


class MCPRateLimitRegistry:
    """Registry of rate limiters for MCP servers."""

    def __init__(self):
        self.limiters: dict[str, RateLimiter] = {}
        self.lock = Lock()

        # Default limits per server (conservative)
        self.default_limits = {
            "jobswithgpt": {"max_requests": 100, "time_window": 3600},  # 100/hour
            "reed": {"max_requests": 300, "time_window": 3600},  # 300/hour (official API)
            "jobspy": {"max_requests": 50, "time_window": 3600},  # 50/hour (aggressive scraper)
            "greenhouse": {"max_requests": 200, "time_window": 3600},  # 200/hour
            "lever": {"max_requests": 200, "time_window": 3600},  # 200/hour
            "linkedin": {"max_requests": 20, "time_window": 3600},  # 20/hour (high risk)
        }

        logger.info("Initialized MCPRateLimitRegistry")

    def get_limiter(self, server_name: str) -> RateLimiter:
        """Get or create rate limiter for MCP server."""
        with self.lock:
            if server_name not in self.limiters:
                # Get limits from config or use defaults
                limits = self.default_limits.get(
                    server_name.lower(), {"max_requests": 100, "time_window": 3600}  # Fallback
                )

                self.limiters[server_name] = RateLimiter(
                    max_requests=limits["max_requests"], time_window_seconds=limits["time_window"]
                )

                logger.info(
                    f"Created rate limiter for '{server_name}': "
                    f"{limits['max_requests']}/{limits['time_window']}s"
                )

            return self.limiters[server_name]

    def is_allowed(self, server_name: str, tokens: int = 1) -> bool:
        """Check if request is allowed for server."""
        limiter = self.get_limiter(server_name)
        allowed = limiter.is_allowed(tokens)

        if not allowed:
            logger.warning(
                f"Rate limit exceeded for '{server_name}' "
                f"(wait: {limiter.get_wait_time():.1f}s)"
            )

        return allowed

    def wait_if_needed(self, server_name: str, tokens: int = 1, timeout: float | None = None):
        """Block until request allowed for server."""
        limiter = self.get_limiter(server_name)
        limiter.wait_if_needed(tokens, timeout)

    def set_limits(self, server_name: str, max_requests: int, time_window_seconds: int):
        """Set custom rate limits for server."""
        with self.lock:
            self.limiters[server_name] = RateLimiter(
                max_requests=max_requests, time_window_seconds=time_window_seconds
            )

            logger.info(
                f"Set custom limits for '{server_name}': " f"{max_requests}/{time_window_seconds}s"
            )

    def reset(self, server_name: str | None = None):
        """Reset rate limiter(s)."""
        with self.lock:
            if server_name:
                if server_name in self.limiters:
                    self.limiters[server_name].reset()
                    logger.info(f"Reset rate limiter for '{server_name}'")
            else:
                for limiter in self.limiters.values():
                    limiter.reset()
                logger.info("Reset all rate limiters")

    def get_all_stats(self) -> dict[str, dict]:
        """Get statistics for all rate limiters."""
        with self.lock:
            return {name: limiter.get_stats() for name, limiter in self.limiters.items()}


# Global registry instance
mcp_rate_limits = MCPRateLimitRegistry()


# Decorator for rate-limited functions
def rate_limited(server_name: str, tokens: int = 1, timeout: float | None = 30.0):
    """
    Decorator to enforce rate limits on functions.

    Args:
        server_name: Name of MCP server
        tokens: Number of tokens to consume
        timeout: Maximum wait time (None = wait forever)

    Example:
        @rate_limited("jobswithgpt", tokens=1, timeout=30.0)
        async def search_jobs(...):
            # This function is rate limited
            pass
    """

    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            # Wait for rate limit
            mcp_rate_limits.wait_if_needed(server_name, tokens, timeout)
            return await func(*args, **kwargs)

        def sync_wrapper(*args, **kwargs):
            # Wait for rate limit
            mcp_rate_limits.wait_if_needed(server_name, tokens, timeout)
            return func(*args, **kwargs)

        # Return appropriate wrapper
        import inspect

        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator
