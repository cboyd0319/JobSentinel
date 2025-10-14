#!/usr/bin/env python3
"""
JobSentinel Universal Installer - Hardened Version
Cross-platform installation for Windows 11, macOS 15+, Ubuntu 22.04+

Security Features:
- SSL verification with certificate checking
- SHA256 checksum validation for downloads
- XML injection prevention
- Subprocess security (no shell=True)
- Input validation

Reliability Features:
- Automatic rollback on failure
- Concurrent installation protection
- Disk space checking
- Network retry logic with exponential backoff
- Comprehensive error handling

UX Features:
- Progress indicators
- Dry-run mode
- Verbose logging to file
- Proxy support
- CLI arguments

Author: JobSentinel Team
License: MIT
"""

import argparse
import hashlib
import json
import logging
import os
import platform
import re
import shutil
import socket
import ssl
import subprocess
import sys
import tempfile
import time
import traceback
import urllib.error
import urllib.request
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

# ============================================================================
# Constants
# ============================================================================

REQUIRED_PYTHON = (3, 12)
PYTHON_VERSION = "3.12.7"
PYTHON_WINDOWS_URL = (
    f"https://www.python.org/ftp/python/{PYTHON_VERSION}/python-{PYTHON_VERSION}-amd64.exe"
)

# Python installer SHA256 checksums
# NOTE: Set to None to skip verification (installer will warn user to verify manually)
# Get checksums from: https://www.python.org/downloads/release/python-3127/
# SECURITY: In production, always set real checksums!
PYTHON_CHECKSUMS = {"3.12.7-amd64": None}  # TODO: Add actual checksum for security

# Timeouts (configurable via environment)
DEFAULT_TIMEOUT = int(os.environ.get("INSTALL_TIMEOUT_CMD", "10"))
DOWNLOAD_TIMEOUT = int(os.environ.get("INSTALL_TIMEOUT_DOWNLOAD", "300"))
PYTHON_PATH_WAIT = int(os.environ.get("INSTALL_TIMEOUT_PATH", "30"))
VERIFICATION_TIMEOUT = int(os.environ.get("INSTALL_TIMEOUT_VERIFY", "60"))

# Platform requirements
WINDOWS_MIN_BUILD = 22000
MACOS_MIN_DARWIN = 24
UBUNTU_MIN_VERSION = (22, 4)
MIN_DISK_SPACE_MB = 500
MAX_DOWNLOAD_RETRIES = 3

# Configure logging (will be reconfigured later with file output)
logger = logging.getLogger(__name__)


# ============================================================================
# Helper Functions
# ============================================================================


def setup_logging(log_dir: Path | None = None, verbose: bool = False) -> None:
    """Configure logging to both console and file."""
    level = logging.DEBUG if verbose else logging.INFO

    handlers: list[logging.Handler] = [logging.StreamHandler(sys.stdout)]

    if log_dir:
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / f"install_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        handlers.append(logging.FileHandler(log_file))
        print(f"📝 Logging to: {log_file}")

    logging.basicConfig(
        level=level,
        format=(
            "%(asctime)s - %(levelname)s - %(message)s" if log_dir else "%(levelname)s: %(message)s"
        ),
        handlers=handlers,
        force=True,
    )


def confirm(prompt: str, default: bool = False) -> bool:
    """Get yes/no confirmation from user with validation."""
    suffix = " [Y/n]: " if default else " [y/N]: "
    while True:
        try:
            response = input(prompt + suffix).strip().lower()
            if not response:
                return default
            if response in ("y", "yes"):
                return True
            if response in ("n", "no"):
                return False
            print("Please enter 'yes' or 'no'")
        except (EOFError, KeyboardInterrupt):
            print()
            return False


def check_network(host: str = "8.8.8.8", port: int = 53, timeout: int = 3) -> bool:
    """Check if network is available."""
    try:
        socket.create_connection((host, port), timeout=timeout)
        return True
    except OSError:
        return False


def is_admin_windows() -> bool:
    """Check if running with administrator privileges on Windows."""
    if sys.platform != "win32":
        return False
    
    try:
        import ctypes
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except Exception:
        return False


def check_windows_requirements() -> list[str]:
    """Check Windows-specific requirements and return list of warnings."""
    warnings = []
    
    if sys.platform != "win32":
        return warnings
    
    # Check admin rights (helpful but not always required)
    if not is_admin_windows():
        warnings.append(
            "Not running as Administrator. Some operations may require elevation."
        )
    
    # Check execution policy (PowerShell)
    try:
        result = subprocess.run(
            ["powershell", "-Command", "Get-ExecutionPolicy"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0 and "Restricted" in result.stdout:
            warnings.append(
                "PowerShell execution policy is Restricted. "
                "May need to run: Set-ExecutionPolicy RemoteSigned"
            )
    except Exception:
        pass
    
    # Check for long path support (informational note)
    # Long paths (>259 chars) require registry key on Windows
    warnings.append(
        "Note: If you experience path-related errors, enable long paths:\n"
        "  New-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\FileSystem' "
        "-Name 'LongPathsEnabled' -Value 1 -PropertyType DWORD -Force"
    )
    
    return warnings


def escape_xml(text: str) -> str:
    """Escape XML special characters to prevent injection."""
    return (
        str(text)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def check_disk_space(path: Path, required_mb: int = MIN_DISK_SPACE_MB) -> bool:
    """Check if sufficient disk space is available."""
    try:
        if sys.platform == "win32":
            try:
                import ctypes

                free_bytes = ctypes.c_ulonglong(0)
                result = ctypes.windll.kernel32.GetDiskFreeSpaceExW(
                    str(path), None, None, ctypes.pointer(free_bytes)
                )
                
                if result == 0:
                    # GetDiskFreeSpaceExW failed
                    logger.warning("Could not query disk space via Windows API")
                    return True  # Proceed anyway
                
                available_mb = free_bytes.value / (1024 * 1024)
            except (OSError, AttributeError) as e:
                logger.warning(f"Windows disk space check failed: {e}")
                return True  # Proceed anyway
        else:
            stat = os.statvfs(path)
            available_mb = (stat.f_bavail * stat.f_frsize) / (1024 * 1024)

        if available_mb < required_mb:
            logger.error(
                f"Insufficient disk space: {available_mb:.0f}MB available, {required_mb}MB required"
            )
            return False

        logger.info(f"✅ Sufficient disk space: {available_mb:.0f}MB available")
        return True
    except Exception as e:
        logger.warning(f"Could not check disk space: {e}")
        return True  # Proceed anyway


def setup_proxy() -> None:
    """Configure proxy from environment variables."""
    proxy_vars = ["http_proxy", "https_proxy", "HTTP_PROXY", "HTTPS_PROXY"]
    proxies = {}

    for var in proxy_vars:
        value = os.environ.get(var)
        if value:
            protocol = "https" if "https" in var.lower() else "http"
            proxies[protocol] = value

    if proxies:
        proxy_handler = urllib.request.ProxyHandler(proxies)
        opener = urllib.request.build_opener(proxy_handler)
        urllib.request.install_opener(opener)
        logger.info(f"🌐 Using proxy: {list(proxies.values())[0]}")


def download_with_verification(
    url: str,
    dest: Path,
    expected_hash: str | None = None,
    retries: int = MAX_DOWNLOAD_RETRIES,
) -> bool:
    """Download file with SSL, retry logic, and optional checksum verification."""
    parsed_url = urlparse(url)

    # Security: Only allow HTTPS for python.org
    if "python.org" in parsed_url.netloc and parsed_url.scheme != "https":
        raise ValueError("Refusing to download Python installer over insecure connection")

    for attempt in range(retries):
        try:
            # Check network
            if not check_network():
                logger.warning(f"Network unavailable, attempt {attempt + 1}/{retries}")
                if attempt < retries - 1:
                    time.sleep(2**attempt)  # Exponential backoff
                    continue
                else:
                    raise ConnectionError("Network unavailable after multiple attempts")

            logger.info(f"⬇️  Downloading {Path(url).name}... (attempt {attempt + 1}/{retries})")

            # Create SSL context with verification
            context = ssl.create_default_context()
            context.check_hostname = True
            context.verify_mode = ssl.CERT_REQUIRED

            # Download with timeout
            req = urllib.request.Request(
                url, headers={"User-Agent": "JobSentinel-Installer/1.0"}
            )  # noqa: S310

            with urllib.request.urlopen(
                req, timeout=DOWNLOAD_TIMEOUT, context=context
            ) as response:  # noqa: S310
                data = response.read()

            # Verify checksum if provided
            if expected_hash:
                actual_hash = hashlib.sha256(data).hexdigest()
                if actual_hash.lower() != expected_hash.lower():
                    raise ValueError(
                        f"Checksum mismatch!\n"
                        f"Expected: {expected_hash}\n"
                        f"Got:      {actual_hash}"
                    )
                logger.info("✅ Checksum verified")
            elif "python.org" in parsed_url.netloc:
                actual_hash = hashlib.sha256(data).hexdigest()
                verify_url = (
                    f"https://www.python.org/downloads/release/"
                    f"python-{PYTHON_VERSION.replace('.', '')}/"
                )
                logger.warning(
                    f"⚠️  No checksum verification (hash: {actual_hash[:16]}...)\n"
                    f"   Verify manually: {verify_url}"
                )

            # Write to file
            dest.write_bytes(data)
            logger.info(f"✅ Downloaded {len(data) / (1024*1024):.1f}MB")
            return True

        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            logger.warning(f"Download attempt {attempt + 1} failed: {e}")
            if attempt < retries - 1:
                time.sleep(2**attempt)
            else:
                raise
        except KeyboardInterrupt:
            logger.info("\nDownload cancelled by user")
            raise

    return False


def wait_for_command(cmd: str, max_wait: int = PYTHON_PATH_WAIT) -> bool:
    """Wait for a command to become available in PATH."""
    start = time.time()
    while time.time() - start < max_wait:
        if shutil.which(cmd):
            logger.info(f"✅ {cmd} now available in PATH")
            return True
        time.sleep(1)

    logger.warning(f"⚠️  {cmd} not found in PATH after {max_wait}s")
    return False


@contextmanager
def install_lock(lock_file: Path):
    """Prevent concurrent installations with file lock."""
    lock_file.parent.mkdir(parents=True, exist_ok=True)
    fd = None

    try:
        fd = open(lock_file, "w")

        if sys.platform == "win32":
            import msvcrt

            try:
                msvcrt.locking(fd.fileno(), msvcrt.LK_NBLCK, 1)
            except OSError as e:
                raise RuntimeError(
                    "Another installation is already running.\n"
                    f"If no other installation is active, delete: {lock_file}"
                ) from e
        else:
            import fcntl

            try:
                fcntl.flock(fd.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except OSError as e:
                raise RuntimeError(
                    "Another installation is already running.\n"
                    f"If no other installation is active, delete: {lock_file}"
                ) from e

        yield

    finally:
        if fd:
            fd.close()
        if lock_file.exists():
            try:
                lock_file.unlink()
            except Exception as e:
                logger.debug(f"Failed to remove lock file: {e}")  # Best effort cleanup


# ============================================================================
# Dataclasses
# ============================================================================


@dataclass
class PlatformInfo:
    """Platform detection and capabilities."""

    os_name: Literal["windows", "macos", "linux"]
    os_version: str
    arch: str
    python_cmd: str = "python3"
    is_compatible: bool = False
    issues: list[str] = field(default_factory=list)


@dataclass
class InstallConfig:
    """Installation configuration."""

    project_root: Path
    venv_path: Path
    mode: Literal["local", "ai-enhanced", "cloud"] = "local"
    ai_provider: str | None = None
    cloud_provider: str | None = None
    skip_deps: bool = False
    dry_run: bool = False
    verbose: bool = False


@dataclass
class InstallationState:
    """Track installation state for rollback capability."""

    state_file: Path
    completed_steps: list[str] = field(default_factory=list)
    created_paths: list[Path] = field(default_factory=list)

    def mark_complete(self, step: str) -> None:
        """Mark a step as completed."""
        self.completed_steps.append(step)
        self._save()
        logger.debug(f"Step completed: {step}")

    def add_created_path(self, path: Path) -> None:
        """Track a path created during installation."""
        self.created_paths.append(path)
        self._save()

    def rollback(self, dry_run: bool = False) -> None:
        """Rollback installation changes."""
        if not self.created_paths and not self.completed_steps:
            logger.info("Nothing to rollback")
            return

        logger.warning("🔄 Rolling back installation changes...")

        for path in reversed(self.created_paths):
            if path.exists():
                try:
                    if dry_run:
                        logger.info(f"Would remove: {path}")
                    else:
                        if path.is_dir():
                            shutil.rmtree(path)
                        else:
                            path.unlink()
                        logger.info(f"Removed: {path}")
                except Exception as e:
                    logger.warning(f"Could not remove {path}: {e}")

        if not dry_run and self.state_file.exists():
            try:
                self.state_file.unlink()
            except Exception as e:
                logger.debug(f"Failed to remove state file: {e}")

        logger.info("✅ Rollback complete")

    def _save(self) -> None:
        """Save state to file."""
        try:
            self.state_file.parent.mkdir(parents=True, exist_ok=True)
            self.state_file.write_text(
                json.dumps(
                    {
                        "completed_steps": self.completed_steps,
                        "created_paths": [str(p) for p in self.created_paths],
                    },
                    indent=2,
                )
            )
        except Exception as e:
            logger.debug(f"Could not save state: {e}")

    @classmethod
    def load(cls, state_file: Path) -> "InstallationState":
        """Load state from file."""
        if state_file.exists():
            try:
                data = json.loads(state_file.read_text())
                return cls(
                    state_file=state_file,
                    completed_steps=data.get("completed_steps", []),
                    created_paths=[Path(p) for p in data.get("created_paths", [])],
                )
            except Exception as e:
                logger.debug(f"Could not load state: {e}")

        return cls(state_file=state_file)


# ============================================================================
# Main Installer Class
# ============================================================================


class UniversalInstaller:
    """Cross-platform Python installer for JobSentinel - Hardened Version."""

    def __init__(self, project_root: Path | None = None, config: InstallConfig | None = None):
        self.project_root = project_root or Path(__file__).parent.parent
        self.platform = self._detect_platform()

        if config:
            self.config = config
        else:
            self.config = InstallConfig(
                project_root=self.project_root, venv_path=self.project_root / ".venv"
            )

        self.state = InstallationState.load(self.project_root / ".install_state.json")

    def _detect_platform(self) -> PlatformInfo:
        """Detect platform and verify compatibility."""
        system = platform.system()
        version = platform.release()
        arch = platform.machine()

        if system == "Windows":
            os_name = "windows"
            # Windows 11 is version 10.0.22000+
            try:
                parts = version.split(".")
                major = int(parts[0])
                minor = int(parts[1]) if len(parts) > 1 else 0
                build = int(parts[2]) if len(parts) > 2 else 0

                is_win11 = major >= 10 and build >= WINDOWS_MIN_BUILD
                is_compatible = is_win11
                issues = [] if is_win11 else [f"Windows 11 (build {WINDOWS_MIN_BUILD}+) required"]
            except (ValueError, IndexError):
                is_compatible = False
                issues = ["Could not detect Windows version"]

        elif system == "Darwin":
            os_name = "macos"
            # macOS 15 = Darwin 24.x (Sequoia)
            try:
                darwin_major = int(version.split(".")[0])
                is_compatible = darwin_major >= MACOS_MIN_DARWIN
                issues = [] if is_compatible else ["macOS 15 (Sequoia) or later required"]
            except (ValueError, IndexError):
                is_compatible = False
                issues = ["Could not detect macOS version"]

        elif system == "Linux":
            os_name = "linux"
            # Check for Ubuntu 22.04+ via os-release
            try:
                with open("/etc/os-release") as f:
                    os_release = dict(
                        line.strip().split("=", 1)
                        for line in f
                        if "=" in line and not line.startswith("#")
                    )
                    distro = os_release.get("ID", "").strip('"')
                    version_id = os_release.get("VERSION_ID", "").strip('"')

                if distro == "ubuntu":
                    try:
                        # Handle both "22.04" and "22.4" formats
                        parts = version_id.split(".")
                        major = int(parts[0])
                        minor = int(parts[1]) if len(parts) > 1 else 0

                        # Ubuntu 22.04 or later
                        is_compatible = major > UBUNTU_MIN_VERSION[0] or (
                            major == UBUNTU_MIN_VERSION[0] and minor >= UBUNTU_MIN_VERSION[1]
                        )
                        required_ver = f"{UBUNTU_MIN_VERSION[0]}.{UBUNTU_MIN_VERSION[1]:02d}"
                        issues = (
                            []
                            if is_compatible
                            else [f"Ubuntu {required_ver}+ required (found {version_id})"]
                        )
                    except (ValueError, IndexError):
                        is_compatible = False
                        issues = [f"Could not parse Ubuntu version: {version_id}"]
                else:
                    # Other Linux distros - assume compatible if modern
                    is_compatible = True
                    issues = [f"Untested Linux distro ({distro}), proceeding with caution"]
            except (FileNotFoundError, PermissionError):
                is_compatible = True
                issues = ["Could not read /etc/os-release, assuming compatible Linux"]

        else:
            logger.error(f"Unsupported operating system: {system}")
            sys.exit(1)

        info = PlatformInfo(
            os_name=os_name,
            os_version=version,
            arch=arch,
            is_compatible=is_compatible,
            issues=issues,
        )

        # Set platform-specific Python command
        if os_name == "windows":
            info.python_cmd = "python"
        else:
            info.python_cmd = "python3"

        return info

    def print_banner(self) -> None:
        """Print installation banner."""
        print("\n" + "=" * 70)
        print("   JOBSENTINEL - UNIVERSAL INSTALLER (Hardened)")
        print("=" * 70)
        print(f"   Platform: {self.platform.os_name.title()} {self.platform.os_version}")
        print(f"   Architecture: {self.platform.arch}")
        print(f"   Python Requirement: {REQUIRED_PYTHON[0]}.{REQUIRED_PYTHON[1]}+")
        if self.config.dry_run:
            print("   Mode: DRY RUN (no changes will be made)")
        print("=" * 70 + "\n")

        if not self.platform.is_compatible:
            logger.error("Platform compatibility check failed:")
            for issue in self.platform.issues:
                logger.error(f"  - {issue}")
            logger.error("\nThis installer requires:")
            logger.error(f"  - Windows 11 (build {WINDOWS_MIN_BUILD}+)")
            logger.error("  - macOS 15+ (Sequoia)")
            logger.error(f"  - Ubuntu {UBUNTU_MIN_VERSION[0]}.{UBUNTU_MIN_VERSION[1]:02d}+")
            sys.exit(1)

        if self.platform.issues:
            for issue in self.platform.issues:
                logger.warning(issue)

    def check_python(self) -> tuple[bool, Path | None]:
        """Check if Python 3.13+ is installed."""
        logger.info("🔍 Checking Python installation...")

        # Try different Python commands
        python_commands = []
        if self.platform.os_name == "windows":
            python_commands = ["python", "py -3.13", "py"]
        else:
            python_commands = ["python3.13", "python3", "python"]

        for cmd in python_commands:
            try:
                result = subprocess.run(  # noqa: S603
                    [*cmd.split(), "--version"],
                    capture_output=True,
                    text=True,
                    timeout=DEFAULT_TIMEOUT,
                )
                if result.returncode == 0:
                    version_str = result.stdout.strip()
                    logger.info(f"   Found: {version_str}")

                    # Extract version
                    match = re.search(r"Python (\d+)\.(\d+)\.(\d+)", version_str)
                    if match:
                        major, minor, patch = map(int, match.groups())
                        if (major, minor) >= REQUIRED_PYTHON:
                            # Get full path
                            which_cmd = "where" if self.platform.os_name == "windows" else "which"
                            path_result = subprocess.run(  # noqa: S603
                                [which_cmd, cmd.split()[0]],
                                capture_output=True,
                                text=True,
                                timeout=DEFAULT_TIMEOUT,
                            )
                            python_path = (
                                Path(path_result.stdout.strip().split("\n")[0])
                                if path_result.returncode == 0
                                else Path(cmd)
                            )

                            logger.info(f"✅ Python {major}.{minor}.{patch} is compatible")
                            return True, python_path

            except (subprocess.TimeoutExpired, FileNotFoundError, OSError) as e:
                logger.debug(f"Python check failed for {cmd}: {e}")
                continue

        logger.error(f"❌ Python {REQUIRED_PYTHON[0]}.{REQUIRED_PYTHON[1]}+ not found")
        return False, None

    def install_python_windows(self) -> bool:
        """Install Python on Windows with security."""
        logger.info(f"Python {PYTHON_VERSION} installation required for Windows...")

        if self.config.dry_run:
            logger.info(f"[DRY RUN] Would download and install Python {PYTHON_VERSION}")
            return True

        if not confirm(f"Download and install Python {PYTHON_VERSION}?", default=False):
            logger.info("Installation cancelled by user")
            return False

        try:
            # Check disk space
            if not check_disk_space(Path(tempfile.gettempdir()), required_mb=50):
                return False

            logger.info(f"⬇️  Downloading Python {PYTHON_VERSION} installer...")

            # Download installer with verification
            with tempfile.NamedTemporaryFile(suffix=".exe", delete=False) as tmp:
                installer_path = Path(tmp.name)

            expected_hash = PYTHON_CHECKSUMS.get(f"{PYTHON_VERSION}-amd64")
            download_with_verification(PYTHON_WINDOWS_URL, installer_path, expected_hash)

            # Validate installer size (should be ~25-30 MB)
            size_mb = installer_path.stat().st_size / (1024 * 1024)
            if not (20 < size_mb < 35):
                logger.error(f"Suspicious installer size: {size_mb:.1f}MB")
                installer_path.unlink()
                return False

            logger.info("🚀 Launching Python installer...")
            logger.info("IMPORTANT: Ensure 'Add Python to PATH' is checked!")

            # Run installer silently with default settings
            subprocess.run(  # noqa: S603
                [
                    str(installer_path),
                    "/quiet",
                    "InstallAllUsers=1",
                    "PrependPath=1",
                    "Include_pip=1",
                ],
                check=True,
                timeout=DOWNLOAD_TIMEOUT,
            )

            # Clean up
            installer_path.unlink()

            logger.info("✅ Python installation complete. Verifying...")

            # Wait for Python to appear in PATH
            if not wait_for_command("python", max_wait=PYTHON_PATH_WAIT):
                logger.warning("Python not immediately available in PATH")
                logger.info("You may need to restart your terminal")

            # Verify installation
            is_installed, _ = self.check_python()
            return is_installed

        except subprocess.CalledProcessError as e:
            logger.error(f"Python installation failed: {e}")
            logger.error("Please install manually from https://www.python.org/downloads/")
            return False
        except (OSError, urllib.error.URLError) as e:
            logger.error(f"Python installation failed: {e}")
            logger.error("Please install manually from https://www.python.org/downloads/")
            return False
        except KeyboardInterrupt:
            logger.info("\nInstallation cancelled by user")
            return False

    def install_python_macos(self) -> bool:
        """Install Python on macOS via Homebrew."""
        logger.info("Python 3.13+ installation required for macOS...")

        if self.config.dry_run:
            logger.info("[DRY RUN] Would install Python 3.13 via Homebrew")
            return True

        # Check if Homebrew is installed
        if not shutil.which("brew"):
            logger.info("Homebrew not found. Install Homebrew first:")
            logger.info(
                '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
            )
            return False

        logger.info("Installing Python 3.13 via Homebrew...")
        try:
            subprocess.run(["brew", "install", "python@3.13"], check=True, timeout=DOWNLOAD_TIMEOUT)
            logger.info("✅ Python 3.13 installed via Homebrew")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to install Python via Homebrew: {e}")
            return False
        except subprocess.TimeoutExpired:
            logger.error("Homebrew installation timed out")
            return False
        except KeyboardInterrupt:
            logger.info("\nInstallation cancelled by user")
            return False

    def install_python_linux(self) -> bool:
        """Install Python on Linux via package manager."""
        logger.info("Python 3.13+ installation required for Linux...")

        if self.config.dry_run:
            logger.info("[DRY RUN] Would install Python 3.13 via apt")
            return True

        logger.info("Installing via apt (Ubuntu/Debian)...")

        try:
            # Add deadsnakes PPA for Python 3.13
            logger.info("Adding deadsnakes PPA for Python 3.13...")
            subprocess.run(["sudo", "apt-get", "update"], check=True, timeout=DOWNLOAD_TIMEOUT)
            subprocess.run(
                ["sudo", "apt-get", "install", "-y", "software-properties-common"],
                check=True,
                timeout=DOWNLOAD_TIMEOUT,
            )
            subprocess.run(
                ["sudo", "add-apt-repository", "-y", "ppa:deadsnakes/ppa"],
                check=True,
                timeout=DOWNLOAD_TIMEOUT,
            )
            subprocess.run(["sudo", "apt-get", "update"], check=True, timeout=DOWNLOAD_TIMEOUT)

            # Install Python 3.13
            logger.info("Installing Python 3.13...")
            subprocess.run(
                [
                    "sudo",
                    "apt-get",
                    "install",
                    "-y",
                    "python3.13",
                    "python3.13-venv",
                    "python3.13-dev",
                    "python3-pip",
                    "build-essential",
                ],
                check=True,
                timeout=DOWNLOAD_TIMEOUT,
            )

            logger.info("✅ Python 3.13 installed")
            return True

        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to install Python: {e}")
            logger.info("You may need to install Python 3.13 manually:")
            logger.info("  https://www.python.org/downloads/")
            return False
        except subprocess.TimeoutExpired:
            logger.error("Package installation timed out")
            return False
        except KeyboardInterrupt:
            logger.info("\nInstallation cancelled by user")
            return False

    def create_venv(self, python_path: Path) -> bool:
        """Create virtual environment."""
        logger.info("📦 Creating virtual environment...")

        if self.config.dry_run:
            logger.info(f"[DRY RUN] Would create venv at: {self.config.venv_path}")
            return True

        try:
            if self.config.venv_path.exists():
                logger.info("   Virtual environment already exists")
                return True

            subprocess.run(
                [str(python_path), "-m", "venv", str(self.config.venv_path)],
                check=True,
                timeout=DOWNLOAD_TIMEOUT,
            )

            self.state.add_created_path(self.config.venv_path)
            logger.info("✅ Virtual environment created")
            return True

        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to create virtual environment: {e}")
            return False
        except subprocess.TimeoutExpired:
            logger.error("Virtual environment creation timed out")
            return False
        except KeyboardInterrupt:
            logger.info("\nCancelled by user")
            return False

    def get_venv_python(self) -> Path:
        """Get path to Python in virtual environment."""
        if self.platform.os_name == "windows":
            return self.config.venv_path / "Scripts" / "python.exe"
        else:
            return self.config.venv_path / "bin" / "python"

    def install_dependencies(self) -> bool:
        """Install Python dependencies."""
        logger.info("📚 Installing dependencies...")

        if self.config.dry_run:
            logger.info("[DRY RUN] Would install dependencies from pyproject.toml")
            return True

        venv_python = self.get_venv_python()
        if not venv_python.exists():
            logger.error("Virtual environment Python not found")
            return False

        try:
            # Upgrade pip
            logger.info("   Upgrading pip...")
            subprocess.run(
                [str(venv_python), "-m", "pip", "install", "--upgrade", "pip"],
                check=True,
                timeout=DOWNLOAD_TIMEOUT,
                capture_output=True,
            )

            # Install from pyproject.toml
            logger.info("   Installing project dependencies...")
            subprocess.run(
                [str(venv_python), "-m", "pip", "install", "-e", ".[dev,resume]"],
                cwd=self.project_root,
                check=True,
                timeout=DOWNLOAD_TIMEOUT,
            )

            # Install Playwright browsers
            logger.info("   Installing Playwright browsers...")
            subprocess.run(
                [str(venv_python), "-m", "playwright", "install", "chromium"],
                check=True,
                timeout=DOWNLOAD_TIMEOUT,
            )

            logger.info("✅ Dependencies installed")
            self.state.mark_complete("dependencies")
            return True

        except subprocess.CalledProcessError as e:
            logger.error(f"Dependency installation failed: {e}")
            return False
        except subprocess.TimeoutExpired:
            logger.error("Dependency installation timed out")
            return False
        except KeyboardInterrupt:
            logger.info("\nCancelled by user")
            return False

    def setup_config(self) -> bool:
        """Set up configuration files."""
        logger.info("⚙️  Setting up configuration...")

        if self.config.dry_run:
            logger.info("[DRY RUN] Would set up configuration files")
            return True

        try:
            config_dir = self.project_root / "config"
            config_dir.mkdir(exist_ok=True)

            # Copy example config if needed
            example_config = config_dir / "user_prefs.example.json"
            user_config = config_dir / "user_prefs.json"

            if not user_config.exists() and example_config.exists():
                shutil.copy(example_config, user_config)
                self.state.add_created_path(user_config)
                logger.info("✅ Created user_prefs.json from example")
            elif user_config.exists():
                logger.info("   user_prefs.json already exists")
            else:
                logger.warning("   No example config found, skipping")

            # Copy .env.example to .env if needed
            env_example = self.project_root / ".env.example"
            env_file = self.project_root / ".env"

            if not env_file.exists() and env_example.exists():
                shutil.copy(env_example, env_file)
                self.state.add_created_path(env_file)
                logger.info("✅ Created .env from example")
            elif env_file.exists():
                logger.info("   .env already exists")

            # Create data directories
            log_dir = self.project_root / "data" / "logs"
            backup_dir = self.project_root / "data" / "backups"

            log_dir.mkdir(parents=True, exist_ok=True)
            backup_dir.mkdir(parents=True, exist_ok=True)

            if not (self.project_root / "data").exists():
                self.state.add_created_path(self.project_root / "data")

            logger.info("✅ Configuration setup complete")
            self.state.mark_complete("configuration")
            return True

        except OSError as e:
            logger.error(f"Configuration setup failed: {e}")
            return False
        except KeyboardInterrupt:
            logger.info("\nCancelled by user")
            return False

    def setup_automation_windows(self) -> bool:
        """Set up Windows Task Scheduler automation with XML escaping."""
        logger.info("📅 Setting up Windows Task Scheduler...")

        if self.config.dry_run:
            logger.info("[DRY RUN] Would create Windows Task Scheduler task")
            return True

        venv_python = self.get_venv_python()
        
        # Use CLI module command instead of non-existent agent.py script
        # The task will run: python -m jsa.cli run-once

        # Escape paths for XML
        escaped_python = escape_xml(str(venv_python))
        escaped_workdir = escape_xml(str(self.project_root))

        # Generate dynamic start time (tomorrow at 9 AM)
        from datetime import datetime, timedelta
        tomorrow = datetime.now() + timedelta(days=1)
        start_time = tomorrow.replace(hour=9, minute=0, second=0, microsecond=0).isoformat()

        # Create task XML with proper escaping
        # Uses "python -m jsa.cli run-once" instead of non-existent agent.py
        task_xml = f"""<?xml version="1.0" encoding="UTF-16"?>
<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">
  <RegistrationInfo>
    <Description>JobSentinel automated job search (daily at 9:00 AM)</Description>
  </RegistrationInfo>
  <Triggers>
    <CalendarTrigger>
      <StartBoundary>{start_time}</StartBoundary>
      <Enabled>true</Enabled>
      <ScheduleByDay>
        <DaysInterval>1</DaysInterval>
      </ScheduleByDay>
    </CalendarTrigger>
  </Triggers>
  <Principals>
    <Principal>
      <LogonType>InteractiveToken</LogonType>
      <RunLevel>LeastPrivilege</RunLevel>
    </Principal>
  </Principals>
  <Settings>
    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>
    <DisallowStartIfOnBatteries>true</DisallowStartIfOnBatteries>
    <StopIfGoingOnBatteries>true</StopIfGoingOnBatteries>
    <AllowHardTerminate>true</AllowHardTerminate>
    <StartWhenAvailable>true</StartWhenAvailable>
    <Enabled>true</Enabled>
    <ExecutionTimeLimit>PT1H</ExecutionTimeLimit>
  </Settings>
  <Actions>
    <Exec>
      <Command>{escaped_python}</Command>
      <Arguments>-m jsa.cli run-once</Arguments>
      <WorkingDirectory>{escaped_workdir}</WorkingDirectory>
    </Exec>
  </Actions>
</Task>"""

        try:
            # Save task XML
            task_file = self.project_root / "jobsentinel_task.xml"
            task_file.write_text(task_xml, encoding="utf-16")

            # Create task
            subprocess.run(
                [
                    "schtasks",
                    "/create",
                    "/tn",
                    "JobSentinel",
                    "/xml",
                    str(task_file),
                    "/f",
                ],
                check=True,
                timeout=DEFAULT_TIMEOUT,
                capture_output=True,
            )

            # Clean up
            task_file.unlink()

            logger.info("✅ Task Scheduler configured (daily at 9:00 AM)")
            self.state.mark_complete("automation_windows")
            return True

        except subprocess.CalledProcessError as e:
            logger.warning(f"Could not set up Task Scheduler: {e}")
            logger.info("You can run manually: python -m jsa.cli")
            return True  # Non-critical
        except OSError as e:
            logger.warning(f"Could not set up Task Scheduler: {e}")
            return True  # Non-critical
        except KeyboardInterrupt:
            logger.info("\nCancelled by user")
            return False

    def setup_automation_macos(self) -> bool:
        """Set up macOS launchd automation with SIP awareness."""
        logger.info("📅 Setting up macOS launchd automation...")

        if self.config.dry_run:
            logger.info("[DRY RUN] Would create launchd plist")
            return True

        venv_python = self.get_venv_python()
        script_path = self.project_root / "src" / "agent.py"

        # Validate script exists
        if not script_path.exists():
            logger.warning(f"Script not found: {script_path}")
            logger.warning("Skipping automation setup. Set up manually later.")
            return True

        # Create launchd plist
        plist_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.jobsentinel.automation</string>
    <key>ProgramArguments</key>
    <array>
        <string>{venv_python}</string>
        <string>{script_path}</string>
        <string>--mode</string>
        <string>poll</string>
    </array>
    <key>WorkingDirectory</key>
    <string>{self.project_root}</string>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>9</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>{self.project_root}/data/logs/launchd.log</string>
    <key>StandardErrorPath</key>
    <string>{self.project_root}/data/logs/launchd.error.log</string>
</dict>
</plist>"""

        try:
            # Check if launchctl is accessible (SIP check)
            result = subprocess.run(
                ["launchctl", "list"], capture_output=True, timeout=DEFAULT_TIMEOUT
            )
            if result.returncode != 0:
                logger.warning("launchctl not accessible (possibly due to SIP)")
                logger.info("Manual setup required. See documentation.")
                return True  # Non-critical

            # Save plist to ~/Library/LaunchAgents
            launchagents_dir = Path.home() / "Library" / "LaunchAgents"
            launchagents_dir.mkdir(exist_ok=True)

            plist_file = launchagents_dir / "com.jobsentinel.automation.plist"
            plist_file.write_text(plist_content)

            # Load the launch agent
            subprocess.run(
                ["launchctl", "load", str(plist_file)], check=True, timeout=DEFAULT_TIMEOUT
            )

            logger.info("✅ launchd configured (daily at 9:00 AM)")
            logger.info(f"   Plist saved to: {plist_file}")
            self.state.mark_complete("automation_macos")
            return True

        except subprocess.CalledProcessError as e:
            logger.warning(f"Could not set up launchd: {e}")
            logger.info("This may be due to System Integrity Protection.")
            logger.info("To enable manually:")
            logger.info("1. Copy plist to ~/Library/LaunchAgents/")
            logger.info(
                "2. Run: launchctl load ~/Library/LaunchAgents/com.jobsentinel.automation.plist"
            )
            return True  # Non-critical
        except OSError as e:
            logger.warning(f"Could not set up launchd: {e}")
            return True  # Non-critical
        except KeyboardInterrupt:
            logger.info("\nCancelled by user")
            return False

    def setup_automation_linux(self) -> bool:
        """Set up Linux cron automation."""
        logger.info("📅 Setting up Linux cron automation...")

        venv_python = self.get_venv_python()
        script_path = self.project_root / "src" / "agent.py"
        log_dir = self.project_root / "data" / "logs"

        # Validate script exists
        if not script_path.exists():
            logger.warning(f"Script not found: {script_path}")
            logger.warning("Skipping automation setup. Set up manually later.")
            return True

        cron_entry = f"0 9 * * * cd {self.project_root} && {venv_python} {script_path} --mode poll >> {log_dir}/cron.log 2>&1\n"

        logger.info("\n📋 To enable automated job searches, add this to your crontab:")
        logger.info("Run: crontab -e")
        logger.info("\nThen add this line:")
        print(f"\n{cron_entry}")
        logger.info("This will run daily at 9:00 AM\n")

        self.state.mark_complete("automation_linux")
        return True

    def run_tests(self) -> bool:
        """Run basic tests to verify installation."""
        logger.info("🧪 Running installation verification tests...")

        if self.config.dry_run:
            logger.info("[DRY RUN] Would run verification tests")
            return True

        venv_python = self.get_venv_python()

        try:
            # Test basic import
            result = subprocess.run(
                [
                    str(venv_python),
                    "-c",
                    "import jsa; import playwright; print('✅ Core modules loaded')",
                ],
                capture_output=True,
                text=True,
                cwd=self.project_root,
                timeout=VERIFICATION_TIMEOUT,
            )

            if result.returncode == 0:
                print(result.stdout)
                logger.info("✅ Installation verification passed")
                self.state.mark_complete("verification")
                return True
            else:
                logger.error(f"Verification failed: {result.stderr}")
                return False

        except subprocess.TimeoutExpired:
            logger.error("Verification timed out")
            return False
        except subprocess.CalledProcessError as e:
            logger.error(f"Verification error: {e}")
            return False
        except KeyboardInterrupt:
            logger.info("\nCancelled by user")
            return False

    def uninstall(self) -> bool:
        """Uninstall JobSentinel."""
        logger.warning("⚠️  UNINSTALL MODE")
        logger.warning("This will remove:")
        logger.warning(f"  - Virtual environment: {self.config.venv_path}")
        logger.warning("  - Automation tasks")
        logger.warning("  - Installation state")
        logger.warning("\nYour configuration and data will be preserved.")

        if not confirm("\nContinue with uninstall?", default=False):
            logger.info("Uninstall cancelled")
            return False

        try:
            # Remove venv
            if self.config.venv_path.exists():
                shutil.rmtree(self.config.venv_path)
                logger.info("✅ Removed virtual environment")

            # Remove automation
            if self.platform.os_name == "windows":
                try:
                    subprocess.run(
                        ["schtasks", "/delete", "/tn", "JobSentinel", "/f"],
                        capture_output=True,
                        timeout=DEFAULT_TIMEOUT,
                    )
                    logger.info("✅ Removed Task Scheduler task")
                except Exception:
                    logger.info("   No Task Scheduler task found")

            elif self.platform.os_name == "macos":
                plist = Path.home() / "Library/LaunchAgents/com.jobsentinel.automation.plist"
                if plist.exists():
                    try:
                        subprocess.run(
                            ["launchctl", "unload", str(plist)],
                            capture_output=True,
                            timeout=DEFAULT_TIMEOUT,
                        )
                        plist.unlink()
                        logger.info("✅ Removed launchd agent")
                    except Exception:
                        logger.info("   Could not remove launchd agent")

            # Remove state file
            if self.state.state_file.exists():
                self.state.state_file.unlink()
                logger.info("✅ Removed installation state")

            logger.info("\n✅ Uninstall complete")
            logger.info("Your configuration and data remain at:")
            logger.info(f"  {self.project_root / 'config'}")
            logger.info(f"  {self.project_root / 'data'}")
            return True

        except Exception as e:
            logger.error(f"Uninstall failed: {e}")
            return False

    def install(self) -> bool:
        """Main installation flow with comprehensive error handling."""
        try:
            self.print_banner()

            # Check disk space
            if not check_disk_space(self.project_root):
                return False

            # Step 1: Check/Install Python
            logger.info("=" * 70)
            logger.info("Step 1/6: Python Installation")
            logger.info("=" * 70)

            python_found, python_path = self.check_python()

            if not python_found:
                logger.info(
                    f"\nPython {REQUIRED_PYTHON[0]}.{REQUIRED_PYTHON[1]}+ is required but not found."
                )

                if self.platform.os_name == "windows":
                    if not self.install_python_windows():
                        return False
                    python_found, python_path = self.check_python()
                elif self.platform.os_name == "macos":
                    if not self.install_python_macos():
                        return False
                    python_found, python_path = self.check_python()
                elif self.platform.os_name == "linux":
                    if not self.install_python_linux():
                        return False
                    python_found, python_path = self.check_python()

                if not python_found:
                    logger.error("Python installation failed or not detected")
                    return False

            # Step 2: Create virtual environment
            logger.info("\n" + "=" * 70)
            logger.info("Step 2/6: Virtual Environment")
            logger.info("=" * 70)

            if not self.create_venv(python_path):
                return False

            # Step 3: Install dependencies
            if not self.config.skip_deps:
                logger.info("\n" + "=" * 70)
                logger.info("Step 3/6: Dependencies")
                logger.info("=" * 70)

                if not self.install_dependencies():
                    return False
            else:
                logger.info("\n⏭️  Skipping dependencies (--skip-deps)")

            # Step 4: Setup configuration
            logger.info("\n" + "=" * 70)
            logger.info("Step 4/6: Configuration")
            logger.info("=" * 70)

            if not self.setup_config():
                return False

            # Step 5: Setup automation
            logger.info("\n" + "=" * 70)
            logger.info("Step 5/6: Automation")
            logger.info("=" * 70)

            if self.platform.os_name == "windows":
                self.setup_automation_windows()
            elif self.platform.os_name == "macos":
                self.setup_automation_macos()
            elif self.platform.os_name == "linux":
                self.setup_automation_linux()

            # Step 6: Run tests
            logger.info("\n" + "=" * 70)
            logger.info("Step 6/6: Verification")
            logger.info("=" * 70)

            if not self.run_tests():
                logger.warning("⚠️  Some verification tests failed, but installation may be usable")

            # Success message
            self._print_success_message()
            return True

        except KeyboardInterrupt:
            logger.info("\n\n⚠️  Installation cancelled by user")
            if confirm("Roll back changes?", default=True):
                self.state.rollback(dry_run=self.config.dry_run)
            return False
        except Exception as e:
            logger.error(f"\n\n❌ Fatal installation error: {e}")
            logger.debug(f"Traceback:\n{traceback.format_exc()}")
            if confirm("Roll back changes?", default=True):
                self.state.rollback(dry_run=self.config.dry_run)
            return False

    def _print_success_message(self) -> None:
        """Print success message with next steps."""
        print("\n" + "=" * 70)
        print("   ✅ INSTALLATION COMPLETED SUCCESSFULLY!")
        print("=" * 70)
        print(f"\n📁 Installation directory: {self.project_root}")
        print(f"🐍 Python version: {PYTHON_VERSION}")
        print(f"💻 Platform: {self.platform.os_name.title()}")
        print("\n📖 Next steps:")
        print("   1. Edit config/user_prefs.json with your job preferences")
        print("   2. (Optional) Configure .env with API keys for notifications")
        print("   3. Activate venv:")
        if self.platform.os_name == "windows":
            print(f"      {self.config.venv_path}\\Scripts\\activate")
        else:
            print(f"      source {self.config.venv_path}/bin/activate")
        print("   4. Run: python -m jsa.cli --help")
        print("\n🚀 Start job search: python -m jsa.cli search")
        print("=" * 70 + "\n")


# ============================================================================
# Main Entry Point
# ============================================================================


def main() -> int:
    """Main entry point with argument parsing."""
    parser = argparse.ArgumentParser(
        description="JobSentinel Universal Installer - Hardened Version",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                          # Normal installation
  %(prog)s --dry-run                # Preview changes without executing
  %(prog)s --verbose                # Verbose output with file logging
  %(prog)s --uninstall              # Remove installation
  %(prog)s --venv-path /custom/path # Custom virtual environment location
  %(prog)s --skip-deps              # Skip dependency installation
        """,
    )

    parser.add_argument(
        "--venv-path",
        type=Path,
        help="Custom virtual environment path (default: .venv)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without executing them",
    )
    parser.add_argument(
        "--skip-deps",
        action="store_true",
        help="Skip dependency installation",
    )
    parser.add_argument(
        "--uninstall",
        action="store_true",
        help="Uninstall JobSentinel",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose logging to file",
    )

    args = parser.parse_args()

    # Setup logging
    log_dir = Path(__file__).parent.parent / "data" / "logs" if args.verbose else None
    setup_logging(log_dir=log_dir, verbose=args.verbose)

    # Setup proxy support
    setup_proxy()

    try:
        # Create installer
        project_root = Path(__file__).parent.parent
        config = InstallConfig(
            project_root=project_root,
            venv_path=args.venv_path or project_root / ".venv",
            skip_deps=args.skip_deps,
            dry_run=args.dry_run,
            verbose=args.verbose,
        )

        # Use installation lock to prevent concurrent runs
        lock_file = project_root / ".install.lock"

        with install_lock(lock_file):
            installer = UniversalInstaller(project_root=project_root, config=config)

            if args.uninstall:
                success = installer.uninstall()
            else:
                success = installer.install()

            return 0 if success else 1

    except RuntimeError as e:
        logger.error(str(e))
        return 1
    except KeyboardInterrupt:
        logger.info("\n\nInstallation cancelled by user")
        return 130  # Standard Unix exit code for SIGINT
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        logger.debug(f"Traceback:\n{traceback.format_exc()}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
