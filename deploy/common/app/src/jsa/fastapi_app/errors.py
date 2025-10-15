"""
Enhanced error handling for FastAPI.

Provides structured error responses with proper HTTP status codes.
Follows RFC 7807 (Problem Details for HTTP APIs) specification.

References:
- RFC 7807 | https://tools.ietf.org/html/rfc7807 | High | Problem Details for HTTP APIs
"""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from jsa.logging import get_logger

logger = get_logger("errors", component="fastapi_errors")


class JobSentinelAPIError(HTTPException):
    """Base exception for JobSentinel API errors."""

    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: str,
        **extra: Any,
    ):
        """
        Initialize API error.

        Args:
            status_code: HTTP status code
            detail: Human-readable error message
            error_code: Machine-readable error code
            **extra: Additional error context
        """
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.extra = extra


class DatabaseError(JobSentinelAPIError):
    """Database operation failed."""

    def __init__(self, detail: str, **extra: Any):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            error_code="database_error",
            **extra,
        )


class ResourceNotFoundError(JobSentinelAPIError):
    """Resource not found."""

    def __init__(self, resource: str, resource_id: Any):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} not found",
            error_code="resource_not_found",
            resource=resource,
            resource_id=str(resource_id),
        )


class InputValidationError(JobSentinelAPIError):
    """Request validation failed."""

    def __init__(self, detail: str, errors: list[dict[str, Any]] | None = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code="validation_error",
            errors=errors or [],
        )


class RateLimitError(JobSentinelAPIError):
    """Rate limit exceeded."""

    def __init__(self, retry_after: int = 60):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
            error_code="rate_limit_exceeded",
            retry_after=retry_after,
        )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Handle Pydantic validation errors.

    Follows RFC 7807 Problem Details specification.

    Returns:
        JSONResponse with structured error details
    """
    errors = []
    for error in exc.errors():
        errors.append(
            {
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            }
        )

    logger.warning(
        "Validation error",
        path=request.url.path,
        errors=errors,
        component="fastapi_errors",
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            # RFC 7807 fields
            "type": "https://jobsentinel.local/errors/validation-error",
            "title": "Request Validation Failed",
            "status": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "detail": "One or more fields failed validation. See 'errors' for details.",
            "instance": str(request.url.path),
            # Additional context
            "error_code": "validation_error",
            "errors": errors,
        },
        headers={"Content-Type": "application/problem+json"},
    )


async def jobsentinel_exception_handler(request: Request, exc: JobSentinelAPIError) -> JSONResponse:
    """
    Handle JobSentinel API errors.

    Follows RFC 7807 Problem Details specification.

    Returns:
        JSONResponse with structured error details
    """
    logger.error(
        "API error",
        path=request.url.path,
        status_code=exc.status_code,
        error_code=exc.error_code,
        detail=exc.detail,
        component="fastapi_errors",
    )

    # Map error codes to titles
    error_titles = {
        "database_error": "Database Error",
        "resource_not_found": "Resource Not Found",
        "validation_error": "Validation Error",
        "rate_limit_exceeded": "Rate Limit Exceeded",
    }

    content = {
        # RFC 7807 fields
        "type": f"https://jobsentinel.local/errors/{exc.error_code.replace('_', '-')}",
        "title": error_titles.get(exc.error_code, "API Error"),
        "status": exc.status_code,
        "detail": exc.detail,
        "instance": str(request.url.path),
        # Additional context
        "error_code": exc.error_code,
    }

    # Add extra context if present
    if exc.extra:
        content.update(exc.extra)

    return JSONResponse(
        status_code=exc.status_code,
        content=content,
        headers={"Content-Type": "application/problem+json"},
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle unexpected exceptions.

    Follows RFC 7807 Problem Details specification.

    Returns:
        JSONResponse with generic error message (no sensitive details)
    """
    logger.error(
        "Unexpected error",
        path=request.url.path,
        error_type=type(exc).__name__,
        error=str(exc),
        component="fastapi_errors",
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            # RFC 7807 fields
            "type": "https://jobsentinel.local/errors/internal-server-error",
            "title": "Internal Server Error",
            "status": status.HTTP_500_INTERNAL_SERVER_ERROR,
            "detail": "An internal error occurred. Please try again later.",
            "instance": str(request.url.path),
            # Additional context
            "error_code": "internal_server_error",
        },
        headers={"Content-Type": "application/problem+json"},
    )
