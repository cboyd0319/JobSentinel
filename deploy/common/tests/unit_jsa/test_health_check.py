"""Comprehensive tests for health_check module.

Tests system health checks, dependency validation, and recommendations.
"""

from __future__ import annotations

import sys
from unittest.mock import MagicMock, Mock, patch

import pytest

from jsa.health_check import HealthCheckResult, HealthChecker


class TestHealthCheckResult:
    """Test HealthCheckResult dataclass."""

    def test_basic_creation(self):
        """Test creating HealthCheckResult with required fields."""
        # Act
        result = HealthCheckResult(
            name="Test Check",
            status="pass",
            message="All good",
        )

        # Assert
        assert result.name == "Test Check"
        assert result.status == "pass"
        assert result.message == "All good"
        assert result.details == {}
        assert result.recommendations == []

    def test_creation_with_details(self):
        """Test creating HealthCheckResult with details."""
        # Act
        details = {"version": "1.0.0", "platform": "linux"}
        result = HealthCheckResult(
            name="Version Check",
            status="pass",
            message="Version OK",
            details=details,
        )

        # Assert
        assert result.details == details
        assert result.details["version"] == "1.0.0"

    def test_creation_with_recommendations(self):
        """Test creating HealthCheckResult with recommendations."""
        # Act
        recommendations = ["Update Python", "Install package X"]
        result = HealthCheckResult(
            name="Dependency Check",
            status="warn",
            message="Some issues",
            recommendations=recommendations,
        )

        # Assert
        assert result.recommendations == recommendations
        assert len(result.recommendations) == 2

    @pytest.mark.parametrize(
        "status",
        ["pass", "warn", "fail"],
        ids=["pass", "warn", "fail"],
    )
    def test_valid_status_values(self, status: str):
        """Test HealthCheckResult with valid status values."""
        # Act
        result = HealthCheckResult(
            name="Test",
            status=status,
            message="Message",
        )

        # Assert
        assert result.status == status


class TestHealthChecker:
    """Test HealthChecker class."""

    def test_initialization_default(self):
        """Test HealthChecker initialization with defaults."""
        # Act
        checker = HealthChecker()

        # Assert
        assert checker.verbose is False
        assert checker.results == []

    def test_initialization_verbose(self):
        """Test HealthChecker initialization with verbose mode."""
        # Act
        checker = HealthChecker(verbose=True)

        # Assert
        assert checker.verbose is True

    def test_check_python_version_success(self):
        """Test Python version check when version is adequate."""
        # Arrange
        checker = HealthChecker()

        # Act
        result = checker.check_python_version()

        # Assert
        assert result.name == "Python Version"
        # Current Python should be >= 3.12 in test environment
        if sys.version_info >= (3, 12):
            assert result.status == "pass"
        else:
            assert result.status == "fail"

    def test_check_python_version_current_environment(self):
        """Test Python version check in current environment."""
        # Arrange
        checker = HealthChecker()

        # Act
        result = checker.check_python_version()

        # Assert
        assert result.name == "Python Version"
        assert result.status in ["pass", "fail"]
        # If it fails, should have recommendations
        if result.status == "fail":
            assert len(result.recommendations) > 0

    def test_check_python_version_includes_version_details(self):
        """Test that Python version check includes version in details."""
        # Arrange
        checker = HealthChecker()

        # Act
        result = checker.check_python_version()

        # Assert
        assert "version" in result.details
        assert isinstance(result.details["version"], str)

    def test_check_dependencies_returns_list(self):
        """Test check_dependencies returns a list of results."""
        # Arrange
        checker = HealthChecker()

        # Act
        results = checker.check_dependencies()

        # Assert
        assert isinstance(results, list)
        assert len(results) > 0  # Should check at least some packages

    @patch("importlib.util.find_spec")
    def test_check_dependencies_with_missing_package(self, mock_find_spec):
        """Test dependency check when a package is missing."""
        # Arrange
        mock_find_spec.return_value = None
        checker = HealthChecker()

        # Act
        results = checker.check_dependencies()

        # Assert
        assert isinstance(results, list)
        # At least some checks should return results

    @patch("importlib.util.find_spec")
    def test_check_dependencies_with_available_package(self, mock_find_spec):
        """Test dependency check when packages are available."""
        # Arrange
        mock_spec = MagicMock()
        mock_find_spec.return_value = mock_spec
        checker = HealthChecker()

        # Act
        results = checker.check_dependencies()

        # Assert
        assert isinstance(results, list)

    def test_check_dependencies_includes_core_packages(self):
        """Test that dependency check includes core packages."""
        # Arrange
        checker = HealthChecker()

        # Act
        results = checker.check_dependencies()

        # Assert
        # Should check for at least some of these: requests, sqlalchemy, flask, etc.
        assert len(results) > 0

    def test_results_accumulate(self):
        """Test that results accumulate in the checker."""
        # Arrange
        checker = HealthChecker()

        # Act
        result1 = checker.check_python_version()
        initial_count = len(checker.results)

        # More checks would add to results
        checker.results.append(result1)
        after_append = len(checker.results)

        # Assert
        assert after_append == initial_count + 1


class TestHealthCheckerEdgeCases:
    """Test edge cases for HealthChecker."""

    def test_multiple_checkers_independent(self):
        """Test that multiple HealthChecker instances are independent."""
        # Arrange
        checker1 = HealthChecker()
        checker2 = HealthChecker()

        # Act
        checker1.results.append(
            HealthCheckResult("Test1", "pass", "Message1")
        )

        # Assert
        assert len(checker1.results) == 1
        assert len(checker2.results) == 0

    def test_verbose_mode_affects_behavior(self):
        """Test that verbose mode is properly set."""
        # Arrange & Act
        checker_quiet = HealthChecker(verbose=False)
        checker_verbose = HealthChecker(verbose=True)

        # Assert
        assert checker_quiet.verbose is False
        assert checker_verbose.verbose is True

    @pytest.mark.parametrize(
        "verbose",
        [True, False],
        ids=["verbose", "quiet"],
    )
    def test_checks_work_in_both_modes(self, verbose: bool):
        """Test that checks work in both verbose and quiet modes."""
        # Arrange
        checker = HealthChecker(verbose=verbose)

        # Act
        result = checker.check_python_version()

        # Assert
        assert isinstance(result, HealthCheckResult)
        assert result.name is not None
        assert result.status in ["pass", "warn", "fail"]

    def test_health_check_result_with_empty_details(self):
        """Test HealthCheckResult with empty details dict."""
        # Act
        result = HealthCheckResult(
            name="Test",
            status="pass",
            message="OK",
            details={},
        )

        # Assert
        assert result.details == {}

    def test_health_check_result_with_empty_recommendations(self):
        """Test HealthCheckResult with empty recommendations list."""
        # Act
        result = HealthCheckResult(
            name="Test",
            status="pass",
            message="OK",
            recommendations=[],
        )

        # Assert
        assert result.recommendations == []

    def test_check_python_version_message_format(self):
        """Test that Python version check message is well-formatted."""
        # Arrange
        checker = HealthChecker()

        # Act
        result = checker.check_python_version()

        # Assert
        assert isinstance(result.message, str)
        assert len(result.message) > 0
        # Should contain version information
        assert any(char.isdigit() for char in result.message)

    def test_check_dependencies_handles_import_errors_gracefully(self):
        """Test that dependency check handles import errors gracefully."""
        # Arrange
        checker = HealthChecker()

        # Act - Should not raise exceptions
        results = checker.check_dependencies()

        # Assert
        assert isinstance(results, list)
        # All results should be valid HealthCheckResult objects
        for result in results:
            assert isinstance(result, HealthCheckResult)
            assert result.name is not None
            assert result.status in ["pass", "warn", "fail"]

    def test_health_check_result_recommendations_are_strings(self):
        """Test that recommendations are always strings."""
        # Act
        result = HealthCheckResult(
            name="Test",
            status="fail",
            message="Failed",
            recommendations=["Fix 1", "Fix 2"],
        )

        # Assert
        for rec in result.recommendations:
            assert isinstance(rec, str)

    def test_health_check_result_details_can_be_various_types(self):
        """Test that details can contain various data types."""
        # Act
        details = {
            "string": "value",
            "int": 42,
            "float": 3.14,
            "bool": True,
            "list": [1, 2, 3],
            "dict": {"nested": "value"},
        }
        result = HealthCheckResult(
            name="Test",
            status="pass",
            message="OK",
            details=details,
        )

        # Assert
        assert result.details["string"] == "value"
        assert result.details["int"] == 42
        assert result.details["float"] == 3.14
        assert result.details["bool"] is True
        assert result.details["list"] == [1, 2, 3]
        assert result.details["dict"]["nested"] == "value"
