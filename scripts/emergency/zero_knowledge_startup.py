#!/usr/bin/env python3
"""
Zero-Knowledge User Startup Script

This script is designed for users with ZERO technical knowledge.
It will guide you through setup and ensure everything works properly.

Usage: python scripts/emergency/zero_knowledge_startup.py

This is the simplified emergency version. For full features, use:
python scripts/emergency/zero_knowledge_startup_v2.py
"""

import platform
import shutil
import subprocess
import sys
from pathlib import Path


# Color constants for better UX
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_banner():
    """Print simplified banner with current status."""
    print(f"{Colors.BLUE}")
    print("╔══════════════════════════════════════════════════════════════════════════════╗")
    print("║                        JOB SEARCH AUTOMATION STARTUP                         ║")
    print("║                         [EMERGENCY VERSION]                                 ║") 
    print("║                                                                              ║")
    print("║  This is the simplified emergency startup script.                           ║")
    print("║  For full features, use: zero_knowledge_startup_v2.py                       ║")
    print("║                                                                              ║")
    print("║  Basic setup and validation only                                           ║")
    print("║  Status: Alpha software - test locally first                               ║")
    print("║  Support: Community help available                                         ║")
    print("╚══════════════════════════════════════════════════════════════════════════════╝")
    print(f"{Colors.END}")
    
    # Show current system info
    print(f"System: {platform.system()}")
    print(f"Python: {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")
    print(f"Location: {Path.cwd()}")
    print("=" * 80 + "\n")

def check_python_version() -> bool:
    """Check if Python version is adequate."""
    python_version = sys.version_info
    min_version = (3, 8)
    
    if python_version < min_version:
        print(f"{Colors.RED}ERROR: Python {python_version.major}.{python_version.minor} is too old{Colors.END}")
        print(f"   Minimum required: Python {min_version[0]}.{min_version[1]}")
        print("\nHOW TO FIX:")
        print("   1. Visit https://python.org/downloads/")
        print("   2. Download Python 3.11 or newer")
        print("   3. During installation, check 'Add Python to PATH'")
        print("   4. Restart your computer")
        print("   5. Run this script again")
        return False
    
    print(f"{Colors.GREEN}OK: Python {python_version.major}.{python_version.minor}.{python_version.micro} is good{Colors.END}")
    return True

def check_basic_setup() -> bool:
    """Check essential files exist."""
    print(f"\n{Colors.YELLOW}Checking project files...{Colors.END}")
    
    essential_files = [
        "src/__init__.py",
        "src/agent.py", 
        "requirements.txt",
        "config/user_prefs.example.json"
    ]
    
    missing_files = []
    for file_path in essential_files:
        if not Path(file_path).exists():
            missing_files.append(file_path)
    
    if missing_files:
        print(f"{Colors.RED}ERROR: Missing essential files:{Colors.END}")
        for file in missing_files:
            print(f"   • {file}")
        print("\nHOW TO FIX:")
        print("   You might be in the wrong directory or have incomplete files")
        return False
    
    print(f"{Colors.GREEN}OK: All essential files found{Colors.END}")
    return True

def check_dependencies() -> bool:
    """Check if Python dependencies are installed."""
    print(f"\n{Colors.YELLOW}Checking Python packages...{Colors.END}")
    
    try:
        # Check core imports
        import sys
        result = subprocess.run(  # noqa: S603 - testing python imports
            [
                sys.executable, "-c",
                "import requests; import json; import os; print('Basic imports OK')"
            ], capture_output=True, text=True, timeout=10
        )
        
        if result.returncode == 0:
            print(f"{Colors.GREEN}OK: Core packages installed{Colors.END}")
            return True
        else:
            raise ImportError("Basic imports failed")
            
    except Exception as e:
        print(f"{Colors.RED}ERROR: Missing Python packages{Colors.END}")
        print("\nHOW TO FIX:")
        print("   Run this command:")
        print(f"{Colors.BOLD}   pip install -r requirements.txt{Colors.END}")
        print("\n   If that doesn't work, try:")
        print(f"{Colors.BOLD}   python -m pip install -r requirements.txt{Colors.END}")
        return False

def setup_config() -> bool:
    """Simple config setup."""
    print(f"\n{Colors.YELLOW}⚙️  Setting up configuration...{Colors.END}")
    
    example_config = Path("config/user_prefs.example.json")
    user_config = Path("config/user_prefs.json")
    
    if not example_config.exists():
        print(f"{Colors.RED}ERROR: Example configuration file not found{Colors.END}")
        return False
    
    if user_config.exists():
        print(f"{Colors.GREEN}OK: Configuration already exists{Colors.END}")
        return True
    
    print("   Creating starter configuration...")
    try:
        shutil.copy2(example_config, user_config)
        print(f"{Colors.GREEN}OK: Configuration created{Colors.END}")
        print(f"   Path: {user_config}")
        print("\nIMPORTANT: Edit this file with your job preferences!")
        return True
    except Exception as e:
        print(f"{Colors.RED}ERROR: Could not create config: {e}{Colors.END}")
        return False

def show_next_steps() -> None:
    """Show what user should do next."""
    print(f"\n{Colors.GREEN}BASIC SETUP COMPLETE!{Colors.END}")
    print("=" * 50)
    
    print("\nWHAT TO DO NEXT:")
    
    print("\n1) USE THE FULL VERSION:")
    print(f"{Colors.BOLD}   python scripts/emergency/zero_knowledge_startup_v2.py{Colors.END}")
    print("   This gives you comprehensive setup with all features")
    
    print("\n2) QUICK TEST:")
    print(f"{Colors.BOLD}   python -m src.agent --help{Colors.END}")
    print("   This shows if the system is working")
    
    print("\n3) EDIT YOUR SETTINGS:")
    print("   config/user_prefs.json")
    print("   Add your target companies and job preferences")
    
    print("\nNEED HELP?")
    print("   • Use the full version script for complete setup")
    print("   • Check docs/USER_GUIDE.md for detailed instructions")
    print("   • Report issues on GitHub")

def main() -> int:
    """Simple main startup flow."""
    try:
        print_banner()
        
        if not check_python_version():
            return 1
        if not check_basic_setup():
            return 1
        if not check_dependencies():
            return 1
        if not setup_config():
            return 1
        
        show_next_steps()
        return 0
        
    except KeyboardInterrupt:
        print(f"\n{Colors.RED}Setup cancelled by user{Colors.END}")
        return 1
    except Exception as e:
        print(f"\n{Colors.RED}Unexpected error: {e}{Colors.END}")
        return 1

if __name__ == "__main__":
    try:
        exit_code = main()
        input("\nPress Enter to exit...")
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nGoodbye!")
        sys.exit(1)

