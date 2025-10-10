"""Lightweight runtime cost & usage tracker.

Tracks approximate resource usage so a non-technical user can see:
 - Count of network calls (HTTP, Slack, etc.)
 - Approximate wall time of scraping phases
 - Subprocess invocations (e.g., gcloud)
 - (Future) Estimated cloud API bill impact (simple heuristic)

No external telemetry. All local only.
"""

from __future__ import annotations

import atexit
import threading
import time
from dataclasses import dataclass, field

_lock = threading.RLock()


@dataclass
class CostSnapshot:
    start_time: float = field(default_factory=time.time)
    http_calls: int = 0
    subprocess_calls: int = 0
    bytes_downloaded: int = 0
    pages_scraped: int = 0

    def to_dict(self) -> dict:
        runtime_s = max(0.0, time.time() - self.start_time)
        return {
            "runtime_seconds": round(runtime_s, 2),
            "http_calls": self.http_calls,
            "subprocess_calls": self.subprocess_calls,
            "bytes_downloaded": self.bytes_downloaded,
            "pages_scraped": self.pages_scraped,
            "approx_network_mb": round(self.bytes_downloaded / (1024 * 1024), 2),
            # Simple heuristic: Each HTTP call ~0.00001 USD (placeholder) -> transparent to user
            "very_rough_estimated_cost_usd": round(self.http_calls * 0.00001, 5),
        }


class CostTracker:
    def __init__(self):
        self._snapshot = CostSnapshot()
        atexit.register(self.report)

    def incr_http(self, bytes_downloaded: int = 0):
        with _lock:
            self._snapshot.http_calls += 1
            self._snapshot.bytes_downloaded += max(0, bytes_downloaded)

    def incr_subprocess(self):
        with _lock:
            self._snapshot.subprocess_calls += 1

    def incr_pages(self, count: int = 1):
        with _lock:
            self._snapshot.pages_scraped += max(0, count)

    def snapshot(self) -> dict:
        with _lock:
            return self._snapshot.to_dict()

    def report(self):  # Called automatically at process exit
        data = self.snapshot()
        print("\n=== Usage & Cost Summary (Local Approximation) ===")
        for k, v in data.items():
            print(f"{k}: {v}")
        print("(No data left this machine. All estimates are purely local heuristics.)")


# Singleton
tracker = CostTracker()
