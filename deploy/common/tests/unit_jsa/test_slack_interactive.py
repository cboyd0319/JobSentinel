from __future__ import annotations

import pytest

pytest.importorskip("flask")

from jsa.web.app import create_app  # noqa: E402


def test_slack_interactive_malformed_payload():
    app = create_app()
    client = app.test_client()
    resp = client.post("/slack/interactive", data={"payload": "{"})
    assert resp.status_code == 400


def test_slack_interactive_minimum_good_payload():
    app = create_app()
    client = app.test_client()
    payload = {
        "actions": [
            {
                "action_id": "good_match",
                "value": "job_123",
            }
        ]
    }
    import json

    resp = client.post("/slack/interactive", data={"payload": json.dumps(payload)})
    assert resp.status_code == 200
