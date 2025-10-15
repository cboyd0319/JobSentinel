"""
Tests for LLM provider implementations.

Tests all three providers (Ollama, OpenAI, Anthropic) with mocked responses.
No actual API calls are made in these tests.
"""

import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from domains.llm.client import LLMConfig, LLMProvider
from domains.llm.providers import AnthropicClient, OllamaClient, OpenAIClient


class TestOllamaClient:
    """Test Ollama client (local LLM)."""

    def test_ollama_config_defaults(self):
        """Test Ollama configuration defaults."""
        config = LLMConfig(provider=LLMProvider.OLLAMA)
        client = OllamaClient(config)

        assert client.config.model == "llama3.1:8b"
        assert "localhost:11434" in client.config.base_url

    def test_ollama_no_api_key_required(self):
        """Test that Ollama doesn't require API key."""
        config = LLMConfig(provider=LLMProvider.OLLAMA)
        client = OllamaClient(config)
        # Should not raise any validation errors
        assert client.config.api_key is None

    def test_ollama_cost_is_free(self):
        """Test that Ollama has zero cost."""
        config = LLMConfig(provider=LLMProvider.OLLAMA)
        client = OllamaClient(config)

        cost = client.estimate_cost("test prompt", max_tokens=1000)
        assert cost == 0.0

    @pytest.mark.asyncio
    async def test_ollama_generate_success(self):
        """Test successful generation with Ollama."""
        config = LLMConfig(provider=LLMProvider.OLLAMA)
        client = OllamaClient(config)

        mock_response = {
            "message": {"content": "This is a test response"},
            "eval_count": 50,
            "prompt_eval_count": 20,
        }

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value.raise_for_status = MagicMock()
            mock_post.return_value.json = MagicMock(return_value=mock_response)

            response = await client.generate(
                prompt="Test prompt",
                system_prompt="You are a helpful assistant",
            )

            assert response.content == "This is a test response"
            assert response.provider == LLMProvider.OLLAMA
            assert response.model == "llama3.1:8b"
            assert response.tokens_used == 70  # 50 + 20
            assert response.cost_usd == 0.0

    def test_ollama_availability_check(self):
        """Test Ollama availability detection."""
        config = LLMConfig(provider=LLMProvider.OLLAMA)
        client = OllamaClient(config)

        # Mock successful connection
        with patch("httpx.Client.get") as mock_get:
            mock_get.return_value.status_code = 200
            assert client.is_available() is True

        # Mock failed connection
        with patch("httpx.Client.get", side_effect=Exception("Connection failed")):
            assert client.is_available() is False


class TestOpenAIClient:
    """Test OpenAI client (GPT-3.5, GPT-4)."""

    def test_openai_requires_api_key(self):
        """Test that OpenAI requires API key."""
        config = LLMConfig(provider=LLMProvider.OPENAI)

        with pytest.raises(ValueError, match="API key required"):
            OpenAIClient(config)

    def test_openai_config_from_env(self):
        """Test OpenAI configuration from environment."""
        with patch.dict(os.environ, {"OPENAI_API_KEY": "sk-test-key"}):
            config = LLMConfig(provider=LLMProvider.OPENAI)
            client = OpenAIClient(config)

            assert client.config.api_key == "sk-test-key"
            assert client.config.model == "gpt-4o-mini"  # Default model

    def test_openai_gpt4_model(self):
        """Test GPT-4 model configuration."""
        config = LLMConfig(
            provider=LLMProvider.OPENAI,
            api_key="sk-test-key",
            model="gpt-4o",
        )
        client = OpenAIClient(config)

        assert client.config.model == "gpt-4o"

    def test_openai_gpt35_model(self):
        """Test GPT-3.5 model configuration."""
        config = LLMConfig(
            provider=LLMProvider.OPENAI,
            api_key="sk-test-key",
            model="gpt-3.5-turbo",
        )
        client = OpenAIClient(config)

        assert client.config.model == "gpt-3.5-turbo"

    def test_openai_cost_estimation_gpt4(self):
        """Test cost estimation for GPT-4."""
        config = LLMConfig(
            provider=LLMProvider.OPENAI,
            api_key="sk-test-key",
            model="gpt-4o",
        )
        client = OpenAIClient(config)

        # Estimate cost for ~1000 tokens
        cost = client.estimate_cost("test " * 250, max_tokens=500)

        # GPT-4o costs approximately $0.005-0.015 per 1K tokens
        assert cost > 0.0
        assert cost < 0.1  # Should be reasonable for small request

    def test_openai_cost_estimation_gpt35(self):
        """Test cost estimation for GPT-3.5."""
        config = LLMConfig(
            provider=LLMProvider.OPENAI,
            api_key="sk-test-key",
            model="gpt-3.5-turbo",
        )
        client = OpenAIClient(config)

        cost = client.estimate_cost("test " * 250, max_tokens=500)

        # GPT-3.5 should be cheaper than GPT-4
        assert cost > 0.0
        assert cost < 0.01

    @pytest.mark.asyncio
    async def test_openai_generate_success(self):
        """Test successful generation with OpenAI."""
        pytest.importorskip("openai")
        config = LLMConfig(
            provider=LLMProvider.OPENAI,
            api_key="sk-test-key",
            model="gpt-4o-mini",
        )
        client = OpenAIClient(config)

        # Mock the OpenAI response
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = "Test response from GPT"
        mock_response.usage.total_tokens = 150

        with patch("openai.AsyncOpenAI") as mock_openai:
            mock_client = MagicMock()
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            mock_openai.return_value = mock_client

            response = await client.generate(
                prompt="Test prompt",
                system_prompt="You are a helpful assistant",
            )

            assert response.content == "Test response from GPT"
            assert response.provider == LLMProvider.OPENAI
            assert response.model == "gpt-4o-mini"
            assert response.tokens_used == 150
            assert response.cost_usd > 0.0

    def test_openai_availability_check(self):
        """Test OpenAI availability check."""
        config = LLMConfig(
            provider=LLMProvider.OPENAI,
            api_key="sk-test-key",
        )
        client = OpenAIClient(config)

        # Should be available if API key is set
        assert client.is_available() is True

        # Should not be available without API key
        config_no_key = LLMConfig(provider=LLMProvider.OPENAI)
        with pytest.raises(ValueError):
            OpenAIClient(config_no_key)


class TestAnthropicClient:
    """Test Anthropic client (Claude)."""

    def test_anthropic_requires_api_key(self):
        """Test that Anthropic requires API key."""
        config = LLMConfig(provider=LLMProvider.ANTHROPIC)

        with pytest.raises(ValueError, match="API key required"):
            AnthropicClient(config)

    def test_anthropic_config_from_env(self):
        """Test Anthropic configuration from environment."""
        with patch.dict(os.environ, {"ANTHROPIC_API_KEY": "sk-ant-test"}):
            config = LLMConfig(provider=LLMProvider.ANTHROPIC)
            client = AnthropicClient(config)

            assert client.config.api_key == "sk-ant-test"
            assert "claude" in client.config.model.lower()

    def test_anthropic_cost_estimation(self):
        """Test cost estimation for Claude."""
        config = LLMConfig(
            provider=LLMProvider.ANTHROPIC,
            api_key="sk-ant-test",
            model="claude-3-5-sonnet-20241022",
        )
        client = AnthropicClient(config)

        cost = client.estimate_cost("test " * 250, max_tokens=500)

        # Claude costs should be reasonable
        assert cost > 0.0
        assert cost < 0.1

    @pytest.mark.asyncio
    async def test_anthropic_generate_success(self):
        """Test successful generation with Anthropic."""
        pytest.importorskip("anthropic")
        config = LLMConfig(
            provider=LLMProvider.ANTHROPIC,
            api_key="sk-ant-test",
        )
        client = AnthropicClient(config)

        # Mock the Anthropic response
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_response.content[0].text = "Test response from Claude"
        mock_response.usage.input_tokens = 50
        mock_response.usage.output_tokens = 100

        with patch("anthropic.AsyncAnthropic") as mock_anthropic:
            mock_client = MagicMock()
            mock_client.messages.create = AsyncMock(return_value=mock_response)
            mock_anthropic.return_value = mock_client

            response = await client.generate(
                prompt="Test prompt",
                system_prompt="You are a helpful assistant",
            )

            assert response.content == "Test response from Claude"
            assert response.provider == LLMProvider.ANTHROPIC
            assert response.tokens_used == 150  # 50 + 100
            assert response.cost_usd > 0.0

    def test_anthropic_availability_check(self):
        """Test Anthropic availability check."""
        config = LLMConfig(
            provider=LLMProvider.ANTHROPIC,
            api_key="sk-ant-test",
        )
        client = AnthropicClient(config)

        assert client.is_available() is True


class TestProviderComparison:
    """Test comparisons between providers."""

    def test_ollama_is_free(self):
        """Verify Ollama is free compared to cloud providers."""
        ollama_config = LLMConfig(provider=LLMProvider.OLLAMA)
        ollama = OllamaClient(ollama_config)

        openai_config = LLMConfig(
            provider=LLMProvider.OPENAI,
            api_key="sk-test",
        )
        openai = OpenAIClient(openai_config)

        prompt = "test " * 100

        ollama_cost = ollama.estimate_cost(prompt, 500)
        openai_cost = openai.estimate_cost(prompt, 500)

        assert ollama_cost == 0.0
        assert openai_cost > 0.0

    def test_gpt35_cheaper_than_gpt4(self):
        """Verify GPT-3.5 is cheaper than GPT-4."""
        gpt35_config = LLMConfig(
            provider=LLMProvider.OPENAI,
            api_key="sk-test",
            model="gpt-3.5-turbo",
        )
        gpt35 = OpenAIClient(gpt35_config)

        gpt4_config = LLMConfig(
            provider=LLMProvider.OPENAI,
            api_key="sk-test",
            model="gpt-4o",
        )
        gpt4 = OpenAIClient(gpt4_config)

        prompt = "test " * 100

        gpt35_cost = gpt35.estimate_cost(prompt, 500)
        gpt4_cost = gpt4.estimate_cost(prompt, 500)

        assert gpt35_cost < gpt4_cost
