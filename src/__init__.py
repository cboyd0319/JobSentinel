"""
Private Job Scraper & Filter

A robust, private job monitoring service that runs on your own machine.
"""

import tomllib
from pathlib import Path


def get_version() -> str:
    """Get the current version from pyproject.toml (single source of truth).
    
    Returns:
        Version string from pyproject.toml, or 'unknown' on error.
    """
    try:
        # Read from pyproject.toml in project root
        pyproject_path = Path(__file__).parent.parent / "pyproject.toml"
        with open(pyproject_path, "rb") as f:
            data = tomllib.load(f)
        return data["project"]["version"]
    except Exception:  # pragma: no cover - defensive fallback
        return "unknown"


# Version management
__version__ = get_version()
