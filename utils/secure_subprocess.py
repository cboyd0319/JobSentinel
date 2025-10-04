"""Secure subprocess execution helpers.

Centralizes policy for invoking external commands to reduce risk of
command injection, unexpected PATH resolution, or accidental exposure of
secrets in logs.

Usage principles:
 - Only allowlisted binaries may be executed (extend ALLOWLIST cautiously).
 - All arguments must be provided as a list of strings (no shell=True).
 - Sensitive args (tokens, passwords, keys) are redacted in logs.
 - Optional timeouts enforced.
 - Integrates with cost tracker for transparency.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import threading
from pathlib import Path
from typing import List, Sequence, Optional

from utils.cost_tracker import tracker

ALLOWED_BINARIES = {
    "gcloud",
    "python",
    "python3",
    "cmd",
    "powershell",
    "pwsh",
}

SENSITIVE_ARG_KEYWORDS = {"token", "password", "secret", "key", "passwd", "webhook"}


class SubprocessSecurityError(RuntimeError):
    """Raised when a subprocess security policy is violated."""


def _which(binary: str) -> Path | None:
    found = shutil.which(binary)
    return Path(found).resolve() if found else None


def _redact(args: Sequence[str]) -> str:
    redacted: List[str] = []
    skip_next = False
    for i, arg in enumerate(args):
        if skip_next:
            skip_next = False
            continue
        lower = arg.lower()
        if any(k in lower for k in SENSITIVE_ARG_KEYWORDS):
            if "=" in arg:
                key = arg.split("=", 1)[0]
                redacted.append(f"{key}=***REDACTED***")
            else:
                redacted.append(arg)
                if i + 1 < len(args):
                    redacted.append("***REDACTED***")
                    skip_next = True
        else:
            redacted.append(arg)
    return " ".join(redacted)


def run_secure(
    args: Sequence[str],
    *,
    cwd: Optional[Path] = None,
    env: Optional[dict] = None,
    timeout: Optional[float] = 300,
    capture_output: bool = True,
    check: bool = True,
) -> subprocess.CompletedProcess:
    if not args:
        raise SubprocessSecurityError("Empty command not allowed")
    binary = args[0]
    base = os.path.basename(binary)
    if base not in ALLOWED_BINARIES:
        raise SubprocessSecurityError(f"Binary '{base}' not allowlisted")

    resolved = _which(base)
    if not resolved:
        raise SubprocessSecurityError(f"Binary '{base}' not found on PATH")

    if os.path.isabs(binary) and Path(binary).resolve() != resolved:
        raise SubprocessSecurityError("Resolved binary mismatch (potential spoof)")

    redacted_cmd = _redact(list(args))
    # Increment cost tracker
    tracker.incr_subprocess()

    try:
        proc = subprocess.run(  # nosec B603 / safe usage: no shell, allowlist enforced
            list(args),
            cwd=str(cwd) if cwd else None,
            env=env,
            capture_output=capture_output,
            text=True,
            timeout=timeout,
            check=check,
        )
        return proc
    except subprocess.TimeoutExpired as e:
        raise RuntimeError(f"Command timed out: {redacted_cmd}") from e
    except subprocess.CalledProcessError as e:
        if check:
            raise RuntimeError(
                f"Command failed (exit {e.returncode}): {redacted_cmd}\nSTDERR: {e.stderr}"  # Limited diagnostic
            ) from e
        return e  # type: ignore[return-value]


def run_secure_async(*args, **kwargs):  # Placeholder for future async variant
    raise NotImplementedError("Async secure subprocess not yet implemented")
