"""
Request ID middleware for tracing requests through the system.

Adds unique request ID to each request for debugging and logging.
"""

from __future__ import annotations

import uuid
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from jsa.logging import get_logger

logger = get_logger("request_id", component="fastapi_middleware")


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Add unique request ID to each request.

    Request ID is:
    - Added to response headers (X-Request-ID)
    - Added to request state for logging
    - Logged at start and end of request
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Add request ID to request and response."""
        # Generate or extract request ID
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())

        # Store in request state
        request.state.request_id = request_id

        # Log request start
        logger.info(
            "Request started",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client_ip=self._get_client_ip(request),
            component="fastapi_middleware",
        )

        # Process request
        response = await call_next(request)

        # Add request ID to response
        response.headers["X-Request-ID"] = request_id

        # Log request end
        logger.info(
            "Request completed",
            request_id=request_id,
            status_code=response.status_code,
            component="fastapi_middleware",
        )

        return response

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"
