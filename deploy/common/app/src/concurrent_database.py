"""
Thread-safe and high-performance database operations for concurrent job scraping.
Handles database concurrency issues and provides batching for optimal performance.
"""

import threading
import time
from collections.abc import Generator
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC
from queue import Empty, Queue
from threading import Lock, RLock

from sqlmodel import Session, select

from utils.logging import get_logger

from unified_database import UnifiedJob, save_unified_job

logger = get_logger("src.concurrent_database")


@dataclass
class BatchJobData:
    """Represents a job to be saved in a batch operation."""

    job_data: dict
    score: float = 0.0
    timestamp: float = 0.0


class DatabaseConnectionPool:
    """
    Thread-safe database connection pool.
    Manages connections and prevents SQLite concurrency issues.
    """

    def __init__(self, max_connections: int = 10):
        self.max_connections = max_connections
        self._connections = Queue(maxsize=max_connections)
        self._lock = RLock()
        self._created_connections = 0

        # Pre-create some connections
        for _ in range(min(3, max_connections)):
            self._create_connection()

    def _create_connection(self):
        """Create a new database connection."""
        with self._lock:
            if self._created_connections < self.max_connections:
                # Create new engine for this connection to avoid SQLite
                # threading issues
                from sqlmodel import create_engine

                from unified_database import UNIFIED_DB_FILE

                engine = create_engine(
                    f"sqlite:///{UNIFIED_DB_FILE}",
                    echo=False,
                    pool_pre_ping=True,
                    connect_args={
                        "check_same_thread": False,  # Allow cross-thread usage
                        "timeout": 30,  # 30 second timeout
                    },
                )
                self._connections.put(engine)
                self._created_connections += 1
                logger.debug(f"Created database connection {self._created_connections}")

    @contextmanager
    def get_connection(self) -> Generator:
        """Get a database connection from the pool."""
        connection = None
        try:
            # Try to get an existing connection
            try:
                connection = self._connections.get(timeout=5)
            except Empty:
                # If no connection available, create one
                self._create_connection()
                connection = self._connections.get(timeout=1)

            yield connection

        finally:
            if connection:
                # Return connection to pool
                self._connections.put(connection)


class ConcurrentJobDatabase:
    """
    High-performance, thread-safe database interface for concurrent job scraping.
    Provides batching, connection pooling, and optimized operations.
    """

    def __init__(
        self,
        batch_size: int = 50,
        batch_timeout: float = 5.0,
        max_connections: int = 10,
        enable_batching: bool = True,
    ):
        """
        Initialize the concurrent database handler.

        Args:
            batch_size: Number of jobs to batch together
            batch_timeout: Maximum time to wait before flushing batch (seconds)
            max_connections: Maximum database connections in pool
            enable_batching: Whether to use batching (vs immediate saves)
        """
        self.batch_size = batch_size
        self.batch_timeout = batch_timeout
        self.enable_batching = enable_batching

        # Thread safety
        self._batch_lock = Lock()
        self._stats_lock = Lock()

        # Batching
        self._batch_queue: list[BatchJobData] = []
        self._last_batch_time = time.time()

        # Connection pool
        self.connection_pool = DatabaseConnectionPool(max_connections)

        # Statistics
        self._stats = {
            "jobs_saved": 0,
            "jobs_updated": 0,
            "batch_operations": 0,
            "total_time": 0.0,
        }

        # Background batch processor
        if enable_batching:
            self._batch_thread = threading.Thread(target=self._batch_processor, daemon=True)
            self._batch_thread.start()
            logger.info(f"Started batch processor: {batch_size} jobs, {batch_timeout}s timeout")

    def save_job_concurrent(self, job_data: dict, score: float = 0.0) -> bool:
        """
        Save a job with thread safety and optimal performance.

        Args:
            job_data: Job data dictionary
            score: Job relevance score

        Returns:
            True if saved successfully
        """
        if self.enable_batching:
            return self._add_to_batch(job_data, score)
        else:
            return self._save_job_immediate(job_data, score)

    def save_jobs_batch(self, jobs_data: list[dict], scores: list[float] | None = None) -> int:
        """
        Save multiple jobs in an optimized batch operation.

        Args:
            jobs_data: List of job data dictionaries
            scores: Optional list of scores (defaults to 0.0)

        Returns:
            Number of jobs successfully saved
        """
        if not jobs_data:
            return 0

        if scores is None:
            scores = [0.0] * len(jobs_data)

        start_time = time.time()
        saved_count = 0

        try:
            with self.connection_pool.get_connection() as engine:
                with Session(engine) as session:
                    for job_data, score in zip(jobs_data, scores, strict=False):
                        try:
                            job_hash = job_data.get("hash")
                            if not job_hash:
                                continue

                            # Check if job exists
                            existing_job = session.exec(
                                select(UnifiedJob).where(UnifiedJob.hash == job_hash)
                            ).first()

                            if existing_job:
                                # Update existing job
                                self._update_existing_job(existing_job, job_data, session)
                                saved_count += 1
                            else:
                                # Create new job
                                new_job = UnifiedJob.from_scraped_data(job_data, score)
                                session.add(new_job)
                                saved_count += 1

                        except Exception as e:
                            logger.error(f"Failed to save job in batch: {e}")
                            continue

                    # Commit all changes at once
                    session.commit()

        except Exception as e:
            logger.error(f"Batch save operation failed: {e}")
            return 0

        duration = time.time() - start_time

        with self._stats_lock:
            self._stats["jobs_saved"] += saved_count
            self._stats["batch_operations"] += 1
            self._stats["total_time"] += duration

        logger.info(f"Batch saved {saved_count}/{len(jobs_data)} jobs in {duration:.2f}s")
        return saved_count

    def _add_to_batch(self, job_data: dict, score: float) -> bool:
        """Add job to batch queue for later processing."""
        with self._batch_lock:
            self._batch_queue.append(
                BatchJobData(job_data=job_data, score=score, timestamp=time.time())
            )

            # Check if batch should be flushed
            should_flush = (
                len(self._batch_queue) >= self.batch_size
                or (time.time() - self._last_batch_time) >= self.batch_timeout
            )

            if should_flush:
                self._flush_batch()

        return True

    def _flush_batch(self):
        """Flush the current batch to database."""
        if not self._batch_queue:
            return

        batch_to_save = self._batch_queue.copy()
        self._batch_queue.clear()
        self._last_batch_time = time.time()

        # Save batch in background
        jobs_data = [item.job_data for item in batch_to_save]
        scores = [item.score for item in batch_to_save]

        self.save_jobs_batch(jobs_data, scores)

    def _batch_processor(self):
        """Background thread that periodically flushes batches."""
        while True:
            try:
                time.sleep(1)  # Check every second

                with self._batch_lock:
                    if (
                        self._batch_queue
                        and (time.time() - self._last_batch_time) >= self.batch_timeout
                    ):
                        self._flush_batch()

            except Exception as e:
                logger.error(f"Batch processor error: {e}")

    def _save_job_immediate(self, job_data: dict, score: float) -> bool:
        """Save job immediately (no batching)."""
        try:
            with self.connection_pool.get_connection():
                result = save_unified_job(job_data, score)

                with self._stats_lock:
                    if result:
                        self._stats["jobs_saved"] += 1

                return result is not None

        except Exception as e:
            logger.error(f"Immediate save failed: {e}")
            return False

    def _update_existing_job(self, existing_job: UnifiedJob, job_data: dict, session: Session):
        """Update an existing job with new data."""
        from datetime import datetime

        existing_job.last_seen = datetime.now(UTC)
        existing_job.times_seen += 1
        existing_job.updated_at = datetime.now(UTC)

        # Update fields with new data
        for key, value in job_data.items():
            if hasattr(existing_job, key) and value is not None:
                setattr(existing_job, key, value)

        session.add(existing_job)

    def flush_pending_batches(self):
        """Force flush all pending batches."""
        with self._batch_lock:
            if self._batch_queue:
                self._flush_batch()

    def get_stats(self) -> dict:
        """Get database operation statistics."""
        with self._stats_lock:
            return self._stats.copy()

    def optimize_database(self):
        """Perform database optimization operations."""
        try:
            with self.connection_pool.get_connection() as engine:
                with Session(engine) as session:
                    # Run VACUUM to optimize SQLite
                    session.exec("VACUUM")

                    # Analyze tables for query optimization
                    session.exec("ANALYZE")

                    logger.info("Database optimization completed")

        except Exception as e:
            logger.error(f"Database optimization failed: {e}")


# Global instance for easy usage
_global_db_handler = None
_global_db_lock = Lock()


def get_concurrent_database() -> ConcurrentJobDatabase:
    """Get the global concurrent database handler."""
    global _global_db_handler

    if _global_db_handler is None:
        with _global_db_lock:
            if _global_db_handler is None:
                _global_db_handler = ConcurrentJobDatabase()

    return _global_db_handler


def save_jobs_concurrent(jobs_data: list[dict], scores: list[float] | None = None) -> int:
    """
    Convenience function to save multiple jobs concurrently.

    Args:
        jobs_data: List of job data dictionaries
        scores: Optional list of scores

    Returns:
        Number of jobs successfully saved
    """
    db_handler = get_concurrent_database()
    return db_handler.save_jobs_batch(jobs_data, scores)


def save_job_concurrent(job_data: dict, score: float = 0.0) -> bool:
    """
    Convenience function to save a single job concurrently.

    Args:
        job_data: Job data dictionary
        score: Job relevance score

    Returns:
        True if saved successfully
    """
    db_handler = get_concurrent_database()
    return db_handler.save_job_concurrent(job_data, score)


class DatabaseBenchmark:
    """Benchmark database performance under different concurrency scenarios."""

    @staticmethod
    def benchmark_save_performance(jobs_data: list[dict], workers: int = 4) -> dict:
        """Benchmark database save performance."""
        results = {}

        # Sequential benchmark
        start_time = time.time()
        sequential_count = 0
        for job_data in jobs_data:
            if save_job_concurrent(job_data):
                sequential_count += 1
        results["sequential"] = {
            "time": time.time() - start_time,
            "jobs_saved": sequential_count,
            "jobs_per_second": sequential_count / (time.time() - start_time),
        }

        # Concurrent benchmark
        start_time = time.time()
        db_handler = ConcurrentJobDatabase(enable_batching=True)
        concurrent_count = db_handler.save_jobs_batch(jobs_data)
        db_handler.flush_pending_batches()

        results["concurrent_batch"] = {
            "time": time.time() - start_time,
            "jobs_saved": concurrent_count,
            "jobs_per_second": concurrent_count / (time.time() - start_time),
        }

        return results
