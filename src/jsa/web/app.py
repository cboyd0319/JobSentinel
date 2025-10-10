from __future__ import annotations

"""
Flask application factory and setup.

Security:
  - Secret key persisted securely in data/.flask_secret (0600 on non-Windows)
  - CSRF token helper registered into Jinja env
Observability:
  - Structured logs with trace_id via jsa.logging
"""

import os
import secrets
from pathlib import Path

from flask import Flask, session

from jsa.logging import get_logger, setup_logging
from jsa.web.blueprints.main import bp as main_bp
from jsa.web.blueprints.review import bp as review_bp
from jsa.web.blueprints.skills import bp as skills_bp
from jsa.web.blueprints.slack import bp as slack_bp


def _load_or_create_secret(path: Path) -> bytes:
    if path.exists():
        return path.read_bytes()
    path.parent.mkdir(parents=True, exist_ok=True)
    key = secrets.token_bytes(32)
    path.write_bytes(key)
    if os.name != "nt":
        try:
            os.chmod(path, 0o600)
        except PermissionError:
            # Best-effort; do not fail creation
            pass
    return key


def _generate_csrf_token() -> str:
    token = session.get("_csrf_token")
    if not token:
        token = secrets.token_urlsafe(32)
        session["_csrf_token"] = token
    return token


def create_app() -> Flask:
    """Create and configure Flask application.

    Contract:
      post: app configured with blueprints and csrf_token helper
    """
    setup_logging(level=os.getenv("LOG_LEVEL", "INFO"))
    logger = get_logger("web", component="web_ui")

    # Point templates at project-level templates directory
    templates_path = Path(__file__).resolve().parents[3] / "templates"
    app = Flask(__name__, template_folder=str(templates_path))

    # Secret key
    secret_env = os.getenv("FLASK_SECRET_KEY")
    if secret_env:
        app.secret_key = secret_env
    else:
        app.secret_key = _load_or_create_secret(Path("data/.flask_secret"))

    # Jinja helpers
    app.jinja_env.globals["csrf_token"] = _generate_csrf_token

    # Blueprints
    app.register_blueprint(main_bp)
    app.register_blueprint(skills_bp)
    app.register_blueprint(review_bp)
    app.register_blueprint(slack_bp)

    logger.info("Flask app created", component="web_ui")
    return app
