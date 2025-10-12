"""
JobSentinel Universal Installer - Modular Version

Refactored from monolithic 1,485-line install.py into manageable modules.
Each module <300 lines following best practices from doc_templates/.

Modules:
- platform_detect: OS detection and validation
- python_installer: Python installation per platform
- venv_manager: Virtual environment creation
- dependency_installer: pip dependency installation  
- config_setup: Configuration file setup
- validation: Post-install validation
- main: Orchestration and CLI entry point
"""

from .main import main, UniversalInstaller
from .platform_detect import PlatformInfo, detect_platform
from .config_setup import setup_config_files

__version__ = "2.0.0"
__all__ = [
    "main",
    "UniversalInstaller",
    "PlatformInfo",
    "detect_platform",
    "setup_config_files",
]
