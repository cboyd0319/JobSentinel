#!/usr/bin/env python3
"""
Zero Technical Knowledge Setup Wizard for JobSentinel

This wizard guides users with ZERO technical knowledge through the complete
setup process with plain English explanations and automatic error recovery.

References:
- WCAG 2.2 | https://www.w3.org/WAI/WCAG22/ | High | Accessibility guidelines
- ISO 25010 Usability | https://iso.org/standard/78176 | High | Learnability, operability
- Plain Language Act | https://plainlanguage.gov | High | 8th grade reading level
"""

import json
import os
import platform
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

# ANSI color codes for better readability
COLORS = {
    "green": "\033[92m",
    "yellow": "\033[93m",
    "red": "\033[91m",
    "blue": "\033[94m",
    "reset": "\033[0m",
    "bold": "\033[1m",
}


def print_color(message: str, color: str = "reset", bold: bool = False) -> None:
    """Print colored text for better visibility."""
    prefix = COLORS.get("bold", "") if bold else ""
    color_code = COLORS.get(color, COLORS["reset"])
    print(f"{prefix}{color_code}{message}{COLORS['reset']}")


def print_header(title: str) -> None:
    """Print a section header."""
    print("\n" + "=" * 70)
    print_color(f"  {title}", "blue", bold=True)
    print("=" * 70 + "\n")


def print_success(message: str) -> None:
    """Print success message."""
    print_color(f"✓ {message}", "green")


def print_error(message: str) -> None:
    """Print error message."""
    print_color(f"✗ {message}", "red")


def print_info(message: str) -> None:
    """Print info message."""
    print_color(f"ℹ {message}", "blue")


def print_warning(message: str) -> None:
    """Print warning message."""
    print_color(f"⚠ {message}", "yellow")


def clear_screen() -> None:
    """Clear the terminal screen."""
    os.system("cls" if platform.system() == "Windows" else "clear")


def press_enter_to_continue() -> None:
    """Wait for user to press Enter."""
    input("\nPress ENTER to continue...")


def ask_yes_no(question: str, default: bool = True) -> bool:
    """Ask a yes/no question."""
    default_str = "Y/n" if default else "y/N"
    while True:
        response = input(f"\n{question} [{default_str}]: ").strip().lower()
        if not response:
            return default
        if response in ["y", "yes"]:
            return True
        if response in ["n", "no"]:
            return False
        print_error("Please answer with 'yes' or 'no' (or just press ENTER for default)")


def ask_input(question: str, default: str = "", required: bool = False) -> str:
    """Ask for text input."""
    default_display = f" [default: {default}]" if default else ""
    required_marker = " (required)" if required else ""

    while True:
        response = input(f"\n{question}{default_display}{required_marker}: ").strip()
        if response:
            return response
        if default:
            return default
        if not required:
            return ""
        print_error("This field is required. Please enter a value.")


def check_python_version() -> tuple[bool, str]:
    """Check if Python version is adequate."""
    version = sys.version_info
    version_str = f"{version.major}.{version.minor}.{version.micro}"

    if version.major >= 3 and version.minor >= 12:
        return True, version_str
    return False, version_str


def check_internet_connection() -> bool:
    """Check if internet is available."""
    import socket

    try:
        # Try to connect to Google DNS
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        return True
    except OSError:
        return False


def detect_system_info() -> dict[str, Any]:
    """Detect system information."""
    return {
        "os": platform.system(),
        "os_version": platform.version(),
        "architecture": platform.machine(),
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "home_dir": str(Path.home()),
        "current_dir": os.getcwd(),
    }


def welcome_screen() -> None:
    """Display welcome screen."""
    clear_screen()
    print_header("Welcome to JobSentinel Setup Wizard")

    print(
        """
    👋 Hello! This wizard will help you set up JobSentinel - the world's best
    job search automation tool - in just a few minutes.
    
    🎯 WHAT THIS WIZARD DOES:
    
    1. Checks your computer (takes 5 seconds)
    2. Installs needed software (takes 2-5 minutes)
    3. Sets up JobSentinel (takes 1 minute)
    4. Configures your job preferences (takes 2 minutes)
    5. Runs your first job search! (takes 30 seconds)
    
    ⏱️  TOTAL TIME: About 5-10 minutes
    
    📚 GOOD TO KNOW:
    
    - You don't need any technical knowledge
    - The wizard explains everything in plain English
    - You can quit anytime (press Ctrl+C)
    - All your data stays on YOUR computer (100% private)
    - Everything is FREE and open source
    
    🔒 PRIVACY GUARANTEE:
    
    - No tracking or telemetry
    - No accounts to create
    - No personal data collected
    - Your job searches stay on your computer
    """
    )

    press_enter_to_continue()


def system_check() -> dict[str, Any]:
    """Perform system compatibility check."""
    print_header("Step 1: Checking Your Computer")

    print_info("Detecting your system...")
    sys_info = detect_system_info()

    print(f"\n📊 YOUR SYSTEM:")
    print(f"   Operating System: {sys_info['os']} {sys_info['architecture']}")
    print(f"   Python Version: {sys_info['python_version']}")

    # Check Python version
    python_ok, python_ver = check_python_version()
    if python_ok:
        print_success(f"Python {python_ver} is installed and compatible!")
    else:
        print_error(f"Python {python_ver} is too old. Need version 3.12 or newer.")
        print("\n💡 HOW TO FIX:")
        print("   1. Visit: https://www.python.org/downloads/")
        print("   2. Download Python 3.13 or newer")
        print("   3. Install it (follow the installer instructions)")
        print("   4. Run this setup wizard again")
        sys.exit(1)

    # Check internet
    print_info("\nChecking internet connection...")
    if check_internet_connection():
        print_success("Internet connection detected!")
    else:
        print_warning("No internet detected - will use offline mode when possible")

    # Check available space
    import shutil

    free_space_gb = shutil.disk_usage(sys_info["current_dir"]).free / (1024**3)
    print(f"\n💾 Free disk space: {free_space_gb:.1f} GB")

    if free_space_gb < 1:
        print_warning("Low disk space. JobSentinel needs about 500 MB.")
        if not ask_yes_no("Continue anyway?", default=False):
            sys.exit(0)
    else:
        print_success("Plenty of disk space available!")

    print_success("\n✓ Your computer is ready for JobSentinel!")
    press_enter_to_continue()

    return sys_info


def install_dependencies(sys_info: dict[str, Any]) -> bool:
    """Install Python dependencies."""
    print_header("Step 2: Installing Required Software")

    print(
        """
    📦 JobSentinel needs a few free software packages to work:
    
    - Flask: For the web interface
    - BeautifulSoup: For reading job websites  
    - Playwright: For automated browsing
    - SQLAlchemy: For saving your job searches
    
    This is like installing apps on your phone - completely normal and safe.
    """
    )

    if not ask_yes_no("Ready to install? This takes 2-5 minutes", default=True):
        print_info("Setup cancelled. Run this script again when ready!")
        sys.exit(0)

    print_info("\n⏳ Installing packages... (this may take a few minutes)")
    print_info("You'll see some text scrolling by - that's normal!\n")

    try:
        # Install JobSentinel in editable mode
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-e", "."],
            check=True,
            cwd=Path(__file__).parent.parent,
        )
        print_success("\n✓ Core packages installed!")

        # Install Playwright browsers
        print_info("\n⏳ Installing web browser for automation...")
        subprocess.run(
            [sys.executable, "-m", "playwright", "install", "chromium"],
            check=True,
        )
        print_success("✓ Browser installed!")

        return True

    except subprocess.CalledProcessError as e:
        print_error(f"\n✗ Installation failed: {e}")
        print("\n💡 TROUBLESHOOTING:")
        print("   1. Check your internet connection")
        print("   2. Try running: python -m pip install --upgrade pip")
        print("   3. Contact support if the problem continues")
        return False


def configure_preferences() -> dict[str, Any]:
    """Configure user preferences interactively."""
    print_header("Step 3: Configure Your Job Preferences")

    print(
        """
    🎯 Let's set up your job search criteria.
    
    Don't worry - you can change these anytime later!
    """
    )

    # Job keywords
    print_info("\n🔍 WHAT KIND OF JOBS ARE YOU LOOKING FOR?")
    print("Examples: 'python developer', 'data analyst', 'marketing manager'")
    print("Tip: Enter 2-4 keywords for best results\n")

    keywords = []
    while True:
        keyword = ask_input(f"Job keyword #{len(keywords) + 1} (or press ENTER when done)")
        if not keyword:
            break
        keywords.append(keyword)
        print_success(f"Added: {keyword}")

    if not keywords:
        print_warning("No keywords entered. Using default: 'software engineer'")
        keywords = ["software engineer"]

    # Locations
    print_info("\n📍 WHERE DO YOU WANT TO WORK?")
    print("Examples: 'Remote', 'New York', 'San Francisco', 'London'")
    print("Tip: 'Remote' is a popular choice!\n")

    locations = []
    while True:
        location = ask_input(f"Location #{len(locations) + 1} (or press ENTER when done)")
        if not location:
            break
        locations.append(location)
        print_success(f"Added: {location}")

    if not locations:
        print_warning("No locations entered. Using default: 'Remote'")
        locations = ["Remote"]

    # Minimum salary
    print_info("\n💰 MINIMUM SALARY (OPTIONAL)")
    print("Enter your minimum desired salary in dollars (or press ENTER to skip)")
    print("Example: 80000 for $80,000 per year\n")

    salary_str = ask_input("Minimum salary")
    salary_min = 0
    if salary_str:
        try:
            salary_min = int(salary_str.replace(",", "").replace("$", ""))
            print_success(f"Set minimum salary: ${salary_min:,}")
        except ValueError:
            print_warning("Invalid number - skipping salary filter")

    # Slack webhook (optional)
    print_info("\n📱 SLACK NOTIFICATIONS (OPTIONAL)")
    print("Want job alerts sent to Slack? You'll need a webhook URL.")
    print("Don't know what that is? Just press ENTER to skip - you can add it later!")

    slack_webhook = ""
    if ask_yes_no("Do you have a Slack webhook URL?", default=False):
        slack_webhook = ask_input("Paste your Slack webhook URL")
        if slack_webhook:
            print_success("Slack notifications enabled!")

    # Summary
    print_header("Your Job Search Configuration")
    print(f"\n🔍 Keywords: {', '.join(keywords)}")
    print(f"📍 Locations: {', '.join(locations)}")
    print(f"💰 Min Salary: ${salary_min:,}" if salary_min > 0 else "💰 Min Salary: Not set")
    print(f"📱 Slack: {'Enabled' if slack_webhook else 'Disabled'}")

    if not ask_yes_no("\nLooks good?", default=True):
        print_info("Let's try again!")
        return configure_preferences()

    return {
        "keywords": keywords,
        "locations": locations,
        "salary_min": salary_min,
        "slack": {
            "webhook_url": slack_webhook,
            "enabled": bool(slack_webhook),
        },
        "job_sources": {
            "jobswithgpt": {"enabled": True},
            "reed": {"enabled": False, "api_key": ""},
        },
    }


def save_configuration(config: dict[str, Any]) -> bool:
    """Save configuration to file."""
    print_header("Step 4: Saving Your Configuration")

    config_dir = Path(__file__).parent.parent / "config"
    config_file = config_dir / "user_prefs.json"

    try:
        config_dir.mkdir(exist_ok=True)
        with open(config_file, "w") as f:
            json.dump(config, f, indent=2)

        print_success(f"Configuration saved to: {config_file}")
        return True

    except Exception as e:
        print_error(f"Failed to save configuration: {e}")
        return False


def run_first_search() -> bool:
    """Run the first job search."""
    print_header("Step 5: Running Your First Job Search!")

    print(
        """
    🚀 Let's test your setup by running a quick job search!
    
    This will:
    1. Search for jobs matching your criteria
    2. Score and rank the results
    3. Show you the top matches
    
    This takes about 30 seconds...
    """
    )

    if not ask_yes_no("Ready to search for jobs?", default=True):
        print_info("Skipping test search. You can run it later with: python -m jsa.cli run-once")
        return True

    print_info("\n⏳ Searching for jobs...\n")

    try:
        result = subprocess.run(
            [sys.executable, "-m", "jsa.cli", "run-once", "--verbose"],
            check=True,
            cwd=Path(__file__).parent.parent,
            timeout=120,
        )

        print_success("\n✓ Job search completed successfully!")
        return True

    except subprocess.TimeoutExpired:
        print_error("\n✗ Search took too long (timeout after 2 minutes)")
        return False
    except subprocess.CalledProcessError as e:
        print_error(f"\n✗ Search failed: {e}")
        return False


def completion_screen() -> None:
    """Display completion screen with next steps."""
    print_header("🎉 Setup Complete! JobSentinel is Ready!")

    print(
        """
    ✨ Congratulations! JobSentinel is now installed and configured.
    
    📚 WHAT YOU CAN DO NOW:
    
    1. 🔍 SEARCH FOR JOBS:
       python -m jsa.cli run-once
    
    2. 🌐 START WEB INTERFACE:
       python -m jsa.cli web --port 5000
       Then open: http://localhost:5000
    
    3. 📝 ANALYZE YOUR RESUME:
       python examples/detection_and_autofix_demo.py
    
    4. ⚙️  CHANGE SETTINGS:
       Edit: config/user_prefs.json
       (it's a text file you can open in Notepad or TextEdit)
    
    5. 📖 READ THE DOCS:
       Open: docs/BEGINNER_GUIDE.md
    
    🆘 NEED HELP?
    
    - Read the troubleshooting guide: docs/TROUBLESHOOTING.md
    - Check examples: examples/ folder
    - Report issues: https://github.com/cboyd0319/JobSentinel/issues
    
    🌟 ENJOY USING JOBSENTINEL!
    
    Remember: All your data stays private on YOUR computer. No tracking. No telemetry.
    """
    )

    print_success("\nHappy job hunting! 🚀\n")


def main() -> None:
    """Main setup wizard flow."""
    try:
        # Step 0: Welcome
        welcome_screen()

        # Step 1: System check
        sys_info = system_check()

        # Step 2: Install dependencies
        if not install_dependencies(sys_info):
            print_error("\nSetup failed during installation.")
            sys.exit(1)

        # Step 3: Configure preferences
        config = configure_preferences()

        # Step 4: Save configuration
        if not save_configuration(config):
            print_error("\nSetup failed during configuration save.")
            sys.exit(1)

        # Step 5: Run first search (optional)
        run_first_search()

        # Step 6: Completion
        completion_screen()

    except KeyboardInterrupt:
        print_info("\n\n🛑 Setup cancelled by user. Run this script again to resume!")
        sys.exit(0)
    except Exception as e:
        print_error(f"\n\n✗ Unexpected error: {e}")
        print_info("Please report this issue with the error message above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
