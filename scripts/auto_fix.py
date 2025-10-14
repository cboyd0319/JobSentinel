#!/usr/bin/env python3
"""
Auto-Fix Script for JobSentinel
Self-healing system that automatically fixes common issues.

This script is designed for users with ZERO technical knowledge.
It detects and fixes common problems automatically:

- Missing configuration files
- Incorrect .env setup
- Database issues
- Permission problems
- Missing dependencies
- Port conflicts
- Email configuration problems

Usage:
    python scripts/auto_fix.py

Or from CLI:
    python -m jsa.cli fix
"""

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any


class AutoFix:
    """Self-healing system for JobSentinel."""

    def __init__(self):
        """Initialize the auto-fix system."""
        self.project_root = Path(__file__).parent.parent
        self.config_dir = self.project_root / "config"
        self.data_dir = self.project_root / "data"
        self.env_file = self.project_root / ".env"
        self.fixes_applied = []
        self.issues_found = []

    def print_banner(self):
        """Print banner."""
        print()
        print("=" * 70)
        print(" " * 20 + "🔧 JobSentinel Auto-Fix 🔧")
        print("=" * 70)
        print()
        print("Checking for common issues and applying fixes automatically...")
        print()

    def check_and_fix_config(self) -> bool:
        """Check and fix configuration file issues."""
        config_file = self.config_dir / "user_prefs.json"
        example_file = self.config_dir / "user_prefs.example.json"

        # Issue 1: Config directory doesn't exist
        if not self.config_dir.exists():
            print("❌ Config directory missing")
            self.issues_found.append("Config directory missing")
            try:
                self.config_dir.mkdir(parents=True, exist_ok=True)
                print("✅ Created config directory")
                self.fixes_applied.append("Created config directory")
            except Exception as e:
                print(f"⚠️  Could not create config directory: {e}")
                return False

        # Issue 2: User config doesn't exist, but example does
        if not config_file.exists() and example_file.exists():
            print("❌ Configuration file missing")
            self.issues_found.append("Configuration file missing")
            try:
                shutil.copy(example_file, config_file)
                print("✅ Created configuration file from example")
                print("⚠️  Please edit config/user_prefs.json with your preferences")
                self.fixes_applied.append("Created config from example")
            except Exception as e:
                print(f"⚠️  Could not create config file: {e}")
                return False

        # Issue 3: Config file is invalid JSON
        if config_file.exists():
            try:
                with open(config_file) as f:
                    json.load(f)
                print("✅ Configuration file is valid")
            except json.JSONDecodeError as e:
                print(f"❌ Configuration file has invalid JSON: {e}")
                self.issues_found.append("Invalid JSON in config")

                # Try to fix by restoring from example
                if example_file.exists():
                    try:
                        # Backup broken config
                        backup_file = config_file.with_suffix(".json.backup")
                        shutil.copy(config_file, backup_file)

                        # Restore from example
                        shutil.copy(example_file, config_file)
                        print(
                            f"✅ Restored config from example (backup saved to {backup_file.name})"
                        )
                        self.fixes_applied.append("Restored config from example")
                    except Exception as fix_error:
                        print(f"⚠️  Could not restore config: {fix_error}")
                        return False

        return True

    def check_and_fix_env(self) -> bool:
        """Check and fix .env file issues."""
        example_env = self.project_root / ".env.example"

        # Issue 1: .env doesn't exist
        if not self.env_file.exists():
            print("❌ .env file missing")
            self.issues_found.append(".env file missing")

            if example_env.exists():
                try:
                    shutil.copy(example_env, self.env_file)
                    print("✅ Created .env file from example")
                    print("⚠️  Add your Slack webhook or email settings to .env")
                    self.fixes_applied.append("Created .env from example")
                except Exception as e:
                    print(f"⚠️  Could not create .env file: {e}")
                    return False
            else:
                # Create minimal .env
                try:
                    with open(self.env_file, "w") as f:
                        f.write("# JobSentinel Environment Variables\n")
                        f.write("# SQLite database (default - no setup required)\n")
                        f.write("DATABASE_URL=sqlite+aiosqlite:///data/jobs.sqlite\n\n")
                        f.write("# Optional: Slack webhook URL\n")
                        f.write("# SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...\n\n")
                        f.write("# Optional: Email notifications\n")
                        f.write("# SMTP_HOST=smtp.gmail.com\n")
                        f.write("# SMTP_PORT=587\n")
                        f.write("# SMTP_USER=your-email@gmail.com\n")
                        f.write("# SMTP_PASS=your-app-password\n")
                        f.write("# DIGEST_TO=your-email@gmail.com\n")
                    print("✅ Created minimal .env file")
                    self.fixes_applied.append("Created minimal .env")
                except Exception as e:
                    print(f"⚠️  Could not create .env file: {e}")
                    return False
        else:
            print("✅ .env file exists")

        return True

    def check_and_fix_data_directory(self) -> bool:
        """Check and fix data directory issues."""
        # Issue 1: Data directory doesn't exist
        if not self.data_dir.exists():
            print("❌ Data directory missing")
            self.issues_found.append("Data directory missing")
            try:
                self.data_dir.mkdir(parents=True, exist_ok=True)
                print("✅ Created data directory")
                self.fixes_applied.append("Created data directory")
            except Exception as e:
                print(f"⚠️  Could not create data directory: {e}")
                return False
        else:
            print("✅ Data directory exists")

        # Issue 2: Data directory not writable
        test_file = self.data_dir / ".write_test"
        try:
            test_file.write_text("test")
            test_file.unlink()
            print("✅ Data directory is writable")
        except Exception as e:
            print(f"❌ Data directory is not writable: {e}")
            self.issues_found.append("Data directory not writable")
            print("⚠️  Check folder permissions")
            return False

        return True

    def check_and_fix_dependencies(self) -> bool:
        """Check if dependencies are installed."""
        try:
            # Try importing key dependencies
            import aiofiles
            import aiosqlite
            import flask
            import pydantic
            import rich
            import sqlalchemy

            print("✅ Core dependencies installed")
            return True
        except ImportError as e:
            print(f"❌ Missing dependency: {e.name}")
            self.issues_found.append(f"Missing dependency: {e.name}")

            print("\nAttempting to install dependencies...")
            try:
                subprocess.run(
                    [sys.executable, "-m", "pip", "install", "-e", "."],
                    cwd=str(self.project_root),
                    check=True,
                    capture_output=True,
                )
                print("✅ Dependencies installed successfully")
                self.fixes_applied.append("Installed dependencies")
                return True
            except subprocess.CalledProcessError as install_error:
                print(f"⚠️  Could not install dependencies: {install_error}")
                print("\nManual fix:")
                print("  Run: pip install -e .")
                return False

    def check_and_fix_database(self) -> bool:
        """Check database file and permissions."""
        db_file = self.data_dir / "jobs.sqlite"

        # Database doesn't need to exist yet - will be created on first run
        if not db_file.exists():
            print("ℹ️  Database will be created on first run")
            return True

        # Check if database is readable
        try:
            db_file.read_bytes()
            print("✅ Database file is accessible")
        except Exception as e:
            print(f"❌ Database file is not accessible: {e}")
            self.issues_found.append("Database not accessible")

            # Try to fix by backing up and recreating
            try:
                backup_file = db_file.with_suffix(".sqlite.backup")
                shutil.copy(db_file, backup_file)
                print(f"✅ Backed up database to {backup_file.name}")
                print("⚠️  Database will be recreated on next run")
                self.fixes_applied.append("Backed up database")
            except Exception as backup_error:
                print(f"⚠️  Could not backup database: {backup_error}")

        return True

    def check_and_fix_playwright(self) -> bool:
        """Check if Playwright browsers are installed."""
        try:
            # Check if chromium is installed
            result = subprocess.run(
                ["playwright", "install", "--dry-run", "chromium"],
                capture_output=True,
                text=True,
                timeout=10,
            )

            if "is already installed" in result.stdout or result.returncode == 0:
                print("✅ Playwright browsers installed")
                return True
            else:
                print("❌ Playwright browsers not installed")
                self.issues_found.append("Playwright browsers missing")

                print("\nAttempting to install Playwright browsers...")
                try:
                    subprocess.run(
                        ["playwright", "install", "chromium"],
                        check=True,
                        timeout=300,  # 5 minutes max
                    )
                    print("✅ Playwright browsers installed")
                    self.fixes_applied.append("Installed Playwright browsers")
                    return True
                except subprocess.CalledProcessError:
                    print("⚠️  Could not install Playwright browsers")
                    print("\nManual fix:")
                    print("  Run: playwright install chromium")
                    return False
        except FileNotFoundError:
            print("❌ Playwright not installed")
            self.issues_found.append("Playwright not installed")
            print("⚠️  Install with: pip install playwright")
            return False
        except Exception as e:
            print(f"⚠️  Could not check Playwright: {e}")
            return True  # Don't fail for this

    def check_port_conflicts(self) -> bool:
        """Check if default ports are available."""
        import socket

        ports_to_check = [8000, 5000]  # FastAPI and Flask default ports

        for port in ports_to_check:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            try:
                sock.bind(("localhost", port))
                sock.close()
                print(f"✅ Port {port} is available")
            except OSError:
                print(f"⚠️  Port {port} is already in use")
                print(f"   You can use a different port with: --port {port + 1000}")

        return True

    def run_health_check(self) -> bool:
        """Run system health check if available."""
        try:
            result = subprocess.run(
                [sys.executable, "-m", "jsa.cli", "health"],
                cwd=str(self.project_root),
                capture_output=True,
                text=True,
                timeout=30,
            )

            if result.returncode == 0:
                print("✅ System health check passed")
                return True
            else:
                print("⚠️  System health check reported issues")
                print(result.stdout)
                return False
        except Exception as e:
            print(f"ℹ️  Could not run health check: {e}")
            return True  # Don't fail for this

    def print_summary(self):
        """Print summary of fixes applied."""
        print()
        print("=" * 70)
        print(" " * 25 + "📊 Summary 📊")
        print("=" * 70)
        print()

        if not self.issues_found:
            print("✅ No issues found! JobSentinel is ready to use.")
        else:
            print(f"Found {len(self.issues_found)} issue(s):")
            for issue in self.issues_found:
                print(f"  • {issue}")
            print()

        if self.fixes_applied:
            print(f"Applied {len(self.fixes_applied)} fix(es):")
            for fix in self.fixes_applied:
                print(f"  ✅ {fix}")
            print()

        print("=" * 70)
        print()

        if self.fixes_applied:
            print("🎉 Auto-fix complete! Try running JobSentinel again.")
        else:
            print("✨ Everything looks good! You're ready to use JobSentinel.")

        print()
        print("Next steps:")
        print("  1. Run setup wizard: python -m jsa.cli setup")
        print("  2. Start the GUI: Double-click launch-gui.bat")
        print("  3. Or run the API: python -m jsa.cli api")
        print()

    def run(self) -> int:
        """Run all checks and fixes.

        Returns:
            Exit code (0 for success)
        """
        self.print_banner()

        print("Running diagnostics...")
        print()

        # Run all checks
        checks = [
            ("Configuration files", self.check_and_fix_config),
            ("Environment variables", self.check_and_fix_env),
            ("Data directory", self.check_and_fix_data_directory),
            ("Dependencies", self.check_and_fix_dependencies),
            ("Database", self.check_and_fix_database),
            ("Playwright browsers", self.check_and_fix_playwright),
            ("Port availability", self.check_port_conflicts),
            ("System health", self.run_health_check),
        ]

        all_passed = True
        for name, check_func in checks:
            print(f"\nChecking: {name}")
            print("-" * 70)
            try:
                if not check_func():
                    all_passed = False
            except Exception as e:
                print(f"⚠️  Unexpected error: {e}")
                all_passed = False

        # Print summary
        self.print_summary()

        return 0 if all_passed else 1


def main() -> int:
    """Main entry point."""
    auto_fix = AutoFix()
    return auto_fix.run()


if __name__ == "__main__":
    sys.exit(main())
