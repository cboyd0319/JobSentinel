"""
In-memory caching for performance optimization.
"""

import hashlib
import time
from typing import Optional, Dict, Any
from collections import OrderedDict
from utils.logging import get_logger

logger = get_logger("cache")


class LRUCache:
    """Least Recently Used (LRU) cache with TTL support."""

    def __init__(self, max_size: int = 10000, ttl_seconds: int = 3600):
        """
        Initialize LRU cache.

        Args:
            max_size: Maximum number of entries
            ttl_seconds: Time-to-live for cache entries in seconds
        """
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self.cache: OrderedDict[str, Dict[str, Any]] = OrderedDict()
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if key not in self.cache:
            self._misses += 1
            return None

        entry = self.cache[key]

        # Check TTL
        if time.time() - entry["timestamp"] > self.ttl_seconds:
            del self.cache[key]
            self._misses += 1
            return None

        # Move to end (most recently used)
        self.cache.move_to_end(key)
        self._hits += 1
        return entry["value"]

    def set(self, key: str, value: Any):
        """Set value in cache."""
        # Remove oldest if at capacity
        if len(self.cache) >= self.max_size:
            self.cache.popitem(last=False)

        self.cache[key] = {"value": value, "timestamp": time.time()}
        self.cache.move_to_end(key)

    def clear(self):
        """Clear all cache entries."""
        self.cache.clear()
        self._hits = 0
        self._misses = 0

    def get_stats(self) -> dict:
        """Get cache statistics."""
        total = self._hits + self._misses
        hit_rate = self._hits / total if total > 0 else 0

        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": hit_rate,
            "ttl_seconds": self.ttl_seconds,
        }


class JobCache:
    """Specialized cache for job duplicate detection and metadata."""

    def __init__(self, max_size: int = 10000):
        """
        Initialize job cache.

        Args:
            max_size: Maximum number of job hashes to track
        """
        self.max_size = max_size
        self.job_hashes: OrderedDict[str, bool] = OrderedDict()
        self.url_cache = LRUCache(max_size=max_size, ttl_seconds=3600)
        logger.info(f"Initialized JobCache with max_size={max_size}")

    def get_job_hash(self, job: dict) -> str:
        """
        Generate unique hash for a job with robust deduplication.

        Uses multiple strategies to catch duplicates from aggregators:
        1. Primary: Normalized URL (cleaned of tracking params)
        2. Secondary: External job IDs (Greenhouse, Lever, etc.)
        3. Tertiary: Company + Title + Description fingerprint

        Returns the FIRST matching strategy to maximize duplicate detection.
        """
        # Strategy 1: External ID (highest confidence for cross-aggregator matching)
        external_id = (
            job.get('external_job_id', '') or
            job.get('id', '') or
            job.get('greenhouseId', '') or
            job.get('jobId', '')
        )

        if external_id:
            # If we have an external ID, use it as primary hash
            # This catches same job from different aggregators
            return hashlib.md5(f"external_id:{external_id}".encode()).hexdigest()

        # Strategy 2: Normalized URL (good for same-source duplicates)
        url = job.get('url', '')
        if url:
            url_normalized = self._normalize_url(url)
            if url_normalized:
                return hashlib.md5(f"url:{url_normalized}".encode()).hexdigest()

        # Strategy 3: Content-based fingerprint (fallback)
        company = job.get('company', '').lower().strip()
        title = job.get('title', '').lower().strip()
        description = job.get('description', '')[:255].lower().strip()

        unique_str = f"content:{company}|{title}|{description}"
        return hashlib.md5(unique_str.encode()).hexdigest()

    def _normalize_url(self, url: str) -> str:
        """
        Normalize URL for better duplicate detection across aggregators.

        Removes tracking parameters and normalizes format.
        """
        from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

        try:
            parsed = urlparse(url.lower())

            # Remove common tracking parameters
            tracking_params = {
                'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                'ref', 'source', 'affiliate', 'clickid', 'sid', 'tracking',
                'fbclid', 'gclid', 'msclkid',  # Ad tracking
                'mc_cid', 'mc_eid',  # Email tracking
            }

            # Parse query params and remove tracking
            query_params = parse_qs(parsed.query)
            clean_params = {
                k: v for k, v in query_params.items()
                if k.lower() not in tracking_params
            }

            # Rebuild URL without tracking
            clean_query = urlencode(clean_params, doseq=True)
            normalized = urlunparse((
                parsed.scheme,
                parsed.netloc,
                parsed.path.rstrip('/'),  # Remove trailing slash
                '',  # params (rarely used)
                clean_query,
                ''   # fragment (often tracking)
            ))

            return normalized

        except Exception as e:
            logger.debug(f"URL normalization failed for {url}: {e}")
            return url.lower().rstrip('/')

    def is_duplicate(self, job: dict) -> bool:
        """
        Check if job is a duplicate.

        Args:
            job: Job dictionary with url, title, company

        Returns:
            True if job was seen before, False otherwise
        """
        job_hash = self.get_job_hash(job)

        if job_hash in self.job_hashes:
            # Move to end (most recently used)
            self.job_hashes.move_to_end(job_hash)
            return True

        # Add to cache
        if len(self.job_hashes) >= self.max_size:
            # Remove oldest entry
            self.job_hashes.popitem(last=False)

        self.job_hashes[job_hash] = True
        self.job_hashes.move_to_end(job_hash)
        return False

    def mark_seen(self, job: dict):
        """Mark a job as seen (for pre-loading cache)."""
        job_hash = self.get_job_hash(job)
        if len(self.job_hashes) >= self.max_size:
            self.job_hashes.popitem(last=False)
        self.job_hashes[job_hash] = True

    def clear(self):
        """Clear all cached data."""
        self.job_hashes.clear()
        self.url_cache.clear()
        logger.info("JobCache cleared")

    def get_stats(self) -> dict:
        """Get cache statistics."""
        return {
            "job_hashes_count": len(self.job_hashes),
            "max_size": self.max_size,
            "url_cache": self.url_cache.get_stats(),
        }


# Global cache instances
job_cache = JobCache(max_size=10000)
