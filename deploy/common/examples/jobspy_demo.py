"""JobSpy MCP multi-site aggregation demo.

This script demonstrates how you could aggregate jobs from multiple sources
using the JobSpy MCP server integration. It is intentionally NOT collected
by pytest (file does not start with test_) so that the core test suite stays
fast and deterministic.

To run manually:
  python examples/jobspy_demo.py

Prerequisites:
  - Install JobSpy MCP server: https://github.com/borgius/jobspy-mcp-server
  - Configure path in config/user_prefs.json if required

DISCLAIMER: Some upstream sites may have Terms of Service restrictions.
Use aggregated scraped data responsibly and as a supplemental source.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

# Add project root to path for direct script execution
sys.path.insert(0, str(Path(__file__).parent.parent / "app" / "src"))

from sources.jobspy_mcp_scraper import search_multi_site_jobs  # noqa: E402
from utils.logging import setup_logging  # noqa: E402

logger = setup_logging(log_level="INFO")


async def demo_basic_search() -> None:
    """Basic multi-site job search."""
    print("\n" + "=" * 80)
    print("DEMO 1: Basic Multi-Site Search")
    print("=" * 80)

    jobs = await search_multi_site_jobs(
        keywords=["python", "engineer"],
        location="Denver, CO",
        sites=["indeed", "zip_recruiter"],
        results_per_site=10,
    )

    print(f"\n[OK] Found {len(jobs)} jobs from multi-site search")
    if not jobs:
        return

    site_counts: dict[str, int] = {}
    for job in jobs:
        site = job.get("jobspy_site", "unknown")
        site_counts[site] = site_counts.get(site, 0) + 1

    print("\nJobs by source:")
    for site, count in site_counts.items():
        print(f" - {site}: {count} jobs")

    print("\nSample job:")
    sample = jobs[0]
    print(f" Title: {sample.get('title')}")
    print(f" Company: {sample.get('company')}")
    print(f" Location: {sample.get('location')}")
    print(f" URL: {sample.get('url')}")
    print(f" Source: {sample.get('jobspy_site')}")


async def demo_remote_jobs() -> None:
    print("\n" + "=" * 80)
    print("DEMO 2: Remote Jobs Across Multiple Sites")
    print("=" * 80)

    jobs = await search_multi_site_jobs(
        keywords=["remote", "devops"],
        location="Remote",
        sites=["indeed", "zip_recruiter", "google"],
        results_per_site=15,
        hours_old=48,
    )
    print(f"\n[OK] Found {len(jobs)} remote DevOps jobs (last 48 hours)")
    if not jobs:
        return

    print("\nRecent remote opportunities:")
    for i, job in enumerate(jobs[:5], 1):
        print(f"\n {i}. {job.get('title')}")
        print(f" Company: {job.get('company')}")
        print(f" Source: {job.get('jobspy_site')}")
        # CodeQL false positive: Only prints job info, no secrets or sensitive data
        print(f" Posted: {job.get('posted_date', 'Unknown')}")


async def demo_salary_data() -> None:
    print("\n" + "=" * 80)
    print("DEMO 3: Salary Information Extraction")
    print("=" * 80)

    jobs = await search_multi_site_jobs(
        keywords=["senior", "software", "engineer"],
        location="San Francisco, CA",
        sites=["indeed", "zip_recruiter"],
        results_per_site=10,
    )
    print(f"\n[OK] Found {len(jobs)} senior software engineer jobs")
    jobs_with_salary = [j for j in jobs if j.get("salary")]
    print(f" {len(jobs_with_salary)} jobs have salary information")
    if not jobs_with_salary:
        return
    print("\nSalary breakdown:")
    for i, job in enumerate(jobs_with_salary[:5], 1):
        print(f" {i}. {job.get('title')} at {job.get('company')} — {job.get('salary')}")


async def demo_deduplication() -> None:
    print("\n" + "=" * 80)
    print("DEMO 4: Deduplication Test")
    print("=" * 80)

    jobs = await search_multi_site_jobs(
        keywords=["python"],
        location="New York, NY",
        sites=["indeed", "zip_recruiter", "google"],
        results_per_site=15,
    )
    print(f"\n Total jobs returned: {len(jobs)}")
    urls = [job.get("url") for job in jobs]
    unique_urls = set(urls)
    print(f" Unique URLs: {len(unique_urls)}")
    job_keys = {f"{job.get('company','')}|{job.get('title','')}" for job in jobs}
    print(f" Unique company+title combinations: {len(job_keys)}")
    if len(jobs) > len(unique_urls):
        print(f"\n[OK] Potential duplicates: {len(jobs) - len(unique_urls)} (by URL)")
    if len(jobs) > len(job_keys):
        print(f"[OK] Potential similar roles: {len(jobs) - len(job_keys)} (company+title)")


async def demo_freshness() -> None:
    print("\n" + "=" * 80)
    print("DEMO 5: Job Freshness Filtering")
    print("=" * 80)

    recent_jobs = await search_multi_site_jobs(
        keywords=["software", "engineer"],
        location="Seattle, WA",
        sites=["indeed", "zip_recruiter"],
        results_per_site=10,
        hours_old=24,
    )
    print(f"\n[OK] Found {len(recent_jobs)} jobs posted in last 24 hours")
    week_jobs = await search_multi_site_jobs(
        keywords=["software", "engineer"],
        location="Seattle, WA",
        sites=["indeed", "zip_recruiter"],
        results_per_site=10,
        hours_old=168,
    )
    print(f"[OK] Found {len(week_jobs)} jobs posted in last 7 days")
    if recent_jobs:
        print("\nFresh jobs (last 24h):")
        for i, job in enumerate(recent_jobs[:3], 1):
            print(f" {i}. {job.get('title')} at {job.get('company')}")


async def main() -> None:
    print("\n" + "=" * 80)
    print("JobSpy MCP Aggregation Demo")
    print("=" * 80)
    print("Aggregating multiple sources (Indeed, ZipRecruiter, Google, etc.)")
    print("This may involve scraping; respect each site's ToS.")
    print("=" * 80)
    try:
        await demo_basic_search()
        await demo_remote_jobs()
        await demo_salary_data()
        await demo_deduplication()
        await demo_freshness()
    except FileNotFoundError:
        print("\n[ERROR] JobSpy MCP server not found. Install from:")
        print(" https://github.com/borgius/jobspy-mcp-server")
    except Exception as exc:  # pragma: no cover - demo robustness
        print(f"\n[ERROR] Demo failed: {exc}")
    else:
        print("\n" + "=" * 80)
        print("[OK] Demo complete")
        print("=" * 80)


if __name__ == "__main__":  # Manual execution only
    asyncio.run(main())
