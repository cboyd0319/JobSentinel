"""Cloud deployment and management modules."""

from __future__ import annotations

from typing import Protocol


class ProviderBootstrap(Protocol):
    """Minimal interface each cloud provider bootstrapper must implement."""

    name: str

    def run(self) -> None:
        """Execute the interactive provisioning workflow."""


def load_provider(provider_key: str, logger, no_prompt: bool = False) -> ProviderBootstrap:
    """Return the provider bootstrap class for ``provider_key``.

    Parameters
    ----------
    provider_key:
        Normalised provider selector (``gcp``, ``aws``, ``azure``).
    logger:
        The logger instance to use.
    no_prompt:
        Whether to automatically answer yes to all prompts.
    """

    if provider_key == "gcp":
        from cloud.providers import gcp

        return gcp.get_bootstrap(logger, no_prompt)

    raise ValueError(f"Unknown provider '{provider_key}'")


__all__ = ["ProviderBootstrap", "load_provider"]
