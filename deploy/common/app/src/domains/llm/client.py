"""
LLM client interface.

Provides unified interface for multiple LLM providers while
maintaining privacy-first design.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class LLMProvider(str, Enum):
    """Supported LLM providers."""

    OLLAMA = "ollama"  # Local, FREE, private (default)
    OPENAI = "openai"  # External API, requires key
    ANTHROPIC = "anthropic"  # External API, requires key


@dataclass
class LLMResponse:
    """LLM response model."""

    content: str
    provider: LLMProvider
    model: str
    tokens_used: int
    cost_usd: float = 0.0
    cached: bool = False


@dataclass
class LLMConfig:
    """LLM configuration."""

    provider: LLMProvider = LLMProvider.OLLAMA
    model: str | None = None  # Provider-specific model
    api_key: str | None = None
    base_url: str | None = None
    temperature: float = 0.7
    max_tokens: int = 2000
    timeout: int = 60


class LLMClient(ABC):
    """Abstract LLM client interface."""

    def __init__(self, config: LLMConfig):
        """Initialize LLM client.

        Args:
            config: LLM configuration
        """
        self.config = config
        self._validate_config()

    @abstractmethod
    def _validate_config(self) -> None:
        """Validate configuration for this provider."""
        pass

    @abstractmethod
    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> LLMResponse:
        """Generate text from prompt.

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            temperature: Override default temperature
            max_tokens: Override default max tokens

        Returns:
            LLM response
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is available."""
        pass

    @abstractmethod
    def estimate_cost(self, prompt: str, max_tokens: int) -> float:
        """Estimate cost in USD for generation.

        Args:
            prompt: User prompt
            max_tokens: Maximum tokens to generate

        Returns:
            Estimated cost in USD (0.0 for local providers)
        """
        pass
