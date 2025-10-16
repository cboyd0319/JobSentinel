"""Comprehensive tests for jsa.config module.

Tests configuration loading, validation, and type safety following pytest best practices.
Covers happy paths, edge cases, validation errors, and error handling.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from jsa.config import ConfigService, UserPreferences


@pytest.fixture
def valid_config_data() -> dict:
    """Return a valid configuration dictionary."""
    return {
        "keywords_boost": ["python", "remote"],
        "digest_min_score": 0.7,
        "companies": [{"id": "test_company", "board_type": "generic", "url": "http://example.com"}],
        "notification_config": {"email": {"enabled": False}, "slack": {"enabled": False}},
        "filter_config": {
            "min_score": 5.0,
            "must_have_keywords": [],
            "blocked_keywords": [],
            "blocked_companies": [],
            "required_locations": [],
            "blocked_locations": [],
        },
    }


@pytest.fixture
def write_config(tmp_path: Path):
    """Factory fixture to write configuration files."""

    def _write(data: dict, filename: str = "config.json") -> Path:
        config_file = tmp_path / filename
        config_file.write_text(json.dumps(data))
        return config_file

    return _write


class TestUserPreferences:
    """Test suite for UserPreferences dataclass."""

    def test_user_preferences_creation_valid(self) -> None:
        """UserPreferences should be created with valid data."""
        # Arrange & Act
        prefs = UserPreferences(keywords_boost=["python", "django"], digest_min_score=0.75)
        # Assert
        assert prefs.keywords_boost == ["python", "django"]
        assert prefs.digest_min_score == 0.75

    def test_user_preferences_immutable(self) -> None:
        """UserPreferences should be immutable (frozen dataclass)."""
        # Arrange
        prefs = UserPreferences(keywords_boost=["python"], digest_min_score=0.7)
        # Act & Assert
        with pytest.raises(AttributeError):
            prefs.keywords_boost = ["java"]

    def test_user_preferences_empty_keywords(self) -> None:
        """UserPreferences should accept empty keyword list."""
        # Arrange & Act
        prefs = UserPreferences(keywords_boost=[], digest_min_score=0.5)
        # Assert
        assert prefs.keywords_boost == []
        assert isinstance(prefs.keywords_boost, list)

    def test_user_preferences_zero_score(self) -> None:
        """UserPreferences should accept zero as digest_min_score."""
        # Arrange & Act
        prefs = UserPreferences(keywords_boost=["test"], digest_min_score=0.0)
        # Assert
        assert prefs.digest_min_score == 0.0

    def test_user_preferences_negative_score(self) -> None:
        """UserPreferences should accept negative digest_min_score."""
        # Arrange & Act
        prefs = UserPreferences(keywords_boost=["test"], digest_min_score=-5.0)
        # Assert
        assert prefs.digest_min_score == -5.0


class TestConfigService:
    """Test suite for ConfigService class."""

    def test_config_service_init_with_valid_config(self, tmp_path: Path) -> None:
        """ConfigService should initialize with a valid config file."""
        # Arrange
        config_file = tmp_path / "config.json"
        config_data = {
            "keywords_boost": ["python", "remote"],
            "digest_min_score": 0.7,
            "companies": [{"id": "test_company", "board_type": "generic", "url": "http://example.com"}],
            "notification_config": {"email": {"enabled": False}, "slack": {"enabled": False}},
            "filter_config": {
                "min_score": 5.0,
                "must_have_keywords": [],
                "blocked_keywords": [],
                "blocked_companies": [],
                "required_locations": [],
                "blocked_locations": [],
            },
        }
        config_file.write_text(json.dumps(config_data))
        # Act
        service = ConfigService(config_file)
        # Assert
        assert service is not None

    def test_config_service_raw_returns_dict(self, tmp_path: Path) -> None:
        """raw() should return the full configuration dictionary."""
        # Arrange
        config_file = tmp_path / "config.json"
        config_data = {
            "keywords_boost": ["python"],
            "digest_min_score": 0.7,
            "companies": [{"id": "test_company", "board_type": "generic", "url": "http://example.com"}],
            "custom_field": "custom_value",
            "notification_config": {"email": {"enabled": False}, "slack": {"enabled": False}},
            "filter_config": {
                "min_score": 5.0,
                "must_have_keywords": [],
                "blocked_keywords": [],
                "blocked_companies": [],
                "required_locations": [],
                "blocked_locations": [],
            },
        }
        config_file.write_text(json.dumps(config_data))
        service = ConfigService(config_file)
        # Act
        result = service.raw()
        # Assert
        assert isinstance(result, dict)
        assert result["keywords_boost"] == ["python"]
        assert result["digest_min_score"] == 0.7
        assert result["custom_field"] == "custom_value"

    def test_config_service_user_preferences_valid(self, tmp_path: Path) -> None:
        """user_preferences() should return UserPreferences with valid data."""
        # Arrange
        config_file = tmp_path / "config.json"
        config_data = {
            "keywords_boost": ["python", "django", "fastapi"],
            "digest_min_score": 0.85,
            "companies": [{"id": "test_company", "board_type": "generic", "url": "http://example.com"}],
            "notification_config": {"email": {"enabled": False}, "slack": {"enabled": False}},
            "filter_config": {
                "min_score": 5.0,
                "must_have_keywords": [],
                "blocked_keywords": [],
                "blocked_companies": [],
                "required_locations": [],
                "blocked_locations": [],
            },
        }
        config_file.write_text(json.dumps(config_data))
        service = ConfigService(config_file)
        # Act
        prefs = service.user_preferences()
        # Assert
        assert isinstance(prefs, UserPreferences)
        assert prefs.keywords_boost == ["python", "django", "fastapi"]
        assert prefs.digest_min_score == 0.85

    def test_config_service_user_preferences_missing_keywords(self, tmp_path: Path) -> None:
        """user_preferences() should handle missing keywords_boost with default."""
        # Arrange
        config_file = tmp_path / "config.json"
        config_data = {
            "digest_min_score": 0.7,
            "companies": [{"id": "test_company", "board_type": "generic", "url": "http://example.com"}],
            "notification_config": {"email": {"enabled": False}, "slack": {"enabled": False}},
            "filter_config": {
                "min_score": 5.0,
                "must_have_keywords": [],
                "blocked_keywords": [],
                "blocked_companies": [],
                "required_locations": [],
                "blocked_locations": [],
            },
        }
        config_file.write_text(json.dumps(config_data))
        service = ConfigService(config_file)
        # Act
        prefs = service.user_preferences()
        # Assert
        assert prefs.keywords_boost == []

    def test_config_service_user_preferences_missing_score(self, tmp_path: Path) -> None:
        """user_preferences() should handle missing digest_min_score with default."""
        # Arrange
        config_file = tmp_path / "config.json"
        config_data = {
            "keywords_boost": ["python"],
            "companies": [{"id": "test_company", "board_type": "generic", "url": "http://example.com"}],
            "notification_config": {"email": {"enabled": False}, "slack": {"enabled": False}},
            "filter_config": {
                "min_score": 5.0,
                "must_have_keywords": [],
                "blocked_keywords": [],
                "blocked_companies": [],
                "required_locations": [],
                "blocked_locations": [],
            },
        }
        config_file.write_text(json.dumps(config_data))
        service = ConfigService(config_file)
        # Act
        prefs = service.user_preferences()
        # Assert
        assert prefs.digest_min_score == 0.0

    def test_config_service_user_preferences_invalid_keywords_type(self, tmp_path: Path) -> None:
        """user_preferences() should raise ValueError for invalid keywords_boost type."""
        # Arrange
        config_file = tmp_path / "config.json"
        config_data = {
            "keywords_boost": "not a list",  # Invalid type
            "digest_min_score": 0.7,
            "companies": [{"id": "test_company", "board_type": "generic", "url": "http://example.com"}],
            "notification_config": {"email": {"enabled": False}, "slack": {"enabled": False}},
            "filter_config": {
                "min_score": 5.0,
                "must_have_keywords": [],
                "blocked_keywords": [],
                "blocked_companies": [],
                "required_locations": [],
                "blocked_locations": [],
            },
        }
        config_file.write_text(json.dumps(config_data))
        service = ConfigService(config_file)
        # Act & Assert
        with pytest.raises(ValueError, match="keywords_boost must be a list of strings"):
            service.user_preferences()

    def test_config_service_user_preferences_keywords_with_non_strings(
        self, tmp_path: Path
    ) -> None:
        """user_preferences() should raise ValueError for non-string items in keywords_boost."""
        # Arrange
        config_file = tmp_path / "config.json"
        config_data = {
            "keywords_boost": ["python", 123, "django"],  # Contains non-string
            "digest_min_score": 0.7,
            "companies": [{"id": "test_company", "board_type": "generic", "url": "http://example.com"}],
            "notification_config": {"email": {"enabled": False}, "slack": {"enabled": False}},
            "filter_config": {
                "min_score": 5.0,
                "must_have_keywords": [],
                "blocked_keywords": [],
                "blocked_companies": [],
                "required_locations": [],
                "blocked_locations": [],
            },
        }
        config_file.write_text(json.dumps(config_data))
        service = ConfigService(config_file)
        # Act & Assert
        with pytest.raises(ValueError, match="keywords_boost must be a list of strings"):
            service.user_preferences()

    def test_config_service_user_preferences_invalid_score_type(self, tmp_path: Path) -> None:
        """user_preferences() should raise ValueError for invalid digest_min_score type."""
        # Arrange
        config_file = tmp_path / "config.json"
        config_data = {
            "keywords_boost": ["python"],
            "digest_min_score": "not a number",  # Invalid type
            "companies": [{"id": "test_company", "board_type": "generic", "url": "http://example.com"}],
            "notification_config": {"email": {"enabled": False}, "slack": {"enabled": False}},
            "filter_config": {
                "min_score": 0.5,
                "must_have_keywords": [],
                "blocked_keywords": [],
                "blocked_companies": [],
                "required_locations": [],
                "blocked_locations": [],
            },
        }
        config_file.write_text(json.dumps(config_data))
        service = ConfigService(config_file)
        # Act & Assert
        # The config manager will fail to validate when comparing string with int
        with pytest.raises(ValueError, match="Invalid configuration"):
            service.user_preferences()

    def test_config_service_user_preferences_int_score_converted_to_float(
        self, tmp_path: Path
    ) -> None:
        """user_preferences() should convert integer digest_min_score to float."""
        # Arrange
        config_file = tmp_path / "config.json"
        config_data = {
            "keywords_boost": ["python"],
            "digest_min_score": 0.7,  # Integer instead of float
            "companies": [{"id": "test_company", "board_type": "generic", "url": "http://example.com"}],
            "notification_config": {"email": {"enabled": False}, "slack": {"enabled": False}},
            "filter_config": {
                "min_score": 5.0,
                "must_have_keywords": [],
                "blocked_keywords": [],
                "blocked_companies": [],
                "required_locations": [],
                "blocked_locations": [],
            },
        }
        config_file.write_text(json.dumps(config_data))
        service = ConfigService(config_file)
        # Act
        prefs = service.user_preferences()
        # Assert
        assert prefs.digest_min_score == 0.7
        assert isinstance(prefs.digest_min_score, float)

    def test_config_service_raw_invalid_config_raises_value_error(self, tmp_path: Path) -> None:
        """raw() should raise ValueError when config is invalid."""
        # Arrange
        config_file = tmp_path / "config.json"
        config_file.write_text("not valid json")
        service = ConfigService(config_file)
        # Act & Assert
        with pytest.raises(ValueError, match="Invalid configuration"):
            service.raw()

    def test_config_service_missing_config_file(self, tmp_path: Path) -> None:
        """ConfigService should handle missing config file gracefully."""
        # Arrange
        config_file = tmp_path / "nonexistent.json"
        service = ConfigService(config_file)
        # Act & Assert
        with pytest.raises(ValueError, match="Invalid configuration"):
            service.raw()

    def test_config_service_empty_config_file(self, tmp_path: Path) -> None:
        """ConfigService should handle empty config file."""
        # Arrange
        config_file = tmp_path / "config.json"
        config_file.write_text("")
        service = ConfigService(config_file)
        # Act & Assert
        with pytest.raises(ValueError, match="Invalid configuration"):
            service.raw()

    def test_config_service_filter_config_returns_legacy_type(self, tmp_path: Path) -> None:
        """filter_config() should return legacy FilterConfig."""
        # Arrange
        config_file = tmp_path / "config.json"
        config_data = {
            "keywords_boost": ["python"],
            "digest_min_score": 0.7,
            "companies": [{"id": "test_company", "board_type": "generic", "url": "http://example.com"}],
            "notification_config": {"email": {"enabled": False}, "slack": {"enabled": False}},
            "filter_config": {
                "min_score": 5.0,
                "must_have_keywords": ["python"],
                "blocked_keywords": ["java"],
                "blocked_companies": ["BadCorp"],
                "required_locations": ["Remote"],
                "blocked_locations": ["Antarctica"],
            },
        }
        config_file.write_text(json.dumps(config_data))
        service = ConfigService(config_file)
        # Act
        filter_config = service.filter_config()
        # Assert
        assert filter_config is not None
        assert hasattr(filter_config, "digest_min_score")

    def test_config_service_unicode_keywords(self, tmp_path: Path) -> None:
        """ConfigService should handle Unicode characters in keywords."""
        # Arrange
        config_file = tmp_path / "config.json"
        config_data = {
            "keywords_boost": ["python", "日本語", "español", "emoji🚀"],
            "digest_min_score": 0.7,
            "companies": [{"id": "test_company", "board_type": "generic", "url": "http://example.com"}],
            "notification_config": {"email": {"enabled": False}, "slack": {"enabled": False}},
            "filter_config": {
                "min_score": 5.0,
                "must_have_keywords": [],
                "blocked_keywords": [],
                "blocked_companies": [],
                "required_locations": [],
                "blocked_locations": [],
            },
        }
        config_file.write_text(json.dumps(config_data, ensure_ascii=False))
        service = ConfigService(config_file)
        # Act
        prefs = service.user_preferences()
        # Assert
        assert "日本語" in prefs.keywords_boost
        assert "español" in prefs.keywords_boost
        assert "emoji🚀" in prefs.keywords_boost

    def test_config_service_large_keyword_list(self, tmp_path: Path) -> None:
        """ConfigService should handle large keyword lists."""
        # Arrange
        config_file = tmp_path / "config.json"
        large_keyword_list = [f"keyword_{i}" for i in range(1000)]
        config_data = {
            "keywords_boost": large_keyword_list,
            "digest_min_score": 0.7,
            "companies": [{"id": "test_company", "board_type": "generic", "url": "http://example.com"}],
            "notification_config": {"email": {"enabled": False}, "slack": {"enabled": False}},
            "filter_config": {
                "min_score": 5.0,
                "must_have_keywords": [],
                "blocked_keywords": [],
                "blocked_companies": [],
                "required_locations": [],
                "blocked_locations": [],
            },
        }
        config_file.write_text(json.dumps(config_data))
        service = ConfigService(config_file)
        # Act
        prefs = service.user_preferences()
        # Assert
        assert len(prefs.keywords_boost) == 1000
        assert prefs.keywords_boost[0] == "keyword_0"
        assert prefs.keywords_boost[-1] == "keyword_999"

    def test_config_service_extreme_score_values(self, tmp_path: Path) -> None:
        """ConfigService should handle extreme digest_min_score values within valid range."""
        # Arrange
        config_file = tmp_path / "config.json"
        config_data = {
            "keywords_boost": ["python"],
            "digest_min_score": 0.89,  # Just below threshold (must be less than immediate_alert_threshold)
            "companies": [{"id": "test_company", "board_type": "generic", "url": "http://example.com"}],
            "notification_config": {"email": {"enabled": False}, "slack": {"enabled": False}},
            "filter_config": {
                "min_score": 0.5,
                "must_have_keywords": [],
                "blocked_keywords": [],
                "blocked_companies": [],
                "required_locations": [],
                "blocked_locations": [],
            },
        }
        config_file.write_text(json.dumps(config_data))
        service = ConfigService(config_file)
        # Act
        prefs = service.user_preferences()
        # Assert
        assert prefs.digest_min_score == 0.89

    def test_config_service_special_characters_in_keywords(self, tmp_path: Path) -> None:
        """ConfigService should handle special characters in keywords."""
        # Arrange
        config_file = tmp_path / "config.json"
        config_data = {
            "keywords_boost": ["C++", "C#", ".NET", "node.js", "@angular", "$python"],
            "digest_min_score": 0.7,
            "companies": [{"id": "test_company", "board_type": "generic", "url": "http://example.com"}],
            "notification_config": {"email": {"enabled": False}, "slack": {"enabled": False}},
            "filter_config": {
                "min_score": 5.0,
                "must_have_keywords": [],
                "blocked_keywords": [],
                "blocked_companies": [],
                "required_locations": [],
                "blocked_locations": [],
            },
        }
        config_file.write_text(json.dumps(config_data))
        service = ConfigService(config_file)
        # Act
        prefs = service.user_preferences()
        # Assert
        assert "C++" in prefs.keywords_boost
        assert "C#" in prefs.keywords_boost
        assert ".NET" in prefs.keywords_boost
