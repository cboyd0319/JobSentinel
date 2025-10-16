"""Comprehensive tests for cloud.bootstrap module.

Tests CLI argument parsing, version reading, provider selection, and deployment orchestration.
Follows PyTest Architect Agent best practices for deterministic, isolated testing.
"""

from __future__ import annotations

import argparse
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Import module under test
import bootstrap


class TestGetVersion:
    """Test version reading from pyproject.toml."""

    def test_get_version_reads_from_pyproject(self, tmp_path, monkeypatch):
        """Should read version from pyproject.toml in project root."""
        # Arrange
        pyproject_content = b"""
[project]
name = "test"
version = "1.2.3"
"""
        pyproject = tmp_path / "pyproject.toml"
        pyproject.write_bytes(pyproject_content)
        
        # Mock project_root
        monkeypatch.setattr("bootstrap.project_root", tmp_path)
        
        # Act
        version = bootstrap.get_version()
        
        # Assert
        assert version == "1.2.3"

    def test_get_version_returns_unknown_on_missing_file(self, tmp_path, monkeypatch):
        """Should return 'unknown' when pyproject.toml doesn't exist."""
        # Arrange - set project_root to empty directory
        monkeypatch.setattr("bootstrap.project_root", tmp_path)
        
        # Act
        version = bootstrap.get_version()
        
        # Assert
        assert version == "unknown"

    def test_get_version_returns_unknown_on_missing_version_key(self, tmp_path, monkeypatch):
        """Should return 'unknown' when version key is missing from pyproject.toml."""
        # Arrange
        pyproject_content = b"""
[project]
name = "test"
"""
        pyproject = tmp_path / "pyproject.toml"
        pyproject.write_bytes(pyproject_content)
        
        monkeypatch.setattr("bootstrap.project_root", tmp_path)
        
        # Act
        version = bootstrap.get_version()
        
        # Assert
        assert version == "unknown"

    def test_get_version_returns_unknown_on_malformed_toml(self, tmp_path, monkeypatch):
        """Should return 'unknown' when pyproject.toml is malformed."""
        # Arrange
        pyproject = tmp_path / "pyproject.toml"
        pyproject.write_text("invalid toml content {{{")
        
        monkeypatch.setattr("bootstrap.project_root", tmp_path)
        
        # Act
        version = bootstrap.get_version()
        
        # Assert
        assert version == "unknown"


class TestParseArgs:
    """Test command-line argument parsing."""

    def test_parse_args_default_values(self, monkeypatch):
        """Should use default values when no arguments provided."""
        # Arrange
        monkeypatch.setattr("sys.argv", ["bootstrap"])
        
        # Act
        args = bootstrap.parse_args()
        
        # Assert
        assert args.provider == "gcp"
        assert args.log_level == "info"
        assert args.no_prompt is False
        assert args.yes is False
        assert args.dry_run is False

    @pytest.mark.parametrize(
        "provider",
        ["gcp", "aws", "azure"],
        ids=["gcp", "aws", "azure"]
    )
    def test_parse_args_valid_providers(self, provider, monkeypatch):
        """Should accept all valid provider choices."""
        # Arrange
        monkeypatch.setattr("sys.argv", ["bootstrap", "--provider", provider])
        
        # Act
        args = bootstrap.parse_args()
        
        # Assert
        assert args.provider == provider

    def test_parse_args_invalid_provider_raises(self, monkeypatch):
        """Should raise SystemExit for invalid provider."""
        # Arrange
        monkeypatch.setattr("sys.argv", ["bootstrap", "--provider", "invalid"])
        
        # Act & Assert
        with pytest.raises(SystemExit):
            bootstrap.parse_args()

    @pytest.mark.parametrize(
        "level",
        ["debug", "info", "warning", "error"],
        ids=["debug", "info", "warning", "error"]
    )
    def test_parse_args_valid_log_levels(self, level, monkeypatch):
        """Should accept all valid log level choices."""
        # Arrange
        monkeypatch.setattr("sys.argv", ["bootstrap", "--log-level", level])
        
        # Act
        args = bootstrap.parse_args()
        
        # Assert
        assert args.log_level == level

    def test_parse_args_no_prompt_flag(self, monkeypatch):
        """Should set no_prompt to True when flag provided."""
        # Arrange
        monkeypatch.setattr("sys.argv", ["bootstrap", "--no-prompt"])
        
        # Act
        args = bootstrap.parse_args()
        
        # Assert
        assert args.no_prompt is True

    def test_parse_args_yes_flag(self, monkeypatch):
        """Should set yes to True when flag provided."""
        # Arrange
        monkeypatch.setattr("sys.argv", ["bootstrap", "--yes"])
        
        # Act
        args = bootstrap.parse_args()
        
        # Assert
        assert args.yes is True

    def test_parse_args_yes_short_flag(self, monkeypatch):
        """Should accept -y as short form of --yes."""
        # Arrange
        monkeypatch.setattr("sys.argv", ["bootstrap", "-y"])
        
        # Act
        args = bootstrap.parse_args()
        
        # Assert
        assert args.yes is True

    def test_parse_args_dry_run_flag(self, monkeypatch):
        """Should set dry_run to True when flag provided."""
        # Arrange
        monkeypatch.setattr("sys.argv", ["bootstrap", "--dry-run"])
        
        # Act
        args = bootstrap.parse_args()
        
        # Assert
        assert args.dry_run is True

    def test_parse_args_combined_flags(self, monkeypatch):
        """Should handle multiple flags combined."""
        # Arrange
        monkeypatch.setattr("sys.argv", [
            "bootstrap",
            "--provider", "gcp",
            "--log-level", "debug",
            "--no-prompt",
            "--yes",
            "--dry-run"
        ])
        
        # Act
        args = bootstrap.parse_args()
        
        # Assert
        assert args.provider == "gcp"
        assert args.log_level == "debug"
        assert args.no_prompt is True
        assert args.yes is True
        assert args.dry_run is True


class TestDeployGCP:
    """Test GCP deployment orchestration."""

    @pytest.fixture
    def mock_gcp_bootstrap(self):
        """Mock GCPBootstrap class for testing."""
        import sys
        import types
        
        mock_bootstrap = AsyncMock()
        mock_bootstrap.run = AsyncMock()
        mock_bootstrap.project_id = "test-project-123"
        mock_bootstrap.region = "us-central1"
        
        # Create mock module
        mock_gcp_module = types.ModuleType("gcp")
        mock_gcp_module.GCPBootstrap = MagicMock(return_value=mock_bootstrap)
        sys.modules["cloud.providers.gcp.gcp"] = mock_gcp_module
        
        yield mock_bootstrap, mock_gcp_module.GCPBootstrap
        
        # Cleanup
        if "cloud.providers.gcp.gcp" in sys.modules:
            del sys.modules["cloud.providers.gcp.gcp"]

    @pytest.mark.asyncio
    async def test_deploy_gcp_success(self, mocker, mock_gcp_bootstrap):
        """Should complete GCP deployment successfully."""
        # Arrange
        mock_logger = MagicMock()
        mock_bootstrap, _ = mock_gcp_bootstrap
        
        mocker.patch("cloud.receipt.print_receipt")
        mocker.patch("cloud.receipt.save_receipt", return_value="receipt.json")
        
        # Act
        result = await bootstrap.deploy_gcp(mock_logger, no_prompt=False)
        
        # Assert
        assert result == 0
        mock_bootstrap.run.assert_called_once()
        mock_logger.info.assert_any_call("Starting GCP deployment...")

    @pytest.mark.asyncio
    async def test_deploy_gcp_dry_run(self, mock_gcp_bootstrap):
        """Should complete dry run without applying changes."""
        # Arrange
        mock_logger = MagicMock()
        mock_bootstrap, _ = mock_gcp_bootstrap
        
        # Act
        result = await bootstrap.deploy_gcp(mock_logger, no_prompt=False, dry_run=True)
        
        # Assert
        assert result == 0
        mock_bootstrap.run.assert_called_once()
        mock_logger.info.assert_any_call(
            "[OK] Dry run completed successfully. No changes were applied."
        )

    @pytest.mark.asyncio
    async def test_deploy_gcp_quota_exceeded_error(self):
        """Should handle quota exceeded errors gracefully."""
        # Arrange
        from exceptions import QuotaExceededError
        import sys
        import types
        
        mock_logger = MagicMock()
        mock_bootstrap = AsyncMock()
        mock_bootstrap.run = AsyncMock(side_effect=QuotaExceededError("Quota exceeded"))
        
        # Mock the GCP module
        mock_gcp_module = types.ModuleType("gcp")
        mock_gcp_module.GCPBootstrap = MagicMock(return_value=mock_bootstrap)
        sys.modules["cloud.providers.gcp.gcp"] = mock_gcp_module
        
        # Act
        result = await bootstrap.deploy_gcp(mock_logger)
        
        # Assert
        assert result == 1
        mock_logger.error.assert_called()
        
        # Cleanup
        del sys.modules["cloud.providers.gcp.gcp"]

    @pytest.mark.asyncio
    async def test_deploy_gcp_generic_exception(self):
        """Should handle generic exceptions with error code 1."""
        # Arrange
        import sys
        import types
        
        mock_logger = MagicMock()
        mock_bootstrap = AsyncMock()
        mock_bootstrap.run = AsyncMock(side_effect=Exception("Generic error"))
        
        # Mock the GCP module
        mock_gcp_module = types.ModuleType("gcp")
        mock_gcp_module.GCPBootstrap = MagicMock(return_value=mock_bootstrap)
        sys.modules["cloud.providers.gcp.gcp"] = mock_gcp_module
        
        # Act
        result = await bootstrap.deploy_gcp(mock_logger)
        
        # Assert
        assert result == 1
        mock_logger.error.assert_called()
        
        # Cleanup
        del sys.modules["cloud.providers.gcp.gcp"]

    @pytest.mark.asyncio
    async def test_deploy_gcp_calls_print_receipt_with_console(self, mocker, mock_gcp_bootstrap):
        """Should call print_receipt when console provided and deployment succeeds."""
        # Arrange
        mock_logger = MagicMock()
        mock_console = MagicMock()
        mock_bootstrap, _ = mock_gcp_bootstrap
        
        mock_print_receipt = mocker.patch("cloud.receipt.print_receipt")
        mocker.patch("cloud.receipt.save_receipt", return_value="receipt.json")
        
        # Act
        await bootstrap.deploy_gcp(mock_logger, no_prompt=False, console=mock_console)
        
        # Assert
        mock_print_receipt.assert_called_once()
        call_kwargs = mock_print_receipt.call_args[1]
        assert call_kwargs["console"] == mock_console
        assert call_kwargs["project_id"] == "test-project-123"
        assert call_kwargs["region"] == "us-central1"

    @pytest.mark.asyncio
    async def test_deploy_gcp_skips_receipt_without_console(self, mocker, mock_gcp_bootstrap):
        """Should not call print_receipt when console not provided."""
        # Arrange
        mock_logger = MagicMock()
        mock_bootstrap, _ = mock_gcp_bootstrap
        
        mock_print_receipt = mocker.patch("cloud.receipt.print_receipt")
        mocker.patch("cloud.receipt.save_receipt", return_value="receipt.json")
        
        # Act
        await bootstrap.deploy_gcp(mock_logger, no_prompt=False, console=None)
        
        # Assert
        mock_print_receipt.assert_not_called()

    @pytest.mark.asyncio
    async def test_deploy_gcp_passes_no_prompt_to_bootstrap(self, mocker, mock_gcp_bootstrap):
        """Should pass no_prompt flag to GCPBootstrap constructor."""
        # Arrange
        mock_logger = MagicMock()
        mock_bootstrap, mock_gcp_bootstrap_class = mock_gcp_bootstrap
        
        mocker.patch("cloud.receipt.save_receipt", return_value="receipt.json")
        
        # Act
        await bootstrap.deploy_gcp(mock_logger, no_prompt=True)
        
        # Assert
        mock_gcp_bootstrap_class.assert_called_once_with(
            mock_logger, no_prompt=True, dry_run=False
        )
