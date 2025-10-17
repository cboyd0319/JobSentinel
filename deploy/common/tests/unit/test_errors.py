"""
Comprehensive tests for utils/errors.py module.

Tests cover:
- Exception hierarchy
- Exception initialization
- Message formatting
- Attribute storage
- Original error chaining
- Edge cases
"""

import pytest

from utils.errors import (
    ConfigurationException,
    DatabaseException,
    JobScraperException,
    NotificationException,
    RateLimitException,
    ScrapingException,
)


class TestJobScraperException:
    """Tests for JobScraperException base class."""

    def test_is_exception(self):
        """JobScraperException is an Exception."""
        exc = JobScraperException("test error")
        assert isinstance(exc, Exception)

    def test_create_with_message(self):
        """JobScraperException creates with message."""
        exc = JobScraperException("test error")
        assert str(exc) == "test error"

    def test_can_be_raised(self):
        """JobScraperException can be raised."""
        with pytest.raises(JobScraperException, match="test error"):
            raise JobScraperException("test error")

    def test_can_be_caught_as_exception(self):
        """JobScraperException can be caught as generic Exception."""
        try:
            raise JobScraperException("test")
        except Exception as e:
            assert isinstance(e, JobScraperException)


class TestScrapingException:
    """Tests for ScrapingException class."""

    def test_inherits_from_base(self):
        """ScrapingException inherits from JobScraperException."""
        exc = ScrapingException("ACME", "https://example.com", "connection timeout")
        assert isinstance(exc, JobScraperException)
        assert isinstance(exc, Exception)

    def test_create_with_required_params(self):
        """ScrapingException creates with company, url, and message."""
        exc = ScrapingException("ACME Corp", "https://jobs.example.com", "404 not found")
        assert exc.company == "ACME Corp"
        assert exc.url == "https://jobs.example.com"
        assert "404 not found" in str(exc)

    def test_message_format(self):
        """ScrapingException formats message correctly."""
        exc = ScrapingException("GitHub", "https://github.com/jobs", "Rate limited")
        expected = "Failed to scrape GitHub at https://github.com/jobs: Rate limited"
        assert str(exc) == expected

    def test_stores_original_error(self):
        """ScrapingException stores original error."""
        original = ValueError("connection reset")
        exc = ScrapingException("Corp", "https://test.com", "failed", original_error=original)
        assert exc.original_error is original

    def test_original_error_defaults_to_none(self):
        """ScrapingException original_error defaults to None."""
        exc = ScrapingException("Corp", "https://test.com", "failed")
        assert exc.original_error is None

    def test_can_be_raised(self):
        """ScrapingException can be raised."""
        with pytest.raises(ScrapingException, match="Failed to scrape"):
            raise ScrapingException("Corp", "https://test.com", "error")

    def test_can_be_caught_as_base(self):
        """ScrapingException can be caught as JobScraperException."""
        try:
            raise ScrapingException("Corp", "https://test.com", "error")
        except JobScraperException as e:
            assert isinstance(e, ScrapingException)

    @pytest.mark.parametrize(
        "company,url,message",
        [
            ("", "", ""),
            ("A", "http://a.co", "msg"),
            ("Unicode Corp 你好", "https://例え.jp", "エラー"),
            ("Long" * 100, "https://example.com/" + "path/" * 50, "message" * 100),
        ],
        ids=["empty", "minimal", "unicode", "long"],
    )
    def test_various_inputs(self, company, url, message):
        """ScrapingException handles various input values."""
        exc = ScrapingException(company, url, message)
        assert exc.company == company
        assert exc.url == url
        assert message in str(exc)


class TestNotificationException:
    """Tests for NotificationException class."""

    def test_inherits_from_base(self):
        """NotificationException inherits from JobScraperException."""
        exc = NotificationException("email", "SMTP error")
        assert isinstance(exc, JobScraperException)

    def test_create_with_required_params(self):
        """NotificationException creates with type and message."""
        exc = NotificationException("slack", "webhook failed")
        assert exc.notification_type == "slack"
        assert "webhook failed" in str(exc)

    def test_message_format(self):
        """NotificationException formats message correctly."""
        exc = NotificationException("email", "Invalid credentials")
        expected = "Failed to send email notification: Invalid credentials"
        assert str(exc) == expected

    def test_stores_original_error(self):
        """NotificationException stores original error."""
        original = ConnectionError("Network unreachable")
        exc = NotificationException("webhook", "failed", original_error=original)
        assert exc.original_error is original

    def test_original_error_defaults_to_none(self):
        """NotificationException original_error defaults to None."""
        exc = NotificationException("email", "failed")
        assert exc.original_error is None

    def test_can_be_raised(self):
        """NotificationException can be raised."""
        with pytest.raises(NotificationException, match="Failed to send"):
            raise NotificationException("sms", "error")

    @pytest.mark.parametrize(
        "notification_type,message",
        [
            ("email", "SMTP timeout"),
            ("slack", "webhook 404"),
            ("discord", "invalid token"),
            ("sms", "quota exceeded"),
            ("webhook", "connection refused"),
        ],
        ids=["email", "slack", "discord", "sms", "webhook"],
    )
    def test_various_notification_types(self, notification_type, message):
        """NotificationException handles various notification types."""
        exc = NotificationException(notification_type, message)
        assert exc.notification_type == notification_type
        assert notification_type in str(exc)
        assert message in str(exc)


class TestConfigurationException:
    """Tests for ConfigurationException class."""

    def test_inherits_from_base(self):
        """ConfigurationException inherits from JobScraperException."""
        exc = ConfigurationException("config error")
        assert isinstance(exc, JobScraperException)

    def test_create_with_message(self):
        """ConfigurationException creates with message."""
        exc = ConfigurationException("Missing API key")
        assert str(exc) == "Missing API key"

    def test_can_be_raised(self):
        """ConfigurationException can be raised."""
        with pytest.raises(ConfigurationException, match="Invalid config"):
            raise ConfigurationException("Invalid config")

    def test_can_be_caught_as_base(self):
        """ConfigurationException can be caught as JobScraperException."""
        try:
            raise ConfigurationException("error")
        except JobScraperException as e:
            assert isinstance(e, ConfigurationException)

    @pytest.mark.parametrize(
        "message",
        [
            "Missing required field: api_key",
            "Invalid value for timeout: -1",
            "Configuration file not found",
            "JSON parse error in config.json",
            "",
            "A" * 1000,
        ],
        ids=["missing_field", "invalid_value", "not_found", "parse_error", "empty", "long"],
    )
    def test_various_messages(self, message):
        """ConfigurationException handles various messages."""
        exc = ConfigurationException(message)
        assert str(exc) == message


class TestDatabaseException:
    """Tests for DatabaseException class."""

    def test_inherits_from_base(self):
        """DatabaseException inherits from JobScraperException."""
        exc = DatabaseException("insert", "constraint violation")
        assert isinstance(exc, JobScraperException)

    def test_create_with_required_params(self):
        """DatabaseException creates with operation and message."""
        exc = DatabaseException("query", "syntax error")
        assert exc.operation == "query"
        assert "syntax error" in str(exc)

    def test_message_format(self):
        """DatabaseException formats message correctly."""
        exc = DatabaseException("update", "row not found")
        expected = "Database update failed: row not found"
        assert str(exc) == expected

    def test_stores_original_error(self):
        """DatabaseException stores original error."""
        original = ValueError("duplicate key")
        exc = DatabaseException("insert", "failed", original_error=original)
        assert exc.original_error is original

    def test_original_error_defaults_to_none(self):
        """DatabaseException original_error defaults to None."""
        exc = DatabaseException("delete", "failed")
        assert exc.original_error is None

    def test_can_be_raised(self):
        """DatabaseException can be raised."""
        with pytest.raises(DatabaseException, match="Database.*failed"):
            raise DatabaseException("connect", "timeout")

    @pytest.mark.parametrize(
        "operation,message",
        [
            ("connect", "connection refused"),
            ("insert", "unique constraint violation"),
            ("update", "row lock timeout"),
            ("delete", "foreign key constraint"),
            ("query", "table does not exist"),
            ("migrate", "schema mismatch"),
        ],
        ids=["connect", "insert", "update", "delete", "query", "migrate"],
    )
    def test_various_operations(self, operation, message):
        """DatabaseException handles various operations."""
        exc = DatabaseException(operation, message)
        assert exc.operation == operation
        assert operation in str(exc)
        assert message in str(exc)


class TestRateLimitException:
    """Tests for RateLimitException class."""

    def test_inherits_from_base(self):
        """RateLimitException inherits from JobScraperException."""
        exc = RateLimitException("api.example.com")
        assert isinstance(exc, JobScraperException)

    def test_create_with_domain_only(self):
        """RateLimitException creates with just domain."""
        exc = RateLimitException("github.com")
        assert exc.domain == "github.com"
        assert exc.retry_after is None
        assert str(exc) == "Rate limited by github.com"

    def test_create_with_retry_after(self):
        """RateLimitException creates with retry_after."""
        exc = RateLimitException("api.example.com", retry_after=60)
        assert exc.domain == "api.example.com"
        assert exc.retry_after == 60

    def test_message_without_retry_after(self):
        """RateLimitException formats message without retry_after."""
        exc = RateLimitException("example.com")
        assert str(exc) == "Rate limited by example.com"

    def test_message_with_retry_after(self):
        """RateLimitException formats message with retry_after."""
        exc = RateLimitException("api.com", retry_after=120)
        expected = "Rate limited by api.com, retry after 120 seconds"
        assert str(exc) == expected

    def test_retry_after_defaults_to_none(self):
        """RateLimitException retry_after defaults to None."""
        exc = RateLimitException("example.com")
        assert exc.retry_after is None

    def test_can_be_raised(self):
        """RateLimitException can be raised."""
        with pytest.raises(RateLimitException, match="Rate limited"):
            raise RateLimitException("api.com", 60)

    @pytest.mark.parametrize(
        "domain,retry_after,expected_message",
        [
            ("api.github.com", None, "Rate limited by api.github.com"),
            ("api.github.com", 30, "Rate limited by api.github.com, retry after 30 seconds"),
            ("linkedin.com", 0, "Rate limited by linkedin.com"),  # 0 is falsy, same as None
            ("example.com", 3600, "Rate limited by example.com, retry after 3600 seconds"),
        ],
        ids=["no_retry", "with_retry", "zero_retry", "large_retry"],
    )
    def test_message_variations(self, domain, retry_after, expected_message):
        """RateLimitException formats various retry_after values correctly."""
        exc = RateLimitException(domain, retry_after)
        assert str(exc) == expected_message

    def test_retry_after_can_be_zero(self):
        """RateLimitException accepts retry_after of 0."""
        exc = RateLimitException("api.com", retry_after=0)
        assert exc.retry_after == 0
        # Note: 0 is falsy, so message doesn't include retry_after
        assert str(exc) == "Rate limited by api.com"


class TestExceptionHierarchy:
    """Tests for exception inheritance and catching."""

    def test_all_inherit_from_base(self):
        """All custom exceptions inherit from JobScraperException."""
        exceptions = [
            ScrapingException("c", "u", "m"),
            NotificationException("t", "m"),
            ConfigurationException("m"),
            DatabaseException("o", "m"),
            RateLimitException("d"),
        ]

        for exc in exceptions:
            assert isinstance(exc, JobScraperException)

    def test_catch_any_as_base(self):
        """Any custom exception can be caught as JobScraperException."""
        exceptions = [
            ScrapingException("c", "u", "m"),
            NotificationException("t", "m"),
            ConfigurationException("m"),
            DatabaseException("o", "m"),
            RateLimitException("d"),
        ]

        for exc in exceptions:
            try:
                raise exc
            except JobScraperException:
                pass  # Successfully caught
            else:
                pytest.fail(f"Failed to catch {type(exc).__name__} as JobScraperException")

    def test_specific_catch_doesnt_catch_others(self):
        """Specific exception type only catches that type."""
        with pytest.raises(ScrapingException):
            try:
                raise ScrapingException("c", "u", "m")
            except NotificationException:
                pytest.fail("Should not catch ScrapingException as NotificationException")

    def test_catch_base_catches_all(self):
        """Catching base exception catches all custom exceptions."""
        exceptions = [
            ScrapingException("c", "u", "m"),
            NotificationException("t", "m"),
            ConfigurationException("m"),
            DatabaseException("o", "m"),
            RateLimitException("d"),
        ]

        caught_count = 0
        for exc in exceptions:
            try:
                raise exc
            except JobScraperException:
                caught_count += 1

        assert caught_count == len(exceptions)


class TestOriginalErrorChaining:
    """Tests for original error storage and chaining."""

    def test_scraping_exception_chains_error(self):
        """ScrapingException preserves original error."""
        original = ConnectionError("timeout")
        exc = ScrapingException("C", "U", "M", original_error=original)
        assert exc.original_error is original
        assert isinstance(exc.original_error, ConnectionError)

    def test_notification_exception_chains_error(self):
        """NotificationException preserves original error."""
        original = ValueError("invalid webhook")
        exc = NotificationException("webhook", "M", original_error=original)
        assert exc.original_error is original

    def test_database_exception_chains_error(self):
        """DatabaseException preserves original error."""
        original = RuntimeError("deadlock detected")
        exc = DatabaseException("update", "M", original_error=original)
        assert exc.original_error is original

    def test_can_chain_multiple_levels(self):
        """Exceptions can be chained multiple levels."""
        level1 = ValueError("original error")
        level2 = DatabaseException("query", "wrapped", original_error=level1)
        level3 = ScrapingException("C", "U", "double wrapped", original_error=level2)

        assert level3.original_error is level2
        assert level2.original_error is level1


class TestEdgeCases:
    """Edge case tests."""

    def test_empty_strings(self):
        """Exceptions handle empty strings."""
        exc1 = ScrapingException("", "", "")
        assert exc1.company == ""
        assert exc1.url == ""

        exc2 = NotificationException("", "")
        assert exc2.notification_type == ""

        exc3 = ConfigurationException("")
        assert str(exc3) == ""

        exc4 = DatabaseException("", "")
        assert exc4.operation == ""

        exc5 = RateLimitException("")
        assert exc5.domain == ""

    def test_unicode_strings(self):
        """Exceptions handle unicode strings."""
        exc1 = ScrapingException("企業", "https://例え.jp", "エラー")
        assert "企業" in str(exc1)
        assert "エラー" in str(exc1)

        exc2 = NotificationException("メール", "失敗しました")
        assert "メール" in str(exc2)

    def test_very_long_strings(self):
        """Exceptions handle very long strings."""
        long_str = "A" * 10000
        exc1 = ScrapingException(long_str, long_str, long_str)
        assert len(exc1.company) == 10000

        exc2 = NotificationException(long_str, long_str)
        assert len(exc2.notification_type) == 10000

    def test_special_characters(self):
        """Exceptions handle special characters."""
        special = "<>&\"'\n\r\t"
        exc1 = ScrapingException(special, special, special)
        assert exc1.company == special

        exc2 = ConfigurationException(special)
        assert str(exc2) == special

    def test_none_handling(self):
        """Exceptions handle None values appropriately."""
        # retry_after can be None
        exc = RateLimitException("domain", retry_after=None)
        assert exc.retry_after is None

        # original_error can be None
        exc2 = ScrapingException("C", "U", "M", original_error=None)
        assert exc2.original_error is None


class TestRepr:
    """Tests for exception representation."""

    def test_exceptions_have_repr(self):
        """All exceptions have string representation."""
        exceptions = [
            ScrapingException("c", "u", "m"),
            NotificationException("t", "m"),
            ConfigurationException("m"),
            DatabaseException("o", "m"),
            RateLimitException("d"),
        ]

        for exc in exceptions:
            assert repr(exc) is not None
            assert str(exc) is not None
