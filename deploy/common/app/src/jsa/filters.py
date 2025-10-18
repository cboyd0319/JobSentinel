"""Company blacklist enforcement using RipGrep.

This module provides RipGrep-powered company filtering to quickly verify denied
companies aren't in scraped data before scoring. Falls back to Python when RipGrep
is unavailable.
"""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path


def find_blacklisted_companies(jobs_dir: str, blacklist: list[str]) -> list[str]:
    """Use ripgrep to find jobs from blacklisted companies.

    Args:
        jobs_dir: Directory containing job files
        blacklist: List of blacklisted company names

    Returns:
        List of file paths containing blacklisted companies
    """
    if not blacklist:
        return []

    jobs_path = Path(jobs_dir)
    if not jobs_path.exists():
        return []

    # Check if ripgrep is available
    if shutil.which("rg"):
        return _find_blacklisted_ripgrep(jobs_dir, blacklist)
    else:
        return _find_blacklisted_fallback(jobs_dir, blacklist)


def _find_blacklisted_ripgrep(jobs_dir: str, blacklist: list[str]) -> list[str]:
    """Find blacklisted companies using RipGrep (fast path)."""
    # Build pattern: (Company1|Company2|Company3)
    pattern = "(" + "|".join(blacklist) + ")"

    try:
        result = subprocess.run(
            [
                "rg",
                "--files-with-matches",
                "--ignore-case",
                f'"company":\\s*"{pattern}"',
                jobs_dir,
            ],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )

        blacklisted_files = result.stdout.strip().split("\n")
        # Filter out empty strings
        return [f for f in blacklisted_files if f]

    except (subprocess.TimeoutExpired, subprocess.SubprocessError):
        # Fall back to Python if ripgrep fails
        return _find_blacklisted_fallback(jobs_dir, blacklist)


def _find_blacklisted_fallback(jobs_dir: str, blacklist: list[str]) -> list[str]:
    """Find blacklisted companies using Python file parsing (fallback)."""
    import json

    blacklisted_files: list[str] = []
    jobs_path = Path(jobs_dir)

    # Normalize blacklist for case-insensitive comparison
    blacklist_lower = [company.lower() for company in blacklist]

    for json_file in jobs_path.glob("**/*.json"):
        try:
            with open(json_file, encoding="utf-8") as f:
                data = json.load(f)

                # Check if company field matches any blacklisted company
                company = None
                if isinstance(data, dict):
                    company = data.get("company", "")
                elif isinstance(data, list) and data:
                    company = data[0].get("company", "") if isinstance(data[0], dict) else ""

                if company and company.lower() in blacklist_lower:
                    blacklisted_files.append(str(json_file))

        except (OSError, json.JSONDecodeError):
            continue

    return blacklisted_files


def bulk_delete_blacklisted_jobs(jobs_dir: str, blacklist: list[str]) -> int:
    """Remove jobs from blacklisted companies before they reach the database.

    Args:
        jobs_dir: Directory containing job files
        blacklist: List of blacklisted company names

    Returns:
        Number of files deleted
    """
    blacklisted_files = find_blacklisted_companies(jobs_dir, blacklist)

    if blacklisted_files:
        print(f"Removing {len(blacklisted_files)} jobs from blacklisted companies")
        for file_path in blacklisted_files:
            try:
                os.remove(file_path)
            except OSError as e:
                print(f"Warning: Could not delete {file_path}: {e}")

    return len(blacklisted_files)
