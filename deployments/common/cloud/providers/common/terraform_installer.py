"""Cross-platform Terraform installation module.

This module handles automatic installation of Terraform on Windows, macOS, and Linux.
Terraform is installed to a local directory and added to PATH for the session.
"""

from __future__ import annotations

import asyncio
import hashlib
import os
import platform
import stat
import sys
import tempfile
import zipfile
from pathlib import Path

from deployments.common.cloud.utils import run_command, which

# Pin Terraform version for consistency
TERRAFORM_VERSION = "1.9.7"

# Cache for checksum manifests: {version: {platform: checksum}}
_CHECKSUM_CACHE: dict[str, dict[str, str]] = {}


def get_platform_info() -> tuple[str, str]:
    """Detect current OS and architecture.

    Returns:
        Tuple of (os_type, arch) suitable for Terraform download URLs.
    """
    system = platform.system().lower()
    machine = platform.machine().lower()

    # Map OS names
    os_map = {
        "windows": "windows",
        "darwin": "darwin",
        "linux": "linux",
    }
    os_type = os_map.get(system, "linux")

    # Map architectures
    arch_map = {
        "x86_64": "amd64",
        "amd64": "amd64",
        "aarch64": "arm64",
        "arm64": "arm64",
    }
    arch = arch_map.get(machine, "amd64")

    return os_type, arch


def get_terraform_install_dir() -> Path:
    """Get the directory where Terraform should be installed.

    Returns:
        Path to terraform installation directory.
    """
    if sys.platform == "win32":
        # Windows: %APPDATA%\job-scraper\bin
        base = Path(os.environ.get("APPDATA", Path.home() / "AppData" / "Roaming"))
        install_dir = base / "job-scraper" / "bin"
    else:
        # Unix: ~/.local/bin/job-scraper
        install_dir = Path.home() / ".local" / "bin" / "job-scraper"

    install_dir.mkdir(parents=True, exist_ok=True)
    return install_dir


def get_terraform_download_url(version: str, os_type: str, arch: str) -> str:
    """Construct Terraform download URL.

    Args:
        version: Terraform version (e.g., "1.10.3")
        os_type: Operating system (windows, darwin, linux)
        arch: Architecture (amd64, arm64)

    Returns:
        Download URL string.
    """
    base_url = "https://releases.hashicorp.com/terraform"
    filename = f"terraform_{version}_{os_type}_{arch}.zip"
    return f"{base_url}/{version}/{filename}"


async def fetch_terraform_checksums(version: str, logger) -> dict[str, str]:
    """Download and cache Terraform SHA256 sums for the requested version."""
    if version in _CHECKSUM_CACHE:
        return _CHECKSUM_CACHE[version]

    checksum_url = (
        f"https://releases.hashicorp.com/terraform/{version}/" f"terraform_{version}_SHA256SUMS"
    )

    # Security: enforce https scheme explicitly to satisfy S310
    if not checksum_url.startswith("https://"):
        logger.error("Refusing to download checksums over non-HTTPS")
        _CHECKSUM_CACHE[version] = {}
        return {}

    logger.debug(f"Fetching Terraform checksums from {checksum_url}")

    try:

        def _download() -> str:
            import urllib.request

            with urllib.request.urlopen(checksum_url, timeout=30) as response:  # noqa: S310
                return response.read().decode("utf-8")

        contents = await asyncio.to_thread(_download)
    except Exception as exc:  # nosec B110 - network failure should not abort install
        logger.warning(f"Unable to download Terraform checksums: {exc}")
        _CHECKSUM_CACHE[version] = {}
        return {}

    checksums: dict[str, str] = {}
    prefix = f"terraform_{version}_"
    for line in contents.splitlines():
        parts = line.strip().split()
        if len(parts) != 2:
            continue
        checksum, filename = parts
        if not filename.startswith(prefix) or not filename.endswith(".zip"):
            continue
        platform = filename[len(prefix) : -4]  # strip prefix and .zip
        checksums[platform] = checksum

    _CHECKSUM_CACHE[version] = checksums
    return checksums


def verify_checksum(file_path: Path, expected_checksum: str) -> bool:
    """Verify SHA256 checksum of downloaded file.

    Args:
        file_path: Path to file to verify
        expected_checksum: Expected SHA256 hex digest

    Returns:
        True if checksum matches, False otherwise.
    """
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)

    actual_checksum = sha256_hash.hexdigest()
    return actual_checksum == expected_checksum


async def download_terraform(logger, version: str, os_type: str, arch: str, dest_dir: Path) -> Path:
    """Download Terraform binary.

    Args:
        logger: Logger instance
        version: Terraform version to download
        os_type: Operating system
        arch: Architecture
        dest_dir: Destination directory for download

    Returns:
        Path to downloaded zip file.
    """
    url = get_terraform_download_url(version, os_type, arch)
    zip_path = dest_dir / f"terraform_{version}_{os_type}_{arch}.zip"

    logger.info(f"Downloading Terraform {version} for {os_type}/{arch}...")
    logger.debug(f"URL: {url}")

    # Use curl for download (available on all platforms)
    await run_command(
        ["curl", "-L", "-o", str(zip_path), url],
        logger=logger,
        show_spinner=True,
    )

    # Verify download succeeded
    if not zip_path.exists() or zip_path.stat().st_size == 0:
        raise RuntimeError("Terraform download failed or file is empty")

    logger.info(f"[OK] Downloaded Terraform to {zip_path}")
    return zip_path


def extract_terraform(zip_path: Path, install_dir: Path) -> Path:
    """Extract Terraform binary from zip archive.

    Args:
        zip_path: Path to downloaded zip file
        install_dir: Directory to extract binary to

    Returns:
        Path to extracted terraform binary.
    """
    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(install_dir)

    # Find terraform binary
    if sys.platform == "win32":
        terraform_bin = install_dir / "terraform.exe"
    else:
        terraform_bin = install_dir / "terraform"

    if not terraform_bin.exists():
        raise RuntimeError(f"Terraform binary not found after extraction: {terraform_bin}")

    # Make executable on Unix
    if sys.platform != "win32":
        terraform_bin.chmod(
            terraform_bin.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH
        )

    return terraform_bin


def add_to_path(directory: Path) -> None:
    """Add directory to PATH for current session.

    Args:
        directory: Directory to add to PATH
    """
    dir_str = str(directory.resolve())
    current_path = os.environ.get("PATH", "")

    # Check if already in PATH
    if dir_str in current_path.split(os.pathsep):
        return

    # Add to PATH
    os.environ["PATH"] = f"{dir_str}{os.pathsep}{current_path}"


async def check_terraform_installed(logger) -> Path | None:
    """Check if Terraform is already installed.

    Args:
        logger: Logger instance

    Returns:
        Path to terraform binary if found, None otherwise.
    """
    terraform_path = which("terraform")
    if terraform_path:
        # Verify version
        try:
            result = await run_command(
                ["terraform", "version", "-json"],
                capture_output=True,
                text=True,
                logger=logger,
            )

            import json

            version_info = json.loads(result.stdout)
            version = version_info.get("terraform_version", "unknown")

            logger.info(f"[OK] Terraform {version} found at {terraform_path}")
            return Path(terraform_path)
        except Exception as e:
            logger.debug(f"Error checking terraform version: {e}")
            return None

    return None


async def ensure_terraform(logger, force_install: bool = False) -> Path:
    """Ensure Terraform is installed and available.

    This is the main entry point for Terraform installation.
    It checks if Terraform is already installed, and if not, downloads and installs it.

    Args:
        logger: Logger instance
        force_install: If True, reinstall even if already present

    Returns:
        Path to terraform binary.

    Raises:
        RuntimeError: If installation fails.
    """
    logger.info("=" * 70)
    logger.info("TERRAFORM INSTALLATION CHECK")
    logger.info("=" * 70)
    logger.info("")

    # Check if already installed
    if not force_install:
        existing_terraform = await check_terraform_installed(logger)
        if existing_terraform:
            logger.info("Terraform is already installed and ready to use.")
            return existing_terraform

    logger.info("Terraform not found. Installing automatically...")
    logger.info("")
    logger.info("Installation details:")
    logger.info(f"  • Version: {TERRAFORM_VERSION}")
    logger.info("  • Source: https://releases.hashicorp.com")

    # Detect platform
    os_type, arch = get_platform_info()
    logger.info(f"  • Platform: {os_type}/{arch}")

    # Get installation directory
    install_dir = get_terraform_install_dir()
    logger.info(f"  • Install location: {install_dir}")
    logger.info("")

    # Check if terraform already exists in install dir
    if sys.platform == "win32":
        terraform_bin = install_dir / "terraform.exe"
    else:
        terraform_bin = install_dir / "terraform"

    if terraform_bin.exists() and not force_install:
        logger.info(f"[OK] Terraform binary found at {terraform_bin}")
        add_to_path(install_dir)
        return terraform_bin

    # Download Terraform
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)

        try:
            zip_path = await download_terraform(logger, TERRAFORM_VERSION, os_type, arch, temp_path)

            checksums = await fetch_terraform_checksums(TERRAFORM_VERSION, logger)
            platform_key = f"{os_type}_{arch}"
            expected_checksum = checksums.get(platform_key)
            if expected_checksum:
                if not verify_checksum(zip_path, expected_checksum):
                    raise RuntimeError("Terraform checksum verification failed")
            else:
                logger.warning(
                    f"No checksum entry for {platform_key}. Continuing without verification."
                )

            logger.info("Extracting Terraform binary...")
            terraform_bin = extract_terraform(zip_path, install_dir)
            logger.info(f"[OK] Terraform installed to {terraform_bin}")

        except Exception as e:
            logger.error(f"Failed to install Terraform: {e}")
            logger.error(
                "Please install Terraform manually: https://developer.hashicorp.com/terraform/install"
            )
            raise RuntimeError(f"Terraform installation failed: {e}") from e

    # Add to PATH
    add_to_path(install_dir)

    # Verify installation
    logger.info("")
    logger.info("Verifying Terraform installation...")
    try:
        result = await run_command(
            ["terraform", "version"],
            capture_output=True,
            text=True,
            logger=logger,
        )
        logger.info(f"[OK] {result.stdout.strip()}")
    except Exception as e:
        logger.error(f"Terraform verification failed: {e}")
        raise RuntimeError("Terraform installation verification failed") from e

    logger.info("")
    logger.info("=" * 70)
    logger.info("")

    return terraform_bin
