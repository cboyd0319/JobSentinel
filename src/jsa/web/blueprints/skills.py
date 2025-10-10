from __future__ import annotations

import json

from flask import Blueprint, flash, redirect, render_template, request, session, url_for
from flask.typing import ResponseReturnValue

from jsa.logging import get_logger
from utils.config import config_manager

bp = Blueprint("skills", __name__)
logger = get_logger("web.skills", component="web_ui")


@bp.get("/skills")
def skills() -> ResponseReturnValue:
    try:
        prefs = config_manager.load_config()
        skills_list = prefs.get("keywords_boost", [])
    except Exception:
        skills_list = []
    return render_template("skills.html", skills=skills_list)


@bp.post("/save_skills")
def save_skills() -> ResponseReturnValue:
    try:
        form_token = request.form.get("csrf_token")
        session_token = session.get("_csrf_token")
        if not form_token or not session_token or form_token != session_token:
            flash("Invalid submission token. Please try again.", "danger")
            return redirect(url_for("skills.skills"))

        skills_str = request.form.get("skills") or ""
        skills_list = [s.strip() for s in skills_str.split("\n") if s.strip()]

        prefs = config_manager.load_config()
        prefs["keywords_boost"] = skills_list

        with open(config_manager.config_path, "w", encoding="utf-8") as f:
            json.dump(prefs, f, indent=2)

        flash("Skills saved successfully!", "success")
        session.pop("_csrf_token", None)
    except Exception as e:
        # No secrets; user-facing message
        flash(f"Error saving skills: {e}", "danger")
    return redirect(url_for("skills.skills"))
