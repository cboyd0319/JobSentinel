"""
Tests for resilient LLM client with cost controls and automatic fallback.

Tests budget tracking, caching, retry logic, and provider failover.
"""

import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from domains.llm.client import LLMConfig, LLMProvider, LLMResponse
from domains.llm.resilient_client import (
    BudgetConfig,
    BudgetTracker,
    ResponseCache,
    ResilientLLMClient,
    create_default_resilient_client,
)


class TestBudgetTracker:
    """Test LLM budget tracking and cost controls."""

    def test_budget_config_defaults(self):
        """Test default budget configuration."""
        config = BudgetConfig()

        assert config.max_cost_per_request == 0.10
        assert config.max_cost_per_day == 5.00
        assert config.max_cost_per_month == 50.00
        assert config.warn_threshold == 0.80

    def test_budget_within_limits(self):
        """Test request allowed when within budget."""
        config = BudgetConfig(
            max_cost_per_request=1.0,
            max_cost_per_day=10.0,
            max_cost_per_month=100.0,
        )
        tracker = BudgetTracker(config)

        allowed, reason = tracker.check_budget(0.05)
        assert allowed is True
        assert reason == ""

    def test_budget_exceeds_per_request_limit(self):
        """Test request blocked when exceeding per-request limit."""
        config = BudgetConfig(max_cost_per_request=0.10)
        tracker = BudgetTracker(config)

        allowed, reason = tracker.check_budget(0.20)
        assert allowed is False
        assert "per-request limit" in reason

    def test_budget_exceeds_daily_limit(self):
        """Test request blocked when exceeding daily limit."""
        config = BudgetConfig(
            max_cost_per_request=0.20,  # Allow individual request
            max_cost_per_day=1.0,
        )
        tracker = BudgetTracker(config)

        # Use up daily budget
        tracker.record_cost(0.90)

        # Next request should be blocked (0.90 + 0.15 > 1.0)
        allowed, reason = tracker.check_budget(0.15)
        assert allowed is False
        assert "daily budget" in reason

    def test_budget_exceeds_monthly_limit(self):
        """Test request blocked when exceeding monthly limit."""
        config = BudgetConfig(
            max_cost_per_request=0.20,  # Allow individual request
            max_cost_per_day=10.0,  # High enough to not trigger
            max_cost_per_month=5.0,
        )
        tracker = BudgetTracker(config)

        # Use up monthly budget
        tracker.record_cost(4.90)

        # Next request should be blocked (4.90 + 0.15 > 5.0)
        allowed, reason = tracker.check_budget(0.15)
        assert allowed is False
        assert "monthly budget" in reason

    def test_budget_tracks_costs(self):
        """Test cost recording."""
        config = BudgetConfig()
        tracker = BudgetTracker(config)

        tracker.record_cost(0.50)
        tracker.record_cost(0.30)

        assert tracker._daily_cost == 0.80
        assert tracker._monthly_cost == 0.80

    def test_budget_daily_reset(self):
        """Test daily budget resets after 24 hours."""
        config = BudgetConfig()
        tracker = BudgetTracker(config)

        tracker.record_cost(1.0)
        assert tracker._daily_cost == 1.0

        # Simulate 25 hours passing
        tracker._last_reset_day = time.time() - (25 * 3600)

        # Next check should reset daily budget
        allowed, reason = tracker.check_budget(0.1)
        assert allowed is True
        assert tracker._daily_cost == 0.0

    def test_budget_monthly_reset(self):
        """Test monthly budget resets after 30 days."""
        config = BudgetConfig(
            max_cost_per_day=50.0,  # Set high to not interfere
            max_cost_per_month=50.0,
        )
        tracker = BudgetTracker(config)

        tracker.record_cost(10.0)
        assert tracker._monthly_cost == 10.0

        # Simulate 31 days passing
        tracker._last_reset_month = time.time() - (31 * 86400)
        tracker._last_reset_day = time.time() - (31 * 86400)  # Also reset daily

        # Next check should reset monthly budget
        allowed, reason = tracker.check_budget(0.05)  # Use smaller amount within per-request limit
        assert allowed is True
        # After reset and check, monthly cost should be 0 (check doesn't record)
        assert tracker._monthly_cost == 0.0


class TestResponseCache:
    """Test LLM response caching."""

    def test_cache_miss(self):
        """Test cache miss returns None."""
        cache = ResponseCache(ttl_seconds=3600)

        result = cache.get("test prompt")
        assert result is None

    def test_cache_hit(self):
        """Test cache hit returns cached response."""
        cache = ResponseCache(ttl_seconds=3600)

        # Create mock response
        response = LLMResponse(
            content="Cached response",
            provider=LLMProvider.OLLAMA,
            model="llama3.1:8b",
            tokens_used=50,
            cost_usd=0.0,
        )

        cache.set("test prompt", response)

        # Retrieve from cache
        cached = cache.get("test prompt")
        assert cached is not None
        assert cached.content == "Cached response"
        assert cached.cached is True

    def test_cache_expiration(self):
        """Test cached responses expire after TTL."""
        cache = ResponseCache(ttl_seconds=1)  # 1 second TTL

        response = LLMResponse(
            content="Cached response",
            provider=LLMProvider.OLLAMA,
            model="llama3.1:8b",
            tokens_used=50,
            cost_usd=0.0,
        )

        cache.set("test prompt", response)

        # Wait for expiration
        time.sleep(1.5)

        # Should be expired
        cached = cache.get("test prompt")
        assert cached is None

    def test_cache_clear(self):
        """Test clearing cache."""
        cache = ResponseCache()

        response = LLMResponse(
            content="Cached response",
            provider=LLMProvider.OLLAMA,
            model="llama3.1:8b",
            tokens_used=50,
        )

        cache.set("prompt1", response)
        cache.set("prompt2", response)

        cache.clear()

        assert cache.get("prompt1") is None
        assert cache.get("prompt2") is None


class TestResilientLLMClient:
    """Test resilient client with retry and failover."""

    @pytest.mark.asyncio
    async def test_primary_provider_success(self):
        """Test successful generation with primary provider."""
        primary_config = LLMConfig(
            provider=LLMProvider.OLLAMA,
            model="llama3.1:8b",
        )

        client = ResilientLLMClient(
            primary_config=primary_config,
            enable_cache=False,  # Disable cache for testing
        )

        # Mock successful response
        mock_response = LLMResponse(
            content="Test response",
            provider=LLMProvider.OLLAMA,
            model="llama3.1:8b",
            tokens_used=50,
            cost_usd=0.0,
        )

        with patch.object(client.primary_client, "generate", new_callable=AsyncMock) as mock_gen:
            with patch.object(client.primary_client, "is_available", return_value=True):
                with patch.object(client.primary_client, "estimate_cost", return_value=0.0):
                    mock_gen.return_value = mock_response

                    response = await client.generate(prompt="Test prompt")

                    assert response.content == "Test response"
                    assert response.provider == LLMProvider.OLLAMA

    @pytest.mark.asyncio
    async def test_fallback_on_primary_failure(self):
        """Test automatic fallback when primary fails."""
        primary_config = LLMConfig(provider=LLMProvider.OLLAMA)
        fallback_config = LLMConfig(
            provider=LLMProvider.OPENAI,
            api_key="sk-test",
        )

        client = ResilientLLMClient(
            primary_config=primary_config,
            fallback_configs=[fallback_config],
            enable_cache=False,
        )

        # Mock primary failure
        with patch.object(client.primary_client, "is_available", return_value=False):
            # Mock fallback success
            fallback_response = LLMResponse(
                content="Fallback response",
                provider=LLMProvider.OPENAI,
                model="gpt-4o-mini",
                tokens_used=100,
                cost_usd=0.02,
            )

            with patch.object(client.fallback_clients[0], "is_available", return_value=True):
                with patch.object(client.fallback_clients[0], "estimate_cost", return_value=0.02):
                    with patch.object(
                        client.fallback_clients[0], "generate", new_callable=AsyncMock
                    ) as mock_gen:
                        mock_gen.return_value = fallback_response

                        response = await client.generate(prompt="Test prompt")

                        assert response.content == "Fallback response"
                        assert response.provider == LLMProvider.OPENAI

    @pytest.mark.asyncio
    async def test_budget_enforcement(self):
        """Test that budget limits are enforced."""
        primary_config = LLMConfig(
            provider=LLMProvider.OPENAI,
            api_key="sk-test",
        )

        budget_config = BudgetConfig(max_cost_per_request=0.01)

        client = ResilientLLMClient(
            primary_config=primary_config,
            budget_config=budget_config,
            enable_cache=False,
        )

        # Mock high cost estimate
        with patch.object(client.primary_client, "is_available", return_value=True):
            with patch.object(client.primary_client, "estimate_cost", return_value=0.50):
                # Should raise Exception (all providers failed due to budget)
                with pytest.raises(Exception, match="All LLM providers failed"):
                    await client.generate(prompt="Test prompt")

    @pytest.mark.asyncio
    async def test_response_caching(self):
        """Test that responses are cached."""
        primary_config = LLMConfig(provider=LLMProvider.OLLAMA)

        client = ResilientLLMClient(
            primary_config=primary_config,
            enable_cache=True,
        )

        mock_response = LLMResponse(
            content="Test response",
            provider=LLMProvider.OLLAMA,
            model="llama3.1:8b",
            tokens_used=50,
            cost_usd=0.0,
        )

        with patch.object(client.primary_client, "is_available", return_value=True):
            with patch.object(client.primary_client, "estimate_cost", return_value=0.0):
                with patch.object(
                    client.primary_client, "generate", new_callable=AsyncMock
                ) as mock_gen:
                    mock_gen.return_value = mock_response

                    # First call
                    response1 = await client.generate(prompt="Test prompt")
                    assert response1.cached is False
                    assert mock_gen.call_count == 1

                    # Second call with same prompt should use cache
                    response2 = await client.generate(prompt="Test prompt")
                    assert response2.cached is True
                    assert mock_gen.call_count == 1  # Not called again

    @pytest.mark.asyncio
    async def test_all_providers_fail(self):
        """Test error when all providers fail."""
        primary_config = LLMConfig(provider=LLMProvider.OLLAMA)
        fallback_config = LLMConfig(
            provider=LLMProvider.OPENAI,
            api_key="sk-test",
        )

        client = ResilientLLMClient(
            primary_config=primary_config,
            fallback_configs=[fallback_config],
            enable_cache=False,
        )

        # Mock all providers unavailable
        with patch.object(client.primary_client, "is_available", return_value=False):
            with patch.object(client.fallback_clients[0], "is_available", return_value=False):
                with pytest.raises(Exception, match="All LLM providers failed"):
                    await client.generate(prompt="Test prompt")

    def test_is_offline_detection(self):
        """Test offline detection."""
        primary_config = LLMConfig(provider=LLMProvider.OLLAMA)

        client = ResilientLLMClient(primary_config=primary_config)

        # Mock all offline
        with patch.object(client.primary_client, "is_available", return_value=False):
            assert client.is_offline() is True

        # Mock online
        with patch.object(client.primary_client, "is_available", return_value=True):
            assert client.is_offline() is False

    def test_get_status(self):
        """Test provider status reporting."""
        primary_config = LLMConfig(provider=LLMProvider.OLLAMA)
        fallback_config = LLMConfig(
            provider=LLMProvider.OPENAI,
            api_key="sk-test",
        )

        client = ResilientLLMClient(
            primary_config=primary_config,
            fallback_configs=[fallback_config],
        )

        with patch.object(client.primary_client, "is_available", return_value=True):
            with patch.object(client.fallback_clients[0], "is_available", return_value=False):
                status = client.get_status()

                assert status["primary"]["provider"] == "ollama"
                assert status["primary"]["available"] is True
                assert status["fallback_0"]["provider"] == "openai"
                assert status["fallback_0"]["available"] is False


class TestDefaultResilientClient:
    """Test default resilient client creation."""

    def test_create_default_client_local_only(self):
        """Test creating default client without fallbacks."""
        client = create_default_resilient_client(enable_fallback=False)

        assert client.primary_client.config.provider == LLMProvider.OLLAMA
        assert len(client.fallback_clients) == 0

    def test_create_default_client_with_fallbacks(self):
        """Test creating default client with fallbacks."""
        with patch.dict(
            "os.environ",
            {
                "OPENAI_API_KEY": "sk-test",
                "ANTHROPIC_API_KEY": "sk-ant-test",
            },
        ):
            client = create_default_resilient_client(enable_fallback=True)

            assert client.primary_client.config.provider == LLMProvider.OLLAMA
            assert len(client.fallback_clients) == 2
            assert any(c.config.provider == LLMProvider.OPENAI for c in client.fallback_clients)
            assert any(c.config.provider == LLMProvider.ANTHROPIC for c in client.fallback_clients)

    def test_create_default_client_custom_budget(self):
        """Test creating client with custom budget."""
        budget = BudgetConfig(
            max_cost_per_day=10.0,
            max_cost_per_month=100.0,
        )

        client = create_default_resilient_client(
            enable_fallback=False,
            budget_config=budget,
        )

        assert client.budget_tracker.config.max_cost_per_day == 10.0
        assert client.budget_tracker.config.max_cost_per_month == 100.0
