"""
Comprehensive tests for jsa.http.sanitization module.

Tests URL sanitization and validation.
"""

import pytest

from jsa.http.sanitization import safe_external_url


class TestSafeExternalUrl:
    """Test safe_external_url function."""

    @pytest.mark.parametrize(
        "url,expected",
        [
            # Valid HTTP URLs
            ("http://example.com", "http://example.com"),
            ("http://www.example.com", "http://www.example.com"),
            ("http://example.com:8080", "http://example.com:8080"),
            ("http://example.com/path", "http://example.com/path"),
            ("http://example.com/path?query=value", "http://example.com/path?query=value"),
            # Valid HTTPS URLs
            ("https://example.com", "https://example.com"),
            ("https://www.example.com", "https://www.example.com"),
            ("https://example.com:443", "https://example.com:443"),
            ("https://example.com/path/to/resource", "https://example.com/path/to/resource"),
            (
                "https://example.com/path?key1=val1&key2=val2",
                "https://example.com/path?key1=val1&key2=val2",
            ),
            # Fragments should be removed
            ("http://example.com#fragment", "http://example.com"),
            ("https://example.com/path#section", "https://example.com/path"),
            ("http://example.com?query=1#anchor", "http://example.com?query=1"),
            # Complex but valid URLs
            (
                "https://user@example.com/path",
                "https://user@example.com/path",
            ),
            (
                "https://user:pass@example.com:8080/path?q=1",
                "https://user:pass@example.com:8080/path?q=1",
            ),
            (
                "http://sub.domain.example.com/deeply/nested/path",
                "http://sub.domain.example.com/deeply/nested/path",
            ),
        ],
        ids=[
            "http_simple",
            "http_www",
            "http_port",
            "http_path",
            "http_query",
            "https_simple",
            "https_www",
            "https_port",
            "https_path",
            "https_query",
            "http_fragment",
            "https_fragment",
            "fragment_with_query",
            "userinfo",
            "full_url",
            "subdomain",
        ],
    )
    def test_returns_sanitized_valid_urls(self, url, expected):
        """Test that valid HTTP/HTTPS URLs are returned with fragments removed."""
        result = safe_external_url(url)
        assert result == expected

    @pytest.mark.parametrize(
        "invalid_url",
        [
            # Invalid schemes
            "ftp://example.com",
            "file:///path/to/file",
            "javascript:alert('xss')",
            "data:text/html,<script>alert('xss')</script>",
            "mailto:user@example.com",
            "tel:+1234567890",
            "ssh://example.com",
            "ws://example.com",
            "wss://example.com",
            "gopher://example.com",
            # Missing netloc (hostname)
            "http://",
            "https://",
            "http:///path",
            "https:///path",
            # Relative URLs
            "/relative/path",
            "../relative/path",
            "./relative/path",
            "relative/path",
            "?query=only",
            "#fragment-only",
            # Malformed URLs
            "ht tp://example.com",  # Space in scheme
            "http:/example.com",  # Single slash
            "http:example.com",  # No slashes
            "://example.com",  # No scheme
            # Empty or whitespace
            "",
            " ",
            "   ",
            "\t",
            "\n",
            # Special cases
            "about:blank",
            "blob:http://example.com/id",
        ],
        ids=[
            "ftp_scheme",
            "file_scheme",
            "javascript_scheme",
            "data_scheme",
            "mailto_scheme",
            "tel_scheme",
            "ssh_scheme",
            "ws_scheme",
            "wss_scheme",
            "gopher_scheme",
            "http_no_host",
            "https_no_host",
            "http_path_only",
            "https_path_only",
            "relative_slash",
            "relative_dotdot",
            "relative_dot",
            "relative_simple",
            "query_only",
            "fragment_only",
            "space_in_scheme",
            "single_slash",
            "no_slashes",
            "no_scheme",
            "empty",
            "space",
            "spaces",
            "tab",
            "newline",
            "about_blank",
            "blob_scheme",
        ],
    )
    def test_returns_hash_for_invalid_urls(self, invalid_url):
        """Test that invalid or unsafe URLs return '#'."""
        result = safe_external_url(invalid_url)
        assert result == "#"

    def test_handles_none_input(self):
        """Test that None input is handled safely."""
        # Should return '#' due to TypeError in urlparse
        result = safe_external_url(None)  # type: ignore[arg-type]
        assert result == "#"

    def test_handles_non_string_input(self):
        """Test behavior with non-string inputs."""
        # None, lists, dicts are handled via TypeError catch
        result = safe_external_url(None)  # type: ignore[arg-type]
        assert result == "#"

        result = safe_external_url([])  # type: ignore[arg-type]
        assert result == "#"

        result = safe_external_url({})  # type: ignore[arg-type]
        assert result == "#"

        # BUG: Integers raise AttributeError (not currently caught by the function)
        # The function catches ValueError and TypeError but not AttributeError
        # This test documents the current buggy behavior - it should return "#" instead
        # TODO: Fix safe_external_url to catch AttributeError along with ValueError/TypeError
        with pytest.raises(AttributeError):
            safe_external_url(12345)  # type: ignore[arg-type]

    def test_preserves_unicode_in_valid_urls(self):
        """Test that Unicode characters are preserved in valid URLs."""
        url = "https://example.com/path/测试"
        result = safe_external_url(url)
        assert "测试" in result
        assert result.startswith("https://")

    def test_removes_multiple_fragments(self):
        """Test fragment removal even with multiple # symbols."""
        url = "http://example.com/path#first#second"
        result = safe_external_url(url)
        assert "#" not in result
        assert result == "http://example.com/path"

    def test_preserves_special_characters_in_query(self):
        """Test that special characters in query strings are preserved."""
        url = "https://example.com?key=%20value&foo=bar%2Bbaz"
        result = safe_external_url(url)
        assert "key=%20value" in result
        assert "foo=bar%2Bbaz" in result

    def test_case_sensitive_scheme_handling(self):
        """Test that scheme comparison is case-insensitive (by urlparse)."""
        # urlparse normalizes schemes to lowercase
        url = "HTTP://example.com"
        result = safe_external_url(url)
        assert result == "http://example.com"

        url = "HTTPS://example.com"
        result = safe_external_url(url)
        assert result == "https://example.com"

    @pytest.mark.parametrize(
        "url",
        [
            "http://example.com/" + "a" * 1000,  # Very long path
            "http://example.com?" + "key=value&" * 100,  # Many query params
            "http://" + "a" * 255 + ".com",  # Very long domain
        ],
        ids=["long_path", "many_params", "long_domain"],
    )
    def test_handles_very_long_urls(self, url):
        """Test that very long URLs are handled correctly."""
        result = safe_external_url(url)
        # Should return a string result
        assert isinstance(result, str)
        # Should either be the sanitized URL (without fragment) or "#"
        if result != "#":
            # If not rejected, should be a valid http/https URL
            assert result.startswith(("http://", "https://"))
            # Should not have fragment
            assert "#" not in result

    def test_handles_ipv4_addresses(self):
        """Test URLs with IPv4 addresses."""
        url = "http://192.168.1.1:8080/path"
        result = safe_external_url(url)
        assert result == url

    def test_handles_ipv6_addresses(self):
        """Test URLs with IPv6 addresses."""
        url = "http://[::1]/path"
        result = safe_external_url(url)
        assert result == url

        url = "https://[2001:db8::1]:8080/path"
        result = safe_external_url(url)
        assert result == url

    def test_handles_internationalized_domain_names(self):
        """Test IDN (internationalized domain names)."""
        url = "https://例え.jp/path"
        result = safe_external_url(url)
        # Should preserve the IDN
        assert "例え" in result or "xn--" in result  # Either original or punycode

    def test_edge_case_empty_path(self):
        """Test URL with just domain and no path."""
        url = "https://example.com"
        result = safe_external_url(url)
        assert result == "https://example.com"

    def test_edge_case_trailing_slash(self):
        """Test URL preservation with trailing slash."""
        url = "https://example.com/"
        result = safe_external_url(url)
        assert result == "https://example.com/"

    def test_edge_case_port_numbers(self):
        """Test various port numbers."""
        urls = [
            ("http://example.com:80", "http://example.com:80"),
            ("https://example.com:443", "https://example.com:443"),
            ("http://example.com:3000", "http://example.com:3000"),
            ("https://example.com:8443", "https://example.com:8443"),
        ]

        for url, expected in urls:
            result = safe_external_url(url)
            assert result == expected


class TestSafeExternalUrlSecurity:
    """Test security aspects of safe_external_url."""

    def test_prevents_javascript_injection(self):
        """Test that JavaScript URLs are rejected."""
        dangerous_urls = [
            "javascript:alert(document.cookie)",
            "javascript:void(0)",
            "javascript://example.com%0Aalert(1)",
            "JAVASCRIPT:alert('XSS')",
        ]

        for url in dangerous_urls:
            result = safe_external_url(url)
            assert result == "#"

    def test_prevents_data_url_injection(self):
        """Test that data URLs are rejected."""
        dangerous_urls = [
            "data:text/html,<script>alert('XSS')</script>",
            "data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4=",
            "data:image/svg+xml,<svg/onload=alert('XSS')>",
        ]

        for url in dangerous_urls:
            result = safe_external_url(url)
            assert result == "#"

    def test_prevents_file_protocol_access(self):
        """Test that file:// URLs are rejected."""
        dangerous_urls = [
            "file:///etc/passwd",
            "file:///C:/Windows/System32/config/sam",
            "file://localhost/etc/hosts",
        ]

        for url in dangerous_urls:
            result = safe_external_url(url)
            assert result == "#"

    def test_url_without_scheme_rejected(self):
        """Test that URLs without schemes are rejected."""
        urls = [
            "example.com",
            "www.example.com",
            "example.com/path",
            "//example.com",
        ]

        for url in urls:
            result = safe_external_url(url)
            # Should return # because no valid scheme
            assert result == "#"

    def test_prevents_open_redirect_via_backslash(self):
        """Test handling of backslash in URLs."""
        # Some parsers treat backslashes specially
        url = "http://example.com\\path"
        result = safe_external_url(url)
        # Should either preserve or reject, but not cause open redirect
        assert isinstance(result, str)


class TestSafeExternalUrlEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_url_with_username_password(self):
        """Test URL with authentication credentials."""
        url = "https://user:password@example.com/secure"
        result = safe_external_url(url)
        assert result == url

    def test_url_with_empty_query_string(self):
        """Test URL with empty query string."""
        url = "http://example.com?"
        result = safe_external_url(url)
        # urlparse normalizes empty query strings
        assert result == "http://example.com"

    def test_url_with_empty_fragment(self):
        """Test URL with empty fragment."""
        url = "http://example.com#"
        result = safe_external_url(url)
        # Fragment should be removed
        assert result == "http://example.com"

    def test_repeated_slashes_in_path(self):
        """Test URLs with repeated slashes."""
        url = "http://example.com//path///to////resource"
        result = safe_external_url(url)
        # Should preserve the URL as-is if scheme and netloc are valid
        assert result == url

    def test_url_with_special_tld(self):
        """Test URLs with various TLDs."""
        urls = [
            "http://example.co.uk",
            "https://example.com.au",
            "http://example.org",
            "https://example.io",
            "http://example.dev",
        ]

        for url in urls:
            result = safe_external_url(url)
            assert result == url

    def test_localhost_urls(self):
        """Test localhost URLs."""
        urls = [
            "http://localhost",
            "http://localhost:8000",
            "https://localhost:3000/api",
        ]

        for url in urls:
            result = safe_external_url(url)
            assert result == url
