import os
import json
from pathlib import Path
from urllib.parse import urlparse, urlunparse
import secrets
from flask import Flask, render_template, request, redirect, url_for, flash, session
from utils.config import config_manager
from src.database import get_database_stats_sync, get_sync_session, Job
from sqlmodel import select

# --- Flask App Initialization ---
app = Flask(__name__)

# Use a persistent secret key from environment or generate one
SECRET_KEY_FILE = Path("data/.flask_secret")
if os.getenv("FLASK_SECRET_KEY"):
    app.secret_key = os.getenv("FLASK_SECRET_KEY")
else:
    if SECRET_KEY_FILE.exists():
        with open(SECRET_KEY_FILE, "rb") as f:
            app.secret_key = f.read()
    else:
        SECRET_KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
        app.secret_key = secrets.token_bytes(32)
        with open(SECRET_KEY_FILE, "wb") as f:
            f.write(app.secret_key)
        # Secure the file (Unix-like systems only)
        if os.name != 'nt':
            os.chmod(SECRET_KEY_FILE, 0o600)


def _generate_csrf_token() -> str:
    token = session.get("_csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["_csrf_token"] = token
    return token


app.jinja_env.globals["csrf_token"] = _generate_csrf_token


# --- Filters ---
@app.template_filter("safe_external_url")
def safe_external_url(value: str) -> str:
    """Ensure external links are http(s) URLs; otherwise return '#'."""

    try:
        parsed = urlparse(value)
    except Exception:
        return "#"

    if parsed.scheme not in {"http", "https"}:
        return "#"
    if not parsed.netloc:
        return "#"
    sanitized = parsed._replace(fragment="")
    return urlunparse(sanitized)


# --- Helper Functions ---
def read_logs(lines=100):
    """Reads the last N lines from the log file."""
    try:
        log_dir = Path("data/logs")
        if not log_dir.exists():
            return "No log file found."
        log_file = max(
            [p for p in log_dir.glob("*.log")],
            key=os.path.getctime,
        )
        with open(log_file, "r", encoding="utf-8") as f:
            log_lines = f.readlines()
            return "".join(log_lines[-lines:])
    except Exception:
        return "No log file found."


# --- App Routes ---
@app.route("/")
def index():
    """Main dashboard page."""
    try:
        prefs = config_manager.load_config()
        db_stats = get_database_stats_sync()
        with get_sync_session() as session:
            recent_jobs = session.exec(
                select(Job).order_by(Job.created_at.desc()).limit(10)
            ).all()
        return render_template(
            "index.html", prefs=prefs, stats=db_stats, jobs=recent_jobs
        )
    except Exception as e:
        flash(f"Error loading dashboard: {e}", "danger")
        return render_template("index.html", prefs={}, stats={}, jobs=[])


@app.route("/save", methods=["POST"])
def save_config():
    """Saves the user_prefs.json configuration."""
    try:
        form_token = request.form.get("csrf_token")
        session_token = session.get("_csrf_token")
        if not form_token or not session_token or form_token != session_token:
            flash("Invalid submission token. Please try again.", "danger")
            return redirect(url_for("index"))

        # Get the form data as a string
        config_str = request.form.get("config")
        if not config_str:
            flash("Configuration data was empty.", "danger")
            return redirect(url_for("index"))

        # Validate JSON
        try:
            config_data = json.loads(config_str)
        except json.JSONDecodeError:
            flash("Invalid JSON format. Please check your syntax.", "danger")
            return redirect(url_for("index"))

        # Write to file
        with open(config_manager.config_path, "w", encoding="utf-8") as f:
            json.dump(config_data, f, indent=2)

        flash("Configuration saved successfully!", "success")
        session.pop("_csrf_token", None)
    except Exception as e:
        flash(f"Error saving configuration: {e}", "danger")

    return redirect(url_for("index"))


@app.route("/logs")
def logs():
    """Displays the log viewer page."""
    log_content = read_logs(lines=500)
    return render_template("logs.html", log_content=log_content)

@app.route("/skills", methods=["GET"])
def skills():
    """Displays the skill editor page."""
    prefs = config_manager.load_config()
    skills = prefs.get("keywords_boost", [])
    return render_template("skills.html", skills=skills)

@app.route("/save_skills", methods=["POST"])
def save_skills():
    """Saves the updated skills."""
    try:
        form_token = request.form.get("csrf_token")
        session_token = session.get("_csrf_token")
        if not form_token or not session_token or form_token != session_token:
            flash("Invalid submission token. Please try again.", "danger")
            return redirect(url_for("skills"))

        skills_str = request.form.get("skills")
        skills_list = [s.strip() for s in skills_str.split('\n') if s.strip()]

        prefs = config_manager.load_config()
        prefs["keywords_boost"] = skills_list

        with open(config_manager.config_path, "w", encoding="utf-8") as f:
            json.dump(prefs, f, indent=2)

        flash("Skills saved successfully!", "success")
        session.pop("_csrf_token", None)
    except Exception as e:
        flash(f"Error saving skills: {e}", "danger")

    return redirect(url_for("skills"))

@app.route("/review")
def review():
    """Displays the job review page."""
    try:
        with get_sync_session() as session:
            jobs_to_review = session.exec(
                select(Job).order_by(Job.created_at.desc()).limit(20)
            ).all()
        return render_template("review.html", jobs=jobs_to_review)
    except Exception as e:
        flash(f"Error loading jobs for review: {e}", "danger")
        return render_template("review.html", jobs=[])

@app.route("/review_feedback/<int:job_id>/<string:feedback>")
def review_feedback(job_id, feedback):
    """Handles feedback on job matches."""
    try:
        with get_sync_session() as session:
            job = session.get(Job, job_id)
            if job:
                # Here you would add logic to adjust the scoring rules based on the feedback
                # For now, we'll just flash a message
                flash(f"Thank you for your feedback on '{job.title}'!", "success")
    except Exception as e:
        flash(f"Error processing feedback: {e}", "danger")

    return redirect(url_for("review"))

@app.route("/slack/interactive", methods=["POST"])
def slack_interactive():
    """Handles interactive components from Slack."""
    payload = json.loads(request.form.get("payload"))
    action = payload["actions"][0]
    action_id = action["action_id"]
    job_id = int(action["value"].split("_")[1])

    if action_id == "good_match":
        # Add logic to handle good match
        flash(f"Marked job {job_id} as a good match.", "success")
    elif action_id == "bad_match":
        # Add logic to handle bad match
        flash(f"Marked job {job_id} as a bad match.", "danger")

    return "", 200



if __name__ == "__main__":
    print("🚀 Starting Job Scraper Web UI...")
    print("View and edit your configuration at http://127.0.0.1:5000")
    # Only enable debug mode in development, not in production
    debug_mode = os.getenv("FLASK_ENV") == "development"
    app.run(debug=debug_mode, port=5000)
