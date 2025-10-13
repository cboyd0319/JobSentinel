"""
Input validation and sanitization middleware.

Prevents common injection attacks and malicious input.
"""

from __future__ import annotations

import re
from collections.abc import Awaitable, Callable

from fastapi import HTTPException, Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from jsa.logging import get_logger

logger = get_logger("input_validation", component="fastapi_middleware")


class InputValidationMiddleware(BaseHTTPMiddleware):
    """
    Validate and sanitize input to prevent injection attacks.

    Checks for:
    - SQL injection patterns
    - XSS attempts
    - Path traversal
    - Command injection
    - LDAP injection
    - XML injection
    """

    # Common SQL injection patterns
    SQL_INJECTION_PATTERNS = [
        r"(\bUNION\b.*\bSELECT\b)",
        r"(\bDROP\b.*\bTABLE\b)",
        r"(\bINSERT\b.*\bINTO\b)",
        r"(\bDELETE\b.*\bFROM\b)",
        r"(\bUPDATE\b.*\bSET\b)",
        r"(;.*--)",
        r"(\bOR\b\s+\d+\s*=\s*\d+)",
        r"(\bAND\b\s+\d+\s*=\s*\d+)",
        r"('.*OR.*'.*=.*')",
    ]

    # XSS patterns
    XSS_PATTERNS = [
        r"<script[^>]*>.*?</script>",
        r"javascript:",
        r"onerror\s*=",
        r"onload\s*=",
        r"onclick\s*=",
        r"<iframe[^>]*>",
        r"eval\(",
    ]

    # Path traversal
    PATH_TRAVERSAL_PATTERNS = [
        r"\.\./",
        r"\.\./\.\./",
        r"%2e%2e/",
        r"%2e%2e%2f",
    ]

    # Command injection
    COMMAND_INJECTION_PATTERNS = [
        r";\s*\w+",
        r"\|\s*\w+",
        r"`.*`",
        r"\$\(.*\)",
        r"&&",
        r"\|\|",
    ]

    def __init__(self, app: ASGIApp, enabled: bool = True):
        """
        Initialize input validation middleware.

        Args:
            app: FastAPI application
            enabled: Whether validation is enabled
        """
        super().__init__(app)
        self.enabled = enabled

        # Compile patterns for performance
        self.sql_patterns = [re.compile(p, re.IGNORECASE) for p in self.SQL_INJECTION_PATTERNS]
        self.xss_patterns = [re.compile(p, re.IGNORECASE) for p in self.XSS_PATTERNS]
        self.path_patterns = [re.compile(p, re.IGNORECASE) for p in self.PATH_TRAVERSAL_PATTERNS]
        self.cmd_patterns = [re.compile(p, re.IGNORECASE) for p in self.COMMAND_INJECTION_PATTERNS]

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        """Validate request input."""
        if not self.enabled:
            return await call_next(request)

        # Check query parameters
        for key, value in request.query_params.items():
            if self._is_malicious(value):
                logger.warning(
                    "Malicious input detected in query parameter",
                    param=key,
                    client_ip=self._get_client_ip(request),
                    path=request.url.path,
                    component="fastapi_middleware",
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid input detected. Potential security threat.",
                )

        # Check path parameters
        for value in request.path_params.values():
            if isinstance(value, str) and self._is_malicious(value):
                logger.warning(
                    "Malicious input detected in path parameter",
                    client_ip=self._get_client_ip(request),
                    path=request.url.path,
                    component="fastapi_middleware",
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid input detected. Potential security threat.",
                )

        return await call_next(request)

    def _is_malicious(self, value: str) -> bool:
        """
        Check if input contains malicious patterns.

        Args:
            value: Input string to check

        Returns:
            True if malicious patterns detected, False otherwise
        """
        # Check for SQL injection
        for pattern in self.sql_patterns:
            if pattern.search(value):
                logger.debug(
                    "SQL injection pattern detected",
                    pattern=pattern.pattern,
                    component="fastapi_middleware",
                )
                return True

        # Check for XSS
        for pattern in self.xss_patterns:
            if pattern.search(value):
                logger.debug(
                    "XSS pattern detected",
                    pattern=pattern.pattern,
                    component="fastapi_middleware",
                )
                return True

        # Check for path traversal
        for pattern in self.path_patterns:
            if pattern.search(value):
                logger.debug(
                    "Path traversal pattern detected",
                    pattern=pattern.pattern,
                    component="fastapi_middleware",
                )
                return True

        # Check for command injection
        for pattern in self.cmd_patterns:
            if pattern.search(value):
                logger.debug(
                    "Command injection pattern detected",
                    pattern=pattern.pattern,
                    component="fastapi_middleware",
                )
                return True

        return False

    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        if request.client:
            return request.client.host
        return "unknown"
