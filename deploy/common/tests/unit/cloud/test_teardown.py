"""Comprehensive tests for cloud.common.teardown module.

Tests CLI argument parsing and main async function for infrastructure teardown.
"""

import argparse
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Module path is handled in conftest.py
# Mock the GCP teardown module before importing
import sys

sys.modules["cloud.providers.gcp.teardown"] = MagicMock()

from teardown import MIN_PYTHON, main, parse_args


class TestParseArgs:
    """Test argument parsing."""

    def test_parse_args_minimal(self):
        """Parse minimal required arguments."""
        args = parse_args(["--project-id", "test-project"])

        assert args.project_id == "test-project"
        assert args.provider == "gcp"  # default
        assert args.dry_run is False  # default

    def test_parse_args_with_provider(self):
        """Parse with explicit provider."""
        args = parse_args(["--project-id", "test-project", "--provider", "gcp"])

        assert args.project_id == "test-project"
        assert args.provider == "gcp"

    def test_parse_args_with_dry_run(self):
        """Parse with dry-run flag."""
        args = parse_args(["--project-id", "test-project", "--dry-run"])

        assert args.project_id == "test-project"
        assert args.dry_run is True

    def test_parse_args_all_options(self):
        """Parse with all options specified."""
        args = parse_args([
            "--project-id", "my-project",
            "--provider", "gcp",
            "--dry-run",
        ])

        assert args.project_id == "my-project"
        assert args.provider == "gcp"
        assert args.dry_run is True

    def test_parse_args_missing_project_id(self):
        """Missing required project-id should raise error."""
        with pytest.raises(SystemExit):
            parse_args([])

    def test_parse_args_invalid_provider(self):
        """Invalid provider should raise error."""
        with pytest.raises(SystemExit):
            parse_args(["--project-id", "test", "--provider", "invalid"])

    @pytest.mark.parametrize(
        "project_id",
        [
            "simple-project",
            "my-test-project-123",
            "proj-with-dashes",
        ],
        ids=["simple", "with-numbers", "with-dashes"],
    )
    def test_parse_args_various_project_ids(self, project_id):
        """Parse various valid project ID formats."""
        args = parse_args(["--project-id", project_id])

        assert args.project_id == project_id

    def test_parse_args_returns_namespace(self):
        """parse_args should return argparse.Namespace."""
        args = parse_args(["--project-id", "test"])

        assert isinstance(args, argparse.Namespace)

    def test_parse_args_provider_choices(self):
        """Only GCP provider should be accepted."""
        # Valid choice
        args = parse_args(["--project-id", "test", "--provider", "gcp"])
        assert args.provider == "gcp"

        # Invalid choices should fail
        for invalid in ["aws", "azure", "digitalocean"]:
            with pytest.raises(SystemExit):
                parse_args(["--project-id", "test", "--provider", invalid])


class TestMain:
    """Test main async function."""

    @pytest.mark.asyncio
    async def test_main_minimal(self, mocker):
        """Main should work with minimal arguments."""
        mock_ensure_python = mocker.patch("teardown.ensure_python_version")
        mock_gcp_teardown_class = mocker.patch("teardown.GCPTeardown")
        mock_teardown_instance = MagicMock()
        mock_teardown_instance.run = AsyncMock()
        mock_gcp_teardown_class.return_value = mock_teardown_instance

        result = await main(["--project-id", "test-project"])

        assert result == 0
        mock_ensure_python.assert_called_once_with(MIN_PYTHON)
        mock_gcp_teardown_class.assert_called_once_with("test-project", dry_run=False)
        mock_teardown_instance.run.assert_called_once()

    @pytest.mark.asyncio
    async def test_main_with_dry_run(self, mocker):
        """Main should pass dry_run flag to teardown."""
        mock_ensure_python = mocker.patch("teardown.ensure_python_version")
        mock_gcp_teardown_class = mocker.patch("teardown.GCPTeardown")
        mock_teardown_instance = MagicMock()
        mock_teardown_instance.run = AsyncMock()
        mock_gcp_teardown_class.return_value = mock_teardown_instance

        result = await main(["--project-id", "test-project", "--dry-run"])

        assert result == 0
        mock_gcp_teardown_class.assert_called_once_with("test-project", dry_run=True)

    @pytest.mark.asyncio
    async def test_main_checks_python_version(self, mocker):
        """Main should check Python version before proceeding."""
        mock_ensure_python = mocker.patch("teardown.ensure_python_version")
        mock_gcp_teardown_class = mocker.patch("teardown.GCPTeardown")
        mock_teardown_instance = MagicMock()
        mock_teardown_instance.run = AsyncMock()
        mock_gcp_teardown_class.return_value = mock_teardown_instance

        await main(["--project-id", "test"])

        # ensure_python_version should be called first
        mock_ensure_python.assert_called_once_with(MIN_PYTHON)
        assert mock_ensure_python.call_count == 1

    @pytest.mark.asyncio
    async def test_main_with_no_argv_uses_sys_argv(self, mocker):
        """Main with no argv should use sys.argv[1:]."""
        mock_ensure_python = mocker.patch("teardown.ensure_python_version")
        mock_gcp_teardown_class = mocker.patch("teardown.GCPTeardown")
        mock_teardown_instance = MagicMock()
        mock_teardown_instance.run = AsyncMock()
        mock_gcp_teardown_class.return_value = mock_teardown_instance

        # Mock sys.argv
        with patch("sys.argv", ["teardown.py", "--project-id", "from-sys-argv"]):
            result = await main(None)

        assert result == 0
        mock_gcp_teardown_class.assert_called_once_with("from-sys-argv", dry_run=False)

    @pytest.mark.asyncio
    async def test_main_returns_zero_on_success(self, mocker):
        """Main should return 0 on successful execution."""
        mocker.patch("teardown.ensure_python_version")
        mock_gcp_teardown_class = mocker.patch("teardown.GCPTeardown")
        mock_teardown_instance = MagicMock()
        mock_teardown_instance.run = AsyncMock()
        mock_gcp_teardown_class.return_value = mock_teardown_instance

        result = await main(["--project-id", "test"])

        assert result == 0

    @pytest.mark.asyncio
    async def test_main_calls_teardown_run(self, mocker):
        """Main should call run() on teardown instance."""
        mocker.patch("teardown.ensure_python_version")
        mock_gcp_teardown_class = mocker.patch("teardown.GCPTeardown")
        mock_teardown_instance = MagicMock()
        mock_teardown_instance.run = AsyncMock()
        mock_gcp_teardown_class.return_value = mock_teardown_instance

        await main(["--project-id", "test"])

        mock_teardown_instance.run.assert_called_once()

    @pytest.mark.asyncio
    async def test_main_with_different_project_ids(self, mocker):
        """Main should handle various project IDs."""
        mocker.patch("teardown.ensure_python_version")
        mock_gcp_teardown_class = mocker.patch("teardown.GCPTeardown")
        mock_teardown_instance = MagicMock()
        mock_teardown_instance.run = AsyncMock()
        mock_gcp_teardown_class.return_value = mock_teardown_instance

        for project_id in ["proj1", "my-test-project", "prod-deployment-123"]:
            mock_gcp_teardown_class.reset_mock()

            await main(["--project-id", project_id])

            mock_gcp_teardown_class.assert_called_once_with(project_id, dry_run=False)


class TestMinPython:
    """Test MIN_PYTHON constant."""

    def test_min_python_is_tuple(self):
        """MIN_PYTHON should be a tuple."""
        assert isinstance(MIN_PYTHON, tuple)

    def test_min_python_format(self):
        """MIN_PYTHON should be (major, minor) format."""
        assert len(MIN_PYTHON) == 2
        assert all(isinstance(x, int) for x in MIN_PYTHON)

    def test_min_python_value(self):
        """MIN_PYTHON should be (3, 12)."""
        assert MIN_PYTHON == (3, 12)

    def test_min_python_reasonable(self):
        """MIN_PYTHON should be a reasonable version."""
        major, minor = MIN_PYTHON
        assert major == 3
        assert 8 <= minor <= 15  # Python 3.8 to 3.15 is reasonable range


class TestArgumentDefaults:
    """Test default argument values."""

    def test_default_provider_is_gcp(self):
        """Default provider should be GCP."""
        args = parse_args(["--project-id", "test"])
        assert args.provider == "gcp"

    def test_default_dry_run_is_false(self):
        """Default dry_run should be False."""
        args = parse_args(["--project-id", "test"])
        assert args.dry_run is False


class TestArgumentValidation:
    """Test argument validation edge cases."""

    def test_parse_args_empty_project_id(self):
        """Empty project ID should be accepted by parser."""
        # Parser doesn't validate emptiness, just requires the argument
        args = parse_args(["--project-id", ""])
        assert args.project_id == ""

    def test_parse_args_help_flag(self):
        """Help flag should exit with SystemExit."""
        with pytest.raises(SystemExit) as exc_info:
            parse_args(["--help"])
        # Help exits with code 0
        assert exc_info.value.code == 0

    def test_parse_args_unknown_flag(self):
        """Unknown flags should raise error."""
        with pytest.raises(SystemExit):
            parse_args(["--project-id", "test", "--unknown-flag"])

    def test_parse_args_duplicate_flags(self):
        """Duplicate flags should use last value."""
        args = parse_args([
            "--project-id", "first",
            "--project-id", "second",
        ])
        # argparse uses the last occurrence
        assert args.project_id == "second"


class TestIntegration:
    """Integration tests."""

    @pytest.mark.asyncio
    async def test_full_teardown_workflow(self, mocker):
        """Test complete teardown workflow."""
        mock_ensure_python = mocker.patch("teardown.ensure_python_version")
        mock_gcp_teardown_class = mocker.patch("teardown.GCPTeardown")
        mock_teardown_instance = MagicMock()
        mock_teardown_instance.run = AsyncMock()
        mock_gcp_teardown_class.return_value = mock_teardown_instance

        # Simulate full command line
        argv = ["--project-id", "production-project", "--dry-run"]
        result = await main(argv)

        # Verify workflow
        assert result == 0
        mock_ensure_python.assert_called_once_with(MIN_PYTHON)
        mock_gcp_teardown_class.assert_called_once_with("production-project", dry_run=True)
        mock_teardown_instance.run.assert_called_once()

    @pytest.mark.asyncio
    async def test_teardown_without_dry_run(self, mocker):
        """Test teardown without dry-run flag."""
        mocker.patch("teardown.ensure_python_version")
        mock_gcp_teardown_class = mocker.patch("teardown.GCPTeardown")
        mock_teardown_instance = MagicMock()
        mock_teardown_instance.run = AsyncMock()
        mock_gcp_teardown_class.return_value = mock_teardown_instance

        await main(["--project-id", "real-delete"])

        # Should be called with dry_run=False
        mock_gcp_teardown_class.assert_called_once_with("real-delete", dry_run=False)
