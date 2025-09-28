#!/usr/bin/env python3
"""Entry point wrapper for backward compatibility."""

import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

# Re-export functions from src.agent for backward compatibility
from src.agent import (
    load_user_prefs,
    poll_sources,
    process_jobs,
    send_digest,
    test_notifications,
    cleanup,
    health_check,
    main
)

if __name__ == "__main__":
    from src.agent import main
    main()
