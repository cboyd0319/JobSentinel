"""Resume keyword optimization using RipGrep for fast analysis.

This module provides RipGrep-powered resume analysis to identify missing keywords
and improve job match rates. Falls back to Python file parsing when RipGrep is unavailable.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from collections import Counter
from pathlib import Path
from typing import Any


def extract_keywords_from_jobs(jobs_dir: str, top_n: int = 50) -> Counter[str]:
    """Use ripgrep to extract common keywords from job descriptions.

    Faster than parsing all JSON files individually.

    Args:
        jobs_dir: Directory containing job JSON files
        top_n: Number of top keywords to return

    Returns:
        Counter with most common keywords
    """
    jobs_path = Path(jobs_dir)
    if not jobs_path.exists():
        return Counter()

    # Check if ripgrep is available
    if shutil.which("rg"):
        return _extract_keywords_ripgrep(jobs_dir, top_n)
    else:
        return _extract_keywords_fallback(jobs_dir, top_n)


def _extract_keywords_ripgrep(jobs_dir: str, top_n: int) -> Counter[str]:
    """Extract keywords using RipGrep (fast path)."""
    keywords: list[str] = []

    try:
        # Extract all job descriptions
        result = subprocess.run(
            [
                "rg",
                "--json",
                "--type",
                "json",
                r'"description":\s*"([^"]*)"',
                jobs_dir,
            ],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )

        for line in result.stdout.strip().split("\n"):
            if line:
                try:
                    data = json.loads(line)
                    if data.get("type") == "match":
                        text = data["data"]["lines"]["text"]
                        # Extract words (simple tokenization)
                        words = text.lower().split()
                        keywords.extend([w for w in words if len(w) > 3])
                except json.JSONDecodeError:
                    pass

    except (subprocess.TimeoutExpired, subprocess.SubprocessError):
        # Fall back to Python if ripgrep fails
        return _extract_keywords_fallback(jobs_dir, top_n)

    return Counter(keywords).most_common(top_n)


def _extract_keywords_fallback(jobs_dir: str, top_n: int) -> Counter[str]:
    """Extract keywords using Python file parsing (fallback)."""
    keywords: list[str] = []
    jobs_path = Path(jobs_dir)

    for json_file in jobs_path.glob("**/*.json"):
        try:
            with open(json_file, encoding="utf-8") as f:
                data = json.load(f)
                description = data.get("description", "")
                if description:
                    words = description.lower().split()
                    keywords.extend([w for w in words if len(w) > 3])
        except (OSError, json.JSONDecodeError):
            continue

    return Counter(keywords).most_common(top_n)


def analyze_resume_gaps(resume_path: str, target_keywords: list[str]) -> dict[str, Any]:
    """Compare resume against target keywords using ripgrep.

    Returns missing keywords and coverage percentage.

    Args:
        resume_path: Path to resume file
        target_keywords: List of keywords to check for

    Returns:
        Dictionary with found keywords, missing keywords, coverage percentage, and recommendation
    """
    resume_file = Path(resume_path)
    if not resume_file.exists():
        return {
            "found": [],
            "missing": target_keywords,
            "coverage_pct": 0.0,
            "recommendation": "Resume file not found",
        }

    # Check if ripgrep is available
    if shutil.which("rg"):
        return _analyze_resume_ripgrep(resume_path, target_keywords)
    else:
        return _analyze_resume_fallback(resume_path, target_keywords)


def _analyze_resume_ripgrep(resume_path: str, target_keywords: list[str]) -> dict[str, Any]:
    """Analyze resume using RipGrep (fast path)."""
    found_keywords: list[str] = []
    missing_keywords: list[str] = []

    for keyword in target_keywords:
        try:
            result = subprocess.run(
                ["rg", "--ignore-case", "--quiet", r"\b" + keyword + r"\b", resume_path],
                capture_output=True,
                timeout=5,
                check=False,
            )

            if result.returncode == 0:
                found_keywords.append(keyword)
            else:
                missing_keywords.append(keyword)
        except (subprocess.TimeoutExpired, subprocess.SubprocessError):
            # Treat as missing on error
            missing_keywords.append(keyword)

    coverage = len(found_keywords) / len(target_keywords) * 100 if target_keywords else 0

    return {
        "found": found_keywords,
        "missing": missing_keywords,
        "coverage_pct": coverage,
        "recommendation": (
            "Add missing keywords to improve match rates"
            if missing_keywords
            else "Resume well-optimized"
        ),
    }


def _analyze_resume_fallback(resume_path: str, target_keywords: list[str]) -> dict[str, Any]:
    """Analyze resume using Python (fallback)."""
    try:
        with open(resume_path, encoding="utf-8") as f:
            resume_text = f.read().lower()
    except OSError:
        return {
            "found": [],
            "missing": target_keywords,
            "coverage_pct": 0.0,
            "recommendation": "Could not read resume file",
        }

    found_keywords = [kw for kw in target_keywords if kw.lower() in resume_text]
    missing_keywords = [kw for kw in target_keywords if kw.lower() not in resume_text]

    coverage = len(found_keywords) / len(target_keywords) * 100 if target_keywords else 0

    return {
        "found": found_keywords,
        "missing": missing_keywords,
        "coverage_pct": coverage,
        "recommendation": (
            "Add missing keywords to improve match rates"
            if missing_keywords
            else "Resume well-optimized"
        ),
    }


def generate_resume_report(
    resume_path: str, jobs_dir: str, output_path: str = "resume_analysis.txt"
) -> dict[str, Any]:
    """Generate comprehensive resume optimization report.

    Args:
        resume_path: Path to resume file
        jobs_dir: Directory containing job JSON files
        output_path: Path to output report file

    Returns:
        Analysis dictionary with found/missing keywords and coverage
    """
    # Extract top keywords from recent jobs
    top_keywords = extract_keywords_from_jobs(jobs_dir, top_n=100)

    # Filter for skill-related keywords (simple heuristic)
    common_skills = [
        "python",
        "java",
        "javascript",
        "kubernetes",
        "aws",
        "azure",
        "gcp",
        "react",
        "sql",
        "api",
        "docker",
        "ci/cd",
        "git",
        "linux",
        "terraform",
        "graphql",
        "fastapi",
        "django",
        "flask",
        "nodejs",
        "typescript",
        "mongodb",
        "postgresql",
        "redis",
        "kafka",
    ]

    skill_keywords = [kw for kw, _ in top_keywords if kw in common_skills]

    # Analyze gaps
    analysis = analyze_resume_gaps(resume_path, skill_keywords)

    # Write report
    try:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write("=== JobSentinel Resume Analysis Report ===\n\n")
            f.write(f"Resume Coverage: {analysis['coverage_pct']:.1f}%\n\n")

            f.write("Keywords Found in Resume:\n")
            for kw in analysis["found"][:20]:
                f.write(f"  ✓ {kw}\n")

            f.write("\nMissing Keywords (consider adding):\n")
            for kw in analysis["missing"][:20]:
                f.write(f"  ✗ {kw}\n")

            f.write(f"\n{analysis['recommendation']}\n")
    except OSError as e:
        print(f"Warning: Could not write report to {output_path}: {e}")

    return analysis
