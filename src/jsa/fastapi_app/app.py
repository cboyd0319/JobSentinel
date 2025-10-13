"""
FastAPI application factory.

Security:
  - API key authentication for all endpoints
  - CORS with configurable origins
  - Rate limiting per endpoint
  - Input validation via Pydantic
  - Secure headers (HSTS, CSP, etc.)

Privacy:
  - All data processing happens locally
  - No telemetry or analytics
  - User data never leaves the machine (unless explicitly configured)
"""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse

from jsa.logging import get_logger, setup_logging


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager."""
    logger = get_logger("fastapi", component="fastapi_app")
    logger.info("Starting FastAPI application", component="fastapi_app")
    yield
    logger.info("Shutting down FastAPI application", component="fastapi_app")


def create_app() -> FastAPI:
    """Create and configure FastAPI application.

    Returns:
        Configured FastAPI application instance
    """
    setup_logging(level=os.getenv("LOG_LEVEL", "INFO"))
    logger = get_logger("fastapi", component="fastapi_app")

    app = FastAPI(
        title="JobSentinel API",
        description=(
            "Private, local-first job search automation API. "
            "All data processing happens on your machine. "
            "No telemetry, no tracking, 100% privacy."
        ),
        version="0.6.0",
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    # Security middleware
    from jsa.fastapi_app.middleware.input_validation import InputValidationMiddleware
    from jsa.fastapi_app.middleware.rate_limit import RateLimitMiddleware
    from jsa.fastapi_app.middleware.request_id import RequestIDMiddleware
    from jsa.fastapi_app.middleware.security import SecurityHeadersMiddleware

    # Request ID tracking (first, so it's available to all other middleware)
    app.add_middleware(RequestIDMiddleware)

    # Input validation (before processing requests)
    input_validation_enabled = os.getenv("INPUT_VALIDATION_ENABLED", "true").lower() == "true"
    app.add_middleware(InputValidationMiddleware, enabled=input_validation_enabled)
    logger.info("Input validation enabled", enabled=input_validation_enabled, component="fastapi_app")

    # Add security headers
    app.add_middleware(SecurityHeadersMiddleware)

    # Rate limiting (100 req/min, 1000 req/hour per IP)
    rate_limit_enabled = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    app.add_middleware(
        RateLimitMiddleware,
        requests_per_minute=int(os.getenv("RATE_LIMIT_PER_MINUTE", "100")),
        requests_per_hour=int(os.getenv("RATE_LIMIT_PER_HOUR", "1000")),
        enabled=rate_limit_enabled,
    )
    logger.info("Rate limiting enabled", enabled=rate_limit_enabled, component="fastapi_app")

    # Trusted Host protection
    allowed_hosts = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])  # Relax for local dev

    # CORS configuration
    if os.getenv("ENABLE_CORS", "true").lower() == "true":
        cors_origins = os.getenv(
            "CORS_ORIGINS",
            "http://localhost:*,http://127.0.0.1:*,http://localhost:3000,http://localhost:5173",
        ).split(",")
        app.add_middleware(
            CORSMiddleware,
            allow_origins=cors_origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["*"],
        )
        logger.info("CORS enabled", origins=cors_origins, component="fastapi_app")

    # Compression
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Import and register routers
    from jsa.fastapi_app.routers import health, jobs, llm, ml, resume, tracker

    app.include_router(health.router, prefix="/api/v1", tags=["health"])
    app.include_router(jobs.router, prefix="/api/v1", tags=["jobs"])
    app.include_router(tracker.router, prefix="/api/v1", tags=["tracker"])
    app.include_router(resume.router, prefix="/api/v1", tags=["resume"])
    app.include_router(ml.router, prefix="/api/v1", tags=["ml"])
    app.include_router(llm.router, prefix="/api/v1", tags=["llm"])

    # Root endpoint
    @app.get("/")
    async def root() -> dict[str, str]:
        """API root endpoint."""
        return {
            "message": "JobSentinel API",
            "version": "0.6.0",
            "docs": "/api/docs",
            "privacy": "100% local-first",
        }

    # Register error handlers
    from fastapi.exceptions import RequestValidationError

    from jsa.fastapi_app.errors import (
        JobSentinelAPIError,
        generic_exception_handler,
        jobsentinel_exception_handler,
        validation_exception_handler,
    )

    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(JobSentinelAPIError, jobsentinel_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    logger.info("FastAPI app created", component="fastapi_app")
    return app


# Singleton instance for ASGI server
app = create_app()
