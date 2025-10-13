"""
Rate limiting middleware for FastAPI.

Implements token bucket algorithm for API rate limiting.
100% local - no external services required.
"""

from __future__ import annotations

import time
from collections import defaultdict
from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import HTTPException, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from jsa.logging import get_logger

logger = get_logger("rate_limit", component="fastapi_middleware")


class TokenBucket:
    """
    Token bucket rate limiter.

    Allows burst of requests up to capacity, then enforces steady rate.
    """

    def __init__(self, capacity: int, refill_rate: float):
        """
        Initialize token bucket.

        Args:
            capacity: Maximum number of tokens (max burst)
            refill_rate: Tokens added per second
        """
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens: float = float(capacity)
        self.last_refill = time.time()

    def consume(self, tokens: int = 1) -> bool:
        """
        Attempt to consume tokens.

        Args:
            tokens: Number of tokens to consume

        Returns:
            True if tokens were consumed, False if insufficient tokens
        """
        self._refill()

        if self.tokens >= tokens:
            self.tokens -= tokens
            return True
        return False

    def _refill(self) -> None:
        """Refill tokens based on elapsed time."""
        now = time.time()
        elapsed = now - self.last_refill
        tokens_to_add = elapsed * self.refill_rate
        self.tokens = min(float(self.capacity), self.tokens + tokens_to_add)
        self.last_refill = now


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware using token bucket algorithm.

    Default limits:
    - 100 requests per minute per IP
    - 1000 requests per hour per IP
    """

    def __init__(
        self,
        app: ASGIApp,
        requests_per_minute: int = 100,
        requests_per_hour: int = 1000,
        enabled: bool = True,
    ):
        """
        Initialize rate limiter.

        Args:
            app: FastAPI application
            requests_per_minute: Rate limit per minute per IP
            requests_per_hour: Rate limit per hour per IP
            enabled: Whether rate limiting is enabled
        """
        super().__init__(app)
        self.enabled = enabled
        self.requests_per_minute = requests_per_minute
        self.requests_per_hour = requests_per_hour

        # IP -> TokenBucket mappings
        self.minute_buckets: dict[str, TokenBucket] = defaultdict(
            lambda: TokenBucket(requests_per_minute, requests_per_minute / 60.0)
        )
        self.hour_buckets: dict[str, TokenBucket] = defaultdict(
            lambda: TokenBucket(requests_per_hour, requests_per_hour / 3600.0)
        )

        # Cleanup old buckets periodically
        self.last_cleanup = time.time()
        self.cleanup_interval = 3600  # 1 hour

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """Apply rate limiting to request."""
        if not self.enabled:
            return await call_next(request)

        # Skip rate limiting for health checks
        if request.url.path == "/health" or request.url.path == "/api/v1/health":
            return await call_next(request)

        # Get client IP
        client_ip = self._get_client_ip(request)

        # Check rate limits
        if not self._check_rate_limit(client_ip):
            logger.warning(
                "Rate limit exceeded",
                client_ip=client_ip,
                path=request.url.path,
                component="fastapi_middleware",
            )
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please try again later.",
                headers={"Retry-After": "60"},
            )

        # Periodic cleanup
        self._maybe_cleanup()

        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit-Minute"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Limit-Hour"] = str(self.requests_per_hour)

        return response

    def _get_client_ip(self, request: Request) -> str:
        """
        Get client IP address.

        Checks X-Forwarded-For header first (for proxies), then falls back to client host.
        """
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            # Take first IP if multiple are present
            return forwarded.split(",")[0].strip()

        if request.client:
            return request.client.host

        return "unknown"

    def _check_rate_limit(self, client_ip: str) -> bool:
        """
        Check if request is within rate limits.

        Args:
            client_ip: Client IP address

        Returns:
            True if within limits, False otherwise
        """
        minute_ok = self.minute_buckets[client_ip].consume()
        hour_ok = self.hour_buckets[client_ip].consume()

        return minute_ok and hour_ok

    def _maybe_cleanup(self) -> None:
        """Periodically cleanup old buckets to prevent memory bloat."""
        now = time.time()
        if now - self.last_cleanup > self.cleanup_interval:
            # Remove buckets that are at full capacity (inactive)
            self.minute_buckets = defaultdict(
                lambda: TokenBucket(self.requests_per_minute, self.requests_per_minute / 60.0),
                {
                    ip: bucket
                    for ip, bucket in self.minute_buckets.items()
                    if bucket.tokens < bucket.capacity
                },
            )
            self.hour_buckets = defaultdict(
                lambda: TokenBucket(self.requests_per_hour, self.requests_per_hour / 3600.0),
                {
                    ip: bucket
                    for ip, bucket in self.hour_buckets.items()
                    if bucket.tokens < bucket.capacity
                },
            )
            self.last_cleanup = now
            logger.info("Rate limiter cleanup completed", component="fastapi_middleware")
