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

# Mock cost_tracker module before any cloud modules try to import it
# Cloud modules depend on utils.cost_tracker which is part of the app
if "utils.cost_tracker" not in sys.modules:
    cost_tracker_mock = MagicMock()
    cost_tracker_mock.tracker = MagicMock()
    sys.modules["utils.cost_tracker"] = cost_tracker_mock

# Create cloud.common package alias to resolve cloud module imports
# This allows cloud modules to import from each other using "from cloud.X import ..."
import sys as _sys
_cloud_common_path = DEPLOY_ROOT / "cloud" / "common"
_sys.path.insert(0, str(_cloud_common_path))

# Import and alias cloud.common modules into sys.modules so they can be imported as "cloud.X"
try:
    import exceptions as _exceptions
    import receipt as _receipt
    import style as _style
    import utils as _cloud_utils

    _sys.modules["cloud.exceptions"] = _exceptions
    _sys.modules["cloud.receipt"] = _receipt
    _sys.modules["cloud.style"] = _style
    _sys.modules["cloud.utils"] = _cloud_utils

    # Remove from direct namespace to avoid conflicts
    del _exceptions, _receipt, _style, _cloud_utils
except ImportError:
    # Cloud modules not available in this test run
    pass
finally:
    # Remove cloud/common from path to avoid utils module conflicts
    _sys.path.remove(str(_cloud_common_path))
