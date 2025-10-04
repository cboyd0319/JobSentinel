#!/usr/bin/env python3
"""
Zero-Knowledge User Startup Script

This script is designed for users with ZERO technical knowledge.
It checks everything, explains what's wrong, and guides them step by step.
"""

import sys
import os
from pathlib import Path
import subprocess
import shutil

def print_banner() -> None:
	"""Print a friendly banner."""
	print(
		"""
╔═══════════════════════════════════════════════════════════╗
║ Job Search Automation                                      ║
║                                                           ║
║ [WARNING] ALPHA SOFTWARE WARNING [WARNING]                ║
║                                                           ║
║ This software is experimental. Use at your own risk.      ║
║ Test locally first. No warranty provided.                 ║
╚═══════════════════════════════════════════════════════════╝
"""
	)

def check_python_version() -> bool:
	"""Check if Python version is adequate."""
	python_version = sys.version_info
	if python_version < (3, 8):
		print(
			f"[ERROR] ERROR: Python {python_version.major}.{python_version.minor} is too old"
		)
		print(" You need Python 3.8 or newer")
		print("\n🔧 How to fix:")
		print(" 1. Go to https://python.org/downloads/")
		print(" 2. Download Python 3.11 or 3.12")
		print(" 3. Install it")
		print(" 4. Run this script again")
		return False
	print(
		f"[OK] Python {python_version.major}.{python_version.minor}.{python_version.micro} is OK"
	)
	return True

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