"""Comprehensive tests for utils.cache module.

Tests cover:
- LRUCache basic operations (get, set, clear)
- LRUCache TTL expiration
- LRUCache LRU eviction
- LRUCache statistics
- JobCache duplicate detection
- JobCache hash generation strategies
- URL normalization
- Edge cases and boundary conditions
"""

import hashlib
import time
from unittest.mock import patch

import pytest

from utils.cache import JobCache, LRUCache


class TestLRUCacheInitialization:
    """Tests for LRUCache initialization."""

    def test_lru_cache_default_initialization(self):
        """LRUCache initializes with default values."""
        cache = LRUCache()
        
        assert cache.max_size == 10000
        assert cache.ttl_seconds == 3600
        assert len(cache.cache) == 0
        assert cache._hits == 0
        assert cache._misses == 0

    def test_lru_cache_custom_initialization(self):
        """LRUCache accepts custom configuration."""
        cache = LRUCache(max_size=100, ttl_seconds=60)
        
        assert cache.max_size == 100
        assert cache.ttl_seconds == 60


class TestLRUCacheGetSet:
    """Tests for LRUCache get and set operations."""

    @pytest.fixture
    def cache(self):
        """Provide a fresh cache instance."""
        return LRUCache(max_size=3, ttl_seconds=60)

    def test_get_nonexistent_key_returns_none(self, cache):
        """get returns None for non-existent key."""
        result = cache.get("missing")
        
        assert result is None

    def test_get_nonexistent_key_increments_misses(self, cache):
        """get increments misses for non-existent key."""
        cache.get("missing")
        stats = cache.get_stats()
        
        assert stats["misses"] == 1
        assert stats["hits"] == 0

    def test_set_and_get_value(self, cache):
        """set stores value and get retrieves it."""
        cache.set("key1", "value1")
        result = cache.get("key1")
        
        assert result == "value1"

    def test_get_existing_key_increments_hits(self, cache):
        """get increments hits for existing key."""
        cache.set("key1", "value1")
        cache.get("key1")
        stats = cache.get_stats()
        
        assert stats["hits"] == 1
        assert stats["misses"] == 0

    def test_set_updates_existing_key(self, cache):
        """set updates existing key with new value."""
        cache.set("key1", "value1")
        cache.set("key1", "value2")
        result = cache.get("key1")
        
        assert result == "value2"

    def test_set_various_value_types(self, cache):
        """set handles various Python value types."""
        test_values = [
            ("str", "string value"),
            ("int", 42),
            ("float", 3.14),
            ("list", [1, 2, 3]),
            ("dict", {"a": 1, "b": 2}),
            ("none", None),
            ("bool", True),
        ]
        
        for key, value in test_values:
            cache.set(key, value)
            result = cache.get(key)
            assert result == value


class TestLRUCacheLRUEviction:
    """Tests for LRU eviction behavior."""

    def test_evicts_oldest_when_at_capacity(self):
        """Cache evicts oldest entry when at max_size."""
        cache = LRUCache(max_size=2, ttl_seconds=60)
        
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")  # Should evict key1
        
        assert cache.get("key1") is None
        assert cache.get("key2") == "value2"
        assert cache.get("key3") == "value3"

    def test_get_updates_access_order(self):
        """get moves entry to most recent position."""
        cache = LRUCache(max_size=2, ttl_seconds=60)
        
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.get("key1")  # Access key1, making it most recent
        cache.set("key3", "value3")  # Should evict key2, not key1
        
        assert cache.get("key1") == "value1"
        assert cache.get("key2") is None
        assert cache.get("key3") == "value3"

    def test_set_updates_access_order(self):
        """set on existing key updates access order."""
        cache = LRUCache(max_size=2, ttl_seconds=60)
        
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key1", "updated1")  # Update key1, making it most recent
        cache.set("key3", "value3")  # Should evict key2
        
        assert cache.get("key1") == "updated1"
        assert cache.get("key2") is None


class TestLRUCacheTTL:
    """Tests for TTL expiration behavior."""

    def test_get_expired_entry_returns_none(self):
        """get returns None for expired entry."""
        cache = LRUCache(max_size=10, ttl_seconds=0.1)
        
        cache.set("key1", "value1")
        time.sleep(0.15)  # Wait for expiration
        result = cache.get("key1")
        
        assert result is None

    def test_get_expired_entry_increments_misses(self):
        """get increments misses for expired entry."""
        cache = LRUCache(max_size=10, ttl_seconds=0.1)
        
        cache.set("key1", "value1")
        time.sleep(0.15)
        cache.get("key1")
        stats = cache.get_stats()
        
        assert stats["misses"] == 1

    def test_get_expired_entry_removes_from_cache(self):
        """get removes expired entry from cache."""
        cache = LRUCache(max_size=10, ttl_seconds=0.1)
        
        cache.set("key1", "value1")
        assert len(cache.cache) == 1
        
        time.sleep(0.15)
        cache.get("key1")
        
        assert len(cache.cache) == 0

    def test_get_valid_entry_before_expiration(self):
        """get returns value before TTL expiration."""
        cache = LRUCache(max_size=10, ttl_seconds=1.0)
        
        cache.set("key1", "value1")
        time.sleep(0.5)  # Wait but don't expire
        result = cache.get("key1")
        
        assert result == "value1"


class TestLRUCacheClear:
    """Tests for cache clear operation."""

    def test_clear_removes_all_entries(self):
        """clear removes all cache entries."""
        cache = LRUCache()
        
        for i in range(10):
            cache.set(f"key{i}", f"value{i}")
        
        cache.clear()
        assert len(cache.cache) == 0

    def test_clear_resets_stats(self):
        """clear resets hit and miss statistics."""
        cache = LRUCache()
        
        cache.set("key1", "value1")
        cache.get("key1")  # hit
        cache.get("missing")  # miss
        
        cache.clear()
        stats = cache.get_stats()
        
        assert stats["hits"] == 0
        assert stats["misses"] == 0


class TestLRUCacheStats:
    """Tests for cache statistics."""

    def test_get_stats_returns_all_fields(self):
        """get_stats returns all expected fields."""
        cache = LRUCache()
        stats = cache.get_stats()
        
        expected_keys = {"size", "max_size", "hits", "misses", "hit_rate", "ttl_seconds"}
        assert set(stats.keys()) == expected_keys

    def test_get_stats_accurate_size(self):
        """get_stats returns accurate cache size."""
        cache = LRUCache()
        
        for i in range(5):
            cache.set(f"key{i}", i)
        
        stats = cache.get_stats()
        assert stats["size"] == 5

    def test_get_stats_calculates_hit_rate(self):
        """get_stats calculates correct hit rate."""
        cache = LRUCache()
        
        cache.set("key1", "value1")
        cache.get("key1")  # hit
        cache.get("key1")  # hit
        cache.get("missing")  # miss
        
        stats = cache.get_stats()
        assert stats["hit_rate"] == pytest.approx(2/3)

    def test_get_stats_zero_accesses_zero_hit_rate(self):
        """get_stats returns 0 hit_rate with no accesses."""
        cache = LRUCache()
        stats = cache.get_stats()
        
        assert stats["hit_rate"] == 0


class TestJobCacheInitialization:
    """Tests for JobCache initialization."""

    def test_job_cache_default_initialization(self):
        """JobCache initializes with default values."""
        cache = JobCache()
        
        assert cache.max_size == 10000
        assert len(cache.job_hashes) == 0
        assert isinstance(cache.url_cache, LRUCache)

    def test_job_cache_custom_max_size(self):
        """JobCache accepts custom max_size."""
        cache = JobCache(max_size=100)
        
        assert cache.max_size == 100


class TestJobCacheHashGeneration:
    """Tests for job hash generation strategies."""

    @pytest.fixture
    def cache(self):
        """Provide a fresh JobCache instance."""
        return JobCache()

    def test_get_job_hash_with_external_id(self, cache):
        """get_job_hash prioritizes external_job_id."""
        job = {
            "external_job_id": "ext123",
            "url": "https://example.com/job",
            "title": "Software Engineer",
            "company": "Example Corp"
        }
        
        hash_result = cache.get_job_hash(job)
        expected = hashlib.sha256(b"external_id:ext123").hexdigest()
        
        assert hash_result == expected

    def test_get_job_hash_with_url_fallback(self, cache):
        """get_job_hash uses URL when no external_id."""
        job = {
            "url": "https://example.com/job",
            "title": "Software Engineer",
            "company": "Example Corp"
        }
        
        hash_result = cache.get_job_hash(job)
        # Should contain normalized URL
        assert len(hash_result) == 64  # SHA256 hex length

    def test_get_job_hash_content_based_fallback(self, cache):
        """get_job_hash uses content when no id or URL."""
        job = {
            "title": "Software Engineer",
            "company": "Example Corp",
            "description": "Great opportunity"
        }
        
        hash_result = cache.get_job_hash(job)
        expected = hashlib.sha256(
            b"content:example corp|software engineer|great opportunity"
        ).hexdigest()
        
        assert hash_result == expected

    def test_get_job_hash_empty_job(self, cache):
        """get_job_hash handles empty job dict."""
        job = {}
        hash_result = cache.get_job_hash(job)
        
        # Should still return a hash (content-based with empty strings)
        assert len(hash_result) == 64


class TestURLNormalization:
    """Tests for URL normalization."""

    @pytest.fixture
    def cache(self):
        """Provide a fresh JobCache instance."""
        return JobCache()

    def test_normalize_url_removes_tracking_params(self, cache):
        """_normalize_url removes tracking parameters."""
        url = "https://example.com/job?utm_source=indeed&utm_campaign=test"
        normalized = cache._normalize_url(url)
        
        assert "utm_source" not in normalized
        assert "utm_campaign" not in normalized

    def test_normalize_url_preserves_valid_params(self, cache):
        """_normalize_url preserves non-tracking parameters."""
        url = "https://example.com/job?id=123&location=sf"
        normalized = cache._normalize_url(url)
        
        assert "id=123" in normalized
        assert "location=sf" in normalized

    def test_normalize_url_removes_trailing_slash(self, cache):
        """_normalize_url removes trailing slash from path."""
        url = "https://example.com/job/"
        normalized = cache._normalize_url(url)
        
        assert not normalized.endswith("/job/")

    def test_normalize_url_lowercases_url(self, cache):
        """_normalize_url converts URL to lowercase."""
        url = "https://EXAMPLE.COM/JOB"
        normalized = cache._normalize_url(url)
        
        assert normalized == "https://example.com/job"

    def test_normalize_url_handles_malformed_url(self, cache):
        """_normalize_url handles malformed URLs gracefully."""
        url = "not a valid url"
        normalized = cache._normalize_url(url)
        
        # Should return lowercased version without raising
        assert "not a valid url" in normalized.lower()


class TestJobCacheDuplicateDetection:
    """Tests for duplicate job detection."""

    @pytest.fixture
    def cache(self):
        """Provide a fresh JobCache instance."""
        return JobCache(max_size=3)

    def test_is_duplicate_first_occurrence_returns_false(self, cache):
        """is_duplicate returns False for first occurrence."""
        job = {"url": "https://example.com/job1", "title": "Engineer"}
        
        assert cache.is_duplicate(job) is False

    def test_is_duplicate_second_occurrence_returns_true(self, cache):
        """is_duplicate returns True for duplicate job."""
        job = {"url": "https://example.com/job1", "title": "Engineer"}
        
        cache.is_duplicate(job)  # First occurrence
        result = cache.is_duplicate(job)  # Second occurrence
        
        assert result is True

    def test_is_duplicate_similar_jobs_with_same_hash(self, cache):
        """is_duplicate detects jobs with same normalized hash."""
        job1 = {"url": "https://example.com/job?utm_source=indeed"}
        job2 = {"url": "https://example.com/job?utm_source=linkedin"}
        
        cache.is_duplicate(job1)
        result = cache.is_duplicate(job2)
        
        # Should be duplicate due to URL normalization
        assert result is True

    def test_is_duplicate_evicts_oldest_at_capacity(self, cache):
        """is_duplicate evicts oldest entry when at capacity."""
        jobs = [
            {"url": f"https://example.com/job{i}"}
            for i in range(4)
        ]
        
        # Fill cache to capacity (3) and add one more
        for job in jobs:
            cache.is_duplicate(job)
        
        # First job should have been evicted
        assert cache.is_duplicate(jobs[0]) is False
        # Last two should still be duplicates (job1 was also evicted when we re-added job0)
        assert cache.is_duplicate(jobs[2]) is True
        assert cache.is_duplicate(jobs[3]) is True


class TestJobCacheMarkSeen:
    """Tests for mark_seen operation."""

    @pytest.fixture
    def cache(self):
        """Provide a fresh JobCache instance."""
        return JobCache(max_size=2)

    def test_mark_seen_adds_to_cache(self, cache):
        """mark_seen adds job to cache."""
        job = {"url": "https://example.com/job1"}
        
        cache.mark_seen(job)
        assert cache.is_duplicate(job) is True

    def test_mark_seen_evicts_at_capacity(self, cache):
        """mark_seen respects max_size."""
        jobs = [{"url": f"https://example.com/job{i}"} for i in range(3)]
        
        for job in jobs:
            cache.mark_seen(job)
        
        # First should be evicted
        assert len(cache.job_hashes) == 2


class TestJobCacheClear:
    """Tests for JobCache clear operation."""

    def test_clear_removes_all_hashes(self):
        """clear removes all job hashes."""
        cache = JobCache()
        
        for i in range(10):
            cache.is_duplicate({"url": f"https://example.com/job{i}"})
        
        cache.clear()
        assert len(cache.job_hashes) == 0

    def test_clear_resets_url_cache(self):
        """clear resets URL cache."""
        cache = JobCache()
        
        cache.url_cache.set("key1", "value1")
        cache.clear()
        
        assert len(cache.url_cache.cache) == 0


class TestJobCacheStats:
    """Tests for JobCache statistics."""

    def test_get_stats_returns_all_fields(self):
        """get_stats returns expected structure."""
        cache = JobCache()
        stats = cache.get_stats()
        
        assert "job_hashes_count" in stats
        assert "max_size" in stats
        assert "url_cache" in stats

    def test_get_stats_accurate_count(self):
        """get_stats returns accurate job count."""
        cache = JobCache()
        
        for i in range(5):
            cache.is_duplicate({"url": f"https://example.com/job{i}"})
        
        stats = cache.get_stats()
        assert stats["job_hashes_count"] == 5


class TestGlobalJobCacheInstance:
    """Tests for global job_cache instance."""

    def test_global_job_cache_exists(self):
        """Global job_cache instance exists."""
        from utils.cache import job_cache
        
        assert job_cache is not None
        assert isinstance(job_cache, JobCache)

    def test_global_job_cache_default_size(self):
        """Global job_cache uses default max_size."""
        from utils.cache import job_cache
        
        assert job_cache.max_size == 10000
