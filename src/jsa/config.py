"""
Typed facade for configuration loading and validation.

Wraps utils.config to provide stable, typed contracts for core modules.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from utils.config import ConfigManager as _LegacyConfigManager
from utils.config import FilterConfig as _LegacyFilterConfig

__all__ = [
    "UserPreferences",
    "ConfigService",
]


@dataclass(frozen=True)
class UserPreferences:
    """Minimal typed view of user preferences we rely on across modules.

    Notes:
      - Backed by a dictionary loaded via the legacy ConfigManager.
      - We intentionally keep this narrow and explicit to avoid
        implicit dependencies on unvalidated data fields.
    """

    keywords_boost: list[str]
    digest_min_score: float


class ConfigService:
    """Typed configuration service.

    Contract:
      pre: config_path points to an existing JSON file or a default is available
      post: provides validated, typed accessors
      raise: ValueError when preferences are missing required fields
    """

    def __init__(self, config_path: Path | str = "config/user_prefs.json"):
        self._manager = _LegacyConfigManager(str(config_path))

    def raw(self) -> dict[str, Any]:
        """Return the full raw dictionary as loaded and validated.

        Raises ValueError if legacy validation fails to present a
        consistent facade contract to callers.
        """
        try:
            return self._manager.load_config()
        except Exception as e:  # narrow in future if needed
            raise ValueError(f"Invalid configuration: {e}") from e

    def user_preferences(self) -> UserPreferences:
        data = self.raw()
        kb = data.get("keywords_boost", [])
        dms = data.get("digest_min_score", 0.0)
        if not isinstance(kb, list) or not all(isinstance(x, str) for x in kb):
            raise ValueError("keywords_boost must be a list of strings")
        if not isinstance(dms, float | int):
            raise ValueError("digest_min_score must be a number")
        return UserPreferences(keywords_boost=list(kb), digest_min_score=float(dms))

    def filter_config(self) -> _LegacyFilterConfig:
        """Expose the validated legacy FilterConfig when needed."""
        return self._manager.get_filter_config()
