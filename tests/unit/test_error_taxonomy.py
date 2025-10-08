#!/usr/bin/env python3
"""
Tests for error taxonomy and structured logging components.

Validates The Picky Programmer's standards:
- Error classification and handling
- Trace ID propagation
- Structured logging format
- PII redaction functionality
"""

import json
import logging
from unittest.mock import MagicMock, patch

import pytest

from utils.error_taxonomy import (
    ErrorContext,
    ErrorContextManager,
    system_error,
    transient_error,
    user_error,
)
from utils.structured_logging import (
    PIIRedactor,
    StructuredFormatter,
    StructuredLogger,
    performance_logger,
    trace_context_manager,
)


class TestErrorTaxonomy:
    """Test error classification and structured exception handling."""

    def test_user_error_creation(self):
        """Test UserError with proper error code and context."""
        context = ErrorContext(operation="test_operation", component="test")
        error = user_error(
            code="INVALID_CONFIG",
            message="Configuration file not found",
            hint="Check config file path",
            context=context,
        )

        assert error.error_code == "INVALID_CONFIG"
        assert "Configuration file not found" in str(error)
        assert error.context.operation == "test_operation"
        assert error.hint == "Check config file path"

    def test_transient_error_with_retry(self):
        """Test TransientError includes retry guidance."""
        error = transient_error(
            code="RATE_LIMIT_EXCEEDED", message="API rate limit reached", retry_after=120
        )

        assert error.error_code == "RATE_LIMIT_EXCEEDED"
        assert error.retry_after == 120
        assert "120 seconds" in error.action

    def test_system_error_with_severity(self):
        """Test SystemError includes severity classification."""
        error = system_error(
            code="DATABASE_CORRUPTION",
            message="Database integrity check failed",
            severity="critical",
        )

        assert error.error_code == "DATABASE_CORRUPTION"
        assert error.severity == "critical"
        assert "development team" in error.action

    def test_error_context_manager(self):
        """Test automatic error context propagation."""
        with ErrorContextManager("test_op", "test_component") as context:
            assert context.operation == "test_op"
            assert context.component == "test_component"
            assert len(context.trace_id) == 8  # Shortened UUID

    def test_error_to_dict_serialization(self):
        """Test error serialization for structured logging."""
        error = user_error(code="TEST_ERROR", message="Test message", hint="Test hint")

        error_dict = error.to_dict()
        assert error_dict["error_code"] == "TEST_ERROR"
        assert error_dict["message"] == "Test message"
        assert error_dict["hint"] == "Test hint"
        assert "trace_id" in error_dict["context"]


class TestStructuredLogging:
    """Test structured logging with trace_id and PII redaction."""

    def test_pii_redaction(self):
        """Test PII redaction in log messages."""
        message = "User email: john.doe@example.com, phone: 555-123-4567"
        redacted = PIIRedactor.redact_message(message)

        assert "john.doe@example.com" not in redacted
        assert "555-123-4567" not in redacted
        assert "[REDACTED_EMAIL]" in redacted
        assert "[REDACTED_PHONE]" in redacted

    def test_structured_formatter(self):
        """Test JSON log formatting with structured fields."""
        formatter = StructuredFormatter(include_pii_redaction=False)

        # Create a mock log record
        record = logging.LogRecord(
            name="test_logger",
            level=logging.INFO,
            pathname="test.py",
            lineno=100,
            msg="Test message",
            args=(),
            exc_info=None,
        )

        # Add custom context
        record.context = {"trace_id": "test123", "component": "test"}

        formatted = formatter.format(record)
        log_data = json.loads(formatted)

        assert log_data["message"] == "Test message"
        assert log_data["level"] == "INFO"
        assert log_data["trace_id"] == "test123"
        assert log_data["component"] == "test"

    def test_trace_context_propagation(self):
        """Test trace_id propagation across operations."""
        logger = StructuredLogger("test", "test_component")

        with trace_context_manager(trace_id="test_trace_123") as trace_id:
            assert trace_id == "test_trace_123"

            # Mock the underlying logger to capture the log call
            with patch.object(logger.logger, "log") as mock_log:
                logger.info("Test message", operation="test_op")

                # Verify the log was called with correct context
                mock_log.assert_called_once()
                args, kwargs = mock_log.call_args
                assert kwargs["extra"]["context"].trace_id == "test_trace_123"

    def test_performance_logging(self):
        """Test automatic performance metric logging."""
        logger = StructuredLogger("test", "test_component")

        with patch.object(logger, "log_performance") as mock_perf_log:
            with performance_logger(logger, "test_operation", log_start=False):
                pass  # Simulate work

            # Verify performance was logged
            mock_perf_log.assert_called_once()
            # Check that log_performance was called with expected keyword arguments
            _, kwargs = mock_perf_log.call_args
            assert "operation" in kwargs or len(mock_perf_log.call_args[0]) >= 2

    def test_structured_logger_methods(self):
        """Test all structured logger methods include context."""
        logger = StructuredLogger("test", "test_component")

        with patch.object(logger.logger, "log") as mock_log:
            logger.debug("Debug message", operation="debug_op")
            logger.info("Info message", operation="info_op")
            logger.warning("Warning message", operation="warning_op")
            logger.error("Error message", operation="error_op")
            logger.critical("Critical message", operation="critical_op")

            # Verify all calls included context
            assert mock_log.call_count == 5
            for call in mock_log.call_args_list:
                args, kwargs = call
                assert "context" in kwargs["extra"]
                assert kwargs["extra"]["context"].component == "test_component"


class TestIntegration:
    """Integration tests for error taxonomy + structured logging."""

    def test_error_logging_integration(self):
        """Test that structured errors log properly."""
        logger = StructuredLogger("test", "test_component")

        error = user_error(code="INTEGRATION_TEST", message="Integration test error")

        with patch.object(logger.logger, "log") as mock_log:
            error.log_structured(logger.logger)

            # Verify structured error was logged
            mock_log.assert_called_once()
            args, kwargs = mock_log.call_args
            assert args[0] == logging.ERROR  # log level
            assert "error_details" in kwargs["extra"]
            assert kwargs["extra"]["error_details"]["error_code"] == "INTEGRATION_TEST"

    def test_context_manager_error_conversion(self):
        """Test automatic error conversion in context manager."""
        with patch("utils.error_taxonomy.logging.getLogger") as mock_get_logger:
            mock_logger = MagicMock()
            mock_get_logger.return_value = mock_logger

            with pytest.raises(ValueError):
                with ErrorContextManager("test_op", "test_component"):
                    raise ValueError("Test generic error")

            # Verify the error was logged
            mock_logger.debug.assert_called()


if __name__ == "__main__":
    # Run basic smoke tests
    print("Running error taxonomy smoke tests...")

    # Test error creation
    user_err = user_error("TEST_USER", "User error test")
    print(f"✅ UserError: {user_err.error_code}")

    transient_err = transient_error("TEST_TRANSIENT", "Transient error test")
    print(f"✅ TransientError: {transient_err.error_code}")

    system_err = system_error("TEST_SYSTEM", "System error test")
    print(f"✅ SystemError: {system_err.error_code}")

    # Test structured logging
    logger = StructuredLogger("smoke_test", "test_component")
    with trace_context_manager() as trace_id:
        logger.info("Smoke test message", operation="smoke_test")
        print(f"✅ Structured logging with trace_id: {trace_id}")

    # Test PII redaction
    pii_message = "Contact user@example.com or 555-123-4567"
    redacted = PIIRedactor.redact_message(pii_message)
    print(f"✅ PII redaction: {redacted}")

    print("All smoke tests passed! ✨")
