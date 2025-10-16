"""Root pytest configuration for JobSentinel.

This conftest.py is placed at the repository root to ensure path setup
happens before pytest starts collecting test modules.

Note: Cloud deployment tests (deploy/common/tests/unit/cloud/) are excluded
from the Coverage workflow due to complex module import conflicts between
cloud utilities and application utilities.

Critical: This file must remain at the root level to be loaded first by pytest.
"""

from __future__ import annotations

# Minimal configuration - cloud tests are excluded from coverage workflow
