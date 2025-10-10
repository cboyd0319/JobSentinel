from __future__ import annotations

"""
HTTP-related utilities: URL sanitization and validation.
"""

from typing import Final
from urllib.parse import urlparse, urlunparse

_ALLOWED_SCHEMES: Final = {"http", "https"}


def safe_external_url(value: str) -> str:
    """Return sanitized http(s) URL or '#'.

    Contract:
      pre: value is a string URL candidate
      post: returns original URL without fragment if safe, otherwise '#'
    """
    try:
        parsed = urlparse(value)
    except (ValueError, TypeError):
        return "#"

    if parsed.scheme not in _ALLOWED_SCHEMES:
        return "#"
    if not parsed.netloc:
        return "#"
    sanitized = parsed._replace(fragment="")
    return urlunparse(sanitized)

