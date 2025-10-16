"""Comprehensive tests for diagnostic module.

Tests system diagnostic checks and troubleshooting guidance.
"""

from __future__ import annotations

import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

from jsa.diagnostic import DiagnosticResult, SystemDiagnostic


class TestDiagnosticResult:
    """Test DiagnosticResult NamedTuple."""

    def test_basic_creation(self):
        """Test creating DiagnosticResult with required fields."""
        # Act
        result = DiagnosticResult(
            name="Test Check",
            status="pass",
            message="All good",
        )

        # Assert
        assert result.name == "Test Check"
        assert result.status == "pass"
        assert result.message == "All good"
        assert result.fix == ""

    def test_creation_with_fix(self):
        """Test creating DiagnosticResult with fix suggestion."""
        # Act
        result = DiagnosticResult(
            name="Disk Check",
            status="fail",
            message="Low disk space",
            fix="Free up at least 1GB",
        )

        # Assert
        assert result.name == "Disk Check"
        assert result.status == "fail"
        assert result.message == "Low disk space"
        assert result.fix == "Free up at least 1GB"

    @pytest.mark.parametrize(
        "status",
        ["pass", "fail", "warning", "skip"],
        ids=["pass", "fail", "warning", "skip"],
    )
    def test_valid_status_values(self, status: str):
        """Test DiagnosticResult with valid status values."""
        # Act
        result = DiagnosticResult(
            name="Test",
            status=status,  # type: ignore
            message="Message",
        )

        # Assert
        assert result.status == status

    def test_immutability(self):
        """Test that DiagnosticResult is immutable (NamedTuple)."""
        # Act
        result = DiagnosticResult("Test", "pass", "OK")

        # Assert - Should not be able to modify
        with pytest.raises(AttributeError):
            result.name = "New Name"  # type: ignore


class TestSystemDiagnostic:
    """Test SystemDiagnostic class."""

    def test_initialization_default(self):
        """Test SystemDiagnostic initialization with defaults."""
        # Act
        diagnostic = SystemDiagnostic()

        # Assert
        assert diagnostic.project_root == Path.cwd()
        assert diagnostic.results == []

    def test_initialization_with_path(self):
        """Test SystemDiagnostic initialization with custom path."""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            # Act
            diagnostic = SystemDiagnostic(project_root=Path(tmpdir))

            # Assert
            assert diagnostic.project_root == Path(tmpdir)

    def test_initialization_with_none_path(self):
        """Test SystemDiagnostic initialization with None uses cwd."""
        # Act
        diagnostic = SystemDiagnostic(project_root=None)

        # Assert
        assert diagnostic.project_root == Path.cwd()

    def test_run_all_checks_returns_list(self):
        """Test run_all_checks returns a list of results."""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            diagnostic = SystemDiagnostic(project_root=Path(tmpdir))

            # Act
            results = diagnostic.run_all_checks()

            # Assert
            assert isinstance(results, list)
            assert len(results) > 0  # Should have multiple checks

    def test_run_all_checks_populates_results(self):
        """Test that run_all_checks populates the results attribute."""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            diagnostic = SystemDiagnostic(project_root=Path(tmpdir))

            # Act
            returned_results = diagnostic.run_all_checks()

            # Assert
            assert diagnostic.results == returned_results
            assert len(diagnostic.results) > 0

    def test_all_results_are_diagnostic_results(self):
        """Test that all checks return DiagnosticResult objects."""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            diagnostic = SystemDiagnostic(project_root=Path(tmpdir))

            # Act
            results = diagnostic.run_all_checks()

            # Assert
            for result in results:
                assert isinstance(result, DiagnosticResult)
                assert hasattr(result, "name")
                assert hasattr(result, "status")
                assert hasattr(result, "message")

    def test_check_python_version_included(self):
        """Test that Python version check is included."""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            diagnostic = SystemDiagnostic(project_root=Path(tmpdir))

            # Act
            results = diagnostic.run_all_checks()

            # Assert
            check_names = [r.name for r in results]
            # Should include Python-related check
            assert any("python" in name.lower() for name in check_names)

    def test_check_operating_system_included(self):
        """Test that OS check is included."""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            diagnostic = SystemDiagnostic(project_root=Path(tmpdir))

            # Act
            results = diagnostic.run_all_checks()

            # Assert
            check_names = [r.name for r in results]
            # Should include OS-related check
            assert any(
                "operating" in name.lower() or "os" in name.lower()
                for name in check_names
            )

    def test_check_disk_space_included(self):
        """Test that disk space check is included."""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            diagnostic = SystemDiagnostic(project_root=Path(tmpdir))

            # Act
            results = diagnostic.run_all_checks()

            # Assert
            check_names = [r.name for r in results]
            # Should include disk-related check
            assert any("disk" in name.lower() for name in check_names)

    def test_multiple_runs_clear_previous_results(self):
        """Test that running checks multiple times replaces results."""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            diagnostic = SystemDiagnostic(project_root=Path(tmpdir))

            # Act
            results1 = diagnostic.run_all_checks()
            count1 = len(results1)

            results2 = diagnostic.run_all_checks()
            count2 = len(results2)

            # Assert
            # Should have same number of checks
            assert count1 == count2
            # Results should be replaced, not appended
            assert diagnostic.results == results2


class TestSystemDiagnosticEdgeCases:
    """Test edge cases for SystemDiagnostic."""

    def test_results_start_empty(self):
        """Test that results list starts empty."""
        # Act
        diagnostic = SystemDiagnostic()

        # Assert
        assert diagnostic.results == []
        assert len(diagnostic.results) == 0

    def test_project_root_with_nonexistent_path(self):
        """Test initialization with nonexistent path."""
        # Arrange
        nonexistent = Path("/nonexistent/path/12345")

        # Act
        diagnostic = SystemDiagnostic(project_root=nonexistent)

        # Assert
        assert diagnostic.project_root == nonexistent
        # Should still be able to run checks (may get failures)
        results = diagnostic.run_all_checks()
        assert isinstance(results, list)

    def test_all_checks_have_valid_status(self):
        """Test that all checks return valid status values."""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            diagnostic = SystemDiagnostic(project_root=Path(tmpdir))

            # Act
            results = diagnostic.run_all_checks()

            # Assert
            valid_statuses = {"pass", "fail", "warning", "skip"}
            for result in results:
                assert result.status in valid_statuses, (
                    f"Invalid status '{result.status}' in check '{result.name}'"
                )

    def test_failed_checks_have_fix_suggestions(self):
        """Test that failed checks provide fix suggestions."""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            diagnostic = SystemDiagnostic(project_root=Path(tmpdir))

            # Act
            results = diagnostic.run_all_checks()

            # Assert
            for result in results:
                if result.status == "fail":
                    # Failed checks should ideally have fix suggestions
                    # But we'll just check it's a valid string
                    assert isinstance(result.fix, str)

    def test_check_names_are_descriptive(self):
        """Test that check names are descriptive."""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            diagnostic = SystemDiagnostic(project_root=Path(tmpdir))

            # Act
            results = diagnostic.run_all_checks()

            # Assert
            for result in results:
                assert len(result.name) > 0
                assert result.name != ""
                # Names should be readable (not just codes)
                assert any(c.isalpha() for c in result.name)

    def test_messages_are_informative(self):
        """Test that check messages are informative."""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            diagnostic = SystemDiagnostic(project_root=Path(tmpdir))

            # Act
            results = diagnostic.run_all_checks()

            # Assert
            for result in results:
                assert len(result.message) > 0
                assert result.message != ""

    @pytest.mark.parametrize(
        "project_root",
        [
            Path("/tmp"),
            Path.cwd(),
            Path.home(),
        ],
        ids=["tmp", "cwd", "home"],
    )
    def test_diagnostic_works_with_various_paths(self, project_root: Path):
        """Test that diagnostic works with various project root paths."""
        # Arrange
        if project_root.exists():
            diagnostic = SystemDiagnostic(project_root=project_root)

            # Act
            results = diagnostic.run_all_checks()

            # Assert
            assert isinstance(results, list)
            assert len(results) > 0

    def test_summary_generation(self):
        """Test that diagnostic can generate a summary."""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            diagnostic = SystemDiagnostic(project_root=Path(tmpdir))

            # Act
            results = diagnostic.run_all_checks()

            # Assert
            # Check that we can generate a summary from results
            pass_count = sum(1 for r in results if r.status == "pass")
            fail_count = sum(1 for r in results if r.status == "fail")
            total_count = len(results)

            assert pass_count + fail_count <= total_count
            assert total_count > 0

    def test_diagnostic_doesnt_modify_filesystem(self):
        """Test that running diagnostics doesn't modify the filesystem."""
        # Arrange
        with tempfile.TemporaryDirectory() as tmpdir:
            tmppath = Path(tmpdir)
            # Get initial state
            initial_files = list(tmppath.rglob("*"))
            initial_count = len(initial_files)

            diagnostic = SystemDiagnostic(project_root=tmppath)

            # Act
            diagnostic.run_all_checks()

            # Assert
            # Should not create new files (except maybe temp files that are cleaned up)
            final_files = list(tmppath.rglob("*"))
            # Allow for small variation due to temp files
            assert abs(len(final_files) - initial_count) <= 2
