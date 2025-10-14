"""SQLite database optimization utilities.

Provides tools to optimize SQLite database performance for Windows local deployment.
Includes indexing, vacuuming, WAL mode configuration, and query optimization.

References:
- SQLite Documentation | https://www.sqlite.org/optoverview.html | High | Query optimizer
- SQLite Performance Tuning | https://www.sqlite.org/pragma.html | High | PRAGMA settings
- ISO/IEC 29110 | Systems and Software Engineering | High | Quality management
"""

import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path


@dataclass
class OptimizationResult:
    """Result of a database optimization operation."""

    operation: str
    success: bool
    duration_ms: float
    message: str
    size_before_mb: float | None = None
    size_after_mb: float | None = None


class DatabaseOptimizer:
    """SQLite database optimization utilities."""

    def __init__(self, db_path: Path | str) -> None:
        """Initialize the database optimizer.

        Args:
            db_path: Path to the SQLite database file
        """
        self.db_path = Path(db_path)

    def optimize_all(self) -> list[OptimizationResult]:
        """Run all optimization operations.

        Returns:
            List of optimization results
        """
        results: list[OptimizationResult] = []

        # Enable Write-Ahead Logging (WAL) mode
        results.append(self.enable_wal_mode())

        # Create recommended indexes
        results.append(self.create_indexes())

        # Analyze query patterns
        results.append(self.analyze_database())

        # Vacuum database
        results.append(self.vacuum_database())

        # Optimize pragmas
        results.append(self.optimize_pragmas())

        return results

    def enable_wal_mode(self) -> OptimizationResult:
        """Enable Write-Ahead Logging (WAL) mode for better concurrency.

        WAL mode allows readers and writers to operate concurrently,
        improving performance for Windows local deployment.

        Returns:
            Optimization result
        """
        start = time.time()

        try:
            with sqlite3.connect(self.db_path) as conn:
                # Check current mode
                current_mode = conn.execute("PRAGMA journal_mode").fetchone()[0]

                if current_mode.lower() == "wal":
                    duration = (time.time() - start) * 1000
                    return OptimizationResult(
                        operation="WAL Mode",
                        success=True,
                        duration_ms=duration,
                        message="Already using WAL mode",
                    )

                # Enable WAL mode
                conn.execute("PRAGMA journal_mode=WAL")
                conn.commit()

                duration = (time.time() - start) * 1000
                return OptimizationResult(
                    operation="WAL Mode",
                    success=True,
                    duration_ms=duration,
                    message="Enabled WAL mode for better concurrency",
                )

        except Exception as e:
            duration = (time.time() - start) * 1000
            return OptimizationResult(
                operation="WAL Mode",
                success=False,
                duration_ms=duration,
                message=f"Failed to enable WAL mode: {e}",
            )

    def create_indexes(self) -> OptimizationResult:
        """Create recommended indexes for common queries.

        Returns:
            Optimization result
        """
        start = time.time()

        indexes = [
            ("idx_jobs_score", "CREATE INDEX IF NOT EXISTS idx_jobs_score ON jobs(score DESC)"),
            (
                "idx_jobs_posted_at",
                "CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at DESC)",
            ),
            ("idx_jobs_source", "CREATE INDEX IF NOT EXISTS idx_jobs_source ON jobs(source)"),
            ("idx_jobs_remote", "CREATE INDEX IF NOT EXISTS idx_jobs_remote ON jobs(remote)"),
            (
                "idx_jobs_company",
                "CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company)",
            ),
            (
                "idx_tracked_status",
                "CREATE INDEX IF NOT EXISTS idx_tracked_status ON tracked_jobs(status)",
            ),
            (
                "idx_tracked_job_id",
                "CREATE INDEX IF NOT EXISTS idx_tracked_job_id ON tracked_jobs(job_id)",
            ),
        ]

        try:
            with sqlite3.connect(self.db_path) as conn:
                created_count = 0
                for _name, sql in indexes:
                    try:
                        conn.execute(sql)
                        created_count += 1
                    except sqlite3.OperationalError:
                        # Index might already exist or table doesn't exist yet
                        pass

                conn.commit()

                duration = (time.time() - start) * 1000
                return OptimizationResult(
                    operation="Create Indexes",
                    success=True,
                    duration_ms=duration,
                    message=f"Created {created_count}/{len(indexes)} indexes",
                )

        except Exception as e:
            duration = (time.time() - start) * 1000
            return OptimizationResult(
                operation="Create Indexes",
                success=False,
                duration_ms=duration,
                message=f"Failed to create indexes: {e}",
            )

    def analyze_database(self) -> OptimizationResult:
        """Run ANALYZE to update query optimizer statistics.

        Returns:
            Optimization result
        """
        start = time.time()

        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("ANALYZE")
                conn.commit()

                duration = (time.time() - start) * 1000
                return OptimizationResult(
                    operation="Analyze Database",
                    success=True,
                    duration_ms=duration,
                    message="Updated query optimizer statistics",
                )

        except Exception as e:
            duration = (time.time() - start) * 1000
            return OptimizationResult(
                operation="Analyze Database",
                success=False,
                duration_ms=duration,
                message=f"Failed to analyze: {e}",
            )

    def vacuum_database(self) -> OptimizationResult:
        """Run VACUUM to reclaim space and defragment database.

        Returns:
            Optimization result
        """
        start = time.time()

        try:
            # Get size before
            size_before = self.db_path.stat().st_size / (1024 * 1024)

            with sqlite3.connect(self.db_path) as conn:
                conn.execute("VACUUM")

            # Get size after
            size_after = self.db_path.stat().st_size / (1024 * 1024)
            saved_mb = size_before - size_after

            duration = (time.time() - start) * 1000
            return OptimizationResult(
                operation="Vacuum Database",
                success=True,
                duration_ms=duration,
                message=f"Reclaimed {saved_mb:.2f} MB",
                size_before_mb=size_before,
                size_after_mb=size_after,
            )

        except Exception as e:
            duration = (time.time() - start) * 1000
            return OptimizationResult(
                operation="Vacuum Database",
                success=False,
                duration_ms=duration,
                message=f"Failed to vacuum: {e}",
            )

    def optimize_pragmas(self) -> OptimizationResult:
        """Set optimal PRAGMA settings for performance.

        Returns:
            Optimization result
        """
        start = time.time()

        pragmas = [
            ("synchronous", "NORMAL"),  # Balance safety and speed
            ("temp_store", "MEMORY"),  # Use memory for temp tables
            ("mmap_size", "30000000000"),  # Use memory-mapped I/O (30GB)
            ("page_size", "4096"),  # Optimal page size for most systems
            ("cache_size", "-64000"),  # 64MB cache (negative = KB)
        ]

        try:
            with sqlite3.connect(self.db_path) as conn:
                set_count = 0
                for pragma, value in pragmas:
                    try:
                        conn.execute(f"PRAGMA {pragma}={value}")
                        set_count += 1
                    except sqlite3.OperationalError:
                        # Some pragmas might not be supported
                        pass

                conn.commit()

                duration = (time.time() - start) * 1000
                return OptimizationResult(
                    operation="Optimize PRAGMAs",
                    success=True,
                    duration_ms=duration,
                    message=f"Applied {set_count}/{len(pragmas)} optimizations",
                )

        except Exception as e:
            duration = (time.time() - start) * 1000
            return OptimizationResult(
                operation="Optimize PRAGMAs",
                success=False,
                duration_ms=duration,
                message=f"Failed to optimize: {e}",
            )

    def get_database_info(self) -> dict[str, str | float]:
        """Get database information and statistics.

        Returns:
            Dictionary with database info
        """
        info: dict[str, str | float] = {}

        try:
            # File size
            size_mb = self.db_path.stat().st_size / (1024 * 1024)
            info["size_mb"] = round(size_mb, 2)

            with sqlite3.connect(self.db_path) as conn:
                # Journal mode
                mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
                info["journal_mode"] = mode

                # Page count
                page_count = conn.execute("PRAGMA page_count").fetchone()[0]
                info["page_count"] = page_count

                # Page size
                page_size = conn.execute("PRAGMA page_size").fetchone()[0]
                info["page_size"] = page_size

                # Table count
                tables = conn.execute(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table'"
                ).fetchone()[0]
                info["table_count"] = tables

                # Index count
                indexes = conn.execute(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='index'"
                ).fetchone()[0]
                info["index_count"] = indexes

        except Exception as e:
            info["error"] = str(e)

        return info

    def print_results(self, results: list[OptimizationResult]) -> None:
        """Print optimization results in a user-friendly format.

        Args:
            results: List of optimization results
        """
        print("\n" + "=" * 70)
        print("SQLite Database Optimization Results")
        print("=" * 70 + "\n")

        for result in results:
            if result.success:
                print(f"✅ {result.operation}: {result.message}")
            else:
                print(f"❌ {result.operation}: {result.message}")

            print(f"   Duration: {result.duration_ms:.2f}ms")

            if result.size_before_mb and result.size_after_mb:
                print(
                    f"   Size: {result.size_before_mb:.2f}MB → {result.size_after_mb:.2f}MB"
                )

            print()

        # Print database info
        print("=" * 70)
        print("Database Information")
        print("=" * 70 + "\n")

        info = self.get_database_info()
        for key, value in info.items():
            print(f"  {key}: {value}")

        print("\n" + "=" * 70)


def main() -> int:
    """Run database optimization from command line."""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python -m jsa.db_optimize <database_path>")
        return 1

    db_path = Path(sys.argv[1])

    if not db_path.exists():
        print(f"Error: Database not found: {db_path}")
        return 1

    optimizer = DatabaseOptimizer(db_path)
    results = optimizer.optimize_all()
    optimizer.print_results(results)

    # Return 0 if all operations succeeded
    return 0 if all(r.success for r in results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
