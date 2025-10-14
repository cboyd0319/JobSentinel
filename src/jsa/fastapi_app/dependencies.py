"""
FastAPI dependency injection for database sessions and common dependencies.

Provides:
  - Database session management
  - Dependency overrides for testing
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Annotated

from fastapi import Depends
from sqlmodel import Session

from jsa.db import open_session


def get_session_context() -> Iterator[Session]:
    """
    Provide database session as FastAPI dependency.
    
    Yields:
        Database session for the request lifecycle
        
    Usage:
        @router.get("/endpoint")
        def my_endpoint(session: Session = Depends(get_session_context)):
            # use session
    """
    with open_session() as session:
        yield session


# Type alias for session dependency
SessionDep = Annotated[Session, Depends(get_session_context)]


__all__ = ["get_session_context", "SessionDep"]
