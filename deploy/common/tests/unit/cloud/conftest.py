"""Pytest configuration for cloud module tests.

Sets up module path for cloud modules.
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock


# Add cloud/common to Python path so we can import modules directly
_cloud_common_path = Path(__file__).resolve().parent.parent.parent.parent.parent / "cloud" / "common"
if str(_cloud_common_path) not in sys.path:
    sys.path.insert(0, str(_cloud_common_path))

# Mock the cost_tracker module that utils.py tries to import
if "utils.cost_tracker" not in sys.modules:
    cost_tracker_mock = MagicMock()
    sys.modules["utils.cost_tracker"] = cost_tracker_mock
