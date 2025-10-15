#!/usr/bin/env python3
"""Demonstration of ATS analyzer default plugins.

Run:
  python examples/plugin_demo.py --resume path/to/resume.txt [--jd path/to/jd.txt]

Shows:
  - Overall/component scores (including plugin dimensions)
  - Plugin metadata JSON (per-plugin detailed signals)
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from utils.ats_analyzer import (
    ATSAnalysisResult,
    ATSAnalyzer,
    Issue,
    register_analyzer_plugin,
    register_default_plugins,
)

# Register default plugins (idempotent)
register_default_plugins()


# Example of adding a quick custom plugin inline (for illustration)
def custom_focus_plugin(text: str, ctx: dict):
    """Scores how often 'cloud' appears relative to length (toy example)."""
    lower = text.lower()
    count = lower.count("cloud")
    length = max(1, len(text.split()))
    ratio = count / length
    score = min(100.0, ratio * 4000)  # generous scaling
    meta = {"cloud_mentions": count, "words": length, "ratio": round(ratio, 4)}
    issues = []
    if count == 0:
        issues.append(
            Issue(
                level="info",
                category="cloud_focus",
                message="No 'cloud' mentions detected",
                suggestion="Reference relevant cloud technologies if appropriate",
            )
        )
    return score, issues, meta


register_analyzer_plugin("cloud_focus", 0.02, custom_focus_plugin)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--resume", required=True, help="Path to resume text or markdown")
    ap.add_argument("--jd", help="Optional job description path")
    args = ap.parse_args()

    resume_text = Path(args.resume).read_text(encoding="utf-8", errors="ignore")
    jd_text = Path(args.jd).read_text(encoding="utf-8", errors="ignore") if args.jd else None

    analyzer = ATSAnalyzer()
    result: ATSAnalysisResult = analyzer.analyze(resume_text=resume_text, job_description=jd_text)

    print("Overall Score:", result.overall_score)
    print("Component Scores:")
    for k, v in sorted(result.component_scores.items()):
        print(f"  - {k}: {v:.2f}")
    print("\nPlugin Metadata:")
    print(json.dumps(result.plugin_metadata, indent=2, ensure_ascii=False))
    if result.issues:
        print("\nIssues:")
        for iss in result.issues[:20]:
            print(f"  [{iss.level}] {iss.category}: {iss.message}")
    print("\nRecommendations:")
    for r in result.recommendations:
        print(" -", r)


if __name__ == "__main__":
    main()
