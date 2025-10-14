"""
LLM integration for JobSentinel.

Privacy-first design with local-first approach:
- Default: Ollama (local, FREE, private)
- Optional: OpenAI, Anthropic (user-provided API keys)
- All features require explicit opt-in
- Clear warnings when using external APIs
"""

from __future__ import annotations

__all__ = ["LLMClient", "LLMProvider", "OllamaClient", "OpenAIClient", "AnthropicClient"]

from domains.llm.client import LLMClient, LLMProvider
from domains.llm.providers import AnthropicClient, OllamaClient, OpenAIClient
