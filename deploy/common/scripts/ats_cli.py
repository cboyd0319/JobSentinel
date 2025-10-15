#!/usr/bin/env python
"""Lightweight CLI wrapper for the modular ATS analyzer (Alpha).

Usage:
  python scripts/ats_cli.py scan --resume path/to/resume.txt [--job path/to/jd.txt] [--fuzzy]
  python scripts/ats_cli.py json --resume path/to/resume.txt [--job path/to/jd.txt]

Notes:
  - Intentionally minimal; no PDF/DOCX parsing here (pre-process externally or integrate resume_parser later).
  - Outputs human summary (scan) or raw JSON (json).
  - Fuzzy matching requires rapidfuzz and may auto-disable for very large token sets.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from utils.ats_analyzer import analyze_resume


def load_text(path: str | None) -> str | None:
    if not path:
        return None
    p = Path(path)
    if not p.exists():
        print(f"[error] File not found: {path}", file=sys.stderr)
        sys.exit(2)
    return p.read_text(encoding="utf-8", errors="ignore")


def format_summary(result) -> str:
    lines = []
    lines.append(f"Overall Score: {result.overall_score:.1f}")
    lines.append("")
    lines.append("Dimension Scores:")
    for k, v in sorted(result.dimension_scores.items()):
        lines.append(f"  - {k}: {v:.1f}")
    if result.issues:
        lines.append("")
        lines.append("Issues:")
        for issue in result.issues[:25]:  # cap display
            lines.append(f"  [{issue.severity}] {issue.dimension}: {issue.message}")
            if issue.suggestion:
                lines.append(f"      → {issue.suggestion}")
        if len(result.issues) > 25:
            lines.append(f"  ... {len(result.issues)-25} more not shown")
    lines.append("")
    lines.append("Alpha: Scores are heuristic; treat as directional guidance.")
    return "\n".join(lines)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="ATS Analyzer CLI (Alpha)")
    sub = parser.add_subparsers(dest="command", required=True)

    scan_p = sub.add_parser("scan", help="Run analysis and print human summary")
    scan_p.add_argument(
        "--resume",
        required=True,
        help="Path to plain-text resume (use external tool to extract from PDF)",
    )
    scan_p.add_argument("--job", help="Path to job description text file")
    scan_p.add_argument(
        "--fuzzy", action="store_true", help="Enable fuzzy term matching (needs rapidfuzz)"
    )

    json_p = sub.add_parser("json", help="Run analysis and emit JSON")
    json_p.add_argument("--resume", required=True)
    json_p.add_argument("--job")
    json_p.add_argument("--fuzzy", action="store_true")

    args = parser.parse_args(argv)

    resume_text = load_text(args.resume)
    job_text = load_text(getattr(args, "job", None))

    try:
        result = analyze_resume(
            resume_text=resume_text,
            job_description=job_text,
            enable_fuzzy=bool(getattr(args, "fuzzy", False)),
            collect_timing=True,
        )
    except Exception as e:  # broad for user-friendly CLI
        print(f"[error] Analysis failed: {e}", file=sys.stderr)
        return 1

    if args.command == "scan":
        print(format_summary(result))
        return 0
    else:  # json
        # Convert dataclasses in issues
        payload: dict[str, Any] = {
            "overall_score": result.overall_score,
            "dimension_scores": result.dimension_scores,
            "weights": result.weights,
            "issues": [issue.__dict__ for issue in result.issues],
            "metadata": result.metadata,
        }
        print(json.dumps(payload, indent=2))
        return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main(sys.argv[1:]))
