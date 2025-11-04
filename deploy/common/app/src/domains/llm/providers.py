"""
LLM provider implementations.

Supports multiple providers with unified interface:
- Ollama: Local, FREE, privacy-first (default)
- OpenAI: External API with GPT-4/3.5
- Anthropic: External API with Claude
"""

from __future__ import annotations

import os
from typing import Optional

from domains.llm.client import LLMClient, LLMConfig, LLMProvider, LLMResponse


class OllamaClient(LLMClient):
    """Ollama client for local LLM inference (privacy-first)."""

    def __init__(self, config: LLMConfig):
        """Initialize Ollama client."""
        if config.model is None:
            config.model = "llama3.1:8b"  # Default model
        if config.base_url is None:
            config.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        super().__init__(config)

    def _validate_config(self) -> None:
        """Validate Ollama configuration."""
        # Ollama runs locally, no API key needed
        pass

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        """Generate text using Ollama."""
        import httpx

        temp = temperature if temperature is not None else self.config.temperature
        max_tok = max_tokens if max_tokens is not None else self.config.max_tokens

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=self.config.timeout) as client:
            response = await client.post(
                f"{self.config.base_url}/api/chat",
                json={
                    "model": self.config.model,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": temp,
                        "num_predict": max_tok,
                    },
                },
            )
            response.raise_for_status()
            data = response.json()

            return LLMResponse(
                content=data["message"]["content"],
                provider=LLMProvider.OLLAMA,
                model=self.config.model,
                tokens_used=data.get("eval_count", 0) + data.get("prompt_eval_count", 0),
                cost_usd=0.0,  # FREE!
                cached=False,
            )

    def is_available(self) -> bool:
        """Check if Ollama is running."""
        import httpx

        try:
            with httpx.Client(timeout=5) as client:
                response = client.get(f"{self.config.base_url}/api/tags")
                return response.status_code == 200
        except Exception:
            return False

    def estimate_cost(self, prompt: str, max_tokens: int) -> float:
        """Ollama is FREE."""
        return 0.0


class OpenAIClient(LLMClient):
    """OpenAI client (requires API key)."""

    def __init__(self, config: LLMConfig):
        """Initialize OpenAI client."""
        if config.model is None:
            config.model = "gpt-4o-mini"  # Cost-effective default
        if config.api_key is None:
            config.api_key = os.getenv("OPENAI_API_KEY")
        super().__init__(config)

    def _validate_config(self) -> None:
        """Validate OpenAI configuration."""
        if not self.config.api_key:
            raise ValueError("OpenAI API key required. Set OPENAI_API_KEY environment variable.")

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        """Generate text using OpenAI."""
        try:
            from openai import AsyncOpenAI
        except ImportError as err:
            raise ImportError("OpenAI not installed. Install with: pip install -e .[llm]") from err

        temp = temperature if temperature is not None else self.config.temperature
        max_tok = max_tokens if max_tokens is not None else self.config.max_tokens

        client = AsyncOpenAI(api_key=self.config.api_key, timeout=self.config.timeout)

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await client.chat.completions.create(
            model=self.config.model,
            messages=messages,
            temperature=temp,
            max_tokens=max_tok,
        )

        return LLMResponse(
            content=response.choices[0].message.content,
            provider=LLMProvider.OPENAI,
            model=self.config.model,
            tokens_used=response.usage.total_tokens,
            cost_usd=self._calculate_cost(response.usage.total_tokens),
            cached=False,
        )

    def is_available(self) -> bool:
        """Check if OpenAI API key is set."""
        return bool(self.config.api_key)

    def estimate_cost(self, prompt: str, max_tokens: int) -> float:
        """Estimate OpenAI cost."""
        # Rough estimate: 1000 tokens ≈ 750 words
        prompt_tokens = len(prompt.split()) * 4 // 3
        total_tokens = prompt_tokens + max_tokens

        return self._calculate_cost(total_tokens)

    def _calculate_cost(self, tokens: int) -> float:
        """Calculate cost based on model pricing."""
        # Pricing as of Oct 2025 (approximate)
        pricing = {
            "gpt-4o": (0.005, 0.015),  # (input, output) per 1K tokens
            "gpt-4o-mini": (0.00015, 0.0006),
            "gpt-4-turbo": (0.01, 0.03),
            "gpt-3.5-turbo": (0.0005, 0.0015),
        }

        # Default to gpt-4o-mini pricing
        model_key = self.config.model.lower()
        for key, (input_cost, output_cost) in pricing.items():
            if key in model_key:
                # Assume 50/50 split between input and output
                avg_cost = (input_cost + output_cost) / 2
                return (tokens / 1000) * avg_cost

        # Fallback
        return (tokens / 1000) * 0.001


class AnthropicClient(LLMClient):
    """Anthropic Claude client (requires API key)."""

    def __init__(self, config: LLMConfig):
        """Initialize Anthropic client."""
        if config.model is None:
            config.model = "claude-3-5-sonnet-20241022"
        if config.api_key is None:
            config.api_key = os.getenv("ANTHROPIC_API_KEY")
        super().__init__(config)

    def _validate_config(self) -> None:
        """Validate Anthropic configuration."""
        if not self.config.api_key:
            raise ValueError(
                "Anthropic API key required. Set ANTHROPIC_API_KEY environment variable."
            )

    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        """Generate text using Anthropic Claude."""
        try:
            from anthropic import AsyncAnthropic
        except ImportError as err:
            raise ImportError("Anthropic not installed. Install with: pip install -e .[llm]") from err

        temp = temperature if temperature is not None else self.config.temperature
        max_tok = max_tokens if max_tokens is not None else self.config.max_tokens

        client = AsyncAnthropic(api_key=self.config.api_key, timeout=self.config.timeout)

        response = await client.messages.create(
            model=self.config.model,
            max_tokens=max_tok,
            temperature=temp,
            system=system_prompt if system_prompt else "You are a helpful assistant.",
            messages=[{"role": "user", "content": prompt}],
        )

        return LLMResponse(
            content=response.content[0].text,
            provider=LLMProvider.ANTHROPIC,
            model=self.config.model,
            tokens_used=response.usage.input_tokens + response.usage.output_tokens,
            cost_usd=self._calculate_cost(
                response.usage.input_tokens + response.usage.output_tokens
            ),
            cached=False,
        )

    def is_available(self) -> bool:
        """Check if Anthropic API key is set."""
        return bool(self.config.api_key)

    def estimate_cost(self, prompt: str, max_tokens: int) -> float:
        """Estimate Anthropic cost."""
        prompt_tokens = len(prompt.split()) * 4 // 3
        total_tokens = prompt_tokens + max_tokens
        return self._calculate_cost(total_tokens)

    def _calculate_cost(self, tokens: int) -> float:
        """Calculate cost based on Claude pricing."""
        # Pricing as of Oct 2025 (approximate)
        pricing = {
            "claude-3-5-sonnet": (0.003, 0.015),  # (input, output) per 1K tokens
            "claude-3-5-haiku": (0.00025, 0.00125),
            "claude-3-opus": (0.015, 0.075),
        }

        model_key = self.config.model.lower()
        for key, (input_cost, output_cost) in pricing.items():
            if key in model_key:
                avg_cost = (input_cost + output_cost) / 2
                return (tokens / 1000) * avg_cost

        return (tokens / 1000) * 0.002
