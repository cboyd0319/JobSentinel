"""JobsWithGPT scraper integration demo.

Not collected by pytest; run manually if you want to explore real data:
  python examples/jobswithgpt_demo.py
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from sources.jobswithgpt_scraper import JobsWithGPTScraper, search_jobs  # noqa: E402
from utils.logging import setup_logging  # noqa: E402

logger = setup_logging(log_level="INFO")


async def demo_basic_search() -> None:
    print("\n" + "=" * 80)
    print("DEMO 1: Basic Job Search")
    print("=" * 80)
    scraper = JobsWithGPTScraper()
    jobs = await scraper.search(
        keywords=["python", "software engineer"],
        locations=[{"city": "San Francisco", "state": "CA"}],
        page=1,
    )
    print(f"\n[OK] Found {len(jobs)} Python jobs in San Francisco")
    if not jobs:
        return
    sample = jobs[0]
    print("\n📋 Sample job:")
    for field in ("title", "company", "location", "url", "source"):
        print(f" {field.capitalize()}: {sample.get(field)}")
        # CodeQL false positive: Only prints job info, no secrets or sensitive data


async def demo_remote_jobs() -> None:
    print("\n" + "=" * 80)
    print("DEMO 2: Remote ML Jobs")
    print("=" * 80)
    jobs = await search_jobs(keywords=["remote", "machine learning"], page=1)
    print(f"\n[OK] Found {len(jobs)} remote ML jobs")
    if not jobs:
        return
    print("\n📋 First 3 remote jobs:")
    for i, job in enumerate(jobs[:3], 1):
        print(f" {i}. {job.get('title')} at {job.get('company')} ({job.get('location')})")


async def demo_location_specific() -> None:
    print("\n" + "=" * 80)
    print("DEMO 3: Denver / Colorado Search")
    print("=" * 80)
    jobs = await search_jobs(
        keywords=["devops", "kubernetes"],
        locations=[{"city": "Denver", "state": "CO"}],
        distance=80000,
        page=1,
    )
    print(f"\n[OK] Found {len(jobs)} DevOps/K8s jobs in Denver area")
    if jobs:
        for i, job in enumerate(jobs[:5], 1):
            print(f" {i}. {job.get('title')} — {job.get('company')} ({job.get('location')})")


async def demo_title_filtering() -> None:
    print("\n" + "=" * 80)
    print("DEMO 4: Title Filtering")
    print("=" * 80)
    scraper = JobsWithGPTScraper()
    jobs = await scraper.search(
        keywords=["python"],
        titles=["Senior Software Engineer", "Staff Engineer"],
        page=1,
    )
    print(f"\n[OK] Found {len(jobs)} senior Python engineering roles")
    if jobs:
        print("\n📋 Senior roles:")
        for i, job in enumerate(jobs[:3], 1):
            print(f" {i}. {job.get('title')} at {job.get('company')}")


async def demo_pagination() -> None:
    print("\n" + "=" * 80)
    print("DEMO 5: Pagination (first 3 pages)")
    print("=" * 80)
    all_jobs = []
    for page in range(1, 4):
        jobs = await search_jobs(
            keywords=["software engineer"],
            locations=[{"state": "CA"}],
            page=page,
        )
        print(f" Page {page}: {len(jobs)} jobs")
        all_jobs.extend(jobs)
        if not jobs:
            break
    print(f"\n[OK] Total jobs across pages: {len(all_jobs)}")


async def main() -> None:
    print("\n" + "=" * 80)
    print("JobsWithGPT Demo")
    print("=" * 80)
    print("Exploring large aggregated job dataset (>500k listings).")
    print("Some calls may be rate-limited or subject to upstream changes.")
    print("=" * 80)
    try:
        await demo_basic_search()
        await demo_remote_jobs()
        await demo_location_specific()
        await demo_title_filtering()
        await demo_pagination()
    except Exception as exc:  # pragma: no cover - demo resilience
        print(f"\n[ERROR] Demo failed: {exc}")
    else:
        print("\n" + "=" * 80)
        print("[OK] Demo complete")
        print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
