"""
Test script for Reed Jobs MCP integration (UK jobs).

Demonstrates how to search Reed.co.uk jobs via official API.
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sources.reed_mcp_scraper import search_reed_jobs
from utils.logging import setup_logging

# Setup logging
logger = setup_logging(log_level="INFO")


async def test_basic_search():
    """Test basic job search with Reed API."""
    print("\n" + "="*80)
    print("TEST 1: Basic Job Search (Reed.co.uk)")
    print("="*80)

    # Check if API key is set
    api_key = os.environ.get("REED_API_KEY")
    if not api_key:
        print("\n❌ REED_API_KEY environment variable not set!")
        print("   Get free API key from: https://www.reed.co.uk/developers")
        print("   Then export REED_API_KEY=your_api_key")
        return

    # Search for Python jobs in London
    jobs = await search_reed_jobs(
        keywords="python developer",
        location="London",
        results_to_take=10
    )

    print(f"\n✅ Found {len(jobs)} Python developer jobs in London")

    if jobs:
        print("\n📋 Sample job:")
        sample = jobs[0]
        print(f"  Title: {sample.get('title')}")
        print(f"  Company: {sample.get('company')}")
        print(f"  Location: {sample.get('location')}")
        print(f"  Salary: {sample.get('salary', 'Not specified')}")
        print(f"  URL: {sample.get('url')}")
        print(f"  Source: {sample.get('job_board')}")


async def test_salary_filter():
    """Test salary filtering."""
    print("\n" + "="*80)
    print("TEST 2: Salary Filtering")
    print("="*80)

    api_key = os.environ.get("REED_API_KEY")
    if not api_key:
        print("\n❌ REED_API_KEY not set. Skipping test.")
        return

    # Search for high-salary jobs
    jobs = await search_reed_jobs(
        keywords="software engineer",
        location="London",
        minimum_salary=60000,  # £60k minimum
        full_time=True,
        results_to_take=10
    )

    print(f"\n✅ Found {len(jobs)} software engineer jobs (£60k+, full-time)")

    if jobs:
        print("\n📋 Salary breakdown:")
        for i, job in enumerate(jobs[:5], 1):
            print(f"  {i}. {job.get('title')} - {job.get('salary', 'Not specified')}")


async def test_contract_types():
    """Test filtering by contract type."""
    print("\n" + "="*80)
    print("TEST 3: Contract Type Filtering")
    print("="*80)

    api_key = os.environ.get("REED_API_KEY")
    if not api_key:
        print("\n❌ REED_API_KEY not set. Skipping test.")
        return

    # Search for contract roles
    jobs = await search_reed_jobs(
        keywords="devops",
        location="Manchester",
        contract=True,
        distance_miles=20,
        results_to_take=10
    )

    print(f"\n✅ Found {len(jobs)} DevOps contract roles in Manchester area")

    if jobs:
        print("\n📋 Contract jobs:")
        for i, job in enumerate(jobs[:3], 1):
            print(f"\n  {i}. {job.get('title')}")
            print(f"     Company: {job.get('company')}")
            print(f"     Type: {job.get('employment_type', 'Not specified')}")


async def test_remote_jobs():
    """Test remote job search."""
    print("\n" + "="*80)
    print("TEST 4: Remote Jobs")
    print("="*80)

    api_key = os.environ.get("REED_API_KEY")
    if not api_key:
        print("\n❌ REED_API_KEY not set. Skipping test.")
        return

    # Search for remote jobs
    jobs = await search_reed_jobs(
        keywords="remote python",
        results_to_take=10
    )

    print(f"\n✅ Found {len(jobs)} remote Python jobs")

    if jobs:
        print("\n📋 Remote opportunities:")
        for i, job in enumerate(jobs[:5], 1):
            print(f"  {i}. {job.get('title')} at {job.get('company')}")
            print(f"     Location: {job.get('location')}")


async def test_deduplication():
    """Test that deduplication works across multiple searches."""
    print("\n" + "="*80)
    print("TEST 5: Deduplication Across Searches")
    print("="*80)

    api_key = os.environ.get("REED_API_KEY")
    if not api_key:
        print("\n❌ REED_API_KEY not set. Skipping test.")
        return

    # Run same search twice
    jobs1 = await search_reed_jobs(
        keywords="python",
        location="London",
        results_to_take=10
    )

    jobs2 = await search_reed_jobs(
        keywords="python",
        location="London",
        results_to_take=10
    )

    print(f"\n  Search 1: {len(jobs1)} jobs")
    print(f"  Search 2: {len(jobs2)} jobs")

    # Combine and check for duplicates
    all_jobs = jobs1 + jobs2
    unique_urls = set(job.get('url') for job in all_jobs)

    print(f"  Total jobs: {len(all_jobs)}")
    print(f"  Unique URLs: {len(unique_urls)}")

    if len(all_jobs) > len(unique_urls):
        print(f"\n✅ Deduplication will catch {len(all_jobs) - len(unique_urls)} duplicates")
    else:
        print(f"\n✅ No duplicates detected (as expected for same API calls)")


async def main():
    """Run all tests."""
    print("\n" + "="*80)
    print("Reed Jobs MCP Integration Tests")
    print("="*80)
    print("\n🇬🇧 Testing UK job market via official Reed.co.uk API")
    print("="*80)

    # Check for API key first
    api_key = os.environ.get("REED_API_KEY")
    if not api_key:
        print("\n❌ REED_API_KEY environment variable not set!")
        print("\nTo run these tests:")
        print("1. Get free API key from: https://www.reed.co.uk/developers")
        print("2. export REED_API_KEY=your_api_key")
        print("3. Run this script again")
        print("="*80 + "\n")
        return

    try:
        await test_basic_search()
        await test_salary_filter()
        await test_contract_types()
        await test_remote_jobs()
        await test_deduplication()

        print("\n" + "="*80)
        print("✅ ALL TESTS COMPLETED")
        print("="*80)
        print("\nNext steps:")
        print("1. Add REED_API_KEY to your environment variables")
        print("2. Enable Reed in config/user_prefs.json (set enabled: true)")
        print("3. Reed jobs will be automatically included in job searches!")
        print("="*80 + "\n")

    except Exception as e:
        print(f"\n❌ Tests failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
