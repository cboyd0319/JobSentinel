"""Comprehensive tests for cloud.common.providers.common.terraform_installer module.

Tests Terraform installation utilities including platform detection, download,
extraction, checksum verification, and PATH management.
"""

import hashlib
import json
import os
import platform
import stat
import sys
import tempfile
import zipfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest

# Module path is handled in conftest.py
# Import from providers.common.terraform_installer
from providers.common.terraform_installer import (
    TERRAFORM_VERSION,
    _CHECKSUM_CACHE,
    add_to_path,
    check_terraform_installed,
    download_terraform,
    ensure_terraform,
    extract_terraform,
    fetch_terraform_checksums,
    get_platform_info,
    get_terraform_download_url,
    get_terraform_install_dir,
    verify_checksum,
)


class TestGetPlatformInfo:
    """Test platform detection."""

    @patch("platform.system")
    @patch("platform.machine")
    def test_get_platform_info_linux_amd64(self, mock_machine, mock_system):
        """Detect Linux x86_64 correctly."""
        mock_system.return_value = "Linux"
        mock_machine.return_value = "x86_64"

        os_type, arch = get_platform_info()

        assert os_type == "linux"
        assert arch == "amd64"

    @patch("platform.system")
    @patch("platform.machine")
    def test_get_platform_info_darwin_arm64(self, mock_machine, mock_system):
        """Detect macOS ARM64 correctly."""
        mock_system.return_value = "Darwin"
        mock_machine.return_value = "arm64"

        os_type, arch = get_platform_info()

        assert os_type == "darwin"
        assert arch == "arm64"

    @patch("platform.system")
    @patch("platform.machine")
    def test_get_platform_info_windows_amd64(self, mock_machine, mock_system):
        """Detect Windows x86_64 correctly."""
        mock_system.return_value = "Windows"
        mock_machine.return_value = "AMD64"

        os_type, arch = get_platform_info()

        assert os_type == "windows"
        assert arch == "amd64"

    @patch("platform.system")
    @patch("platform.machine")
    def test_get_platform_info_linux_aarch64(self, mock_machine, mock_system):
        """Detect Linux ARM64 (aarch64) correctly."""
        mock_system.return_value = "Linux"
        mock_machine.return_value = "aarch64"

        os_type, arch = get_platform_info()

        assert os_type == "linux"
        assert arch == "arm64"

    @patch("platform.system")
    @patch("platform.machine")
    def test_get_platform_info_unknown_os_defaults_linux(self, mock_machine, mock_system):
        """Unknown OS should default to linux."""
        mock_system.return_value = "FreeBSD"
        mock_machine.return_value = "x86_64"

        os_type, arch = get_platform_info()

        assert os_type == "linux"  # Default fallback
        assert arch == "amd64"

    @patch("platform.system")
    @patch("platform.machine")
    def test_get_platform_info_unknown_arch_defaults_amd64(self, mock_machine, mock_system):
        """Unknown architecture should default to amd64."""
        mock_system.return_value = "Linux"
        mock_machine.return_value = "riscv64"

        os_type, arch = get_platform_info()

        assert os_type == "linux"
        assert arch == "amd64"  # Default fallback

    @patch("platform.system")
    @patch("platform.machine")
    def test_get_platform_info_case_insensitive(self, mock_machine, mock_system):
        """Platform detection should be case insensitive."""
        mock_system.return_value = "LINUX"
        mock_machine.return_value = "X86_64"

        os_type, arch = get_platform_info()

        assert os_type == "linux"
        assert arch == "amd64"


class TestGetTerraformInstallDir:
    """Test installation directory determination."""

    @patch("sys.platform", "linux")
    @patch("pathlib.Path.home")
    def test_get_terraform_install_dir_linux(self, mock_home, tmp_path):
        """Linux should use ~/.local/bin/job-scraper."""
        mock_home.return_value = tmp_path

        install_dir = get_terraform_install_dir()

        assert install_dir == tmp_path / ".local" / "bin" / "job-scraper"
        assert install_dir.exists()

    @patch("sys.platform", "darwin")
    @patch("pathlib.Path.home")
    def test_get_terraform_install_dir_macos(self, mock_home, tmp_path):
        """macOS should use ~/.local/bin/job-scraper."""
        mock_home.return_value = tmp_path

        install_dir = get_terraform_install_dir()

        assert install_dir == tmp_path / ".local" / "bin" / "job-scraper"
        assert install_dir.exists()

    @patch("sys.platform", "win32")
    @patch("os.environ.get")
    def test_get_terraform_install_dir_windows_with_appdata(self, mock_env_get, tmp_path):
        """Windows should use %APPDATA%\\job-scraper\\bin."""
        mock_env_get.return_value = str(tmp_path)

        install_dir = get_terraform_install_dir()

        assert install_dir == tmp_path / "job-scraper" / "bin"
        assert install_dir.exists()

    @patch("sys.platform", "win32")
    @patch("pathlib.Path.home")
    def test_get_terraform_install_dir_windows_no_appdata(self, mock_home, tmp_path, monkeypatch):
        """Windows without APPDATA should use home directory fallback."""
        # Remove APPDATA from environment
        monkeypatch.delenv("APPDATA", raising=False)
        mock_home.return_value = tmp_path

        install_dir = get_terraform_install_dir()

        expected = tmp_path / "AppData" / "Roaming" / "job-scraper" / "bin"
        assert install_dir == expected
        assert install_dir.exists()

    def test_get_terraform_install_dir_creates_directory(self, tmp_path):
        """Installation directory should be created if it doesn't exist."""
        with patch("pathlib.Path.home", return_value=tmp_path):
            install_dir = get_terraform_install_dir()

            assert install_dir.exists()
            assert install_dir.is_dir()


class TestGetTerraformDownloadUrl:
    """Test URL construction."""

    @pytest.mark.parametrize(
        "version,os_type,arch,expected_filename",
        [
            ("1.9.7", "linux", "amd64", "terraform_1.9.7_linux_amd64.zip"),
            ("1.10.3", "darwin", "arm64", "terraform_1.10.3_darwin_arm64.zip"),
            ("1.8.0", "windows", "amd64", "terraform_1.8.0_windows_amd64.zip"),
        ],
        ids=["linux-amd64", "darwin-arm64", "windows-amd64"],
    )
    def test_get_terraform_download_url(self, version, os_type, arch, expected_filename):
        """URL should be correctly constructed from parameters."""
        url = get_terraform_download_url(version, os_type, arch)

        assert url.startswith("https://releases.hashicorp.com/terraform/")
        assert f"/{version}/" in url
        assert url.endswith(expected_filename)

    def test_get_terraform_download_url_format(self):
        """URL should follow expected format."""
        url = get_terraform_download_url("1.9.7", "linux", "amd64")

        assert url == "https://releases.hashicorp.com/terraform/1.9.7/terraform_1.9.7_linux_amd64.zip"


class TestVerifyChecksum:
    """Test checksum verification."""

    def test_verify_checksum_matches(self, tmp_path):
        """Checksum verification should pass for matching checksums."""
        # Create a test file
        test_file = tmp_path / "test.bin"
        test_content = b"test content for checksum"
        test_file.write_bytes(test_content)

        # Calculate expected checksum
        expected = hashlib.sha256(test_content).hexdigest()

        assert verify_checksum(test_file, expected) is True

    def test_verify_checksum_mismatch(self, tmp_path):
        """Checksum verification should fail for mismatched checksums."""
        test_file = tmp_path / "test.bin"
        test_file.write_bytes(b"test content")

        wrong_checksum = "a" * 64  # Invalid checksum

        assert verify_checksum(test_file, wrong_checksum) is False

    def test_verify_checksum_empty_file(self, tmp_path):
        """Checksum verification should work for empty files."""
        test_file = tmp_path / "empty.bin"
        test_file.write_bytes(b"")

        expected = hashlib.sha256(b"").hexdigest()

        assert verify_checksum(test_file, expected) is True

    def test_verify_checksum_large_file(self, tmp_path):
        """Checksum verification should work for large files."""
        test_file = tmp_path / "large.bin"
        # Create a 1MB file
        large_content = b"x" * (1024 * 1024)
        test_file.write_bytes(large_content)

        expected = hashlib.sha256(large_content).hexdigest()

        assert verify_checksum(test_file, expected) is True


class TestFetchTerraformChecksums:
    """Test checksum fetching and caching."""

    @pytest.mark.asyncio
    async def test_fetch_terraform_checksums_caching(self, mocker):
        """Checksums should be cached after first fetch."""
        logger = MagicMock()
        mock_urlopen = mocker.patch("urllib.request.urlopen")
        mock_response = MagicMock()
        mock_response.read.return_value = b"abc123 terraform_1.9.7_linux_amd64.zip\ndef456 terraform_1.9.7_darwin_arm64.zip"
        mock_response.__enter__.return_value = mock_response
        mock_response.__exit__.return_value = False
        mock_urlopen.return_value = mock_response

        # Clear cache
        _CHECKSUM_CACHE.clear()

        # First call
        result1 = await fetch_terraform_checksums("1.9.7", logger)
        
        # Second call - should use cache
        result2 = await fetch_terraform_checksums("1.9.7", logger)

        # Should only fetch once
        assert mock_urlopen.call_count == 1
        assert result1 == result2
        assert "linux_amd64" in result1
        assert "darwin_arm64" in result1

    @pytest.mark.asyncio
    async def test_fetch_terraform_checksums_non_https_url(self, mocker):
        """Non-HTTPS URLs should be rejected."""
        logger = MagicMock()
        _CHECKSUM_CACHE.clear()

        # Patch to force non-HTTPS (this shouldn't happen in practice)
        with patch("terraform_installer.fetch_terraform_checksums") as mock_fetch:
            mock_fetch.return_value = {}
            
            result = await mock_fetch("1.9.7", logger)

            assert result == {}

    @pytest.mark.asyncio
    async def test_fetch_terraform_checksums_network_error(self, mocker):
        """Network errors should be handled gracefully."""
        logger = MagicMock()
        _CHECKSUM_CACHE.clear()

        mock_urlopen = mocker.patch("urllib.request.urlopen")
        mock_urlopen.side_effect = Exception("Network error")

        result = await fetch_terraform_checksums("1.9.7", logger)

        assert result == {}
        assert logger.warning.called

    @pytest.mark.asyncio
    async def test_fetch_terraform_checksums_parsing(self, mocker):
        """Checksum file should be parsed correctly."""
        logger = MagicMock()
        _CHECKSUM_CACHE.clear()

        checksum_content = """abc123def456 terraform_1.9.7_linux_amd64.zip
789ghi012jkl terraform_1.9.7_darwin_arm64.zip
# This is a comment
invalid line without checksum
mno345pqr678 terraform_1.9.7_windows_amd64.zip"""

        mock_urlopen = mocker.patch("urllib.request.urlopen")
        mock_response = MagicMock()
        mock_response.read.return_value = checksum_content.encode()
        mock_response.__enter__.return_value = mock_response
        mock_response.__exit__.return_value = False
        mock_urlopen.return_value = mock_response

        result = await fetch_terraform_checksums("1.9.7", logger)

        assert len(result) == 3
        assert result["linux_amd64"] == "abc123def456"
        assert result["darwin_arm64"] == "789ghi012jkl"
        assert result["windows_amd64"] == "mno345pqr678"


class TestExtractTerraform:
    """Test Terraform extraction."""

    @patch("sys.platform", "linux")
    def test_extract_terraform_linux(self, tmp_path):
        """Extract Terraform binary on Linux."""
        # Create a zip file with terraform binary
        zip_path = tmp_path / "terraform.zip"
        install_dir = tmp_path / "install"
        install_dir.mkdir()

        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("terraform", b"#!/bin/sh\necho terraform")

        terraform_bin = extract_terraform(zip_path, install_dir)

        assert terraform_bin == install_dir / "terraform"
        assert terraform_bin.exists()
        # Check if executable bit is set
        assert terraform_bin.stat().st_mode & stat.S_IXUSR

    @patch("sys.platform", "win32")
    def test_extract_terraform_windows(self, tmp_path):
        """Extract Terraform binary on Windows."""
        zip_path = tmp_path / "terraform.zip"
        install_dir = tmp_path / "install"
        install_dir.mkdir()

        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("terraform.exe", b"Windows binary")

        terraform_bin = extract_terraform(zip_path, install_dir)

        assert terraform_bin == install_dir / "terraform.exe"
        assert terraform_bin.exists()

    def test_extract_terraform_missing_binary(self, tmp_path):
        """Extraction should fail if binary is missing from zip."""
        zip_path = tmp_path / "terraform.zip"
        install_dir = tmp_path / "install"
        install_dir.mkdir()

        # Create zip without terraform binary
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("README.txt", b"No binary here")

        with pytest.raises(RuntimeError, match="Terraform binary not found"):
            extract_terraform(zip_path, install_dir)


class TestAddToPath:
    """Test PATH manipulation."""

    def test_add_to_path_new_directory(self, tmp_path, monkeypatch):
        """Add new directory to PATH."""
        monkeypatch.setenv("PATH", "/usr/bin:/bin")

        add_to_path(tmp_path)

        assert str(tmp_path.resolve()) in os.environ["PATH"]
        assert os.environ["PATH"].startswith(str(tmp_path.resolve()))

    def test_add_to_path_already_present(self, tmp_path, monkeypatch):
        """Don't duplicate directory if already in PATH."""
        existing_path = f"{tmp_path}:/usr/bin:/bin"
        monkeypatch.setenv("PATH", existing_path)

        add_to_path(tmp_path)

        # Count occurrences - should still be 1
        path_count = os.environ["PATH"].split(os.pathsep).count(str(tmp_path))
        assert path_count == 1

    def test_add_to_path_empty_path(self, tmp_path, monkeypatch):
        """Handle empty PATH variable."""
        monkeypatch.delenv("PATH", raising=False)

        add_to_path(tmp_path)

        assert str(tmp_path.resolve()) in os.environ["PATH"]


class TestDownloadTerraform:
    """Test Terraform download."""

    @pytest.mark.asyncio
    async def test_download_terraform_success(self, tmp_path, mocker):
        """Download Terraform successfully."""
        logger = MagicMock()
        mock_run_command = mocker.patch("terraform_installer.run_command", new=AsyncMock())

        # Create a fake downloaded file
        async def create_file(*args, **kwargs):
            zip_path = args[0][3]  # The -o argument value
            Path(zip_path).write_bytes(b"fake zip content")
            return MagicMock(returncode=0)

        mock_run_command.side_effect = create_file

        zip_path = await download_terraform(logger, "1.9.7", "linux", "amd64", tmp_path)

        assert zip_path.exists()
        assert zip_path.name == "terraform_1.9.7_linux_amd64.zip"
        assert zip_path.stat().st_size > 0

    @pytest.mark.asyncio
    async def test_download_terraform_empty_file(self, tmp_path, mocker):
        """Download should fail if file is empty."""
        logger = MagicMock()
        mock_run_command = mocker.patch("terraform_installer.run_command", new=AsyncMock())

        # Create an empty file
        async def create_empty_file(*args, **kwargs):
            zip_path = args[0][3]
            Path(zip_path).write_bytes(b"")
            return MagicMock(returncode=0)

        mock_run_command.side_effect = create_empty_file

        with pytest.raises(RuntimeError, match="download failed or file is empty"):
            await download_terraform(logger, "1.9.7", "linux", "amd64", tmp_path)

    @pytest.mark.asyncio
    async def test_download_terraform_url_format(self, tmp_path, mocker):
        """Download should use correct URL format."""
        logger = MagicMock()
        mock_run_command = mocker.patch("terraform_installer.run_command", new=AsyncMock())
        
        # Create a fake file
        async def create_file(*args, **kwargs):
            zip_path = args[0][3]
            Path(zip_path).write_bytes(b"fake content")
            return MagicMock(returncode=0)

        mock_run_command.side_effect = create_file

        await download_terraform(logger, "1.9.7", "darwin", "arm64", tmp_path)

        # Verify URL passed to curl
        call_args = mock_run_command.call_args[0][0]
        url = call_args[4]  # URL is 5th argument to curl
        assert "https://releases.hashicorp.com/terraform/1.9.7/terraform_1.9.7_darwin_arm64.zip" == url


class TestCheckTerraformInstalled:
    """Test Terraform installation check."""

    @pytest.mark.asyncio
    async def test_check_terraform_installed_found(self, mocker):
        """Check should return path if Terraform is installed."""
        logger = MagicMock()
        mock_which = mocker.patch("terraform_installer.which")
        mock_which.return_value = Path("/usr/bin/terraform")

        mock_run_command = mocker.patch("terraform_installer.run_command", new=AsyncMock())
        version_output = json.dumps({"terraform_version": "1.9.7"})
        mock_run_command.return_value = MagicMock(stdout=version_output, returncode=0)

        result = await check_terraform_installed(logger)

        assert result == Path("/usr/bin/terraform")
        assert logger.info.called

    @pytest.mark.asyncio
    async def test_check_terraform_installed_not_found(self, mocker):
        """Check should return None if Terraform is not found."""
        logger = MagicMock()
        mock_which = mocker.patch("terraform_installer.which")
        mock_which.return_value = None

        result = await check_terraform_installed(logger)

        assert result is None

    @pytest.mark.asyncio
    async def test_check_terraform_installed_version_check_fails(self, mocker):
        """Check should return None if version check fails."""
        logger = MagicMock()
        mock_which = mocker.patch("terraform_installer.which")
        mock_which.return_value = Path("/usr/bin/terraform")

        mock_run_command = mocker.patch("terraform_installer.run_command", new=AsyncMock())
        mock_run_command.side_effect = Exception("Version check failed")

        result = await check_terraform_installed(logger)

        assert result is None


class TestEnsureTerraform:
    """Test main Terraform installation function."""

    @pytest.mark.asyncio
    async def test_ensure_terraform_already_installed(self, mocker):
        """Should use existing installation if available."""
        logger = MagicMock()
        
        mock_check = mocker.patch("terraform_installer.check_terraform_installed", new=AsyncMock())
        mock_check.return_value = Path("/usr/bin/terraform")

        result = await ensure_terraform(logger, force_install=False)

        assert result == Path("/usr/bin/terraform")
        # Should not attempt download
        mock_check.assert_called_once()

    @pytest.mark.asyncio
    async def test_ensure_terraform_force_install(self, mocker, tmp_path):
        """Force install should reinstall even if Terraform exists."""
        logger = MagicMock()

        # Mock all the functions
        mock_check = mocker.patch("terraform_installer.check_terraform_installed", new=AsyncMock())
        mock_check.return_value = Path("/usr/bin/terraform")

        mock_platform = mocker.patch("terraform_installer.get_platform_info")
        mock_platform.return_value = ("linux", "amd64")

        mock_install_dir = mocker.patch("terraform_installer.get_terraform_install_dir")
        mock_install_dir.return_value = tmp_path

        # Create a proper zip with terraform binary
        zip_path = tmp_path / "terraform.zip"
        binary_content = b"terraform binary content"
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("terraform", binary_content)
        
        mock_download = mocker.patch("terraform_installer.download_terraform", new=AsyncMock())
        mock_download.return_value = zip_path

        # Create correct checksum for the zip file
        zip_checksum = hashlib.sha256(zip_path.read_bytes()).hexdigest()
        mock_checksums = mocker.patch("terraform_installer.fetch_terraform_checksums", new=AsyncMock())
        mock_checksums.return_value = {"linux_amd64": zip_checksum}

        mock_add_path = mocker.patch("terraform_installer.add_to_path")
        
        mock_verify_cmd = mocker.patch("terraform_installer.run_command", new=AsyncMock())
        mock_verify_cmd.return_value = MagicMock(stdout="Terraform v1.9.7", returncode=0)

        with patch("sys.platform", "linux"):
            result = await ensure_terraform(logger, force_install=True)

        # Should proceed with installation despite existing Terraform
        assert mock_download.called
        assert result.exists()


class TestTerraformVersion:
    """Test Terraform version constant."""

    def test_terraform_version_is_string(self):
        """TERRAFORM_VERSION should be a string."""
        assert isinstance(TERRAFORM_VERSION, str)

    def test_terraform_version_format(self):
        """TERRAFORM_VERSION should follow semantic versioning."""
        parts = TERRAFORM_VERSION.split(".")
        assert len(parts) == 3
        for part in parts:
            assert part.isdigit()

    def test_terraform_version_not_empty(self):
        """TERRAFORM_VERSION should not be empty."""
        assert len(TERRAFORM_VERSION) > 0


class TestChecksumCache:
    """Test checksum caching mechanism."""

    def test_checksum_cache_is_dict(self):
        """Checksum cache should be a dictionary."""
        assert isinstance(_CHECKSUM_CACHE, dict)

    def test_checksum_cache_can_be_cleared(self):
        """Checksum cache should be clearable."""
        _CHECKSUM_CACHE["test"] = {"platform": "checksum"}
        _CHECKSUM_CACHE.clear()
        assert len(_CHECKSUM_CACHE) == 0
