"""Configuration validation using RipGrep.

This module provides RipGrep-powered configuration validation to verify required keys
and find deprecated settings. Falls back to Python when RipGrep is unavailable.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from typing import Any


def validate_config_keys(
    config_dir: str, required_keys: list[str]
) -> dict[str, list[str]]:
    """Use ripgrep to check for required keys in config files.

    Args:
        config_dir: Directory containing configuration files
        required_keys: List of required configuration keys

    Returns:
        Dictionary mapping missing keys to files that lack them
    """
    config_path = Path(config_dir)
    if not config_path.exists():
        return {key: [] for key in required_keys}

    # Check if ripgrep is available
    if shutil.which("rg"):
        return _validate_keys_ripgrep(config_dir, required_keys)
    else:
        return _validate_keys_fallback(config_dir, required_keys)


def _validate_keys_ripgrep(
    config_dir: str, required_keys: list[str]
) -> dict[str, list[str]]:
    """Validate config keys using RipGrep (fast path)."""
    missing_keys: dict[str, list[str]] = {}

    try:
        for key in required_keys:
            result = subprocess.run(
                ["rg", "--files-without-match", f'"{key}"', config_dir],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )

            files_missing_key = result.stdout.strip().split("\n")
            # Filter out empty strings
            files_missing_key = [f for f in files_missing_key if f]

            if files_missing_key:
                missing_keys[key] = files_missing_key

    except (subprocess.TimeoutExpired, subprocess.SubprocessError):
        # Fall back to Python if ripgrep fails
        return _validate_keys_fallback(config_dir, required_keys)

    return missing_keys


def _validate_keys_fallback(
    config_dir: str, required_keys: list[str]
) -> dict[str, list[str]]:
    """Validate config keys using Python file parsing (fallback)."""
    import json

    missing_keys: dict[str, list[str]] = {}
    config_path = Path(config_dir)

    # Get all config files
    config_files = list(config_path.glob("**/*.json"))

    for key in required_keys:
        files_missing = []

        for config_file in config_files:
            try:
                with open(config_file, encoding="utf-8") as f:
                    content = f.read()
                    # Simple check if key is in the file (not perfect but fast)
                    if f'"{key}"' not in content:
                        files_missing.append(str(config_file))
            except OSError:
                continue

        if files_missing:
            missing_keys[key] = files_missing

    return missing_keys


def find_deprecated_settings(config_dir: str) -> list[dict[str, Any]]:
    """Find usage of deprecated configuration options.

    Args:
        config_dir: Directory containing configuration files

    Returns:
        List of findings with pattern and locations
    """
    deprecated_patterns = ["use_old_api", "legacy_mode", "deprecated_scraper"]

    config_path = Path(config_dir)
    if not config_path.exists():
        return []

    # Check if ripgrep is available
    if shutil.which("rg"):
        return _find_deprecated_ripgrep(config_dir, deprecated_patterns)
    else:
        return _find_deprecated_fallback(config_dir, deprecated_patterns)


def _find_deprecated_ripgrep(
    config_dir: str, deprecated_patterns: list[str]
) -> list[dict[str, Any]]:
    """Find deprecated settings using RipGrep (fast path)."""
    findings: list[dict[str, Any]] = []

    try:
        for pattern in deprecated_patterns:
            result = subprocess.run(
                ["rg", "--line-number", f'"{pattern}"', config_dir],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )

            if result.stdout:
                locations = result.stdout.strip().split("\n")
                # Filter out empty strings
                locations = [loc for loc in locations if loc]

                if locations:
                    findings.append({"pattern": pattern, "locations": locations})

    except (subprocess.TimeoutExpired, subprocess.SubprocessError):
        # Fall back to Python if ripgrep fails
        return _find_deprecated_fallback(config_dir, deprecated_patterns)

    return findings


def _find_deprecated_fallback(
    config_dir: str, deprecated_patterns: list[str]
) -> list[dict[str, Any]]:
    """Find deprecated settings using Python file parsing (fallback)."""
    findings: list[dict[str, Any]] = []
    config_path = Path(config_dir)

    for pattern in deprecated_patterns:
        locations: list[str] = []

        for config_file in config_path.glob("**/*.json"):
            try:
                with open(config_file, encoding="utf-8") as f:
                    for line_num, line in enumerate(f, 1):
                        if f'"{pattern}"' in line:
                            locations.append(f"{config_file}:{line_num}:{line.rstrip()}")
            except OSError:
                continue

        if locations:
            findings.append({"pattern": pattern, "locations": locations})

    return findings
