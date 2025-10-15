"""
API authentication and authorization.

Provides API key-based authentication for REST endpoints.
"""

from __future__ import annotations

import secrets
from collections.abc import Callable
from datetime import UTC, datetime
from functools import wraps
from typing import Optional

from flask import jsonify, request
from sqlmodel import Field, Session, SQLModel, select


class APIKey(SQLModel, table=True):
    """API key for authentication."""

    __tablename__ = "api_keys"

    id: int | None = Field(default=None, primary_key=True)
    key: str = Field(unique=True, index=True)
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    last_used_at: datetime | None = None
    is_active: bool = True


def generate_api_key() -> str:
    """
    Generate a secure API key.

    Returns:
        New API key in format: jsa_<random_string>
    """
    return f"jsa_{secrets.token_urlsafe(32)}"


def create_api_key(session: Session, name: str) -> APIKey:
    """
    Create a new API key.

    Args:
        session: Database session
        name: Descriptive name for the key

    Returns:
        Created APIKey instance
    """
    key = APIKey(
        key=generate_api_key(),
        name=name,
    )
    session.add(key)
    session.commit()
    session.refresh(key)
    return key


def verify_api_key(session: Session, key_str: str) -> APIKey | None:
    """
    Verify an API key is valid and active.

    Args:
        session: Database session
        key_str: API key string to verify

    Returns:
        APIKey instance if valid, None otherwise
    """
    statement = select(APIKey).where(
        APIKey.key == key_str,
        APIKey.is_active == True,  # noqa: E712
    )
    key_obj = session.exec(statement).first()

    if key_obj:
        # Update last used timestamp
        key_obj.last_used_at = datetime.now(UTC)
        session.commit()

    return key_obj


def require_api_key(f: Callable) -> Callable:
    """
    Decorator to require valid API key.

    Usage:
        @require_api_key
        def my_endpoint():
            ...
    """

    @wraps(f)
    def decorated(*args, **kwargs):  # type: ignore
        from jsa.db import get_session_context

        api_key = request.headers.get("X-API-Key")
        if not api_key:
            return jsonify({"error": "API key required"}), 401

        with get_session_context() as session:
            key_obj = verify_api_key(session, api_key)

            if not key_obj:
                return jsonify({"error": "Invalid API key"}), 401

        return f(*args, **kwargs)

    return decorated
