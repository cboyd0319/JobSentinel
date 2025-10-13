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
