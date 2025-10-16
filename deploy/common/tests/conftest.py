"""Pytest configuration ensuring local project packages resolve and async tests run.

Adds project root to sys.path explicitly (workaround for editable install issues in some Python 3.13 envs) and enables pytest-asyncio auto mode.

Provides comprehensive fixtures for deterministic testing following pytest best practices.
"""

from __future__ import annotations

import os
import random
import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock

import pytest


PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Add deploy directory to path so cloud modules can be imported as "cloud.*"
# and cloud/common modules can be imported directly (exceptions, receipt, style, etc.)
DEPLOY_ROOT = PROJECT_ROOT.parent.parent
CLOUD_COMMON_ROOT = DEPLOY_ROOT / "cloud" / "common"
if str(DEPLOY_ROOT) not in sys.path:
    sys.path.insert(0, str(DEPLOY_ROOT))
if str(CLOUD_COMMON_ROOT) not in sys.path:
    sys.path.insert(0, str(CLOUD_COMMON_ROOT))

# Mock cost_tracker before any cloud modules try to import it
if "utils.cost_tracker" not in sys.modules:
    cost_tracker_mock = MagicMock()
    sys.modules["utils.cost_tracker"] = cost_tracker_mock

# Configure pytest-asyncio to auto-detect async tests
pytest_plugins = ("pytest_asyncio",)


def pytest_configure(config):  # noqa: D401
    # Set asyncio mode if plugin present
    config.addinivalue_line("markers", "asyncio: mark test as asyncio")


@pytest.fixture(autouse=True)
def _seed_rng():
    """Seed random number generators for deterministic tests."""
    random.seed(1337)
    # Note: numpy seeding would go here if numpy was imported
    # import numpy as np
    # np.random.seed(1337)


@pytest.fixture
def temp_dir():
    """Provide a temporary directory for test isolation.

    Automatically cleaned up after test completion.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        yield Path(tmpdir)


@pytest.fixture
def temp_file(temp_dir):
    """Provide a temporary file path for test isolation."""
    file_path = temp_dir / "test_file.txt"
    yield file_path
    # Cleanup happens via temp_dir fixture


@pytest.fixture
def mock_env(monkeypatch):
    """Provide helper to set environment variables safely.

    Returns a function that sets environment variables for the test.
    Variables are automatically cleaned up after the test.
    """

    def _set(**kwargs):
        for key, value in kwargs.items():
            monkeypatch.setenv(key, str(value))

    return _set


@pytest.fixture
def clean_env(monkeypatch):
    """Clear all environment variables for test isolation.

    Use this fixture when you need a clean environment slate.
    """
    # Store original env
    original_env = dict(os.environ)

    # Clear all env vars
    monkeypatch.setattr(os, "environ", {})

    yield

    # Environment is automatically restored by monkeypatch


@pytest.fixture
def sample_json_data():
    """Provide sample JSON data for testing.

    Returns a dictionary that can be used for JSON testing scenarios.
    """
    return {
        "name": "Test User",
        "email": "test@example.com",
        "age": 30,
        "active": True,
        "tags": ["python", "testing", "pytest"],
        "metadata": {"created": "2025-01-01", "version": "1.0"},
    }


@pytest.fixture
def sample_urls():
    """Provide a list of valid sample URLs for testing."""
    return [
        "http://example.com",
        "https://example.com",
        "https://www.example.com/path",
        "http://localhost:8000",
        "https://api.example.com/v1/resource",
    ]


@pytest.fixture
def sample_emails():
    """Provide a list of valid sample email addresses for testing."""
    return [
        "user@example.com",
        "test.user@example.com",
        "user+tag@example.com",
        "admin@subdomain.example.com",
    ]
