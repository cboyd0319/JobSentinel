"""
Tracker API endpoints (v1).

Provides CRUD operations for tracked jobs.
"""

from __future__ import annotations

from flask import Blueprint, jsonify, request

from jsa.db import get_session_context
from jsa.tracker.models import JobStatus
from jsa.tracker.service import TrackerService
from jsa.web.blueprints.api.auth import require_api_key

tracker_api_bp = Blueprint("tracker_api_v1", __name__, url_prefix="/api/v1/tracker")


@tracker_api_bp.route("/jobs", methods=["GET"])
@require_api_key
def list_tracked_jobs() -> tuple[dict, int]:
    """
    List all tracked jobs.

    Query Parameters:
        status: Filter by status (bookmarked, applied, interviewing, offer, rejected, withdrawn)

    Returns:
        JSON response with tracked jobs
    """
    status_filter = request.args.get("status")

    with get_session_context() as session:
        service = TrackerService(session)

        if status_filter:
            try:
                status = JobStatus(status_filter)
                jobs = service.get_by_status(status)
            except ValueError:
                return jsonify({"error": "Invalid status"}), 400
        else:
            jobs = service.get_all()

        return jsonify({
            "jobs": [
                {
                    "id": job.id,
                    "job_id": job.job_id,
                    "status": job.status.value,
                    "priority": job.priority,
                    "notes": job.notes,
                    "added_at": job.added_at.isoformat(),
                    "updated_at": job.updated_at.isoformat(),
                    "applied_at": job.applied_at.isoformat() if job.applied_at else None,
                    "interview_at": job.interview_at.isoformat() if job.interview_at else None,
                }
                for job in jobs
            ]
        }), 200


@tracker_api_bp.route("/jobs", methods=["POST"])
@require_api_key
def add_tracked_job() -> tuple[dict, int]:
    """
    Add a job to the tracker.

    Request Body:
        job_id: ID of the job to track (required)
        status: Initial status (default: bookmarked)
        priority: Priority 0-5 (default: 3)
        notes: Optional notes

    Returns:
        JSON response with created tracked job
    """
    data = request.get_json()

    if not data or "job_id" not in data:
        return jsonify({"error": "job_id is required"}), 400

    job_id = data["job_id"]
    status_str = data.get("status", "bookmarked")
    priority = data.get("priority", 3)
    notes = data.get("notes", "")

    try:
        status = JobStatus(status_str)
    except ValueError:
        return jsonify({"error": "Invalid status"}), 400

    if not 0 <= priority <= 5:
        return jsonify({"error": "Priority must be between 0 and 5"}), 400

    try:
        with get_session_context() as session:
            service = TrackerService(session)
            tracked_job = service.add_job(
                job_id=job_id,
                status=status,
                priority=priority,
                notes=notes,
            )

            return jsonify({
                "id": tracked_job.id,
                "job_id": tracked_job.job_id,
                "status": tracked_job.status.value,
                "priority": tracked_job.priority,
                "notes": tracked_job.notes,
                "added_at": tracked_job.added_at.isoformat(),
            }), 201
    except Exception as e:
        return jsonify({"error": f"Failed to add job: {str(e)}"}), 500


@tracker_api_bp.route("/jobs/<int:tracked_job_id>", methods=["GET"])
@require_api_key
def get_tracked_job(tracked_job_id: int) -> tuple[dict, int]:
    """
    Get a tracked job by ID.

    Args:
        tracked_job_id: Tracked job ID

    Returns:
        JSON response with tracked job data
    """
    with get_session_context() as session:
        service = TrackerService(session)
        job = service.get_by_id(tracked_job_id)

        if not job:
            return jsonify({"error": "Tracked job not found"}), 404

        return jsonify({
            "id": job.id,
            "job_id": job.job_id,
            "status": job.status.value,
            "priority": job.priority,
            "notes": job.notes,
            "added_at": job.added_at.isoformat(),
            "updated_at": job.updated_at.isoformat(),
            "applied_at": job.applied_at.isoformat() if job.applied_at else None,
            "interview_at": job.interview_at.isoformat() if job.interview_at else None,
        }), 200


@tracker_api_bp.route("/jobs/<int:tracked_job_id>/status", methods=["PATCH"])
@require_api_key
def update_tracked_job_status(tracked_job_id: int) -> tuple[dict, int]:
    """
    Update tracked job status.

    Args:
        tracked_job_id: Tracked job ID

    Request Body:
        status: New status (required)

    Returns:
        JSON response with updated tracked job
    """
    data = request.get_json()

    if not data or "status" not in data:
        return jsonify({"error": "status is required"}), 400

    try:
        status = JobStatus(data["status"])
    except ValueError:
        return jsonify({"error": "Invalid status"}), 400

    try:
        with get_session_context() as session:
            service = TrackerService(session)
            job = service.update_status(tracked_job_id, status)

            return jsonify({
                "id": job.id,
                "status": job.status.value,
                "updated_at": job.updated_at.isoformat(),
            }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500
