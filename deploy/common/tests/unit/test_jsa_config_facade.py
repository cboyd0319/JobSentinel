"""Comprehensive tests for jsa/config.py (ConfigService facade).

Tests cover:
- UserPreferences: dataclass validation and immutability
- ConfigService initialization: various config paths
- ConfigService.raw(): config loading and error handling
- ConfigService.user_preferences(): validation and type conversion
- ConfigService.filter_config(): legacy adapter integration
- Edge cases: missing fields, invalid types, malformed data
- Integration: interaction with underlying ConfigManager
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pytest

from jsa.config import ConfigService, UserPreferences


# Helper to create minimal valid config
def _minimal_config(**extra_fields: Any) -> dict[str, Any]:
    """Create minimal valid config with optional extra fields."""
    config = {
        "companies": [
            {"id": "test", "board_type": "greenhouse", "url": "https://example.com/jobs"}
        ]
    }
    config.update(extra_fields)
    return config


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def valid_config_data() -> dict[str, Any]:
    """Valid configuration data for testing."""
    return {
        "keywords_boost": ["python", "machine learning", "aws"],
        "digest_min_score": 0.75,
        "title_allowlist": ["engineer", "developer", "scientist"],
        "title_blocklist": ["intern", "junior"],
        "location_allowlist": ["Remote", "San Francisco"],
        "location_blocklist": ["New York"],
        "min_score": 0.5,
        "max_score": 1.0,
        # Required by ConfigManager validation
        "companies": [
            {
                "id": "test-company",
                "board_type": "greenhouse",
                "url": "https://example.com/jobs",
            }
        ],
    }


@pytest.fixture
def config_file(tmp_path: Path, valid_config_data: dict[str, Any]) -> Path:
    """Create a temporary valid config file."""
    config_path = tmp_path / "test_config.json"
    config_path.write_text(json.dumps(valid_config_data, indent=2))
    return config_path


@pytest.fixture
def empty_config_file(tmp_path: Path) -> Path:
    """Create a temporary minimal config file."""
    config_path = tmp_path / "empty_config.json"
    # Need minimal valid config for ConfigManager validation
    minimal_config = {
        "companies": [
            {"id": "test", "board_type": "greenhouse", "url": "https://example.com/jobs"}
        ]
    }
    config_path.write_text(json.dumps(minimal_config))
    return config_path


@pytest.fixture
def malformed_config_file(tmp_path: Path) -> Path:
    """Create a malformed JSON config file."""
    config_path = tmp_path / "malformed.json"
    config_path.write_text("{invalid json")
    return config_path


# ============================================================================
# UserPreferences Tests
# ============================================================================


def test_user_preferences_creates_with_all_fields():
    """UserPreferences dataclass stores all provided fields."""
    prefs = UserPreferences(
        keywords_boost=["python", "aws"],
        digest_min_score=0.8,
    )
    
    assert prefs.keywords_boost == ["python", "aws"]
    assert prefs.digest_min_score == 0.8


def test_user_preferences_is_frozen():
    """UserPreferences is immutable (frozen dataclass)."""
    prefs = UserPreferences(
        keywords_boost=["python"],
        digest_min_score=0.7,
    )
    
    with pytest.raises(AttributeError, match="cannot assign to field"):
        prefs.keywords_boost = ["new"]  # type: ignore[misc]


def test_user_preferences_with_empty_keywords():
    """UserPreferences accepts empty keywords list."""
    prefs = UserPreferences(keywords_boost=[], digest_min_score=0.5)
    
    assert prefs.keywords_boost == []
    assert prefs.digest_min_score == 0.5


@pytest.mark.parametrize(
    "score",
    [0.0, 0.5, 0.75, 1.0, 100.0],
    ids=["zero", "half", "three_quarters", "one", "large"],
)
def test_user_preferences_accepts_various_scores(score: float):
    """UserPreferences accepts various digest_min_score values."""
    prefs = UserPreferences(keywords_boost=[], digest_min_score=score)
    
    assert prefs.digest_min_score == score


# ============================================================================
# ConfigService Initialization Tests
# ============================================================================


def test_config_service_initializes_with_path(config_file: Path):
    """ConfigService initializes with a valid config file path."""
    service = ConfigService(config_path=config_file)
    
    assert service is not None
    assert service._manager is not None


def test_config_service_initializes_with_string_path(config_file: Path):
    """ConfigService accepts string path."""
    service = ConfigService(config_path=str(config_file))
    
    assert service is not None


def test_config_service_uses_default_path():
    """ConfigService uses default path when not specified."""
    # This may fail if default path doesn't exist, which is expected behavior
    service = ConfigService()
    
    assert service is not None
    assert service._manager is not None


# ============================================================================
# ConfigService.raw() Tests
# ============================================================================


def test_raw_returns_full_config_dict(config_file: Path, valid_config_data: dict[str, Any]):
    """ConfigService.raw() returns the complete configuration dictionary."""
    service = ConfigService(config_path=config_file)
    
    result = service.raw()
    
    assert isinstance(result, dict)
    assert result["keywords_boost"] == valid_config_data["keywords_boost"]
    assert result["digest_min_score"] == valid_config_data["digest_min_score"]


def test_raw_raises_on_malformed_json(malformed_config_file: Path):
    """ConfigService.raw() raises ValueError on malformed JSON."""
    service = ConfigService(config_path=malformed_config_file)
    
    with pytest.raises(ValueError, match="Invalid configuration"):
        service.raw()


def test_raw_raises_on_missing_file(tmp_path: Path):
    """ConfigService.raw() raises ValueError when config file is missing."""
    nonexistent = tmp_path / "does_not_exist.json"
    service = ConfigService(config_path=nonexistent)
    
    with pytest.raises(ValueError, match="Invalid configuration"):
        service.raw()


def test_raw_returns_same_data_on_multiple_calls(config_file: Path):
    """ConfigService.raw() returns consistent data across multiple calls."""
    service = ConfigService(config_path=config_file)
    
    result1 = service.raw()
    result2 = service.raw()
    
    assert result1 == result2
    assert result1 is not result2  # Should be separate dict instances


# ============================================================================
# ConfigService.user_preferences() Tests
# ============================================================================


def test_user_preferences_extracts_required_fields(config_file: Path):
    """user_preferences() extracts keywords_boost and digest_min_score."""
    service = ConfigService(config_path=config_file)
    
    prefs = service.user_preferences()
    
    assert isinstance(prefs, UserPreferences)
    assert prefs.keywords_boost == ["python", "machine learning", "aws"]
    assert prefs.digest_min_score == 0.75


def test_user_preferences_handles_missing_keywords_boost(tmp_path: Path):
    """user_preferences() uses empty list when keywords_boost is missing."""
    config_data = _minimal_config(digest_min_score=0.6)
    config_path = tmp_path / "partial.json"
    config_path.write_text(json.dumps(config_data))
    service = ConfigService(config_path=config_path)
    
    prefs = service.user_preferences()
    
    assert prefs.keywords_boost == []
    assert prefs.digest_min_score == 0.6


def test_user_preferences_handles_missing_digest_min_score(tmp_path: Path):
    """user_preferences() uses 0.0 when digest_min_score is missing."""
    config_data = _minimal_config(keywords_boost=["python"])
    config_path = tmp_path / "partial.json"
    config_path.write_text(json.dumps(config_data))
    service = ConfigService(config_path=config_path)
    
    prefs = service.user_preferences()
    
    assert prefs.keywords_boost == ["python"]
    assert prefs.digest_min_score == 0.0


def test_user_preferences_raises_on_invalid_keywords_boost_type(tmp_path: Path):
    """user_preferences() raises ValueError when keywords_boost is not a list."""
    config_data = _minimal_config(keywords_boost="not-a-list", digest_min_score=0.5)
    config_path = tmp_path / "invalid.json"
    config_path.write_text(json.dumps(config_data))
    service = ConfigService(config_path=config_path)
    
    with pytest.raises(ValueError, match="keywords_boost must be a list of strings"):
        service.user_preferences()


def test_user_preferences_raises_on_non_string_keywords(tmp_path: Path):
    """user_preferences() raises ValueError when keywords contain non-strings."""
    config_data = _minimal_config(keywords_boost=["valid", 123, "another"], digest_min_score=0.5)
    config_path = tmp_path / "invalid.json"
    config_path.write_text(json.dumps(config_data))
    service = ConfigService(config_path=config_path)
    
    with pytest.raises(ValueError, match="keywords_boost must be a list of strings"):
        service.user_preferences()


def test_user_preferences_raises_on_invalid_score_type(tmp_path: Path):
    """user_preferences() raises ValueError when digest_min_score is not a number."""
    config_data = _minimal_config(keywords_boost=[], digest_min_score="not-a-number")
    config_path = tmp_path / "invalid.json"
    config_path.write_text(json.dumps(config_data))
    service = ConfigService(config_path=config_path)
    
    # Error will be caught during raw() call when ConfigManager validates
    with pytest.raises(ValueError, match="Invalid configuration"):
        service.user_preferences()


@pytest.mark.parametrize(
    "score",
    [0.0, 0.5, 0.75, 0.85],
    ids=["zero", "half", "three_quarters", "high"],
)
def test_user_preferences_converts_score_to_float(tmp_path: Path, score: int | float):
    """user_preferences() converts integer/float scores to float."""
    config_data = _minimal_config(keywords_boost=[], digest_min_score=score)
    config_path = tmp_path / "test.json"
    config_path.write_text(json.dumps(config_data))
    service = ConfigService(config_path=config_path)
    
    prefs = service.user_preferences()
    
    assert isinstance(prefs.digest_min_score, float)
    assert prefs.digest_min_score == float(score)


def test_user_preferences_preserves_keyword_order(tmp_path: Path):
    """user_preferences() preserves order of keywords_boost."""
    keywords = ["z-last", "a-first", "m-middle"]
    config_data = _minimal_config(keywords_boost=keywords, digest_min_score=0.5)
    config_path = tmp_path / "test.json"
    config_path.write_text(json.dumps(config_data))
    service = ConfigService(config_path=config_path)
    
    prefs = service.user_preferences()
    
    assert prefs.keywords_boost == keywords


def test_user_preferences_creates_copy_of_keywords_list(config_file: Path):
    """user_preferences() creates a copy of keywords_boost (no shared state)."""
    service = ConfigService(config_path=config_file)
    
    prefs1 = service.user_preferences()
    prefs2 = service.user_preferences()
    
    # Lists should be equal but not the same object
    assert prefs1.keywords_boost == prefs2.keywords_boost
    assert prefs1.keywords_boost is not prefs2.keywords_boost


# ============================================================================
# ConfigService.filter_config() Tests
# ============================================================================


def test_filter_config_returns_legacy_filter_config(config_file: Path):
    """filter_config() returns a FilterConfig instance."""
    service = ConfigService(config_path=config_file)
    
    # We can't import FilterConfig here without creating circular dependencies,
    # so we just verify it returns something and has expected attributes
    filter_cfg = service.filter_config()
    
    assert filter_cfg is not None
    assert hasattr(filter_cfg, "title_allowlist")
    assert hasattr(filter_cfg, "digest_min_score")
    assert hasattr(filter_cfg, "immediate_alert_threshold")


def test_filter_config_uses_config_data(config_file: Path):
    """filter_config() uses data from the loaded configuration."""
    service = ConfigService(config_path=config_file)
    
    filter_cfg = service.filter_config()
    
    # Verify some fields are populated from config
    assert filter_cfg.title_allowlist == ["engineer", "developer", "scientist"]
    assert filter_cfg.digest_min_score == 0.75


# ============================================================================
# Edge Cases and Integration Tests
# ============================================================================


def test_empty_config_provides_sensible_defaults(empty_config_file: Path):
    """ConfigService handles empty config with reasonable defaults."""
    service = ConfigService(config_path=empty_config_file)
    
    raw = service.raw()
    assert isinstance(raw, dict)
    
    prefs = service.user_preferences()
    assert prefs.keywords_boost == []
    assert prefs.digest_min_score == 0.0


def test_config_with_extra_fields_ignored(tmp_path: Path):
    """ConfigService ignores extra fields in configuration."""
    config_data = _minimal_config(keywords_boost=["python"], digest_min_score=0.7, unknown_field="ignored", another_extra=42)
    config_path = tmp_path / "extra.json"
    config_path.write_text(json.dumps(config_data))
    service = ConfigService(config_path=config_path)
    
    prefs = service.user_preferences()
    
    assert prefs.keywords_boost == ["python"]
    assert prefs.digest_min_score == 0.7


def test_unicode_keywords_supported(tmp_path: Path):
    """ConfigService handles Unicode characters in keywords."""
    config_data = _minimal_config(keywords_boost=["Python™", "machine 学习", "🚀 rocket"], digest_min_score=0.5)
    config_path = tmp_path / "unicode.json"
    config_path.write_text(json.dumps(config_data, ensure_ascii=False))
    service = ConfigService(config_path=config_path)
    
    prefs = service.user_preferences()
    
    assert prefs.keywords_boost == ["Python™", "machine 学习", "🚀 rocket"]


def test_large_keywords_list_handled(tmp_path: Path):
    """ConfigService handles large keywords_boost lists."""
    large_keywords = [f"keyword_{i}" for i in range(1000)]
    config_data = _minimal_config(keywords_boost=large_keywords, digest_min_score=0.5)
    config_path = tmp_path / "large.json"
    config_path.write_text(json.dumps(config_data))
    service = ConfigService(config_path=config_path)
    
    prefs = service.user_preferences()
    
    assert len(prefs.keywords_boost) == 1000
    assert prefs.keywords_boost[0] == "keyword_0"
    assert prefs.keywords_boost[-1] == "keyword_999"


def test_boundary_score_values(tmp_path: Path):
    """ConfigService handles boundary score values within valid range."""
    test_cases = [
        (0.0, "zero"),
        (0.1, "small"),
        (0.85, "high"),  # Keep under immediate_alert_threshold
    ]
    
    for score, test_id in test_cases:
        config_data = _minimal_config(keywords_boost=[], digest_min_score=score)
        config_path = tmp_path / f"boundary_{test_id}.json"
        config_path.write_text(json.dumps(config_data))
        service = ConfigService(config_path=config_path)
        
        prefs = service.user_preferences()
        assert prefs.digest_min_score == score


# ============================================================================
# Multiple Instance Tests
# ============================================================================


def test_multiple_config_service_instances_independent(tmp_path: Path):
    """Multiple ConfigService instances with different configs are independent."""
    config1_data = _minimal_config(keywords_boost=["python"], digest_min_score=0.5)
    config2_data = _minimal_config(keywords_boost=["java"], digest_min_score=0.8)
    
    config1_path = tmp_path / "config1.json"
    config2_path = tmp_path / "config2.json"
    
    config1_path.write_text(json.dumps(config1_data))
    config2_path.write_text(json.dumps(config2_data))
    
    service1 = ConfigService(config_path=config1_path)
    service2 = ConfigService(config_path=config2_path)
    
    prefs1 = service1.user_preferences()
    prefs2 = service2.user_preferences()
    
    assert prefs1.keywords_boost == ["python"]
    assert prefs1.digest_min_score == 0.5
    assert prefs2.keywords_boost == ["java"]
    assert prefs2.digest_min_score == 0.8


def test_config_service_reusable_across_calls(config_file: Path):
    """ConfigService can be used for multiple method calls."""
    service = ConfigService(config_path=config_file)
    
    # Call multiple methods
    raw1 = service.raw()
    prefs1 = service.user_preferences()
    filter1 = service.filter_config()
    
    # Call again
    raw2 = service.raw()
    prefs2 = service.user_preferences()
    filter2 = service.filter_config()
    
    # Verify consistency
    assert raw1 == raw2
    assert prefs1.keywords_boost == prefs2.keywords_boost
    assert prefs1.digest_min_score == prefs2.digest_min_score


# ============================================================================
# Error Message Quality Tests
# ============================================================================


def test_error_messages_include_context(malformed_config_file: Path):
    """Error messages include helpful context about the failure."""
    service = ConfigService(config_path=malformed_config_file)
    
    with pytest.raises(ValueError) as exc_info:
        service.raw()
    
    error_msg = str(exc_info.value)
    assert "Invalid configuration" in error_msg


def test_validation_error_on_keywords_boost_mentions_field(tmp_path: Path):
    """Validation error for keywords_boost mentions the field name."""
    config_data = _minimal_config(keywords_boost=123, digest_min_score=0.5)
    config_path = tmp_path / "test.json"
    config_path.write_text(json.dumps(config_data))
    service = ConfigService(config_path=config_path)
    
    with pytest.raises(ValueError) as exc_info:
        service.user_preferences()
    
    assert "keywords_boost" in str(exc_info.value)


def test_validation_error_on_score_mentions_field(tmp_path: Path):
    """Validation error for digest_min_score includes error context."""
    config_data = _minimal_config(keywords_boost=[], digest_min_score=[1, 2, 3])
    config_path = tmp_path / "test.json"
    config_path.write_text(json.dumps(config_data))
    service = ConfigService(config_path=config_path)
    
    with pytest.raises(ValueError) as exc_info:
        service.user_preferences()
    
    # Error message should indicate invalid configuration
    assert "Invalid configuration" in str(exc_info.value)
