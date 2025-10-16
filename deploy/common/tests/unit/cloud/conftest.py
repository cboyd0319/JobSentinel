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

# Mock the cost_tracker module BEFORE importing any cloud modules
if "utils.cost_tracker" not in sys.modules:
    cost_tracker_mock = MagicMock()
    sys.modules["utils.cost_tracker"] = cost_tracker_mock

# HACK: Make cloud.common modules available as cloud.* by aliasing in sys.modules
# This is necessary because receipt.py and other modules import "from cloud.style"
# but they actually mean cloud/common/style.py
import style as _style_module
import exceptions as _exceptions_module
import utils as _utils_module

sys.modules["cloud.style"] = _style_module
sys.modules["cloud.exceptions"] = _exceptions_module
sys.modules["cloud.utils"] = _utils_module

