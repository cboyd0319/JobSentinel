from __future__ import annotations

import json

from flask import Blueprint, flash, request
from flask.typing import ResponseReturnValue

bp = Blueprint("slack", __name__)


@bp.post("/slack/interactive")
def slack_interactive() -> ResponseReturnValue:
    payload_raw = request.form.get("payload") or "{}"
    try:
        payload = json.loads(payload_raw)
    except json.JSONDecodeError:
        return "", 400

    try:
        action = payload["actions"][0]
        action_id = action["action_id"]
        job_id = int(action["value"].split("_")[1])
    except Exception:
        return "", 400

    if action_id == "good_match":
        flash(f"Marked job {job_id} as a good match.", "success")
    elif action_id == "bad_match":
        flash(f"Marked job {job_id} as a bad match.", "danger")
    return "", 200
