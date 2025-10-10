"""Thin compatibility shim that defers to the new web app factory.

Legacy imports may reference this module directly. Prefer running via
`python -m jsa.web.app` or the CLI entrypoint once packaging is enabled.
"""

from __future__ import annotations

import os

from jsa.web.app import create_app

app = create_app()


if __name__ == "__main__":
    print("Starting Job Scraper Web UI...")
    debug_mode = os.getenv("FLASK_ENV") == "development"
    app.run(debug=debug_mode, port=5000)
