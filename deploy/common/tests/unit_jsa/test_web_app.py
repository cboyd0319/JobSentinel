from __future__ import annotations

import pytest

pytest.importorskip("flask")

from jsa.web.app import create_app  # noqa: E402


def test_app_factory_registers_blueprints():
    app = create_app()
    rules = {rule.rule for rule in app.url_map.iter_rules()}
    assert "/" in rules
    assert "/logs" in rules
    assert "/skills" in rules
    assert any(r.startswith("/review") for r in rules)
