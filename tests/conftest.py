"""Pytest configuration ensuring local project packages resolve and async tests run.

Adds project root to sys.path explicitly (workaround for editable install issues in some Python 3.13 envs) and enables pytest-asyncio auto mode.
"""
from __future__ import annotations

import sys
from pathlib import Path
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Configure pytest-asyncio to auto-detect async tests
pytest_plugins = ("pytest_asyncio",)

def pytest_configure(config):  # noqa: D401
    # Set asyncio mode if plugin present
    config.addinivalue_line("markers", "asyncio: mark test as asyncio")
