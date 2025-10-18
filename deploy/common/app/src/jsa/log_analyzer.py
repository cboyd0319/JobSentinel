"""Log analysis for debugging using RipGrep.

This module provides RipGrep-powered log analysis to find failures, rate-limit warnings,
and performance bottlenecks. Falls back to Python when RipGrep is unavailable.
"""

from __future__ import annotations

import shutil
import subprocess
from collections import Counter
from pathlib import Path
from typing import Any


def analyze_scraper_logs(log_dir: str, since: str = "1 day ago") -> dict[str, list[str]]:
    """Use ripgrep to extract errors and warnings from log files.

    Args:
        log_dir: Directory containing log files
        since: Time filter (not currently implemented)

    Returns:
        Dictionary with categorized log entries
    """
    log_path = Path(log_dir)
    if not log_path.exists():
        return {"errors": [], "warnings": [], "rate_limits": [], "slow_requests": []}

    # Check if ripgrep is available
    if shutil.which("rg"):
        return _analyze_logs_ripgrep(log_dir)
    else:
        return _analyze_logs_fallback(log_dir)


def _analyze_logs_ripgrep(log_dir: str) -> dict[str, list[str]]:
    """Analyze logs using RipGrep (fast path)."""
    stats: dict[str, list[str]] = {
        "errors": [],
        "warnings": [],
        "rate_limits": [],
        "slow_requests": [],
    }

    try:
        # Find errors
        errors_result = subprocess.run(
            ["rg", "--line-number", "--no-heading", r"ERROR|Exception|Traceback", log_dir],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )

        for line in errors_result.stdout.strip().split("\n"):
            if line:
                stats["errors"].append(line)

        # Find rate limit warnings
        rate_limit_result = subprocess.run(
            [
                "rg",
                "--line-number",
                "--no-heading",
                r"Rate limit|429|503|Too many requests",
                log_dir,
            ],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )

        for line in rate_limit_result.stdout.strip().split("\n"):
            if line:
                stats["rate_limits"].append(line)

        # Find slow requests (>5s)
        slow_result = subprocess.run(
            [
                "rg",
                "--line-number",
                "--no-heading",
                r"Request took [5-9]\d+ms|Request took \d{5,}ms",
                log_dir,
            ],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )

        for line in slow_result.stdout.strip().split("\n"):
            if line:
                stats["slow_requests"].append(line)

    except (subprocess.TimeoutExpired, subprocess.SubprocessError):
        # Fall back to Python if ripgrep fails
        return _analyze_logs_fallback(log_dir)

    return stats


def _analyze_logs_fallback(log_dir: str) -> dict[str, list[str]]:
    """Analyze logs using Python file parsing (fallback)."""
    stats: dict[str, list[str]] = {
        "errors": [],
        "warnings": [],
        "rate_limits": [],
        "slow_requests": [],
    }

    log_path = Path(log_dir)

    for log_file in log_path.glob("**/*.log"):
        try:
            with open(log_file, encoding="utf-8") as f:
                for line_num, line in enumerate(f, 1):
                    line_with_num = f"{log_file.name}:{line_num}:{line.rstrip()}"

                    # Check for errors
                    if any(
                        pattern in line for pattern in ["ERROR", "Exception", "Traceback"]
                    ):
                        stats["errors"].append(line_with_num)

                    # Check for rate limits
                    if any(
                        pattern in line
                        for pattern in ["Rate limit", "429", "503", "Too many requests"]
                    ):
                        stats["rate_limits"].append(line_with_num)

                    # Check for slow requests (simple pattern)
                    if "Request took" in line and "ms" in line:
                        # Extract milliseconds and check if > 5000
                        try:
                            parts = line.split("Request took")
                            if len(parts) > 1:
                                ms_part = parts[1].split("ms")[0].strip()
                                if ms_part.isdigit() and int(ms_part) > 5000:
                                    stats["slow_requests"].append(line_with_num)
                        except (ValueError, IndexError):
                            pass

        except OSError:
            continue

    return stats


def generate_health_report(log_dir: str, output_path: str = "health_report.txt") -> dict[str, Any]:
    """Generate scraper health report from logs.

    Args:
        log_dir: Directory containing log files
        output_path: Path to output report file

    Returns:
        Statistics dictionary
    """
    stats = analyze_scraper_logs(log_dir)

    try:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("=== JobSentinel Health Report ===\n\n")

            f.write(f"Errors Found: {len(stats['errors'])}\n")
            if stats["errors"]:
                f.write("\nRecent Errors:\n")
                for error in stats["errors"][:10]:
                    f.write(f"  {error}\n")

            f.write(f"\nRate Limit Hits: {len(stats['rate_limits'])}\n")
            if stats["rate_limits"]:
                f.write("\nRecent Rate Limits:\n")
                for rl in stats["rate_limits"][:10]:
                    f.write(f"  {rl}\n")

            f.write(f"\nSlow Requests: {len(stats['slow_requests'])}\n")

            # Health status
            if len(stats["errors"]) == 0 and len(stats["rate_limits"]) < 5:
                f.write("\n✅ System Health: GOOD\n")
            elif len(stats["errors"]) > 10 or len(stats["rate_limits"]) > 20:
                f.write("\n⚠️  System Health: DEGRADED - Review logs\n")
            else:
                f.write("\n⚠️  System Health: FAIR\n")

    except OSError as e:
        print(f"Warning: Could not write report to {output_path}: {e}")

    return stats


def find_failed_sources(log_dir: str) -> list[tuple[str, int]]:
    """Identify which job sources are failing most frequently.

    Args:
        log_dir: Directory containing log files

    Returns:
        List of (source_name, failure_count) tuples
    """
    log_path = Path(log_dir)
    if not log_path.exists():
        return []

    # Check if ripgrep is available
    if shutil.which("rg"):
        return _find_failed_sources_ripgrep(log_dir)
    else:
        return _find_failed_sources_fallback(log_dir)


def _find_failed_sources_ripgrep(log_dir: str) -> list[tuple[str, int]]:
    """Find failed sources using RipGrep (fast path)."""
    try:
        result = subprocess.run(
            [
                "rg",
                "--no-filename",
                r"Source: (\w+).*ERROR",
                "--only-matching",
                "--replace",
                "$1",
                log_dir,
            ],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )

        sources = result.stdout.strip().split("\n")
        # Remove empty strings
        sources = [s for s in sources if s]
        failed_sources = Counter(sources).most_common()

        return failed_sources

    except (subprocess.TimeoutExpired, subprocess.SubprocessError):
        # Fall back to Python if ripgrep fails
        return _find_failed_sources_fallback(log_dir)


def _find_failed_sources_fallback(log_dir: str) -> list[tuple[str, int]]:
    """Find failed sources using Python file parsing (fallback)."""
    import re

    sources: list[str] = []
    log_path = Path(log_dir)

    pattern = re.compile(r"Source: (\w+).*ERROR")

    for log_file in log_path.glob("**/*.log"):
        try:
            with open(log_file, encoding="utf-8") as f:
                for line in f:
                    match = pattern.search(line)
                    if match:
                        sources.append(match.group(1))
        except OSError:
            continue

    return Counter(sources).most_common()
