"""Utility helpers shared by cloud automation scripts."""

from __future__ import annotations

import asyncio
import hashlib
import logging
import os
import platform
import shutil
import subprocess  # nosec B404
import sys
import threading
import time
from collections.abc import Iterable
from pathlib import Path

from utils.cost_tracker import tracker


class Spinner:
    """A simple spinner for long-running operations."""

    def __init__(self, message: str, logger_instance: logging.Logger):
        self.message = message
        self.logger = logger_instance
        self.stop_spinner = False
        self.spinner_thread = None

    def _spinner_task(self):
        spinner_chars = "|/-\\"
        while not self.stop_spinner:
            for char in spinner_chars:
                self.logger.info(f"{self.message} {char}", extra={"markup": True})
                time.sleep(0.1)
                if self.stop_spinner:
                    break

    def __enter__(self):
        self.stop_spinner = False
        self.spinner_thread = threading.Thread(target=self._spinner_task)
        self.spinner_thread.start()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop_spinner = True
        if self.spinner_thread:
            self.spinner_thread.join()
        self.logger.info(f"{self.message} [green]Done[/green]")


def _redact_command_for_logging(command: list[str]) -> str:
    """Redact sensitive information from a command list for logging purposes."""
    redacted_command = []
    skip_next = False
    for i, arg in enumerate(command):
        if skip_next:
            skip_next = False
            continue
        if arg.startswith("--") and ("token" in arg or "password" in arg or "key" in arg or "secret" in arg):
            redacted_command.append(arg)
            if "=" in arg:  # e.g., --token=abc
                redacted_command[-1] = f"{arg.split('=')[0]}=***REDACTED***"
            elif i + 1 < len(command):  # e.g., --token abc
                redacted_command.append("***REDACTED***")
                skip_next = True
            else: # e.g., --token at the end of the command
                redacted_command[-1] = f"{arg}=***REDACTED***"
        else:
            redacted_command.append(arg)
    return " ".join(redacted_command)


async def run_command(
    command: list[str],
    logger,
    check: bool = True,
    capture_output: bool = False,
    cwd: Path | None = None,
    env: dict | None = None,
    show_spinner: bool = False,
    retries: int = 0,
    delay: float = 1.0,
    backoff_factor: float = 2.0,
    input_data: bytes | None = None,
    text: bool = True,
) -> subprocess.CompletedProcess:
    """Runs a shell command, optionally with retries and exponential backoff.

    The `command` argument is expected to be a list of trusted inputs. Untrusted
    input should be sanitized before being passed to this function.
    """
    redacted_full_command = _redact_command_for_logging(command)
    for attempt in range(retries + 1):
        try:
            if show_spinner:
                # Spinner is synchronous, run in a thread
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    None,
                    lambda: subprocess.run(  # nosec B603  # noqa: S603 - safe: command list, no shell
                        command,
                        capture_output=capture_output,
                        text=text,
                        check=check,
                        cwd=cwd,
                        env=env,
                        input=input_data,
                    ),
                )
                tracker.incr_subprocess()
            else:
                proc = await asyncio.create_subprocess_exec(
                    *command,
                    stdout=subprocess.PIPE if capture_output else None,
                    stderr=subprocess.PIPE if capture_output else None,
                    cwd=cwd,
                    env=env,
                    stdin=subprocess.PIPE if input_data else None,
                )
                stdout, stderr = await proc.communicate(input=input_data)
                tracker.incr_subprocess()
                stdout_str = stdout.decode() if stdout else ""
                stderr_str = stderr.decode() if stderr else ""
                if check and proc.returncode != 0:
                    raise subprocess.CalledProcessError(proc.returncode, command, stdout_str, stderr_str)
                # Create a proper CompletedProcess object
                result = subprocess.CompletedProcess(
                    args=command,
                    returncode=proc.returncode,
                    stdout=stdout_str if text else stdout,
                    stderr=stderr_str if text else stderr,
                )
            return result
        except subprocess.CalledProcessError as e:
            if attempt < retries:
                logger.warning(
                    f"Command failed (attempt {attempt + 1}/{retries + 1}): {redacted_full_command}. "
                    f"Retrying in {delay:.1f} seconds... Exit code: {e.returncode}"
                )
                await asyncio.sleep(delay)
                delay *= backoff_factor
            else:
                error_message = f"Command failed after {retries + 1} attempts: {redacted_full_command}"
                error_message += f"\nExit Code: {e.returncode}"
                # Do not log stderr/stdout as they may contain sensitive information
                logger.error(error_message)
                raise RuntimeError(error_message) from e
    # This part should ideally not be reached, but for type hinting
    raise RuntimeError("Unexpected error in run_command retry logic")


def which(binary: str) -> Path | None:
    """Return the resolved path for ``binary`` if present on the PATH."""

    found = shutil.which(binary)
    return Path(found).resolve() if found else None


def prepend_path(path: Path) -> None:
    """Prepend ``path`` to PATH for the current process."""

    os.environ["PATH"] = str(path) + os.pathsep + os.environ.get("PATH", "")


def current_os() -> str:
    """Return a simple OS identifier (``windows``/``mac``/``linux``)."""

    system = platform.system().lower()
    if "windows" in system:
        return "windows"
    if system == "darwin":
        return "mac"
    return "linux"


def ensure_python_version(min_version: tuple[int, int]) -> None:
    """Ensure Python version meets minimum requirements.

    Args:
        min_version: Tuple of (major, minor) version numbers

    Raises:
        SystemExit: If Python version is too old
    """
    current_version = sys.version_info[:2]
    if current_version < min_version:
        print(f"[WARNING] Python {min_version[0]}.{min_version[1]}+ required, but {current_version[0]}.{current_version[1]} detected.")
        print("\nHow to fix:")
        print(f"1. Install Python {min_version[0]}.{min_version[1]} or newer")
        print("2. Download from: https://www.python.org/downloads/")
        print("3. Re-run this script with the updated Python version")
        sys.exit(1)


def print_header(title: str) -> None:
    """Print a formatted header."""
    print(f"\n=== {title} ===")
    print("=" * (len(title) + 8))


def ensure_directory(path: Path) -> Path:
    """Create ``path`` if it does not exist and return it."""

    path.mkdir(parents=True, exist_ok=True)
    return path


def confirm(prompt: str, no_prompt: bool = False) -> bool:
    """Prompt for a yes/no confirmation, defaulting to ``False``."""

    if no_prompt:
        return True
    answer = input(f"{prompt} [y/N]: ").strip().lower()
    return answer in {"y", "yes"}


def choose(prompt: str, options: Iterable[str], no_prompt: bool = False) -> str:
    """Prompt the user to choose from ``options``."""

    options_list = list(options)
    if not options_list:
        raise ValueError("No options provided")

    if no_prompt:
        # Auto-select the first option when in no-prompt mode
        return options_list[0]

    sys.stdout.write(prompt + "\n")
    for idx, option in enumerate(options_list, start=1):
        sys.stdout.write(f"  [{idx}] {option}\n")

    while True:
        choice = input("Select option: ").strip()
        if not choice:
            continue
        try:
            selected = int(choice)
        except ValueError:
            continue
        if 1 <= selected <= len(options_list):
            return options_list[selected - 1]


async def create_or_update_secret(project_id: str, name: str, value: str) -> None:
    describe = await run_command(
        [
            "gcloud",
            "secrets",
            "describe",
            name,
            f"--project={project_id}",
        ],
        capture_output=True,
        check=False,
        logger=logging.getLogger("cloud.utils"),  # Use a logger instance
    )
    if describe.returncode != 0:
        await run_command(
            [
                "gcloud",
                "secrets",
                "create",
                name,
                "--replication-policy=automatic",
                f"--project={project_id}",
                "--labels=managed-by=job-scraper,rotation-policy=quarterly",
                "--quiet",
            ],
            logger=logging.getLogger("cloud.utils"),  # Use a logger instance
        )

    await run_command(
        [
            "gcloud",
            "secrets",
            "versions",
            "add",
            name,
            "--data-file=-",
            f"--project={project_id}",
            "--quiet",
        ],
        input_data=value.encode("utf-8"),
        text=False,
        logger=logging.getLogger("cloud.utils"),  # Use a logger instance
    )


def resolve_project_root() -> Path:
    """Return the repository root (assumed to be two levels above modules)."""

    return Path(__file__).resolve().parent.parent


def verify_file_checksum(file_path: Path | str, expected_sha256: str) -> bool:
    """
    Verify file integrity using SHA256 checksum.

    Args:
        file_path: Path to file to verify
        expected_sha256: Expected SHA256 hash (hex string)

    Returns:
        True if checksum matches, False otherwise

    Example:
        >>> verify_file_checksum("installer.exe", "abc123...")
        True
    """
    file_path = Path(file_path)

    if not file_path.exists():
        return False

    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            sha256_hash.update(chunk)

    actual_hash = sha256_hash.hexdigest().lower()
    expected_hash = expected_sha256.lower()

    return actual_hash == expected_hash


async def download_and_verify(
    url: str,
    destination: Path | str,
    expected_sha256: str,
    logger: logging.Logger | None = None,
) -> bool:
    """
    Download file and verify checksum.

    Args:
        url: URL to download from
        destination: Where to save file
        expected_sha256: Expected SHA256 hash
        logger: Optional logger for progress

    Returns:
        True if download and verification succeeded

    Raises:
        RuntimeError: If download fails or checksum mismatch
    """
    destination = Path(destination)
    log = logger or logging.getLogger(__name__)

    # Download using curl (cross-platform, already used in codebase)
    try:
        await run_command(
            ["curl", "-fsSL", "-o", str(destination), url],
            logger=log,
        )
    except Exception as e:
        raise RuntimeError(f"Download failed: {e}") from e

    # Verify checksum
    if not verify_file_checksum(destination, expected_sha256):
        actual = hashlib.sha256(destination.read_bytes()).hexdigest()
        raise RuntimeError(
            f"Checksum mismatch!\n"
            f"Expected: {expected_sha256}\n"
            f"Actual:   {actual}\n"
            f"File may be corrupted or compromised."
        )

    log.info(f"[OK] Verified {destination.name} (SHA256 match)")
    return True
