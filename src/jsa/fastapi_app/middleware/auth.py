"""
API key authentication for FastAPI.

Provides dependency injection for API key verification.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from sqlmodel import Session, select

from jsa.db import get_session_context
from jsa.logging import get_logger
from jsa.web.blueprints.api.auth import APIKey

logger = get_logger("auth", component="fastapi_auth")

# API key header scheme
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(
    api_key: str | None = Security(api_key_header),
) -> APIKey:
    """
    Verify API key from request header.

    Args:
        api_key: API key from X-API-Key header

    Returns:
        Verified APIKey object

    Raises:
        HTTPException: If API key is missing or invalid
    """
    if not api_key:
        logger.warning("API request without key", component="fastapi_auth")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required. Include X-API-Key header.",
            headers={"WWW-Authenticate": "ApiKey"},
        )

    with get_session_context() as session:
        # Query for active API key
        statement = select(APIKey).where(
            APIKey.key == api_key,
            APIKey.is_active == True,  # noqa: E712
        )
        key_obj = session.exec(statement).first()

        if not key_obj:
            logger.warning("Invalid API key attempted", component="fastapi_auth")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or inactive API key",
                headers={"WWW-Authenticate": "ApiKey"},
            )

        # Update last used timestamp
        key_obj.last_used_at = datetime.now(UTC)
        session.add(key_obj)
        session.commit()

        logger.info(
            "API key verified",
            key_name=key_obj.name,
            component="fastapi_auth",
        )

        return key_obj


# Type annotation for authenticated endpoints
APIKeyAuth = Annotated[APIKey, Depends(verify_api_key)]
