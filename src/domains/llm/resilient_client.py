"""
Resilient LLM client with retry logic and provider failover.

Features:
- Exponential backoff with jitter
- Automatic provider failover (Ollama → OpenAI → Anthropic)
- Response caching to reduce costs
- Budget tracking and limits
- Offline mode detection
"""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass
from typing import Optional

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential_jitter,
)

from domains.llm.client import LLMClient, LLMConfig, LLMProvider, LLMResponse
from domains.llm.providers import AnthropicClient, OllamaClient, OpenAIClient
from jsa.logging import get_logger

logger = get_logger("llm_resilient", component="llm")


@dataclass
class BudgetConfig:
    """Budget configuration for LLM usage."""

    max_cost_per_request: float = 0.10  # Max $0.10 per request
    max_cost_per_day: float = 5.00  # Max $5/day
    max_cost_per_month: float = 50.00  # Max $50/month
    warn_threshold: float = 0.80  # Warn at 80% of budget


class ResponseCache:
    """Simple in-memory response cache."""

    def __init__(self, ttl_seconds: int = 3600):
        """Initialize cache.

        Args:
            ttl_seconds: Time-to-live for cached responses (default 1 hour)
        """
        self._cache: dict[str, tuple[LLMResponse, float]] = {}
        self._ttl = ttl_seconds

    def get(self, prompt: str) -> LLMResponse | None:
        """Get cached response if available and not expired."""
        key = self._hash_prompt(prompt)
        if key in self._cache:
            response, timestamp = self._cache[key]
            if time.time() - timestamp < self._ttl:
                logger.info("Using cached LLM response", cache_key=key[:8])
                response.cached = True
                return response
            else:
                # Expired, remove from cache
                del self._cache[key]
        return None

    def set(self, prompt: str, response: LLMResponse) -> None:
        """Cache a response."""
        key = self._hash_prompt(prompt)
        self._cache[key] = (response, time.time())
        logger.info("Cached LLM response", cache_key=key[:8], ttl=self._ttl)

    def clear(self) -> None:
        """Clear all cached responses."""
        self._cache.clear()
        logger.info("Cleared LLM response cache")

    def _hash_prompt(self, prompt: str) -> str:
        """Generate cache key from prompt."""
        return hashlib.sha256(prompt.encode()).hexdigest()


class BudgetTracker:
    """Track LLM usage costs."""

    def __init__(self, config: BudgetConfig):
        """Initialize budget tracker."""
        self.config = config
        self._daily_cost = 0.0
        self._monthly_cost = 0.0
        self._last_reset_day = time.time()
        self._last_reset_month = time.time()

    def check_budget(self, estimated_cost: float) -> tuple[bool, str]:
        """Check if request is within budget.

        Returns:
            (allowed, reason) tuple
        """
        self._reset_if_needed()

        if estimated_cost > self.config.max_cost_per_request:
            return (
                False,
                f"Request exceeds per-request limit (${estimated_cost:.4f} > ${self.config.max_cost_per_request:.2f})",
            )

        if self._daily_cost + estimated_cost > self.config.max_cost_per_day:
            return (
                False,
                f"Would exceed daily budget (${self._daily_cost + estimated_cost:.2f} > ${self.config.max_cost_per_day:.2f})",
            )

        if self._monthly_cost + estimated_cost > self.config.max_cost_per_month:
            return (
                False,
                f"Would exceed monthly budget (${self._monthly_cost + estimated_cost:.2f} > ${self.config.max_cost_per_month:.2f})",
            )

        # Check if approaching limits
        if (
            self._daily_cost + estimated_cost
            > self.config.max_cost_per_day * self.config.warn_threshold
        ):
            logger.warning(
                "Approaching daily budget limit",
                current=self._daily_cost,
                limit=self.config.max_cost_per_day,
            )

        return (True, "")

    def record_cost(self, cost: float) -> None:
        """Record actual cost after request."""
        self._reset_if_needed()
        self._daily_cost += cost
        self._monthly_cost += cost
        logger.info(
            "Recorded LLM cost",
            cost=cost,
            daily_total=self._daily_cost,
            monthly_total=self._monthly_cost,
        )

    def _reset_if_needed(self) -> None:
        """Reset counters if day/month has changed."""
        now = time.time()
        day_seconds = 86400  # 24 hours

        # Reset daily if > 24 hours
        if now - self._last_reset_day > day_seconds:
            self._daily_cost = 0.0
            self._last_reset_day = now
            logger.info("Reset daily LLM budget")

        # Reset monthly if > 30 days
        if now - self._last_reset_month > (day_seconds * 30):
            self._monthly_cost = 0.0
            self._last_reset_month = now
            logger.info("Reset monthly LLM budget")


class ResilientLLMClient:
    """LLM client with retry logic, failover, and caching."""

    def __init__(
        self,
        primary_config: LLMConfig,
        fallback_configs: list[LLMConfig] | None = None,
        enable_cache: bool = True,
        cache_ttl: int = 3600,
        budget_config: BudgetConfig | None = None,
    ):
        """Initialize resilient LLM client.

        Args:
            primary_config: Primary LLM provider configuration
            fallback_configs: Fallback provider configurations
            enable_cache: Enable response caching
            cache_ttl: Cache time-to-live in seconds
            budget_config: Budget configuration
        """
        self.primary_config = primary_config
        self.fallback_configs = fallback_configs or []

        # Create clients
        self.primary_client = self._create_client(primary_config)
        self.fallback_clients = [self._create_client(config) for config in self.fallback_configs]

        # Caching and budget
        self.cache = ResponseCache(ttl_seconds=cache_ttl) if enable_cache else None
        self.budget_tracker = BudgetTracker(budget_config or BudgetConfig())

        logger.info(
            "Initialized resilient LLM client",
            primary_provider=primary_config.provider,
            fallback_count=len(self.fallback_clients),
            cache_enabled=enable_cache,
        )

    def _create_client(self, config: LLMConfig) -> LLMClient:
        """Create LLM client from configuration."""
        if config.provider == LLMProvider.OLLAMA:
            return OllamaClient(config)
        elif config.provider == LLMProvider.OPENAI:
            return OpenAIClient(config)
        elif config.provider == LLMProvider.ANTHROPIC:
            return AnthropicClient(config)
        else:
            raise ValueError(f"Unsupported provider: {config.provider}")

    @retry(
        retry=retry_if_exception_type((ConnectionError, TimeoutError)),
        stop=stop_after_attempt(3),
        wait=wait_exponential_jitter(initial=1, max=10),
        reraise=True,
    )
    async def generate(
        self,
        prompt: str,
        system_prompt: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        bypass_cache: bool = False,
    ) -> LLMResponse:
        """Generate text with retry logic and failover.

        Args:
            prompt: User prompt
            system_prompt: Optional system prompt
            temperature: Override default temperature
            max_tokens: Override default max tokens
            bypass_cache: Skip cache lookup

        Returns:
            LLM response

        Raises:
            Exception: If all providers fail
        """
        # Check cache first
        if self.cache and not bypass_cache:
            cached = self.cache.get(prompt)
            if cached:
                return cached

        # Try primary provider
        clients = [self.primary_client] + self.fallback_clients
        last_error = None

        for i, client in enumerate(clients):
            try:
                # Check if provider is available
                if not client.is_available():
                    logger.warning(
                        "Provider not available, trying next",
                        provider=client.config.provider,
                        is_primary=(i == 0),
                    )
                    continue

                # Check budget before making request
                estimated_cost = client.estimate_cost(
                    prompt, max_tokens or client.config.max_tokens
                )
                allowed, reason = self.budget_tracker.check_budget(estimated_cost)
                if not allowed:
                    logger.error("Budget limit exceeded", reason=reason)
                    raise ValueError(f"Budget limit: {reason}")

                logger.info(
                    "Generating with LLM provider",
                    provider=client.config.provider,
                    model=client.config.model,
                    estimated_cost=estimated_cost,
                    is_primary=(i == 0),
                )

                # Generate response
                response = await client.generate(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )

                # Record actual cost
                self.budget_tracker.record_cost(response.cost_usd)

                # Cache successful response
                if self.cache:
                    self.cache.set(prompt, response)

                logger.info(
                    "Successfully generated response",
                    provider=response.provider,
                    model=response.model,
                    tokens=response.tokens_used,
                    cost=response.cost_usd,
                )

                return response

            except Exception as e:
                last_error = e
                logger.warning(
                    "Provider failed, trying next",
                    provider=client.config.provider,
                    error=str(e),
                    remaining_providers=len(clients) - i - 1,
                )

        # All providers failed
        error_msg = f"All LLM providers failed. Last error: {last_error}"
        logger.error("All LLM providers failed", last_error=str(last_error))
        raise Exception(error_msg)

    def is_offline(self) -> bool:
        """Check if all providers are offline."""
        return not any(
            client.is_available() for client in [self.primary_client] + self.fallback_clients
        )

    def get_status(self) -> dict[str, bool]:
        """Get availability status of all providers."""
        status = {
            "primary": {
                "provider": self.primary_client.config.provider.value,
                "available": self.primary_client.is_available(),
            }
        }

        for i, client in enumerate(self.fallback_clients):
            status[f"fallback_{i}"] = {
                "provider": client.config.provider.value,
                "available": client.is_available(),
            }

        return status


def create_default_resilient_client(
    enable_fallback: bool = True,
    budget_config: BudgetConfig | None = None,
) -> ResilientLLMClient:
    """Create resilient client with sensible defaults.

    Args:
        enable_fallback: Enable fallback to cloud providers
        budget_config: Budget configuration

    Returns:
        Configured resilient client
    """
    import os

    # Primary: Ollama (local, free, private)
    primary = LLMConfig(provider=LLMProvider.OLLAMA)

    # Fallbacks: OpenAI and Anthropic if API keys available
    fallbacks = []
    if enable_fallback:
        if os.getenv("OPENAI_API_KEY"):
            fallbacks.append(LLMConfig(provider=LLMProvider.OPENAI))
        if os.getenv("ANTHROPIC_API_KEY"):
            fallbacks.append(LLMConfig(provider=LLMProvider.ANTHROPIC))

    return ResilientLLMClient(
        primary_config=primary,
        fallback_configs=fallbacks,
        enable_cache=True,
        cache_ttl=3600,  # 1 hour
        budget_config=budget_config,
    )


__all__ = [
    "ResilientLLMClient",
    "BudgetConfig",
    "BudgetTracker",
    "ResponseCache",
    "create_default_resilient_client",
]
