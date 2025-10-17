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

# Add the cloud/common directory to path - this allows direct imports like "import style"
if str(CLOUD_COMMON_DIR) not in sys.path:
    sys.path.insert(0, str(CLOUD_COMMON_DIR))

# Create a "cloud" module namespace that delegates to the cloud/common directory
# This allows "from cloud.style" imports to work
cloud_module = types.ModuleType("cloud")
cloud_module.__path__ = [str(CLOUD_COMMON_DIR)]
cloud_module.__file__ = str(CLOUD_COMMON_DIR / "__init__.py")
sys.modules["cloud"] = cloud_module

# Mock utils.cost_tracker before any cloud modules are imported
# We need to load the actual cloud/common/utils.py but mock its dependency on utils.cost_tracker
# First, mock the cost_tracker module that cloud/common/utils.py tries to import
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
