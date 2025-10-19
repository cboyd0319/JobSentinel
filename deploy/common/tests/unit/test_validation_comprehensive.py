"""Comprehensive tests for fastapi_app validation module.

Tests all validation functions with parametrized test matrices covering:
- Happy paths
- Edge cases
- Boundary conditions
- Error handling
- Type safety
"""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from jsa.fastapi_app.validation import (
    sanitize_string,
    validate_email,
    validate_enum_value,
    validate_phone,
    validate_positive_integer,
    validate_score,
    validate_string_length,
    validate_url,
)


class TestValidateUrl:
    """Test validate_url function with comprehensive edge cases."""

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
            "https://EXAMPLE.COM",  # Case insensitive
            "http://example.com:9999",
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
            "ipv4",
            "ipv4_port",
            "uk_domain",
            "hyphenated",
            "uppercase",
            "high_port",
        ],
    )
    def test_validate_url_valid_urls_accepted(self, valid_url):
        """Valid URLs should be accepted and returned unchanged."""
        # Act
        result = validate_url(valid_url)
        # Assert
        assert result == valid_url

    @pytest.mark.parametrize(
        "invalid_url",
        [
            "not_a_url",
            "ftp://example.com",
            "file:///path/to/file",
            "javascript:alert('xss')",
            "data:text/html,<script>alert('xss')</script>",
            "",
            "   ",
            "http://",
            "https://",
            "http://.",
            "http://.com",
            "http:// example.com",  # Space in URL
        ],
        ids=[
            "no_scheme",
            "ftp_scheme",
            "file_scheme",
            "javascript_scheme",
            "data_scheme",
            "empty",
            "whitespace",
            "http_no_domain",
            "https_no_domain",
            "dot_only",
            "dot_com_only",
            "space_in_url",
        ],
    )
    def test_validate_url_invalid_urls_raise_exception(self, invalid_url):
        """Invalid URLs should raise HTTPException with 422 status."""
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
            "a@example.com",
            "user@subdomain.example.com",
            "user@example.co.uk",
            "USER@EXAMPLE.COM",
        ],
        ids=[
            "simple",
            "with_dot",
            "with_plus",
            "with_underscore",
            "with_numbers",
            "single_char",
            "subdomain",
            "uk_domain",
            "uppercase",
        ],
    )
    def test_validate_email_valid_emails_accepted(self, valid_email):
        """Valid emails should be accepted and returned unchanged."""
        # Act
        result = validate_email(valid_email)
        # Assert
        assert result == valid_email

    @pytest.mark.parametrize(
        "invalid_email",
        [
            "not_an_email",
            "@example.com",
            "user@",
            "user",
            "user@.com",
            "user@domain",
            "",
            "   ",
            "user @example.com",  # Space
            "user@example .com",  # Space in domain
            "user@@example.com",  # Double @
        ],
        ids=[
            "no_at",
            "no_user",
            "no_domain",
            "no_at_domain",
            "dot_com_only",
            "no_tld",
            "empty",
            "whitespace",
            "space_before_at",
            "space_in_domain",
            "double_at",
        ],
    )
    def test_validate_email_invalid_emails_raise_exception(self, invalid_email):
        """Invalid emails should raise HTTPException with 422 status."""
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
            "+1234567890",
            "1234567890",
            "+12345678901",
            "123-456-7890",
            "(123) 456-7890",
            "+1 (123) 456-7890",
            "123 456 7890",
            "+123456789012345",  # 15 digits (max)
        ],
        ids=[
            "with_plus",
            "ten_digits",
            "eleven_digits",
            "with_hyphens",
            "with_parens",
            "mixed_format",
            "with_spaces",
            "max_digits",
        ],
    )
    def test_validate_phone_valid_phones_accepted(self, valid_phone):
        """Valid phone numbers should be accepted and returned unchanged."""
        # Act
        result = validate_phone(valid_phone)
        # Assert
        assert result == valid_phone

    @pytest.mark.parametrize(
        "invalid_phone",
        [
            "123456789",  # Too short (9 digits)
            "+1234567890123456",  # Too long (16 digits)
            "abc-def-ghij",
            "",
            "   ",
            "123",
            "+",
        ],
        ids=[
            "too_short",
            "too_long",
            "letters",
            "empty",
            "whitespace",
            "three_digits",
            "plus_only",
        ],
    )
    def test_validate_phone_invalid_phones_raise_exception(self, invalid_phone):
        """Invalid phone numbers should raise HTTPException with 422 status."""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            validate_phone(invalid_phone)
        assert exc_info.value.status_code == 422
        assert "Invalid phone number format" in exc_info.value.detail


class TestValidatePositiveInteger:
    """Test validate_positive_integer function."""

    @pytest.mark.parametrize(
        "valid_value,expected",
        [
            (0, 0),
            (1, 1),
            (100, 100),
            ("0", 0),
            ("42", 42),
            ("999999", 999999),
            (0.0, 0),  # Float that's an integer
            (5.0, 5),
        ],
        ids=["zero", "one", "hundred", "str_zero", "str_42", "large", "float_zero", "float_five"],
    )
    def test_validate_positive_integer_valid_values_accepted(self, valid_value, expected):
        """Valid positive integers should be converted and returned."""
        # Act
        result = validate_positive_integer(valid_value)
        # Assert
        assert result == expected
        assert isinstance(result, int)

    @pytest.mark.parametrize(
        "invalid_value",
        [
            -1,
            -100,
            "-5",
        ],
        ids=["negative_int", "large_negative", "negative_str"],
    )
    def test_validate_positive_integer_negative_raises_exception(self, invalid_value):
        """Negative values should raise HTTPException."""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            validate_positive_integer(invalid_value)
        assert exc_info.value.status_code == 422
        assert "must be positive" in exc_info.value.detail

    @pytest.mark.parametrize(
        "invalid_value",
        [
            "abc",
            "12.5",
            "1.5e10",
            None,
            [],
            {},
            "",
        ],
        ids=["letters", "decimal_str", "scientific", "none", "list", "dict", "empty"],
    )
    def test_validate_positive_integer_non_integers_raise_exception(self, invalid_value):
        """Non-integer values should raise HTTPException."""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            validate_positive_integer(invalid_value)
        assert exc_info.value.status_code == 422
        assert "must be an integer" in exc_info.value.detail

    def test_validate_positive_integer_custom_field_name_in_error(self):
        """Custom field name should appear in error message."""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            validate_positive_integer("invalid", field_name="page_number")
        assert "page_number" in exc_info.value.detail


class TestValidateStringLength:
    """Test validate_string_length function."""

    @pytest.mark.parametrize(
        "value,min_len,max_len",
        [
            ("hello", 0, 10),
            ("test", 4, 4),  # Exact length
            ("a", 1, 100),
            ("x" * 100, 0, 100),  # Max length
            ("", 0, 10),  # Min length (empty)
        ],
        ids=["normal", "exact", "single_char", "max_length", "empty_min"],
    )
    def test_validate_string_length_valid_lengths_accepted(self, value, min_len, max_len):
        """Strings within length bounds should be accepted."""
        # Act
        result = validate_string_length(value, min_len, max_len)
        # Assert
        assert result == value

    def test_validate_string_length_too_short_raises_exception(self):
        """String shorter than min_length should raise HTTPException."""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            validate_string_length("hi", min_length=5)
        assert exc_info.value.status_code == 422
        assert "at least 5 characters" in exc_info.value.detail

    def test_validate_string_length_too_long_raises_exception(self):
        """String longer than max_length should raise HTTPException."""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            validate_string_length("x" * 101, max_length=100)
        assert exc_info.value.status_code == 422
        assert "at most 100 characters" in exc_info.value.detail

    def test_validate_string_length_custom_field_name_in_error(self):
        """Custom field name should appear in error message."""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            validate_string_length("x", min_length=5, field_name="username")
        assert "username" in exc_info.value.detail


class TestValidateScore:
    """Test validate_score function."""

    @pytest.mark.parametrize(
        "valid_score,expected",
        [
            (0, 0.0),
            (50, 50.0),
            (100, 100.0),
            (0.0, 0.0),
            (50.5, 50.5),
            (99.9, 99.9),
            ("0", 0.0),
            ("50.5", 50.5),
            ("100", 100.0),
        ],
        ids=[
            "int_zero",
            "int_fifty",
            "int_hundred",
            "float_zero",
            "float_middle",
            "float_high",
            "str_zero",
            "str_decimal",
            "str_hundred",
        ],
    )
    def test_validate_score_valid_scores_accepted(self, valid_score, expected):
        """Valid scores between 0 and 100 should be accepted."""
        # Act
        result = validate_score(valid_score)
        # Assert
        assert result == expected
        assert isinstance(result, float)

    @pytest.mark.parametrize(
        "invalid_score",
        [
            -1,
            -0.1,
            101,
            100.1,
            "-5",
            "101",
        ],
        ids=["neg_int", "neg_float", "over_hundred_int", "over_hundred_float", "neg_str", "over_str"],
    )
    def test_validate_score_out_of_range_raises_exception(self, invalid_score):
        """Scores outside 0-100 range should raise HTTPException."""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            validate_score(invalid_score)
        assert exc_info.value.status_code == 422
        assert "between 0 and 100" in exc_info.value.detail

    @pytest.mark.parametrize(
        "invalid_value",
        [
            "abc",
            None,
            [],
            {},
            "",
        ],
        ids=["letters", "none", "list", "dict", "empty"],
    )
    def test_validate_score_non_numeric_raises_exception(self, invalid_value):
        """Non-numeric values should raise HTTPException."""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            validate_score(invalid_value)
        assert exc_info.value.status_code == 422
        assert "must be a number" in exc_info.value.detail


class TestSanitizeString:
    """Test sanitize_string function."""

    @pytest.mark.parametrize(
        "input_str,expected",
        [
            ("hello", "hello"),
            ("  hello  ", "hello"),  # Trim whitespace
            ("hello\x00world", "helloworld"),  # Remove null bytes
            ("hello\tworld", "hello\tworld"),  # Keep tabs
            ("hello\nworld", "hello\nworld"),  # Keep newlines in multiline mode
            ("hello\rworld", "hello\rworld"),  # Keep carriage returns
            ("", ""),
            ("   ", ""),
        ],
        ids=[
            "simple",
            "with_whitespace",
            "with_null",
            "with_tab",
            "with_newline",
            "with_cr",
            "empty",
            "whitespace_only",
        ],
    )
    def test_sanitize_string_multiline_allowed(self, input_str, expected):
        """Test string sanitization with multiline allowed."""
        # Act
        result = sanitize_string(input_str, allow_multiline=True)
        # Assert
        assert result == expected

    def test_sanitize_string_removes_control_characters_single_line(self):
        """Control characters should be removed in single-line mode."""
        # Arrange
        input_str = "hello\x01\x02\x03world"
        # Act
        result = sanitize_string(input_str, allow_multiline=False)
        # Assert
        assert result == "helloworld"

    def test_sanitize_string_preserves_printable_chars(self):
        """Printable characters should be preserved."""
        # Arrange
        input_str = "Hello, World! 123 @#$%"
        # Act
        result = sanitize_string(input_str)
        # Assert
        assert result == input_str

    def test_sanitize_string_removes_null_bytes(self):
        """Null bytes should always be removed."""
        # Arrange
        input_str = "test\x00string\x00here"
        # Act
        result = sanitize_string(input_str)
        # Assert
        assert "\x00" not in result
        assert result == "teststringhere"


class TestValidateEnumValue:
    """Test validate_enum_value function."""

    def test_validate_enum_value_valid_value_accepted(self):
        """Valid enum value should be accepted."""
        # Arrange
        allowed = ["red", "green", "blue"]
        # Act
        result = validate_enum_value("red", allowed)
        # Assert
        assert result == "red"

    def test_validate_enum_value_invalid_raises_exception(self):
        """Invalid enum value should raise HTTPException."""
        # Arrange
        allowed = ["red", "green", "blue"]
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            validate_enum_value("yellow", allowed)
        assert exc_info.value.status_code == 422
        assert "must be one of" in exc_info.value.detail
        assert "red, green, blue" in exc_info.value.detail

    def test_validate_enum_value_custom_field_name_in_error(self):
        """Custom field name should appear in error message."""
        # Arrange
        allowed = ["admin", "user"]
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            validate_enum_value("guest", allowed, field_name="role")
        assert "role" in exc_info.value.detail

    def test_validate_enum_value_case_sensitive(self):
        """Enum validation should be case-sensitive."""
        # Arrange
        allowed = ["Red", "Green", "Blue"]
        # Act & Assert
        with pytest.raises(HTTPException):
            validate_enum_value("red", allowed)  # lowercase should fail

    def test_validate_enum_value_empty_list(self):
        """Empty allowed list should always raise exception."""
        # Act & Assert
        with pytest.raises(HTTPException) as exc_info:
            validate_enum_value("anything", [])
        assert exc_info.value.status_code == 422
