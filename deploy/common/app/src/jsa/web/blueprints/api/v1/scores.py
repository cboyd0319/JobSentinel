"""
Scoring API endpoints (v1).

Provides job scoring and matching functionality.
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from jsa.db import Job, get_session_context
from jsa.web.blueprints.api.auth import require_api_key

scores_api_bp = Blueprint("scores_api_v1", __name__, url_prefix="/api/v1/scores")


@scores_api_bp.route("/job/<int:job_id>", methods=["GET"])
@require_api_key
def get_job_score(job_id: int) -> tuple[dict, int]:
    """
    Get score for a specific job.

    Args:
        job_id: Job ID

    Returns:
        JSON response with job score and factors
    """
    with get_session_context() as session:
        job = session.get(Job, job_id)

        if not job:
            return jsonify({"error": "Job not found"}), 404

        # Return score information
        return (
            jsonify(
                {
                    "job_id": job.id,
                    "overall_score": getattr(job, "score", 0.0),
                    "factors": {
                        "skills": getattr(job, "skills_score", 0.0),
                        "salary": getattr(job, "salary_score", 0.0),
                        "location": getattr(job, "location_score", 0.0),
                        "company": getattr(job, "company_score", 0.0),
                        "recency": getattr(job, "recency_score", 0.0),
                    },
                }
            ),
            200,
        )


@scores_api_bp.route("/calculate", methods=["POST"])
@require_api_key
def calculate_score() -> tuple[dict, int]:
    """
    Calculate score for job data.

    Request Body:
        title: Job title
        description: Job description
        company: Company name
        location: Job location
        salary_min: Minimum salary (optional)
        salary_max: Maximum salary (optional)
        keywords: List of keywords to match (optional)

    Returns:
        JSON response with calculated score
    """
    data = request.get_json()

    if not data:
        return jsonify({"error": "Request body required"}), 400

    # Validate required fields
    required_fields = ["title", "description"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"'{field}' is required"}), 400

    # Simple scoring algorithm
    # TODO: Integrate with actual scoring logic from matchers/
    title = data.get("title", "").lower()
    description = data.get("description", "").lower()
    keywords = data.get("keywords", [])

    # Skills score (keyword matching)
    skills_score = 0.0
    if keywords:
        matched_keywords = sum(
            1 for keyword in keywords if keyword.lower() in title or keyword.lower() in description
        )
        skills_score = min(matched_keywords / len(keywords), 1.0)

    # Salary score (simplified)
    salary_score = 0.5  # Default neutral score

    # Location score (simplified - "remote" gets bonus)
    location = data.get("location", "").lower()
    location_score = 0.8 if "remote" in location else 0.5

    # Company score (simplified)
    company_score = 0.5  # Default neutral score

    # Recency score (simplified - assume recent)
    recency_score = 0.9

    # Calculate overall score (weighted average)
    weights = {
        "skills": 0.4,
        "salary": 0.25,
        "location": 0.2,
        "company": 0.1,
        "recency": 0.05,
    }

    overall_score = (
        skills_score * weights["skills"]
        + salary_score * weights["salary"]
        + location_score * weights["location"]
        + company_score * weights["company"]
        + recency_score * weights["recency"]
    )

    return (
        jsonify(
            {
                "overall_score": round(overall_score, 2),
                "factors": {
                    "skills": round(skills_score, 2),
                    "salary": round(salary_score, 2),
                    "location": round(location_score, 2),
                    "company": round(company_score, 2),
                    "recency": round(recency_score, 2),
                },
                "weights": weights,
            }
        ),
        200,
    )


@scores_api_bp.route("/top", methods=["GET"])
@require_api_key
def get_top_jobs() -> tuple[dict, int]:
    """
    Get top-scored jobs.

    Query Parameters:
        limit: Number of jobs to return (default: 10, max: 100)
        min_score: Minimum score threshold (default: 0.7)

    Returns:
        JSON response with top jobs
    """
    limit = min(request.args.get("limit", 10, type=int), 100)
    min_score = request.args.get("min_score", 0.7, type=float)

    with get_session_context() as session:
        from sqlmodel import select

        statement = (
            select(Job).where(Job.score >= min_score).order_by(Job.score.desc()).limit(limit)
        )

        jobs = session.exec(statement).all()

        return (
            jsonify(
                {
                    "jobs": [
                        {
                            "id": job.id,
                            "title": job.title,
                            "company": job.company,
                            "score": getattr(job, "score", 0.0),
                        }
                        for job in jobs
                    ],
                    "count": len(jobs),
                    "min_score": min_score,
                }
            ),
            200,
        )
