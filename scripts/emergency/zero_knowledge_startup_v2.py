#!/usr/bin/env python3
"""
Zero-Knowledge User Startup Script (Enhanced v2.0)

This script is designed for users with ZERO technical knowledge.
It provides comprehensive setup, validation, and guidance with clear explanations.

Features:
- Complete system validation
- Automated dependency installation
- Configuration wizard
- Resume scanning setup
- Error recovery guidance
- Windows-specific optimizations
"""

import json
import os
import platform
import subprocess
import sys
from pathlib import Path


class Colors:
    """Console colors for better UX."""
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def colored_print(message: str, color: str = Colors.END) -> None:
    """Print colored message if terminal supports it."""
    if platform.system() == "Windows":
        # Try to enable ANSI colors on Windows
        try:
            import colorama
            colorama.init()
            print(f"{color}{message}{Colors.END}")
        except ImportError:
            print(message)
    else:
        print(f"{color}{message}{Colors.END}")

def get_system_info() -> dict[str, str]:
    """Get comprehensive system information."""
    info = {
        'os': platform.system(),
        'version': platform.version(),
        'architecture': platform.architecture()[0],
        'python': f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        'platform': platform.platform()
    }
    return info

def print_banner() -> None:
    """Print comprehensive banner with current status."""
    colored_print("""
╔══════════════════════════════════════════════════════════════════════════════╗
║                        JOB SEARCH AUTOMATION STARTUP                         ║
║                                                                              ║
║  Zero technical knowledge required                                          ║
║  Complete system validation                                                 ║
║  Automated setup and configuration                                          ║
║  Professional resume ATS scanning                                           ║
║  Step-by-step guidance                                                      ║
║                                                                              ║
║  [ALPHA SOFTWARE] - Experimental but functional                             ║
║  Test locally first. Community support available.                           ║
╚══════════════════════════════════════════════════════════════════════════════╝
""", Colors.BLUE)

    # Show current system info
    system_info = get_system_info()
    print(f"System: {system_info['os']} {system_info['architecture']}")
    print(f"Python: {system_info['python']}")
    print(f"Location: {Path.cwd()}")
    print("=" * 80 + "\n")

def check_platform_compatibility() -> bool:
    """Check if current platform is supported."""
    colored_print("Checking platform compatibility...", Colors.YELLOW)

    system = platform.system()

    if system == "Windows":
        # Check Windows version
        version = platform.version()
        try:
            major_version = int(version.split('.')[0])
            if major_version >= 10:
                colored_print("✅ Windows 10+ detected - Fully supported", Colors.GREEN)

                # Suggest Windows installer for better experience
                print("\nRECOMMENDATION:")
                print("   For the best Windows experience, use our dedicated installer:")
                print("   Run this in PowerShell:")
                colored_print("   irm https://raw.githubusercontent.com/cboyd0319/JobSentinel/main/deploy/windows/bootstrap.ps1 | iex", Colors.BOLD)

                response = input("\n   Continue with manual setup anyway? (y/N): ").lower().strip()
                if response not in ['y', 'yes']:
                    print("\nOpening PowerShell command instructions...")
                    print("   Copy and paste the command above into PowerShell")
                    return False

                return True
            else:
                colored_print(f"❌ Windows {major_version} is not supported. Upgrade to Windows 10+", Colors.RED)
                return False
        except Exception:  # nosec B110 - intentionally broad for version detection fallback
            colored_print("⚠️  Could not determine Windows version, proceeding anyway", Colors.YELLOW)
            return True

    elif system == "Darwin":  # macOS
        colored_print("macOS detected - Manual setup required", Colors.YELLOW)
        print("   Note: macOS support is experimental")
        return True

    elif system == "Linux":
        colored_print("Linux detected - Manual setup required", Colors.YELLOW)
        print("   Note: Linux support is experimental")
        return True

    else:
        colored_print(f"❌ Unsupported platform: {system}", Colors.RED)
        return False

def check_python_version() -> bool:
    """Check if Python version is adequate with enhanced feedback."""
    colored_print("Checking Python installation...", Colors.YELLOW)

    python_version = sys.version_info
    min_version = (3, 8)
    recommended_version = (3, 11)

    if python_version < min_version:
        colored_print(f"❌ Python {python_version.major}.{python_version.minor} is too old", Colors.RED)
        print(f"   Minimum required: Python {min_version[0]}.{min_version[1]}")
        print(f"   Recommended: Python {recommended_version[0]}.{recommended_version[1]}")

        print("\nHOW TO FIX:")
        print("   1. Visit https://python.org/downloads/")
        print("   2. Download Python 3.11 or newer")
        print("   3. During installation, check 'Add Python to PATH'")
        print("   4. Restart your computer")
        print("   5. Run this script again")

        if platform.system() == "Windows":
            print("\nWindows users can also use the automated installer:")
            print("   It will install Python automatically!")

        return False

    elif python_version < recommended_version:
        colored_print(f"Python {python_version.major}.{python_version.minor}.{python_version.micro} works but is not optimal", Colors.YELLOW)
        print(f"   Recommended: Python {recommended_version[0]}.{recommended_version[1]}+ for best performance")
        print("   Your version will work, continuing...")
    else:
        colored_print(f"Python {python_version.major}.{python_version.minor}.{python_version.micro} is excellent", Colors.GREEN)

    return True

def check_required_files() -> bool:
    """Check if essential project files exist."""
    colored_print("Checking project files...", Colors.YELLOW)

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
        colored_print("❌ Missing essential project files:", Colors.RED)
        for file in missing_files:
            print(f"   • {file}")

        print("\nHOW TO FIX:")
        print("   1. Ensure you're in the correct project directory")
        print("   2. If files are missing, re-download the project:")
    print("      https://github.com/cboyd0319/JobSentinel/archive/refs/heads/main.zip")
        print("   3. Extract all files and run this script from the main directory")

        return False

    colored_print("✅ All essential project files found", Colors.GREEN)
    return True

def check_and_install_dependencies() -> bool:
    """Check and install Python dependencies with user guidance."""
    colored_print("Checking Python dependencies...", Colors.YELLOW)

    requirements_file = Path("requirements.txt")
    if not requirements_file.exists():
        colored_print("❌ requirements.txt not found", Colors.RED)
        return False

    print("   Installing required Python packages...")
    print("   (This may take a few minutes the first time)")

    try:
        # Upgrade pip first
        print("   • Upgrading pip...")
        subprocess.run(  # noqa: S603 - upgrading pip
            [sys.executable, "-m", "pip", "install", "--upgrade", "pip"],
            check=True, capture_output=True
        )

        # Install requirements
        print("   • Installing project dependencies...")
        result = subprocess.run(  # noqa: S603 - installing from requirements.txt
            [sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
            check=True, capture_output=True, text=True
        )

        # Install optional but recommended packages
        optional_packages = [
            "pdfplumber",  # Better PDF parsing
            "python-docx", # DOCX support
            "rapidfuzz",   # Fast string matching
        ]

        print("   • Installing optional enhancements...")
        for package in optional_packages:
            try:
                subprocess.run(  # noqa: S603 - installing optional packages
                    [sys.executable, "-m", "pip", "install", package],
                    check=True, capture_output=True
                )
                print(f"     ✅ {package}")
            except subprocess.CalledProcessError:
                print(f"     ⚠️  {package} (optional, skipped)")

        colored_print("✅ Dependencies installed successfully", Colors.GREEN)
        return True

    except subprocess.CalledProcessError as e:
        colored_print("❌ Dependency installation failed", Colors.RED)
        print(f"   Error: {e}")

        print("\nTROUBLESHOOTING:")
        print("   1. Check your internet connection")
        print("   2. Try running as administrator/sudo")
        print("   3. Update Python to a newer version")
        print("   4. Manual installation:")
        print("      pip install -r requirements.txt")

        return False

def setup_configuration() -> bool:
    """Guide user through configuration setup with enhanced wizard."""
    colored_print("⚙️  Setting up configuration...", Colors.YELLOW)

    config_dir = Path("config")
    user_config_path = config_dir / "user_prefs.json"
    example_config_path = config_dir / "user_prefs.example.json"

    if not example_config_path.exists():
        colored_print("❌ Example configuration file not found", Colors.RED)
        return False

    if user_config_path.exists():
        colored_print("✅ Configuration already exists", Colors.GREEN)
        response = input("   Update your configuration? (y/N): ").lower().strip()
        if response not in ['y', 'yes']:
            return True

    # Load example configuration
    try:
        with open(example_config_path) as f:
            config = json.load(f)
    except Exception as e:
        colored_print(f"❌ Could not load example configuration: {e}", Colors.RED)
        return False

    print("\nCONFIGURATION WIZARD")
    print("=" * 50)
    print("Let's personalize this for your job search.")
    print("Press Enter to skip any question and use defaults.\n")

    # Job titles
    print("1️⃣  What job titles are you looking for?")
    print("   Examples: Software Engineer, Data Scientist, Marketing Manager")
    job_titles = input("   Job titles (comma-separated): ").strip()
    if job_titles:
        config["job_titles"] = [title.strip() for title in job_titles.split(',')]
        print(f"   ✅ Set job titles: {', '.join(config['job_titles'])}")

    # Keywords/Skills
    print("\n2️⃣  What skills/keywords should I look for?")
    print("   Examples: python, javascript, aws, project management")
    keywords = input("   Keywords (comma-separated): ").strip()
    if keywords:
        config["keywords"] = [kw.strip().lower() for kw in keywords.split(',')]
        print(f"   ✅ Set keywords: {', '.join(config['keywords'])}")

    # Location
    print("\n3️⃣  Where do you want to work?")
    print("   Examples: Remote, San Francisco CA, New York NY")
    location = input("   Location: ").strip()
    if location:
        if location.lower() in ['remote', 'anywhere', 'work from home']:
            config["locations"] = [{"city": "Remote", "state": "US"}]
            print("   ✅ Set to remote work")
        else:
            parts = location.replace(',', ' ').split()
            if len(parts) >= 2:
                city = ' '.join(parts[:-1])
                state = parts[-1]
                config["locations"] = [{"city": city, "state": state}]
                print(f"   ✅ Set location: {city}, {state}")

    # Salary
    print("\n4️⃣  What's your minimum salary requirement?")
    print("   Examples: 60000, 80000, 120000")
    salary = input("   Minimum salary (numbers only): ").strip()
    if salary and salary.isdigit():
        config["minimum_salary"] = int(salary)
        print(f"   ✅ Set minimum salary: ${config['minimum_salary']:,}")

    # Experience level
    print("\n5️⃣  What's your experience level?")
    print("   Options: entry, junior, mid, senior, lead, executive")
    exp_level = input("   Experience level: ").strip().lower()
    if exp_level in ['entry', 'junior', 'mid', 'senior', 'lead', 'executive']:
        config["experience_level"] = exp_level
        print(f"   ✅ Set experience level: {exp_level}")

    # Save configuration
    try:
        with open(user_config_path, 'w') as f:
            json.dump(config, f, indent=2)
        colored_print("✅ Configuration saved successfully", Colors.GREEN)
        print(f"   Saved to: {user_config_path}")
        return True
    except Exception as e:
        colored_print(f"❌ Could not save configuration: {e}", Colors.RED)
        return False

def run_initial_test() -> bool:
    """Run comprehensive system test."""
    colored_print("Running system test...", Colors.YELLOW)

    try:
        # Test basic imports
        print("   • Testing core modules...")
        result = subprocess.run(  # noqa: S603 - testing python imports
            [
                sys.executable, "-c",
                "import src; import src.agent; print('Core modules: OK')"
            ], capture_output=True, text=True, timeout=30
        )

        if result.returncode != 0:
            colored_print("❌ Core module test failed", Colors.RED)
            print(f"   Error: {result.stderr}")
            return False

        print("   • Testing optional modules...")
        # Test optional dependencies
        optional_tests = [
            ("PDF parsing", "import pdfplumber; print('PDF: OK')"),
            ("DOCX parsing", "import docx; print('DOCX: OK')"),
            ("Web scraping", "import playwright; print('Playwright: OK')"),
        ]

        for test_name, test_code in optional_tests:
            try:
                result = subprocess.run(  # noqa: S603 - testing optional imports
                    [sys.executable, "-c", test_code],
                    capture_output=True, text=True, timeout=10
                )
                if result.returncode == 0:
                    print(f"     ✅ {test_name}")
                else:
                    print(f"     ⚠️  {test_name} (optional)")
            except Exception:  # nosec B110 - intentionally broad for optional test fallback
                print(f"     ⚠️  {test_name} (optional)")

        colored_print("✅ System test passed", Colors.GREEN)
        return True

    except Exception as e:
        colored_print(f"❌ System test failed: {e}", Colors.RED)
        return False

def setup_resume_scanner() -> bool:
    """Set up resume scanning capabilities."""
    colored_print("Setting up resume scanner...", Colors.YELLOW)

    # Check if resume scanner script exists
    scanner_path = Path("scripts/resume_ats_scanner.py")
    if not scanner_path.exists():
        colored_print("⚠️  Resume scanner not found, skipping setup", Colors.YELLOW)
        return True

    print("   The resume ATS scanner is ready!")
    print("   Usage examples:")
    print(f"   • python {scanner_path} your_resume.pdf")
    print(f"   • python {scanner_path} resume.pdf --output report.html")

    # Test if we can create a sample report
    try:
        result = subprocess.run(  # noqa: S603 - testing resume scanner
            [sys.executable, str(scanner_path), "--help"],
            capture_output=True, text=True, timeout=10
        )

        if result.returncode == 0:
            colored_print("✅ Resume scanner is ready", Colors.GREEN)
        else:
            colored_print("⚠️  Resume scanner setup needs attention", Colors.YELLOW)

    except Exception as e:
        colored_print("⚠️  Could not test resume scanner", Colors.YELLOW)

    return True

def create_shortcuts() -> bool:
    """Create helpful shortcuts and quick access."""
    colored_print("Creating shortcuts...", Colors.YELLOW)

    try:
        # Create a launch script
        launch_script_content = """#!/usr/bin/env python3
# Quick launcher for Job Search Automation
import sys
import subprocess
from pathlib import Path

# Change to project directory
project_dir = Path(__file__).parent
os.chdir(project_dir)

# Launch main application
subprocess.run([sys.executable, "-m", "src.agent"])
"""

        launch_script = Path("launch.py")
        with open(launch_script, 'w') as f:
            f.write(launch_script_content)

        # Make it executable on Unix systems
        if platform.system() != "Windows":
            os.chmod(launch_script, 0o755)  # noqa: S103 - executable script needs exec permissions

        colored_print("✅ Quick launcher created", Colors.GREEN)
        print(f"   {launch_script.absolute()}")

        return True

    except Exception as e:
        colored_print(f"⚠️  Could not create shortcuts: {e}", Colors.YELLOW)
        return True  # Non-critical

def show_next_steps() -> None:
    """Show comprehensive next steps guide."""
    colored_print("\nSETUP COMPLETE!", Colors.GREEN)
    print("=" * 80)

    print("\nWHAT TO DO NEXT:")
    print()

    print("1️⃣  TEST THE SYSTEM:")
    colored_print("   python -m src.agent --help", Colors.BOLD)
    print("   This shows available commands and options")

    print("\n2️⃣  RUN YOUR FIRST JOB SEARCH:")
    colored_print("   python -m src.agent", Colors.BOLD)
    print("   This starts the interactive job search")

    print("\n3️⃣  SCAN YOUR RESUME (RECOMMENDED):")
    colored_print("   python scripts/resume_ats_scanner.py your_resume.pdf", Colors.BOLD)
    print("   This analyzes your resume for ATS compatibility")

    print("\n4️⃣  CUSTOMIZE YOUR SETTINGS:")
    print("   Edit: config/user_prefs.json")
    print("   Add more job titles, keywords, or change preferences")

    print("\n5️⃣  SET UP NOTIFICATIONS (OPTIONAL):")
    print("   • Slack: python scripts/setup/slack/slack_setup.py")
    print("   • Email: Follow EMAIL_SETUP.md guide")

    print("\nHELPFUL RESOURCES:")
    print("   • User Guide: docs/USER_GUIDE.md")
    print("   • Troubleshooting: docs/USER_GUIDE.md#troubleshooting")
    print("   • Resume Tips: docs/RESUME_RESOURCES.md")
    print("   • Job Search Best Practices: docs/GETTING_STARTED.md")

    print("\n🆘 NEED HELP?")
    print("   • Check logs in: logs/application.log")
    print("   • GitHub Issues: https://github.com/cboyd0319/JobSentinel/issues")
    print("   • Documentation: docs/README.md")

    print("\n" + "=" * 80)
    colored_print("Ready to find your next job!", Colors.GREEN)

def main() -> int:
    """Main startup process with comprehensive error handling."""
    try:
        print_banner()

        # Define startup steps
        steps = [
            ("Platform Compatibility", check_platform_compatibility),
            ("Python Version", check_python_version),
            ("Project Files", check_required_files),
            ("Dependencies", check_and_install_dependencies),
            ("Configuration", setup_configuration),
            ("System Test", run_initial_test),
            ("Resume Scanner", setup_resume_scanner),
            ("Shortcuts", create_shortcuts),
        ]

        failed_steps = []

        for step_name, step_function in steps:
            print(f"\n▶️  {step_name}...")
            try:
                if not step_function():
                    failed_steps.append(step_name)
                    colored_print(f"❌ {step_name} failed", Colors.RED)
                else:
                    colored_print(f"✅ {step_name} completed", Colors.GREEN)
            except Exception as e:
                failed_steps.append(step_name)
                colored_print(f"❌ {step_name} failed: {e}", Colors.RED)

        # Show results
        if not failed_steps:
            show_next_steps()
            return 0
        else:
            colored_print(f"\n⚠️  Setup completed with {len(failed_steps)} issues:", Colors.YELLOW)
            for step in failed_steps:
                print(f"   • {step}")

            print("\nRECOMMENDED ACTIONS:")
            print("   1. Review the error messages above")
            print("   2. Fix the issues and re-run this script")
            print("   3. Try manual installation if problems persist")
            print("   4. Seek help in GitHub issues if needed")

            # Show what works
            working_steps = len(steps) - len(failed_steps)
            if working_steps > 0:
                print(f"\n✅ {working_steps}/{len(steps)} components are working")
                print("   You may be able to use some features despite the issues")

            return 1

    except KeyboardInterrupt:
        colored_print("\n\n❌ Setup cancelled by user", Colors.RED)
        return 1
    except Exception as e:
        colored_print(f"\n❌ Unexpected error: {e}", Colors.RED)
        print("\nTROUBLESHOOTING:")
        print("   1. Ensure you're in the correct project directory")
        print("   2. Check that Python is properly installed")
        print("   3. Try running with administrator privileges")
        print("   4. Review the complete error message above")
        return 1

if __name__ == "__main__":
    try:
        exit_code = main()
        input("\nPress Enter to exit...")
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n\nGoodbye!")
        sys.exit(1)
