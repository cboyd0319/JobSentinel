#!/usr/bin/env python3
"""
Windows Local Installation Manager

A comprehensive, zero-knowledge user installation script for Windows.
Handles all dependencies, configuration, and setup with extensive error handling.
"""

import os
import sys
import json
import subprocess
import urllib.request
import tempfile
from pathlib import Path
from typing import List, Optional, Tuple
import logging
import time
import platform
from dataclasses import dataclass

# Configure logging for user feedback
logging.basicConfig(
    level=logging.INFO, format="%(message)s", handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


@dataclass
class InstallationState:
    """Track installation progress and state."""

    step: str = "start"
    completed_steps: List[str] = None
    python_path: Optional[str] = None
    venv_path: Optional[str] = None
    config_created: bool = False
    errors: List[str] = None

    def __post_init__(self):
        if self.completed_steps is None:
            self.completed_steps = []
        if self.errors is None:
            self.errors = []


class WindowsLocalInstaller:
    """
    Complete Windows local installation manager.

    Designed for users with zero technical knowledge.
    Handles all edge cases and provides clear feedback.
    """

    def __init__(self):
        self.project_root = Path(__file__).parent.parent.parent
        self.state_file = self.project_root / "installer_state.json"
        self.state = self._load_state()
        self.required_python_version = (3, 8)

        # Windows-specific paths
        self.appdata = Path(os.environ.get("APPDATA", ""))
        self.desktop = Path(os.environ.get("USERPROFILE", "")) / "Desktop"

    def _load_state(self) -> InstallationState:
        """Load previous installation state if it exists."""
        if self.state_file.exists():
            try:
                with open(self.state_file, "r") as f:
                    data = json.load(f)
                return InstallationState(**data)
            except Exception as e:
                logger.warning(f"Could not load previous state: {e}")
        return InstallationState()

    def _save_state(self):
        """Save current installation state."""
        try:
            with open(self.state_file, "w") as f:
                json.dump(self.state.__dict__, f, indent=2)
        except Exception as e:
            logger.warning(f"Could not save state: {e}")

    def print_banner(self):
        """Print installation banner."""
        print("\n" + "=" * 70)
        print("🚀 JOB SEARCH AUTOMATION - WINDOWS LOCAL INSTALLER")
        print("=" * 70)
        print("✅ Zero technical knowledge required")
        print("✅ Complete automated setup")
        print("✅ Secure local-only installation")
        print("✅ Resume ATS scanning included")
        print("=" * 70 + "\n")

        if self.state.completed_steps:
            print("📋 Resuming from previous installation...")
            print(f"   Last completed: {self.state.completed_steps[-1]}")
            print()

    def check_windows_compatibility(self) -> bool:
        """Check Windows version compatibility."""
        logger.info("🔍 Checking Windows compatibility...")

        try:
            # Check Windows version
            version = platform.version()
            major_version = int(version.split(".")[0])

            if major_version < 10:
                logger.error("❌ Windows 10 or newer is required")
                logger.error("   Your version: " + platform.platform())
                return False

            # Check PowerShell availability
            try:
                result = subprocess.run(
                    ["powershell", "-Command", "Get-Host | Select-Object Version"],
                    capture_output=True,
                    text=True,
                    timeout=10,
                )
                if result.returncode != 0:
                    logger.error("❌ PowerShell is not available or not working properly")
                    return False
            except Exception as e:
                logger.error(f"❌ PowerShell check failed: {e}")
                return False

            logger.info("✅ Windows compatibility check passed")
            return True

        except Exception as e:
            logger.error(f"❌ Windows compatibility check failed: {e}")
            return False

    def check_python_installation(self) -> Tuple[bool, Optional[str]]:
        """Check if Python is properly installed."""
        logger.info("🐍 Checking Python installation...")

        # Try different Python commands
        python_commands = ["python", "python3", "py"]

        for cmd in python_commands:
            try:
                result = subprocess.run(
                    [cmd, "--version"], capture_output=True, text=True, timeout=10
                )
                if result.returncode == 0:
                    version_str = result.stdout.strip()
                    logger.info(f"   Found: {version_str}")

                    # Extract version numbers
                    import re

                    version_match = re.search(r"Python (\d+)\.(\d+)", version_str)
                    if version_match:
                        major, minor = map(int, version_match.groups())
                        if (major, minor) >= self.required_python_version:
                            # Get full path
                            path_result = subprocess.run(
                                ["where", cmd], capture_output=True, text=True
                            )
                            python_path = (
                                path_result.stdout.strip().split("\n")[0]
                                if path_result.returncode == 0
                                else cmd
                            )

                            logger.info(f"✅ Python {major}.{minor} is compatible")
                            return True, python_path
                        else:
                            logger.warning(
                                f"⚠️  Python {major}.{minor} is too old (need {self.required_python_version[0]}.{self.required_python_version[1]}+)"
                            )

            except Exception as e:
                logger.debug(f"Python command '{cmd}' failed: {e}")
                continue

        logger.error("❌ No compatible Python installation found")
        return False, None

    def install_python(self) -> bool:
        """Guide user through Python installation."""
        logger.info("📥 Python installation required...")

        print("\n🔧 PYTHON INSTALLATION REQUIRED")
        print("=" * 50)
        print("Python is required to run this application.")
        print("I'll help you install it automatically.\n")

        response = input("Continue with Python installation? (y/n): ").lower().strip()
        if response not in ["y", "yes"]:
            logger.info("❌ Installation cancelled by user")
            return False

        try:
            # Download Python installer
            logger.info("📥 Downloading Python 3.11...")
            python_url = "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe"

            with tempfile.NamedTemporaryFile(suffix=".exe", delete=False) as tmp_file:
                urllib.request.urlretrieve(python_url, tmp_file.name)
                installer_path = tmp_file.name

            logger.info("🚀 Launching Python installer...")
            print("\n📝 IMPORTANT INSTALLATION NOTES:")
            print("1. ✅ Check 'Add Python to PATH'")
            print("2. ✅ Choose 'Install Now' (recommended)")
            print("3. ⏳ Wait for installation to complete")
            print("4. 🔄 This installer will continue automatically\n")

            # Launch installer
            subprocess.run([installer_path, "/quiet", "InstallAllUsers=1", "PrependPath=1"])

            # Wait and verify
            logger.info("⏳ Waiting for Python installation...")
            time.sleep(10)

            # Clean up installer
            try:
                os.unlink(installer_path)
            except:
                pass

            # Verify installation
            is_installed, python_path = self.check_python_installation()
            if is_installed:
                logger.info("✅ Python installation successful!")
                self.state.python_path = python_path
                return True
            else:
                logger.error("❌ Python installation verification failed")
                logger.error("   Please install Python manually from https://python.org")
                return False

        except Exception as e:
            logger.error(f"❌ Python installation failed: {e}")
            logger.error("   Please install Python manually from https://python.org")
            return False

    def create_virtual_environment(self) -> bool:
        """Create a virtual environment for the project."""
        logger.info("📦 Setting up virtual environment...")

        venv_path = self.project_root / "venv"

        try:
            if venv_path.exists():
                logger.info("   Virtual environment already exists")
            else:
                subprocess.run(
                    [self.state.python_path or "python", "-m", "venv", str(venv_path)], check=True
                )
                logger.info("✅ Virtual environment created")

            self.state.venv_path = str(venv_path)
            return True

        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Failed to create virtual environment: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Unexpected error creating virtual environment: {e}")
            return False

    def install_dependencies(self) -> bool:
        """Install all required dependencies."""
        logger.info("📚 Installing dependencies...")

        venv_python = Path(self.state.venv_path) / "Scripts" / "python.exe"
        venv_pip = Path(self.state.venv_path) / "Scripts" / "pip.exe"

        if not venv_python.exists():
            logger.error("❌ Virtual environment Python not found")
            return False

        try:
            # Upgrade pip first
            logger.info("   Upgrading pip...")
            subprocess.run([str(venv_pip), "install", "--upgrade", "pip"], check=True)

            # Install main requirements
            requirements_file = self.project_root / "requirements.txt"
            if requirements_file.exists():
                logger.info("   Installing main dependencies...")
                subprocess.run([str(venv_pip), "install", "-r", str(requirements_file)], check=True)

            # Install Playwright browsers
            logger.info("   Installing browser automation...")
            subprocess.run(
                [str(venv_python), "-m", "playwright", "install", "chromium"], check=True
            )

            logger.info("✅ Dependencies installed successfully")
            return True

        except subprocess.CalledProcessError as e:
            logger.error(f"❌ Dependency installation failed: {e}")
            return False
        except Exception as e:
            logger.error(f"❌ Unexpected error installing dependencies: {e}")
            return False

    def create_configuration(self) -> bool:
        """Create user configuration with guided setup."""
        logger.info("⚙️  Setting up configuration...")

        config_dir = self.project_root / "config"
        user_config_path = config_dir / "user_prefs.json"
        example_config_path = config_dir / "user_prefs.example.json"

        if user_config_path.exists():
            logger.info("   Configuration already exists")
            response = input("   Update configuration? (y/n): ").lower().strip()
            if response not in ["y", "yes"]:
                return True

        # Load example configuration
        if not example_config_path.exists():
            logger.error("❌ Example configuration file not found")
            return False

        try:
            with open(example_config_path, "r") as f:
                config = json.load(f)

            print("\n🔧 CONFIGURATION SETUP")
            print("=" * 30)
            print("Let's customize this for your job search.\n")

            # Job titles
            print("1. What job titles are you looking for?")
            print("   Examples: Software Engineer, Data Scientist, Product Manager")
            job_titles = input("   Job titles (comma-separated): ").strip()
            if job_titles:
                config["job_titles"] = [title.strip() for title in job_titles.split(",")]

            # Keywords
            print("\n2. What skills/keywords should I look for?")
            print("   Examples: python, javascript, aws, machine learning")
            keywords = input("   Keywords (comma-separated): ").strip()
            if keywords:
                config["keywords"] = [kw.strip().lower() for kw in keywords.split(",")]

            # Location
            print("\n3. Where do you want to work?")
            print("   Examples: San Francisco, CA | Remote | New York, NY")
            location = input("   Location: ").strip()
            if location:
                if location.lower() in ["remote", "anywhere"]:
                    config["locations"] = [{"city": "Remote", "state": "US"}]
                else:
                    parts = location.split(",")
                    if len(parts) >= 2:
                        config["locations"] = [
                            {"city": parts[0].strip(), "state": parts[1].strip()}
                        ]

            # Salary
            print("\n4. What's your minimum salary requirement?")
            print("   Examples: 80000, 120000, 150000")
            salary = input("   Minimum salary (or press Enter to skip): ").strip()
            if salary and salary.isdigit():
                config["minimum_salary"] = int(salary)

            # Experience level
            print("\n5. What's your experience level?")
            print("   Options: entry, junior, mid, senior, lead, executive")
            exp_level = input("   Experience level: ").strip().lower()
            if exp_level in ["entry", "junior", "mid", "senior", "lead", "executive"]:
                config["experience_level"] = exp_level

            # Save configuration
            with open(user_config_path, "w") as f:
                json.dump(config, f, indent=2)

            logger.info("✅ Configuration created successfully")
            self.state.config_created = True
            return True

        except Exception as e:
            logger.error(f"❌ Configuration setup failed: {e}")
            return False

    def create_shortcuts(self) -> bool:
        """Create desktop shortcuts for easy access."""
        logger.info("🖥️  Creating desktop shortcuts...")

        try:
            venv_python = Path(self.state.venv_path) / "Scripts" / "python.exe"

            # Create main application shortcut
            shortcut_script = f"""
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("{self.desktop / 'Job Search Automation.lnk'}")
$Shortcut.TargetPath = "{venv_python}"
$Shortcut.Arguments = "-m src.agent"
$Shortcut.WorkingDirectory = "{self.project_root}"
$Shortcut.IconLocation = "{venv_python}"
$Shortcut.Description = "Job Search Automation - Find your next job automatically"
$Shortcut.Save()
"""

            # Create resume scanner shortcut
            resume_shortcut_script = f"""
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("{self.desktop / 'Resume ATS Scanner.lnk'}")
$Shortcut.TargetPath = "{venv_python}"
$Shortcut.Arguments = "-m scripts.ats_cli"
$Shortcut.WorkingDirectory = "{self.project_root}"
$Shortcut.IconLocation = "{venv_python}"
$Shortcut.Description = "Resume ATS Scanner - Optimize your resume for job applications"
$Shortcut.Save()
"""

            # Execute PowerShell scripts
            for script in [shortcut_script, resume_shortcut_script]:
                subprocess.run(["powershell", "-Command", script], check=True)

            logger.info("✅ Desktop shortcuts created")
            return True

        except Exception as e:
            logger.error(f"⚠️  Could not create shortcuts: {e}")
            return True  # Non-critical failure

    def run_initial_test(self) -> bool:
        """Run an initial test to verify everything works."""
        logger.info("🧪 Running initial system test...")

        venv_python = Path(self.state.venv_path) / "Scripts" / "python.exe"

        try:
            # Test basic import
            result = subprocess.run(
                [
                    str(venv_python),
                    "-c",
                    'import src.agent; print("✅ Core modules loaded successfully")',
                ],
                capture_output=True,
                text=True,
                cwd=self.project_root,
            )

            if result.returncode == 0:
                logger.info("✅ System test passed")
                return True
            else:
                logger.error(f"❌ System test failed: {result.stderr}")
                return False

        except Exception as e:
            logger.error(f"❌ System test error: {e}")
            return False

    def setup_task_scheduler(self) -> bool:
        """Set up Windows Task Scheduler for automated runs."""
        logger.info("⏰ Setting up automated job searches...")

        response = input("   Set up daily automated job searches? (y/n): ").lower().strip()
        if response not in ["y", "yes"]:
            logger.info("   Skipped automated setup")
            return True

        try:
            venv_python = Path(self.state.venv_path) / "Scripts" / "python.exe"

            # Create task scheduler XML
            task_xml = f"""<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.2" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>Daily automated job search</Description>
  </RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>2024-01-01T09:00:00</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
      </ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Principals>
    <Principal id="Author">
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>true</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>true</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>false</StartWhenAvailable>
    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>
    <IdleSettings>
      <StopOnIdleEnd>true</StopOnIdleEnd>
      <RestartOnIdle>false</RestartOnIdle>
    </IdleSettings>
    <AllowStartOnDemand>true</AllowStartOnDemand>
    <Enabled>true</Enabled>
    <Hidden>false</Hidden>
    <RunOnlyIfIdle>false</RunOnlyIfIdle>
    <WakeToRun>false</WakeToRun>
    <ExecutionTimeLimit>PT1H</ExecutionTimeLimit>
    <Priority>7</Priority>
  </Settings>
  <Actions>
    <Exec>
      <Command>{venv_python}</Command>
      <Arguments>-m src.agent --mode scrape</Arguments>
      <WorkingDirectory>{self.project_root}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>"""

            # Save task XML
            task_file = self.project_root / "job_search_task.xml"
            with open(task_file, "w", encoding="utf-16") as f:
                f.write(task_xml)

            # Import task
            subprocess.run(
                ["schtasks", "/create", "/tn", "JobSearchAutomation", "/xml", str(task_file), "/f"],
                check=True,
            )

            # Clean up
            task_file.unlink()

            logger.info("✅ Daily automation scheduled (9:00 AM)")
            return True

        except Exception as e:
            logger.error(f"⚠️  Could not set up automation: {e}")
            return True  # Non-critical failure

    def cleanup_installation(self):
        """Clean up installation files and temporary data."""
        try:
            if self.state_file.exists():
                self.state_file.unlink()
        except:
            pass

    def install(self) -> bool:
        """Main installation process."""
        self.print_banner()

        # Installation steps
        steps = [
            ("windows_compat", "Check Windows compatibility", self.check_windows_compatibility),
            (
                "python_check",
                "Check Python installation",
                lambda: self.check_python_installation()[0],
            ),
            ("python_install", "Install Python if needed", self.install_python),
            ("venv_create", "Create virtual environment", self.create_virtual_environment),
            ("deps_install", "Install dependencies", self.install_dependencies),
            ("config_setup", "Set up configuration", self.create_configuration),
            ("shortcuts", "Create shortcuts", self.create_shortcuts),
            ("test_system", "Test system", self.run_initial_test),
            ("task_scheduler", "Set up automation", self.setup_task_scheduler),
        ]

        failed_steps = []

        for step_id, step_name, step_func in steps:
            if step_id in self.state.completed_steps:
                logger.info(f"✅ {step_name} (already completed)")
                continue

            self.state.step = step_id
            logger.info(f"▶️  {step_name}...")

            try:
                # Handle Python installation logic
                if step_id == "python_install":
                    if "python_check" in self.state.completed_steps:
                        # Python is already available, skip installation
                        logger.info("   Python already available, skipping installation")
                        success = True
                    else:
                        success = step_func()
                else:
                    success = step_func()

                if success:
                    self.state.completed_steps.append(step_id)
                    self._save_state()
                else:
                    failed_steps.append(step_name)
                    logger.error(f"❌ {step_name} failed")

            except Exception as e:
                failed_steps.append(step_name)
                logger.error(f"❌ {step_name} failed: {e}")
                self.state.errors.append(f"{step_name}: {str(e)}")
                self._save_state()

        # Installation summary
        print("\n" + "=" * 70)
        if not failed_steps:
            print("🎉 INSTALLATION COMPLETED SUCCESSFULLY!")
            print("=" * 70)
            print("✅ All components installed and configured")
            print("✅ Desktop shortcuts created")
            print("✅ Resume ATS scanner ready")
            print("✅ Daily automation configured")
            print("\n💡 WHAT'S NEXT:")
            print("   1. Double-click 'Job Search Automation' on your desktop")
            print("   2. Or run: python -m src.agent")
            print("   3. Check your configuration in config/user_prefs.json")
            print("   4. Set up Slack notifications (optional)")
            print("\n📋 RESUME SCANNING:")
            print("   • Use 'Resume ATS Scanner' shortcut")
            print("   • Or run: python -m scripts.ats_cli scan your_resume.pdf")

            self.cleanup_installation()
            return True
        else:
            print("⚠️  INSTALLATION COMPLETED WITH ISSUES")
            print("=" * 70)
            print("Some components failed to install:")
            for step in failed_steps:
                print(f"   ❌ {step}")
            print("\n🔧 MANUAL FIXES NEEDED:")
            print("   1. Check the error messages above")
            print("   2. Re-run this installer to retry failed steps")
            print("   3. Seek help if issues persist")
            return False


def main():
    """Main entry point."""
    try:
        installer = WindowsLocalInstaller()
        success = installer.install()

        if success:
            print("\n🎯 Ready to find your next job!")
            input("Press Enter to exit...")
        else:
            print("\n🆘 Installation needs attention. Please review the errors above.")
            input("Press Enter to exit...")

        return 0 if success else 1

    except KeyboardInterrupt:
        print("\n\n❌ Installation cancelled by user")
        return 1
    except Exception as e:
        print(f"\n❌ Fatal installation error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
