"""Root pytest configuration for JobSentinel.

This conftest.py is placed at the repository root to ensure path setup
happens before pytest starts collecting test modules.

Critical: This file must remain at the root level to be loaded first by pytest.
"""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock

# Get repository root (where this conftest.py is located)
REPO_ROOT = Path(__file__).resolve().parent

# Add deploy/ directory to sys.path so "from cloud.utils" resolves correctly
DEPLOY_ROOT = REPO_ROOT / "deploy"
if str(DEPLOY_ROOT) not in sys.path:
    sys.path.insert(0, str(DEPLOY_ROOT))

# Add cloud/common directory so cloud modules can be imported directly
# This allows "from exceptions import ..." and "import receipt" to work
CLOUD_COMMON_ROOT = DEPLOY_ROOT / "cloud" / "common"
if str(CLOUD_COMMON_ROOT) not in sys.path:
    sys.path.insert(0, str(CLOUD_COMMON_ROOT))

# Mock cost_tracker module before any cloud modules try to import it
# Cloud modules depend on utils.cost_tracker which is part of the app
if "utils.cost_tracker" not in sys.modules:
    cost_tracker_mock = MagicMock()
    cost_tracker_mock.tracker = MagicMock()
    sys.modules["utils.cost_tracker"] = cost_tracker_mock
