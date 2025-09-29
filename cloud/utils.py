"""Utility helpers shared by cloud automation scripts."""

from __future__ import annotations

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


def ensure_python_version(min_version: tuple[int, int]) -> None:
    """Verify the interpreter meets the minimum version requirements."""

    if sys.version_info < min_version:
        version_str = ".".join(str(v) for v in sys.version_info[:3])
        required = ".".join(str(v) for v in (*min_version, 0))
        raise RuntimeError(
            "Python version mismatch: running "
            f"{version_str}, but {required}+ is required."
        )


def run_command(
    command: Sequence[str],
    *,
    logger: logging.Logger | None = None,
    check: bool = True,
    capture_output: bool = False,
    text: bool = True,
    env: dict[str, str] | None = None,
    input_data: bytes | str | None = None,
    show_spinner: bool = False,
) -> subprocess.CompletedProcess[str]:
    """Wrapper around :func:`subprocess.run` with sensible defaults."""

    if logger:
        logger.debug(f"Running command: {' '.join(command)}")

    spinner_thread = None
    stop_spinner = threading.Event()

    def _spinner():
        for char in itertools.cycle(['-', '\\', '|', '/']):
            if stop_spinner.is_set():
                break
            sys.stdout.write(char)
            sys.stdout.flush()
            time.sleep(0.1)
            sys.stdout.write('\b')

    if show_spinner and (not logger or logger.getEffectiveLevel() > logging.DEBUG):
        spinner_thread = threading.Thread(target=_spinner)
        spinner_thread.start()

    try:
        process = subprocess.run(
            list(command),
            check=check,
            capture_output=capture_output,
            text=text,
            env=env,
            input=input_data,
        )
    finally:
        if spinner_thread:
            stop_spinner.set()
            spinner_thread.join()

    return process


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


def choose(prompt: str, options: Iterable[str]) -> str:
    """Prompt the user to choose from ``options``."""

    options_list = list(options)
    if not options_list:
        raise ValueError("No options provided")

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


def create_or_update_secret(project_id: str, name: str, value: str) -> None:
    describe = run_command(
        [
            "gcloud",
            "secrets",
            "describe",
            name,
            f"--project={project_id}",
        ],
        capture_output=True,
        check=False,
    )
    if describe.returncode != 0:
        run_command(
            [
                "gcloud",
                "secrets",
                "create",
                name,
                "--replication-policy=automatic",
                f"--project={project_id}",
                "--labels=managed-by=job-scraper,rotation-policy=quarterly",
                "--quiet",
            ]
        )

    run_command(
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
    )

def resolve_project_root() -> Path:
    """Return the repository root (assumed to be two levels above modules)."""

    return Path(__file__).resolve().parent.parent
