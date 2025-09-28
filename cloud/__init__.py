"""Cloud deployment automation package.

This package provides provider-specific bootstrapping helpers that can be
invoked via ``python -m cloud.bootstrap``. The initial implementation focuses
on Google Cloud Run but the module layout is intentionally generic so that
AWS and Azure automation can plug in later without refactoring existing
scripts.
"""

from __future__ import annotations

from importlib import import_module
from typing import Protocol


class ProviderBootstrap(Protocol):
    """Minimal interface each cloud provider bootstrapper must implement."""

    name: str

    def run(self) -> None:
        """Execute the interactive provisioning workflow."""


def load_provider(provider_key: str) -> ProviderBootstrap:
    """Return the provider bootstrap class for ``provider_key``.

    Parameters
    ----------
    provider_key:
        Normalised provider selector (``gcp``, ``aws``, ``azure``).
    """

    module = import_module(f"cloud.providers.{provider_key}")
    return module.get_bootstrap()  # type: ignore[no-any-return]


__all__ = ["ProviderBootstrap", "load_provider"]
