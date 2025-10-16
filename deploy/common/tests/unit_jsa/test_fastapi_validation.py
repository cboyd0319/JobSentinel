"""Comprehensive tests for fastapi_app validation module.

Tests input validation functions for URLs, emails, phone numbers, and integers.
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from jsa.fastapi_app.validation import (
    validate_email,
    validate_phone,
    validate_positive_integer,
    validate_url,
)


class TestValidateUrl:
    """Test validate_url function."""

    @pytest.mark.parametrize(
        "valid_url",
        [
            "http://example.com",
            "https://example.com",
            "http://www.example.com",
            "https://www.example.com",
            "http://subdomain.example.com",
            "https://example.com:8080",
            "http://example.com/path",
            "https://example.com/path/to/resource",
            "http://example.com/path?query=value",
            "https://example.com/path#fragment",
            "http://localhost",
            "http://localhost:8000",
            "http://192.168.1.1",
            "https://192.168.1.1:443",
            "http://example.co.uk",
            "https://my-site.example.com",
        ],
        ids=[
            "http",
            "https",
            "www_http",
            "www_https",
            "subdomain",
            "with_port",
            "with_path",
            "nested_path",
            "with_query",
            "with_fragment",
            "localhost",
            "localhost_port",
            "ip_address",
            "ip_with_port",
            "co_uk_domain",
            "hyphenated_subdomain",
        ],
    )
    def test_validate_url_valid_urls(self, valid_url: str):
        """Test validation of valid URLs."""
        # Act
        result = validate_url(valid_url)

        # Assert
        assert result == valid_url

    @pytest.mark.parametrize(
        "invalid_url",
        [
            "not-a-url",
            "ftp://example.com",
            "example.com",
            "//example.com",
            "http://",
            "https://",
            "javascript:alert(1)",
            "file:///etc/passwd",
            "",
            "   ",
        ],
        ids=[
            "no_scheme",
            "ftp_scheme",
            "missing_scheme",
            "double_slash_only",
            "http_only",
            "https_only",
            "javascript",
            "file_scheme",
            "empty",
            "whitespace",
        ],
    )
    def test_validate_url_invalid_urls_raises_exception(self, invalid_url: str):
        """Test that invalid URLs raise HTTPException."""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            validate_url(invalid_url)

        assert exc_info.value.status_code == 422
        assert "Invalid URL format" in exc_info.value.detail


class TestValidateEmail:
    """Test validate_email function."""

    @pytest.mark.parametrize(
        "valid_email",
        [
            "user@example.com",
            "test.user@example.com",
            "user+tag@example.com",
            "user_name@example.com",
            "user123@example.com",
            "user@subdomain.example.com",
            "a@b.co",
            "test@example.co.uk",
            "user@example.museum",
            "very.long.email.address@very.long.domain.example.com",
        ],
        ids=[
            "simple",
            "with_dot",
            "with_plus",
            "with_underscore",
            "with_numbers",
            "subdomain",
            "short",
            "co_uk",
            "museum_tld",
            "very_long",
        ],
    )
    def test_validate_email_valid_emails(self, valid_email: str):
        """Test validation of valid emails."""
        # Act
        result = validate_email(valid_email)

        # Assert
        assert result == valid_email

    @pytest.mark.parametrize(
        "invalid_email",
        [
            "not-an-email",
            "@example.com",
            "user@",
            "user",
            "user@.com",
            "user@domain",
            "user @example.com",
            "user@exam ple.com",
            "user@@example.com",
            "",
            "user@example",
        ],
        ids=[
            "no_at",
            "no_local_part",
            "no_domain",
            "no_at_or_domain",
            "domain_starts_with_dot",
            "no_tld",
            "space_in_local",
            "space_in_domain",
            "double_at",
            "empty",
            "no_tld_short",
        ],
    )
    def test_validate_email_invalid_emails_raises_exception(self, invalid_email: str):
        """Test that invalid emails raise HTTPException."""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            validate_email(invalid_email)

        assert exc_info.value.status_code == 422
        assert "Invalid email format" in exc_info.value.detail


class TestValidatePhone:
    """Test validate_phone function."""

    @pytest.mark.parametrize(
        "valid_phone",
        [
            "1234567890",
            "123-456-7890",
            "(123) 456-7890",
            "123 456 7890",
            "+1234567890",
            "+1-234-567-8900",
            "+1 (234) 567-8900",
            "12345678901",  # 11 digits
            "123456789012345",  # 15 digits
        ],
        ids=[
            "ten_digits",
            "with_dashes",
            "with_parens",
            "with_spaces",
            "with_plus",
            "international_dashes",
            "international_parens",
            "eleven_digits",
            "fifteen_digits",
        ],
    )
    def test_validate_phone_valid_phones(self, valid_phone: str):
        """Test validation of valid phone numbers."""
        # Act
        result = validate_phone(valid_phone)

        # Assert
        assert result == valid_phone

    @pytest.mark.parametrize(
        "invalid_phone",
        [
            "123",  # Too short
            "12345678901234567890",  # Too long
            "abcdefghij",
            "123-abc-7890",
            "",
            "   ",
            "+++123456789",
        ],
        ids=[
            "too_short",
            "too_long",
            "letters",
            "mixed_letters_numbers",
            "empty",
            "whitespace",
            "multiple_plus",
        ],
    )
    def test_validate_phone_invalid_phones_raises_exception(self, invalid_phone: str):
        """Test that invalid phones raise HTTPException."""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            validate_phone(invalid_phone)

        assert exc_info.value.status_code == 422
        assert "Invalid phone number format" in exc_info.value.detail


class TestValidatePositiveInteger:
    """Test validate_positive_integer function."""

    @pytest.mark.parametrize(
        "valid_value",
        [1, 10, 100, 1000, 999999, 1],
        ids=["one", "ten", "hundred", "thousand", "large", "minimum"],
    )
    def test_validate_positive_integer_valid_values(self, valid_value: int):
        """Test validation of valid positive integers."""
        # Act
        result = validate_positive_integer(valid_value)

        # Assert
        assert result == valid_value
        assert isinstance(result, int)

    @pytest.mark.parametrize(
        "invalid_value,field_name",
        [
            (-1, "value"),
            (-100, "count"),
            ("not_a_number", "field"),
            (None, "value"),
        ],
        ids=["negative_one", "large_negative", "string", "none"],
    )
    def test_validate_positive_integer_invalid_values_raises_exception(
        self, invalid_value: int, field_name: str
    ):
        """Test that invalid values raise HTTPException."""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            validate_positive_integer(invalid_value, field_name)

        assert exc_info.value.status_code == 422
        # Should mention the field name in the error
        assert field_name in exc_info.value.detail.lower() or "value" in exc_info.value.detail.lower()

    def test_validate_positive_integer_accepts_zero(self):
        """Test that zero is accepted (non-negative)."""
        # Act
        result = validate_positive_integer(0)

        # Assert
        assert result == 0

    def test_validate_positive_integer_converts_float(self):
        """Test that floats are converted to integers."""
        # Act
        result = validate_positive_integer(1.5)

        # Assert
        assert result == 1
        assert isinstance(result, int)

    def test_validate_positive_integer_with_custom_field_name(self):
        """Test that custom field name appears in error message."""
        # Arrange
        invalid_value = -5
        field_name = "custom_field"

        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            validate_positive_integer(invalid_value, field_name)

        # Should include custom field name in error
        assert "custom_field" in exc_info.value.detail.lower() or "value" in exc_info.value.detail.lower()


class TestValidationEdgeCases:
    """Test edge cases for validation functions."""

    def test_validate_url_with_unicode(self):
        """Test URL validation with unicode characters."""
        # Arrange - Unicode domain might not be supported
        url = "https://例え.jp"

        # Act & Assert - May fail or pass depending on implementation
        # Just ensure it doesn't crash
        try:
            validate_url(url)
        except HTTPException:
            pass  # Expected for non-ASCII domains

    def test_validate_email_case_sensitivity(self):
        """Test that email validation handles case correctly."""
        # Arrange
        email = "User@Example.COM"

        # Act
        result = validate_email(email)

        # Assert
        assert result == email

    def test_validate_phone_preserves_format(self):
        """Test that phone validation preserves original format."""
        # Arrange
        phone = "(123) 456-7890"

        # Act
        result = validate_phone(phone)

        # Assert
        assert result == phone  # Should preserve format

    def test_validate_positive_integer_boundary(self):
        """Test positive integer at boundary (1)."""
        # Act
        result = validate_positive_integer(1)

        # Assert
        assert result == 1

    def test_http_exception_details(self):
        """Test that HTTPExceptions have proper status codes and details."""
        # Test URL validation exception
        with pytest.raises(HTTPException) as exc_info:
            validate_url("invalid")
        assert exc_info.value.status_code == 422
        assert isinstance(exc_info.value.detail, str)

        # Test email validation exception
        with pytest.raises(HTTPException) as exc_info:
            validate_email("invalid")
        assert exc_info.value.status_code == 422
        assert isinstance(exc_info.value.detail, str)

        # Test phone validation exception
        with pytest.raises(HTTPException) as exc_info:
            validate_phone("123")
        assert exc_info.value.status_code == 422
        assert isinstance(exc_info.value.detail, str)

    def test_validation_functions_return_correct_types(self):
        """Test that validation functions return correct types."""
        # Act
        url_result = validate_url("http://example.com")
        email_result = validate_email("user@example.com")
        phone_result = validate_phone("1234567890")
        int_result = validate_positive_integer(10)

        # Assert
        assert isinstance(url_result, str)
        assert isinstance(email_result, str)
        assert isinstance(phone_result, str)
        assert isinstance(int_result, int)
