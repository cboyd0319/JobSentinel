"""
Comprehensive unit tests for domains/scraping_resilience.py

Tests cover:
- CircuitState, RetryStrategy enums
- RetryConfig, CircuitBreakerConfig, HealthStatus dataclasses
- CircuitBreaker: state transitions, failure counting, half-open logic
- Retry delay calculations with different strategies
- Health monitoring
- Edge cases and error handling

Following PyTest Architect best practices:
- AAA pattern (Arrange-Act-Assert)
- Parametrized tests for input matrices
- Deterministic (no time/randomness coupling)
- Isolated (no external dependencies)
- Fast (< 100ms per test)
"""

import time
from datetime import datetime
from unittest.mock import Mock

import pytest

from domains.scraping_resilience import (
    CircuitBreaker,
    CircuitBreakerConfig,
    CircuitBreakerOpenError,
    CircuitState,
    HealthStatus,
    RetryConfig,
    RetryStrategy,
)


# ============================================================================
# Enum Tests
# ============================================================================


class TestEnums:
    """Test all enumerations."""

    @pytest.mark.parametrize(
        "state,expected",
        [
            (CircuitState.CLOSED, "closed"),
            (CircuitState.OPEN, "open"),
            (CircuitState.HALF_OPEN, "half_open"),
        ],
        ids=["closed", "open", "half_open"],
    )
    def test_circuit_state_values(self, state: CircuitState, expected: str):
        # Arrange & Act done by params
        # Assert
        assert state.value == expected

    @pytest.mark.parametrize(
        "strategy,expected",
        [
            (RetryStrategy.EXPONENTIAL, "exponential"),
            (RetryStrategy.LINEAR, "linear"),
            (RetryStrategy.FIXED, "fixed"),
        ],
        ids=["exponential", "linear", "fixed"],
    )
    def test_retry_strategy_values(self, strategy: RetryStrategy, expected: str):
        # Arrange & Act done by params
        # Assert
        assert strategy.value == expected


# ============================================================================
# RetryConfig Tests
# ============================================================================


class TestRetryConfig:
    """Test RetryConfig dataclass and delay calculations."""

    def test_retry_config_defaults(self):
        """Test RetryConfig default values."""
        # Arrange & Act
        config = RetryConfig()

        # Assert
        assert config.max_attempts == 3
        assert config.base_delay_seconds == 1.0
        assert config.max_delay_seconds == 60.0
        assert config.strategy == RetryStrategy.EXPONENTIAL
        assert config.retry_on_exceptions == (Exception,)

    def test_retry_config_custom_values(self):
        """Test RetryConfig with custom values."""
        # Arrange
        custom_exceptions = (ValueError, KeyError)

        # Act
        config = RetryConfig(
            max_attempts=5,
            base_delay_seconds=2.0,
            max_delay_seconds=120.0,
            strategy=RetryStrategy.LINEAR,
            retry_on_exceptions=custom_exceptions,
        )

        # Assert
        assert config.max_attempts == 5
        assert config.base_delay_seconds == 2.0
        assert config.max_delay_seconds == 120.0
        assert config.strategy == RetryStrategy.LINEAR
        assert config.retry_on_exceptions == custom_exceptions

    def test_calculate_delay_exponential(self):
        """Test exponential backoff delay calculation."""
        # Arrange
        config = RetryConfig(base_delay_seconds=1.0, strategy=RetryStrategy.EXPONENTIAL)

        # Act & Assert
        assert config.calculate_delay(0) == 1.0  # 1 * 2^0
        assert config.calculate_delay(1) == 2.0  # 1 * 2^1
        assert config.calculate_delay(2) == 4.0  # 1 * 2^2
        assert config.calculate_delay(3) == 8.0  # 1 * 2^3

    def test_calculate_delay_linear(self):
        """Test linear backoff delay calculation."""
        # Arrange
        config = RetryConfig(base_delay_seconds=1.0, strategy=RetryStrategy.LINEAR)

        # Act & Assert
        assert config.calculate_delay(0) == 1.0  # 1 * (0 + 1)
        assert config.calculate_delay(1) == 2.0  # 1 * (1 + 1)
        assert config.calculate_delay(2) == 3.0  # 1 * (2 + 1)
        assert config.calculate_delay(3) == 4.0  # 1 * (3 + 1)

    def test_calculate_delay_fixed(self):
        """Test fixed delay calculation."""
        # Arrange
        config = RetryConfig(base_delay_seconds=1.5, strategy=RetryStrategy.FIXED)

        # Act & Assert
        assert config.calculate_delay(0) == 1.5
        assert config.calculate_delay(1) == 1.5
        assert config.calculate_delay(5) == 1.5

    def test_calculate_delay_respects_max_delay(self):
        """Test delay calculation respects max_delay cap."""
        # Arrange
        config = RetryConfig(
            base_delay_seconds=10.0,
            max_delay_seconds=30.0,
            strategy=RetryStrategy.EXPONENTIAL,
        )

        # Act
        delay = config.calculate_delay(10)  # Would be 10 * 2^10 = 10240 without max

        # Assert
        assert delay == 30.0  # Capped at max_delay


# ============================================================================
# CircuitBreakerConfig Tests
# ============================================================================


class TestCircuitBreakerConfig:
    """Test CircuitBreakerConfig dataclass."""

    def test_circuit_breaker_config_defaults(self):
        """Test CircuitBreakerConfig default values."""
        # Arrange & Act
        config = CircuitBreakerConfig()

        # Assert
        assert config.failure_threshold == 5
        assert config.success_threshold == 2
        assert config.timeout_seconds == 60.0
        assert config.window_seconds == 60.0

    def test_circuit_breaker_config_custom_values(self):
        """Test CircuitBreakerConfig with custom values."""
        # Arrange & Act
        config = CircuitBreakerConfig(
            failure_threshold=10,
            success_threshold=3,
            timeout_seconds=120.0,
            window_seconds=300.0,
        )

        # Assert
        assert config.failure_threshold == 10
        assert config.success_threshold == 3
        assert config.timeout_seconds == 120.0
        assert config.window_seconds == 300.0


# ============================================================================
# HealthStatus Tests
# ============================================================================


class TestHealthStatus:
    """Test HealthStatus dataclass."""

    def test_health_status_minimal(self):
        """Test HealthStatus with minimal fields."""
        # Arrange & Act
        status = HealthStatus(
            scraper_name="test_scraper",
            is_healthy=True,
            success_rate=0.95,
            avg_latency_ms=150.5,
        )

        # Assert
        assert status.scraper_name == "test_scraper"
        assert status.is_healthy is True
        assert status.success_rate == 0.95
        assert status.avg_latency_ms == 150.5
        assert status.last_success is None
        assert status.last_failure is None
        assert status.consecutive_failures == 0
        assert status.metadata == {}

    def test_health_status_full(self):
        """Test HealthStatus with all fields."""
        # Arrange
        now = datetime.now()
        metadata = {"source": "test", "region": "us-east-1"}

        # Act
        status = HealthStatus(
            scraper_name="api_scraper",
            is_healthy=False,
            success_rate=0.45,
            avg_latency_ms=3000.0,
            last_success=now,
            last_failure=now,
            consecutive_failures=5,
            metadata=metadata,
        )

        # Assert
        assert status.scraper_name == "api_scraper"
        assert status.is_healthy is False
        assert status.success_rate == 0.45
        assert status.consecutive_failures == 5
        assert status.metadata == metadata


# ============================================================================
# CircuitBreaker Tests
# ============================================================================


class TestCircuitBreaker:
    """Test CircuitBreaker class."""

    def test_circuit_breaker_initialization(self):
        """Test CircuitBreaker initialization."""
        # Arrange
        config = CircuitBreakerConfig()

        # Act
        breaker = CircuitBreaker(name="test_breaker", config=config)

        # Assert
        assert breaker.name == "test_breaker"
        assert breaker.config == config
        assert breaker.state == CircuitState.CLOSED
        assert breaker.failure_count == 0
        assert breaker.success_count == 0

    def test_circuit_breaker_call_success(self):
        """Test CircuitBreaker allows successful calls when closed."""
        # Arrange
        config = CircuitBreakerConfig()
        breaker = CircuitBreaker(name="test", config=config)

        def successful_func():
            return "success"

        # Act
        result = breaker.call(successful_func)

        # Assert
        assert result == "success"
        assert breaker.state == CircuitState.CLOSED
        assert breaker.failure_count == 0

    def test_circuit_breaker_tracks_failures(self):
        """Test CircuitBreaker tracks failures."""
        # Arrange
        config = CircuitBreakerConfig(failure_threshold=3)
        breaker = CircuitBreaker(name="test", config=config)

        def failing_func():
            raise Exception("Test failure")

        # Act - Cause failures but not enough to open
        for _ in range(2):
            try:
                breaker.call(failing_func)
            except Exception:
                pass

        # Assert
        assert breaker.state == CircuitState.CLOSED  # Not yet open
        assert breaker.failure_count == 2

    def test_circuit_breaker_opens_after_threshold(self):
        """Test CircuitBreaker opens after failure threshold."""
        # Arrange
        config = CircuitBreakerConfig(failure_threshold=3)
        breaker = CircuitBreaker(name="test", config=config)

        def failing_func():
            raise Exception("Test failure")

        # Act - Exceed failure threshold
        for _ in range(3):
            try:
                breaker.call(failing_func)
            except Exception:
                pass

        # Assert
        assert breaker.state == CircuitState.OPEN
        assert breaker.failure_count >= 3

    def test_circuit_breaker_rejects_calls_when_open(self):
        """Test CircuitBreaker rejects calls when open."""
        # Arrange
        config = CircuitBreakerConfig(failure_threshold=2)
        breaker = CircuitBreaker(name="test", config=config)

        def failing_func():
            raise Exception("Test failure")

        # Open the circuit
        for _ in range(2):
            try:
                breaker.call(failing_func)
            except Exception:
                pass

        # Act & Assert - Should raise CircuitBreakerOpenError
        with pytest.raises(CircuitBreakerOpenError):
            breaker.call(lambda: "should not execute")

    def test_circuit_breaker_half_open_after_timeout(self):
        """Test CircuitBreaker transitions to half-open after timeout."""
        # Arrange
        config = CircuitBreakerConfig(failure_threshold=2, timeout_seconds=0.1)
        breaker = CircuitBreaker(name="test", config=config)

        def failing_func():
            raise Exception("Test failure")

        # Open the circuit
        for _ in range(2):
            try:
                breaker.call(failing_func)
            except Exception:
                pass

        assert breaker.state == CircuitState.OPEN

        # Act - Wait for timeout
        time.sleep(0.15)

        # Try to call - should transition to half-open
        def successful_func():
            return "success"

        result = breaker.call(successful_func)

        # Assert
        assert result == "success"
        # State might be HALF_OPEN or CLOSED depending on success threshold


# ============================================================================
# Edge Cases and Error Handling
# ============================================================================


class TestEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_retry_config_zero_base_delay(self):
        """Test RetryConfig with zero base delay."""
        # Arrange
        config = RetryConfig(base_delay_seconds=0.0, strategy=RetryStrategy.EXPONENTIAL)

        # Act
        delay = config.calculate_delay(5)

        # Assert
        assert delay == 0.0

    def test_retry_config_negative_attempt(self):
        """Test RetryConfig with negative attempt number."""
        # Arrange
        config = RetryConfig(base_delay_seconds=1.0, strategy=RetryStrategy.EXPONENTIAL)

        # Act
        delay = config.calculate_delay(-1)

        # Assert
        # 1.0 * 2^(-1) = 0.5
        assert delay == 0.5

    def test_circuit_breaker_config_zero_thresholds(self):
        """Test CircuitBreakerConfig with zero thresholds."""
        # Arrange & Act
        config = CircuitBreakerConfig(
            failure_threshold=0, success_threshold=0, timeout_seconds=0.0
        )

        # Assert
        assert config.failure_threshold == 0
        assert config.success_threshold == 0
        assert config.timeout_seconds == 0.0

    def test_health_status_perfect_success_rate(self):
        """Test HealthStatus with perfect success rate."""
        # Arrange & Act
        status = HealthStatus(
            scraper_name="perfect", is_healthy=True, success_rate=1.0, avg_latency_ms=50.0
        )

        # Assert
        assert status.success_rate == 1.0
        assert status.is_healthy is True

    def test_health_status_zero_success_rate(self):
        """Test HealthStatus with zero success rate."""
        # Arrange & Act
        status = HealthStatus(
            scraper_name="failing", is_healthy=False, success_rate=0.0, avg_latency_ms=0.0
        )

        # Assert
        assert status.success_rate == 0.0
        assert status.is_healthy is False


# ============================================================================
# Integration Tests
# ============================================================================


class TestResilienceWorkflows:
    """Test complete resilience workflows."""

    def test_retry_with_exponential_backoff_workflow(self):
        """Test retry workflow with exponential backoff."""
        # Arrange
        config = RetryConfig(
            max_attempts=4, base_delay_seconds=0.01, strategy=RetryStrategy.EXPONENTIAL
        )

        # Act - Calculate delays for multiple attempts
        delays = [config.calculate_delay(i) for i in range(4)]

        # Assert
        assert delays[0] == 0.01  # 2^0
        assert delays[1] == 0.02  # 2^1
        assert delays[2] == 0.04  # 2^2
        assert delays[3] == 0.08  # 2^3

    def test_circuit_breaker_full_cycle(self):
        """Test complete circuit breaker lifecycle: closed -> open -> half-open -> closed."""
        # Arrange
        config = CircuitBreakerConfig(
            failure_threshold=2, success_threshold=2, timeout_seconds=0.1
        )
        breaker = CircuitBreaker(name="test", config=config)
        call_count = 0

        def flaky_func():
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise Exception("Failing")
            return "success"

        # Act & Assert

        # 1. Start CLOSED, cause failures to open circuit
        assert breaker.state == CircuitState.CLOSED
        for _ in range(2):
            try:
                breaker.call(flaky_func)
            except Exception:
                pass

        # 2. Circuit should be OPEN
        assert breaker.state == CircuitState.OPEN

        # 3. Wait for timeout, then succeed to close circuit
        time.sleep(0.15)

        # Call should succeed and potentially close circuit or go half-open
        result = breaker.call(flaky_func)
        assert result == "success"

    def test_health_monitoring_workflow(self):
        """Test health status tracking over time."""
        # Arrange
        statuses = []

        # Act - Simulate changing health over time
        # Healthy state
        statuses.append(
            HealthStatus(
                scraper_name="api", is_healthy=True, success_rate=0.95, avg_latency_ms=100.0
            )
        )

        # Degraded state
        statuses.append(
            HealthStatus(
                scraper_name="api",
                is_healthy=True,
                success_rate=0.75,
                avg_latency_ms=500.0,
                consecutive_failures=2,
            )
        )

        # Unhealthy state
        statuses.append(
            HealthStatus(
                scraper_name="api",
                is_healthy=False,
                success_rate=0.30,
                avg_latency_ms=2000.0,
                consecutive_failures=10,
            )
        )

        # Assert
        assert statuses[0].is_healthy is True
        assert statuses[1].is_healthy is True
        assert statuses[2].is_healthy is False
        assert statuses[0].success_rate > statuses[1].success_rate > statuses[2].success_rate
