#!/usr/bin/env python3
"""
JobSentinel Interactive Setup Wizard

Zero-knowledge installation wizard that guides users through complete setup
with interactive prompts, auto-detection, and helpful explanations.

Features:
- Detects system requirements automatically
- Guides through API key setup
- Tests configuration
- Provides helpful troubleshooting
- No technical knowledge required

References:
- SWEBOK v4.0a | https://computer.org/swebok | High | User interface design
- Nielsen's Usability Heuristics | https://www.nngroup.com | High | UX principles

Author: JobSentinel Team
License: MIT
"""

import json
import os
import platform
import re
import shutil
import subprocess
import sys
import webbrowser
from pathlib import Path
from typing import Any, Optional


# ANSI colors for better UX
class Colors:
    """Terminal color codes."""

    HEADER = "\033[95m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"
    END = "\033[0m"

    @staticmethod
    def supports_color() -> bool:
        """Check if terminal supports color."""
        return (
            hasattr(sys.stdout, "isatty")
            and sys.stdout.isatty()
            and platform.system() != "Windows"
            or os.environ.get("TERM", "").lower() != "dumb"
        )


def print_header(text: str) -> None:
    """Print a formatted header."""
    if Colors.supports_color():
        print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.BLUE}{text.center(70)}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.BLUE}{'='*70}{Colors.END}\n")
    else:
        print(f"\n{'='*70}")
        print(f"{text.center(70)}")
        print(f"{'='*70}\n")


def print_success(text: str) -> None:
    """Print success message."""
    symbol = "✓" if Colors.supports_color() else "[OK]"
    color = Colors.GREEN if Colors.supports_color() else ""
    end = Colors.END if Colors.supports_color() else ""
    print(f"{color}{symbol} {text}{end}")


def print_error(text: str) -> None:
    """Print error message."""
    symbol = "✗" if Colors.supports_color() else "[ERROR]"
    color = Colors.RED if Colors.supports_color() else ""
    end = Colors.END if Colors.supports_color() else ""
    print(f"{color}{symbol} {text}{end}")


def print_warning(text: str) -> None:
    """Print warning message."""
    symbol = "⚠" if Colors.supports_color() else "[WARN]"
    color = Colors.YELLOW if Colors.supports_color() else ""
    end = Colors.END if Colors.supports_color() else ""
    print(f"{color}{symbol} {text}{end}")


def print_info(text: str) -> None:
    """Print info message."""
    symbol = "ℹ" if Colors.supports_color() else "[INFO]"
    color = Colors.CYAN if Colors.supports_color() else ""
    end = Colors.END if Colors.supports_color() else ""
    print(f"{color}{symbol} {text}{end}")


def ask_yes_no(question: str, default: bool = True) -> bool:
    """Ask a yes/no question."""
    default_str = "Y/n" if default else "y/N"
    while True:
        response = input(f"{question} [{default_str}]: ").strip().lower()
        if not response:
            return default
        if response in ["y", "yes"]:
            return True
        if response in ["n", "no"]:
            return False
        print_warning("Please answer 'y' or 'n'")


def ask_input(prompt: str, default: str = "", validator: Optional[callable] = None) -> str:
    """Ask for text input with optional validation."""
    while True:
        if default:
            response = input(f"{prompt} [{default}]: ").strip()
            if not response:
                response = default
        else:
            response = input(f"{prompt}: ").strip()

        if validator:
            is_valid, error_msg = validator(response)
            if not is_valid:
                print_error(error_msg)
                continue

        return response


def validate_url(url: str) -> tuple[bool, str]:
    """Validate URL format."""
    if not url:
        return False, "URL cannot be empty"

    url_pattern = re.compile(
        r"^https?://"  # http:// or https://
        r"(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|"  # domain...
        r"localhost|"  # localhost...
        r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})"  # ...or ip
        r"(?::\d+)?"  # optional port
        r"(?:/?|[/?]\S+)$",
        re.IGNORECASE,
    )

    if url_pattern.match(url):
        return True, ""
    return False, "Invalid URL format. Must start with http:// or https://"


def validate_email(email: str) -> tuple[bool, str]:
    """Validate email format."""
    if not email:
        return True, ""  # Email is optional

    email_pattern = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
    if email_pattern.match(email):
        return True, ""
    return False, "Invalid email format"


def check_python_version() -> tuple[bool, str]:
    """Check if Python version meets requirements."""
    version = sys.version_info
    required = (3, 12)

    if version >= required:
        return True, f"Python {version.major}.{version.minor}.{version.micro}"
    else:
        return False, f"Python {version.major}.{version.minor}.{version.micro} (requires 3.12+)"


def check_command_exists(command: str) -> bool:
    """Check if a command exists in PATH."""
    return shutil.which(command) is not None


def run_command(command: list[str], capture: bool = True) -> tuple[bool, str]:
    """Run a command and return success status and output."""
    try:
        if capture:
            result = subprocess.run(command, capture_output=True, text=True, timeout=30)
            return result.returncode == 0, result.stdout + result.stderr
        else:
            result = subprocess.run(command, timeout=30)
            return result.returncode == 0, ""
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as e:
        return False, str(e)


def detect_system_info() -> dict[str, Any]:
    """Detect system information."""
    info = {
        "os": platform.system(),
        "os_version": platform.version(),
        "machine": platform.machine(),
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "has_git": check_command_exists("git"),
        "has_pip": check_command_exists("pip") or check_command_exists("pip3"),
        "in_venv": hasattr(sys, "real_prefix")
        or (hasattr(sys, "base_prefix") and sys.base_prefix != sys.prefix),
    }
    return info


def create_config_file(config_path: Path, config: dict[str, Any]) -> bool:
    """Create configuration file."""
    try:
        config_path.parent.mkdir(parents=True, exist_ok=True)
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
        return True
    except Exception as e:
        print_error(f"Failed to create config: {e}")
        return False


def create_env_file(env_path: Path, env_vars: dict[str, str]) -> bool:
    """Create .env file.
    
    Note: This intentionally writes secrets to .env file, which is the standard
    practice for local environment configuration. The .env file is excluded from
    git via .gitignore and should be protected by filesystem permissions.
    """
    try:
        with open(env_path, "w", encoding="utf-8") as f:
            for key, value in env_vars.items():
                if value:
                    f.write(f"{key}={value}\n")
        return True
    except Exception as e:
        print_error(f"Failed to create .env: {e}")
        return False


def main() -> int:
    """Main setup wizard."""

    # Welcome
    print_header("JobSentinel Setup Wizard")
    print("Welcome! This wizard will help you set up JobSentinel in just a few minutes.")
    print("No technical knowledge required - we'll guide you through everything.\n")

    # Detect system
    print_info("Detecting your system...")
    system_info = detect_system_info()

    print(f"  OS: {system_info['os']} {system_info['os_version']}")
    print(f"  Python: {system_info['python_version']}")
    print(f"  Git installed: {'Yes' if system_info['has_git'] else 'No'}")
    print(f"  Virtual environment: {'Yes' if system_info['in_venv'] else 'No'}")
    print()

    # Check Python version
    python_ok, python_msg = check_python_version()
    if python_ok:
        print_success(f"Python version OK: {python_msg}")
    else:
        print_error(f"Python version too old: {python_msg}")
        print("\nPlease install Python 3.12 or newer:")
        print("  - Download from: https://www.python.org/downloads/")
        print("  - Or use your system package manager")
        return 1

    # Check Git
    if not system_info["has_git"]:
        print_warning("Git not found - needed for installation")
        print("\nPlease install Git:")
        print("  - Download from: https://git-scm.com/downloads")
        print("  - Or use your system package manager")
        if not ask_yes_no("Continue anyway?", default=False):
            return 1

    # Check virtual environment
    if not system_info["in_venv"]:
        print_warning("Not in a virtual environment - recommended for isolation")
        if ask_yes_no("Create a virtual environment now?", default=True):
            print_info("Creating virtual environment...")
            success, output = run_command([sys.executable, "-m", "venv", ".venv"])
            if success:
                print_success("Virtual environment created at .venv")
                print("\nPlease activate it and run this wizard again:")
                if system_info["os"] == "Windows":
                    print("  .venv\\Scripts\\activate")
                else:
                    print("  source .venv/bin/activate")
                return 0
            else:
                print_error(f"Failed to create virtual environment: {output}")
                if not ask_yes_no("Continue anyway?", default=False):
                    return 1

    # Install dependencies
    print_header("Installing Dependencies")

    if ask_yes_no("Install JobSentinel and dependencies?", default=True):
        print_info("Installing... (this may take a few minutes)")

        # Install main package
        success, output = run_command([sys.executable, "-m", "pip", "install", "-e", "."])
        if not success:
            print_error("Installation failed")
            print(output)
            return 1

        print_success("Core package installed")

        # Optional: ML features
        if ask_yes_no("Install ML features (resume analysis, semantic matching)?", default=True):
            print_info("Installing ML dependencies...")
            success, _ = run_command([sys.executable, "-m", "pip", "install", "-e", ".[ml]"])
            if success:
                print_success("ML features installed")
            else:
                print_warning("ML installation had issues - continuing...")

        # Optional: MCP integration
        if ask_yes_no("Install MCP integration (Context7, knowledge servers)?", default=True):
            print_info("Installing MCP dependencies...")
            success, _ = run_command([sys.executable, "-m", "pip", "install", "-e", ".[mcp]"])
            if success:
                print_success("MCP integration installed")
            else:
                print_warning("MCP installation had issues - continuing...")

    # Configuration
    print_header("Configuration")

    print("Let's configure JobSentinel for your job search.\n")

    config = {
        "keywords": [],
        "locations": [],
        "salary_min": 0,
        "denied_companies": [],
        "job_sources": {},
        "slack": {},
        "resume": {},
    }

    # Job preferences
    print_info("Job Search Preferences")
    print("What kind of jobs are you looking for?\n")

    keywords_input = ask_input("Keywords (comma-separated, e.g., 'python, backend, api')", "")
    if keywords_input:
        config["keywords"] = [k.strip() for k in keywords_input.split(",")]

    locations_input = ask_input(
        "Locations (comma-separated, e.g., 'Remote, San Francisco')", "Remote"
    )
    if locations_input:
        config["locations"] = [loc.strip() for loc in locations_input.split(",")]

    salary_input = ask_input("Minimum salary (USD, optional)", "0")
    try:
        config["salary_min"] = int(salary_input)
    except ValueError:
        config["salary_min"] = 0

    denylist_input = ask_input("Companies to exclude (comma-separated, optional)", "")
    if denylist_input:
        config["denied_companies"] = [c.strip() for c in denylist_input.split(",")]

    # Job sources
    print("\n" + "=" * 70)
    print_info("Job Sources")
    print("JobSentinel can search multiple job boards.\n")

    config["job_sources"]["jobswithgpt"] = {
        "enabled": ask_yes_no("Enable JobsWithGPT (free, no API key needed)?", default=True)
    }

    if ask_yes_no("Enable Reed.co.uk (requires free API key)?", default=False):
        print("\nGet your Reed API key:")
        print("  1. Visit: https://www.reed.co.uk/developers")
        print("  2. Sign up for a free account")
        print("  3. Copy your API key")

        if ask_yes_no("Open Reed developer page in browser?", default=True):
            webbrowser.open("https://www.reed.co.uk/developers")

        reed_key = ask_input("Reed API key (or press Enter to skip)", "")
        config["job_sources"]["reed"] = {"enabled": bool(reed_key), "api_key": reed_key}

    # Slack notifications
    print("\n" + "=" * 70)
    print_info("Slack Notifications (Optional)")
    print("Get instant alerts for high-quality job matches.\n")

    if ask_yes_no("Enable Slack notifications?", default=True):
        print("\nSet up Slack webhook:")
        print("  1. Visit: https://api.slack.com/messaging/webhooks")
        print("  2. Create an Incoming Webhook")
        print("  3. Choose a channel (or create #job-alerts)")
        print("  4. Copy the webhook URL")

        if ask_yes_no("Open Slack webhook page in browser?", default=True):
            webbrowser.open("https://api.slack.com/messaging/webhooks")

        webhook_url = ask_input("Slack webhook URL (or press Enter to skip)", "", validate_url)
        channel = ask_input("Slack channel", "#job-alerts")

        config["slack"] = {
            "webhook_url": webhook_url,
            "channel": channel,
            "enabled": bool(webhook_url),
        }

    # Resume settings
    print("\n" + "=" * 70)
    print_info("Resume Optimization (Optional)")

    if ask_yes_no("Enable resume optimization features?", default=True):
        industries = [
            "software_engineering",
            "data_science",
            "devops",
            "cybersecurity",
            "healthcare",
            "finance",
            "legal",
            "education",
            "marketing",
            "sales",
            "product_management",
            "design",
        ]

        print("\nAvailable industries:")
        for i, industry in enumerate(industries, 1):
            print(f"  {i:2d}. {industry.replace('_', ' ').title()}")

        industry_input = ask_input("Target industry (name or number)", "software_engineering")
        try:
            industry_idx = int(industry_input) - 1
            if 0 <= industry_idx < len(industries):
                target_industry = industries[industry_idx]
            else:
                target_industry = "software_engineering"
        except ValueError:
            target_industry = industry_input.lower().replace(" ", "_")

        config["resume"] = {"target_industry": target_industry, "auto_enhance": True}

    # Save configuration
    print_header("Saving Configuration")

    config_path = Path("deploy/common/config/user_prefs.json")
    if create_config_file(config_path, config):
        print_success(f"Configuration saved to {config_path}")
    else:
        print_error("Failed to save configuration")
        return 1

    # Environment variables
    env_vars = {}
    if config.get("slack", {}).get("webhook_url"):
        env_vars["SLACK_WEBHOOK_URL"] = config["slack"]["webhook_url"]
    if config.get("job_sources", {}).get("reed", {}).get("api_key"):
        env_vars["REED_API_KEY"] = config["job_sources"]["reed"]["api_key"]

    if env_vars:
        env_path = Path(".env")
        if create_env_file(env_path, env_vars):
            print_success(f"Environment variables saved to {env_path}")

    # Test configuration
    print_header("Testing Configuration")

    print_info("Running configuration validation...")
    success, output = run_command(
        [sys.executable, "-m", "jsa.cli", "config-validate", "--path", str(config_path)]
    )

    if success:
        print_success("Configuration is valid!")
    else:
        print_warning("Configuration validation had warnings:")
        print(output)

    # Finish
    print_header("Setup Complete!")

    print_success("JobSentinel is ready to use!")
    print("\nNext steps:")
    print("  1. Test your setup:")
    print(f"     {sys.executable} -m jsa.cli run-once --dry-run")
    print("\n  2. Run a real job search:")
    print(f"     {sys.executable} -m jsa.cli run-once")
    print("\n  3. View documentation:")
    print("     https://github.com/cboyd0319/JobSentinel/blob/main/README.md")

    print("\n" + "=" * 70)
    print("Need help? Check docs/TROUBLESHOOTING.md or open an issue on GitHub.")
    print("=" * 70 + "\n")

    return 0


if __name__ == "__main__":
    sys.exit(main())
