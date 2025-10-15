from __future__ import annotations

import pytest

pytest.importorskip("hypothesis")
from hypothesis import given, strategies as st  # noqa: E402

from jsa.http.sanitization import safe_external_url


def test_happy_http():
    assert safe_external_url("http://example.com/path#frag") == "http://example.com/path"


def test_happy_https():
    assert safe_external_url("https://example.com") == "https://example.com"


@pytest.mark.parametrize(
    "bad",
    [
        "javascript:alert(1)",
        "ftp://example.com",
        "mailto:user@example.com",
        "noscheme.com",
        "",
    ],
)
def test_bad_schemes(bad: str):
    assert safe_external_url(bad) == "#"


@given(st.text(min_size=1, max_size=50))
def test_property_non_http_becomes_hash(s: str):
    if not s.startswith("http://") and not s.startswith("https://"):
        assert safe_external_url(s) == "#"
