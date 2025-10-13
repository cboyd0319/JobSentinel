"""
Scraping Resilience Module

Implements circuit breakers, retry strategies, and health monitoring for
reliable job scraping following Google SRE failure handling principles.

References:
- Google SRE | https://sre.google | High | Failure handling patterns
- Release It! (Nygard) | https://pragprog.com/titles/mnee2 | High | Circuit breaker pattern
- SWEBOK v4.0a | https://computer.org/swebok | High | Fault tolerance design
"""

import asyncio
import logging
import time
from collections import defaultdict, deque
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Optional


class CircuitState(Enum):
    """Circuit breaker states."""

    CLOSED = "closed"  # Normal operation
    OPEN = "open"  # Failing, rejecting requests
    HALF_OPEN = "half_open"  # Testing if service recovered


class RetryStrategy(Enum):
    """Retry backoff strategies."""

    EXPONENTIAL = "exponential"  # 1s, 2s, 4s, 8s...
    LINEAR = "linear"  # 1s, 2s, 3s, 4s...
    FIXED = "fixed"  # 1s, 1s, 1s, 1s...


@dataclass
class RetryConfig:
    """
    Retry configuration per SWEBOK fault tolerance principles.

    Attributes:
        max_attempts: Maximum retry attempts
        base_delay_seconds: Base delay between retries
        max_delay_seconds: Maximum delay cap
        strategy: Backoff strategy
        retry_on_exceptions: Exception types to retry
    """

    max_attempts: int = 3
    base_delay_seconds: float = 1.0
    max_delay_seconds: float = 60.0
    strategy: RetryStrategy = RetryStrategy.EXPONENTIAL
    retry_on_exceptions: tuple[type[Exception], ...] = (Exception,)

    def calculate_delay(self, attempt: int) -> float:
        """
        Calculate retry delay for given attempt.

        Args:
            attempt: Attempt number (0-indexed)

        Returns:
            Delay in seconds
        """
        if self.strategy == RetryStrategy.EXPONENTIAL:
            delay = self.base_delay_seconds * (2**attempt)
        elif self.strategy == RetryStrategy.LINEAR:
            delay = self.base_delay_seconds * (attempt + 1)
        else:  # FIXED
            delay = self.base_delay_seconds

        return min(delay, self.max_delay_seconds)


@dataclass
class CircuitBreakerConfig:
    """
    Circuit breaker configuration per Release It! patterns.

    Attributes:
        failure_threshold: Number of failures before opening
        success_threshold: Number of successes to close from half-open
        timeout_seconds: Time to wait before trying half-open
        window_seconds: Rolling window for failure counting
    """

    failure_threshold: int = 5
    success_threshold: int = 2
    timeout_seconds: float = 60.0
    window_seconds: float = 60.0


@dataclass
class HealthStatus:
    """
    Health status for a scraper.

    Attributes:
        scraper_name: Name/identifier of scraper
        is_healthy: Overall health status
        success_rate: Success rate (0.0-1.0)
        avg_latency_ms: Average latency in milliseconds
        last_success: Timestamp of last successful scrape
        last_failure: Timestamp of last failed scrape
        consecutive_failures: Count of consecutive failures
        metadata: Additional health information
    """

    scraper_name: str
    is_healthy: bool
    success_rate: float
    avg_latency_ms: float
    last_success: datetime | None = None
    last_failure: datetime | None = None
    consecutive_failures: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)


class CircuitBreaker:
    """
    Circuit breaker implementation per Release It! pattern.

    Protects downstream services from cascading failures by failing fast
    when error rates exceed thresholds.
    """

    def __init__(self, name: str, config: CircuitBreakerConfig):
        self.name = name
        self.config = config
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: float | None = None
        self.failures: deque[float] = deque(maxlen=100)
        self.logger = logging.getLogger(__name__)

    def call(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function with circuit breaker protection.

        Args:
            func: Function to execute
            *args, **kwargs: Function arguments

        Returns:
            Function result

        Raises:
            Exception: If circuit is open or function fails
        """
        # Check circuit state
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.logger.info(f"Circuit {self.name}: attempting reset (half-open)")
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitBreakerOpenError(
                    f"Circuit breaker {self.name} is OPEN. "
                    f"Will retry after {self.config.timeout_seconds}s"
                )

        # Execute function
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    async def call_async(self, func: Callable, *args, **kwargs) -> Any:
        """Async version of call."""
        # Check circuit state
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.logger.info(f"Circuit {self.name}: attempting reset (half-open)")
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitBreakerOpenError(
                    f"Circuit breaker {self.name} is OPEN. "
                    f"Will retry after {self.config.timeout_seconds}s"
                )

        # Execute function
        try:
            result = await func(*args, **kwargs)
            self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise

    def _on_success(self):
        """Handle successful execution."""
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.config.success_threshold:
                self.logger.info(f"Circuit {self.name}: HALF_OPEN -> CLOSED")
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.success_count = 0

        # Clean old failures from window
        self._clean_old_failures()

    def _on_failure(self):
        """Handle failed execution."""
        now = time.time()
        self.failures.append(now)
        self.last_failure_time = now
        self.failure_count += 1

        # Clean old failures from window
        self._clean_old_failures()

        # Check if we should open circuit
        recent_failures = len(self.failures)
        if recent_failures >= self.config.failure_threshold:
            if self.state != CircuitState.OPEN:
                self.logger.warning(
                    f"Circuit {self.name}: {self.state.value} -> OPEN "
                    f"({recent_failures} failures in {self.config.window_seconds}s)"
                )
                self.state = CircuitState.OPEN

            if self.state == CircuitState.HALF_OPEN:
                self.logger.warning(f"Circuit {self.name}: HALF_OPEN -> OPEN")
                self.state = CircuitState.OPEN

    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset."""
        if self.last_failure_time is None:
            return True

        elapsed = time.time() - self.last_failure_time
        return elapsed >= self.config.timeout_seconds

    def _clean_old_failures(self):
        """Remove failures outside the rolling window."""
        now = time.time()
        cutoff = now - self.config.window_seconds

        while self.failures and self.failures[0] < cutoff:
            self.failures.popleft()

    def get_state(self) -> dict[str, Any]:
        """Get current circuit breaker state."""
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "recent_failures": len(self.failures),
        }


class CircuitBreakerOpenError(Exception):
    """Raised when circuit breaker is open."""

    pass


class ResilientScraper:
    """
    Wrapper providing retry and circuit breaker capabilities.

    Combines retry strategies with circuit breakers for optimal
    failure handling per Google SRE principles.
    """

    def __init__(
        self,
        name: str,
        retry_config: RetryConfig | None = None,
        circuit_config: CircuitBreakerConfig | None = None,
    ):
        self.name = name
        self.retry_config = retry_config or RetryConfig()
        self.circuit_breaker = CircuitBreaker(name, circuit_config or CircuitBreakerConfig())
        self.logger = logging.getLogger(__name__)

    async def execute_with_retry(self, func: Callable, *args, **kwargs) -> Any:
        """
        Execute function with retry and circuit breaker.

        Args:
            func: Async function to execute
            *args, **kwargs: Function arguments

        Returns:
            Function result

        Raises:
            Exception: If all retries exhausted
        """
        last_exception = None

        for attempt in range(self.retry_config.max_attempts):
            try:
                # Execute through circuit breaker
                result = await self.circuit_breaker.call_async(func, *args, **kwargs)

                if attempt > 0:
                    self.logger.info(
                        f"{self.name}: succeeded on attempt {attempt + 1}/{self.retry_config.max_attempts}"
                    )

                return result

            except CircuitBreakerOpenError as e:
                # Circuit is open, don't retry
                self.logger.error(f"{self.name}: circuit breaker open, aborting retries")
                raise

            except self.retry_config.retry_on_exceptions as e:
                last_exception = e

                if attempt < self.retry_config.max_attempts - 1:
                    delay = self.retry_config.calculate_delay(attempt)
                    self.logger.warning(
                        f"{self.name}: attempt {attempt + 1} failed: {e}. "
                        f"Retrying in {delay:.1f}s..."
                    )
                    await asyncio.sleep(delay)
                else:
                    self.logger.error(
                        f"{self.name}: all {self.retry_config.max_attempts} attempts failed"
                    )

        # All retries exhausted
        raise last_exception if last_exception else Exception("Unknown error")

    def get_health_status(self) -> dict[str, Any]:
        """Get health status including circuit breaker state."""
        return {
            "scraper_name": self.name,
            "circuit_breaker": self.circuit_breaker.get_state(),
            "retry_config": {
                "max_attempts": self.retry_config.max_attempts,
                "strategy": self.retry_config.strategy.value,
            },
        }


class ScraperHealthMonitor:
    """
    Health monitoring for all scrapers.

    Tracks success rates, latencies, and provides health reporting
    per Google SRE observability principles.
    """

    def __init__(self):
        self.health_data: dict[str, dict[str, Any]] = defaultdict(
            lambda: {
                "successes": 0,
                "failures": 0,
                "latencies": deque(maxlen=100),
                "last_success": None,
                "last_failure": None,
                "consecutive_failures": 0,
            }
        )
        self.logger = logging.getLogger(__name__)

    def record_attempt(
        self, scraper_name: str, success: bool, latency_ms: float, error: str | None = None
    ):
        """
        Record scraping attempt.

        Args:
            scraper_name: Scraper identifier
            success: Whether attempt succeeded
            latency_ms: Latency in milliseconds
            error: Error message if failed
        """
        data = self.health_data[scraper_name]

        if success:
            data["successes"] += 1
            data["last_success"] = datetime.utcnow()
            data["consecutive_failures"] = 0
        else:
            data["failures"] += 1
            data["last_failure"] = datetime.utcnow()
            data["consecutive_failures"] += 1

            if data["consecutive_failures"] >= 5:
                self.logger.error(
                    f"Scraper {scraper_name}: {data['consecutive_failures']} consecutive failures"
                )

        data["latencies"].append(latency_ms)

    def get_health_status(self, scraper_name: str) -> HealthStatus:
        """
        Get health status for a scraper.

        Args:
            scraper_name: Scraper identifier

        Returns:
            HealthStatus object
        """
        data = self.health_data[scraper_name]

        total_attempts = data["successes"] + data["failures"]
        success_rate = data["successes"] / total_attempts if total_attempts > 0 else 0.0

        avg_latency = sum(data["latencies"]) / len(data["latencies"]) if data["latencies"] else 0.0

        # Consider healthy if: success rate > 80% and no recent failures
        is_healthy = success_rate > 0.8 and data["consecutive_failures"] < 3

        return HealthStatus(
            scraper_name=scraper_name,
            is_healthy=is_healthy,
            success_rate=success_rate,
            avg_latency_ms=avg_latency,
            last_success=data["last_success"],
            last_failure=data["last_failure"],
            consecutive_failures=data["consecutive_failures"],
            metadata={
                "total_successes": data["successes"],
                "total_failures": data["failures"],
            },
        )

    def get_all_health_statuses(self) -> list[HealthStatus]:
        """Get health statuses for all scrapers."""
        return [self.get_health_status(name) for name in self.health_data.keys()]

    def get_unhealthy_scrapers(self) -> list[HealthStatus]:
        """Get list of unhealthy scrapers."""
        return [status for status in self.get_all_health_statuses() if not status.is_healthy]


# Global instances
_health_monitor = ScraperHealthMonitor()


def get_health_monitor() -> ScraperHealthMonitor:
    """Get global health monitor instance."""
    return _health_monitor
