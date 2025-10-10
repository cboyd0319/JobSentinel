from __future__ import annotations

import pytest

pytest.importorskip("flask")

from jsa.web.app import create_app  # noqa: E402


def test_endpoints_smoke_gets():
    app = create_app()
    client = app.test_client()
    for path in ["/", "/logs", "/skills", "/review", "/healthz"]:
        resp = client.get(path)
        # Some routes may redirect (e.g., review feedback), but these are GET pages
        assert resp.status_code in (200, 302)
