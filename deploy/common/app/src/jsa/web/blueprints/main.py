from __future__ import annotations

import json
from pathlib import Path

from flask import Blueprint, render_template
from flask.typing import ResponseReturnValue
from sqlalchemy import desc
from sqlmodel import select

from database import Job, get_database_stats_sync, get_sync_session
from jsa.logging import get_logger

bp = Blueprint("main", __name__)
logger = get_logger("web.main", component="web_ui")


def _read_logs(lines: int = 100) -> str:
    try:
        log_dir = Path("data/logs")
        if not log_dir.exists():
            return "No log file found."
        log_files: list[Path] = list(log_dir.glob("*.log"))
        if not log_files:
            return "No log file found."
        log_file = max(log_files, key=lambda p: p.stat().st_ctime)
        content = log_file.read_text(encoding="utf-8", errors="replace")
        return "".join(content.splitlines(keepends=True)[-lines:])
    except Exception as exc:  # Safe: presented to user; no secrets
        return f"Log file access error: {type(exc).__name__}"


@bp.app_template_filter("safe_external_url")
def safe_external_url_filter(value: str) -> str:
    from jsa.http.sanitization import safe_external_url as _safe

    res: str = _safe(value)
    return res


@bp.get("/")
def index() -> ResponseReturnValue:
    prefs: dict[str, object] = {}
    try:
        db_stats = get_database_stats_sync()
        with get_sync_session() as session:
            from typing import Any

            created_col: Any = Job.created_at
            recent_jobs = session.exec(select(Job).order_by(desc(created_col)).limit(10)).all()
    except Exception:
        db_stats = {}
        recent_jobs = []
    return render_template("index.html", prefs=prefs, stats=db_stats, jobs=recent_jobs)


@bp.get("/logs")
def logs() -> ResponseReturnValue:
    content = _read_logs(lines=500)
    return render_template("logs.html", log_content=content)


@bp.post("/save")
def save_config() -> ResponseReturnValue:
    """Save configuration JSON payload from a textarea form.

    Security: requires CSRF token from session to match form token.
    """
    from flask import flash, redirect, request, session, url_for
    from utils.config import config_manager

    try:
        form_token = request.form.get("csrf_token")
        session_token = session.get("_csrf_token")
        if not form_token or not session_token or form_token != session_token:
            flash("Invalid submission token. Please try again.", "danger")
            return redirect(url_for("main.index"))

        config_str = request.form.get("config")
        if not config_str:
            flash("Configuration data was empty.", "danger")
            return redirect(url_for("main.index"))

        try:
            config_data = json.loads(config_str)
        except json.JSONDecodeError:
            flash("Invalid JSON format. Please check your syntax.", "danger")
            return redirect(url_for("main.index"))

        with open(config_manager.config_path, "w", encoding="utf-8") as f:
            json.dump(config_data, f, indent=2)

        flash("Configuration saved successfully!", "success")
        session.pop("_csrf_token", None)
    except Exception as e:
        flash(f"Error saving configuration: {e}", "danger")
    return redirect(url_for("main.index"))


@bp.get("/healthz")
def healthz() -> ResponseReturnValue:
    """Basic health check endpoint with minimal PII."""
    try:
        stats = get_database_stats_sync()
        ok = True
    except Exception:
        stats = {}
        ok = False
    # Do not include sensitive info; minimal payload
    return ({"ok": ok, "stats": {k: stats.get(k) for k in ("total_jobs", "high_score_jobs")}}, 200)
