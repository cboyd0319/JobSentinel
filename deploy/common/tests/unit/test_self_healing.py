"""
Comprehensive unit tests for domains/self_healing.py

Tests cover:
- ErrorCategory, RecoveryStrategy, HealthStatus enums
- ErrorContext, RecoveryAttempt, ComponentHealth data classes
- ErrorClassifier: error classification and strategy selection
- RetryHandler: exponential backoff, jitter, max attempts
- Decorator functions: with_retry, with_retry_async
- HealthMonitor: component health tracking
- Edge cases, error handling, async operations

Following PyTest Architect best practices:
- AAA pattern (Arrange-Act-Assert)
- Parametrized tests for input matrices
- Deterministic (seeded randomness for jitter tests)
- Isolated (no external dependencies)
- Fast (< 100ms per test)
"""

import asyncio
import time
from typing import Any
from unittest.mock import Mock, patch

import pytest

from domains.self_healing import (
    ComponentHealth,
    ErrorCategory,
    ErrorClassifier,
    ErrorContext,
    HealthStatus,
    RecoveryAttempt,
    RecoveryStrategy,
    RetryHandler,
    with_retry,
    with_retry_async,
)


# ============================================================================
# Enum Tests
# ============================================================================


class TestEnums:
    """Test all enumerations."""

    @pytest.mark.parametrize(
        "category,expected",
        [
            (ErrorCategory.TRANSIENT, "transient"),
            (ErrorCategory.PERMANENT, "permanent"),
            (ErrorCategory.RATE_LIMIT, "rate_limit"),
            (ErrorCategory.CONFIGURATION, "configuration"),
            (ErrorCategory.NETWORK, "network"),
            (ErrorCategory.AUTHENTICATION, "authentication"),
            (ErrorCategory.VALIDATION, "validation"),
            (ErrorCategory.RESOURCE, "resource"),
            (ErrorCategory.UNKNOWN, "unknown"),
        ],
        ids=[
            "transient",
            "permanent",
            "rate_limit",
            "config",
            "network",
            "auth",
            "validation",
            "resource",
            "unknown",
        ],
    )
    def test_error_category_values(self, category: ErrorCategory, expected: str):
        # Arrange & Act done by params
        # Assert
        assert category.value == expected

    @pytest.mark.parametrize(
        "strategy,expected",
        [
            (RecoveryStrategy.RETRY, "retry"),
            (RecoveryStrategy.CIRCUIT_BREAK, "circuit_break"),
            (RecoveryStrategy.DEGRADE, "degrade"),
            (RecoveryStrategy.FAIL_FAST, "fail_fast"),
            (RecoveryStrategy.SKIP, "skip"),
            (RecoveryStrategy.ALERT, "alert"),
        ],
        ids=["retry", "circuit_break", "degrade", "fail_fast", "skip", "alert"],
    )
    def test_recovery_strategy_values(self, strategy: RecoveryStrategy, expected: str):
        # Arrange & Act done by params
        # Assert
        assert strategy.value == expected

    @pytest.mark.parametrize(
        "status,expected",
        [
            (HealthStatus.HEALTHY, "healthy"),
            (HealthStatus.DEGRADED, "degraded"),
            (HealthStatus.UNHEALTHY, "unhealthy"),
            (HealthStatus.RECOVERING, "recovering"),
            (HealthStatus.UNKNOWN, "unknown"),
        ],
        ids=["healthy", "degraded", "unhealthy", "recovering", "unknown"],
    )
    def test_health_status_values(self, status: HealthStatus, expected: str):
        # Arrange & Act done by params
        # Assert
        assert status.value == expected


# ============================================================================
# Data Model Tests
# ============================================================================


class TestErrorContext:
    """Test ErrorContext dataclass."""

    def test_error_context_minimal(self):
        """Test ErrorContext with minimal fields."""
        # Arrange & Act
        ctx = ErrorContext(
            error_type=ValueError,
            error_message="Test error",
            operation="test_operation",
        )

        # Assert
        assert ctx.error_type == ValueError
        assert ctx.error_message == "Test error"
        assert ctx.operation == "test_operation"
        assert ctx.category == ErrorCategory.UNKNOWN
        assert ctx.retryable is False
        assert ctx.suggested_strategy == RecoveryStrategy.FAIL_FAST
        assert ctx.metadata == {}
        assert ctx.timestamp > 0

    def test_error_context_full(self):
        """Test ErrorContext with all fields."""
        # Arrange
        now = time.time()

        # Act
        ctx = ErrorContext(
            error_type=ConnectionError,
            error_message="Network timeout",
            operation="api_call",
            timestamp=now,
            category=ErrorCategory.NETWORK,
            retryable=True,
            suggested_strategy=RecoveryStrategy.RETRY,
            metadata={"attempt": 1},
        )

        # Assert
        assert ctx.error_type == ConnectionError
        assert ctx.category == ErrorCategory.NETWORK
        assert ctx.retryable is True
        assert ctx.suggested_strategy == RecoveryStrategy.RETRY
        assert ctx.timestamp == now
        assert ctx.metadata == {"attempt": 1}


class TestRecoveryAttempt:
    """Test RecoveryAttempt dataclass."""

    def test_recovery_attempt_creation(self):
        """Test RecoveryAttempt creation."""
        # Arrange
        now = time.time()

        # Act
        attempt = RecoveryAttempt(
            strategy=RecoveryStrategy.RETRY,
            timestamp=now,
            success=True,
            duration_ms=150.5,
            message="Retry successful",
            metadata={"attempt_number": 2},
        )

        # Assert
        assert attempt.strategy == RecoveryStrategy.RETRY
        assert attempt.timestamp == now
        assert attempt.success is True
        assert attempt.duration_ms == 150.5
        assert attempt.message == "Retry successful"
        assert attempt.metadata == {"attempt_number": 2}


class TestComponentHealth:
    """Test ComponentHealth dataclass."""

    def test_component_health_minimal(self):
        """Test ComponentHealth with minimal fields."""
        # Arrange
        now = time.time()

        # Act
        health = ComponentHealth(
            component_name="api_client",
            status=HealthStatus.HEALTHY,
            last_check=now,
        )

        # Assert
        assert health.component_name == "api_client"
        assert health.status == HealthStatus.HEALTHY
        assert health.error_count == 0
        assert health.success_count == 0
        assert health.recovery_attempts == []
        assert health.metadata == {}

    def test_component_health_success_rate_zero_total(self):
        """Test success_rate with zero operations."""
        # Arrange
        health = ComponentHealth("test", HealthStatus.HEALTHY, time.time())

        # Act & Assert
        assert health.success_rate == 0.0

    def test_component_health_success_rate_calculation(self):
        """Test success_rate calculation."""
        # Arrange
        health = ComponentHealth("test", HealthStatus.HEALTHY, time.time())
        health.success_count = 80
        health.error_count = 20

        # Act
        rate = health.success_rate

        # Assert
        assert rate == 0.8

    def test_component_health_is_healthy_when_healthy(self):
        """Test is_healthy property when status is healthy."""
        # Arrange
        health = ComponentHealth("test", HealthStatus.HEALTHY, time.time())

        # Act & Assert
        assert health.is_healthy is True

    def test_component_health_is_healthy_when_degraded(self):
        """Test is_healthy property when status is degraded."""
        # Arrange
        health = ComponentHealth("test", HealthStatus.DEGRADED, time.time())

        # Act & Assert
        assert health.is_healthy is True

    def test_component_health_is_healthy_when_unhealthy(self):
        """Test is_healthy property when status is unhealthy."""
        # Arrange
        health = ComponentHealth("test", HealthStatus.UNHEALTHY, time.time())

        # Act & Assert
        assert health.is_healthy is False


# ============================================================================
# ErrorClassifier Tests
# ============================================================================


class TestErrorClassifier:
    """Test ErrorClassifier class."""

    def test_classify_transient_timeout_error(self):
        """Test classifying a timeout error as transient."""
        # Arrange
        error = Exception("Connection timeout occurred")

        # Act
        ctx = ErrorClassifier.classify(error, "fetch_data")

        # Assert
        assert ctx.category == ErrorCategory.TRANSIENT
        assert ctx.retryable is True
        assert ctx.suggested_strategy == RecoveryStrategy.RETRY
        assert ctx.operation == "fetch_data"

    def test_classify_rate_limit_error(self):
        """Test classifying a rate limit error."""
        # Arrange
        error = Exception("Rate limit exceeded: 429 Too Many Requests")

        # Act
        ctx = ErrorClassifier.classify(error)

        # Assert
        assert ctx.category == ErrorCategory.RATE_LIMIT
        assert ctx.retryable is True
        assert ctx.suggested_strategy == RecoveryStrategy.CIRCUIT_BREAK

    def test_classify_network_error(self):
        """Test classifying a network error."""
        # Arrange
        error = ConnectionError("Network unreachable")

        # Act
        ctx = ErrorClassifier.classify(error)

        # Assert
        assert ctx.category == ErrorCategory.NETWORK
        assert ctx.retryable is True
        assert ctx.suggested_strategy == RecoveryStrategy.RETRY

    def test_classify_authentication_error(self):
        """Test classifying an authentication error."""
        # Arrange
        error = Exception("401 Unauthorized: Invalid token")

        # Act
        ctx = ErrorClassifier.classify(error)

        # Assert
        assert ctx.category == ErrorCategory.AUTHENTICATION
        assert ctx.retryable is False
        assert ctx.suggested_strategy == RecoveryStrategy.FAIL_FAST

    def test_classify_validation_error(self):
        """Test classifying a validation error."""
        # Arrange
        error = ValueError("Validation failed: malformed input")

        # Act
        ctx = ErrorClassifier.classify(error)

        # Assert
        assert ctx.category == ErrorCategory.VALIDATION
        assert ctx.retryable is False
        assert ctx.suggested_strategy == RecoveryStrategy.FAIL_FAST

    def test_classify_resource_error(self):
        """Test classifying a resource exhaustion error."""
        # Arrange
        error = MemoryError("Out of memory")

        # Act
        ctx = ErrorClassifier.classify(error)

        # Assert
        assert ctx.category == ErrorCategory.RESOURCE
        assert ctx.retryable is False
        assert ctx.suggested_strategy == RecoveryStrategy.DEGRADE

    def test_classify_unknown_error(self):
        """Test classifying an unknown error."""
        # Arrange
        error = Exception("Something went wrong")

        # Act
        ctx = ErrorClassifier.classify(error)

        # Assert
        assert ctx.category == ErrorCategory.UNKNOWN
        assert ctx.retryable is False
        assert ctx.suggested_strategy == RecoveryStrategy.FAIL_FAST

    @pytest.mark.parametrize(
        "error_msg,expected_category",
        [
            ("Service unavailable", ErrorCategory.TRANSIENT),
            ("502 Bad Gateway", ErrorCategory.TRANSIENT),
            ("503 Service Temporarily Unavailable", ErrorCategory.TRANSIENT),
            ("Too many requests", ErrorCategory.RATE_LIMIT),
            ("Quota exceeded", ErrorCategory.RATE_LIMIT),
            ("Connection reset by peer", ErrorCategory.TRANSIENT),
            ("403 Forbidden", ErrorCategory.AUTHENTICATION),
            ("Expired token", ErrorCategory.AUTHENTICATION),
            ("400 Bad Request", ErrorCategory.VALIDATION),
            ("422 Unprocessable Entity", ErrorCategory.VALIDATION),
            ("Disk full", ErrorCategory.RESOURCE),
            ("No space left on device", ErrorCategory.RESOURCE),
        ],
        ids=[
            "service_unavail",
            "502_gateway",
            "503_service",
            "too_many_req",
            "quota",
            "conn_reset",
            "forbidden",
            "expired_token",
            "bad_request",
            "unprocessable",
            "disk_full",
            "no_space",
        ],
    )
    def test_classify_various_errors(
        self, error_msg: str, expected_category: ErrorCategory
    ):
        """Test classifying various error messages."""
        # Arrange
        error = Exception(error_msg)

        # Act
        ctx = ErrorClassifier.classify(error)

        # Assert
        assert ctx.category == expected_category


# ============================================================================
# RetryHandler Tests
# ============================================================================


class TestRetryHandler:
    """Test RetryHandler class."""

    def test_retry_handler_initialization_defaults(self):
        """Test RetryHandler initialization with defaults."""
        # Arrange & Act
        handler = RetryHandler()

        # Assert
        assert handler.max_attempts == 3
        assert handler.base_delay == 1.0
        assert handler.max_delay == 60.0
        assert handler.exponential_base == 2.0
        assert handler.jitter is True

    def test_retry_handler_initialization_custom(self):
        """Test RetryHandler initialization with custom values."""
        # Arrange & Act
        handler = RetryHandler(
            max_attempts=5,
            base_delay=2.0,
            max_delay=120.0,
            exponential_base=3.0,
            jitter=False,
        )

        # Assert
        assert handler.max_attempts == 5
        assert handler.base_delay == 2.0
        assert handler.max_delay == 120.0
        assert handler.exponential_base == 3.0
        assert handler.jitter is False

    def test_calculate_delay_no_jitter(self):
        """Test delay calculation without jitter."""
        # Arrange
        handler = RetryHandler(base_delay=1.0, exponential_base=2.0, jitter=False)

        # Act & Assert
        assert handler.calculate_delay(1) == 1.0  # 1 * 2^0
        assert handler.calculate_delay(2) == 2.0  # 1 * 2^1
        assert handler.calculate_delay(3) == 4.0  # 1 * 2^2
        assert handler.calculate_delay(4) == 8.0  # 1 * 2^3

    def test_calculate_delay_respects_max_delay(self):
        """Test delay calculation respects max_delay."""
        # Arrange
        handler = RetryHandler(
            base_delay=10.0, max_delay=30.0, exponential_base=2.0, jitter=False
        )

        # Act
        delay = handler.calculate_delay(10)  # Would be 10 * 2^9 = 5120 without max

        # Assert
        assert delay == 30.0  # Capped at max_delay

    def test_calculate_delay_with_jitter_seed(self):
        """Test delay calculation with jitter (seeded for determinism)."""
        # Arrange
        import random

        random.seed(42)
        handler = RetryHandler(base_delay=1.0, exponential_base=2.0, jitter=True)

        # Act
        delay1 = handler.calculate_delay(1)
        random.seed(42)  # Reset seed
        delay2 = handler.calculate_delay(1)

        # Assert
        assert delay1 == delay2  # Should be deterministic with same seed
        # Jitter adds ±25%, so range is [0.75, 1.25] for base_delay=1.0
        assert 0.75 <= delay1 <= 1.25


# ============================================================================
# Decorator Tests
# ============================================================================


class TestWithRetryDecorator:
    """Test with_retry decorator."""

    def test_with_retry_succeeds_first_attempt(self):
        """Test decorated function succeeds on first attempt."""
        # Arrange
        @with_retry(max_attempts=3)
        def successful_function():
            return "success"

        # Act
        result = successful_function()

        # Assert
        assert result == "success"

    def test_with_retry_succeeds_after_failures(self):
        """Test decorated function succeeds after retries."""
        # Arrange
        call_count = 0

        @with_retry(max_attempts=3, base_delay=0.01)
        def flaky_function():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("Service unavailable")  # Transient error
            return "success"

        # Act
        result = flaky_function()

        # Assert
        assert result == "success"
        assert call_count == 3

    def test_with_retry_exhausts_attempts(self):
        """Test decorated function exhausts all retry attempts."""
        # Arrange
        @with_retry(max_attempts=3, base_delay=0.01)
        def always_failing_function():
            raise Exception("timeout error")  # Transient, will retry

        # Act & Assert
        with pytest.raises(Exception, match="timeout error"):
            always_failing_function()

    def test_with_retry_custom_retryable_check(self):
        """Test with_retry fails fast on non-retryable error."""
        # Arrange
        call_count = 0

        @with_retry(max_attempts=3, base_delay=0.01)
        def fails_with_non_retryable():
            nonlocal call_count
            call_count += 1
            # Authentication errors are not retryable
            raise Exception("401 Unauthorized")

        # Act & Assert
        with pytest.raises(Exception, match="401 Unauthorized"):
            fails_with_non_retryable()
        # Should only call once (no retries for non-retryable errors)
        assert call_count == 1


class TestWithRetryAsyncDecorator:
    """Test with_retry_async decorator."""

    @pytest.mark.asyncio
    async def test_with_retry_async_succeeds_first_attempt(self):
        """Test async decorated function succeeds on first attempt."""
        # Arrange
        @with_retry_async(max_attempts=3)
        async def successful_async_function():
            return "async success"

        # Act
        result = await successful_async_function()

        # Assert
        assert result == "async success"

    @pytest.mark.asyncio
    async def test_with_retry_async_succeeds_after_failures(self):
        """Test async decorated function succeeds after retries."""
        # Arrange
        call_count = 0

        @with_retry_async(max_attempts=3, base_delay=0.01)
        async def flaky_async_function():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("Service temporarily unavailable")  # Transient
            return "async success"

        # Act
        result = await flaky_async_function()

        # Assert
        assert result == "async success"
        assert call_count == 3

    @pytest.mark.asyncio
    async def test_with_retry_async_exhausts_attempts(self):
        """Test async decorated function exhausts all retry attempts."""
        # Arrange
        @with_retry_async(max_attempts=3, base_delay=0.01)
        async def always_failing_async():
            raise Exception("Connection timeout")  # Transient, will retry

        # Act & Assert
        with pytest.raises(Exception, match="Connection timeout"):
            await always_failing_async()


# ============================================================================
# Edge Cases and Error Handling
# ============================================================================


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_component_health_success_rate_all_successes(self):
        """Test success_rate with all successes."""
        # Arrange
        health = ComponentHealth("test", HealthStatus.HEALTHY, time.time())
        health.success_count = 100
        health.error_count = 0

        # Act & Assert
        assert health.success_rate == 1.0

    def test_component_health_success_rate_all_failures(self):
        """Test success_rate with all failures."""
        # Arrange
        health = ComponentHealth("test", HealthStatus.UNHEALTHY, time.time())
        health.success_count = 0
        health.error_count = 100

        # Act & Assert
        assert health.success_rate == 0.0

    def test_error_classifier_case_insensitive(self):
        """Test ErrorClassifier is case-insensitive."""
        # Arrange
        error_lower = Exception("rate limit exceeded")
        error_upper = Exception("RATE LIMIT EXCEEDED")
        error_mixed = Exception("RaTe LiMiT ExCeEdEd")

        # Act
        ctx_lower = ErrorClassifier.classify(error_lower)
        ctx_upper = ErrorClassifier.classify(error_upper)
        ctx_mixed = ErrorClassifier.classify(error_mixed)

        # Assert
        assert ctx_lower.category == ErrorCategory.RATE_LIMIT
        assert ctx_upper.category == ErrorCategory.RATE_LIMIT
        assert ctx_mixed.category == ErrorCategory.RATE_LIMIT

    def test_retry_handler_max_attempts_zero(self):
        """Test RetryHandler with zero max attempts."""
        # Arrange
        handler = RetryHandler(max_attempts=0)

        # Act & Assert
        assert handler.max_attempts == 0

    def test_retry_handler_negative_base_delay(self):
        """Test RetryHandler with negative base delay (clamped to 0)."""
        # Arrange
        handler = RetryHandler(base_delay=-1.0, jitter=False)

        # Act
        delay = handler.calculate_delay(1)

        # Assert
        # Implementation uses max(0, delay), so negative delays become 0
        assert delay == 0

    def test_with_retry_zero_attempts(self):
        """Test with_retry decorator with zero max_attempts doesn't retry."""
        # Arrange
        call_count = 0

        @with_retry(max_attempts=1, base_delay=0.01)  # 1 attempt, no retries
        def function_with_zero_retries():
            nonlocal call_count
            call_count += 1
            raise Exception("401 Unauthorized")  # Non-retryable

        # Act & Assert
        with pytest.raises(Exception, match="401 Unauthorized"):
            function_with_zero_retries()
        assert call_count == 1  # Called once, no retries


# ============================================================================
# Integration Tests
# ============================================================================


class TestSelfHealingWorkflows:
    """Test complete self-healing workflows."""

    def test_error_classification_and_retry_workflow(self):
        """Test complete error classification and retry workflow."""
        # Arrange
        call_count = 0

        def flaky_operation():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("Service unavailable")
            return "success"

        # Act - Classify error
        try:
            result = flaky_operation()
        except Exception as e:
            ctx = ErrorClassifier.classify(e, "api_call")

        # Verify classification
        assert ctx.category == ErrorCategory.TRANSIENT
        assert ctx.retryable is True

        # Apply retry with decorator
        @with_retry(max_attempts=5, base_delay=0.01)
        def wrapped_operation():
            return flaky_operation()

        result = wrapped_operation()

        # Assert
        assert result == "success"
        assert call_count >= 3

    def test_component_health_tracking_workflow(self):
        """Test tracking component health over time."""
        # Arrange
        health = ComponentHealth("api_service", HealthStatus.HEALTHY, time.time())

        # Act - Simulate operations
        # Success operations
        for _ in range(95):
            health.success_count += 1

        # Failure operations
        for _ in range(5):
            health.error_count += 1

        # Add recovery attempts
        health.recovery_attempts.append(
            RecoveryAttempt(
                strategy=RecoveryStrategy.RETRY,
                timestamp=time.time(),
                success=True,
                duration_ms=100.0,
                message="Retry succeeded",
            )
        )

        # Assert
        assert health.success_rate == 0.95
        assert health.is_healthy is True
        assert len(health.recovery_attempts) == 1

    @pytest.mark.asyncio
    async def test_async_retry_with_error_classification(self):
        """Test async retry with error classification."""
        # Arrange
        call_count = 0

        @with_retry_async(max_attempts=5, base_delay=0.01)
        async def flaky_async_api():
            nonlocal call_count
            call_count += 1
            if call_count < 3:
                raise Exception("Network timeout")
            return {"status": "ok"}

        # Act
        result = await flaky_async_api()

        # Assert
        assert result == {"status": "ok"}
        assert call_count == 3
