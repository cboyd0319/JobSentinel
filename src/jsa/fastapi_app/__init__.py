"""
FastAPI application for JobSentinel.

Provides modern REST API with automatic OpenAPI documentation,
while maintaining 100% privacy and security standards.
"""

from __future__ import annotations

__all__ = ["create_app", "app"]

from jsa.fastapi_app.app import create_app, app
