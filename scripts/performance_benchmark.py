#!/usr/bin/env python3
"""
Performance benchmark for the enhanced concurrent job scraper.
Demonstrates performance improvements from concurrent execution and database optimizations.
"""

import time

from sources.job_scraper import scrape_jobs
from sources.concurrent_scraper import (
    ConcurrentJobScraper,
    scrape_multiple_fast,
)
from src.concurrent_database import save_jobs_concurrent
from utils.logging import get_logger

logger = get_logger("scripts.performance_benchmark")

# Test URLs covering different platforms
TEST_URLS = [
    "https://www.fivetran.com/careers#jobs",  # Greenhouse
    "https://jobs.careers.microsoft.com/global/en/search?lc=Colorado,%20United%20States",  # Microsoft API
    "https://www.spacex.com/careers/jobs",  # SpaceX API
    "https://careers.google.com/",  # Playwright fallback
    "https://spectrum.com/careers",  # Playwright fallback
]

SMALL_TEST_URLS = TEST_URLS[:3]  # Just the reliable ones for focused testing


def benchmark_sequential_vs_concurrent():
    """Compare sequential vs concurrent scraping performance."""
    logger.info("=== SCRAPING PERFORMANCE BENCHMARK ===")

    print("🚀 Testing Sequential vs Concurrent Scraping Performance\n")

    # Sequential benchmark
    print("📊 Sequential Scraping:")
    start_time = time.time()
    sequential_jobs = []

    for i, url in enumerate(SMALL_TEST_URLS, 1):
        print(f"  {i}/{len(SMALL_TEST_URLS)} Scraping {url}")
        try:
            jobs = scrape_jobs(url, fetch_descriptions=False)
            sequential_jobs.extend(jobs)
        except Exception as e:
            logger.error(f"Sequential scraping failed for {url}: {e}")
            continue

    sequential_time = time.time() - start_time

    print(f"  ✅ Sequential: {len(sequential_jobs)} jobs in {sequential_time:.2f}s")
    print(f"     Rate: {len(sequential_jobs) / sequential_time:.1f} jobs/second\n")

    # Concurrent benchmark
    print("⚡ Concurrent Scraping:")
    start_time = time.time()

    try:
        concurrent_results = scrape_multiple_fast(SMALL_TEST_URLS, fetch_descriptions=False, max_workers=4)
        concurrent_jobs = []
        for result in concurrent_results:
            if result.success:
                concurrent_jobs.extend(result.jobs)
    except Exception as e:
        logger.error(f"Concurrent scraping failed: {e}")
        concurrent_jobs = []

    concurrent_time = time.time() - start_time

    print(f"  ✅ Concurrent: {len(concurrent_jobs)} jobs in {concurrent_time:.2f}s")
    print(f"     Rate: {len(concurrent_jobs) / concurrent_time:.1f} jobs/second")

    # Performance improvement
    if sequential_time > 0:
        speedup = sequential_time / concurrent_time
        print(f"     🎯 Speedup: {speedup:.1f}x faster\n")

    return {
        "sequential": {
            "jobs": len(sequential_jobs),
            "time": sequential_time,
            "rate": len(sequential_jobs) / sequential_time if sequential_time > 0 else 0,
        },
        "concurrent": {
            "jobs": len(concurrent_jobs),
            "time": concurrent_time,
            "rate": len(concurrent_jobs) / concurrent_time if concurrent_time > 0 else 0,
            "speedup": sequential_time / concurrent_time if concurrent_time > 0 else 0,
        },
    }


def benchmark_database_operations():
    """Benchmark database save performance with batching."""
    logger.info("=== DATABASE PERFORMANCE BENCHMARK ===")

    print("💾 Testing Database Save Performance\n")

    # Create sample job data
    sample_jobs = []
    for i in range(100):
        sample_jobs.append(
            {
                "hash": f"test_job_{i}",
                "title": f"Test Job {i}",
                "company": "test_company",
                "url": f"https://example.com/job/{i}",
                "location": "Remote",
                "description": f"Test job description {i}",
                "job_board": "test_board",
            }
        )

    # Test different batch sizes
    batch_sizes = [1, 10, 50, 100]
    results = {}

    for batch_size in batch_sizes:
        print(f"📈 Testing batch size: {batch_size}")

        # Initialize database handler with specific batch size
        from src.concurrent_database import ConcurrentJobDatabase

        db_handler = ConcurrentJobDatabase(batch_size=batch_size, enable_batching=True)

        start_time = time.time()
        saved_count = db_handler.save_jobs_batch(sample_jobs[:50])  # Test with 50 jobs
        elapsed_time = time.time() - start_time

        rate = saved_count / elapsed_time if elapsed_time > 0 else 0
        results[batch_size] = {"jobs_saved": saved_count, "time": elapsed_time, "rate": rate}

        print(f"  ✅ Saved {saved_count} jobs in {elapsed_time:.3f}s ({rate:.1f} jobs/sec)")

    # Find optimal batch size
    best_batch_size = max(results.keys(), key=lambda k: results[k]["rate"])
    print(f"\n🎯 Optimal batch size: {best_batch_size} jobs")
    print(f"   Best rate: {results[best_batch_size]['rate']:.1f} jobs/second\n")

    return results


def benchmark_full_pipeline():
    """Benchmark complete scraping + database pipeline."""
    logger.info("=== FULL PIPELINE BENCHMARK ===")

    print("🔄 Testing Complete Pipeline Performance\n")

    # Test with concurrent scraper and database
    start_time = time.time()

    try:
        # Concurrent scraping
        scraper = ConcurrentJobScraper(max_workers=4, enable_database_batching=True)
        results = scraper.scrape_multiple_concurrent(SMALL_TEST_URLS, fetch_descriptions=False)

        # Collect all jobs
        all_jobs = []
        for result in results:
            if result.success:
                all_jobs.extend(result.jobs)

        # Concurrent database saving
        if all_jobs:
            saved_count = save_jobs_concurrent(all_jobs)
        else:
            saved_count = 0

        total_time = time.time() - start_time

        print("✅ Full Pipeline Results:")
        print(f"   Scraped: {len(all_jobs)} jobs")
        print(f"   Saved: {saved_count} jobs")
        print(f"   Total time: {total_time:.2f}s")
        print(
            f"   End-to-end rate: {len(all_jobs) /
                                     total_time:.1f} jobs/second\n"
        )

        return {
            "scraped_jobs": len(all_jobs),
            "saved_jobs": saved_count,
            "total_time": total_time,
            "end_to_end_rate": len(all_jobs) / total_time if total_time > 0 else 0,
        }

    except Exception as e:
        logger.error(f"Full pipeline benchmark failed: {e}")
        return {"error": str(e)}


def run_comprehensive_benchmark():
    """Run all benchmarks and generate performance report."""
    print("🏁 COMPREHENSIVE PERFORMANCE BENCHMARK")
    print("=" * 50)
    print(f"Testing URLs: {len(SMALL_TEST_URLS)} platforms")
    print(f"Timestamp: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")

    results = {}

    try:
        # 1. Scraping performance
        results["scraping"] = benchmark_sequential_vs_concurrent()

        # 2. Database performance
        results["database"] = benchmark_database_operations()

        # 3. Full pipeline
        results["pipeline"] = benchmark_full_pipeline()

        # Generate summary report
        print("📋 PERFORMANCE SUMMARY")
        print("=" * 30)

        scraping = results.get("scraping", {})
        if "concurrent" in scraping:
            speedup = scraping["concurrent"].get("speedup", 0)
            print(f"🚀 Scraping Speedup: {speedup:.1f}x faster with concurrency")

        pipeline = results.get("pipeline", {})
        if "end_to_end_rate" in pipeline:
            rate = pipeline["end_to_end_rate"]
            print(f"⚡ End-to-End Rate: {rate:.1f} jobs/second")

        database = results.get("database", {})
        if database:
            best_rate = max(batch["rate"] for batch in database.values() if "rate" in batch)
            print(f"💾 Database Peak Rate: {best_rate:.1f} jobs/second")

        print("\n✨ Benchmark completed successfully!")

    except Exception as e:
        logger.error(f"Benchmark failed: {e}")
        results["error"] = str(e)
        print(f"❌ Benchmark failed: {e}")

    return results


if __name__ == "__main__":
    # Run the comprehensive benchmark
    results = run_comprehensive_benchmark()

    # Save results for analysis
    import json

    with open("benchmark_results.json", "w") as f:
        json.dump(results, f, indent=2, default=str)

    print("\n📁 Detailed results saved to: benchmark_results.json")
