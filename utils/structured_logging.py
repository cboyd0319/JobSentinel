#!/usr/bin/env python3
"""
Structured logging utilities with trace_id support for job search automation.

Implements The Picky Programmer's observability standards:
- Structured JSON logging with consistent field names
- Automatic trace_id propagation and correlation
- Context-aware log formatting
- Performance metrics integration
- PII redaction for security compliance
"""

from __future__ import annotations

import json
import logging
import logging.config
import time
import uuid
from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, Optional

# Thread-safe context variable for trace_id propagation
trace_context: ContextVar[Optional[str]] = ContextVar("trace_context", default=None)


@dataclass
class LogContext:
    """Structured log context with trace_id and component information."""

    trace_id: str
    component: str
    operation: Optional[str] = None
    user_id: Optional[str] = None
    request_id: Optional[str] = None
    session_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {k: v for k, v in asdict(self).items() if v is not None}


class PIIRedactor:
    """Redacts personally identifiable information from log messages."""

    # Patterns that might contain PII
    PII_PATTERNS = {
        "email": r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b",
        "phone": r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b",
        "ssn": r"\b\d{3}-?\d{2}-?\d{4}\b",
        "api_key": r"\b[A-Za-z0-9]{32,}\b",
        "token": r'\btoken["\s:=]+[A-Za-z0-9+/=]{20,}\b',
    }

    @classmethod
    def redact_message(cls, message: str) -> str:
        """Redact PII from log message."""
        import re

        redacted = message
        for pii_type, pattern in cls.PII_PATTERNS.items():
            redacted = re.sub(
                pattern, f"[REDACTED_{pii_type.upper()}]", redacted, flags=re.IGNORECASE
            )

        return redacted

    @classmethod
    def redact_dict(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively redact PII from dictionary values."""
        redacted = {}

        for key, value in data.items():
            if isinstance(value, str):
                redacted[key] = cls.redact_message(value)
            elif isinstance(value, dict):
                redacted[key] = cls.redact_dict(value)
            elif isinstance(value, list):
                redacted[key] = [
                    (
                        cls.redact_message(item)
                        if isinstance(item, str)
                        else cls.redact_dict(item) if isinstance(item, dict) else item
                    )
                    for item in value
                ]
            else:
                redacted[key] = value

        return redacted


class StructuredFormatter(logging.Formatter):
    """JSON formatter with structured fields and automatic PII redaction."""

    def __init__(self, include_pii_redaction: bool = True):
        super().__init__()
        self.include_pii_redaction = include_pii_redaction

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as structured JSON."""
        # Get current trace context
        current_trace_id = trace_context.get()

        # Build structured log entry
        log_entry = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "trace_id": current_trace_id,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add exception information if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        # Add custom fields from extra
        if hasattr(record, "error_details"):
            log_entry["error_details"] = record.error_details

        if hasattr(record, "performance_metrics"):
            log_entry["performance_metrics"] = record.performance_metrics

        if hasattr(record, "context"):
            if isinstance(record.context, LogContext):
                log_entry.update(record.context.to_dict())
            elif isinstance(record.context, dict):
                log_entry.update(record.context)

        # Add any other extra fields
        for key, value in record.__dict__.items():
            if key not in [
                "name",
                "msg",
                "args",
                "levelname",
                "levelno",
                "pathname",
                "filename",
                "module",
                "exc_info",
                "exc_text",
                "stack_info",
                "lineno",
                "funcName",
                "created",
                "msecs",
                "relativeCreated",
                "thread",
                "threadName",
                "processName",
                "process",
                "message",
                "error_details",
                "performance_metrics",
                "context",
            ]:
                log_entry[key] = value

        # Apply PII redaction if enabled
        if self.include_pii_redaction:
            log_entry = PIIRedactor.redact_dict(log_entry)

        return json.dumps(log_entry, default=str, ensure_ascii=False)


class StructuredLogger:
    """High-level structured logger with context management."""

    def __init__(self, name: str, component: str):
        self.logger = logging.getLogger(name)
        self.component = component

    def _log_with_context(
        self,
        level: int,
        message: str,
        trace_id: Optional[str] = None,
        operation: Optional[str] = None,
        **kwargs,
    ) -> None:
        """Log with structured context."""
        # Use provided trace_id or get from context
        current_trace_id = trace_id or trace_context.get() or str(uuid.uuid4())[:8]

        # Set trace context if not already set
        if trace_context.get() is None:
            trace_context.set(current_trace_id)

        # Create log context
        context = LogContext(
            trace_id=current_trace_id,
            component=self.component,
            operation=operation,
            **{k: v for k, v in kwargs.items() if k in ["user_id", "request_id", "session_id"]},
        )

        # Extract non-context kwargs
        extra_fields = {
            k: v for k, v in kwargs.items() if k not in ["user_id", "request_id", "session_id"]
        }

        self.logger.log(level, message, extra={"context": context, **extra_fields})

    def debug(self, message: str, **kwargs) -> None:
        """Log debug message with context."""
        self._log_with_context(logging.DEBUG, message, **kwargs)

    def info(self, message: str, **kwargs) -> None:
        """Log info message with context."""
        self._log_with_context(logging.INFO, message, **kwargs)

    def warning(self, message: str, **kwargs) -> None:
        """Log warning message with context."""
        self._log_with_context(logging.WARNING, message, **kwargs)

    def error(self, message: str, **kwargs) -> None:
        """Log error message with context."""
        self._log_with_context(logging.ERROR, message, **kwargs)

    def critical(self, message: str, **kwargs) -> None:
        """Log critical message with context."""
        self._log_with_context(logging.CRITICAL, message, **kwargs)

    def log_performance(
        self, operation: str, duration_ms: float, status: str = "success", **kwargs
    ) -> None:
        """Log performance metrics."""
        performance_metrics = {
            "operation": operation,
            "duration_ms": duration_ms,
            "status": status,
            **kwargs,
        }

        self.info(
            f"Performance: {operation} completed in {duration_ms:.2f}ms",
            operation=operation,
            performance_metrics=performance_metrics,
        )


@contextmanager
def trace_context_manager(trace_id: Optional[str] = None, operation: Optional[str] = None):
    """Context manager for trace_id propagation."""
    # Generate trace_id if not provided
    if trace_id is None:
        trace_id = str(uuid.uuid4())[:8]

    # Set the trace context
    token = trace_context.set(trace_id)

    try:
        yield trace_id
    finally:
        # Reset the context
        trace_context.reset(token)


@contextmanager
def performance_logger(
    logger: StructuredLogger,
    operation: str,
    trace_id: Optional[str] = None,
    log_start: bool = True,
    **context_kwargs,
):
    """Context manager for automatic performance logging."""
    # Set up trace context
    current_trace_id = trace_id or trace_context.get() or str(uuid.uuid4())[:8]
    token = trace_context.set(current_trace_id)

    start_time = time.time()

    if log_start:
        logger.info(f"Starting operation: {operation}", operation=operation, **context_kwargs)

    try:
        yield current_trace_id
        status = "success"
    except Exception as e:
        status = "error"
        logger.error(
            f"Operation failed: {operation}", operation=operation, error=str(e), **context_kwargs
        )
        raise
    finally:
        duration_ms = (time.time() - start_time) * 1000
        logger.log_performance(
            operation=operation, duration_ms=duration_ms, status=status, **context_kwargs
        )

        # Reset trace context
        trace_context.reset(token)


def setup_structured_logging(
    log_level: str = "INFO",
    log_file: Optional[Path] = None,
    include_console: bool = True,
    include_pii_redaction: bool = True,
) -> None:
    """Set up structured logging configuration."""

    handlers = {}

    # Console handler
    if include_console:
        handlers["console"] = {
            "class": "logging.StreamHandler",
            "formatter": "structured",
            "stream": "ext://sys.stdout",
        }

    # File handler
    if log_file:
        log_file.parent.mkdir(parents=True, exist_ok=True)
        handlers["file"] = {
            "class": "logging.FileHandler",
            "formatter": "structured",
            "filename": str(log_file),
            "mode": "a",
            "encoding": "utf-8",
        }

    # Logging configuration
    config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "structured": {
                "()": StructuredFormatter,
                "include_pii_redaction": include_pii_redaction,
            }
        },
        "handlers": handlers,
        "root": {"level": log_level, "handlers": list(handlers.keys())},
    }

    logging.config.dictConfig(config)


def get_structured_logger(name: str, component: str) -> StructuredLogger:
    """Get a structured logger instance."""
    return StructuredLogger(name, component)


# Export public API
__all__ = [
    "LogContext",
    "StructuredLogger",
    "StructuredFormatter",
    "PIIRedactor",
    "trace_context_manager",
    "performance_logger",
    "setup_structured_logging",
    "get_structured_logger",
]
