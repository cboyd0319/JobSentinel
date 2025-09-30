"""Utility helpers shared by cloud automation scripts."""

from __future__ import annotations

import asyncio
import os
import logging
import itertools
import platform
import shutil
import subprocess  # nosec B404
import sys
import threading
import time
from pathlib import Path
from typing import Iterable, Sequence


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
                    lambda: subprocess.run(
                        command,
                        capture_output=capture_output,
                        text=text,
                        check=check,
                        cwd=cwd,
                        env=env,
                        input=input_data,
                    ),
                )
            else:
                result = await asyncio.create_subprocess_exec(
                    *command,
                    stdout=subprocess.PIPE if capture_output else None,
                    stderr=subprocess.PIPE if capture_output else None,
                    cwd=cwd,
                    env=env,
                    stdin=subprocess.PIPE if input_data else None,
                )
                stdout, stderr = await result.communicate(input=input_data)
                result.stdout = stdout.decode() if stdout else ""
                result.stderr = stderr.decode() if stderr else ""
                if check and result.returncode != 0:
                    raise subprocess.CalledProcessError(result.returncode, command, result.stdout, result.stderr)
            return result
        except subprocess.CalledProcessError as e:
            if attempt < retries:
                logger.warning(
                    f"Command failed (attempt {attempt + 1}/{retries + 1}): {redacted_full_command}. "
                    f"Retrying in {delay:.1f} seconds... Error: {e.stderr.strip() or e.stdout.strip() or e}"
                )
                await asyncio.sleep(delay)
                delay *= backoff_factor
            else:
                error_message = f"Command failed after {retries + 1} attempts: {redacted_full_command}"
                if e.stderr:
                    error_message += f"\nStderr: {e.stderr.strip()}"
                if e.stdout:
                    error_message += f"\nStdout: {e.stdout.strip()}"
                error_message += f"\nExit Code: {e.returncode}"
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
