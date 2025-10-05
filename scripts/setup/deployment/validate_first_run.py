#!/usr/bin/env python3
"""
First-run validation script to check for common user issues.

This simulates a completely fresh installation to identify potential problems.
"""

import sys
import os
from pathlib import Path

def check_first_run_experience() -> bool:
	"""Simulate first-run experience and check for issues."""
	print("🔍 Simulating First-Run Experience")
	print("=" * 50)

	issues: list[str] = []

	# Check 1: Python version
	python_version = sys.version_info
	if python_version < (3, 8):
		issues.append(
			f"[ERROR] Python version {python_version.major}.{python_version.minor} too old (need 3.8+)"
		)
	else:
		print(
			f"[OK] Python {python_version.major}.{python_version.minor}.{python_version.micro}"
		)

	# Check 2: Required directories exist or can be created
	required_dirs = ["config", "data", "data/logs", "data/cache"]
	for dir_path in required_dirs:
		path = Path(dir_path)
		if not path.exists():
			try:
				path.mkdir(parents=True, exist_ok=True)
				print(f"[OK] Created directory: {dir_path}")
			except Exception as e:  # pragma: no cover
				issues.append(f"[ERROR] Cannot create {dir_path}: {e}")
		else:
			print(f"[OK] Directory exists: {dir_path}")

	# Check 3: Configuration files
	config_example = Path("config/user_prefs.example.json")
	config_actual = Path("config/user_prefs.json")

	if not config_example.exists():
		issues.append("[ERROR] Missing config/user_prefs.example.json")
	else:
		print("[OK] Example configuration exists")

	if not config_actual.exists():
		print("[WARNING] User configuration missing (expected for first run)")
		print(" → User needs to: cp config/user_prefs.example.json config/user_prefs.json")
	else:
		print("[OK] User configuration exists")

	# Check 4: .env file setup
	env_example = Path(".env.example")
	env_actual = Path(".env")

	if not env_example.exists():
		issues.append("[ERROR] Missing .env.example")
	else:
		print("[OK] .env.example exists")

	if not env_actual.exists():
		print("[WARNING] .env file missing (expected for first run)")
		print(" → User needs to copy .env.example to .env and configure")
	else:
		print("[OK] .env file exists")

	# Check 5: Import critical modules
	sys.path.append(".")

	critical_modules = [
		("utils.config", "Configuration manager"),
		("src.database", "Database layer"),
		("notify.slack", "Slack notifications"),
		("sources.concurrent_scraper", "Job scraper"),
		("scripts.slack_bootstrap", "Slack setup wizard"),
	]

	for module_name, description in critical_modules:
		try:
			__import__(module_name)
			print(f"[OK] {description}")
		except ImportError as e:  # pragma: no cover
			issues.append(f"[ERROR] Cannot import {module_name}: {e}")
		except Exception as e:  # pragma: no cover
			print(f"[WARNING] {description} import warning: {e}")

	# Check 6: Write permissions
	test_file = Path("data/test_write.tmp")
	try:
		test_file.write_text("test")
		test_file.unlink()
		print("[OK] Write permissions OK")
	except Exception as e:  # pragma: no cover
		issues.append(f"[ERROR] Cannot write to data directory: {e}")

	# Summary
	print("\n" + "=" * 50)
	if issues:
		print("[ERROR] ISSUES FOUND:")
		for issue in issues:
			print(f" {issue}")
		print(f"\n🔧 Fix these {len(issues)} issues before proceeding")
		return False
	print("[OK] ALL CHECKS PASSED")
	print(" System ready for first run!")
	return True

if __name__ == "__main__":
	success = check_first_run_experience()
	sys.exit(0 if success else 1)