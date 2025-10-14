"""
Job API endpoints (v1).

Provides CRUD operations for jobs.
"""

from __future__ import annotations

import logging

from flask import Blueprint, jsonify, request
from sqlmodel import select

from jsa.db import Job, get_session_context
from jsa.web.blueprints.api.auth import require_api_key

logger = logging.getLogger(__name__)

jobs_api_bp = Blueprint("jobs_api_v1", __name__, url_prefix="/api/v1/jobs")


@jobs_api_bp.route("/", methods=["GET"])
@require_api_key
def list_jobs() -> tuple[dict, int]:
    """
    List all jobs with pagination and filtering.

    Query Parameters:
        page: Page number (default: 1)
        per_page: Results per page (default: 50, max: 100)
        source: Filter by job source
        min_score: Filter by minimum score

    Returns:
        JSON response with jobs list
    """
    # Pagination
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 50, type=int), 100)

    # Filters
    source = request.args.get("source")
    min_score = request.args.get("min_score", type=float)

    with get_session_context() as session:
        statement = select(Job)

        if source:
            statement = statement.where(Job.source == source)
        if min_score is not None:
            statement = statement.where(Job.score >= min_score)

        statement = statement.limit(per_page).offset((page - 1) * per_page)

        jobs = session.exec(statement).all()

        return (
            jsonify(
                {
                    "jobs": [job.dict() for job in jobs],
                    "page": page,
                    "per_page": per_page,
                }
            ),
            200,
        )


@jobs_api_bp.route("/<int:job_id>", methods=["GET"])
@require_api_key
def get_job(job_id: int) -> tuple[dict, int]:
    """
    Get a single job by ID.

    Args:
        job_id: Job ID

    Returns:
        JSON response with job data
    """
    with get_session_context() as session:
        job = session.get(Job, job_id)

        if not job:
            return jsonify({"error": "Job not found"}), 404

        return jsonify(job.dict()), 200


@jobs_api_bp.route("/", methods=["POST"])
@require_api_key
def create_job() -> tuple[dict, int]:
    """
    Create a new job (for browser extension).

    Request Body:
        title: Job title (required)
        company: Company name (required)
        location: Job location
        url: Job posting URL (required)
        description: Job description
        source: Job source (default: "manual")

    Returns:
        JSON response with created job
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body required"}), 400

    # Validate required fields
    required_fields = ["title", "company", "url"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"'{field}' is required"}), 400

    try:
        with get_session_context() as session:
            job = Job(
                title=data["title"],
                company=data["company"],
                location=data.get("location", ""),
                url=data["url"],
                description=data.get("description", ""),
                source=data.get("source", "manual"),
                score=data.get("score", 0.0),
            )

            session.add(job)
            session.commit()
            session.refresh(job)

            return jsonify(job.dict()), 201
    except Exception as e:
        logger.error(f"Failed to create job: {e}", exc_info=True)
        return jsonify({"error": "Failed to create job"}), 500
