"""
Private Job Scraper & Filter

A robust, private job monitoring service that runs on your own machine.
"""

from pathlib import Path

# Version management
__version__ = "0.4.5"


def get_version():
    """Get the current version from VERSION file or fallback to __version__."""
    try:
        # Look for VERSION file in project root
        version_file = Path(__file__).parent.parent / "VERSION"
        if version_file.exists():
            return version_file.read_text().strip()
    except OSError as e:
        # Log specific file read errors
        import logging

        logging.getLogger(__name__).debug(f"Could not read VERSION file: {e}")
    except Exception as e:
        # Log unexpected errors but continue
        import logging

        logging.getLogger(__name__).warning(f"Unexpected error reading VERSION: {e}")
    return __version__


__version__ = get_version()
