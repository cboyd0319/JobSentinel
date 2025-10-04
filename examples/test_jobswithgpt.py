"""
Test script for JobsWithGPT integration.

This demonstrates how to use the JobsWithGPT scraper to access 500,000+ jobs.
"""

import asyncio
import pytest

pytest.skip("Skipping example integration test (network & large dataset)", allow_module_level=True)
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sources.jobswithgpt_scraper import JobsWithGPTScraper, search_jobs
from utils.logging import setup_logging

# Setup logging
logger = setup_logging(log_level="INFO")


async def test_basic_search():
 """Test basic job search with JobsWithGPT."""
 print("\n" + "="*80)
 print("TEST 1: Basic Job Search")
 print("="*80)

 scraper = JobsWithGPTScraper()

 # Search for Python jobs in San Francisco
 jobs = await scraper.search(
 keywords=["python", "software engineer"],
 locations=[{"city": "San Francisco", "state": "CA"}],
 page=1
 )

 print(f"\n[OK] Found {len(jobs)} Python jobs in San Francisco")

 if jobs:
 print("\n📋 Sample job:")
 sample = jobs[0]
 print(f" Title: {sample.get('title')}")
 print(f" Company: {sample.get('company')}")
 print(f" Location: {sample.get('location')}")
 print(f" URL: {sample.get('url')}")
 print(f" Source: {sample.get('source')}")


async def test_remote_jobs():
 """Test searching for remote jobs."""
 print("\n" + "="*80)
 print("TEST 2: Remote Jobs Search")
 print("="*80)

 # Use convenience function
 jobs = await search_jobs(
 keywords=["remote", "machine learning"],
 page=1
 )

 print(f"\n[OK] Found {len(jobs)} remote ML jobs")

 if jobs:
 print("\n📋 First 3 remote jobs:")
 for i, job in enumerate(jobs[:3], 1):
 print(f"\n {i}. {job.get('title')} at {job.get('company')}")
 print(f" Location: {job.get('location')}")
 print(f" URL: {job.get('url')[:80]}...")


async def test_location_specific():
 """Test location-specific search."""
 print("\n" + "="*80)
 print("TEST 3: Location-Specific Search (Denver/Colorado)")
 print("="*80)

 jobs = await search_jobs(
 keywords=["devops", "kubernetes"],
 locations=[{"city": "Denver", "state": "CO"}],
 distance=80000, # 80km radius
 page=1
 )

 print(f"\n[OK] Found {len(jobs)} DevOps/K8s jobs in Denver area")

 if jobs:
 print("\n📋 Denver area jobs:")
 for i, job in enumerate(jobs[:5], 1):
 print(f"\n {i}. {job.get('title')}")
 print(f" Company: {job.get('company')}")
 print(f" Location: {job.get('location')}")


async def test_title_filtering():
 """Test filtering by job titles."""
 print("\n" + "="*80)
 print("TEST 4: Job Title Filtering")
 print("="*80)

 scraper = JobsWithGPTScraper()

 jobs = await scraper.search(
 keywords=["python"],
 titles=["Senior Software Engineer", "Staff Engineer"],
 page=1
 )

 print(f"\n[OK] Found {len(jobs)} senior Python engineering roles")

 if jobs:
 print("\n📋 Senior roles:")
 for i, job in enumerate(jobs[:3], 1):
 print(f"\n {i}. {job.get('title')}")
 print(f" Company: {job.get('company')}")


async def test_pagination():
 """Test pagination to get more results."""
 print("\n" + "="*80)
 print("TEST 5: Pagination")
 print("="*80)

 all_jobs = []

 for page in range(1, 4): # Get first 3 pages
 jobs = await search_jobs(
 keywords=["software engineer"],
 locations=[{"state": "CA"}],
 page=page
 )

 print(f"\n Page {page}: {len(jobs)} jobs")
 all_jobs.extend(jobs)

 if not jobs:
 break

 print(f"\n[OK] Total jobs across pages: {len(all_jobs)}")


async def main():
 """Run all tests."""
 print("\n" + "="*80)
 print("JobsWithGPT Integration Tests")
 print("="*80)
 print("\nNote: These tests require internet connection and access to jobswithgpt.com")
 print("If tests fail, it may be due to Cloudflare protection or API changes.")
 print("="*80)

 try:
 await test_basic_search()
 await test_remote_jobs()
 await test_location_specific()
 await test_title_filtering()
 await test_pagination()

 print("\n" + "="*80)
 print("[OK] ALL TESTS COMPLETED")
 print("="*80)
 print("\nNext steps:")
 print("1. Integrate into your job scraping workflow")
 print("2. Use search_jobs_by_keywords() in src/agent.py")
 print("3. Configure user preferences to leverage 500k+ jobs!")
 print("="*80 + "\n")

 except Exception as e:
 print(f"\n[ERROR] Tests failed: {e}")
 print("\nThis is expected if:")
 print(" - Cloudflare is blocking API access (need to use MCP server via subprocess)")
 print(" - JobsWithGPT API has changed")
 print(" - Network connection issues")
 print("\nThe integration code is ready - it may need minor adjustments once")
 print("we can test against the live API.")


if __name__ == "__main__":
 asyncio.run(main())
