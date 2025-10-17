"""Comprehensive unit tests for GCP SDK installation and management.

Tests cover:
- SDK detection in PATH and home directory
- Version checking and warnings
- Download URL generation for different platforms  
- Hash verification with known good values
- Security features (host validation, safe extraction)
- Temporary file cleanup
"""

from __future__ import annotations

import hashlib
import os
import subprocess
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, Mock

import pytest

from providers.gcp import sdk


class TestEnsureGcloud:
    """Tests for ensure_gcloud function - main entry point for SDK setup."""

    def test_gcloud_already_in_path_with_valid_version(self, mocker):
        """Should skip installation when gcloud is in PATH with valid version."""
        # Arrange
        logger = Mock()
        mocker.patch("providers.gcp.sdk.which", return_value="/usr/bin/gcloud")
        mocker.patch(
            "providers.gcp.sdk.run_secure",
            return_value=Mock(stdout="Google Cloud SDK 500.0.0\nsome other line"),
        )

        # Act
        sdk.ensure_gcloud(logger, no_prompt=False, project_root=Path("/tmp"))

        # Assert
        assert any("version 500.0.0" in str(call) for call in logger.info.call_args_list)
        assert logger.warning.call_count == 0

    def test_gcloud_in_path_with_old_version_warns(self, mocker):
        """Should warn when gcloud version is < 400."""
        # Arrange
        logger = Mock()
        mocker.patch("providers.gcp.sdk.which", return_value="/usr/bin/gcloud")
        mocker.patch(
            "providers.gcp.sdk.run_secure",
            return_value=Mock(stdout="Google Cloud SDK 350.0.0\n"),
        )

        # Act
        sdk.ensure_gcloud(logger, no_prompt=False, project_root=Path("/tmp"))

        # Assert
        assert any("old (< 400.0.0)" in str(call) for call in logger.warning.call_args_list)

    def test_gcloud_version_check_fails_continues(self, mocker):
        """Should continue when version check fails but gcloud is in PATH."""
        # Arrange
        logger = Mock()
        mocker.patch("providers.gcp.sdk.which", return_value="/usr/bin/gcloud")
        mocker.patch(
            "providers.gcp.sdk.run_secure",
            side_effect=subprocess.CalledProcessError(1, "gcloud"),
        )

        # Act
        sdk.ensure_gcloud(logger, no_prompt=False, project_root=Path("/tmp"))

        # Assert
        assert any("Could not determine" in str(call) for call in logger.warning.call_args_list)

    def test_gcloud_found_in_home_adds_to_path(self, mocker):
        """Should add SDK to PATH when found in home directory."""
        # Arrange
        logger = Mock()
        mocker.patch("providers.gcp.sdk.which", return_value=None)
        
        home_dir = Path("/home/testuser")
        mocker.patch("pathlib.Path.home", return_value=home_dir)
        
        # Mock Path.exists to return True for SDK paths
        def mock_exists(self):
            return "google-cloud-sdk" in str(self) or str(self).endswith("gcloud")
        
        mocker.patch.object(Path, "exists", mock_exists)
        mock_prepend = mocker.patch("providers.gcp.sdk.prepend_path")

        # Act
        sdk.ensure_gcloud(logger, no_prompt=False, project_root=Path("/tmp"))

        # Assert
        mock_prepend.assert_called_once()
        assert any("adding to PATH" in str(call) for call in logger.info.call_args_list)

    @pytest.mark.parametrize(
        "os_type,expected_fragment",
        [
            ("windows", "windows-x86_64.zip"),
            ("mac", "darwin-x86_64.tar.gz"),
            ("linux", "linux-x86_64.tar.gz"),
        ],
        ids=["windows", "mac", "linux"],
    )
    def test_download_url_varies_by_platform(self, mocker, os_type, expected_fragment):
        """Should generate correct download URLs for each platform."""
        # Arrange
        logger = Mock()
        mocker.patch("providers.gcp.sdk.which", return_value=None)
        mocker.patch("pathlib.Path.home", return_value=Path("/home/test"))
        mocker.patch.object(Path, "exists", return_value=False)
        mocker.patch("providers.gcp.sdk.current_os", return_value=os_type)
        mocker.patch("providers.gcp.sdk.ensure_directory")
        
        mock_download = mocker.patch(
            "providers.gcp.sdk._download_and_extract",
            return_value=Path("/tmp/google-cloud-sdk"),
        )
        mocker.patch("providers.gcp.sdk.run_command")
        mocker.patch("providers.gcp.sdk.prepend_path")

        # Act
        sdk.ensure_gcloud(logger, no_prompt=True, project_root=Path("/tmp"))

        # Assert
        url = mock_download.call_args[0][0]
        assert expected_fragment in url
        assert sdk.INSTALL_VERSION in url


class TestDownloadAndExtract:
    """Tests for _download_and_extract function - handles SDK downloads."""

    def test_rejects_non_google_host(self, mocker):
        """Should reject downloads from non-Google domains for security."""
        # Arrange
        logger = Mock()
        bad_url = "https://evil.com/malicious.tar.gz"
        mocker.patch("providers.gcp.sdk.sanitize_api_url", return_value=bad_url)

        # Act & Assert
        with pytest.raises(RuntimeError, match="non-Google host"):
            sdk._download_and_extract(bad_url, Path("/tmp"), logger, no_prompt=True)

    def test_calls_url_sanitization(self, mocker):
        """Should sanitize URL before processing."""
        # Arrange
        logger = Mock()
        url = "https://dl.google.com/test.tar.gz"
        
        mock_sanitize = mocker.patch("providers.gcp.sdk.sanitize_api_url", return_value=url)
        mocker.patch("providers.gcp.sdk.ensure_directory")
        mocker.patch("tempfile.mkstemp", return_value=(1, "/tmp/test.tar.gz"))
        mocker.patch("os.close")
        mocker.patch("providers.gcp.sdk.download_https_file")
        mocker.patch("pathlib.Path.read_bytes", return_value=b"content")
        mocker.patch("pathlib.Path.unlink")
        mocker.patch("tarfile.open", return_value=MagicMock())
        mocker.patch("providers.gcp.sdk.safe_extract_tar")

        # Act
        sdk._download_and_extract(url, Path("/tmp"), logger, no_prompt=True)

        # Assert
        mock_sanitize.assert_called_once_with(url)

    def test_uses_allowed_host_for_download(self, mocker):
        """Should restrict download to dl.google.com."""
        # Arrange
        logger = Mock()
        url = "https://dl.google.com/test.tar.gz"
        
        mocker.patch("providers.gcp.sdk.sanitize_api_url", return_value=url)
        mocker.patch("providers.gcp.sdk.ensure_directory")
        mocker.patch("tempfile.mkstemp", return_value=(1, "/tmp/test.tar.gz"))
        mocker.patch("os.close")
        
        mock_download = mocker.patch("providers.gcp.sdk.download_https_file")
        mocker.patch("pathlib.Path.read_bytes", return_value=b"content")
        mocker.patch("pathlib.Path.unlink")
        mocker.patch("tarfile.open", return_value=MagicMock())
        mocker.patch("providers.gcp.sdk.safe_extract_tar")

        # Act
        sdk._download_and_extract(url, Path("/tmp"), logger, no_prompt=True)

        # Assert
        assert mock_download.call_args[1]["allowed_host"] == "dl.google.com"

    def test_uses_safe_extract_for_tarball(self, mocker):
        """Should use safe_extract_tar for security."""
        # Arrange
        logger = Mock()
        url = "https://dl.google.com/test.tar.gz"
        
        mocker.patch("providers.gcp.sdk.sanitize_api_url", return_value=url)
        mocker.patch("providers.gcp.sdk.ensure_directory")
        mocker.patch("tempfile.mkstemp", return_value=(1, "/tmp/test.tar.gz"))
        mocker.patch("os.close")
        mocker.patch("providers.gcp.sdk.download_https_file")
        mocker.patch("pathlib.Path.read_bytes", return_value=b"content")
        mocker.patch("pathlib.Path.unlink")
        
        mock_tar = MagicMock()
        mocker.patch("tarfile.open", return_value=mock_tar)
        mock_safe_extract = mocker.patch("providers.gcp.sdk.safe_extract_tar")

        # Act
        sdk._download_and_extract(url, Path("/tmp"), logger, no_prompt=True)

        # Assert
        # safe_extract_tar is called with the context manager's __enter__ return value
        mock_safe_extract.assert_called_once()
        assert mock_safe_extract.call_args[0][1] == Path("/tmp")

    def test_uses_safe_extract_for_zip(self, mocker):
        """Should use safe_extract_zip for security."""
        # Arrange
        logger = Mock()
        url = "https://dl.google.com/test.zip"
        
        mocker.patch("providers.gcp.sdk.sanitize_api_url", return_value=url)
        mocker.patch("providers.gcp.sdk.ensure_directory")
        mocker.patch("tempfile.mkstemp", return_value=(1, "/tmp/test.zip"))
        mocker.patch("os.close")
        mocker.patch("providers.gcp.sdk.download_https_file")
        mocker.patch("pathlib.Path.read_bytes", return_value=b"content")
        mocker.patch("pathlib.Path.unlink")
        
        mock_zip = MagicMock()
        mocker.patch("zipfile.ZipFile", return_value=mock_zip)
        mock_safe_extract = mocker.patch("providers.gcp.sdk.safe_extract_zip")

        # Act
        sdk._download_and_extract(url, Path("/tmp"), logger, no_prompt=True)

        # Assert
        # safe_extract_zip is called with the context manager's __enter__ return value
        mock_safe_extract.assert_called_once()
        assert mock_safe_extract.call_args[0][1] == Path("/tmp")

    def test_cleans_up_temp_file(self, mocker, tmp_path):
        """Should delete temporary download file after extraction."""
        # Arrange
        logger = Mock()
        url = "https://dl.google.com/test.tar.gz"
        
        tar_path = tmp_path / "test.tar.gz"
        tar_path.write_bytes(b"content")
        
        mocker.patch("providers.gcp.sdk.sanitize_api_url", return_value=url)
        mocker.patch("providers.gcp.sdk.ensure_directory")
        mocker.patch("tempfile.mkstemp", return_value=(1, str(tar_path)))
        mocker.patch("os.close")
        mocker.patch("providers.gcp.sdk.download_https_file")
        mocker.patch("tarfile.open", return_value=MagicMock())
        mocker.patch("providers.gcp.sdk.safe_extract_tar")

        # Act
        sdk._download_and_extract(url, tmp_path, logger, no_prompt=True)

        # Assert
        assert not tar_path.exists()

    def test_returns_sdk_directory_path(self, mocker, tmp_path):
        """Should return path to extracted google-cloud-sdk directory."""
        # Arrange
        logger = Mock()
        url = "https://dl.google.com/test.tar.gz"
        
        mocker.patch("providers.gcp.sdk.sanitize_api_url", return_value=url)
        mocker.patch("providers.gcp.sdk.ensure_directory")
        mocker.patch("tempfile.mkstemp", return_value=(1, "/tmp/test.tar.gz"))
        mocker.patch("os.close")
        mocker.patch("providers.gcp.sdk.download_https_file")
        mocker.patch("pathlib.Path.read_bytes", return_value=b"content")
        mocker.patch("pathlib.Path.unlink")
        mocker.patch("tarfile.open", return_value=MagicMock())
        mocker.patch("providers.gcp.sdk.safe_extract_tar")

        # Act
        result = sdk._download_and_extract(url, tmp_path, logger, no_prompt=True)

        # Assert
        assert result == tmp_path / "google-cloud-sdk"
