"""Comprehensive tests for utils.cost_tracker module.

Tests cover:
- CostSnapshot creation and methods
- CostTracker increment operations
- Thread safety of operations
- Snapshot reporting
- Edge cases and boundary conditions
"""

import threading
import time
from unittest.mock import MagicMock, patch

import pytest

from utils.cost_tracker import CostSnapshot, CostTracker


class TestCostSnapshot:
    """Tests for CostSnapshot dataclass."""

    def test_cost_snapshot_default_initialization(self):
        """CostSnapshot initializes with default values."""
        snapshot = CostSnapshot()
        assert snapshot.http_calls == 0
        assert snapshot.subprocess_calls == 0
        assert snapshot.bytes_downloaded == 0
        assert snapshot.pages_scraped == 0
        assert isinstance(snapshot.start_time, float)
        assert snapshot.start_time > 0

    def test_cost_snapshot_custom_initialization(self):
        """CostSnapshot accepts custom initial values."""
        start = time.time() - 100
        snapshot = CostSnapshot(
            start_time=start,
            http_calls=5,
            subprocess_calls=3,
            bytes_downloaded=1024,
            pages_scraped=10,
        )
        assert snapshot.http_calls == 5
        assert snapshot.subprocess_calls == 3
        assert snapshot.bytes_downloaded == 1024
        assert snapshot.pages_scraped == 10
        assert snapshot.start_time == start

    def test_to_dict_includes_all_metrics(self):
        """to_dict returns dictionary with all expected keys."""
        snapshot = CostSnapshot()
        result = snapshot.to_dict()
        
        expected_keys = {
            "runtime_seconds",
            "http_calls",
            "subprocess_calls",
            "bytes_downloaded",
            "pages_scraped",
            "approx_network_mb",
            "very_rough_estimated_cost_usd",
        }
        assert set(result.keys()) == expected_keys

    def test_to_dict_calculates_runtime_correctly(self):
        """to_dict calculates runtime as delta from start_time."""
        start = time.time() - 5.5
        snapshot = CostSnapshot(start_time=start)
        result = snapshot.to_dict()
        
        # Runtime should be approximately 5.5 seconds (with small tolerance)
        assert 5.0 <= result["runtime_seconds"] <= 6.0

    def test_to_dict_converts_bytes_to_mb(self):
        """to_dict converts bytes_downloaded to approx_network_mb."""
        snapshot = CostSnapshot(bytes_downloaded=2 * 1024 * 1024)  # 2 MB
        result = snapshot.to_dict()
        
        assert result["approx_network_mb"] == 2.0

    @pytest.mark.parametrize(
        "http_calls,expected_cost",
        [
            (0, 0.0),
            (1, 0.00001),
            (100, 0.001),
            (1000, 0.01),
            (100000, 1.0),
        ],
        ids=["zero", "one", "hundred", "thousand", "hundred_thousand"],
    )
    def test_to_dict_estimates_cost_from_http_calls(self, http_calls, expected_cost):
        """to_dict estimates cost based on HTTP call count."""
        snapshot = CostSnapshot(http_calls=http_calls)
        result = snapshot.to_dict()
        
        assert result["very_rough_estimated_cost_usd"] == pytest.approx(expected_cost)

    def test_to_dict_rounds_values_appropriately(self):
        """to_dict rounds numeric values for display."""
        snapshot = CostSnapshot(
            http_calls=7,
            bytes_downloaded=1234567,  # ~1.18 MB
        )
        result = snapshot.to_dict()
        
        # Runtime should be rounded to 2 decimals
        assert isinstance(result["runtime_seconds"], float)
        # MB should be rounded to 2 decimals
        assert result["approx_network_mb"] == 1.18
        # Cost should be rounded to 5 decimals
        assert result["very_rough_estimated_cost_usd"] == 0.00007

    def test_to_dict_handles_negative_runtime(self):
        """to_dict clamps negative runtime to zero."""
        # Future start time (shouldn't happen but handle gracefully)
        snapshot = CostSnapshot(start_time=time.time() + 1000)
        result = snapshot.to_dict()
        
        assert result["runtime_seconds"] == 0.0


class TestCostTracker:
    """Tests for CostTracker class."""

    @pytest.fixture
    def tracker(self):
        """Provide a fresh CostTracker instance for each test."""
        return CostTracker()

    def test_cost_tracker_initializes_with_zero_counts(self, tracker):
        """CostTracker starts with all counters at zero."""
        snapshot = tracker.snapshot()
        
        assert snapshot["http_calls"] == 0
        assert snapshot["subprocess_calls"] == 0
        assert snapshot["bytes_downloaded"] == 0
        assert snapshot["pages_scraped"] == 0

    def test_incr_http_increments_counter(self, tracker):
        """incr_http increases http_calls counter."""
        tracker.incr_http()
        snapshot = tracker.snapshot()
        
        assert snapshot["http_calls"] == 1

    def test_incr_http_multiple_times(self, tracker):
        """incr_http can be called multiple times."""
        for _ in range(5):
            tracker.incr_http()
        
        snapshot = tracker.snapshot()
        assert snapshot["http_calls"] == 5

    def test_incr_http_tracks_bytes_downloaded(self, tracker):
        """incr_http tracks bytes_downloaded when provided."""
        tracker.incr_http(bytes_downloaded=1024)
        tracker.incr_http(bytes_downloaded=2048)
        
        snapshot = tracker.snapshot()
        assert snapshot["http_calls"] == 2
        assert snapshot["bytes_downloaded"] == 3072

    def test_incr_http_handles_zero_bytes(self, tracker):
        """incr_http handles zero bytes_downloaded."""
        tracker.incr_http(bytes_downloaded=0)
        
        snapshot = tracker.snapshot()
        assert snapshot["http_calls"] == 1
        assert snapshot["bytes_downloaded"] == 0

    def test_incr_http_clamps_negative_bytes(self, tracker):
        """incr_http clamps negative bytes to zero."""
        tracker.incr_http(bytes_downloaded=-100)
        
        snapshot = tracker.snapshot()
        assert snapshot["bytes_downloaded"] == 0

    def test_incr_subprocess_increments_counter(self, tracker):
        """incr_subprocess increases subprocess_calls counter."""
        tracker.incr_subprocess()
        snapshot = tracker.snapshot()
        
        assert snapshot["subprocess_calls"] == 1

    def test_incr_subprocess_multiple_times(self, tracker):
        """incr_subprocess can be called multiple times."""
        for _ in range(3):
            tracker.incr_subprocess()
        
        snapshot = tracker.snapshot()
        assert snapshot["subprocess_calls"] == 3

    def test_incr_pages_increments_counter(self, tracker):
        """incr_pages increases pages_scraped counter."""
        tracker.incr_pages()
        snapshot = tracker.snapshot()
        
        assert snapshot["pages_scraped"] == 1

    def test_incr_pages_with_custom_count(self, tracker):
        """incr_pages accepts custom count parameter."""
        tracker.incr_pages(count=5)
        snapshot = tracker.snapshot()
        
        assert snapshot["pages_scraped"] == 5

    def test_incr_pages_multiple_calls(self, tracker):
        """incr_pages accumulates across multiple calls."""
        tracker.incr_pages(count=3)
        tracker.incr_pages(count=2)
        tracker.incr_pages()  # Default is 1
        
        snapshot = tracker.snapshot()
        assert snapshot["pages_scraped"] == 6

    def test_incr_pages_clamps_negative_count(self, tracker):
        """incr_pages clamps negative counts to zero."""
        tracker.incr_pages(count=-5)
        
        snapshot = tracker.snapshot()
        assert snapshot["pages_scraped"] == 0

    def test_snapshot_returns_dict(self, tracker):
        """snapshot returns a dictionary."""
        result = tracker.snapshot()
        assert isinstance(result, dict)

    def test_snapshot_is_current_state(self, tracker):
        """snapshot reflects current state of all counters."""
        tracker.incr_http(bytes_downloaded=1000)
        tracker.incr_subprocess()
        tracker.incr_pages(count=2)
        
        snapshot = tracker.snapshot()
        assert snapshot["http_calls"] == 1
        assert snapshot["subprocess_calls"] == 1
        assert snapshot["pages_scraped"] == 2
        assert snapshot["bytes_downloaded"] == 1000

    def test_multiple_snapshots_track_changes(self, tracker):
        """Multiple snapshots show progression of counters."""
        snapshot1 = tracker.snapshot()
        initial_http = snapshot1["http_calls"]
        
        tracker.incr_http()
        snapshot2 = tracker.snapshot()
        
        assert snapshot2["http_calls"] == initial_http + 1

    def test_report_prints_summary(self, tracker, capsys):
        """report prints cost summary to stdout."""
        tracker.incr_http(bytes_downloaded=1024)
        tracker.incr_subprocess()
        tracker.report()
        
        captured = capsys.readouterr()
        assert "Usage & Cost Summary" in captured.out
        assert "http_calls: 1" in captured.out
        assert "subprocess_calls: 1" in captured.out
        assert "No data left this machine" in captured.out

    def test_atexit_registration(self):
        """CostTracker registers report to run at exit."""
        with patch("atexit.register") as mock_register:
            tracker = CostTracker()
            mock_register.assert_called_once()
            # Verify report was registered
            registered_func = mock_register.call_args[0][0]
            assert registered_func == tracker.report


class TestCostTrackerThreadSafety:
    """Tests for thread safety of CostTracker operations."""

    @pytest.fixture
    def tracker(self):
        """Provide a fresh CostTracker instance."""
        return CostTracker()

    def test_concurrent_incr_http_is_thread_safe(self, tracker):
        """incr_http is thread-safe under concurrent access."""
        num_threads = 10
        calls_per_thread = 100
        threads = []
        
        def worker():
            for _ in range(calls_per_thread):
                tracker.incr_http(bytes_downloaded=100)
        
        for _ in range(num_threads):
            t = threading.Thread(target=worker)
            threads.append(t)
            t.start()
        
        for t in threads:
            t.join()
        
        snapshot = tracker.snapshot()
        expected_calls = num_threads * calls_per_thread
        expected_bytes = expected_calls * 100
        
        assert snapshot["http_calls"] == expected_calls
        assert snapshot["bytes_downloaded"] == expected_bytes

    def test_concurrent_mixed_operations(self, tracker):
        """Mixed operations are thread-safe."""
        threads = []
        
        def http_worker():
            for _ in range(50):
                tracker.incr_http(bytes_downloaded=10)
        
        def subprocess_worker():
            for _ in range(30):
                tracker.incr_subprocess()
        
        def pages_worker():
            for _ in range(20):
                tracker.incr_pages(count=2)
        
        for worker_func in [http_worker, subprocess_worker, pages_worker]:
            for _ in range(5):  # 5 threads per type
                t = threading.Thread(target=worker_func)
                threads.append(t)
                t.start()
        
        for t in threads:
            t.join()
        
        snapshot = tracker.snapshot()
        assert snapshot["http_calls"] == 250  # 5 threads * 50 calls
        assert snapshot["subprocess_calls"] == 150  # 5 threads * 30 calls
        assert snapshot["pages_scraped"] == 200  # 5 threads * 20 calls * 2

    def test_snapshot_during_concurrent_updates(self, tracker):
        """snapshot is safe to call during concurrent updates."""
        stop_flag = threading.Event()
        snapshots = []
        
        def updater():
            while not stop_flag.is_set():
                tracker.incr_http()
                time.sleep(0.001)
        
        def snapshot_reader():
            for _ in range(10):
                snapshots.append(tracker.snapshot())
                time.sleep(0.005)
        
        updater_thread = threading.Thread(target=updater)
        reader_thread = threading.Thread(target=snapshot_reader)
        
        updater_thread.start()
        reader_thread.start()
        reader_thread.join()
        stop_flag.set()
        updater_thread.join()
        
        # All snapshots should be valid dicts
        assert len(snapshots) == 10
        assert all(isinstance(s, dict) for s in snapshots)
        # Snapshots should show progression (mostly non-decreasing)
        http_counts = [s["http_calls"] for s in snapshots]
        assert http_counts[-1] >= http_counts[0]


class TestCostTrackerEdgeCases:
    """Tests for edge cases and boundary conditions."""

    def test_very_large_byte_count(self):
        """Tracker handles very large byte counts."""
        tracker = CostTracker()
        large_bytes = 10 * 1024 * 1024 * 1024  # 10 GB
        
        tracker.incr_http(bytes_downloaded=large_bytes)
        snapshot = tracker.snapshot()
        
        assert snapshot["bytes_downloaded"] == large_bytes
        # Should be 10240 MB
        assert snapshot["approx_network_mb"] == pytest.approx(10240.0)

    def test_zero_operations_snapshot(self):
        """Snapshot works correctly with zero operations."""
        tracker = CostTracker()
        snapshot = tracker.snapshot()
        
        assert snapshot["http_calls"] == 0
        assert snapshot["subprocess_calls"] == 0
        assert snapshot["bytes_downloaded"] == 0
        assert snapshot["pages_scraped"] == 0
        assert snapshot["approx_network_mb"] == 0.0
        assert snapshot["very_rough_estimated_cost_usd"] == 0.0

    def test_maximum_integer_values(self):
        """Tracker handles maximum reasonable integer values."""
        tracker = CostTracker()
        max_val = 10**9  # 1 billion
        
        tracker._snapshot.http_calls = max_val
        tracker._snapshot.bytes_downloaded = max_val
        
        snapshot = tracker.snapshot()
        assert snapshot["http_calls"] == max_val
        assert snapshot["bytes_downloaded"] == max_val

    @pytest.mark.parametrize(
        "bytes_val,expected_mb",
        [
            (0, 0.0),
            (1, 0.0),
            (1024, 0.0),
            (1024 * 512, 0.5),
            (1024 * 1024, 1.0),
            (1024 * 1024 + 512, 1.0),
        ],
        ids=["zero", "one_byte", "1kb", "512kb", "1mb", "1mb_plus"],
    )
    def test_bytes_to_mb_conversion_edge_cases(self, bytes_val, expected_mb):
        """Bytes to MB conversion handles various sizes."""
        snapshot = CostSnapshot(bytes_downloaded=bytes_val)
        result = snapshot.to_dict()
        
        assert result["approx_network_mb"] == expected_mb
