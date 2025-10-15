from __future__ import annotations

from flask import Blueprint, flash, redirect, render_template, url_for
from flask.typing import ResponseReturnValue
from sqlalchemy import desc
from sqlmodel import select

from database import Job, get_sync_session
from jsa.logging import get_logger

bp = Blueprint("review", __name__)
logger = get_logger("web.review", component="web_ui")


@bp.get("/review")
def review() -> ResponseReturnValue:
    try:
        with get_sync_session() as session:
            from typing import Any

            created_col: Any = Job.created_at
            jobs_to_review = session.exec(select(Job).order_by(desc(created_col)).limit(20)).all()
        return render_template("review.html", jobs=jobs_to_review)
    except Exception as e:
        flash(f"Error loading jobs for review: {e}", "danger")
        return render_template("review.html", jobs=[])


@bp.get("/review_feedback/<int:job_id>/<string:feedback>")
def review_feedback(job_id: int, feedback: str) -> ResponseReturnValue:
    try:
        with get_sync_session() as session:
            job = session.get(Job, job_id)
            if job:
                flash(f"Thank you for your feedback on '{job.title}'!", "success")
    except Exception as e:
        flash(f"Error processing feedback: {e}", "danger")
    return redirect(url_for("review.review"))
