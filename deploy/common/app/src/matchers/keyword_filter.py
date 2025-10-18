"""Keyword pre-filtering for optimized job scoring using RipGrep.

This module provides RipGrep-powered keyword filtering to pre-filter jobs before
running expensive scoring algorithms. Falls back to Python when RipGrep is unavailable.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path
from typing import Any


def fast_keyword_filter(
    jobs_dir: str, keywords: list[str], min_matches: int = 2
) -> list[str]:
    """Use ripgrep to find jobs matching at least N keywords.

    Returns list of job file paths to score.

    Args:
        jobs_dir: Directory containing job files
        keywords: List of keywords to search for
        min_matches: Minimum number of keyword matches required

    Returns:
        List of job file paths that match criteria
    """
    jobs_path = Path(jobs_dir)
    if not jobs_path.exists():
        return []

    # Check if ripgrep is available
    if shutil.which("rg"):
        return _filter_ripgrep(jobs_dir, keywords, min_matches)
    else:
        return _filter_fallback(jobs_dir, keywords, min_matches)


def _filter_ripgrep(jobs_dir: str, keywords: list[str], min_matches: int) -> list[str]:
    """Filter jobs using RipGrep (fast path)."""
    if not keywords:
        # No keywords, return all jobs
        try:
            result = subprocess.run(
                ["rg", "--files", "--type", "json", jobs_dir],
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            files = result.stdout.strip().split("\n")
            return [f for f in files if f]
        except (subprocess.TimeoutExpired, subprocess.SubprocessError):
            return _filter_fallback(jobs_dir, keywords, min_matches)

    # Find jobs matching each keyword
    keyword_matches: dict[str, int] = {}

    try:
        for keyword in keywords:
            result = subprocess.run(
                [
                    "rg",
                    "--files-with-matches",
                    "--ignore-case",
                    r"\b" + keyword + r"\b",
                    jobs_dir,
                ],
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )

            files = result.stdout.strip().split("\n")
            for file_path in files:
                if file_path:
                    keyword_matches[file_path] = keyword_matches.get(file_path, 0) + 1

    except (subprocess.TimeoutExpired, subprocess.SubprocessError):
        # Fall back to Python if ripgrep fails
        return _filter_fallback(jobs_dir, keywords, min_matches)

    # Filter to jobs with at least min_matches
    candidate_files = [path for path, count in keyword_matches.items() if count >= min_matches]

    return candidate_files


def _filter_fallback(jobs_dir: str, keywords: list[str], min_matches: int) -> list[str]:
    """Filter jobs using Python file parsing (fallback)."""
    jobs_path = Path(jobs_dir)
    json_files = list(jobs_path.glob("**/*.json"))

    if not keywords:
        # No keywords, return all jobs
        return [str(f) for f in json_files]

    # Normalize keywords for case-insensitive comparison
    keywords_lower = [kw.lower() for kw in keywords]

    candidate_files: list[str] = []

    for json_file in json_files:
        try:
            with open(json_file, encoding="utf-8") as f:
                content = f.read().lower()

            # Count keyword matches
            matches = sum(1 for kw in keywords_lower if kw in content)

            if matches >= min_matches:
                candidate_files.append(str(json_file))

        except OSError:
            continue

    return candidate_files


def optimized_scoring_workflow(jobs_dir: str, config: dict[str, Any]) -> list[tuple[Any, float]]:
    """Two-stage pipeline: fast ripgrep filter + expensive scoring.

    Args:
        jobs_dir: Directory containing job files
        config: Configuration dictionary with keywords and scoring parameters

    Returns:
        List of (job, score) tuples sorted by score descending
    """
    keywords = config.get("keywords", [])

    # Stage 1: Fast filter (ripgrep)
    candidate_files = fast_keyword_filter(jobs_dir, keywords, min_matches=2)
    print(f"RipGrep pre-filter: {len(candidate_files)} candidates from initial scan")

    # Stage 2: Full scoring on candidates only
    scored_jobs: list[tuple[Any, float]] = []

    for file_path in candidate_files:
        try:
            with open(file_path, encoding="utf-8") as f:
                job = json.load(f)

            # Simple scoring placeholder - in real implementation, this would
            # call the actual scoring function from the main codebase
            score = _calculate_simple_score(job, config)
            scored_jobs.append((job, score))

        except (OSError, json.JSONDecodeError):
            continue

    # Sort by score
    scored_jobs.sort(key=lambda x: x[1], reverse=True)

    return scored_jobs


def _calculate_simple_score(job: dict[str, Any], config: dict[str, Any]) -> float:
    """Simple placeholder scoring function.

    In a real implementation, this would call the actual scoring logic.

    Args:
        job: Job dictionary
        config: Configuration dictionary

    Returns:
        Job score as float
    """
    score = 0.0
    keywords = config.get("keywords", [])
    keywords_lower = [kw.lower() for kw in keywords]

    # Get job text fields
    description = job.get("description", "").lower()
    title = job.get("title", "").lower()
    combined_text = f"{title} {description}"

    # Score based on keyword matches
    for keyword in keywords_lower:
        if keyword in combined_text:
            score += 10.0

    return score
