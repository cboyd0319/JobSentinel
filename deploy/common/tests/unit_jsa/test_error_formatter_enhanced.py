"""Comprehensive tests for jsa.error_formatter module.

Tests error formatting with actionable suggestions:
- Configuration error formatting
- Installation error formatting  
- Slack error formatting
- Scraper error formatting
- Database error formatting
"""

import pytest
from pathlib import Path

from jsa.error_formatter import ErrorFormatter


class TestFormatConfigError:
    """Tests for format_config_error method."""

    def test_format_config_error_basic(self):
        """format_config_error should return formatted string."""
        # Arrange
        error_msg = "Invalid configuration"
        config_path = "config/user_prefs.json"

        # Act
        result = ErrorFormatter.format_config_error(error_msg, config_path)

        # Assert
        assert isinstance(result, str)
        assert error_msg in result
        assert "Configuration Error" in result

    def test_format_config_error_keywords_boost_missing(self):
        """Should provide keywords_boost specific help."""
        # Arrange
        error_msg = "Missing keywords_boost field"
        config_path = "config/user_prefs.json"

        # Act
        result = ErrorFormatter.format_config_error(error_msg, config_path)

        # Assert
        assert "keywords_boost" in result
        assert "Add 'keywords_boost'" in result
        assert "python" in result  # Example value

    def test_format_config_error_missing_required_field(self):
        """Should provide general missing field help."""
        # Arrange
        error_msg = "Missing required field: email"
        config_path = "config/user_prefs.json"

        # Act
        result = ErrorFormatter.format_config_error(error_msg, config_path)

        # Assert
        assert "missing" in result.lower()
        assert "example config" in result.lower()
        assert config_path in result

    def test_format_config_error_invalid_json(self):
        """Should provide JSON syntax help."""
        # Arrange
        error_msg = "Invalid JSON syntax"
        config_path = "config/user_prefs.json"

        # Act
        result = ErrorFormatter.format_config_error(error_msg, config_path)

        # Assert
        assert "JSON" in result
        assert "comma" in result.lower()
        assert "jsonlint.com" in result

    def test_format_config_error_includes_resources(self):
        """Should include resources section."""
        # Arrange
        error_msg = "Some error"
        config_path = "config/user_prefs.json"

        # Act
        result = ErrorFormatter.format_config_error(error_msg, config_path)

        # Assert
        assert "Resources" in result
        assert "Documentation" in result or "docs/" in result

    def test_format_config_error_accepts_path_object(self):
        """Should accept Path object for config_path."""
        # Arrange
        error_msg = "Error"
        config_path = Path("config/user_prefs.json")

        # Act
        result = ErrorFormatter.format_config_error(error_msg, config_path)

        # Assert
        assert isinstance(result, str)
        assert "Configuration Error" in result


class TestFormatInstallError:
    """Tests for format_install_error method."""

    def test_format_install_error_basic(self):
        """format_install_error should return formatted string."""
        # Arrange
        error_msg = "Package not found"

        # Act
        result = ErrorFormatter.format_install_error(error_msg)

        # Assert
        assert isinstance(result, str)
        assert error_msg in result
        assert "Installation Error" in result

    def test_format_install_error_with_missing_package(self):
        """Should include pip install command when package specified."""
        # Arrange
        error_msg = "Module not found"
        missing_package = "requests"

        # Act
        result = ErrorFormatter.format_install_error(error_msg, missing_package)

        # Assert
        assert f"pip install {missing_package}" in result
        assert "missing package" in result.lower()

    def test_format_install_error_playwright_specific(self):
        """Should provide Playwright-specific instructions."""
        # Arrange
        error_msg = "playwright driver not found"

        # Act
        result = ErrorFormatter.format_install_error(error_msg)

        # Assert
        assert "playwright" in result.lower()
        assert "playwright install chromium" in result
        assert "browser" in result.lower()

    def test_format_install_error_no_module_named(self):
        """Should provide venv and editable install help."""
        # Arrange
        error_msg = "No module named 'jsa'"

        # Act
        result = ErrorFormatter.format_install_error(error_msg)

        # Assert
        assert "virtual environment" in result.lower() or "venv" in result
        assert "pip install -e" in result
        assert "activate" in result.lower()

    def test_format_install_error_without_missing_package(self):
        """Should work without missing_package parameter."""
        # Arrange
        error_msg = "Installation failed"

        # Act
        result = ErrorFormatter.format_install_error(error_msg)

        # Assert
        assert isinstance(result, str)
        assert error_msg in result


class TestFormatSlackError:
    """Tests for format_slack_error method."""

    def test_format_slack_error_basic(self):
        """format_slack_error should return formatted string."""
        # Arrange
        error_msg = "Failed to send message"

        # Act
        result = ErrorFormatter.format_slack_error(error_msg)

        # Assert
        assert isinstance(result, str)
        assert error_msg in result
        assert "Slack" in result

    def test_format_slack_error_invalid_webhook(self):
        """Should provide webhook setup instructions for auth errors."""
        # Arrange
        error_msg = "401 Unauthorized"

        # Act
        result = ErrorFormatter.format_slack_error(error_msg)

        # Assert
        assert "webhook" in result.lower()
        assert "api.slack.com" in result
        assert "Incoming Webhooks" in result

    def test_format_slack_error_403_forbidden(self):
        """Should handle 403 errors."""
        # Arrange
        error_msg = "403 Forbidden"

        # Act
        result = ErrorFormatter.format_slack_error(error_msg)

        # Assert
        assert "webhook" in result.lower()
        assert "invalid" in result.lower()

    def test_format_slack_error_connection_issue(self):
        """Should provide network troubleshooting for connection errors."""
        # Arrange
        error_msg = "Connection timeout"

        # Act
        result = ErrorFormatter.format_slack_error(error_msg)

        # Assert
        assert "connection" in result.lower() or "network" in result.lower()
        assert "firewall" in result.lower()
        assert "status.slack.com" in result

    def test_format_slack_error_with_webhook_url(self):
        """Should include partial webhook URL for testing."""
        # Arrange
        error_msg = "Failed to send"
        webhook_url = "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX"

        # Act
        result = ErrorFormatter.format_slack_error(error_msg, webhook_url)

        # Assert
        assert webhook_url[:40] in result
        assert "..." in result  # Should be truncated

    def test_format_slack_error_without_webhook_url(self):
        """Should work without webhook_url parameter."""
        # Arrange
        error_msg = "Failed"

        # Act
        result = ErrorFormatter.format_slack_error(error_msg)

        # Assert
        assert "YOUR_WEBHOOK_URL" in result

    def test_format_slack_error_includes_test_command(self):
        """Should include curl test command."""
        # Arrange
        error_msg = "Error"

        # Act
        result = ErrorFormatter.format_slack_error(error_msg)

        # Assert
        assert "curl" in result
        assert "Test" in result


class TestFormatScraperError:
    """Tests for format_scraper_error method."""

    def test_format_scraper_error_basic(self):
        """format_scraper_error should return formatted string."""
        # Arrange
        error_msg = "Failed to scrape"
        source = "LinkedIn"

        # Act
        result = ErrorFormatter.format_scraper_error(error_msg, source)

        # Assert
        assert isinstance(result, str)
        assert error_msg in result
        assert source in result

    def test_format_scraper_error_with_url(self):
        """Should include URL when provided."""
        # Arrange
        error_msg = "Failed"
        source = "Indeed"
        url = "https://www.indeed.com/jobs"

        # Act
        result = ErrorFormatter.format_scraper_error(error_msg, source, url)

        # Assert
        assert url in result

    def test_format_scraper_error_rate_limit(self):
        """Should provide rate limit specific advice."""
        # Arrange
        error_msg = "Rate limit exceeded"
        source = "LinkedIn"

        # Act
        result = ErrorFormatter.format_scraper_error(error_msg, source)

        # Assert
        assert "Rate Limit" in result
        assert "Wait" in result or "wait" in result
        assert "frequency" in result.lower()

    def test_format_scraper_error_robots_txt(self):
        """Should explain robots.txt restrictions."""
        # Arrange
        error_msg = "Blocked by robots.txt"
        source = "Facebook"

        # Act
        result = ErrorFormatter.format_scraper_error(error_msg, source)

        # Assert
        assert "robots.txt" in result
        assert "respects" in result.lower()
        assert source in result

    def test_format_scraper_error_403_auth(self):
        """Should provide auth suggestions for 403 errors."""
        # Arrange
        error_msg = "403 Forbidden"
        source = "GitHub"

        # Act
        result = ErrorFormatter.format_scraper_error(error_msg, source)

        # Assert
        assert "Authentication" in result or "auth" in result.lower()
        assert "API key" in result

    def test_format_scraper_error_401_auth(self):
        """Should provide auth suggestions for 401 errors."""
        # Arrange
        error_msg = "401 Unauthorized"
        source = "GitHub"

        # Act
        result = ErrorFormatter.format_scraper_error(error_msg, source)

        # Assert
        assert "Authentication" in result or "auth" in result.lower()


class TestFormatDatabaseError:
    """Tests for format_database_error method."""

    def test_format_database_error_basic(self):
        """format_database_error should return formatted string."""
        # Arrange
        error_msg = "Database operation failed"

        # Act
        result = ErrorFormatter.format_database_error(error_msg)

        # Assert
        assert isinstance(result, str)
        assert error_msg in result
        assert "Database Error" in result

    def test_format_database_error_locked(self):
        """Should provide locked database specific help."""
        # Arrange
        error_msg = "Database is locked"

        # Act
        result = ErrorFormatter.format_database_error(error_msg)

        # Assert
        assert "locked" in result.lower()
        assert "process" in result.lower()
        assert "Wait" in result or "wait" in result

    def test_format_database_error_corrupt(self):
        """Should provide corruption recovery steps."""
        # Arrange
        error_msg = "Database file is corrupt"

        # Act
        result = ErrorFormatter.format_database_error(error_msg)

        # Assert
        assert "corrupt" in result.lower()
        assert "Backup" in result or "backup" in result
        assert "sqlite3" in result
        assert "integrity_check" in result

    def test_format_database_error_generic(self):
        """Should provide general troubleshooting for other errors."""
        # Arrange
        error_msg = "Unknown database error"

        # Act
        result = ErrorFormatter.format_database_error(error_msg)

        # Assert
        assert "permissions" in result.lower()
        assert "disk space" in result.lower()
        assert "health" in result

    def test_format_database_error_includes_recovery_steps(self):
        """Should always include recovery steps."""
        # Arrange
        error_msg = "Error"

        # Act
        result = ErrorFormatter.format_database_error(error_msg)

        # Assert
        assert "Recovery" in result or "recovery" in result.lower()


class TestErrorFormatterStaticMethods:
    """Tests for ErrorFormatter as a utility class."""

    def test_error_formatter_is_static(self):
        """All methods should be static (no instance needed)."""
        # Act & Assert - Should be able to call without instantiation
        ErrorFormatter.format_config_error("error", "path")
        ErrorFormatter.format_install_error("error")
        ErrorFormatter.format_slack_error("error")
        ErrorFormatter.format_scraper_error("error", "source")
        ErrorFormatter.format_database_error("error")

    def test_error_formatter_can_instantiate(self):
        """Should be able to instantiate if needed."""
        # Act
        formatter = ErrorFormatter()

        # Assert
        assert formatter is not None
        assert isinstance(formatter, ErrorFormatter)
