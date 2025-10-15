"""
Input validation utilities for API endpoints.

Provides reusable validation functions for common input types.
"""

from __future__ import annotations

import re
from typing import Any

from fastapi import HTTPException, status


def validate_url(url: str) -> str:
    """
    Validate URL format.

    Args:
        url: URL to validate

    Returns:
        Validated URL

    Raises:
        HTTPException: If URL is invalid
    """
    url_pattern = re.compile(
        r"^https?://"  # http:// or https://
        r"(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|"  # domain...
        r"localhost|"  # localhost...
        r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})"  # ...or ip
        r"(?::\d+)?"  # optional port
        r"(?:/?|[/?]\S+)$",
        re.IGNORECASE,
    )

    if not url_pattern.match(url):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid URL format: {url}",
        )

    return url


def validate_email(email: str) -> str:
    """
    Validate email format.

    Args:
        email: Email to validate

    Returns:
        Validated email

    Raises:
        HTTPException: If email is invalid
    """
    email_pattern = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

    if not email_pattern.match(email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid email format: {email}",
        )

    return email


def validate_phone(phone: str) -> str:
    """
    Validate phone number format.

    Args:
        phone: Phone number to validate

    Returns:
        Validated phone number

    Raises:
        HTTPException: If phone is invalid
    """
    # Remove common separators
    cleaned = re.sub(r"[\s\-\(\)]", "", phone)

    # Check if it's a valid phone number (10-15 digits)
    if not re.match(r"^\+?\d{10,15}$", cleaned):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid phone number format: {phone}",
        )

    return phone


def validate_positive_integer(value: Any, field_name: str = "value") -> int:
    """
    Validate positive integer.

    Args:
        value: Value to validate
        field_name: Name of field for error message

    Returns:
        Validated integer

    Raises:
        HTTPException: If value is not a positive integer
    """
    try:
        int_value = int(value)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be an integer",
        ) from e

    if int_value < 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be positive",
        )

    return int_value


def validate_string_length(
    value: str, min_length: int = 0, max_length: int = 10000, field_name: str = "value"
) -> str:
    """
    Validate string length.

    Args:
        value: String to validate
        min_length: Minimum allowed length
        max_length: Maximum allowed length
        field_name: Name of field for error message

    Returns:
        Validated string

    Raises:
        HTTPException: If length is invalid
    """
    if len(value) < min_length:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be at least {min_length} characters",
        )

    if len(value) > max_length:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be at most {max_length} characters",
        )

    return value


def validate_score(score: float | int) -> float:
    """
    Validate score is between 0 and 100.

    Args:
        score: Score to validate

    Returns:
        Validated score

    Raises:
        HTTPException: If score is out of range
    """
    try:
        float_score = float(score)
    except (ValueError, TypeError) as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Score must be a number",
        ) from e

    if not 0 <= float_score <= 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Score must be between 0 and 100",
        )

    return float_score


def sanitize_string(value: str, allow_multiline: bool = False) -> str:
    """
    Sanitize string by removing potentially dangerous characters.

    Args:
        value: String to sanitize
        allow_multiline: Whether to allow newlines

    Returns:
        Sanitized string
    """
    # Remove null bytes
    value = value.replace("\x00", "")

    # Remove control characters (except newline if allowed)
    if not allow_multiline:
        value = "".join(char for char in value if char >= " " or char in "\t\n\r")
    else:
        value = "".join(char for char in value if char >= " " or char in "\t\n\r")

    # Strip leading/trailing whitespace
    value = value.strip()

    return value


def validate_enum_value(value: str, allowed_values: list[str], field_name: str = "value") -> str:
    """
    Validate value is in allowed enum values.

    Args:
        value: Value to validate
        allowed_values: List of allowed values
        field_name: Name of field for error message

    Returns:
        Validated value

    Raises:
        HTTPException: If value not in allowed values
    """
    if value not in allowed_values:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must be one of: {', '.join(allowed_values)}",
        )

    return value
