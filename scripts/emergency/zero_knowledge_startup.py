#!/usr/bin/env python3
"""
Zero-Knowledge User Startup Script

This script is designed for users with ZERO technical knowledge.
It will guide you through setup and ensure everything works properly.

Usage: python scripts/emergency/zero_knowledge_startup.py

This is the simplified emergency version. For full features, use:
python scripts/emergency/zero_knowledge_startup_v2.py
"""

import sys
import os
import json
import subprocess
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import platform

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
    print("║                    🚀 JOB SEARCH AUTOMATION STARTUP                          ║")
    print("║                         [EMERGENCY VERSION]                                 ║") 
    print("║                                                                              ║")
    print("║  This is the simplified emergency startup script.                           ║")
    print("║  For full features, use: zero_knowledge_startup_v2.py                       ║")
    print("║                                                                              ║")
    print("║  🔧 Basic setup and validation only                                         ║")
    print("║  🛡️  Status: Alpha software - test locally first                           ║")
    print("║  💬 Support: Community help available                                       ║")
    print("╚══════════════════════════════════════════════════════════════════════════════╝")
    print(f"{Colors.END}")
    
    # Show current system info
    print(f"🖥️  System: {platform.system()}")
    print(f"🐍 Python: {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")
    print(f"📂 Location: {Path.cwd()}")
    print("=" * 80 + "\n")

def check_python_version() -> bool:
    """Check if Python version is adequate."""
    python_version = sys.version_info
    min_version = (3, 8)
    
    if python_version < min_version:
        print(f"{Colors.RED}❌ Python {python_version.major}.{python_version.minor} is too old{Colors.END}")
        print(f"   Minimum required: Python {min_version[0]}.{min_version[1]}")
        print("\n🔧 HOW TO FIX:")
        print("   1. Visit https://python.org/downloads/")
        print("   2. Download Python 3.11 or newer")
        print("   3. During installation, check 'Add Python to PATH'")
        print("   4. Restart your computer")
        print("   5. Run this script again")
        return False
    
    print(f"{Colors.GREEN}✅ Python {python_version.major}.{python_version.minor}.{python_version.micro} is good{Colors.END}")
    return True

def check_basic_setup() -> bool:
    """Check essential files exist."""
    print(f"\n{Colors.YELLOW}📁 Checking project files...{Colors.END}")
    
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
        print(f"{Colors.RED}❌ Missing essential files:{Colors.END}")
        for file in missing_files:
            print(f"   • {file}")
        print("\n🔧 HOW TO FIX:")
        print("   You might be in the wrong directory or have incomplete files")
        return False
    
    print(f"{Colors.GREEN}✅ All essential files found{Colors.END}")
    return True

def check_dependencies() -> bool:
    """Check if Python dependencies are installed."""
    print(f"\n{Colors.YELLOW}📦 Checking Python packages...{Colors.END}")
    
    try:
        # Check core imports
        import sys
        result = subprocess.run([
            sys.executable, "-c", 
            "import requests; import json; import os; print('Basic imports OK')"
        ], capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            print(f"{Colors.GREEN}✅ Core packages installed{Colors.END}")
            return True
        else:
            raise ImportError("Basic imports failed")
            
    except Exception as e:
        print(f"{Colors.RED}❌ Missing Python packages{Colors.END}")
        print("\n🔧 HOW TO FIX:")
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
        print(f"{Colors.RED}❌ Example configuration file not found{Colors.END}")
        return False
    
    if user_config.exists():
        print(f"{Colors.GREEN}✅ Configuration already exists{Colors.END}")
        return True
    
    print("   Creating starter configuration...")
    try:
        shutil.copy2(example_config, user_config)
        print(f"{Colors.GREEN}✅ Configuration created{Colors.END}")
        print(f"   📁 {user_config}")
        print("\n💡 IMPORTANT: Edit this file with your job preferences!")
        return True
    except Exception as e:
        print(f"{Colors.RED}❌ Could not create config: {e}{Colors.END}")
        return False

def show_next_steps() -> None:
    """Show what user should do next."""
    print(f"\n{Colors.GREEN}🎉 BASIC SETUP COMPLETE!{Colors.END}")
    print("=" * 50)
    
    print("\n💡 WHAT TO DO NEXT:")
    
    print("\n1️⃣  USE THE FULL VERSION:")
    print(f"{Colors.BOLD}   python scripts/emergency/zero_knowledge_startup_v2.py{Colors.END}")
    print("   This gives you comprehensive setup with all features")
    
    print("\n2️⃣  QUICK TEST:")
    print(f"{Colors.BOLD}   python -m src.agent --help{Colors.END}")
    print("   This shows if the system is working")
    
    print("\n3️⃣  EDIT YOUR SETTINGS:")
    print("   📁 config/user_prefs.json")
    print("   Add your target companies and job preferences")
    
    print("\n🆘 NEED HELP?")
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
        print(f"\n{Colors.RED}❌ Setup cancelled by user{Colors.END}")
        return 1
    except Exception as e:
        print(f"\n{Colors.RED}❌ Unexpected error: {e}{Colors.END}")
        return 1

if __name__ == "__main__":
    try:
        exit_code = main()
        input("\nPress Enter to exit...")
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nGoodbye!")
        sys.exit(1)

def check_and_create_config() -> bool:
	"""Check configuration and guide user through setup."""
	print("\n📋 Checking configuration...")

	example_config = Path("config/user_prefs.example.json")
	user_config = Path("config/user_prefs.json")

	if not example_config.exists():
		print("[ERROR] ERROR: Missing example configuration file")
		print(" This might be a corrupted installation")
		return False

	if not user_config.exists():
		print("[WARNING] You need to create your personal configuration")
		print(" This tells the system what jobs you're looking for")
		answer = (
			input("\n🤔 Would you like me to create a basic config for you? (y/n): ")
			.lower()
			.strip()
		)
		if answer in ["y", "yes"]:
			try:
				shutil.copy2(example_config, user_config)
				print(f"[OK] Created {user_config}")
				print("\n📝 IMPORTANT: You'll need to edit this file later with:")
				print(" - Companies you want to target")
				print(" - Keywords for your desired job roles")
				print(" - Your salary requirements")
			except Exception as e:  # pragma: no cover
				print(f"[ERROR] Failed to create config: {e}")
				return False
		else:
			print("[ERROR] You need a configuration file to continue")
			print(f" Please copy {example_config} to {user_config}")
			print(" Then edit it with your job preferences")
			return False
	else:
		print("[OK] Configuration file exists")
	return True

def check_and_create_env() -> bool:
	"""Check .env file and guide user through setup."""
	print("\n🔐 Checking environment configuration...")

	env_example = Path(".env.example")
	env_file = Path(".env")

	if not env_example.exists():
		print("[ERROR] ERROR: Missing .env.example file")
		return False

	if not env_file.exists():
		print("[WARNING] You need to create your environment file")
		print(" This stores your secrets (like Slack webhook)")
		answer = (
			input("\n🤔 Would you like me to create a basic .env file? (y/n): ")
			.lower()
			.strip()
		)
		if answer in ["y", "yes"]:
			try:
				shutil.copy2(env_example, env_file)
				print(f"[OK] Created {env_file}")
				print("\n📝 IMPORTANT: This file contains placeholder values")
				print(
					" You'll need to run the Slack setup wizard to configure it properly"
				)
			except Exception as e:  # pragma: no cover
				print(f"[ERROR] Failed to create .env: {e}")
				return False
		else:
			print("[ERROR] You need an .env file to continue")
			print(f" Please copy {env_example} to {env_file}")
			return False
	else:
		print("[OK] Environment file exists")
	return True

def check_dependencies() -> bool:
	"""Check if Python dependencies are installed."""
	print("\n📦 Checking Python packages...")
	try:
		import flask  # noqa: F401
		import aiohttp  # noqa: F401
		import rich  # noqa: F401
		print("[OK] Core packages installed")
		return True
	except ImportError as e:  # pragma: no cover
		print(f"[ERROR] Missing Python packages: {e}")
		print("\n🔧 How to fix:")
		print(" Run this command:")
		print(" pip install -r requirements.txt")
		print("\n If that doesn't work, try:")
		print(" python -m pip install -r requirements.txt")
		return False

def offer_slack_setup() -> None:
	"""Offer to run Slack setup wizard."""
	print("\n📱 Slack Notifications Setup")
	print(" Slack notifications let you get job alerts instantly")
	print(" This is optional but highly recommended")
	answer = (
		input("\n🤔 Would you like to set up Slack notifications now? (y/n): ")
		.lower()
		.strip()
	)
	if answer in ["y", "yes"]:
		print("\n Starting Slack setup wizard...")
		try:
			result = subprocess.run(
				[sys.executable, "scripts/slack_bootstrap.py"], cwd=Path.cwd()
			)
			if result.returncode == 0:
				print("[OK] Slack setup completed!")
			else:
				print(
					"[WARNING] Slack setup had issues, but you can try again later"
				)
		except Exception as e:  # pragma: no cover
			print(f"[WARNING] Could not run Slack wizard: {e}")
			print(
				" You can run it manually later: python scripts/slack_bootstrap.py"
			)
	else:
		print("⏭️ Skipping Slack setup (you can do this later)")

def offer_test_run() -> None:
	"""Offer to run a test search."""
	print("\n🧪 Test Run")
	print(" Would you like to test the system with your current settings?")
	print(" This will search for jobs and show you what it finds")
	answer = input("\n🤔 Run a test search? (y/n): ").lower().strip()
	if answer in ["y", "yes"]:
		print("\n🔍 Running test search...")
		print(" This might take 1-2 minutes...")
		try:
			result = subprocess.run(
				[sys.executable, "-m", "src.agent", "--mode", "poll"],
				cwd=Path.cwd(),
				timeout=300,
			)
			if result.returncode == 0:
				print("[OK] Test completed successfully!")
				print(" Check your terminal output above for job results")
				print(" If you set up Slack, check for notifications there too")
			else:
				print("[WARNING] Test completed with warnings")
				print(" Check the error messages above")
		except subprocess.TimeoutExpired:  # pragma: no cover
			print("[WARNING] Test timed out (this can happen on first run)")
			print(" The system is probably working, just taking longer than expected")
		except Exception as e:  # pragma: no cover
			print(f"[WARNING] Test failed: {e}")
			print(" Don't worry - you can debug this later")
	else:
		print("⏭️ Skipping test run")

def show_next_steps() -> None:
	"""Show what user should do next."""
	print(
		"""
🎉 Setup Complete!

📖 What to do next:

1. CUSTOMIZE YOUR SETTINGS
 - Edit config/user_prefs.json with your target companies
 - Add keywords for your desired job roles
 - Set your salary requirements

2. RUN THE SYSTEM
 - Manual search: python -m src.agent --mode poll
 - View results: python -m src.web_ui (then open http://localhost:5000)

3. SET UP AUTOMATION (Optional)
 - See docs/GETTING_STARTED.md for scheduling options

[WARNING] REMEMBER: This is ALPHA software
 - Test thoroughly before relying on it
 - Check results manually - it might miss things
 - Read SECURITY.md and COST.md before cloud deployment

🆘 Need help?
 - Check docs/ folder for detailed guides
 - Report issues on GitHub
 - Read troubleshooting in README.md

Happy job hunting! 
"""
	)

def main() -> None:
	"""Main startup flow for zero-knowledge users."""
	print_banner()
	if not check_python_version():
		sys.exit(1)
	if not check_dependencies():
		sys.exit(1)
	if not check_and_create_config():
		sys.exit(1)
	if not check_and_create_env():
		sys.exit(1)
	offer_slack_setup()
	offer_test_run()
	show_next_steps()

if __name__ == "__main__":
	main()