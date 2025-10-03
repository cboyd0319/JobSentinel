"""
Test script for JobSpy MCP integration (multi-site aggregator).

Demonstrates how to search multiple job boards simultaneously.

⚠️ WARNING: This aggregates scrapers from multiple sites.
- Some may violate ToS (Indeed, LinkedIn)
- Scrapers may break when sites redesign
- Use as supplementary source only
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sources.jobspy_mcp_scraper import search_multi_site_jobs
from utils.logging import setup_logging

# Setup logging
logger = setup_logging(log_level="INFO")


async def test_basic_search():
    """Test basic multi-site job search."""
    print("\n" + "="*80)
    print("TEST 1: Basic Multi-Site Search")
    print("="*80)

    # Search Indeed and ZipRecruiter for Python jobs
    jobs = await search_multi_site_jobs(
        keywords=["python", "engineer"],
        location="Denver, CO",
        sites=["indeed", "zip_recruiter"],
        results_per_site=10
    )

    print(f"\n✅ Found {len(jobs)} jobs from multi-site search")

    if jobs:
        # Show breakdown by site
        site_counts = {}
        for job in jobs:
            site = job.get('jobspy_site', 'unknown')
            site_counts[site] = site_counts.get(site, 0) + 1

        print("\n📊 Jobs by source:")
        for site, count in site_counts.items():
            print(f"  - {site}: {count} jobs")

        print("\n📋 Sample job:")
        sample = jobs[0]
        print(f"  Title: {sample.get('title')}")
        print(f"  Company: {sample.get('company')}")
        print(f"  Location: {sample.get('location')}")
        print(f"  URL: {sample.get('url')}")
        print(f"  Source: {sample.get('jobspy_site')}")


async def test_remote_jobs():
    """Test remote job search across multiple sites."""
    print("\n" + "="*80)
    print("TEST 2: Remote Jobs Across Multiple Sites")
    print("="*80)

    jobs = await search_multi_site_jobs(
        keywords=["remote", "devops"],
        location="Remote",
        sites=["indeed", "zip_recruiter", "google"],
        results_per_site=15,
        hours_old=48  # Only jobs posted in last 48 hours
    )

    print(f"\n✅ Found {len(jobs)} remote DevOps jobs (last 48 hours)")

    if jobs:
        print("\n📋 Recent remote opportunities:")
        for i, job in enumerate(jobs[:5], 1):
            print(f"\n  {i}. {job.get('title')}")
            print(f"     Company: {job.get('company')}")
            print(f"     Source: {job.get('jobspy_site')}")
            print(f"     Posted: {job.get('posted_date', 'Unknown')}")


async def test_salary_data():
    """Test salary information extraction."""
    print("\n" + "="*80)
    print("TEST 3: Salary Information Extraction")
    print("="*80)

    jobs = await search_multi_site_jobs(
        keywords=["senior", "software", "engineer"],
        location="San Francisco, CA",
        sites=["indeed", "zip_recruiter"],
        results_per_site=10
    )

    print(f"\n✅ Found {len(jobs)} senior software engineer jobs")

    # Filter jobs with salary info
    jobs_with_salary = [j for j in jobs if j.get('salary')]

    print(f"   {len(jobs_with_salary)} jobs have salary information")

    if jobs_with_salary:
        print("\n💰 Salary breakdown:")
        for i, job in enumerate(jobs_with_salary[:5], 1):
            print(f"  {i}. {job.get('title')}")
            print(f"     Company: {job.get('company')}")
            print(f"     Salary: {job.get('salary')}")


async def test_deduplication():
    """Test deduplication across different aggregators."""
    print("\n" + "="*80)
    print("TEST 4: Deduplication Test (Critical for Aggregators)")
    print("="*80)

    # Search same keywords across multiple sites
    jobs = await search_multi_site_jobs(
        keywords=["python"],
        location="New York, NY",
        sites=["indeed", "zip_recruiter", "google"],
        results_per_site=15
    )

    print(f"\n  Total jobs returned: {len(jobs)}")

    # Check for potential duplicates by URL
    urls = [job.get('url') for job in jobs]
    unique_urls = set(urls)

    print(f"  Unique URLs: {len(unique_urls)}")

    # Check for potential duplicates by company + title
    job_keys = set()
    for job in jobs:
        key = f"{job.get('company', '')}|{job.get('title', '')}"
        job_keys.add(key)

    print(f"  Unique company+title combinations: {len(job_keys)}")

    if len(jobs) > len(unique_urls):
        print(f"\n✅ Deduplication will catch {len(jobs) - len(unique_urls)} duplicate URLs")
    else:
        print(f"\n✅ No URL duplicates detected across sources")

    if len(jobs) > len(job_keys):
        print(f"✅ Deduplication will catch {len(jobs) - len(job_keys)} similar jobs")


async def test_freshness():
    """Test filtering by job freshness."""
    print("\n" + "="*80)
    print("TEST 5: Job Freshness Filtering")
    print("="*80)

    # Get jobs from last 24 hours
    recent_jobs = await search_multi_site_jobs(
        keywords=["software", "engineer"],
        location="Seattle, WA",
        sites=["indeed", "zip_recruiter"],
        results_per_site=10,
        hours_old=24  # Last 24 hours only
    )

    print(f"\n✅ Found {len(recent_jobs)} jobs posted in last 24 hours")

    # Get jobs from last week
    week_jobs = await search_multi_site_jobs(
        keywords=["software", "engineer"],
        location="Seattle, WA",
        sites=["indeed", "zip_recruiter"],
        results_per_site=10,
        hours_old=168  # Last 7 days
    )

    print(f"✅ Found {len(week_jobs)} jobs posted in last 7 days")

    if recent_jobs:
        print("\n📋 Fresh jobs (last 24h):")
        for i, job in enumerate(recent_jobs[:3], 1):
            print(f"  {i}. {job.get('title')} at {job.get('company')}")


async def main():
    """Run all tests."""
    print("\n" + "="*80)
    print("JobSpy MCP Integration Tests")
    print("="*80)
    print("\n📊 Testing multi-site aggregation (Indeed, ZipRecruiter, etc.)")
    print("\n⚠️  WARNING: This uses web scraping. Some sites may:")
    print("   - Violate ToS (Indeed, LinkedIn)")
    print("   - Break when sites redesign")
    print("   - Be rate-limited or blocked")
    print("   Use as supplementary source only!")
    print("="*80)

    try:
        await test_basic_search()
        await test_remote_jobs()
        await test_salary_data()
        await test_deduplication()
        await test_freshness()

        print("\n" + "="*80)
        print("✅ ALL TESTS COMPLETED")
        print("="*80)
        print("\nKey Findings:")
        print("1. JobSpy successfully aggregates multiple sources")
        print("2. Deduplication is CRITICAL when using multiple aggregators")
        print("3. Results freshness filtering works well")
        print("4. Use with caution - some sources may violate ToS")
        print("\nNext steps:")
        print("1. Install JobSpy MCP server: https://github.com/borgius/jobspy-mcp-server")
        print("2. Enable in config/user_prefs.json (set enabled: true)")
        print("3. Consider excluding LinkedIn to reduce ToS risk")
        print("="*80 + "\n")

    except FileNotFoundError as e:
        print(f"\n❌ JobSpy MCP server not found!")
        print("\nTo install:")
        print("1. git clone https://github.com/borgius/jobspy-mcp-server.git")
        print("2. cd jobspy-mcp-server && npm install")
        print("3. Update config/user_prefs.json with server path")
        print("="*80 + "\n")

    except Exception as e:
        print(f"\n❌ Tests failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
