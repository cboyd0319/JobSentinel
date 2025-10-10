#!/usr/bin/env python3
"""
Production-grade error taxonomy and structured exception handling.

Implements The Picky Programmer's error taxonomy:
- UserError: Bad input, configuration issues, user-correctable problems
- TransientError: Retryable failures (network, rate limits, temporary unavailability)
- SystemError: Internal bugs, infrastructure failures, programming errors

All errors include:
- Structured error codes
- Human-readable messages with actionable hints
- Trace IDs for observability
- Context preservation for debugging
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class ErrorCategory(Enum):
    """Error category classification for structured handling."""

    USER_INPUT = "USER_INPUT"
    CONFIGURATION = "CONFIGURATION"
    NETWORK = "NETWORK"
    RATE_LIMIT = "RATE_LIMIT"
    RESOURCE = "RESOURCE"
    SYSTEM_BUG = "SYSTEM_BUG"
    INFRASTRUCTURE = "INFRASTRUCTURE"
    DEPENDENCY = "DEPENDENCY"


@dataclass(frozen=True)
class ErrorContext:
    """Immutable error context for structured logging and debugging."""

    trace_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])
    operation: str | None = None
    component: str | None = None
    user_id: str | None = None
    request_id: str | None = None
    additional_data: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for structured logging."""
        return {
            "trace_id": self.trace_id,
            "operation": self.operation,
            "component": self.component,
            "user_id": self.user_id,
            "request_id": self.request_id,
            **self.additional_data,
        }


class JobSearchError(Exception):
    """
    Base exception class for job search automation system.

    Contract:
      pre: error_code is a valid identifier, message is non-empty
      post: exception includes structured context for observability
      raises: None (this is the base exception)
    """

    def __init__(
        self,
        error_code: str,
        message: str,
        hint: str | None = None,
        action: str | None = None,
        category: ErrorCategory | None = None,
        context: ErrorContext | None = None,
        cause: Exception | None = None,
    ) -> None:
        self.error_code = error_code
        self.message = message
        self.hint = hint or "Check system logs for more details"
        self.action = action or "Contact system administrator"
        self.category = category
        self.context = context or ErrorContext()
        self.cause = cause

        # Construct human-readable message
        full_message = f"[{self.error_code}] {message}"
        if hint:
            full_message += f" | Hint: {hint}"
        if action:
            full_message += f" | Action: {action}"
        full_message += f" | Trace: {self.context.trace_id}"

        super().__init__(full_message)

    def to_dict(self) -> dict[str, Any]:
        """Convert exception to structured dictionary for logging."""
        return {
            "error_code": self.error_code,
            "message": self.message,
            "hint": self.hint,
            "action": self.action,
            "category": self.category.value if self.category else None,
            "context": self.context.to_dict(),
            "cause": str(self.cause) if self.cause else None,
            "exception_type": self.__class__.__name__,
        }

    def log_structured(self, logger: logging.Logger, level: int = logging.ERROR) -> None:
        """Log exception with structured context."""
        logger.log(level, "Structured exception occurred", extra={"error_details": self.to_dict()})


class UserError(JobSearchError):
    """
    User-correctable errors (bad input, configuration issues).

    These errors indicate problems that users can fix themselves:
    - Invalid configuration values
    - Missing required parameters
    - Malformed input data
    - Permission issues they can resolve

    Contract:
      pre: error represents a user-correctable condition
      post: includes actionable guidance for user correction
    """

    def __init__(
        self,
        error_code: str,
        message: str,
        hint: str | None = None,
        action: str | None = None,
        context: ErrorContext | None = None,
        cause: Exception | None = None,
    ) -> None:
        # Default to user-friendly action if not specified
        default_action = action or "Review input parameters and configuration"
        category = ErrorCategory.USER_INPUT

        # Infer category from error code
        if "CONFIG" in error_code.upper():
            category = ErrorCategory.CONFIGURATION

        super().__init__(
            error_code=error_code,
            message=message,
            hint=hint,
            action=default_action,
            category=category,
            context=context,
            cause=cause,
        )


class TransientError(JobSearchError):
    """
    Retryable errors (network issues, rate limits, temporary failures).

    These errors represent temporary conditions that may resolve automatically:
    - Network connectivity issues
    - API rate limiting
    - Service temporarily unavailable
    - Resource temporarily locked

    Contract:
      pre: error represents a potentially transient condition
      post: includes retry guidance and backoff recommendations
    """

    def __init__(
        self,
        error_code: str,
        message: str,
        hint: str | None = None,
        action: str | None = None,
        retry_after: int | None = None,
        context: ErrorContext | None = None,
        cause: Exception | None = None,
    ) -> None:
        # Default to retry-friendly action
        default_action = (
            action or f"Retry after {retry_after or 60} seconds with exponential backoff"
        )
        category = ErrorCategory.NETWORK

        # Infer category from error code
        if "RATE_LIMIT" in error_code.upper():
            category = ErrorCategory.RATE_LIMIT
        elif "RESOURCE" in error_code.upper():
            category = ErrorCategory.RESOURCE

        self.retry_after = retry_after

        super().__init__(
            error_code=error_code,
            message=message,
            hint=hint,
            action=default_action,
            category=category,
            context=context,
            cause=cause,
        )

    def to_dict(self) -> dict[str, Any]:
        """Include retry information in structured output."""
        base_dict = super().to_dict()
        base_dict["retry_after"] = self.retry_after
        return base_dict


class SystemError(JobSearchError):
    """
    Internal system errors and bugs (programming errors, infrastructure failures).

    These errors represent issues that require developer intervention:
    - Programming bugs (assertion failures, logic errors)
    - Infrastructure failures (database down, filesystem issues)
    - Dependency failures (external service down)
    - Resource exhaustion (out of memory, disk space)

    Contract:
      pre: error represents an internal system problem
      post: includes debugging context and escalation guidance
    """

    def __init__(
        self,
        error_code: str,
        message: str,
        hint: str | None = None,
        action: str | None = None,
        severity: str = "high",
        context: ErrorContext | None = None,
        cause: Exception | None = None,
    ) -> None:
        # Default to developer-focused action
        default_action = action or "Check system logs and escalate to development team"
        category = ErrorCategory.SYSTEM_BUG

        # Infer category from error code
        if "INFRA" in error_code.upper():
            category = ErrorCategory.INFRASTRUCTURE
        elif "DEPENDENCY" in error_code.upper():
            category = ErrorCategory.DEPENDENCY

        self.severity = severity

        super().__init__(
            error_code=error_code,
            message=message,
            hint=hint,
            action=default_action,
            category=category,
            context=context,
            cause=cause,
        )

    def to_dict(self) -> dict[str, Any]:
        """Include severity in structured output."""
        base_dict = super().to_dict()
        base_dict["severity"] = self.severity
        return base_dict


# Convenience functions for common error patterns
def user_error(code: str, message: str, hint: str | None = None, **kwargs) -> UserError:
    """Create UserError with standard formatting."""
    return UserError(error_code=code, message=message, hint=hint, **kwargs)


def transient_error(code: str, message: str, retry_after: int = 60, **kwargs) -> TransientError:
    """Create TransientError with standard retry guidance."""
    return TransientError(error_code=code, message=message, retry_after=retry_after, **kwargs)


def system_error(code: str, message: str, severity: str = "high", **kwargs) -> SystemError:
    """Create SystemError with standard escalation guidance."""
    return SystemError(error_code=code, message=message, severity=severity, **kwargs)


# Context managers for structured error handling
class ErrorContextManager:
    """Context manager for structured error handling with automatic trace_id propagation."""

    def __init__(
        self,
        operation: str,
        component: str,
        logger: logging.Logger | None = None,
        **context_kwargs,
    ):
        self.operation = operation
        self.component = component
        self.logger = logger or logging.getLogger(__name__)
        self.context = ErrorContext(operation=operation, component=component, **context_kwargs)

    def __enter__(self) -> ErrorContext:
        self.logger.debug(
            f"Starting operation: {self.operation}",
            extra={"trace_id": self.context.trace_id, "component": self.component},
        )
        return self.context

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            self.logger.debug(
                f"Completed operation: {self.operation}",
                extra={"trace_id": self.context.trace_id, "component": self.component},
            )
        else:
            # Convert generic exceptions to structured ones if not already
            if not isinstance(exc_val, JobSearchError):
                # Try to categorize the exception
                if isinstance(exc_val, ValueError | TypeError | KeyError):
                    structured_exc = user_error(
                        code="INVALID_INPUT",
                        message=str(exc_val),
                        context=self.context,
                        cause=exc_val,
                    )
                elif isinstance(exc_val, ConnectionError | TimeoutError):
                    structured_exc = transient_error(
                        code="NETWORK_ERROR",
                        message=str(exc_val),
                        context=self.context,
                        cause=exc_val,
                    )
                else:
                    structured_exc = system_error(
                        code="UNEXPECTED_ERROR",
                        message=str(exc_val),
                        context=self.context,
                        cause=exc_val,
                    )

                # Log the structured exception
                structured_exc.log_structured(self.logger)

                # Don't suppress the original exception
                return False
            else:
                # Already structured, just log it
                exc_val.log_structured(self.logger)
                return False


# Export public API
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
    "ErrorContextManager",
]
