"""
Comprehensive unit tests for domains.observability module.

Tests cover metrics collection, performance tracking, SLO management,
decorators, and context managers for observability.
"""

from __future__ import annotations

import time
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from domains.observability import (
    KEY_SLOS,
    Metric,
    MetricType,
    MetricsCollector,
    PerformanceMetrics,
    SLO,
    SeverityLevel,
    get_metrics_collector,
    get_slos,
    track_performance,
    track_time,
)


# ============================================================================
# Test: Metric Dataclass
# ============================================================================


def test_metric_creation_with_defaults():
    """Test creating a Metric with default values."""
    metric = Metric(name="test.metric", value=42.0, metric_type=MetricType.COUNTER)
    
    assert metric.name == "test.metric"
    assert metric.value == 42.0
    assert metric.metric_type == MetricType.COUNTER
    assert isinstance(metric.timestamp, datetime)
    assert metric.labels == {}


def test_metric_creation_with_labels():
    """Test creating a Metric with custom labels."""
    labels = {"source": "greenhouse", "env": "prod"}
    metric = Metric(
        name="jobs.scraped",
        value=100.0,
        metric_type=MetricType.COUNTER,
        labels=labels,
    )
    
    assert metric.labels == labels


def test_metric_types_enum():
    """Test all MetricType enum values are accessible."""
    assert MetricType.COUNTER.value == "counter"
    assert MetricType.GAUGE.value == "gauge"
    assert MetricType.HISTOGRAM.value == "histogram"
    assert MetricType.TIMER.value == "timer"


# ============================================================================
# Test: SeverityLevel Enum
# ============================================================================


def test_severity_level_enum():
    """Test all SeverityLevel enum values."""
    assert SeverityLevel.INFO.value == "info"
    assert SeverityLevel.WARNING.value == "warning"
    assert SeverityLevel.ERROR.value == "error"
    assert SeverityLevel.CRITICAL.value == "critical"


# ============================================================================
# Test: PerformanceMetrics Dataclass
# ============================================================================


def test_performance_metrics_creation():
    """Test creating PerformanceMetrics."""
    perf = PerformanceMetrics(
        operation="test_operation",
        duration_ms=123.45,
        success=True,
        metadata={"count": 10},
    )
    
    assert perf.operation == "test_operation"
    assert perf.duration_ms == 123.45
    assert perf.success is True
    assert perf.metadata == {"count": 10}
    assert isinstance(perf.timestamp, datetime)


def test_performance_metrics_defaults():
    """Test PerformanceMetrics with default values."""
    perf = PerformanceMetrics(operation="test_op", duration_ms=100.0, success=False)
    
    assert perf.metadata == {}
    assert isinstance(perf.timestamp, datetime)


# ============================================================================
# Test: MetricsCollector - Basic Operations
# ============================================================================


def test_metrics_collector_initialization():
    """Test MetricsCollector initializes with empty data."""
    collector = MetricsCollector()
    
    assert collector.metrics == []
    assert collector.performance_data == []
    assert collector.logger is not None


def test_metrics_collector_record_counter():
    """Test recording counter metrics."""
    collector = MetricsCollector()
    
    collector.record_counter("test.counter", value=5.0, labels={"env": "test"})
    
    assert len(collector.metrics) == 1
    metric = collector.metrics[0]
    assert metric.name == "test.counter"
    assert metric.value == 5.0
    assert metric.metric_type == MetricType.COUNTER
    assert metric.labels == {"env": "test"}


def test_metrics_collector_record_counter_default_value():
    """Test counter with default increment of 1."""
    collector = MetricsCollector()
    
    collector.record_counter("test.counter")
    
    assert collector.metrics[0].value == 1.0


def test_metrics_collector_record_gauge():
    """Test recording gauge metrics."""
    collector = MetricsCollector()
    
    collector.record_gauge("active.jobs", value=42.0, labels={"status": "pending"})
    
    assert len(collector.metrics) == 1
    metric = collector.metrics[0]
    assert metric.name == "active.jobs"
    assert metric.value == 42.0
    assert metric.metric_type == MetricType.GAUGE


def test_metrics_collector_record_histogram():
    """Test recording histogram metrics."""
    collector = MetricsCollector()
    
    collector.record_histogram("score.distribution", value=85.5)
    
    assert len(collector.metrics) == 1
    metric = collector.metrics[0]
    assert metric.name == "score.distribution"
    assert metric.value == 85.5
    assert metric.metric_type == MetricType.HISTOGRAM


# ============================================================================
# Test: MetricsCollector - Performance Recording
# ============================================================================


def test_metrics_collector_record_performance():
    """Test recording performance metrics."""
    collector = MetricsCollector()
    
    collector.record_performance(
        operation="scrape_jobs",
        duration_ms=1234.56,
        success=True,
        metadata={"job_count": 50},
    )
    
    # Should record both performance data and histogram
    assert len(collector.performance_data) == 1
    assert len(collector.metrics) == 1  # histogram
    
    perf = collector.performance_data[0]
    assert perf.operation == "scrape_jobs"
    assert perf.duration_ms == 1234.56
    assert perf.success is True
    assert perf.metadata == {"job_count": 50}
    
    # Check histogram metric
    histogram = collector.metrics[0]
    assert histogram.name == "scrape_jobs.duration_ms"
    assert histogram.value == 1234.56
    assert histogram.labels["success"] == "True"


def test_metrics_collector_record_performance_failure():
    """Test recording failed operation performance."""
    collector = MetricsCollector()
    
    collector.record_performance("failed_op", 500.0, success=False)
    
    perf = collector.performance_data[0]
    assert perf.success is False
    
    histogram = collector.metrics[0]
    assert histogram.labels["success"] == "False"


# ============================================================================
# Test: MetricsCollector - Summary and Statistics
# ============================================================================


def test_metrics_collector_get_metrics_summary_empty():
    """Test summary with no metrics."""
    collector = MetricsCollector()
    summary = collector.get_metrics_summary()
    
    assert summary["total_metrics"] == 0
    assert summary["total_operations"] == 0
    assert summary["success_rate"] == 0.0
    assert "metrics_by_type" in summary


def test_metrics_collector_get_metrics_summary_with_data():
    """Test summary with various metrics."""
    collector = MetricsCollector()
    
    collector.record_counter("counter1", value=1.0)
    collector.record_counter("counter2", value=2.0)
    collector.record_gauge("gauge1", value=10.0)
    collector.record_histogram("hist1", value=50.0)
    
    collector.record_performance("op1", 100.0, success=True)
    collector.record_performance("op2", 200.0, success=True)
    collector.record_performance("op3", 300.0, success=False)
    
    summary = collector.get_metrics_summary()
    
    assert summary["total_metrics"] == 7  # 4 explicit + 3 histograms from perf
    assert summary["total_operations"] == 3
    # 2 successful out of 3 operations
    assert summary["success_rate"] == pytest.approx(66.67, abs=0.01)
    
    # Check metrics by type
    assert summary["metrics_by_type"]["counter"] == 2
    assert summary["metrics_by_type"]["gauge"] == 1
    assert summary["metrics_by_type"]["histogram"] == 4  # 1 explicit + 3 from perf


def test_metrics_collector_success_rate_calculation():
    """Test success rate calculation with various scenarios."""
    collector = MetricsCollector()
    
    # All successful
    for i in range(5):
        collector.record_performance(f"op{i}", 100.0, success=True)
    
    summary = collector.get_metrics_summary()
    assert summary["success_rate"] == 100.0
    
    # Add failures
    collector.record_performance("fail1", 100.0, success=False)
    collector.record_performance("fail2", 100.0, success=False)
    
    summary = collector.get_metrics_summary()
    # 5 successful out of 7 total
    assert summary["success_rate"] == pytest.approx(71.43, abs=0.01)


def test_metrics_collector_clear_metrics():
    """Test clearing all metrics."""
    collector = MetricsCollector()
    
    collector.record_counter("counter", value=1.0)
    collector.record_performance("op", 100.0, success=True)
    
    assert len(collector.metrics) > 0
    assert len(collector.performance_data) > 0
    
    collector.clear_metrics()
    
    assert len(collector.metrics) == 0
    assert len(collector.performance_data) == 0


# ============================================================================
# Test: Global Metrics Collector
# ============================================================================


def test_get_metrics_collector_singleton():
    """Test that get_metrics_collector returns same instance."""
    collector1 = get_metrics_collector()
    collector2 = get_metrics_collector()
    
    assert collector1 is collector2


def test_get_metrics_collector_is_metrics_collector():
    """Test that global collector is MetricsCollector instance."""
    collector = get_metrics_collector()
    
    assert isinstance(collector, MetricsCollector)


# ============================================================================
# Test: track_performance Context Manager
# ============================================================================


def test_track_performance_success():
    """Test track_performance context manager for successful operation."""
    collector = get_metrics_collector()
    collector.clear_metrics()
    
    with track_performance("test_operation", metadata={"key": "value"}):
        pass  # No need for sleep - just testing the tracking mechanism
    
    assert len(collector.performance_data) == 1
    perf = collector.performance_data[0]
    
    assert perf.operation == "test_operation"
    assert perf.success is True
    assert perf.duration_ms >= 0
    assert perf.metadata == {"key": "value"}


def test_track_performance_failure():
    """Test track_performance context manager for failed operation."""
    collector = get_metrics_collector()
    collector.clear_metrics()
    
    with pytest.raises(ValueError):
        with track_performance("failing_operation"):
            raise ValueError("Test error")
    
    assert len(collector.performance_data) == 1
    perf = collector.performance_data[0]
    
    assert perf.operation == "failing_operation"
    assert perf.success is False
    assert perf.duration_ms > 0


def test_track_performance_no_metadata():
    """Test track_performance without metadata."""
    collector = get_metrics_collector()
    collector.clear_metrics()
    
    with track_performance("simple_op"):
        pass
    
    perf = collector.performance_data[0]
    assert perf.metadata is not None


@pytest.mark.slow
def test_track_performance_timing_accuracy():
    """Test that track_performance measures time accurately (marked slow)."""
    collector = get_metrics_collector()
    collector.clear_metrics()
    
    sleep_time = 0.05  # 50ms
    with track_performance("timed_op"):
        time.sleep(sleep_time)
    
    perf = collector.performance_data[0]
    # Allow some tolerance for timing
    assert perf.duration_ms >= sleep_time * 1000 * 0.9
    assert perf.duration_ms <= sleep_time * 1000 * 2.0


# ============================================================================
# Test: track_time Decorator
# ============================================================================


def test_track_time_decorator_success():
    """Test track_time decorator on successful function."""
    collector = get_metrics_collector()
    collector.clear_metrics()
    
    @track_time()
    def sample_function(x, y):
        return x + y  # No need for sleep - just testing the decorator
    
    result = sample_function(2, 3)
    
    assert result == 5
    assert len(collector.performance_data) == 1
    
    perf = collector.performance_data[0]
    assert "sample_function" in perf.operation
    assert perf.success is True
    assert perf.duration_ms >= 0
    assert perf.metadata["args_count"] == 2
    assert perf.metadata["kwargs_count"] == 0


def test_track_time_decorator_failure():
    """Test track_time decorator on failing function."""
    collector = get_metrics_collector()
    collector.clear_metrics()
    
    @track_time()
    def failing_function():
        raise RuntimeError("Test failure")
    
    with pytest.raises(RuntimeError):
        failing_function()
    
    assert len(collector.performance_data) == 1
    perf = collector.performance_data[0]
    assert perf.success is False


def test_track_time_decorator_custom_name():
    """Test track_time decorator with custom operation name."""
    collector = get_metrics_collector()
    collector.clear_metrics()
    
    @track_time(operation="custom_operation")
    def func():
        return "result"
    
    func()
    
    perf = collector.performance_data[0]
    assert perf.operation == "custom_operation"


def test_track_time_decorator_with_kwargs():
    """Test track_time decorator counts kwargs."""
    collector = get_metrics_collector()
    collector.clear_metrics()
    
    @track_time()
    def func_with_kwargs(a, b, c=None, d=None):
        return a + b
    
    func_with_kwargs(1, 2, c=3, d=4)
    
    perf = collector.performance_data[0]
    assert perf.metadata["args_count"] == 2
    assert perf.metadata["kwargs_count"] == 2


def test_track_time_decorator_preserves_function_metadata():
    """Test that track_time preserves function name and docstring."""
    @track_time()
    def documented_function():
        """This is a test function."""
        return 42
    
    assert documented_function.__name__ == "documented_function"
    assert "test function" in documented_function.__doc__


# ============================================================================
# Test: SLO Dataclass and Key SLOs
# ============================================================================


def test_slo_creation():
    """Test creating an SLO."""
    slo = SLO(
        name="test_slo",
        target_percentage=99.5,
        window_hours=24,
        description="Test SLO description",
    )
    
    assert slo.name == "test_slo"
    assert slo.target_percentage == 99.5
    assert slo.window_hours == 24
    assert slo.description == "Test SLO description"


def test_key_slos_defined():
    """Test that KEY_SLOS contains expected SLOs."""
    assert len(KEY_SLOS) > 0
    
    slo_names = [slo.name for slo in KEY_SLOS]
    assert "job_scraping_success" in slo_names
    assert "resume_analysis_latency" in slo_names
    assert "alert_delivery_time" in slo_names
    assert "api_availability" in slo_names


def test_key_slos_structure():
    """Test that all KEY_SLOS have valid structure."""
    for slo in KEY_SLOS:
        assert isinstance(slo.name, str)
        assert isinstance(slo.target_percentage, float)
        assert 0 < slo.target_percentage <= 100
        assert isinstance(slo.window_hours, int)
        assert slo.window_hours > 0
        assert isinstance(slo.description, str)
        assert len(slo.description) > 0


def test_get_slos_returns_copy():
    """Test that get_slos returns a copy, not the original."""
    slos1 = get_slos()
    slos2 = get_slos()
    
    assert slos1 == slos2
    assert slos1 is not slos2  # Different objects


def test_get_slos_returns_all_key_slos():
    """Test that get_slos returns all KEY_SLOS."""
    slos = get_slos()
    
    assert len(slos) == len(KEY_SLOS)
    for i, slo in enumerate(slos):
        assert slo.name == KEY_SLOS[i].name


# ============================================================================
# Test: Edge Cases and Error Handling
# ============================================================================


def test_metrics_collector_handles_zero_duration():
    """Test that zero duration is handled correctly."""
    collector = MetricsCollector()
    
    collector.record_performance("instant_op", duration_ms=0.0, success=True)
    
    perf = collector.performance_data[0]
    assert perf.duration_ms == 0.0


def test_metrics_collector_handles_negative_values():
    """Test that negative metric values are accepted (for deltas)."""
    collector = MetricsCollector()
    
    collector.record_gauge("temperature", value=-10.5)
    
    metric = collector.metrics[0]
    assert metric.value == -10.5


def test_track_performance_with_empty_metadata():
    """Test track_performance with explicit empty metadata."""
    collector = get_metrics_collector()
    collector.clear_metrics()
    
    with track_performance("op", metadata={}):
        pass
    
    perf = collector.performance_data[0]
    assert perf.metadata == {}


def test_multiple_collectors_independence():
    """Test that multiple collector instances are independent."""
    collector1 = MetricsCollector()
    collector2 = MetricsCollector()
    
    collector1.record_counter("counter1", value=1.0)
    collector2.record_counter("counter2", value=2.0)
    
    assert len(collector1.metrics) == 1
    assert len(collector2.metrics) == 1
    assert collector1.metrics[0].name == "counter1"
    assert collector2.metrics[0].name == "counter2"


def test_track_time_with_generator_function():
    """Test track_time with generator functions."""
    collector = get_metrics_collector()
    collector.clear_metrics()
    
    @track_time()
    def generator_func():
        yield 1
        yield 2
        yield 3
    
    result = list(generator_func())
    
    assert result == [1, 2, 3]
    # Generator creation should be tracked
    assert len(collector.performance_data) >= 1


def test_metrics_with_unicode_labels():
    """Test metrics with Unicode in labels."""
    collector = MetricsCollector()
    
    collector.record_counter("test", labels={"city": "São Paulo", "name": "测试"})
    
    metric = collector.metrics[0]
    assert metric.labels["city"] == "São Paulo"
    assert metric.labels["name"] == "测试"
