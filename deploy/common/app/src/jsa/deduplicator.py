"""Fast job deduplication using RipGrep.

This module provides RipGrep-powered deduplication to quickly check if job URLs
or IDs already exist before database insertion. Falls back to Python when RipGrep
is unavailable.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path
from typing import Any


def get_existing_job_urls(cache_dir: str) -> set[str]:
    """Use ripgrep to extract all job URLs from cached JSON files.

    Faster than loading all JSONs into memory.

    Args:
        cache_dir: Directory containing cached job files

    Returns:
        Set of existing job URLs
    """
    cache_path = Path(cache_dir)
    if not cache_path.exists():
        return set()

    # Check if ripgrep is available
    if shutil.which("rg"):
        return _get_urls_ripgrep(cache_dir)
    else:
        return _get_urls_fallback(cache_dir)


def _get_urls_ripgrep(cache_dir: str) -> set[str]:
    """Extract URLs using RipGrep (fast path)."""
    try:
        result = subprocess.run(
            [
                "rg",
                "--no-filename",
                "--no-heading",
                r'"url":\s*"([^"]+)"',
                "--only-matching",
                "--replace",
                "$1",
                cache_dir,
            ],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )

        urls = set(result.stdout.strip().split("\n"))
        # Remove empty strings
        urls.discard("")
        return urls

    except (subprocess.TimeoutExpired, subprocess.SubprocessError):
        # Fall back to Python if ripgrep fails
        return _get_urls_fallback(cache_dir)


def _get_urls_fallback(cache_dir: str) -> set[str]:
    """Extract URLs using Python file parsing (fallback)."""
    import json

    urls: set[str] = set()
    cache_path = Path(cache_dir)

    for json_file in cache_path.glob("**/*.json"):
        try:
            with open(json_file, encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict) and "url" in data:
                    urls.add(data["url"])
                elif isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and "url" in item:
                            urls.add(item["url"])
        except (OSError, json.JSONDecodeError):
            continue

    return urls


def filter_duplicate_jobs(new_jobs: list[dict[str, Any]], cache_dir: str) -> list[dict[str, Any]]:
    """Remove jobs that already exist in cache before database insertion.

    Args:
        new_jobs: List of new job dictionaries
        cache_dir: Directory containing cached job files

    Returns:
        List of unique jobs not in cache
    """
    existing_urls = get_existing_job_urls(cache_dir)

    unique_jobs = [job for job in new_jobs if job.get("url") not in existing_urls]

    duplicates_found = len(new_jobs) - len(unique_jobs)
    if duplicates_found > 0:
        print(f"Filtered {duplicates_found} duplicate jobs")

    return unique_jobs


def find_similar_titles(title: str, cache_dir: str, threshold: int = 3) -> list[str]:
    """Find similar job titles using fuzzy matching.

    Useful for detecting reposted jobs with slight title variations.

    Args:
        title: Job title to search for
        cache_dir: Directory containing cached job files
        threshold: Minimum similarity threshold (not currently used)

    Returns:
        List of similar job titles
    """
    cache_path = Path(cache_dir)
    if not cache_path.exists():
        return []

    # Check if ripgrep is available
    if shutil.which("rg"):
        return _find_similar_titles_ripgrep(title, cache_dir)
    else:
        return _find_similar_titles_fallback(title, cache_dir)


def _find_similar_titles_ripgrep(title: str, cache_dir: str) -> list[str]:
    """Find similar titles using RipGrep (fast path)."""
    try:
        # Use ripgrep with fuzzy matching pattern
        pattern = title.replace(" ", ".*")
        result = subprocess.run(
            [
                "rg",
                "--no-filename",
                "--ignore-case",
                r'"title":\s*"([^"]*' + pattern + r'[^"]*)"',
                "--only-matching",
                "--replace",
                "$1",
                cache_dir,
            ],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )

        titles = result.stdout.strip().split("\n")
        # Remove empty strings
        return [t for t in titles if t]

    except (subprocess.TimeoutExpired, subprocess.SubprocessError):
        # Fall back to Python if ripgrep fails
        return _find_similar_titles_fallback(title, cache_dir)


def _find_similar_titles_fallback(title: str, cache_dir: str) -> list[str]:
    """Find similar titles using Python file parsing (fallback)."""
    import json

    similar_titles: list[str] = []
    cache_path = Path(cache_dir)
    title_lower = title.lower()

    for json_file in cache_path.glob("**/*.json"):
        try:
            with open(json_file, encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict) and "title" in data:
                    job_title = data["title"]
                    if title_lower in job_title.lower() or job_title.lower() in title_lower:
                        similar_titles.append(job_title)
                elif isinstance(data, list):
                    for item in data:
                        if isinstance(item, dict) and "title" in item:
                            job_title = item["title"]
                            if (
                                title_lower in job_title.lower()
                                or job_title.lower() in title_lower
                            ):
                                similar_titles.append(job_title)
        except (OSError, json.JSONDecodeError):
            continue

    return similar_titles
