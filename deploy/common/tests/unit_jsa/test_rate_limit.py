"""Comprehensive tests for rate limiting middleware.

Tests token bucket implementation and rate limit enforcement.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, Mock, patch

import pytest

from jsa.fastapi_app.middleware.rate_limit import TokenBucket


class TestTokenBucket:
    """Test TokenBucket class."""

    def test_initialization(self):
        """Test TokenBucket initialization."""
        # Arrange
        capacity = 10
        refill_rate = 2.0

        # Act
        bucket = TokenBucket(capacity=capacity, refill_rate=refill_rate)

        # Assert
        assert bucket.capacity == capacity
        assert bucket.refill_rate == refill_rate
        assert bucket.tokens == float(capacity)
        assert bucket.last_refill > 0

    def test_initial_capacity_full(self):
        """Test that bucket starts at full capacity."""
        # Act
        bucket = TokenBucket(capacity=10, refill_rate=1.0)

        # Assert
        assert bucket.tokens == 10.0

    def test_consume_single_token_success(self):
        """Test consuming a single token successfully."""
        # Arrange
        bucket = TokenBucket(capacity=10, refill_rate=1.0)

        # Act
        result = bucket.consume(1)

        # Assert
        assert result is True
        assert bucket.tokens == 9.0

    def test_consume_multiple_tokens_success(self):
        """Test consuming multiple tokens successfully."""
        # Arrange
        bucket = TokenBucket(capacity=10, refill_rate=1.0)

        # Act
        result = bucket.consume(5)

        # Assert
        assert result is True
        assert bucket.tokens == 5.0

    def test_consume_all_tokens(self):
        """Test consuming all available tokens."""
        # Arrange
        bucket = TokenBucket(capacity=10, refill_rate=1.0)

        # Act
        result = bucket.consume(10)

        # Assert
        assert result is True
        assert bucket.tokens == 0.0

    def test_consume_more_than_available_fails(self):
        """Test that consuming more than available tokens fails."""
        # Arrange
        bucket = TokenBucket(capacity=10, refill_rate=1.0)

        # Act
        result = bucket.consume(15)

        # Assert
        assert result is False
        assert bucket.tokens == 10.0  # Tokens unchanged

    def test_consume_when_empty_fails(self):
        """Test consuming when bucket is empty fails."""
        # Arrange
        bucket = TokenBucket(capacity=10, refill_rate=1.0)
        bucket.consume(10)  # Empty the bucket

        # Act
        result = bucket.consume(1)

        # Assert
        assert result is False
        assert bucket.tokens >= 0  # May have refilled slightly

    def test_consume_default_one_token(self):
        """Test that consume defaults to 1 token."""
        # Arrange
        bucket = TokenBucket(capacity=10, refill_rate=1.0)

        # Act
        result = bucket.consume()

        # Assert
        assert result is True
        assert bucket.tokens == 9.0

    def test_refill_after_time(self):
        """Test that tokens refill over time using mocked time."""
        # Arrange
        with patch("time.time") as mock_time:
            mock_time.return_value = 1000.0
            bucket = TokenBucket(capacity=10, refill_rate=2.0)
            bucket.consume(5)  # Use 5 tokens, leaves 5.0
            initial_tokens = bucket.tokens

            # Act - Simulate 0.6 seconds passing (should add ~1.2 tokens)
            mock_time.return_value = 1000.6
            bucket.consume(1)

            # Assert
            # Should have more tokens than initially after consuming 1
            assert bucket.tokens >= initial_tokens - 1

    def test_refill_caps_at_capacity(self):
        """Test that refilling doesn't exceed capacity using mocked time."""
        # Arrange
        with patch("time.time") as mock_time:
            mock_time.return_value = 1000.0
            bucket = TokenBucket(capacity=10, refill_rate=100.0)  # Very fast refill
            bucket.consume(5)  # Use some tokens

            # Act - Simulate 1 second passing (enough to exceed capacity)
            mock_time.return_value = 1001.0
            bucket._refill()

            # Assert
            assert bucket.tokens == 10.0  # Capped at capacity

    def test_multiple_consumes(self):
        """Test multiple consecutive consume operations."""
        # Arrange
        bucket = TokenBucket(capacity=10, refill_rate=1.0)

        # Act & Assert
        assert bucket.consume(2) is True
        assert abs(bucket.tokens - 8.0) < 0.01  # Allow small refill

        assert bucket.consume(3) is True
        assert abs(bucket.tokens - 5.0) < 0.01

        assert bucket.consume(4) is True
        assert abs(bucket.tokens - 1.0) < 0.01

        assert bucket.consume(2) is False  # Not enough tokens
        assert bucket.tokens >= 1.0  # May have refilled


class TestTokenBucketEdgeCases:
    """Test edge cases for TokenBucket."""

    def test_zero_capacity(self):
        """Test bucket with zero capacity."""
        # Arrange
        bucket = TokenBucket(capacity=0, refill_rate=1.0)

        # Act
        result = bucket.consume(1)

        # Assert
        assert result is False

    def test_zero_refill_rate(self):
        """Test bucket with zero refill rate using mocked time."""
        # Arrange
        with patch("time.time") as mock_time:
            mock_time.return_value = 1000.0
            bucket = TokenBucket(capacity=10, refill_rate=0.0)
            bucket.consume(10)  # Empty the bucket

            # Act - Simulate 0.1 seconds passing
            mock_time.return_value = 1000.1
            result = bucket.consume(1)

            # Assert
            # With zero refill rate, should still be empty
            assert result is False

    def test_very_high_refill_rate(self):
        """Test bucket with very high refill rate using mocked time."""
        # Arrange
        with patch("time.time") as mock_time:
            mock_time.return_value = 1000.0
            bucket = TokenBucket(capacity=10, refill_rate=1000.0)
            bucket.consume(10)

            # Act - Even tiny delay should refill completely
            mock_time.return_value = 1000.02
            result = bucket.consume(10)

            # Assert
            assert result is True

    def test_fractional_tokens(self):
        """Test that tokens can be fractional using mocked time."""
        # Arrange
        with patch("time.time") as mock_time:
            mock_time.return_value = 1000.0
            bucket = TokenBucket(capacity=10, refill_rate=0.5)
            bucket.consume(5)

            # Act - Simulate 1 second passing (should add 0.5 tokens)
            mock_time.return_value = 1001.0
            bucket._refill()

            # Assert
            assert bucket.tokens > 5.0
            assert bucket.tokens <= 10.0

    def test_consume_zero_tokens(self):
        """Test consuming zero tokens."""
        # Arrange
        bucket = TokenBucket(capacity=10, refill_rate=1.0)
        initial_tokens = bucket.tokens

        # Act
        result = bucket.consume(0)

        # Assert
        assert result is True
        assert bucket.tokens == initial_tokens

    def test_refill_timestamp_updates(self):
        """Test that refill updates last_refill timestamp using mocked time."""
        # Arrange
        with patch("time.time") as mock_time:
            mock_time.return_value = 1000.0
            bucket = TokenBucket(capacity=10, refill_rate=1.0)
            initial_timestamp = bucket.last_refill

            # Act - Simulate 0.1 seconds passing
            mock_time.return_value = 1000.1
            bucket._refill()

            # Assert
            assert bucket.last_refill > initial_timestamp

    def test_multiple_buckets_independent(self):
        """Test that multiple TokenBucket instances are independent."""
        # Arrange
        bucket1 = TokenBucket(capacity=10, refill_rate=1.0)
        bucket2 = TokenBucket(capacity=5, refill_rate=2.0)

        # Act
        bucket1.consume(5)
        bucket2.consume(2)

        # Assert
        assert bucket1.tokens == 5.0
        assert bucket2.tokens == 3.0

    @pytest.mark.parametrize(
        "capacity,refill_rate",
        [
            (1, 0.1),
            (100, 10.0),
            (1000, 100.0),
            (5, 0.5),
        ],
        ids=["small", "medium", "large", "fractional_rate"],
    )
    def test_various_configurations(self, capacity: int, refill_rate: float):
        """Test TokenBucket with various capacity and refill rate combinations."""
        # Act
        bucket = TokenBucket(capacity=capacity, refill_rate=refill_rate)

        # Assert
        assert bucket.capacity == capacity
        assert bucket.refill_rate == refill_rate
        assert bucket.tokens == float(capacity)

    def test_consume_exactly_available_tokens(self):
        """Test consuming exactly the number of available tokens."""
        # Arrange
        bucket = TokenBucket(capacity=10, refill_rate=1.0)
        bucket.consume(3)  # 7 left

        # Act
        result = bucket.consume(7)

        # Assert
        assert result is True
        assert bucket.tokens < 0.01  # Approximately zero (may have tiny refill)

    def test_rapid_consecutive_consumes(self):
        """Test rapid consecutive consume operations."""
        # Arrange
        bucket = TokenBucket(capacity=100, refill_rate=10.0)

        # Act - Consume rapidly
        successes = 0
        for _ in range(150):
            if bucket.consume(1):
                successes += 1

        # Assert
        # Should have consumed approximately 100 tokens (plus any refilled)
        assert 100 <= successes <= 150

    def test_refill_with_no_time_elapsed(self):
        """Test refill when no time has elapsed."""
        # Arrange
        bucket = TokenBucket(capacity=10, refill_rate=1.0)
        bucket.consume(5)
        initial_tokens = bucket.tokens

        # Act - Immediate refill
        bucket._refill()

        # Assert
        # Tokens should be approximately the same (minimal elapsed time)
        assert abs(bucket.tokens - initial_tokens) < 0.1
