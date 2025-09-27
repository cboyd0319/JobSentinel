#!/usr/bin/env python3
"""Entry point wrapper for backward compatibility."""

import sys
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.absolute()
sys.path.insert(0, str(project_root))

if __name__ == "__main__":
    from src.agent import main
    main()
