from __future__ import annotations

import json
from pathlib import Path

import pytest

from jsa.config import ConfigService


def write_config(tmp: Path, data: dict) -> Path:
    p = tmp / "user_prefs.json"
    p.write_text(json.dumps(data), encoding="utf-8")
    return p


def test_user_preferences_happy(tmp_path: Path):
    cfg = {
        "keywords_boost": ["python"],
        "digest_min_score": 0.5,
        "companies": [{"id": "x", "board_type": "greenhouse", "url": "https://example.com"}],
        "title_allowlist": ["engineer"],
    }
    path = write_config(tmp_path, cfg)
    svc = ConfigService(config_path=path)
    prefs = svc.user_preferences()
    assert prefs.keywords_boost == ["python"]
    assert prefs.digest_min_score == 0.5


def test_user_preferences_negative_types(tmp_path: Path):
    cfg = {
        "keywords_boost": "nope",  # wrong type
        "digest_min_score": "bad",  # wrong type
        # provide valid minimal config to pass legacy validation
        "companies": [{"id": "x", "board_type": "greenhouse", "url": "https://e.com"}],
        "title_allowlist": ["x"],
    }
    path = write_config(tmp_path, cfg)
    svc = ConfigService(config_path=path)
    with pytest.raises(ValueError):
        _ = svc.user_preferences()


def test_user_preferences_keywords_boost_not_list(tmp_path: Path):
    """Test that non-list keywords_boost raises ValueError."""
    cfg = {
        "keywords_boost": "should be list",  # wrong type
        "digest_min_score": 0.5,
        "companies": [{"id": "x", "board_type": "greenhouse", "url": "https://e.com"}],
        "title_allowlist": ["x"],
    }
    path = write_config(tmp_path, cfg)
    svc = ConfigService(config_path=path)
    with pytest.raises(ValueError, match="keywords_boost must be a list of strings"):
        _ = svc.user_preferences()


def test_user_preferences_keywords_boost_non_string_items(tmp_path: Path):
    """Test that keywords_boost with non-string items raises ValueError."""
    cfg = {
        "keywords_boost": ["python", 123, "backend"],  # has non-string item
        "digest_min_score": 0.5,
        "companies": [{"id": "x", "board_type": "greenhouse", "url": "https://e.com"}],
        "title_allowlist": ["x"],
    }
    path = write_config(tmp_path, cfg)
    svc = ConfigService(config_path=path)
    with pytest.raises(ValueError, match="keywords_boost must be a list of strings"):
        _ = svc.user_preferences()


def test_user_preferences_digest_min_score_wrong_type(tmp_path: Path):
    """Test that non-numeric digest_min_score raises ValueError."""
    cfg = {
        "keywords_boost": ["python"],
        "digest_min_score": "not a number",  # wrong type
        "companies": [{"id": "x", "board_type": "greenhouse", "url": "https://e.com"}],
        "title_allowlist": ["x"],
    }
    path = write_config(tmp_path, cfg)
    svc = ConfigService(config_path=path)
    # Legacy config manager will catch this first with its own validation
    with pytest.raises(ValueError):
        _ = svc.user_preferences()


def test_filter_config_returns_legacy_filter_config(tmp_path: Path):
    """Test that filter_config method returns FilterConfig."""
    cfg = {
        "keywords_boost": ["python"],
        "digest_min_score": 0.5,
        "companies": [{"id": "x", "board_type": "greenhouse", "url": "https://e.com"}],
        "title_allowlist": ["engineer"],
    }
    path = write_config(tmp_path, cfg)
    svc = ConfigService(config_path=path)
    filter_cfg = svc.filter_config()
    # Just check that it returns something (FilterConfig type)
    assert filter_cfg is not None
    assert hasattr(filter_cfg, "title_allowlist") or hasattr(filter_cfg, "keywords_boost")


def test_user_preferences_digest_min_score_type_check_with_mock(tmp_path: Path, mocker):
    """Test digest_min_score type validation using mock."""
    cfg = {
        "keywords_boost": ["python"],
        "digest_min_score": 0.5,
        "companies": [{"id": "x", "board_type": "greenhouse", "url": "https://e.com"}],
        "title_allowlist": ["engineer"],
    }
    path = write_config(tmp_path, cfg)
    svc = ConfigService(config_path=path)
    
    # Mock raw() to return invalid digest_min_score type
    mocker.patch.object(svc, 'raw', return_value={
        "keywords_boost": ["python"],
        "digest_min_score": "invalid",  # This bypasses legacy validation
    })
    
    with pytest.raises(ValueError, match="digest_min_score must be a number"):
        _ = svc.user_preferences()
