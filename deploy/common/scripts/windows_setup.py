#!/usr/bin/env python3
"""
Windows 11+ Zero-Knowledge Setup Script

This script provides a completely automated setup experience for Windows users
with ZERO technical knowledge. It handles everything:

- System compatibility pre-check
- Python environment validation
- Dependency installation
- Configuration setup (guided wizard)
- Database initialization (SQLite - no admin needed)
- Desktop shortcuts creation
- Health checks
- First-run verification

ZERO admin rights required. 100% local. 100% private.

Usage:
    python scripts/windows_setup.py

Requirements:
    - Windows 11 (build 22000+)
    - Python 3.12+ already installed
    - Internet connection
"""

import json
import os
import platform
import subprocess
import sys
from pathlib import Path
from typing import Any

# Add src to path so we can import from project
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

# Import our enhanced Windows modules
try:
    from jsa.windows_precheck import WindowsPreCheck
    from jsa.windows_shortcuts import create_jobsentinel_shortcuts

    HAS_ENHANCED_MODULES = True
except ImportError:
    # Modules not available yet (before dependencies installed)
    HAS_ENHANCED_MODULES = False


def print_banner():
    """Print welcome banner."""
    print()
    print("=" * 70)
    print(" " * 15 + "🎯 JobSentinel Windows Setup 🎯")
    print("=" * 70)
    print()
    print("Welcome! This wizard will set up JobSentinel on your Windows computer.")
    print()
    print("✨ Features:")
    print("  • 100% Local - All data stays on your computer")
    print("  • 100% Private - No data sent to third parties")
    print("  • Zero Admin Rights - Works without administrator access")
    print("  • Zero Setup - SQLite database configured automatically")
    print()
    print("⏱️  Estimated time: 5-10 minutes")
    print()
    print("=" * 70)
    print()


def check_windows_version() -> tuple[bool, str]:
    """Check if running on Windows 11+."""
    if platform.system() != "Windows":
        return False, f"This script is for Windows only. Detected: {platform.system()}"

    try:
        # Windows 11 is version 10.0.22000+
        version = platform.version()
        parts = version.split(".")
        if len(parts) >= 3:
            major = int(parts[0])
            build = int(parts[2])

            if major >= 10 and build >= 22000:
                return True, f"Windows 11 (build {build})"
            else:
                return False, f"Windows 11 required (build 22000+). Found: build {build}"
    except (ValueError, IndexError):
        return False, f"Could not detect Windows version: {version}"

    return False, "Windows version detection failed"


def check_python_version() -> tuple[bool, str]:
    """Check if Python 3.11+ is installed (3.12+ recommended)."""
    version = sys.version_info

    if version >= (3, 12):
        return True, f"Python {version.major}.{version.minor}.{version.micro}"
    elif version >= (3, 11):
        return True, f"Python {version.major}.{version.minor}.{version.micro} (3.12+ recommended for best compatibility)"
    else:
        return (
            False,
            f"Python 3.11+ required. Found: {version.major}.{version.minor}.{version.micro}\n"
            f"    Download from: https://www.python.org/downloads/",
        )


def check_disk_space() -> tuple[bool, str]:
    """Check if enough disk space is available."""
    try:
        import shutil

        # Check space on current drive
        total, used, free = shutil.disk_usage(".")
        free_gb = free / (1024**3)

        if free_gb >= 1.0:  # Need at least 1GB
            return True, f"{free_gb:.1f} GB free"
        else:
            return False, f"Only {free_gb:.1f} GB free. Need at least 1 GB."
    except Exception as e:
        return False, f"Could not check disk space: {e}"


def check_internet() -> tuple[bool, str]:
    """Check if internet connection is available."""
    import socket

    try:
        # Try to connect to Google DNS
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        return True, "Connected"
    except OSError:
        return False, "No internet connection. Please connect and try again."


def print_check(name: str, passed: bool, message: str):
    """Print a check result."""
    symbol = "✅" if passed else "❌"
    status = "OK" if passed else "FAIL"
    print(f"{symbol} {name}: {status}")
    if message:
        print(f"     {message}")


def run_preflight_checks() -> bool:
    """Run all preflight checks."""
    print("🔍 Running preflight checks...\n")

    checks = [
        ("Windows 11", check_windows_version),
        ("Python 3.12+", check_python_version),
        ("Disk Space", check_disk_space),
        ("Internet Connection", check_internet),
    ]

    all_passed = True
    for name, check_func in checks:
        passed, message = check_func()
        print_check(name, passed, message)
        if not passed:
            all_passed = False

    print()

    if not all_passed:
        print("❌ Some checks failed. Please fix the issues above and try again.")
        print()
        return False

    print("✅ All checks passed! Ready to install.\n")
    return True


def install_dependencies(project_root: Path) -> bool:
    """Install Python dependencies."""
    print("📦 Installing dependencies...")
    print("   This may take a few minutes...")
    print()

    try:
        # Install in development mode with basic dependencies
        # Security: Using sys.executable (trusted) with hardcoded pip command
        result = subprocess.run(  # nosec B603 - controlled input (sys.executable + literal args)
            [sys.executable, "-m", "pip", "install", "-e", ".", "--quiet"],
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=300,
            check=False,
        )

        if result.returncode != 0:
            print(f"❌ Failed to install dependencies:")
            print(result.stderr)
            return False

        print("✅ Dependencies installed successfully!\n")
        return True

    except subprocess.TimeoutExpired:
        print("❌ Installation timed out. Please check your internet connection.")
        return False
    except Exception as e:
        print(f"❌ Error installing dependencies: {e}")
        return False


def install_playwright() -> bool:
    """Install Playwright browser for web scraping."""
    print("🌐 Installing Playwright browser (Chromium)...")
    print("   This may take a few minutes...")
    print()

    try:
        # Security: Using sys.executable (trusted) with hardcoded playwright command
        result = subprocess.run(  # nosec B603 - controlled input (sys.executable + literal args)
            [sys.executable, "-m", "playwright", "install", "chromium"],
            capture_output=True,
            text=True,
            timeout=300,
            check=False,
        )

        if result.returncode != 0:
            print(f"⚠️  Playwright installation had issues (non-critical):")
            print(result.stderr[:200] + "..." if len(result.stderr) > 200 else result.stderr)
            print("   You can continue - some scrapers may not work without it.")
            return True  # Non-critical

        print("✅ Playwright installed successfully!\n")
        return True

    except subprocess.TimeoutExpired:
        print("⚠️  Playwright installation timed out (non-critical)")
        print("   You can continue - some scrapers may not work without it.\n")
        return True  # Non-critical
    except Exception as e:
        print(f"⚠️  Playwright installation error (non-critical): {e}")
        print("   You can continue - some scrapers may not work without it.\n")
        return True  # Non-critical


def setup_directories(project_root: Path) -> bool:
    """Create necessary directories."""
    print("📁 Creating directories...")

    directories = [
        project_root / "data",
        project_root / "logs",
    ]

    try:
        for directory in directories:
            directory.mkdir(exist_ok=True, parents=True)
            print(f"   ✅ {directory.relative_to(project_root)}")

        print()
        return True
    except Exception as e:
        print(f"❌ Error creating directories: {e}\n")
        return False


def run_setup_wizard(project_root: Path) -> bool:
    """Run the interactive setup wizard."""
    print("🧙 Starting setup wizard...\n")
    print("The wizard will ask you a few questions to configure JobSentinel.")
    print("Don't worry - you can change these settings later!\n")

    input("Press Enter to start the wizard...")
    print()

    try:
        # Security: Using sys.executable (trusted) with hardcoded module path
        result = subprocess.run(  # nosec B603 - controlled input (sys.executable + literal args)
            [sys.executable, "-m", "jsa.cli", "setup"], 
            cwd=project_root, 
            timeout=300,
            check=False,
        )

        if result.returncode != 0:
            print(f"\n❌ Setup wizard failed.")
            return False

        print("\n✅ Configuration complete!\n")
        return True

    except subprocess.TimeoutExpired:
        print("\n❌ Setup wizard timed out.")
        return False
    except KeyboardInterrupt:
        print("\n\n⚠️  Setup wizard cancelled by user.")
        return False
    except Exception as e:
        print(f"\n❌ Error running setup wizard: {e}")
        return False


def run_health_check(project_root: Path) -> bool:
    """Run health check to verify installation."""
    print("🏥 Running health check...")
    print()

    try:
        # Security: Using sys.executable (trusted) with hardcoded module path
        result = subprocess.run(  # nosec B603 - controlled input (sys.executable + literal args)
            [sys.executable, "-m", "jsa.cli", "health"], 
            cwd=project_root, 
            timeout=30,
            check=False,
        )

        print()
        if result.returncode == 0:
            print("✅ Health check passed! System is ready.\n")
            return True
        else:
            print("⚠️  Health check completed with warnings (non-critical)\n")
            return True  # Warnings are okay

    except subprocess.TimeoutExpired:
        print("❌ Health check timed out.\n")
        return False
    except Exception as e:
        print(f"❌ Error running health check: {e}\n")
        return False


def create_desktop_shortcuts(project_root: Path) -> bool:
    """Create desktop shortcuts for easy access."""
    print("🔗 Creating desktop shortcuts...")

    try:
        # Import shortcuts module if available
        if HAS_ENHANCED_MODULES:
            results = create_jobsentinel_shortcuts(project_root)

            # Count successes
            success_count = sum(1 for s in results.values() if s)
            total_count = len(results)

            if success_count > 0:
                print(f"   ✅ Created {success_count}/{total_count} desktop shortcuts")
                print("   Look for them on your Desktop!")
                print()
                return True
            else:
                print("   ⚠️  Could not create shortcuts (non-critical)")
                print("   You can still run JobSentinel from the command line.")
                print()
                return True  # Non-critical
        else:
            print("   ⚠️  Shortcut creation not available yet")
            print()
            return True  # Non-critical

    except Exception as e:
        print(f"   ⚠️  Could not create shortcuts: {e} (non-critical)")
        print()
        return True  # Non-critical


def print_next_steps(shortcuts_created: bool = False):
    """Print next steps for the user."""
    print()
    print("=" * 70)
    print(" " * 20 + "🎉 Setup Complete! 🎉")
    print("=" * 70)
    print()
    print("JobSentinel is now installed and configured on your computer!")
    print()

    if shortcuts_created:
        print("✨ Desktop shortcuts created! You can now:")
        print("   • Double-click 'Run JobSentinel' to search for jobs")
        print("   • Double-click 'JobSentinel Dashboard' to view jobs")
        print("   • Double-click 'Configure JobSentinel' to change settings")
        print()
        print("Or use the command line:")
        print()
    else:
        print("📋 How to use JobSentinel:")
        print()

    print("1️⃣  Test your setup (no alerts sent):")
    print("     python -m jsa.cli run-once --dry-run")
    print()
    print("2️⃣  Run a real job search:")
    print("     python -m jsa.cli run-once")
    print()
    print("3️⃣  View jobs in your browser:")
    print("     python -m jsa.cli web")
    print("     Then visit: http://localhost:5000")
    print()
    print("4️⃣  Check system status anytime:")
    print("     python -m jsa.cli health")
    print()
    print("📚 Documentation:")
    print("   • docs/BEGINNER_GUIDE.md - Zero-knowledge guide")
    print("   • docs/troubleshooting.md - Problem solving")
    print("   • README.md - Project overview")
    print()
    print("💡 Pro Tips:")
    print("   • Your data: data/jobs.sqlite (SQLite database)")
    print("   • Your config: config/user_prefs.json")
    print("   • 100% local - all data stays on your computer")
    print("   • 100% private - no telemetry or tracking")
    print()
    print("❓ Need Help?")
    print("   • docs/WINDOWS_TROUBLESHOOTING.md")
    print("   • https://github.com/cboyd0319/JobSentinel/issues")
    print()
    print("=" * 70)
    print()


def main():
    """Main setup flow."""
    # Print banner
    print_banner()

    # Detect project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    # Security: Validate we're in a reasonable project directory
    if not (project_root / "pyproject.toml").exists():
        print("❌ Error: Not running from JobSentinel project directory")
        print(f"   Expected pyproject.toml in: {project_root}")
        return 1

    print(f"📍 Project root: {project_root}\n")

    # Change to project root
    os.chdir(project_root)

    # Run enhanced preflight checks if available
    if HAS_ENHANCED_MODULES:
        print("🔍 Running comprehensive system check...\n")
        checker = WindowsPreCheck(verbose=False)
        checker.run_all_checks()
        checker.print_results(show_help=True)

        if not checker.can_proceed():
            print("❌ Cannot proceed with installation due to critical issues.")
            print("   Please fix the issues above and try again.")
            return 1
    else:
        # Fall back to basic checks
        if not run_preflight_checks():
            return 1

    # Confirm with user
    print("Ready to begin installation.")
    response = input("Continue? (y/n): ").strip().lower()
    if response not in ["y", "yes"]:
        print("Setup cancelled by user.")
        return 0
    print()

    # Step 1: Install dependencies
    if not install_dependencies(project_root):
        print("❌ Setup failed at dependency installation.")
        return 1

    # Step 2: Install Playwright (non-critical)
    install_playwright()

    # Step 3: Create directories
    if not setup_directories(project_root):
        print("❌ Setup failed at directory creation.")
        return 1

    # Step 4: Run setup wizard
    if not run_setup_wizard(project_root):
        print("❌ Setup failed at configuration.")
        print()
        print("💡 You can run the wizard manually later:")
        print("   python -m jsa.cli setup")
        return 1

    # Step 5: Create desktop shortcuts
    shortcuts_created = create_desktop_shortcuts(project_root)

    # Step 6: Health check
    if not run_health_check(project_root):
        print("❌ Setup completed but health check failed.")
        print()
        print("💡 You can run the health check manually:")
        print("   python -m jsa.cli health")
        return 1

    # Success!
    print_next_steps(shortcuts_created=shortcuts_created)

    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\n\nSetup cancelled by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        print()
        print("Please report this issue:")
        print("https://github.com/cboyd0319/JobSentinel/issues")
        import traceback

        traceback.print_exc()
        sys.exit(1)
