"""
High-performance concurrent job scraper.
Provides massive speed improvements through concurrent execution.
"""

import asyncio
import time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
from typing import List, Dict, Optional, Callable
from dataclasses import dataclass
from threading import Lock
import multiprocessing as mp

from .job_scraper import scrape_jobs
from utils.logging import get_logger

logger = get_logger("sources.concurrent_scraper")

# Global locks for thread safety
_db_lock = Lock()
_registry_lock = Lock()


@dataclass
class ScrapeTask:
    """Represents a job scraping task."""
    url: str
    fetch_descriptions: bool = True
    priority: int = 0  # Higher priority = executed first
    timeout: int = 30  # Timeout in seconds


@dataclass
class ScrapeResult:
    """Result of a job scraping operation."""
    url: str
    jobs: List[Dict]
    duration: float
    success: bool
    error: Optional[str] = None
    jobs_per_second: float = 0.0


class ConcurrentJobScraper:
    """
    High-performance concurrent job scraper.
    Supports thread-based and process-based concurrency.
    """

    def __init__(
        self,
        max_workers: Optional[int] = None,
        use_processes: bool = False,
        enable_database_batching: bool = True,
        batch_size: int = 50
    ):
        """
        Initialize the concurrent scraper.

        Args:
            max_workers: Maximum number of concurrent workers (default: CPU count * 2)
            use_processes: Use processes instead of threads (better for CPU-bound work)
            enable_database_batching: Batch database operations for better performance
            batch_size: Number of jobs to batch together for database operations
        """
        self.max_workers = max_workers or (mp.cpu_count() * 2)
        self.use_processes = use_processes
        self.enable_database_batching = enable_database_batching
        self.batch_size = batch_size

        logger.info(f"Initialized concurrent scraper: {self.max_workers} workers, "
                    f"{'processes' if use_processes else 'threads'}")

    def scrape_multiple_concurrent(
        self,
        urls: List[str],
        fetch_descriptions: bool = True,
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> List[ScrapeResult]:
        """
        Scrape multiple URLs concurrently.

        Args:
            urls: List of job board URLs to scrape
            fetch_descriptions: Whether to fetch full job descriptions
            progress_callback: Optional callback for progress updates

        Returns:
            List of ScrapeResult objects
        """
        start_time = time.time()
        logger.info(f"Starting concurrent scraping of {len(urls)} URLs")

        # Create tasks
        tasks = [ScrapeTask(url, fetch_descriptions) for url in urls]

        # Sort by priority (if any)
        tasks.sort(key=lambda t: t.priority, reverse=True)

        results = []

        if self.use_processes:
            results = self._scrape_with_processes(tasks, progress_callback)
        else:
            results = self._scrape_with_threads(tasks, progress_callback)

        total_time = time.time() - start_time
        successful_results = [r for r in results if r.success]
        total_jobs = sum(len(r.jobs) for r in successful_results)

        logger.info(f"Concurrent scraping completed: {total_time:.2f}s, "
                    f"{total_jobs} jobs from {len(successful_results)}/{len(urls)} sites")

        return results

    def _scrape_with_threads(
        self,
        tasks: List[ScrapeTask],
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> List[ScrapeResult]:
        """Scrape using thread-based concurrency."""
        results = []

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_task = {
                executor.submit(self._scrape_single_task, task): task
                for task in tasks
            }

            # Process completed tasks
            for future in as_completed(future_to_task):
                task = future_to_task[future]
                try:
                    result = future.result(timeout=task.timeout)
                    results.append(result)

                    if progress_callback:
                        progress_callback(task.url, len(results), len(tasks))

                except Exception as e:
                    logger.error(f"Task failed for {task.url}: {e}")
                    results.append(ScrapeResult(
                        url=task.url,
                        jobs=[],
                        duration=0.0,
                        success=False,
                        error=str(e)
                    ))

        return results

    def _scrape_with_processes(
        self,
        tasks: List[ScrapeTask],
        progress_callback: Optional[Callable[[str, int, int], None]] = None
    ) -> List[ScrapeResult]:
        """Scrape using process-based concurrency."""
        results = []

        with ProcessPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_task = {
                executor.submit(_scrape_task_worker, task): task
                for task in tasks
            }

            # Process completed tasks
            for future in as_completed(future_to_task):
                task = future_to_task[future]
                try:
                    result = future.result(timeout=task.timeout)
                    results.append(result)

                    if progress_callback:
                        progress_callback(task.url, len(results), len(tasks))

                except Exception as e:
                    logger.error(f"Process task failed for {task.url}: {e}")
                    results.append(ScrapeResult(
                        url=task.url,
                        jobs=[],
                        duration=0.0,
                        success=False,
                        error=str(e)
                    ))

        return results

    def _scrape_single_task(self, task: ScrapeTask) -> ScrapeResult:
        """Scrape a single URL with timing and error handling."""
        start_time = time.time()

        try:
            # Run the async scraper in its own event loop
            jobs = asyncio.run(scrape_jobs(task.url, task.fetch_descriptions))

            duration = time.time() - start_time
            jobs_per_second = len(jobs) / duration if duration > 0 else 0

            return ScrapeResult(
                url=task.url,
                jobs=jobs,
                duration=duration,
                success=True,
                jobs_per_second=jobs_per_second
            )

        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"Scraping failed for {task.url}: {e}")

            return ScrapeResult(
                url=task.url,
                jobs=[],
                duration=duration,
                success=False,
                error=str(e)
            )

    async def scrape_multiple_async(
        self,
        urls: List[str],
        fetch_descriptions: bool = True,
        max_concurrent: int = 10
    ) -> List[ScrapeResult]:
        """
        Scrape multiple URLs using asyncio for I/O-bound operations.
        Best for sites that support async operations.
        """
        semaphore = asyncio.Semaphore(max_concurrent)

        async def scrape_with_semaphore(url: str) -> ScrapeResult:
            async with semaphore:
                return await self._scrape_single_async(url, fetch_descriptions)

        start_time = time.time()
        logger.info(f"Starting async scraping of {len(urls)} URLs")

        tasks = [scrape_with_semaphore(url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Handle exceptions
        final_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                final_results.append(ScrapeResult(
                    url=urls[i],
                    jobs=[],
                    duration=0.0,
                    success=False,
                    error=str(result)
                ))
            else:
                final_results.append(result)

        total_time = time.time() - start_time
        successful_results = [r for r in final_results if r.success]
        total_jobs = sum(len(r.jobs) for r in successful_results)

        logger.info(f"Async scraping completed: {total_time:.2f}s, "
                    f"{total_jobs} jobs from {len(successful_results)}/{len(urls)} sites")

        return final_results

    async def _scrape_single_async(
            self, url: str, fetch_descriptions: bool) -> ScrapeResult:
        """Scrape a single URL asynchronously."""
        start_time = time.time()

        try:
            # Directly await the now-async scrape_jobs
            jobs = await scrape_jobs(url, fetch_descriptions)

            duration = time.time() - start_time
            jobs_per_second = len(jobs) / duration if duration > 0 else 0

            return ScrapeResult(
                url=url,
                jobs=jobs,
                duration=duration,
                success=True,
                jobs_per_second=jobs_per_second
            )

        except Exception as e:
            duration = time.time() - start_time
            return ScrapeResult(
                url=url,
                jobs=[],
                duration=duration,
                success=False,
                error=str(e)
            )


def _scrape_task_worker(task: ScrapeTask) -> ScrapeResult:
    """
    Worker function for process-based scraping.
    Must be at module level for multiprocessing.
    """
    start_time = time.time()

    try:
        # Run the async scraper in its own event loop
        jobs = asyncio.run(scrape_jobs(task.url, task.fetch_descriptions))
        duration = time.time() - start_time
        jobs_per_second = len(jobs) / duration if duration > 0 else 0

        return ScrapeResult(
            url=task.url,
            jobs=jobs,
            duration=duration,
            success=True,
            jobs_per_second=jobs_per_second
        )

    except Exception as e:
        duration = time.time() - start_time
        return ScrapeResult(
            url=task.url,
            jobs=[],
            duration=duration,
            success=False,
            error=str(e)
        )


# Convenience functions for easy usage
def scrape_multiple_fast(
    urls: List[str],
    fetch_descriptions: bool = True,
    max_workers: Optional[int] = None
) -> List[ScrapeResult]:
    """
    Quick function to scrape multiple URLs concurrently.
    Uses optimal settings for most use cases.
    """
    scraper = ConcurrentJobScraper(max_workers=max_workers)
    return scraper.scrape_multiple_concurrent(urls, fetch_descriptions)


async def scrape_multiple_async_fast(
    urls: List[str],
    fetch_descriptions: bool = True,
    max_concurrent: int = 10
) -> List[ScrapeResult]:
    """
    Quick async function to scrape multiple URLs.
    Best for I/O-bound operations.
    """
    scraper = ConcurrentJobScraper()
    return await scraper.scrape_multiple_async(urls, fetch_descriptions, max_concurrent)


def benchmark_scraper_performance(urls: List[str]) -> Dict:
    """
    Benchmark different scraping approaches.
    Returns performance comparison data.
    """
    results = {}

    # Sequential benchmark
    start_time = time.time()
    sequential_jobs = []
    for url in urls:
        try:
            jobs = asyncio.run(scrape_jobs(url, fetch_descriptions=False))
            sequential_jobs.extend(jobs)
        except BaseException:
            pass
    results['sequential'] = {
        'time': time.time() - start_time,
        'jobs': len(sequential_jobs)
    }

    # Concurrent threads benchmark
    start_time = time.time()
    scraper = ConcurrentJobScraper(use_processes=False)
    thread_results = scraper.scrape_multiple_concurrent(
        urls, fetch_descriptions=False)
    concurrent_jobs = sum(len(r.jobs) for r in thread_results if r.success)
    results['concurrent_threads'] = {
        'time': time.time() - start_time,
        'jobs': concurrent_jobs
    }

    # Concurrent processes benchmark
    start_time = time.time()
    scraper = ConcurrentJobScraper(use_processes=True)
    process_results = scraper.scrape_multiple_concurrent(
        urls, fetch_descriptions=False)
    process_jobs = sum(len(r.jobs) for r in process_results if r.success)
    results['concurrent_processes'] = {
        'time': time.time() - start_time,
        'jobs': process_jobs
    }

    return results
