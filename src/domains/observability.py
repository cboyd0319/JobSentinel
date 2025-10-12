"""
Observability Module for JobSentinel

Provides structured logging, metrics, and tracing capabilities following
Google SRE principles for production reliability.

References:
- Google SRE | https://sre.google | Medium | SLO/SLA and observability patterns
- OpenTelemetry | https://opentelemetry.io | High | Observability standards
- SWEBOK v4.0a | https://computer.org/swebok | High | Quality assurance practices
"""

import functools
import logging
import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable


class MetricType(Enum):
    """Types of metrics to track."""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    TIMER = "timer"


class SeverityLevel(Enum):
    """Severity levels for incidents and alerts."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class Metric:
    """
    Structured metric for observability.
    
    Attributes:
        name: Metric name (e.g., 'jobs.scraped', 'resume.analysis.duration')
        value: Metric value
        metric_type: Type of metric
        timestamp: When the metric was recorded
        labels: Additional dimensions for filtering
    """
    name: str
    value: float
    metric_type: MetricType
    timestamp: datetime = field(default_factory=datetime.utcnow)
    labels: dict[str, str] = field(default_factory=dict)


@dataclass
class PerformanceMetrics:
    """
    Performance tracking for operations.
    
    Used to monitor SLOs and identify performance bottlenecks.
    """
    operation: str
    duration_ms: float
    success: bool
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = field(default_factory=dict)


class MetricsCollector:
    """
    Central metrics collection and aggregation.
    
    Follows Google SRE principles for tracking SLIs (Service Level Indicators)
    that map to SLOs (Service Level Objectives).
    
    Key Metrics:
    - Job scraping success rate (target: 95% success)
    - Resume analysis latency (target: p95 < 5s)
    - ATS scoring accuracy (target: 90% correlation)
    - Alert delivery time (target: p99 < 30s)
    """
    
    def __init__(self):
        self.metrics: list[Metric] = []
        self.performance_data: list[PerformanceMetrics] = []
        self.logger = logging.getLogger(__name__)
        
    def record_counter(self, name: str, value: float = 1.0, labels: dict[str, str] | None = None):
        """
        Record a counter metric (monotonically increasing).
        
        Args:
            name: Metric name (e.g., 'jobs.scraped.total')
            value: Increment value (default: 1)
            labels: Additional dimensions
            
        Example:
            metrics.record_counter('jobs.scraped.total', labels={'source': 'greenhouse'})
        """
        metric = Metric(
            name=name,
            value=value,
            metric_type=MetricType.COUNTER,
            labels=labels or {}
        )
        self.metrics.append(metric)
        self.logger.debug(f"Counter {name}={value} {labels}")
    
    def record_gauge(self, name: str, value: float, labels: dict[str, str] | None = None):
        """
        Record a gauge metric (can increase or decrease).
        
        Args:
            name: Metric name (e.g., 'jobs.active.count')
            value: Current value
            labels: Additional dimensions
            
        Example:
            metrics.record_gauge('active_scrapers', value=5)
        """
        metric = Metric(
            name=name,
            value=value,
            metric_type=MetricType.GAUGE,
            labels=labels or {}
        )
        self.metrics.append(metric)
        self.logger.debug(f"Gauge {name}={value} {labels}")
    
    def record_histogram(self, name: str, value: float, labels: dict[str, str] | None = None):
        """
        Record a histogram metric (for distributions).
        
        Args:
            name: Metric name (e.g., 'resume.analysis.score')
            value: Observed value
            labels: Additional dimensions
            
        Example:
            metrics.record_histogram('resume.score', value=78.5)
        """
        metric = Metric(
            name=name,
            value=value,
            metric_type=MetricType.HISTOGRAM,
            labels=labels or {}
        )
        self.metrics.append(metric)
        self.logger.debug(f"Histogram {name}={value} {labels}")
    
    def record_performance(
        self,
        operation: str,
        duration_ms: float,
        success: bool,
        metadata: dict[str, Any] | None = None
    ):
        """
        Record performance metrics for an operation.
        
        Args:
            operation: Operation name (e.g., 'scrape_greenhouse')
            duration_ms: Duration in milliseconds
            success: Whether operation succeeded
            metadata: Additional context
            
        Example:
            metrics.record_performance('scrape_jobs', 2340.5, True, {'count': 50})
        """
        perf = PerformanceMetrics(
            operation=operation,
            duration_ms=duration_ms,
            success=success,
            metadata=metadata or {}
        )
        self.performance_data.append(perf)
        
        # Also record as histogram for aggregation
        self.record_histogram(
            f"{operation}.duration_ms",
            duration_ms,
            labels={"success": str(success)}
        )
    
    def get_metrics_summary(self) -> dict[str, Any]:
        """
        Get summary statistics for all recorded metrics.
        
        Returns:
            Dictionary with metric summaries
        """
        summary = {
            "total_metrics": len(self.metrics),
            "total_operations": len(self.performance_data),
            "metrics_by_type": {},
            "success_rate": 0.0,
        }
        
        # Count by type
        for metric_type in MetricType:
            count = sum(1 for m in self.metrics if m.metric_type == metric_type)
            summary["metrics_by_type"][metric_type.value] = count
        
        # Calculate success rate
        if self.performance_data:
            successful = sum(1 for p in self.performance_data if p.success)
            summary["success_rate"] = (successful / len(self.performance_data)) * 100
        
        return summary
    
    def clear_metrics(self):
        """Clear all recorded metrics (useful for testing)."""
        self.metrics.clear()
        self.performance_data.clear()


# Global metrics collector instance
_metrics_collector = MetricsCollector()


def get_metrics_collector() -> MetricsCollector:
    """
    Get the global metrics collector instance.
    
    Returns:
        MetricsCollector singleton
    """
    return _metrics_collector


@contextmanager
def track_performance(operation: str, metadata: dict[str, Any] | None = None):
    """
    Context manager for tracking operation performance.
    
    Args:
        operation: Operation name
        metadata: Additional context
        
    Example:
        with track_performance('scrape_greenhouse', {'url': url}):
            jobs = scraper.scrape(url)
    """
    start_time = time.perf_counter()
    success = False
    
    try:
        yield
        success = True
    except Exception:
        raise
    finally:
        duration_ms = (time.perf_counter() - start_time) * 1000
        _metrics_collector.record_performance(
            operation=operation,
            duration_ms=duration_ms,
            success=success,
            metadata=metadata
        )


def track_time(operation: str | None = None):
    """
    Decorator for tracking function execution time.
    
    Args:
        operation: Optional operation name (defaults to function name)
        
    Example:
        @track_time()
        def scrape_jobs(url):
            ...
    """
    def decorator(func: Callable) -> Callable:
        op_name = operation or f"{func.__module__}.{func.__name__}"
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.perf_counter()
            success = False
            result = None
            
            try:
                result = func(*args, **kwargs)
                success = True
                return result
            except Exception:
                raise
            finally:
                duration_ms = (time.perf_counter() - start_time) * 1000
                _metrics_collector.record_performance(
                    operation=op_name,
                    duration_ms=duration_ms,
                    success=success,
                    metadata={"args_count": len(args), "kwargs_count": len(kwargs)}
                )
        
        return wrapper
    return decorator


@dataclass
class SLO:
    """
    Service Level Objective definition.
    
    Defines target reliability metrics per Google SRE principles.
    
    Attributes:
        name: SLO name
        target_percentage: Target success rate (e.g., 95.0 for 95%)
        window_hours: Time window for measurement
        description: Human-readable description
    """
    name: str
    target_percentage: float
    window_hours: int
    description: str


# Define key SLOs for JobSentinel
KEY_SLOS = [
    SLO(
        name="job_scraping_success",
        target_percentage=95.0,
        window_hours=24,
        description="95% of job scraping operations should succeed within 24 hours"
    ),
    SLO(
        name="resume_analysis_latency",
        target_percentage=95.0,
        window_hours=24,
        description="95% of resume analyses should complete within 5 seconds"
    ),
    SLO(
        name="alert_delivery_time",
        target_percentage=99.0,
        window_hours=1,
        description="99% of alerts should be delivered within 30 seconds"
    ),
    SLO(
        name="api_availability",
        target_percentage=99.9,
        window_hours=168,  # 1 week
        description="API should be available 99.9% of the time"
    ),
]


def get_slos() -> list[SLO]:
    """
    Get all defined SLOs.
    
    Returns:
        List of SLO definitions
    """
    return KEY_SLOS.copy()
