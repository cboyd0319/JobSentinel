"""
Typed error facade re-exporting the production-grade error taxonomy.

Prefer importing from jsa.errors in new modules to decouple from the
legacy utils path and enable future changes without churn.
"""

from __future__ import annotations

from utils.error_taxonomy import (
    ErrorCategory,
    ErrorContext,
    JobSearchError,
    SystemError,
    TransientError,
    UserError,
    system_error,
    transient_error,
    user_error,
)

__all__ = [
    "ErrorCategory",
    "ErrorContext",
    "JobSearchError",
    "UserError",
    "TransientError",
    "SystemError",
    "user_error",
    "transient_error",
    "system_error",
]
