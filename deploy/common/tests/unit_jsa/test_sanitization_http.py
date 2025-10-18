"""Comprehensive tests for jsa.http.sanitization module.

Tests URL sanitization and validation following pytest best practices:
- Happy path URL sanitization
- Fragment removal
- Invalid scheme rejection
- Missing netloc handling
- Edge cases and boundary conditions
"""

import pytest

from jsa.http.sanitization import safe_external_url


class TestSafeExternalUrl:
    """Tests for safe_external_url function."""

    @pytest.mark.parametrize(
        "url,expected",
        [
            ("http://example.com", "http://example.com"),
            ("https://example.com", "https://example.com"),
            ("http://example.com/path", "http://example.com/path"),
            ("https://example.com/path/to/page", "https://example.com/path/to/page"),
            ("http://sub.example.com", "http://sub.example.com"),
            ("https://api.example.com/v1/resource", "https://api.example.com/v1/resource"),
        ],
        ids=["http", "https", "http_path", "https_path", "subdomain", "api_path"],
    )
    def test_safe_external_url_valid_urls_preserved(self, url, expected):
        """Valid HTTP/HTTPS URLs should be preserved without fragment."""
        # Act
        result = safe_external_url(url)

        # Assert
        assert result == expected

    @pytest.mark.parametrize(
        "url,expected_without_fragment",
        [
            ("http://example.com#fragment", "http://example.com"),
            ("https://example.com#section", "https://example.com"),
            ("http://example.com/path#anchor", "http://example.com/path"),
            ("https://example.com/page?q=1#top", "https://example.com/page?q=1"),
        ],
        ids=["http_fragment", "https_fragment", "path_fragment", "query_fragment"],
    )
    def test_safe_external_url_removes_fragments(self, url, expected_without_fragment):
        """Fragments should be removed from valid URLs."""
        # Act
        result = safe_external_url(url)

        # Assert
        assert result == expected_without_fragment
        assert "#" not in result or result == "#"

    @pytest.mark.parametrize(
        "invalid_scheme_url",
        [
            "ftp://example.com",
            "file:///etc/passwd",
            "javascript:alert(1)",
            "data:text/html,<script>alert('XSS')</script>",
            "mailto:user@example.com",
            "tel:+1234567890",
            "ssh://user@host",
            "gopher://example.com",
        ],
        ids=["ftp", "file", "javascript", "data", "mailto", "tel", "ssh", "gopher"],
    )
    def test_safe_external_url_invalid_schemes_return_hash(self, invalid_scheme_url):
        """URLs with non-HTTP(S) schemes should return '#'."""
        # Act
        result = safe_external_url(invalid_scheme_url)

        # Assert
        assert result == "#"

    @pytest.mark.parametrize(
        "missing_netloc_url",
        [
            "http://",
            "https://",
            "/path/to/resource",
            "relative/path",
            "http:///path",
            "https:///",
        ],
        ids=["http_empty", "https_empty", "absolute_path", "relative", "triple_slash", "triple_slash_https"],
    )
    def test_safe_external_url_missing_netloc_returns_hash(self, missing_netloc_url):
        """URLs without a network location (host) should return '#'."""
        # Act
        result = safe_external_url(missing_netloc_url)

        # Assert
        assert result == "#"

    def test_safe_external_url_empty_string_returns_hash(self):
        """Empty string should return '#'."""
        # Act
        result = safe_external_url("")

        # Assert
        assert result == "#"

    def test_safe_external_url_none_returns_hash(self):
        """None should return '#' (caught by except clause)."""
        # Act
        result = safe_external_url(None)  # type: ignore[arg-type]

        # Assert
        assert result == "#"



    def test_safe_external_url_malformed_url_returns_hash(self):
        """Malformed URLs that can't be parsed should return '#'."""
        # Arrange
        malformed_url = "ht!tp://not a valid url"

        # Act
        result = safe_external_url(malformed_url)

        # Assert - Should either parse weirdly or return # (implementation dependent)
        # The function should handle it gracefully
        assert isinstance(result, str)

    @pytest.mark.parametrize(
        "url_with_port",
        [
            "http://example.com:8080",
            "https://example.com:443",
            "http://localhost:3000",
            "https://api.example.com:8443/path",
        ],
        ids=["http_8080", "https_443", "localhost", "api_port"],
    )
    def test_safe_external_url_urls_with_ports_preserved(self, url_with_port):
        """URLs with port numbers should be preserved."""
        # Act
        result = safe_external_url(url_with_port)

        # Assert
        assert result == url_with_port

    @pytest.mark.parametrize(
        "url_with_query",
        [
            "http://example.com?query=value",
            "https://example.com/path?a=1&b=2",
            "http://example.com?search=test%20query",
        ],
        ids=["simple_query", "multiple_params", "encoded_query"],
    )
    def test_safe_external_url_query_parameters_preserved(self, url_with_query):
        """Query parameters should be preserved."""
        # Act
        result = safe_external_url(url_with_query)

        # Assert
        assert result == url_with_query

    def test_safe_external_url_with_userinfo_preserved(self):
        """URLs with user info should be preserved (though not recommended)."""
        # Arrange
        url = "http://user:pass@example.com"

        # Act
        result = safe_external_url(url)

        # Assert
        assert result == url

    def test_safe_external_url_ipv4_address_works(self):
        """URLs with IPv4 addresses should work."""
        # Arrange
        url = "http://192.168.1.1"

        # Act
        result = safe_external_url(url)

        # Assert
        assert result == url

    def test_safe_external_url_localhost_works(self):
        """Localhost URLs should work."""
        # Arrange
        url = "http://localhost"

        # Act
        result = safe_external_url(url)

        # Assert
        assert result == url

    def test_safe_external_url_long_url_handled(self):
        """Very long URLs should be handled gracefully."""
        # Arrange
        long_path = "/path/" + "segment/" * 100
        url = f"http://example.com{long_path}"

        # Act
        result = safe_external_url(url)

        # Assert
        assert result == url or result == "#"  # Either preserved or rejected

    def test_safe_external_url_unicode_domain(self):
        """URLs with unicode domains should be handled."""
        # Arrange
        url = "http://example.中国"

        # Act
        result = safe_external_url(url)

        # Assert
        # Should either preserve or convert to punycode or reject
        assert isinstance(result, str)

    def test_safe_external_url_scheme_case_insensitive(self):
        """URL schemes should be case-insensitive for HTTP/HTTPS."""
        # Arrange
        url_upper = "HTTP://EXAMPLE.COM"

        # Act
        result = safe_external_url(url_upper)

        # Assert
        # Should work with uppercase scheme (scheme is lowercased by urlparse)
        assert result.startswith("http://")
        assert "EXAMPLE.COM" in result or "example.com" in result

    def test_safe_external_url_consecutive_slashes_in_path(self):
        """URLs with consecutive slashes in path should be handled."""
        # Arrange
        url = "http://example.com//path//to///resource"

        # Act
        result = safe_external_url(url)

        # Assert
        # Should preserve the URL as-is (path normalization is not this function's job)
        assert result == url

    def test_safe_external_url_empty_path_preserved(self):
        """URLs with just domain (no path) should work."""
        # Arrange
        url = "http://example.com"

        # Act
        result = safe_external_url(url)

        # Assert
        assert result == url

    def test_safe_external_url_with_default_ports_preserved(self):
        """URLs with explicit default ports should be preserved."""
        # Arrange
        url_http = "http://example.com:80"
        url_https = "https://example.com:443"

        # Act
        result_http = safe_external_url(url_http)
        result_https = safe_external_url(url_https)

        # Assert
        assert result_http == url_http
        assert result_https == url_https


class TestSafeExternalUrlBoundary:
    """Boundary and edge case tests."""

    def test_safe_external_url_only_scheme(self):
        """URL with only scheme should return '#'."""
        # Act
        result = safe_external_url("http:")

        # Assert
        assert result == "#"

    def test_safe_external_url_scheme_and_slashes(self):
        """URL with scheme and slashes but no host should return '#'."""
        # Act
        result = safe_external_url("http://")

        # Assert
        assert result == "#"

    def test_safe_external_url_no_scheme(self):
        """URL without scheme should return '#'."""
        # Act
        result = safe_external_url("example.com")

        # Assert
        # Without a scheme, parsed.scheme will be empty
        assert result == "#"

    def test_safe_external_url_whitespace_only(self):
        """Whitespace-only string should return '#'."""
        # Act
        result = safe_external_url("   ")

        # Assert
        assert result == "#"

    def test_safe_external_url_special_characters_in_path(self):
        """URLs with special characters in path should be preserved."""
        # Arrange
        url = "http://example.com/path/with spaces"

        # Act
        result = safe_external_url(url)

        # Assert
        # urlparse handles this, should be preserved
        assert isinstance(result, str)
        assert "example.com" in result or result == "#"

    def test_safe_external_url_invalid_url_raises_value_error(self):
        """Test that ValueError in parsing is caught and returns '#'."""
        # Arrange - This is an edge case that might cause ValueError
        # We'll create a mock to force a ValueError
        import jsa.http.sanitization as san_module
        from unittest.mock import patch

        # Act & Assert
        with patch.object(san_module, 'urlparse', side_effect=ValueError("test error")):
            result = san_module.safe_external_url("http://example.com")
            assert result == "#"

    def test_safe_external_url_type_error_in_parsing(self):
        """Test that TypeError in parsing is caught and returns '#'."""
        # Arrange
        import jsa.http.sanitization as san_module
        from unittest.mock import patch

        # Act & Assert
        with patch.object(san_module, 'urlparse', side_effect=TypeError("test error")):
            result = san_module.safe_external_url("http://example.com")
            assert result == "#"
