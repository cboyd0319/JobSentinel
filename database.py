#!/usr/bin/env python3
"""Entry point wrapper for database module."""

import sys
from pathlib import Path

project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

# Re-export everything from src.database for backward compatibility
from src.database import *

if __name__ == "__main__":
    print("Database module - use as import, not direct execution")
