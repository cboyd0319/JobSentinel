"""
Flask middleware for rate limiting and other request processing.
"""

from __future__ import annotations

import time
from collections import defaultdict
from collections.abc import Callable
from functools import wraps
from typing import Any

from flask import Flask, jsonify, request

# Simple in-memory rate limiting storage
# For production, use Redis or similar distributed cache
_rate_limit_storage: dict[str, list[float]] = defaultdict(list)


def setup_rate_limiting(app: Flask) -> None:
    """
    Setup rate limiting middleware for API endpoints.

    Args:
        app: Flask application instance
    """
    # Rate limit: 100 requests per minute per IP
    max_requests = int(app.config.get("RATE_LIMIT_MAX_REQUESTS", 100))
    window_seconds = int(app.config.get("RATE_LIMIT_WINDOW_SECONDS", 60))

    @app.before_request
    def rate_limit_check() -> Any:
        """Check rate limit before each request to API endpoints."""
        # Only apply to API endpoints
        if not request.path.startswith("/api/"):
            return None

        # Get client identifier (IP address)
        client_id = request.remote_addr or "unknown"

        # Clean up old requests outside the time window
        current_time = time.time()
        cutoff_time = current_time - window_seconds

        _rate_limit_storage[client_id] = [
            req_time
            for req_time in _rate_limit_storage[client_id]
            if req_time > cutoff_time
        ]

        # Check if rate limit exceeded
        if len(_rate_limit_storage[client_id]) >= max_requests:
            return jsonify({
                "error": "Rate limit exceeded",
                "message": f"Maximum {max_requests} requests per {window_seconds} seconds",
                "retry_after": int(window_seconds),
            }), 429

        # Record this request
        _rate_limit_storage[client_id].append(current_time)

        return None


def rate_limit(max_requests: int = 100, window_seconds: int = 60) -> Callable:
    """
    Decorator for custom rate limiting on specific endpoints.

    Args:
        max_requests: Maximum requests allowed
        window_seconds: Time window in seconds

    Returns:
        Decorator function

    Usage:
        @rate_limit(max_requests=10, window_seconds=60)
        def my_endpoint():
            ...
    """

    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapped(*args: Any, **kwargs: Any) -> Any:
            client_id = request.remote_addr or "unknown"
            key = f"{f.__name__}:{client_id}"

            current_time = time.time()
            cutoff_time = current_time - window_seconds

            # Clean up old requests
            _rate_limit_storage[key] = [
                req_time
                for req_time in _rate_limit_storage[key]
                if req_time > cutoff_time
            ]

            # Check limit
            if len(_rate_limit_storage[key]) >= max_requests:
                return jsonify({
                    "error": "Rate limit exceeded",
                    "message": f"Maximum {max_requests} requests per {window_seconds} seconds",
                    "retry_after": int(window_seconds),
                }), 429

            # Record request
            _rate_limit_storage[key].append(current_time)

            return f(*args, **kwargs)

        return wrapped

    return decorator


def clear_rate_limits() -> None:
    """
    Clear all rate limit data.

    Useful for testing or administrative purposes.
    """
    _rate_limit_storage.clear()
