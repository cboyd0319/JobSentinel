"""Pytest configuration for cloud module tests.

Sets up proper import paths and provides fixtures for testing cloud deployment modules.
"""

from __future__ import annotations

import sys
import types
from pathlib import Path
from unittest.mock import MagicMock

import pytest

# The cloud modules in deploy/cloud/common use "from cloud.X" imports
# where cloud refers to the deploy/cloud/common directory itself.
# We set up the path so that modules in cloud/common can be imported directly
# and also create a "cloud" namespace that allows "from cloud.X" to work.

DEPLOY_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent
CLOUD_COMMON_DIR = DEPLOY_DIR / "cloud" / "common"

# Add deploy/common/app/src to path for database and utils.X imports
# This must come FIRST so "from utils.X import" resolves to the utils package
APP_SRC_DIR = DEPLOY_DIR / "common" / "app" / "src"
if str(APP_SRC_DIR) not in sys.path:
    sys.path.insert(0, str(APP_SRC_DIR))

# Create a "cloud" module namespace that delegates to the cloud/common directory
# This allows "from cloud.X" imports to work without adding cloud/common to sys.path
# which would conflict with the utils package
cloud_module = types.ModuleType("cloud")
cloud_module.__path__ = [str(CLOUD_COMMON_DIR)]
cloud_module.__file__ = str(CLOUD_COMMON_DIR / "__init__.py")
sys.modules["cloud"] = cloud_module

# Create a "providers" module namespace for direct test imports
providers_module = types.ModuleType("providers")
providers_module.__path__ = [str(CLOUD_COMMON_DIR / "providers")]
providers_module.__file__ = str(CLOUD_COMMON_DIR / "providers" / "__init__.py")
sys.modules["providers"] = providers_module

# Create "providers.gcp" namespace
providers_gcp_module = types.ModuleType("providers.gcp")
providers_gcp_module.__path__ = [str(CLOUD_COMMON_DIR / "providers" / "gcp")]
providers_gcp_module.__file__ = str(CLOUD_COMMON_DIR / "providers" / "gcp" / "__init__.py")
sys.modules["providers.gcp"] = providers_gcp_module
providers_module.gcp = providers_gcp_module

# Create a "functions" module namespace for cloud functions
functions_module = types.ModuleType("functions")
functions_module.__path__ = [str(CLOUD_COMMON_DIR / "functions")]
functions_module.__file__ = str(CLOUD_COMMON_DIR / "functions" / "__init__.py")
sys.modules["functions"] = functions_module

# For direct imports like "import style" or "import receipt", we need to load them explicitly
# and add them to sys.modules to avoid conflicts with app/src/utils
import importlib.util

for module_name in ["style", "receipt", "teardown", "update", "bootstrap", "exceptions"]:
    module_path = CLOUD_COMMON_DIR / f"{module_name}.py"
    if module_path.exists():
        spec = importlib.util.spec_from_file_location(module_name, module_path)
        if spec and spec.loader:
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            try:
                spec.loader.exec_module(module)
            except Exception:
                # Some modules may fail to load during test collection, that's OK
                pass

# Mock utils.cost_tracker before any cloud modules are imported
cost_tracker_mock = MagicMock()
cost_tracker_mock.tracker = MagicMock()
sys.modules["utils.cost_tracker"] = cost_tracker_mock


@pytest.fixture
def mock_gcp_credentials(monkeypatch):
    """Mock GCP credentials environment variables."""

    def _set(**kwargs):
        for key, value in kwargs.items():
            monkeypatch.setenv(key, str(value))

    # Set default GCP environment
    monkeypatch.setenv("GOOGLE_CLOUD_PROJECT", "test-project-123")
    monkeypatch.setenv("GCP_PROJECT", "test-project-123")

    return _set


@pytest.fixture
def mock_gcp_region(monkeypatch):
    """Mock GCP region configuration."""
    monkeypatch.setenv("GCP_REGION", "us-central1")
    return "us-central1"


@pytest.fixture
def sample_deployment_config():
    """Provide sample deployment configuration for testing."""
    return {
        "project_id": "test-project-123",
        "region": "us-central1",
        "service_name": "job-scraper",
        "budget_amount": 100.0,
        "terraform_version": "1.10.3",
    }
