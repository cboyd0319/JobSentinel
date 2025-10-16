"""Comprehensive tests for cloud.common.teardown module.

Tests CLI entrypoint for cloud teardown.
"""

import sys
import types
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# Add cloud/common to path and mock dependencies
_cloud_common_path = (
    Path(__file__).resolve().parent.parent.parent.parent.parent / "cloud" / "common"
)
if str(_cloud_common_path) not in sys.path:
    sys.path.insert(0, str(_cloud_common_path))

# Mock the cloud modules that teardown tries to import using types.ModuleType
if "cloud" not in sys.modules or not isinstance(sys.modules.get("cloud"), types.ModuleType):
    cloud_mock = types.ModuleType("cloud")
    providers_mock = types.ModuleType("cloud.providers")
    gcp_mock = types.ModuleType("cloud.providers.gcp")
    teardown_mock = types.ModuleType("cloud.providers.gcp.teardown")
    utils_mock = types.ModuleType("cloud.utils")
    
    # Add mocked classes/functions
    teardown_mock.GCPTeardown = MagicMock
    utils_mock.ensure_python_version = MagicMock()
    
    sys.modules["cloud"] = cloud_mock
    sys.modules["cloud.providers"] = providers_mock
    sys.modules["cloud.providers.gcp"] = gcp_mock
    sys.modules["cloud.providers.gcp.teardown"] = teardown_mock
    sys.modules["cloud.utils"] = utils_mock

from teardown import main, parse_args


class TestParseArgs:
    """Test the parse_args function."""

    def test_parse_args_required_project_id(self):
        """parse_args should require --project-id argument."""
        with pytest.raises(SystemExit):
            parse_args([])

    def test_parse_args_with_project_id(self):
        """parse_args should parse --project-id argument."""
        args = parse_args(["--project-id", "my-project"])
        assert args.project_id == "my-project"

    def test_parse_args_default_provider(self):
        """parse_args should default provider to 'gcp'."""
        args = parse_args(["--project-id", "my-project"])
        assert args.provider == "gcp"

    def test_parse_args_explicit_provider(self):
        """parse_args should accept explicit --provider argument."""
        args = parse_args(["--project-id", "my-project", "--provider", "gcp"])
        assert args.provider == "gcp"

    def test_parse_args_dry_run_default_false(self):
        """parse_args should default dry-run to False."""
        args = parse_args(["--project-id", "my-project"])
        assert args.dry_run is False

    def test_parse_args_dry_run_flag(self):
        """parse_args should parse --dry-run flag."""
        args = parse_args(["--project-id", "my-project", "--dry-run"])
        assert args.dry_run is True

    @pytest.mark.parametrize(
        "project_id",
        ["simple-project", "project-with-dashes", "project123"],
        ids=["simple", "dashes", "numbers"],
    )
    def test_parse_args_various_project_ids(self, project_id):
        """parse_args should handle various project ID formats."""
        args = parse_args(["--project-id", project_id])
        assert args.project_id == project_id

    def test_parse_args_all_options(self):
        """parse_args should handle all options together."""
        args = parse_args(
            [
                "--project-id",
                "test-project",
                "--provider",
                "gcp",
                "--dry-run",
            ]
        )
        assert args.project_id == "test-project"
        assert args.provider == "gcp"
        assert args.dry_run is True


class TestMain:
    """Test the main async function."""

    @pytest.mark.asyncio
    async def test_main_basic(self, mocker):
        """main should execute teardown successfully."""
        mock_teardown_class = mocker.patch("teardown.GCPTeardown")
        mock_teardown = MagicMock()
        mock_teardown.run = AsyncMock()
        mock_teardown_class.return_value = mock_teardown

        result = await main(["--project-id", "test-project"])

        assert result == 0
        mock_teardown_class.assert_called_once_with("test-project", dry_run=False)
        mock_teardown.run.assert_called_once()

    @pytest.mark.asyncio
    async def test_main_with_dry_run(self, mocker):
        """main should pass dry_run flag to GCPTeardown."""
        mock_teardown_class = mocker.patch("teardown.GCPTeardown")
        mock_teardown = MagicMock()
        mock_teardown.run = AsyncMock()
        mock_teardown_class.return_value = mock_teardown

        result = await main(["--project-id", "test-project", "--dry-run"])

        assert result == 0
        mock_teardown_class.assert_called_once_with("test-project", dry_run=True)

    @pytest.mark.asyncio
    async def test_main_calls_ensure_python_version(self, mocker):
        """main should check Python version."""
        mock_ensure = mocker.patch("teardown.ensure_python_version")
        mock_teardown_class = mocker.patch("teardown.GCPTeardown")
        mock_teardown = MagicMock()
        mock_teardown.run = AsyncMock()
        mock_teardown_class.return_value = mock_teardown

        await main(["--project-id", "test-project"])

        mock_ensure.assert_called_once_with((3, 12))

    @pytest.mark.asyncio
    async def test_main_uses_sys_argv_by_default(self, mocker):
        """main should use sys.argv when argv is None."""
        mock_teardown_class = mocker.patch("teardown.GCPTeardown")
        mock_teardown = MagicMock()
        mock_teardown.run = AsyncMock()
        mock_teardown_class.return_value = mock_teardown

        mocker.patch("sys.argv", ["teardown.py", "--project-id", "test-project"])

        result = await main(None)

        assert result == 0
        mock_teardown_class.assert_called_once()

    @pytest.mark.asyncio
    async def test_main_returns_zero_on_success(self, mocker):
        """main should return 0 on successful teardown."""
        mock_teardown_class = mocker.patch("teardown.GCPTeardown")
        mock_teardown = MagicMock()
        mock_teardown.run = AsyncMock()
        mock_teardown_class.return_value = mock_teardown

        result = await main(["--project-id", "test-project"])

        assert result == 0

    @pytest.mark.asyncio
    @pytest.mark.parametrize(
        "project_id",
        ["simple-project", "project-with-dashes", "prod-123"],
        ids=["simple", "dashes", "numbers"],
    )
    async def test_main_various_project_ids(self, project_id, mocker):
        """main should handle various project ID formats."""
        mock_teardown_class = mocker.patch("teardown.GCPTeardown")
        mock_teardown = MagicMock()
        mock_teardown.run = AsyncMock()
        mock_teardown_class.return_value = mock_teardown

        result = await main(["--project-id", project_id])

        assert result == 0
        mock_teardown_class.assert_called_once_with(project_id, dry_run=False)


class TestMinPythonConstant:
    """Test the MIN_PYTHON constant."""

    def test_min_python_is_tuple(self):
        """MIN_PYTHON should be a tuple."""
        from teardown import MIN_PYTHON

        assert isinstance(MIN_PYTHON, tuple)

    def test_min_python_value(self):
        """MIN_PYTHON should be (3, 12)."""
        from teardown import MIN_PYTHON

        assert MIN_PYTHON == (3, 12)

    def test_min_python_has_two_elements(self):
        """MIN_PYTHON should have major and minor version."""
        from teardown import MIN_PYTHON

        assert len(MIN_PYTHON) == 2


class TestModuleStructure:
    """Test overall module structure."""

    def test_module_has_main_function(self):
        """Module should export main function."""
        import teardown

        assert hasattr(teardown, "main")
        assert callable(teardown.main)

    def test_module_has_parse_args_function(self):
        """Module should export parse_args function."""
        import teardown

        assert hasattr(teardown, "parse_args")
        assert callable(teardown.parse_args)

    def test_main_is_async(self):
        """main function should be async."""
        import asyncio
        import inspect

        import teardown

        assert asyncio.iscoroutinefunction(teardown.main)


class TestArgumentValidation:
    """Test argument validation and edge cases."""

    def test_parse_args_help_flag(self):
        """parse_args should support --help flag."""
        with pytest.raises(SystemExit) as exc_info:
            parse_args(["--help"])
        # Help should exit with code 0
        assert exc_info.value.code == 0

    def test_parse_args_invalid_provider(self):
        """parse_args should reject invalid provider."""
        with pytest.raises(SystemExit):
            parse_args(["--project-id", "test", "--provider", "invalid"])

    def test_parse_args_empty_project_id(self):
        """parse_args should accept empty string project ID (validation happens elsewhere)."""
        args = parse_args(["--project-id", ""])
        assert args.project_id == ""

    def test_parse_args_multiple_flags(self):
        """parse_args should handle multiple flags."""
        args = parse_args(["--dry-run", "--project-id", "test"])
        assert args.project_id == "test"
        assert args.dry_run is True


class TestIntegration:
    """Test integration scenarios."""

    @pytest.mark.asyncio
    async def test_full_teardown_workflow(self, mocker):
        """Test full teardown workflow from parsing to execution."""
        mock_teardown_class = mocker.patch("teardown.GCPTeardown")
        mock_teardown = MagicMock()
        mock_teardown.run = AsyncMock()
        mock_teardown_class.return_value = mock_teardown
        mocker.patch("teardown.ensure_python_version")

        # Parse arguments
        argv = ["--project-id", "test-project", "--dry-run"]

        # Run main
        result = await main(argv)

        # Verify full workflow
        assert result == 0
        mock_teardown_class.assert_called_once_with("test-project", dry_run=True)
        mock_teardown.run.assert_called_once()

    @pytest.mark.asyncio
    async def test_teardown_with_gcp_provider(self, mocker):
        """Test teardown explicitly using GCP provider."""
        mock_teardown_class = mocker.patch("teardown.GCPTeardown")
        mock_teardown = MagicMock()
        mock_teardown.run = AsyncMock()
        mock_teardown_class.return_value = mock_teardown

        result = await main(["--project-id", "test", "--provider", "gcp"])

        assert result == 0
        mock_teardown_class.assert_called_once()
