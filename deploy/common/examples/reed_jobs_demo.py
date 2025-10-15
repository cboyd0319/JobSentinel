"""Reed.co.uk jobs API demo (UK job market).

Run manually after exporting a REED_API_KEY environment variable:
  export REED_API_KEY=your_key
  python examples/reed_jobs_demo.py

File name does not start with test_ so it is excluded from pytest collection.
"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "app" / "src"))

from sources.reed_mcp_scraper import search_reed_jobs  # noqa: E402
from utils.logging import setup_logging  # noqa: E402

logger = setup_logging(log_level="INFO")


def _require_api_key() -> bool:
    if not os.environ.get("REED_API_KEY"):
        print("[ERROR] REED_API_KEY environment variable not set.")
        print("Get a free key: https://www.reed.co.uk/developers and export it.")
        return False
    return True


async def demo_basic_search() -> None:
    print("\n" + "=" * 80)
    print("DEMO 1: Basic Python Search (London)")
    print("=" * 80)
    if not _require_api_key():
        return
    jobs = await search_reed_jobs(
        keywords="python developer", location="London", results_to_take=10
    )
    print(f"\n[OK] Found {len(jobs)} Python developer jobs in London")
    if jobs:
        sample = jobs[0]
        print("\nSample job:")
        # CodeQL false positive: Only prints job info, no secrets or sensitive data
        for field in ("title", "company", "location", "salary", "url"):
            print(f" {field.capitalize()}: {sample.get(field, 'N/A')}")


async def demo_salary_filter() -> None:
    print("\n" + "=" * 80)
    print("DEMO 2: Salary Filter (>=£60k full-time)")
    print("=" * 80)
    if not _require_api_key():
        return
    jobs = await search_reed_jobs(
        keywords="software engineer",
        location="London",
        minimum_salary=60000,
        full_time=True,
        results_to_take=10,
    )
    print(f"\n[OK] Found {len(jobs)} software engineer jobs (≥£60k full-time)")
    for i, job in enumerate(jobs[:5], 1):
        print(f" {i}. {job.get('title')} - {job.get('salary', 'Not specified')}")


async def demo_contract_types() -> None:
    print("\n" + "=" * 80)
    print("DEMO 3: Contract Roles (Manchester ±20 miles)")
    print("=" * 80)
    if not _require_api_key():
        return
    jobs = await search_reed_jobs(
        keywords="devops",
        location="Manchester",
        contract=True,
        distance_miles=20,
        results_to_take=10,
    )
    print(f"\n[OK] Found {len(jobs)} DevOps contract roles in Manchester area")
    for i, job in enumerate(jobs[:3], 1):
        print(
            f" {i}. {job.get('title')} at {job.get('company')} ({job.get('employment_type','N/A')})"
        )


async def demo_remote_jobs() -> None:
    print("\n" + "=" * 80)
    print("DEMO 4: Remote Python Jobs")
    print("=" * 80)
    if not _require_api_key():
        return
    jobs = await search_reed_jobs(keywords="remote python", results_to_take=10)
    print(f"\n[OK] Found {len(jobs)} remote Python jobs")
    for i, job in enumerate(jobs[:5], 1):
        print(f" {i}. {job.get('title')} at {job.get('company')} ({job.get('location')})")


async def demo_deduplication() -> None:
    print("\n" + "=" * 80)
    print("DEMO 5: Duplicate Detection (same query twice)")
    print("=" * 80)
    if not _require_api_key():
        return
    jobs1 = await search_reed_jobs(keywords="python", location="London", results_to_take=10)
    jobs2 = await search_reed_jobs(keywords="python", location="London", results_to_take=10)
    all_jobs = jobs1 + jobs2
    unique_urls = {job.get("url") for job in all_jobs}
    print(f" Run1: {len(jobs1)} jobs | Run2: {len(jobs2)} jobs")
    print(f" Combined: {len(all_jobs)} | Unique URLs: {len(unique_urls)}")
    if len(all_jobs) > len(unique_urls):
        print(f" Potential duplicates: {len(all_jobs) - len(unique_urls)} (expected)")
    else:
        print(" No duplicates detected (API already unique).")


async def main() -> None:
    print("\n" + "=" * 80)
    print("Reed.co.uk API Demo (UK Market)")
    print("=" * 80)
    if not _require_api_key():
        return
    await demo_basic_search()
    await demo_salary_filter()
    await demo_contract_types()
    await demo_remote_jobs()
    await demo_deduplication()
    print("\n" + "=" * 80)
    print("[OK] Demo complete")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(main())
