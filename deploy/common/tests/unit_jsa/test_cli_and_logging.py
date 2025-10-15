from __future__ import annotations

import json
from pathlib import Path

import pytest

from jsa.cli import build_parser, main
from jsa.logging import get_logger, performance_logger, setup_logging


def test_cli_builds():
    p = build_parser()
    assert p.prog == "jsa"


def test_cli_config_validate(tmp_path: Path, monkeypatch):
    cfg = {
        "keywords_boost": ["python"],
        "digest_min_score": 0.5,
        "companies": [{"id": "x", "board_type": "greenhouse", "url": "https://e.com"}],
        "title_allowlist": ["engineer"],
    }
    path = tmp_path / "user_prefs.json"
    path.write_text(json.dumps(cfg), encoding="utf-8")

    # run main without exiting
    rc = main(["config-validate", "--path", str(path)])
    assert rc == 0


def test_performance_logger_injected_failure():
    setup_logging()
    log = get_logger("t", component="test")
    with pytest.raises(RuntimeError):
        with performance_logger(log, operation="fail-op", log_start=False):
            raise RuntimeError("boom")


def test_cli_health_smoke():
    # Just ensure the command returns an exit code
    rc = main(["health"])  # may be degraded if DB not initialized
    assert rc in (0, 1)
