from __future__ import annotations

import json
from pathlib import Path

from jsa.logging import get_logger, setup_logging


def test_env_file_logging(tmp_path: Path, monkeypatch):
    logf = tmp_path / "app.jsonl"
    monkeypatch.setenv("JSA_LOG_FILE", str(logf))
    setup_logging(level="INFO")
    log = get_logger("t", component="test")
    log.info("hello", extra_field=123)
    assert logf.exists()
    content = logf.read_text(encoding="utf-8").strip().splitlines()
    assert content, "log file should have at least one line"
    rec = json.loads(content[-1])
    assert rec.get("message") == "hello"
    assert rec.get("extra_field") == 123
