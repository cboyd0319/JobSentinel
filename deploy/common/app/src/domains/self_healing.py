"""
Self-Healing and Error Recovery System

Provides automatic error detection, diagnosis, and recovery with:
- Automatic retry with exponential backoff
- Circuit breakers for cascading failure prevention
- Graceful degradation when components fail
- Self-diagnosis and remediation
- Comprehensive error reporting

References:
- Release It! | https://pragprog.com | High | Production stability patterns
- Google SRE | https://sre.google | Medium | Error budgets and reliability
- SWEBOK v4.0a | https://computer.org/swebok | High | Software maintenance
- Netflix Hystrix | https://github.com/Netflix/Hystrix | Medium | Resilience patterns
"""

import asyncio
import functools
import logging
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


# ============================================================================
# Enumerations
# ============================================================================


class ErrorCategory(str, Enum):
    """Error categories for classification."""

    TRANSIENT = "transient"  # Temporary, likely to succeed on retry
    PERMANENT = "permanent"  # Unlikely to succeed on retry
    RATE_LIMIT = "rate_limit"  # Rate limit exceeded
    CONFIGURATION = "configuration"  # Configuration error
    NETWORK = "network"  # Network connectivity issue
    AUTHENTICATION = "authentication"  # Auth/credential issue
    VALIDATION = "validation"  # Input validation failure
    RESOURCE = "resource"  # Resource exhaustion (memory, disk)
    UNKNOWN = "unknown"  # Uncategorized error


class RecoveryStrategy(str, Enum):
    """Recovery strategies for different error types."""

    RETRY = "retry"  # Retry with backoff
    CIRCUIT_BREAK = "circuit_break"  # Open circuit breaker
    DEGRADE = "degrade"  # Graceful degradation
    FAIL_FAST = "fail_fast"  # Fail immediately
    SKIP = "skip"  # Skip and continue
    ALERT = "alert"  # Alert and wait for manual intervention


class HealthStatus(str, Enum):
    """Component health status."""

    HEALTHY = "healthy"  # Operating normally
    DEGRADED = "degraded"  # Reduced functionality
    UNHEALTHY = "unhealthy"  # Not functioning
    RECOVERING = "recovering"  # Attempting recovery
    UNKNOWN = "unknown"  # Status unknown


# ============================================================================
# Data Models
# ============================================================================


@dataclass
class ErrorContext:
    """Context information for error analysis."""

    error_type: type
    error_message: str
    operation: str
    timestamp: float = field(default_factory=time.time)
    category: ErrorCategory = ErrorCategory.UNKNOWN
    retryable: bool = False
    suggested_strategy: RecoveryStrategy = RecoveryStrategy.FAIL_FAST
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class RecoveryAttempt:
    """Record of a recovery attempt."""

    strategy: RecoveryStrategy
    timestamp: float
    success: bool
    duration_ms: float
    message: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ComponentHealth:
    """Health status of a system component."""

    component_name: str
    status: HealthStatus
    last_check: float
    error_count: int = 0
    success_count: int = 0
    recovery_attempts: list[RecoveryAttempt] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def success_rate(self) -> float:
        """Calculate success rate."""
        total = self.success_count + self.error_count
        return self.success_count / total if total > 0 else 0.0

    @property
    def is_healthy(self) -> bool:
        """Check if component is healthy."""
        return self.status in [HealthStatus.HEALTHY, HealthStatus.DEGRADED]


# ============================================================================
# Error Classifier
# ============================================================================


class ErrorClassifier:
    """
    Classifies errors and determines recovery strategies.

    Uses error patterns to categorize issues and recommend appropriate
    recovery strategies.
    """

    # Error patterns for classification
    TRANSIENT_PATTERNS = [
        "timeout",
        "temporarily unavailable",
        "service unavailable",
        "connection reset",
        "broken pipe",
        "504",
        "502",
        "503",
    ]

    RATE_LIMIT_PATTERNS = [
        "rate limit",
        "too many requests",
        "429",
        "quota exceeded",
    ]

    NETWORK_PATTERNS = [
        "connection",
        "network",
        "dns",
        "unreachable",
        "host",
    ]

    AUTH_PATTERNS = [
        "unauthorized",
        "forbidden",
        "authentication",
        "401",
        "403",
        "invalid token",
        "expired token",
    ]

    VALIDATION_PATTERNS = [
        "validation",
        "invalid",
        "malformed",
        "400",
        "422",
    ]

    RESOURCE_PATTERNS = [
        "out of memory",
        "disk full",
        "no space",
        "resource",
        "memory error",
    ]

    @staticmethod
    def classify(error: Exception, operation: str = "") -> ErrorContext:
        """
        Classify an error and determine recovery strategy.

        Args:
            error: Exception to classify
            operation: Operation that failed

        Returns:
            ErrorContext with classification and strategy
        """
        error_msg = str(error).lower()
        error_type = type(error).__name__

        # Classify by error patterns
        if any(pattern in error_msg for pattern in ErrorClassifier.TRANSIENT_PATTERNS):
            category = ErrorCategory.TRANSIENT
            retryable = True
            strategy = RecoveryStrategy.RETRY

        elif any(pattern in error_msg for pattern in ErrorClassifier.RATE_LIMIT_PATTERNS):
            category = ErrorCategory.RATE_LIMIT
            retryable = True
            strategy = RecoveryStrategy.CIRCUIT_BREAK

        elif any(pattern in error_msg for pattern in ErrorClassifier.NETWORK_PATTERNS):
            category = ErrorCategory.NETWORK
            retryable = True
            strategy = RecoveryStrategy.RETRY

        elif any(pattern in error_msg for pattern in ErrorClassifier.AUTH_PATTERNS):
            category = ErrorCategory.AUTHENTICATION
            retryable = False
            strategy = RecoveryStrategy.FAIL_FAST

        elif any(pattern in error_msg for pattern in ErrorClassifier.VALIDATION_PATTERNS):
            category = ErrorCategory.VALIDATION
            retryable = False
            strategy = RecoveryStrategy.FAIL_FAST

        elif any(pattern in error_msg for pattern in ErrorClassifier.RESOURCE_PATTERNS):
            category = ErrorCategory.RESOURCE
            retryable = False
            strategy = RecoveryStrategy.DEGRADE

        else:
            category = ErrorCategory.UNKNOWN
            retryable = False
            strategy = RecoveryStrategy.FAIL_FAST

        return ErrorContext(
            error_type=type(error),
            error_message=str(error),
            operation=operation,
            category=category,
            retryable=retryable,
            suggested_strategy=strategy,
            metadata={"error_type_name": error_type},
        )


# ============================================================================
# Retry Logic with Exponential Backoff
# ============================================================================


class RetryHandler:
    """
    Retry handler with exponential backoff.

    Implements retry logic with configurable backoff, jitter, and max attempts.
    """

    def __init__(
        self,
        max_attempts: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        exponential_base: float = 2.0,
        jitter: bool = True,
    ):
        """
        Initialize retry handler.

        Args:
            max_attempts: Maximum retry attempts
            base_delay: Base delay in seconds
            max_delay: Maximum delay in seconds
            exponential_base: Base for exponential backoff
            jitter: Add random jitter to delays
        """
        self.max_attempts = max_attempts
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.exponential_base = exponential_base
        self.jitter = jitter

    def calculate_delay(self, attempt: int) -> float:
        """Calculate delay for given attempt number."""
        import random

        delay = min(
            self.base_delay * (self.exponential_base ** (attempt - 1)),
            self.max_delay,
        )

        if self.jitter:
            # Add ±25% jitter (non-cryptographic use - timing variance only)
            jitter_range = delay * 0.25
            delay += random.uniform(-jitter_range, jitter_range)  # noqa: S311

        return max(0, delay)

    def retry(
        self,
        func: Callable[..., T],
        *args: Any,
        operation: str = "",
        **kwargs: Any,
    ) -> T:
        """
        Execute function with retry logic.

        Args:
            func: Function to execute
            *args: Positional arguments
            operation: Operation name for logging
            **kwargs: Keyword arguments

        Returns:
            Function result

        Raises:
            Last exception if all retries fail
        """
        last_error = None

        for attempt in range(1, self.max_attempts + 1):
            try:
                result = func(*args, **kwargs)
                if attempt > 1:
                    logger.info(f"{operation} succeeded on attempt {attempt}/{self.max_attempts}")
                return result

            except Exception as e:
                last_error = e
                error_ctx = ErrorClassifier.classify(e, operation)

                if not error_ctx.retryable or attempt >= self.max_attempts:
                    logger.error(f"{operation} failed (non-retryable or max attempts): {e}")
                    raise

                delay = self.calculate_delay(attempt)
                logger.warning(
                    f"{operation} failed on attempt {attempt}/{self.max_attempts}: "
                    f"{e}. Retrying in {delay:.2f}s..."
                )
                time.sleep(delay)

        # Should not reach here, but just in case
        if last_error:
            raise last_error
        raise RuntimeError("Retry logic failed unexpectedly")

    async def retry_async(
        self,
        func: Callable[..., T],
        *args: Any,
        operation: str = "",
        **kwargs: Any,
    ) -> T:
        """Async version of retry logic."""
        last_error = None

        for attempt in range(1, self.max_attempts + 1):
            try:
                result = await func(*args, **kwargs)
                if attempt > 1:
                    logger.info(f"{operation} succeeded on attempt {attempt}/{self.max_attempts}")
                return result

            except Exception as e:
                last_error = e
                error_ctx = ErrorClassifier.classify(e, operation)

                if not error_ctx.retryable or attempt >= self.max_attempts:
                    logger.error(f"{operation} failed (non-retryable or max attempts): {e}")
                    raise

                delay = self.calculate_delay(attempt)
                logger.warning(
                    f"{operation} failed on attempt {attempt}/{self.max_attempts}: "
                    f"{e}. Retrying in {delay:.2f}s..."
                )
                await asyncio.sleep(delay)

        if last_error:
            raise last_error
        raise RuntimeError("Retry logic failed unexpectedly")


# ============================================================================
# Decorators
# ============================================================================


def with_retry(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    operation: str = "",
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """
    Decorator to add retry logic to a function.

    Example:
        @with_retry(max_attempts=3, base_delay=1.0, operation="fetch_jobs")
        def fetch_jobs():
            # ... implementation
    """

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        handler = RetryHandler(max_attempts=max_attempts, base_delay=base_delay)
        op_name = operation or func.__name__

        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> T:
            return handler.retry(func, *args, operation=op_name, **kwargs)

        return wrapper

    return decorator


def with_retry_async(
    max_attempts: int = 3,
    base_delay: float = 1.0,
    operation: str = "",
) -> Callable[[Callable[..., T]], Callable[..., T]]:
    """Async version of with_retry decorator."""

    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        handler = RetryHandler(max_attempts=max_attempts, base_delay=base_delay)
        op_name = operation or func.__name__

        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> T:
            return await handler.retry_async(func, *args, operation=op_name, **kwargs)

        return wrapper

    return decorator


# ============================================================================
# Health Monitor
# ============================================================================


class HealthMonitor:
    """
    System health monitor with component tracking.

    Monitors health of individual components and provides overall system status.
    """

    def __init__(self):
        """Initialize health monitor."""
        self.components: dict[str, ComponentHealth] = {}

    def register_component(self, name: str) -> None:
        """Register a component for monitoring."""
        if name not in self.components:
            self.components[name] = ComponentHealth(
                component_name=name,
                status=HealthStatus.UNKNOWN,
                last_check=time.time(),
            )
            logger.info(f"Registered component: {name}")

    def record_success(self, component: str) -> None:
        """Record successful operation."""
        if component not in self.components:
            self.register_component(component)

        comp = self.components[component]
        comp.success_count += 1
        comp.last_check = time.time()

        # Update status based on success rate
        if comp.success_rate >= 0.95:
            comp.status = HealthStatus.HEALTHY
        elif comp.success_rate >= 0.80:
            comp.status = HealthStatus.DEGRADED

    def record_failure(self, component: str, error: Exception) -> None:
        """Record failed operation."""
        if component not in self.components:
            self.register_component(component)

        comp = self.components[component]
        comp.error_count += 1
        comp.last_check = time.time()

        # Update status based on success rate
        if comp.success_rate < 0.50:
            comp.status = HealthStatus.UNHEALTHY
        elif comp.success_rate < 0.80:
            comp.status = HealthStatus.DEGRADED

        logger.warning(
            f"Component {component} failure: {error} " f"(success rate: {comp.success_rate:.1%})"
        )

    def get_component_health(self, component: str) -> ComponentHealth | None:
        """Get health status for a component."""
        return self.components.get(component)

    def get_system_health(self) -> dict[str, Any]:
        """Get overall system health."""
        healthy = sum(1 for c in self.components.values() if c.status == HealthStatus.HEALTHY)
        degraded = sum(1 for c in self.components.values() if c.status == HealthStatus.DEGRADED)
        unhealthy = sum(1 for c in self.components.values() if c.status == HealthStatus.UNHEALTHY)
        total = len(self.components)

        overall_status = HealthStatus.HEALTHY
        if unhealthy > 0:
            overall_status = HealthStatus.UNHEALTHY
        elif degraded > 0:
            overall_status = HealthStatus.DEGRADED

        return {
            "overall_status": overall_status.value,
            "components": {
                "total": total,
                "healthy": healthy,
                "degraded": degraded,
                "unhealthy": unhealthy,
            },
            "details": {
                name: {
                    "status": comp.status.value,
                    "success_rate": f"{comp.success_rate:.1%}",
                    "errors": comp.error_count,
                    "successes": comp.success_count,
                }
                for name, comp in self.components.items()
            },
        }


# ============================================================================
# Global Instances
# ============================================================================

# Global health monitor instance
health_monitor = HealthMonitor()


# ============================================================================
# Example Usage
# ============================================================================


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(message)s")

    # Example 1: Basic retry
    print("\n=== Example 1: Basic Retry ===")

    @with_retry(max_attempts=3, base_delay=0.5, operation="fetch_data")
    def fetch_data(fail_times: int = 2):
        """Example function that fails a few times."""
        if not hasattr(fetch_data, "attempts"):
            fetch_data.attempts = 0
        fetch_data.attempts += 1

        if fetch_data.attempts <= fail_times:
            raise ConnectionError("Temporary network error")

        return "Success!"

    try:
        result = fetch_data(fail_times=2)
        print(f"Result: {result}")
    except Exception as e:
        print(f"Failed: {e}")

    # Example 2: Error classification
    print("\n=== Example 2: Error Classification ===")
    errors = [
        ConnectionError("Connection timeout"),
        ValueError("Invalid input"),
        Exception("Rate limit exceeded (429)"),
    ]

    for error in errors:
        ctx = ErrorClassifier.classify(error)
        print(f"Error: {error}")
        print(f"  Category: {ctx.category.value}")
        print(f"  Retryable: {ctx.retryable}")
        print(f"  Strategy: {ctx.suggested_strategy.value}")

    # Example 3: Health monitoring
    print("\n=== Example 3: Health Monitoring ===")
    monitor = HealthMonitor()

    # Register components
    monitor.register_component("scraper")
    monitor.register_component("analyzer")

    # Record some operations
    for _ in range(95):
        monitor.record_success("scraper")
    for _ in range(5):
        monitor.record_failure("scraper", Exception("Network error"))

    for _ in range(75):
        monitor.record_success("analyzer")
    for _ in range(25):
        monitor.record_failure("analyzer", Exception("Parse error"))

    # Get system health
    import json

    health = monitor.get_system_health()
    print(json.dumps(health, indent=2))
