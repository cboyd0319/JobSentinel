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

_PROVIDER_MODULES = {
    "gcp": "cloud.providers.gcp",
}


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

    try:
        module_path = _PROVIDER_MODULES[provider_key]
    except KeyError as exc:
        raise ValueError(f"Unknown provider '{provider_key}'") from exc

    module = import_module(module_path)
    return module.get_bootstrap()  # type: ignore[no-any-return]


__all__ = ["ProviderBootstrap", "load_provider"]
