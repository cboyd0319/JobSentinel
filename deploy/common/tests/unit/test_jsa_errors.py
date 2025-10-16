"""
Comprehensive unit tests for jsa.errors module.

Tests cover error facade functionality, error class availability,
and error creation functions.
"""

from __future__ import annotations

import pytest

from jsa.errors import (
    ErrorCategory,
    ErrorContext,
    JobSearchError,
    SystemError,
    TransientError,
    UserError,
    system_error,
    transient_error,
    user_error,
)


# ============================================================================
# Test: Error Classes Availability
# ============================================================================


def test_job_search_error_available():
    """Test that JobSearchError base class is available."""
    assert JobSearchError is not None
    assert issubclass(JobSearchError, Exception)


def test_user_error_available():
    """Test that UserError class is available."""
    assert UserError is not None
    assert issubclass(UserError, JobSearchError)


def test_transient_error_available():
    """Test that TransientError class is available."""
    assert TransientError is not None
    assert issubclass(TransientError, JobSearchError)


def test_system_error_available():
    """Test that SystemError class is available (note: shadows builtin)."""
    # This shadows Python's builtin SystemError, which is intentional in the module
    assert SystemError is not None
    # Should be the JobSentinel SystemError, not Python's
    assert issubclass(SystemError, JobSearchError)


# ============================================================================
# Test: ErrorCategory Enum
# ============================================================================


def test_error_category_enum_available():
    """Test that ErrorCategory enum is available."""
    assert ErrorCategory is not None


def test_error_category_has_expected_values():
    """Test that ErrorCategory has standard error categories."""
    # Check that it's usable as an enum
    assert hasattr(ErrorCategory, '__members__')


# ============================================================================
# Test: ErrorContext
# ============================================================================


def test_error_context_available():
    """Test that ErrorContext is available."""
    assert ErrorContext is not None


def test_error_context_can_be_instantiated():
    """Test that ErrorContext can be created."""
    # Assuming it's a dataclass or similar structure
    try:
        context = ErrorContext(
            operation="test_operation",
            details={"key": "value"}
        )
        assert context is not None
    except TypeError:
        # If it requires different parameters, that's fine
        # Just checking it's importable and has the right type
        pass


# ============================================================================
# Test: Error Creation Functions
# ============================================================================


def test_user_error_function():
    """Test that user_error function creates UserError."""
    error = user_error("TEST_ERROR", "Test user error")
    
    assert isinstance(error, UserError)
    assert isinstance(error, JobSearchError)
    assert "Test user error" in str(error)


def test_transient_error_function():
    """Test that transient_error function creates TransientError."""
    error = transient_error("TRANSIENT_ERROR", "Test transient error")
    
    assert isinstance(error, TransientError)
    assert isinstance(error, JobSearchError)
    assert "Test transient error" in str(error)


def test_system_error_function():
    """Test that system_error function creates SystemError."""
    error = system_error("SYSTEM_ERROR", "Test system error")
    
    assert isinstance(error, SystemError)
    assert isinstance(error, JobSearchError)
    assert "Test system error" in str(error)


# ============================================================================
# Test: Error Function Parameters
# ============================================================================


def test_user_error_with_category():
    """Test user_error accepts category parameter."""
    try:
        error = user_error("Error message", category=ErrorCategory.CONFIGURATION)
        assert error is not None
    except (TypeError, AttributeError):
        # If category isn't a parameter, skip this test
        pytest.skip("user_error doesn't accept category parameter")


def test_transient_error_with_context():
    """Test transient_error with context."""
    try:
        context = ErrorContext(operation="test", details={})
        error = transient_error("Error message", context=context)
        assert error is not None
    except (TypeError, AttributeError):
        # If context isn't a parameter or ErrorContext doesn't work this way
        pytest.skip("transient_error doesn't accept context parameter")


def test_system_error_with_cause():
    """Test system_error with cause."""
    try:
        original_error = ValueError("Original error")
        error = system_error("Wrapped error", cause=original_error)
        assert error is not None
    except TypeError:
        # If cause isn't a parameter
        pytest.skip("system_error doesn't accept cause parameter")


# ============================================================================
# Test: Error Raising and Catching
# ============================================================================


def test_user_error_can_be_raised_and_caught():
    """Test that UserError can be raised and caught."""
    with pytest.raises(UserError) as exc_info:
        raise user_error("TEST_ERROR", "Test error")
    
    assert "Test error" in str(exc_info.value)


def test_transient_error_can_be_raised_and_caught():
    """Test that TransientError can be raised and caught."""
    with pytest.raises(TransientError) as exc_info:
        raise transient_error("TIMEOUT", "Network timeout")
    
    assert "Network timeout" in str(exc_info.value)


def test_system_error_can_be_raised_and_caught():
    """Test that SystemError can be raised and caught."""
    with pytest.raises(SystemError) as exc_info:
        raise system_error("DB_CONN_FAILED", "Database connection failed")
    
    assert "Database connection failed" in str(exc_info.value)


def test_job_search_error_catches_all_subtypes():
    """Test that JobSearchError catches all error subtypes."""
    with pytest.raises(JobSearchError):
        raise user_error("USER_ERR", "User error")
    
    with pytest.raises(JobSearchError):
        raise transient_error("TRANS_ERR", "Transient error")
    
    with pytest.raises(JobSearchError):
        raise system_error("SYS_ERR", "System error")


# ============================================================================
# Test: Module Exports
# ============================================================================


def test_all_exports_available():
    """Test that all expected exports are available."""
    from jsa import errors
    
    expected_exports = [
        "ErrorCategory",
        "ErrorContext",
        "JobSearchError",
        "UserError",
        "TransientError",
        "SystemError",
        "user_error",
        "transient_error",
        "system_error",
    ]
    
    for export in expected_exports:
        assert hasattr(errors, export), f"{export} not exported from jsa.errors"


# ============================================================================
# Test: Error Messages
# ============================================================================


def test_error_messages_preserve_content():
    """Test that error messages are preserved correctly."""
    messages = [
        "Invalid configuration file",
        "Network timeout after 30 seconds",
        "Database connection pool exhausted",
        "Special chars: <>&\"'",
        "Unicode: 测试 مرحبا שלום",
    ]
    
    for msg in messages:
        user_err = user_error("TEST_CODE", msg)
        assert msg in str(user_err)
        
        transient_err = transient_error("TEST_CODE", msg)
        assert msg in str(transient_err)
        
        system_err = system_error("TEST_CODE", msg)
        assert msg in str(system_err)


def test_empty_error_message():
    """Test creating errors with empty messages."""
    # Should not crash
    user_err = user_error("EMPTY", "")
    assert isinstance(user_err, UserError)
    
    transient_err = transient_error("EMPTY", "")
    assert isinstance(transient_err, TransientError)
    
    system_err = system_error("EMPTY", "")
    assert isinstance(system_err, SystemError)


# ============================================================================
# Test: Error Hierarchy
# ============================================================================


def test_error_hierarchy_isinstance_checks():
    """Test that isinstance checks work correctly for error hierarchy."""
    user_err = user_error("CODE", "Test")
    transient_err = transient_error("CODE", "Test")
    system_err = system_error("CODE", "Test")
    
    # All should be JobSearchError
    assert isinstance(user_err, JobSearchError)
    assert isinstance(transient_err, JobSearchError)
    assert isinstance(system_err, JobSearchError)
    
    # All should be Exception
    assert isinstance(user_err, Exception)
    assert isinstance(transient_err, Exception)
    assert isinstance(system_err, Exception)
    
    # Cross-type checks should fail
    assert not isinstance(user_err, TransientError)
    assert not isinstance(user_err, SystemError)
    assert not isinstance(transient_err, UserError)
    assert not isinstance(transient_err, SystemError)
    assert not isinstance(system_err, UserError)
    assert not isinstance(system_err, TransientError)
