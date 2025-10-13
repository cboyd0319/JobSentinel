"""
Flask blueprint for job tracker web UI.

Provides Kanban board and job detail views.
"""

from __future__ import annotations

from flask import Blueprint, Response, jsonify, redirect, render_template, request, url_for
from sqlmodel import Session

from jsa.db import get_session_context
from jsa.tracker.models import JobStatus
from jsa.tracker.service import TrackerService

tracker_bp = Blueprint("tracker", __name__, url_prefix="/tracker")


@tracker_bp.route("/")
def board() -> str:
    """
    Kanban board view showing jobs grouped by status.

    Returns:
        Rendered HTML template
    """
    with get_session_context() as session:
        service = TrackerService(session)

        # Group jobs by status
        jobs_by_status = {
            status: service.get_by_status(status) for status in JobStatus
        }

        return render_template(
            "tracker/board.html",
            jobs_by_status=jobs_by_status,
            statuses=JobStatus,
        )


@tracker_bp.route("/job/<int:job_id>")
def job_detail(job_id: int) -> str:
    """
    Job detail view with contacts, documents, and activity timeline.

    Args:
        job_id: ID of the tracked job

    Returns:
        Rendered HTML template or 404
    """
    with get_session_context() as session:
        service = TrackerService(session)
        tracked_job = service.get_by_id(job_id)

        if not tracked_job:
            return "Job not found", 404

        activities = service.get_activities(job_id)

        return render_template(
            "tracker/detail.html",
            job=tracked_job,
            activities=activities,
            statuses=JobStatus,
        )


@tracker_bp.route("/api/job/<int:job_id>/status", methods=["PATCH"])
def update_status(job_id: int) -> tuple[dict[str, str | int], int]:
    """
    Update job status (for drag-and-drop).

    Args:
        job_id: ID of the tracked job

    Returns:
        JSON response with updated job data
    """
    data = request.get_json()
    if not data or "status" not in data:
        return jsonify({"error": "status required"}), 400

    try:
        new_status = JobStatus(data["status"])
    except ValueError:
        return jsonify({"error": "invalid status"}), 400

    try:
        with get_session_context() as session:
            service = TrackerService(session)
            job = service.update_status(job_id, new_status)

            return jsonify({
                "id": job.id,
                "status": job.status.value,
                "updated_at": job.updated_at.isoformat(),
            }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@tracker_bp.route("/api/job/<int:job_id>/priority", methods=["PATCH"])
def update_priority(job_id: int) -> tuple[dict[str, str | int], int]:
    """
    Update job priority.

    Args:
        job_id: ID of the tracked job

    Returns:
        JSON response with updated job data
    """
    data = request.get_json()
    if not data or "priority" not in data:
        return jsonify({"error": "priority required"}), 400

    try:
        priority = int(data["priority"])
        if not 0 <= priority <= 5:
            return jsonify({"error": "priority must be 0-5"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "invalid priority"}), 400

    try:
        with get_session_context() as session:
            service = TrackerService(session)
            job = service.update_priority(job_id, priority)

            return jsonify({
                "id": job.id,
                "priority": job.priority,
                "updated_at": job.updated_at.isoformat(),
            }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@tracker_bp.route("/api/job/<int:job_id>/notes", methods=["PATCH"])
def update_notes(job_id: int) -> tuple[dict[str, str | int], int]:
    """
    Update job notes.

    Args:
        job_id: ID of the tracked job

    Returns:
        JSON response with updated job data
    """
    data = request.get_json()
    if not data or "notes" not in data:
        return jsonify({"error": "notes required"}), 400

    notes = str(data["notes"])

    try:
        with get_session_context() as session:
            service = TrackerService(session)
            job = service.update_notes(job_id, notes)

            return jsonify({
                "id": job.id,
                "notes": job.notes,
                "updated_at": job.updated_at.isoformat(),
            }), 200
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@tracker_bp.route("/api/job/<int:job_id>/contact", methods=["POST"])
def add_contact(job_id: int) -> tuple[dict[str, str | int], int]:
    """
    Add a contact to a job.

    Args:
        job_id: ID of the tracked job

    Returns:
        JSON response with created contact
    """
    data = request.get_json()
    if not data or "name" not in data:
        return jsonify({"error": "name required"}), 400

    try:
        with get_session_context() as session:
            service = TrackerService(session)

            contact = service.add_contact(
                job_id=job_id,
                name=data["name"],
                email=data.get("email"),
                phone=data.get("phone"),
                role=data.get("role", "recruiter"),
                linkedin_url=data.get("linkedin_url"),
                notes=data.get("notes", ""),
            )

            return jsonify({
                "id": contact.id,
                "name": contact.name,
                "email": contact.email,
                "role": contact.role,
            }), 201
    except Exception as e:
        return jsonify({"error": "Internal server error"}), 500


@tracker_bp.route("/export/csv")
def export_csv() -> Response:
    """
    Export tracked jobs to CSV format.

    Returns:
        CSV file download response
    """
    with get_session_context() as session:
        service = TrackerService(session)
        csv_data = service.export_to_csv()

        return Response(
            csv_data,
            mimetype="text/csv",
            headers={"Content-Disposition": "attachment;filename=tracked_jobs.csv"}
        )


@tracker_bp.route("/export/json")
def export_json() -> Response:
    """
    Export tracked jobs to JSON format.

    Returns:
        JSON file download response
    """
    with get_session_context() as session:
        service = TrackerService(session)
        json_data = service.export_to_json()

        return Response(
            json_data,
            mimetype="application/json",
            headers={"Content-Disposition": "attachment;filename=tracked_jobs.json"}
        )
