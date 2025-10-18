"""Comprehensive tests for jsa.logging module.

Tests the logging facade that provides typed wrappers around structured logging.

Coverage targets:
- get_logger: returns configured logger for component
- setup_logging: configures root logger with proper settings
- Environment variable control (JSA_LOG_FILE)
- File and console logging configuration
- Logger component binding
- Edge cases: invalid paths, missing directories
"""

from __future__ import annotations

import os
from pathlib import Path
from unittest.mock import MagicMock, call, patch

import pytest

from jsa import logging as jsa_logging


class TestGetLogger:
    """Test suite for get_logger function."""

    @patch("jsa.logging.get_structured_logger")
    def test_get_logger_returns_structured_logger(self, mock_get_structured):
        """Test that get_logger returns a structured logger instance."""
        # Arrange
        mock_logger = MagicMock()
        mock_get_structured.return_value = mock_logger

        # Act
        result = jsa_logging.get_logger("test_module", "test_component")

        # Assert
        assert result == mock_logger
        mock_get_structured.assert_called_once_with(
            name="test_module", component="test_component"
        )

    @pytest.mark.parametrize(
        "name,component",
        [
            ("api", "fastapi"),
            ("database", "postgres"),
            ("scraper", "jobspy"),
            ("ml_engine", "inference"),
        ],
        ids=["api", "database", "scraper", "ml"],
    )
    @patch("jsa.logging.get_structured_logger")
    def test_get_logger_with_various_component_names(
        self, mock_get_structured, name, component
    ):
        """Test get_logger with various name and component combinations."""
        # Arrange
        mock_logger = MagicMock()
        mock_get_structured.return_value = mock_logger

        # Act
        result = jsa_logging.get_logger(name, component)

        # Assert
        mock_get_structured.assert_called_once_with(name=name, component=component)
        assert result == mock_logger

    @patch("jsa.logging.get_structured_logger")
    def test_get_logger_is_reusable(self, mock_get_structured):
        """Test that get_logger can be called multiple times."""
        # Arrange
        mock_logger1 = MagicMock()
        mock_logger2 = MagicMock()
        mock_get_structured.side_effect = [mock_logger1, mock_logger2]

        # Act
        logger1 = jsa_logging.get_logger("module1", "component1")
        logger2 = jsa_logging.get_logger("module2", "component2")

        # Assert
        assert logger1 == mock_logger1
        assert logger2 == mock_logger2
        assert mock_get_structured.call_count == 2


class TestSetupLogging:
    """Test suite for setup_logging function."""

    @patch("jsa.logging.setup_structured_logging")
    def test_setup_logging_with_defaults(self, mock_setup):
        """Test setup_logging with default parameters."""
        # Act
        jsa_logging.setup_logging()

        # Assert
        mock_setup.assert_called_once_with(
            log_level="INFO", log_file=None, include_console=True
        )

    @pytest.mark.parametrize(
        "level",
        ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
        ids=["debug", "info", "warning", "error", "critical"],
    )
    @patch("jsa.logging.setup_structured_logging")
    def test_setup_logging_with_different_levels(self, mock_setup, level):
        """Test setup_logging with different log levels."""
        # Act
        jsa_logging.setup_logging(level=level)

        # Assert
        mock_setup.assert_called_once_with(
            log_level=level, log_file=None, include_console=True
        )

    @patch("jsa.logging.setup_structured_logging")
    def test_setup_logging_with_file_path(self, mock_setup, temp_dir):
        """Test setup_logging with explicit file path."""
        # Arrange
        log_file = temp_dir / "app.log"

        # Act
        jsa_logging.setup_logging(file=log_file)

        # Assert
        mock_setup.assert_called_once_with(
            log_level="INFO", log_file=log_file, include_console=True
        )

    @patch("jsa.logging.setup_structured_logging")
    def test_setup_logging_without_console(self, mock_setup):
        """Test setup_logging with console output disabled."""
        # Act
        jsa_logging.setup_logging(include_console=False)

        # Assert
        mock_setup.assert_called_once_with(
            log_level="INFO", log_file=None, include_console=False
        )

    @patch("jsa.logging.setup_structured_logging")
    def test_setup_logging_with_all_parameters(self, mock_setup, temp_dir):
        """Test setup_logging with all parameters specified."""
        # Arrange
        log_file = temp_dir / "custom.log"

        # Act
        jsa_logging.setup_logging(level="DEBUG", file=log_file, include_console=False)

        # Assert
        mock_setup.assert_called_once_with(
            log_level="DEBUG", log_file=log_file, include_console=False
        )


class TestEnvironmentVariableControl:
    """Test suite for JSA_LOG_FILE environment variable."""

    @patch("jsa.logging.setup_structured_logging")
    def test_setup_logging_uses_env_var_when_set(self, mock_setup, temp_dir, monkeypatch):
        """Test that JSA_LOG_FILE environment variable overrides file parameter."""
        # Arrange
        env_log_file = temp_dir / "env_override.log"
        monkeypatch.setenv("JSA_LOG_FILE", str(env_log_file))
        
        # Ensure parent directory exists
        env_log_file.parent.mkdir(parents=True, exist_ok=True)

        # Act
        jsa_logging.setup_logging(file=Path("/tmp/ignored.log"))

        # Assert
        # Should use env var path, not the parameter
        mock_setup.assert_called_once()
        call_kwargs = mock_setup.call_args[1]
        assert call_kwargs["log_file"] == env_log_file

    @patch("jsa.logging.setup_structured_logging")
    def test_setup_logging_creates_parent_directory_for_env_file(
        self, mock_setup, temp_dir, monkeypatch
    ):
        """Test that setup_logging creates parent directories when using env var."""
        # Arrange
        nested_log = temp_dir / "logs" / "nested" / "app.log"
        monkeypatch.setenv("JSA_LOG_FILE", str(nested_log))

        # Act
        jsa_logging.setup_logging()

        # Assert
        # Parent directories should be created
        assert nested_log.parent.exists()
        
        # Should call setup with the env file
        mock_setup.assert_called_once()
        call_kwargs = mock_setup.call_args[1]
        assert call_kwargs["log_file"] == nested_log

    @patch("jsa.logging.setup_structured_logging")
    def test_setup_logging_without_env_var_uses_parameter(
        self, mock_setup, temp_dir, monkeypatch
    ):
        """Test that file parameter is used when JSA_LOG_FILE is not set."""
        # Arrange
        monkeypatch.delenv("JSA_LOG_FILE", raising=False)
        log_file = temp_dir / "param.log"

        # Act
        jsa_logging.setup_logging(file=log_file)

        # Assert
        mock_setup.assert_called_once_with(
            log_level="INFO", log_file=log_file, include_console=True
        )

    @patch("jsa.logging.setup_structured_logging")
    def test_setup_logging_without_env_var_or_file(self, mock_setup, monkeypatch):
        """Test setup_logging with no env var and no file parameter."""
        # Arrange
        monkeypatch.delenv("JSA_LOG_FILE", raising=False)

        # Act
        jsa_logging.setup_logging()

        # Assert
        mock_setup.assert_called_once_with(
            log_level="INFO", log_file=None, include_console=True
        )


class TestModuleExports:
    """Test suite for module __all__ exports."""

    def test_module_exports_expected_symbols(self):
        """Test that module exports expected public API."""
        # Expected public API
        expected = {
            "StructuredLogger",
            "get_logger",
            "trace_context_manager",
            "performance_logger",
            "setup_logging",
        }

        # Act
        actual = set(jsa_logging.__all__)

        # Assert
        assert actual == expected, f"Unexpected exports. Missing: {expected - actual}, Extra: {actual - expected}"

    def test_exported_functions_are_callable(self):
        """Test that exported functions are actually callable."""
        # Arrange
        exports_to_test = ["get_logger", "setup_logging"]

        # Act & Assert
        for export_name in exports_to_test:
            exported = getattr(jsa_logging, export_name)
            assert callable(exported), f"{export_name} should be callable"


class TestIntegrationBehavior:
    """Integration tests for logging module behavior."""

    @patch("jsa.logging.setup_structured_logging")
    @patch("jsa.logging.get_structured_logger")
    def test_typical_application_setup_flow(
        self, mock_get_logger, mock_setup, temp_dir
    ):
        """Test typical application logging setup and usage flow."""
        # Arrange
        mock_logger = MagicMock()
        mock_get_logger.return_value = mock_logger
        log_file = temp_dir / "app.log"

        # Act - Simulate application startup
        jsa_logging.setup_logging(level="DEBUG", file=log_file)
        
        # Create loggers for different components
        api_logger = jsa_logging.get_logger("api", "fastapi")
        db_logger = jsa_logging.get_logger("database", "sqlalchemy")

        # Assert
        # Setup should be called once
        mock_setup.assert_called_once_with(
            log_level="DEBUG", log_file=log_file, include_console=True
        )
        
        # Loggers should be created with correct parameters
        assert mock_get_logger.call_count == 2
        mock_get_logger.assert_any_call(name="api", component="fastapi")
        mock_get_logger.assert_any_call(name="database", component="sqlalchemy")

    @patch("jsa.logging.setup_structured_logging")
    def test_multiple_setup_calls_allowed(self, mock_setup):
        """Test that setup_logging can be called multiple times (reconfiguration)."""
        # Act
        jsa_logging.setup_logging(level="INFO")
        jsa_logging.setup_logging(level="DEBUG")
        jsa_logging.setup_logging(level="WARNING")

        # Assert
        assert mock_setup.call_count == 3
        # Last call should win
        assert mock_setup.call_args_list[-1] == call(
            log_level="WARNING", log_file=None, include_console=True
        )


class TestEdgeCasesAndBoundaries:
    """Test edge cases and boundary conditions."""

    @patch("jsa.logging.get_structured_logger")
    def test_get_logger_with_empty_strings(self, mock_get_structured):
        """Test get_logger behavior with empty strings (should not validate)."""
        # Note: Current implementation doesn't validate; this tests actual behavior
        # Arrange
        mock_logger = MagicMock()
        mock_get_structured.return_value = mock_logger

        # Act
        result = jsa_logging.get_logger("", "")

        # Assert
        # Current implementation allows empty strings (no validation)
        mock_get_structured.assert_called_once_with(name="", component="")
        assert result == mock_logger

    @patch("jsa.logging.setup_structured_logging")
    def test_setup_logging_with_nonexistent_parent_directory_in_env(
        self, mock_setup, temp_dir, monkeypatch
    ):
        """Test that deeply nested nonexistent directories are created."""
        # Arrange
        deep_path = temp_dir / "a" / "b" / "c" / "d" / "e" / "log.txt"
        monkeypatch.setenv("JSA_LOG_FILE", str(deep_path))

        # Act
        jsa_logging.setup_logging()

        # Assert
        assert deep_path.parent.exists()
        assert deep_path.parent.is_dir()

    @patch("jsa.logging.setup_structured_logging")
    def test_setup_logging_with_relative_path_in_env(
        self, mock_setup, monkeypatch
    ):
        """Test setup_logging with relative path in JSA_LOG_FILE."""
        # Arrange
        monkeypatch.setenv("JSA_LOG_FILE", "logs/app.log")

        # Act
        jsa_logging.setup_logging()

        # Assert
        # Should create logs directory relative to current dir
        logs_dir = Path("logs")
        assert logs_dir.exists()
        
        # Cleanup
        if logs_dir.exists() and logs_dir.is_dir():
            import shutil
            shutil.rmtree(logs_dir)
