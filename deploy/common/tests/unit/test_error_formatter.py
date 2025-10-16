"""
Comprehensive unit tests for jsa/error_formatter.py module.

Tests cover:
- Configuration error formatting with suggestions
- Installation error formatting with fix commands
- Slack error formatting with troubleshooting
- Scraper error formatting with source-specific advice
- Database error formatting with recovery steps
- Edge cases and special characters
"""

from __future__ import annotations

from pathlib import Path

import pytest

from jsa.error_formatter import ErrorFormatter


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture(autouse=True)
def _seed_rng():
    """Seed RNG for deterministic tests."""
    import random

    random.seed(1337)


# ============================================================================
# Configuration Error Tests
# ============================================================================


class TestFormatConfigError:
    """Test format_config_error method."""

    def test_config_error_basic_formatting(self):
        """format_config_error returns formatted error message."""
        error_msg = "Missing required field"
        config_path = "/path/to/config.json"

        result = ErrorFormatter.format_config_error(error_msg, config_path)

        assert "Configuration Error" in result
        assert error_msg in result
        assert "How to fix" in result

    def test_config_error_includes_path(self):
        """format_config_error includes configuration file path."""
        error_msg = "Invalid value"
        config_path = "/test/user_prefs.json"

        result = ErrorFormatter.format_config_error(error_msg, config_path)

        assert "user_prefs.json" in result or "/test/" in result

    def test_config_error_keywords_boost_specific(self):
        """format_config_error provides specific help for keywords_boost."""
        error_msg = "Missing keywords_boost field"
        config_path = "config.json"

        result = ErrorFormatter.format_config_error(error_msg, config_path)

        assert "keywords_boost" in result
        assert "python" in result.lower()  # Example in suggestion

    def test_config_error_missing_field_guidance(self):
        """format_config_error provides guidance for missing fields."""
        error_msg = "Missing required configuration"
        config_path = "config.json"

        result = ErrorFormatter.format_config_error(error_msg, config_path)

        assert "missing" in result.lower()
        assert "example" in result.lower()

    def test_config_error_invalid_json_guidance(self):
        """format_config_error provides JSON syntax help for invalid JSON."""
        error_msg = "Invalid JSON in configuration"
        config_path = "config.json"

        result = ErrorFormatter.format_config_error(error_msg, config_path)

        assert "json" in result.lower()
        assert "comma" in result.lower()
        assert "jsonlint" in result.lower()

    def test_config_error_includes_resources(self):
        """format_config_error includes helpful resources."""
        error_msg = "Configuration error"
        config_path = "config.json"

        result = ErrorFormatter.format_config_error(error_msg, config_path)

        assert "Resources" in result
        assert "setup wizard" in result.lower() or "setup" in result.lower()

    def test_config_error_accepts_pathlib_path(self):
        """format_config_error accepts Path object."""
        error_msg = "Test error"
        config_path = Path("/test/config.json")

        result = ErrorFormatter.format_config_error(error_msg, config_path)

        assert "Configuration Error" in result
        assert error_msg in result

    @pytest.mark.parametrize(
        "error_msg,expected_keyword",
        [
            ("Missing keywords_boost field", "keywords_boost"),
            ("Missing required field 'email'", "missing"),
            ("Invalid JSON syntax", "json"),
            ("Required field not found", "missing"),
        ],
        ids=["keywords_boost", "missing_field", "invalid_json", "required"],
    )
    def test_config_error_patterns(self, error_msg, expected_keyword):
        """format_config_error recognizes common error patterns."""
        result = ErrorFormatter.format_config_error(error_msg, "config.json")
        assert expected_keyword.lower() in result.lower()


# ============================================================================
# Installation Error Tests
# ============================================================================


class TestFormatInstallError:
    """Test format_install_error method."""

    def test_install_error_basic_formatting(self):
        """format_install_error returns formatted error message."""
        error_msg = "Module not found"

        result = ErrorFormatter.format_install_error(error_msg)

        assert "Installation Error" in result
        assert error_msg in result

    def test_install_error_with_missing_package(self):
        """format_install_error includes pip install command."""
        error_msg = "Package missing"
        missing_package = "requests"

        result = ErrorFormatter.format_install_error(error_msg, missing_package)

        assert "pip install requests" in result
        assert "missing package" in result.lower()

    def test_install_error_playwright_specific(self):
        """format_install_error provides Playwright-specific guidance."""
        error_msg = "Playwright not found"

        result = ErrorFormatter.format_install_error(error_msg)

        assert "playwright" in result.lower()
        assert "playwright install chromium" in result

    def test_install_error_no_module_guidance(self):
        """format_install_error provides guidance for 'No module named' errors."""
        error_msg = "No module named 'mypackage'"

        result = ErrorFormatter.format_install_error(error_msg)

        assert "no module" in result.lower()
        assert "venv" in result.lower() or "virtual environment" in result.lower()
        assert "pip install -e" in result

    def test_install_error_without_package_name(self):
        """format_install_error handles case without package name."""
        error_msg = "Generic installation error"

        result = ErrorFormatter.format_install_error(error_msg, missing_package=None)

        assert "Installation Error" in result
        assert error_msg in result

    @pytest.mark.parametrize(
        "error_msg,expected_guidance",
        [
            ("Playwright browser not installed", "playwright install"),
            ("No module named 'flask'", "venv"),
            ("Missing required package", "Installation Error"),
        ],
        ids=["playwright", "no_module", "generic"],
    )
    def test_install_error_guidance_patterns(self, error_msg, expected_guidance):
        """format_install_error provides appropriate guidance."""
        result = ErrorFormatter.format_install_error(error_msg)
        assert expected_guidance.lower() in result.lower()


# ============================================================================
# Slack Error Tests
# ============================================================================


class TestFormatSlackError:
    """Test format_slack_error method."""

    def test_slack_error_basic_formatting(self):
        """format_slack_error returns formatted error message."""
        error_msg = "Webhook failed"

        result = ErrorFormatter.format_slack_error(error_msg)

        assert "Slack Notification Error" in result
        assert error_msg in result
        assert "Troubleshooting" in result

    def test_slack_error_invalid_webhook_guidance(self):
        """format_slack_error provides guidance for invalid webhooks."""
        error_msg = "401 Unauthorized"

        result = ErrorFormatter.format_slack_error(error_msg)

        assert "invalid" in result.lower() or "401" in result
        assert "api.slack.com" in result
        assert "webhook" in result.lower()

    def test_slack_error_403_forbidden_guidance(self):
        """format_slack_error handles 403 Forbidden errors."""
        error_msg = "403 Forbidden"

        result = ErrorFormatter.format_slack_error(error_msg)

        assert "invalid" in result.lower() or "403" in result
        assert "hooks.slack.com" in result

    def test_slack_error_connection_guidance(self):
        """format_slack_error provides connection troubleshooting."""
        error_msg = "Connection timeout"

        result = ErrorFormatter.format_slack_error(error_msg)

        assert "connection" in result.lower()
        assert "internet" in result.lower() or "network" in result.lower()
        assert "firewall" in result.lower()

    def test_slack_error_includes_test_command(self):
        """format_slack_error includes curl test command."""
        error_msg = "Test error"

        result = ErrorFormatter.format_slack_error(error_msg)

        assert "curl" in result
        assert "Test from JobSentinel" in result

    def test_slack_error_with_webhook_url(self):
        """format_slack_error includes partial webhook URL."""
        error_msg = "Error"
        webhook_url = "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX"

        result = ErrorFormatter.format_slack_error(error_msg, webhook_url)

        # Should show truncated URL for security
        assert "hooks.slack.com" in result
        assert "..." in result  # Truncation indicator

    def test_slack_error_without_webhook_url(self):
        """format_slack_error handles missing webhook URL."""
        error_msg = "Error"

        result = ErrorFormatter.format_slack_error(error_msg, webhook_url=None)

        assert "YOUR_WEBHOOK_URL" in result

    @pytest.mark.parametrize(
        "error_msg,expected_keyword",
        [
            ("401 Unauthorized", "invalid"),
            ("403 Forbidden", "invalid"),
            ("Connection refused", "connection"),
            ("Timeout error", "connection"),
        ],
        ids=["401", "403", "connection", "timeout"],
    )
    def test_slack_error_patterns(self, error_msg, expected_keyword):
        """format_slack_error recognizes error patterns."""
        result = ErrorFormatter.format_slack_error(error_msg)
        assert expected_keyword.lower() in result.lower()


# ============================================================================
# Scraper Error Tests
# ============================================================================


class TestFormatScraperError:
    """Test format_scraper_error method."""

    def test_scraper_error_basic_formatting(self):
        """format_scraper_error returns formatted error message."""
        error_msg = "Scraping failed"
        source = "Indeed"

        result = ErrorFormatter.format_scraper_error(error_msg, source)

        assert "Scraper Error" in result
        assert source in result
        assert error_msg in result

    def test_scraper_error_with_url(self):
        """format_scraper_error includes failed URL."""
        error_msg = "Failed to fetch"
        source = "LinkedIn"
        url = "https://www.linkedin.com/jobs/search"

        result = ErrorFormatter.format_scraper_error(error_msg, source, url)

        assert url in result
        assert "URL:" in result

    def test_scraper_error_rate_limit_guidance(self):
        """format_scraper_error provides rate limit guidance."""
        error_msg = "Rate limit exceeded"
        source = "Indeed"

        result = ErrorFormatter.format_scraper_error(error_msg, source)

        assert "rate limit" in result.lower()
        assert "wait" in result.lower() or "retry" in result.lower()
        assert "5-10 minutes" in result or "minutes" in result

    def test_scraper_error_robots_txt_guidance(self):
        """format_scraper_error handles robots.txt restrictions."""
        error_msg = "Blocked by robots.txt"
        source = "GitHub"

        result = ErrorFormatter.format_scraper_error(error_msg, source)

        assert "robots.txt" in result.lower()
        assert "api" in result.lower()  # Suggests API alternative

    def test_scraper_error_403_auth_guidance(self):
        """format_scraper_error handles 403 authentication errors."""
        error_msg = "403 Forbidden"
        source = "RemoteOK"

        result = ErrorFormatter.format_scraper_error(error_msg, source)

        assert "403" in result or "authentication" in result.lower()
        assert "api key" in result.lower() or "api" in result.lower()

    def test_scraper_error_401_auth_guidance(self):
        """format_scraper_error handles 401 authentication errors."""
        error_msg = "401 Unauthorized"
        source = "AngelList"

        result = ErrorFormatter.format_scraper_error(error_msg, source)

        assert "401" in result or "authentication" in result.lower()

    def test_scraper_error_without_url(self):
        """format_scraper_error handles missing URL."""
        error_msg = "Generic error"
        source = "TestSource"

        result = ErrorFormatter.format_scraper_error(error_msg, source, url=None)

        assert "Scraper Error" in result
        assert "TestSource" in result

    @pytest.mark.parametrize(
        "error_msg,source,expected_keyword",
        [
            ("Rate limit hit", "Indeed", "rate limit"),
            ("Blocked by robots.txt", "GitHub", "robots.txt"),
            ("403 Forbidden", "LinkedIn", "authentication"),
            ("401 Unauthorized", "RemoteOK", "authentication"),
        ],
        ids=["rate_limit", "robots", "403", "401"],
    )
    def test_scraper_error_patterns(self, error_msg, source, expected_keyword):
        """format_scraper_error recognizes error patterns."""
        result = ErrorFormatter.format_scraper_error(error_msg, source)
        assert expected_keyword.lower() in result.lower()


# ============================================================================
# Database Error Tests
# ============================================================================


class TestFormatDatabaseError:
    """Test format_database_error method."""

    def test_database_error_basic_formatting(self):
        """format_database_error returns formatted error message."""
        error_msg = "Database connection failed"

        result = ErrorFormatter.format_database_error(error_msg)

        assert "Database Error" in result
        assert error_msg in result
        assert "Recovery steps" in result

    def test_database_error_locked_guidance(self):
        """format_database_error provides locked database guidance."""
        error_msg = "Database is locked"

        result = ErrorFormatter.format_database_error(error_msg)

        assert "locked" in result.lower()
        assert "another process" in result.lower() or "process" in result.lower()
        assert "wait" in result.lower() or "retry" in result.lower()

    def test_database_error_corrupt_guidance(self):
        """format_database_error provides corruption recovery steps."""
        error_msg = "Database file is corrupt"

        result = ErrorFormatter.format_database_error(error_msg)

        assert "corrupt" in result.lower()
        assert "backup" in result.lower()
        assert "integrity_check" in result or "repair" in result.lower()

    def test_database_error_generic_guidance(self):
        """format_database_error provides generic troubleshooting."""
        error_msg = "Generic database error"

        result = ErrorFormatter.format_database_error(error_msg)

        assert "permissions" in result.lower() or "disk space" in result.lower()
        assert "health" in result.lower()  # Suggests health check

    @pytest.mark.parametrize(
        "error_msg,expected_keyword",
        [
            ("Database is locked by another process", "locked"),
            ("File is corrupted", "corrupt"),
            ("Cannot write to database", "permissions"),
            ("Disk full", "disk space"),
        ],
        ids=["locked", "corrupt", "permissions", "disk"],
    )
    def test_database_error_patterns(self, error_msg, expected_keyword):
        """format_database_error recognizes error patterns."""
        result = ErrorFormatter.format_database_error(error_msg)
        assert expected_keyword.lower() in result.lower()


# ============================================================================
# Edge Cases and Integration Tests
# ============================================================================


class TestEdgeCases:
    """Test edge cases and special scenarios."""

    def test_all_formatters_handle_empty_string(self):
        """All formatters handle empty error messages gracefully."""
        formatters = [
            (ErrorFormatter.format_config_error, ("", "config.json")),
            (ErrorFormatter.format_install_error, ("",)),
            (ErrorFormatter.format_slack_error, ("",)),
            (ErrorFormatter.format_scraper_error, ("", "Source")),
            (ErrorFormatter.format_database_error, ("",)),
        ]

        for formatter, args in formatters:
            result = formatter(*args)
            assert isinstance(result, str)
            assert len(result) > 0  # Should still return formatted output

    def test_formatters_handle_unicode(self):
        """Formatters handle unicode characters in error messages."""
        error_msg = "Error: 文字化け • emoji 🚀 • special €£¥"

        result1 = ErrorFormatter.format_config_error(error_msg, "config.json")
        result2 = ErrorFormatter.format_install_error(error_msg)
        result3 = ErrorFormatter.format_database_error(error_msg)

        assert error_msg in result1
        assert error_msg in result2
        assert error_msg in result3

    def test_formatters_handle_very_long_messages(self):
        """Formatters handle very long error messages."""
        error_msg = "Error: " + "A" * 1000

        result = ErrorFormatter.format_config_error(error_msg, "config.json")

        assert "Configuration Error" in result
        assert "A" * 100 in result  # Should contain at least part of message

    def test_config_error_with_special_path_characters(self):
        """format_config_error handles paths with special characters."""
        error_msg = "Test error"
        config_path = "/path/with spaces/and-dashes/config (1).json"

        result = ErrorFormatter.format_config_error(error_msg, config_path)

        assert "Configuration Error" in result

    def test_slack_error_with_short_webhook(self):
        """format_slack_error handles short webhook URLs."""
        error_msg = "Error"
        webhook_url = "short"  # Too short to truncate

        result = ErrorFormatter.format_slack_error(error_msg, webhook_url)

        assert "Slack Notification Error" in result

    def test_scraper_error_with_multiple_urls(self):
        """format_scraper_error includes URL when provided."""
        error_msg = "Multiple failures"
        source = "TestSource"
        url = "https://example.com/jobs?page=1&filter=python"

        result = ErrorFormatter.format_scraper_error(error_msg, source, url)

        assert url in result

    def test_all_formatters_return_non_empty_strings(self):
        """All formatters always return non-empty strings."""
        test_error = "Test error"

        results = [
            ErrorFormatter.format_config_error(test_error, "config.json"),
            ErrorFormatter.format_install_error(test_error),
            ErrorFormatter.format_slack_error(test_error),
            ErrorFormatter.format_scraper_error(test_error, "Source"),
            ErrorFormatter.format_database_error(test_error),
        ]

        for result in results:
            assert isinstance(result, str)
            assert len(result) > 10  # Substantial output
            assert "\n" in result  # Multi-line formatting

    def test_formatters_include_emoji_indicators(self):
        """Formatters include emoji indicators for visual clarity."""
        test_error = "Test error"

        results = [
            ErrorFormatter.format_config_error(test_error, "config.json"),
            ErrorFormatter.format_install_error(test_error),
            ErrorFormatter.format_slack_error(test_error),
            ErrorFormatter.format_scraper_error(test_error, "Source"),
            ErrorFormatter.format_database_error(test_error),
        ]

        for result in results:
            # Should contain at least one emoji indicator
            has_emoji = any(char in result for char in ["❌", "📝", "🔧", "💡", "📚", "🎭", "🤖", "🔐"])
            assert has_emoji, f"Result should contain emoji: {result[:100]}"
