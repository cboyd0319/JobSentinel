#!/usr/bin/env python3
"""
Script to approve and merge all waiting Dependabot PRs.

This script uses the GitHub API to:
1. List all open PRs authored by Dependabot
2. Approve each PR
3. Enable auto-merge or merge directly if CI passes

Usage:
    python scripts/approve_dependabot_prs.py [--dry-run] [--token TOKEN]

Environment Variables:
    GITHUB_TOKEN or GH_TOKEN: GitHub token with repo and PR permissions
"""

import argparse
import os
import sys
import time
from typing import List, Dict, Any
import subprocess
import json


def run_gh_command(args: List[str]) -> Dict[str, Any]:
    """Run a gh CLI command and return the JSON output."""
    cmd = ["gh"] + args
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, check=True
        )
        return json.loads(result.stdout) if result.stdout else {}
    except subprocess.CalledProcessError as e:
        print(f"Error running gh command: {e}", file=sys.stderr)
        print(f"stderr: {e.stderr}", file=sys.stderr)
        raise
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON output: {e}", file=sys.stderr)
        raise


def get_dependabot_prs() -> List[Dict[str, Any]]:
    """Get all open Dependabot PRs."""
    print("Fetching open Dependabot PRs...")
    try:
        # Use gh CLI to list PRs
        result = subprocess.run(
            [
                "gh", "pr", "list",
                "--author", "app/dependabot",
                "--state", "open",
                "--json", "number,title,url,headRefName,mergeable,statusCheckRollup"
            ],
            capture_output=True,
            text=True,
            check=True
        )
        prs = json.loads(result.stdout)
        print(f"Found {len(prs)} Dependabot PRs")
        return prs
    except subprocess.CalledProcessError as e:
        print(f"Error fetching PRs: {e}", file=sys.stderr)
        print(f"stderr: {e.stderr}", file=sys.stderr)
        return []
    except json.JSONDecodeError as e:
        print(f"Error parsing PR list: {e}", file=sys.stderr)
        return []


def approve_pr(pr_number: int, dry_run: bool = False) -> bool:
    """Approve a PR."""
    if dry_run:
        print(f"  [DRY RUN] Would approve PR #{pr_number}")
        return True
    
    try:
        subprocess.run(
            ["gh", "pr", "review", str(pr_number), "--approve", "--body", "🤖 Auto-approved"],
            capture_output=True,
            text=True,
            check=True
        )
        print(f"  ✅ Approved PR #{pr_number}")
        return True
    except subprocess.CalledProcessError as e:
        # Check if already approved
        if "already approved" in e.stderr.lower():
            print(f"  ℹ️  PR #{pr_number} already approved")
            return True
        print(f"  ❌ Error approving PR #{pr_number}: {e.stderr}")
        return False


def enable_automerge(pr_number: int, dry_run: bool = False) -> bool:
    """Enable auto-merge for a PR."""
    if dry_run:
        print(f"  [DRY RUN] Would enable auto-merge for PR #{pr_number}")
        return True
    
    try:
        subprocess.run(
            ["gh", "pr", "merge", str(pr_number), "--auto", "--squash"],
            capture_output=True,
            text=True,
            check=True
        )
        print(f"  ✅ Enabled auto-merge for PR #{pr_number}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  ⚠️  Could not enable auto-merge for PR #{pr_number}: {e.stderr}")
        return False


def merge_pr(pr_number: int, dry_run: bool = False) -> bool:
    """Directly merge a PR."""
    if dry_run:
        print(f"  [DRY RUN] Would merge PR #{pr_number}")
        return True
    
    try:
        subprocess.run(
            ["gh", "pr", "merge", str(pr_number), "--squash", "--delete-branch"],
            capture_output=True,
            text=True,
            check=True
        )
        print(f"  ✅ Merged PR #{pr_number}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"  ❌ Error merging PR #{pr_number}: {e.stderr}")
        return False


def check_ci_status(pr: Dict[str, Any]) -> str:
    """Check the CI status of a PR."""
    status_rollup = pr.get("statusCheckRollup", [])
    if not status_rollup:
        return "unknown"
    
    # Check if any checks are failing
    for check in status_rollup:
        if check.get("conclusion") == "FAILURE":
            return "failure"
        if check.get("state") == "PENDING":
            return "pending"
    
    return "success"


def main():
    parser = argparse.ArgumentParser(
        description="Approve and merge all waiting Dependabot PRs"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="List PRs without approving or merging",
    )
    parser.add_argument(
        "--token",
        help="GitHub token (can also use GITHUB_TOKEN or GH_TOKEN env var)",
    )
    args = parser.parse_args()

    # Check for GitHub token
    token = args.token or os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if token and not os.environ.get("GH_TOKEN"):
        os.environ["GH_TOKEN"] = token

    # Check if gh CLI is available
    try:
        subprocess.run(["gh", "--version"], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Error: GitHub CLI (gh) is not installed or not in PATH", file=sys.stderr)
        print("Install it from: https://cli.github.com/", file=sys.stderr)
        sys.exit(1)

    if args.dry_run:
        print("🔍 Running in DRY RUN mode - no changes will be made\n")

    # Get all Dependabot PRs
    prs = get_dependabot_prs()
    
    if not prs:
        print("No Dependabot PRs found. Nothing to do.")
        return 0

    # Process each PR
    approved_count = 0
    merged_count = 0
    failed_count = 0

    for pr in prs:
        pr_number = pr["number"]
        title = pr["title"]
        url = pr["url"]
        
        print(f"\n📦 Processing PR #{pr_number}: {title}")
        print(f"   URL: {url}")
        
        # Check CI status
        ci_status = check_ci_status(pr)
        print(f"   CI Status: {ci_status}")
        
        # Approve the PR
        if approve_pr(pr_number, args.dry_run):
            approved_count += 1
        else:
            failed_count += 1
            continue
        
        # If CI is passing, try to merge or enable auto-merge
        if ci_status == "success":
            if enable_automerge(pr_number, args.dry_run):
                merged_count += 1
            else:
                # Try direct merge
                if merge_pr(pr_number, args.dry_run):
                    merged_count += 1
                else:
                    failed_count += 1
        elif ci_status == "pending":
            print(f"   ⏳ CI is still pending, enabling auto-merge")
            if enable_automerge(pr_number, args.dry_run):
                merged_count += 1
        else:
            print(f"   ⚠️  CI checks are failing, skipping merge")
            failed_count += 1

    # Print summary
    print("\n" + "=" * 60)
    print("📊 Summary:")
    print(f"   Total PRs processed: {len(prs)}")
    print(f"   ✅ Approved: {approved_count}")
    print(f"   🔀 Merged/Auto-merge enabled: {merged_count}")
    print(f"   ❌ Failed: {failed_count}")
    print("=" * 60)
    
    return 0 if failed_count == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
