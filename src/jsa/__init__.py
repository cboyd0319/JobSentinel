"""Job Search Automation – typed core package.

This top-level package provides a clean, strongly-typed API surface
for the application. It wraps selected legacy modules where helpful
to preserve behavior while we progressively refactor internals.
"""

from __future__ import annotations

import tomllib
from pathlib import Path

__all__ = [
    "__version__",
]

def _get_version() -> str:
    """Read version from pyproject.toml (single source of truth).
    
    Returns:
        Version string from pyproject.toml, or 'unknown' on error.
    """
    try:
        pyproject_path = Path(__file__).parent.parent.parent / "pyproject.toml"
        with open(pyproject_path, "rb") as f:
            data = tomllib.load(f)
        return data["project"]["version"]
    except Exception:  # pragma: no cover - defensive fallback
        return "unknown"

__version__ = _get_version()

