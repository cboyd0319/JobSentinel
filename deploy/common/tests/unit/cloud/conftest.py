"""Pytest configuration for cloud module tests.

Sets up module path for cloud modules so they can be imported as cloud.*.
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock


# Add the deploy directory to Python path so "from cloud.utils" resolves to deploy/cloud/common/utils.py
_deploy_path = Path(__file__).resolve().parent.parent.parent.parent.parent
if str(_deploy_path) not in sys.path:
    sys.path.insert(0, str(_deploy_path))

# Mock the cost_tracker module BEFORE importing any cloud modules
# This needs to happen before any cloud module imports since cloud.common.utils imports it
if "utils.cost_tracker" not in sys.modules:
    cost_tracker_mock = MagicMock()
    sys.modules["utils.cost_tracker"] = cost_tracker_mock
    # Also mock for the app utils path
    sys.modules["jsa.utils.cost_tracker"] = cost_tracker_mock

