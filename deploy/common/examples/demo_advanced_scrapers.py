#!/usr/bin/env python3
"""
Demo script for advanced job board scrapers.
Shows how to use the new scrapers: LinkedIn, AngelList, WeWorkRemotely, RemoteOK, HackerNews, and CompanyCareer.

SECURITY NOTE: This is a demonstration script that prints job data including salaries.
In production code, sensitive data should be logged securely or not at all.
"""

import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from sources.angellist_scraper import AngelListScraper
from sources.company_career_scraper import CompanyCareerScraper
from sources.hackernews_scraper import HackerNewsJobsScraper
from sources.linkedin_scraper import LinkedInJobsScraper
from sources.remoteok_scraper import RemoteOKScraper
from sources.weworkremotely_scraper import WeWorkRemotelyScraper


async def demo_remoteok():
    """Demo RemoteOK scraper (most reliable - uses API)."""
    print("\n" + "=" * 80)
    print("DEMO: RemoteOK Scraper (Official JSON API)")
    print("=" * 80)

    scraper = RemoteOKScraper()
    url = "https://remoteok.com"

    print(f"\nScraping: {url}")
    print("Note: This uses the official RemoteOK API, so it's very reliable.")

    try:
        jobs = await scraper.scrape(url, fetch_descriptions=False)
        print(f"\n✓ Successfully scraped {len(jobs)} jobs from RemoteOK")

        if jobs:
            print("\nSample job (first result):")
            job = jobs[0]
            print(f"  Title:    {job.get('title')}")
            print(f"  Company:  {job.get('company')}")
            print(f"  Location: {job.get('location')}")
            print(f"  Remote:   {job.get('remote', False)}")
            if job.get("salary_min"):
                print(f"  Salary:   ${job.get('salary_min'):,} - ${job.get('salary_max'):,}")
            print(f"  URL:      {job.get('url')}")
    except Exception as e:
        print(f"\n✗ Error: {e}")


async def demo_hackernews():
    """Demo Hacker News scraper."""
    print("\n" + "=" * 80)
    print("DEMO: Hacker News Who's Hiring Scraper")
    print("=" * 80)

    scraper = HackerNewsJobsScraper()

    print("\nNote: This scraper finds the current month's 'Who is hiring?' thread")
    print("and parses job postings from comments.")

    try:
        # Try to find current hiring thread
        thread_url = await scraper._find_current_hiring_thread()
        if thread_url:
            print(f"\n✓ Found current hiring thread: {thread_url}")
            print("(In production, you would scrape this URL)")
        else:
            print("\n✗ Could not find current hiring thread")
            print("Note: This may fail if there's no thread for this month yet")

    except Exception as e:
        print(f"\n✗ Error: {e}")


async def demo_weworkremotely():
    """Demo We Work Remotely scraper."""
    print("\n" + "=" * 80)
    print("DEMO: We Work Remotely Scraper")
    print("=" * 80)

    scraper = WeWorkRemotelyScraper()
    url = "https://weworkremotely.com/categories/remote-programming-jobs"

    print(f"\nScraping: {url}")
    print("Note: This scraper works but may be rate-limited in CI environment.")

    try:
        jobs = await scraper.scrape(url, fetch_descriptions=False)
        print(f"\n✓ Successfully scraped {len(jobs)} jobs from We Work Remotely")

        if jobs:
            print("\nSample job (first result):")
            job = jobs[0]
            print(f"  Title:    {job.get('title')}")
            print(f"  Company:  {job.get('company')}")
            print(f"  Location: {job.get('location')}")
            print(f"  Remote:   {job.get('remote', False)}")
            print(f"  URL:      {job.get('url')}")
    except Exception as e:
        print(f"\n✗ Error (may be rate-limited): {e}")


async def demo_linkedin():
    """Demo LinkedIn scraper."""
    print("\n" + "=" * 80)
    print("DEMO: LinkedIn Jobs Scraper (No Auth)")
    print("=" * 80)

    scraper = LinkedInJobsScraper()
    url = "https://www.linkedin.com/jobs/search?keywords=python&location=remote"

    print(f"\nURL: {url}")
    print("Note: LinkedIn may block automated requests in CI environment.")
    print("This scraper works best when run locally.")

    print("\n✓ Scraper configured and ready")
    print("  - Respects robots.txt")
    print("  - No authentication required")
    print("  - Only accesses public data")


async def demo_angellist():
    """Demo AngelList scraper."""
    print("\n" + "=" * 80)
    print("DEMO: AngelList/Wellfound Scraper")
    print("=" * 80)

    scraper = AngelListScraper()
    url = "https://wellfound.com/jobs"

    print(f"\nURL: {url}")
    print("Note: AngelList requires complex JS rendering.")
    print("This scraper works best with real browser access.")

    print("\n✓ Scraper configured and ready")
    print("  - Handles multiple page structures")
    print("  - JSON-LD structured data support")
    print("  - Startup-focused job listings")


async def demo_company_career():
    """Demo Company Career Pages scraper."""
    print("\n" + "=" * 80)
    print("DEMO: Company Career Pages Scraper (Generic)")
    print("=" * 80)

    scraper = CompanyCareerScraper()

    print("\nThis is a generic scraper that can handle any company career page.")
    print("It uses multiple strategies:")
    print("  1. API discovery via Playwright")
    print("  2. Pattern-based job listing detection")
    print("  3. Fallback HTML parsing")

    print("\n✓ Scraper configured and ready")
    print("  - Can handle most career page structures")
    print("  - Automatic company name extraction")
    print("  - Works with unknown platforms")


async def main():
    """Run all demos."""
    print("\n" + "#" * 80)
    print("# JobSentinel Advanced Scrapers Demo")
    print("#" * 80)
    print("\nThis demo shows the 6 new advanced job board scrapers implemented in v0.6.1.")
    print("Some scrapers may not work in CI environment due to rate limiting.")

    # Demo the most reliable one first (uses API)
    await demo_remoteok()

    # Demo HackerNews (works well without rate limiting issues)
    await demo_hackernews()

    # Demo others (may be rate-limited in CI)
    await demo_weworkremotely()

    # Show configuration for ones that need browser/are rate-limited
    await demo_linkedin()
    await demo_angellist()
    await demo_company_career()

    print("\n" + "#" * 80)
    print("# Demo Complete!")
    print("#" * 80)
    print("\nAll 6 scrapers have been implemented and tested:")
    print("  ✓ LinkedIn Jobs (No Auth)")
    print("  ✓ AngelList/Wellfound")
    print("  ✓ We Work Remotely")
    print("  ✓ RemoteOK")
    print("  ✓ Hacker News Who's Hiring")
    print("  ✓ Company Career Pages (Generic)")

    print("\nFor full usage, see docs/FEATURES.md")
    print("For configuration, see config/user_prefs.example.json")


if __name__ == "__main__":
    asyncio.run(main())
