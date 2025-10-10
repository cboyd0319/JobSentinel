from __future__ import annotations

"""
Typed wrappers for structured logging used across the application.

Contracts:
  - get_logger: returns a configured logger for a given component name
  - trace/performance helpers follow ERROR & LOGGING POLICY
"""

import os
from pathlib import Path

from utils.structured_logging import (
    StructuredLogger,
    get_structured_logger,
    performance_logger,
    setup_structured_logging,
    trace_context_manager,
)

__all__ = [
    "StructuredLogger",
    "get_logger",
    "trace_context_manager",
    "performance_logger",
    "setup_logging",
]


def get_logger(name: str, component: str) -> StructuredLogger:
    """Return a structured logger bound to a component name.

    Contract:
      pre: name and component are non-empty strings
      post: returns a StructuredLogger that emits structured JSON logs
    """
    return get_structured_logger(name=name, component=component)


def setup_logging(level: str = "INFO", file: Path | None = None, include_console: bool = True) -> None:
    """Configure structured logging once at application start.

    Contract:
      pre: level is a valid logging level name
      post: root logger emits structured JSON with trace_id propagation
    """
    # Allow env control for file logging
    env_file = os.getenv("JSA_LOG_FILE")
    chosen_file = file
    if env_file:
        chosen = Path(env_file)
        chosen.parent.mkdir(parents=True, exist_ok=True)
        chosen_file = chosen
    setup_structured_logging(log_level=level, log_file=chosen_file, include_console=include_console)
