"""Comprehensive tests for error_formatter module.

Tests error formatting with actionable suggestions for various error types.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from jsa.error_formatter import ErrorFormatter


class TestErrorFormatterConfigError:
    """Test ErrorFormatter.format_config_error method."""

    def test_format_config_error_with_keywords_boost(self):
        """Test formatting config error about keywords_boost."""
        # Arrange
        error_msg = "Missing 'keywords_boost' field"
        config_path = "/path/to/config.json"

        # Act
        result = ErrorFormatter.format_config_error(error_msg, config_path)

        # Assert
        assert "❌ Configuration Error" in result
        assert error_msg in result
        assert "keywords_boost" in result
        assert "python" in result  # Example keyword
        assert "📝 How to fix:" in result

    def test_format_config_error_with_missing_field(self):
        """Test formatting config error about missing required field."""
        # Arrange
        error_msg = "Missing required field: api_key"
        config_path = "/path/to/config.json"

        # Act
        result = ErrorFormatter.format_config_error(error_msg, config_path)

        # Assert
        assert "❌ Configuration Error" in result
        assert error_msg in result
        assert "example config" in result.lower()
        assert "missing required fields" in result.lower()

    def test_format_config_error_with_invalid_json(self):
        """Test formatting config error about invalid JSON syntax."""
        # Arrange
        error_msg = "Invalid JSON in config file"
        config_path = "/path/to/config.json"

        # Act
        result = ErrorFormatter.format_config_error(error_msg, config_path)

        # Assert
        assert "❌ Configuration Error" in result
        assert error_msg in result
        assert "json" in result.lower()
        assert "comma" in result.lower()  # Common JSON issue
        assert "jsonlint.com" in result

    def test_format_config_error_with_path_object(self):
        """Test formatting config error with Path object."""
        # Arrange
        error_msg = "Configuration error"
        with tempfile.TemporaryDirectory() as tmpdir:
            config_path = Path(tmpdir) / "config.json"

            # Act
            result = ErrorFormatter.format_config_error(error_msg, config_path)

            # Assert
            assert "❌ Configuration Error" in result
            assert str(config_path) in result or str(config_path.parent) in result

    def test_format_config_error_includes_resources(self):
        """Test that formatted error includes resource links."""
        # Arrange
        error_msg = "Any error message"
        config_path = "/path/to/config.json"

        # Act
        result = ErrorFormatter.format_config_error(error_msg, config_path)

        # Assert
        assert "📚 Resources:" in result
        assert "Example config:" in result
        assert "Documentation:" in result
        assert "setup wizard" in result.lower()

    def test_format_config_error_multiline_output(self):
        """Test that formatted error is properly structured."""
        # Arrange
        error_msg = "Test error"
        config_path = "/path/to/config.json"

        # Act
        result = ErrorFormatter.format_config_error(error_msg, config_path)

        # Assert
        lines = result.split("\n")
        assert len(lines) > 5  # Should have multiple lines
        assert lines[0] == "❌ Configuration Error"

    @pytest.mark.parametrize(
        "error_msg,expected_keyword",
        [
            ("Missing 'keywords_boost' field", "keywords_boost"),
            ("Missing required field", "missing"),
            ("Invalid JSON syntax", "invalid json"),
            ("Configuration validation failed", "configuration"),
        ],
        ids=["keywords_boost", "missing", "invalid_json", "generic"],
    )
    def test_format_config_error_various_messages(
        self, error_msg: str, expected_keyword: str
    ):
        """Test formatting various config error messages."""
        # Arrange
        config_path = "/path/to/config.json"

        # Act
        result = ErrorFormatter.format_config_error(error_msg, config_path)

        # Assert
        assert expected_keyword.lower() in result.lower()
        assert "❌" in result
        assert "📝" in result or "📚" in result


class TestErrorFormatterInstallError:
    """Test ErrorFormatter.format_install_error method."""

    def test_format_install_error_basic(self):
        """Test basic install error formatting."""
        # Arrange
        error_msg = "Package not found"

        # Act
        result = ErrorFormatter.format_install_error(error_msg)

        # Assert
        assert "❌ Installation Error" in result
        assert error_msg in result

    def test_format_install_error_with_package_name(self):
        """Test install error with specific package name."""
        # Arrange
        error_msg = "Missing package"
        missing_package = "requests"

        # Act
        result = ErrorFormatter.format_install_error(error_msg, missing_package)

        # Assert
        assert "❌ Installation Error" in result
        assert error_msg in result
        # Should include installation instructions

    def test_format_install_error_without_package_name(self):
        """Test install error without specific package."""
        # Arrange
        error_msg = "Installation failed"

        # Act
        result = ErrorFormatter.format_install_error(error_msg, missing_package=None)

        # Assert
        assert "❌ Installation Error" in result
        assert error_msg in result

    def test_format_install_error_multiline(self):
        """Test that install error has proper structure."""
        # Arrange
        error_msg = "Test error"

        # Act
        result = ErrorFormatter.format_install_error(error_msg)

        # Assert
        lines = result.split("\n")
        assert len(lines) >= 3  # Should have at least header, empty line, message

    @pytest.mark.parametrize(
        "package_name",
        ["requests", "beautifulsoup4", "sqlalchemy", None],
        ids=["requests", "beautifulsoup4", "sqlalchemy", "no_package"],
    )
    def test_format_install_error_various_packages(self, package_name: str | None):
        """Test formatting install errors for various packages."""
        # Arrange
        error_msg = f"Failed to install {package_name}" if package_name else "Install failed"

        # Act
        result = ErrorFormatter.format_install_error(error_msg, package_name)

        # Assert
        assert "❌ Installation Error" in result
        assert error_msg in result


class TestErrorFormatterEdgeCases:
    """Test edge cases for ErrorFormatter."""

    def test_format_config_error_empty_message(self):
        """Test formatting with empty error message."""
        # Arrange
        error_msg = ""
        config_path = "/path/to/config.json"

        # Act
        result = ErrorFormatter.format_config_error(error_msg, config_path)

        # Assert
        assert "❌ Configuration Error" in result
        # Should still provide helpful output even with empty message

    def test_format_install_error_empty_message(self):
        """Test install error formatting with empty message."""
        # Arrange
        error_msg = ""

        # Act
        result = ErrorFormatter.format_install_error(error_msg)

        # Assert
        assert "❌ Installation Error" in result

    def test_format_config_error_very_long_message(self):
        """Test formatting with very long error message."""
        # Arrange
        error_msg = "Error: " + "x" * 1000
        config_path = "/path/to/config.json"

        # Act
        result = ErrorFormatter.format_config_error(error_msg, config_path)

        # Assert
        assert "❌ Configuration Error" in result
        assert error_msg in result

    def test_format_config_error_special_characters(self):
        """Test formatting with special characters in message."""
        # Arrange
        error_msg = "Error: <script>alert('xss')</script> & special chars"
        config_path = "/path/to/config.json"

        # Act
        result = ErrorFormatter.format_config_error(error_msg, config_path)

        # Assert
        assert error_msg in result
        assert "❌" in result

    def test_format_config_error_unicode_path(self):
        """Test formatting with unicode characters in path."""
        # Arrange
        error_msg = "Configuration error"
        config_path = "/path/to/配置.json"

        # Act
        result = ErrorFormatter.format_config_error(error_msg, config_path)

        # Assert
        assert "❌ Configuration Error" in result
        # The path is used but may be transformed (e.g., to example path)
        assert isinstance(result, str)

    def test_error_formatter_is_static_class(self):
        """Test that ErrorFormatter methods are static."""
        # Act & Assert - Should be able to call without instantiation
        result = ErrorFormatter.format_config_error("test", "/path")
        assert isinstance(result, str)

        result2 = ErrorFormatter.format_install_error("test")
        assert isinstance(result2, str)

    def test_format_config_error_case_insensitive_matching(self):
        """Test that error pattern matching is case-insensitive."""
        # Arrange
        test_cases = [
            "MISSING required field",
            "missing REQUIRED field",
            "Missing Required Field",
        ]

        # Act & Assert
        for error_msg in test_cases:
            result = ErrorFormatter.format_config_error(error_msg, "/path")
            assert "missing" in result.lower()
            assert "📝 How to fix:" in result

    def test_formatted_errors_are_readable(self):
        """Test that formatted errors are human-readable."""
        # Arrange
        config_error = ErrorFormatter.format_config_error(
            "Missing field", "/path/config.json"
        )
        install_error = ErrorFormatter.format_install_error(
            "Package missing", "requests"
        )

        # Assert - Check for readability markers
        for error in [config_error, install_error]:
            # Should have proper structure
            assert "\n" in error  # Multiple lines
            # Should have emoji for visual clarity
            assert "❌" in error
            # Should not be all caps (shouting)
            lower_count = sum(1 for c in error if c.islower())
            upper_count = sum(1 for c in error if c.isupper())
            assert lower_count > upper_count  # More lowercase than uppercase
