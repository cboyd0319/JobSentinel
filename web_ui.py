#!/usr/bin/env python3
"""Entry point wrapper for web UI."""

import sys
from pathlib import Path

project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

# Re-export Flask app for backward compatibility
from src.web_ui import app

if __name__ == "__main__":
    from src.web_ui import app
    app.run(debug=False, host='0.0.0.0', port=5000)
