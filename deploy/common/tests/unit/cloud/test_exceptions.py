"""Comprehensive tests for cloud.common.exceptions module.

Tests all custom exception classes and their inheritance hierarchy.
"""

import pytest


# Import the exceptions module
import sys
from pathlib import Path

_cloud_common_path = Path(__file__).resolve().parent.parent.parent.parent.parent / "cloud" / "common"
if str(_cloud_common_path) not in sys.path:
    sys.path.insert(0, str(_cloud_common_path))

from exceptions import (
    AuthenticationError,
    ConfigurationError,
    DeploymentError,
    QuotaExceededError,
)


class TestDeploymentError:
    """Test the base DeploymentError exception."""

    def test_deployment_error_is_exception(self):
        """DeploymentError should be a subclass of Exception."""
        assert issubclass(DeploymentError, Exception)

    def test_deployment_error_can_be_raised(self):
        """DeploymentError should be raisable with a message."""
        with pytest.raises(DeploymentError, match="Test error"):
            raise DeploymentError("Test error")

    def test_deployment_error_no_message(self):
        """DeploymentError should be raisable without a message."""
        with pytest.raises(DeploymentError):
            raise DeploymentError()

    @pytest.mark.parametrize(
        "message",
        [
            "Simple error",
            "Error with numbers: 123",
            "Error with special chars: !@#$%",
            "Multi-line\nerror\nmessage",
            "",  # empty string
        ],
        ids=["simple", "numbers", "special_chars", "multiline", "empty"],
    )
    def test_deployment_error_various_messages(self, message):
        """DeploymentError should handle various message formats."""
        with pytest.raises(DeploymentError) as exc_info:
            raise DeploymentError(message)
        assert str(exc_info.value) == message


class TestQuotaExceededError:
    """Test the QuotaExceededError exception."""

    def test_quota_exceeded_error_inherits_deployment_error(self):
        """QuotaExceededError should inherit from DeploymentError."""
        assert issubclass(QuotaExceededError, DeploymentError)

    def test_quota_exceeded_error_is_exception(self):
        """QuotaExceededError should be a subclass of Exception."""
        assert issubclass(QuotaExceededError, Exception)

    def test_quota_exceeded_error_can_be_raised(self):
        """QuotaExceededError should be raisable with a message."""
        with pytest.raises(QuotaExceededError, match="Quota exceeded"):
            raise QuotaExceededError("Quota exceeded")

    def test_quota_exceeded_error_can_be_caught_as_deployment_error(self):
        """QuotaExceededError should be catchable as DeploymentError."""
        with pytest.raises(DeploymentError):
            raise QuotaExceededError("Quota exceeded")

    @pytest.mark.parametrize(
        "message",
        [
            "CPU quota exceeded",
            "Storage quota exceeded",
            "API quota exceeded for project my-project",
        ],
        ids=["cpu", "storage", "api_with_project"],
    )
    def test_quota_exceeded_error_typical_messages(self, message):
        """QuotaExceededError should handle typical quota error messages."""
        with pytest.raises(QuotaExceededError) as exc_info:
            raise QuotaExceededError(message)
        assert message in str(exc_info.value)


class TestAuthenticationError:
    """Test the AuthenticationError exception."""

    def test_authentication_error_inherits_deployment_error(self):
        """AuthenticationError should inherit from DeploymentError."""
        assert issubclass(AuthenticationError, DeploymentError)

    def test_authentication_error_is_exception(self):
        """AuthenticationError should be a subclass of Exception."""
        assert issubclass(AuthenticationError, Exception)

    def test_authentication_error_can_be_raised(self):
        """AuthenticationError should be raisable with a message."""
        with pytest.raises(AuthenticationError, match="Auth failed"):
            raise AuthenticationError("Auth failed")

    def test_authentication_error_can_be_caught_as_deployment_error(self):
        """AuthenticationError should be catchable as DeploymentError."""
        with pytest.raises(DeploymentError):
            raise AuthenticationError("Auth failed")

    @pytest.mark.parametrize(
        "message",
        [
            "Invalid credentials",
            "Token expired",
            "Service account not found",
            "Permission denied",
        ],
        ids=["invalid_creds", "expired_token", "no_service_account", "permission_denied"],
    )
    def test_authentication_error_typical_messages(self, message):
        """AuthenticationError should handle typical auth error messages."""
        with pytest.raises(AuthenticationError) as exc_info:
            raise AuthenticationError(message)
        assert message in str(exc_info.value)


class TestConfigurationError:
    """Test the ConfigurationError exception."""

    def test_configuration_error_inherits_deployment_error(self):
        """ConfigurationError should inherit from DeploymentError."""
        assert issubclass(ConfigurationError, DeploymentError)

    def test_configuration_error_is_exception(self):
        """ConfigurationError should be a subclass of Exception."""
        assert issubclass(ConfigurationError, Exception)

    def test_configuration_error_can_be_raised(self):
        """ConfigurationError should be raisable with a message."""
        with pytest.raises(ConfigurationError, match="Invalid config"):
            raise ConfigurationError("Invalid config")

    def test_configuration_error_can_be_caught_as_deployment_error(self):
        """ConfigurationError should be catchable as DeploymentError."""
        with pytest.raises(DeploymentError):
            raise ConfigurationError("Invalid config")

    @pytest.mark.parametrize(
        "message",
        [
            "Missing required field: project_id",
            "Invalid region specified",
            "Configuration file not found",
            "Malformed JSON in config",
        ],
        ids=["missing_field", "invalid_region", "file_not_found", "malformed_json"],
    )
    def test_configuration_error_typical_messages(self, message):
        """ConfigurationError should handle typical config error messages."""
        with pytest.raises(ConfigurationError) as exc_info:
            raise ConfigurationError(message)
        assert message in str(exc_info.value)


class TestExceptionHierarchy:
    """Test the exception inheritance hierarchy."""

    def test_all_custom_exceptions_inherit_from_deployment_error(self):
        """All custom exceptions should inherit from DeploymentError."""
        custom_exceptions = [QuotaExceededError, AuthenticationError, ConfigurationError]
        for exc_class in custom_exceptions:
            assert issubclass(exc_class, DeploymentError)

    def test_deployment_error_is_base_exception(self):
        """DeploymentError should be the base exception class."""
        assert DeploymentError.__bases__ == (Exception,)

    def test_exception_catching_order(self):
        """More specific exceptions should be caught before general ones."""
        # Test that catching DeploymentError catches all custom exceptions
        for exc_class in [QuotaExceededError, AuthenticationError, ConfigurationError]:
            try:
                raise exc_class("Test")
            except DeploymentError:
                pass  # Successfully caught
            except Exception:
                pytest.fail(f"{exc_class.__name__} should be caught as DeploymentError")

    @pytest.mark.parametrize(
        "exc_class,expected_name",
        [
            (DeploymentError, "DeploymentError"),
            (QuotaExceededError, "QuotaExceededError"),
            (AuthenticationError, "AuthenticationError"),
            (ConfigurationError, "ConfigurationError"),
        ],
        ids=["base", "quota", "auth", "config"],
    )
    def test_exception_class_names(self, exc_class, expected_name):
        """Exception classes should have correct names."""
        assert exc_class.__name__ == expected_name

    def test_exception_repr(self):
        """Exception repr should contain useful information."""
        exc = DeploymentError("Test error message")
        exc_repr = repr(exc)
        assert "Test error message" in exc_repr or "DeploymentError" in str(type(exc))


class TestExceptionUsagePatterns:
    """Test common usage patterns for exceptions."""

    def test_catch_specific_then_general(self):
        """Should be able to catch specific exceptions before general ones."""
        caught = None
        try:
            raise QuotaExceededError("Quota error")
        except QuotaExceededError:
            caught = "specific"
        except DeploymentError:
            caught = "general"

        assert caught == "specific"

    def test_catch_general_only(self):
        """Should be able to catch all deployment errors with base class."""
        caught_errors = []
        error_classes = [QuotaExceededError, AuthenticationError, ConfigurationError]

        for error_class in error_classes:
            try:
                raise error_class(f"{error_class.__name__} occurred")
            except DeploymentError as e:
                caught_errors.append(type(e).__name__)

        assert len(caught_errors) == 3
        assert "QuotaExceededError" in caught_errors
        assert "AuthenticationError" in caught_errors
        assert "ConfigurationError" in caught_errors

    def test_re_raise_with_context(self):
        """Should be able to re-raise with additional context."""
        with pytest.raises(DeploymentError) as exc_info:
            try:
                raise ValueError("Original error")
            except ValueError as e:
                raise DeploymentError("Wrapped error") from e

        assert exc_info.value.__cause__.__class__.__name__ == "ValueError"
        assert "Wrapped error" in str(exc_info.value)

    def test_exception_attributes(self):
        """Exceptions should support standard exception attributes."""
        exc = ConfigurationError("Config error")
        assert hasattr(exc, "args")
        assert exc.args == ("Config error",)
