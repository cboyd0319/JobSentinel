"""Comprehensive tests for cloud.providers.gcp.utils module.

Tests utility functions for GCP API URL building, file extraction, and HTTP download.
Following pytest architect best practices with parametrization, mocking, and security validation.
"""

from __future__ import annotations

import tarfile
import tempfile
import urllib.error
import warnings
import zipfile
from pathlib import Path
from unittest.mock import MagicMock, Mock, mock_open, patch

import pytest

from cloud.providers.gcp.utils import (
    build_google_api_url,
    download_https_file,
    download_https_text,
    looks_like_placeholder,
    safe_extract_tar,
    safe_extract_zip,
    sanitize_api_url,
)


# Suppress tarfile deprecation warnings from Python 3.12+ about filter argument
@pytest.fixture(autouse=True)
def _suppress_tarfile_deprecation():
    """Suppress tarfile deprecation warnings from code under test."""
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=DeprecationWarning, message=".*filter.*tar.*")
        yield


class TestSanitizeApiUrl:
    """Test API URL sanitization."""

    @pytest.mark.parametrize(
        "raw_url,expected",
        [
            ("https://example.com", "https://example.com"),
            ("example.com", "https://example.com"),
            ("HTTPS://EXAMPLE.COM", "https://example.com"),
            ("https://example.com/path", "https://example.com/path"),
            ("https://example.com/path?query=1", "https://example.com/path?query=1"),
        ],
        ids=["with-https", "without-scheme", "uppercase", "with-path", "with-query"]
    )
    def test_sanitize_url_success(self, raw_url, expected):
        """Should sanitize and normalize URLs correctly."""
        result = sanitize_api_url(raw_url)
        
        assert result == expected

    def test_sanitize_empty_url_raises(self):
        """Should raise ValueError for empty URL."""
        with pytest.raises(ValueError, match="empty URL"):
            sanitize_api_url("")

    def test_sanitize_whitespace_only_raises(self):
        """Should raise ValueError for whitespace-only URL."""
        with pytest.raises(ValueError, match="empty URL"):
            sanitize_api_url("   ")

    def test_sanitize_invalid_scheme_raises(self):
        """Should raise ValueError for unsupported URL scheme."""
        with pytest.raises(ValueError, match="Unsupported URL scheme"):
            sanitize_api_url("ftp://example.com")

    def test_sanitize_missing_hostname_raises(self):
        """Should raise ValueError for URL without hostname."""
        with pytest.raises(ValueError, match="missing hostname"):
            sanitize_api_url("https://")

    def test_sanitize_removes_fragment(self):
        """Should remove URL fragment."""
        result = sanitize_api_url("https://example.com/path#fragment")
        
        assert "#fragment" not in result
        assert "example.com/path" in result

    def test_sanitize_normalizes_hostname(self):
        """Should lowercase hostname."""
        result = sanitize_api_url("https://EXAMPLE.COM/PATH")
        
        assert "example.com" in result


class TestBuildGoogleApiUrl:
    """Test Google API URL building."""

    def test_build_basic_url(self):
        """Should build basic API URL with segments."""
        result = build_google_api_url(
            host="run.googleapis.com",
            segments=["v1", "projects", "test-project"]
        )
        
        assert result == "https://run.googleapis.com/v1/projects/test-project"

    def test_build_empty_host_raises(self):
        """Should raise ValueError for empty host."""
        with pytest.raises(ValueError, match="API host is required"):
            build_google_api_url(host="", segments=["v1"])

    def test_build_empty_segment_raises(self):
        """Should raise ValueError for empty path segment."""
        with pytest.raises(ValueError, match="Empty path segment"):
            build_google_api_url(host="api.example.com", segments=["v1", "", "resource"])

    def test_build_with_colon_in_last_segment(self):
        """Should allow colon in last segment when flag is set."""
        result = build_google_api_url(
            host="run.googleapis.com",
            segments=["v1", "jobs", "job-name:run"],
            allow_colon_last=True
        )
        
        assert result.endswith("job-name:run")

    def test_build_url_encodes_segments(self):
        """Should URL-encode segments properly."""
        result = build_google_api_url(
            host="api.example.com",
            segments=["v1", "projects", "test project"]
        )
        
        assert "test%20project" in result

    @pytest.mark.parametrize(
        "segments,expected_path",
        [
            (["v1"], "/v1"),
            (["v1", "projects"], "/v1/projects"),
            (["api", "v2", "resources", "123"], "/api/v2/resources/123"),
        ],
        ids=["single", "double", "multiple"]
    )
    def test_build_various_paths(self, segments, expected_path):
        """Should build URLs with various path lengths."""
        result = build_google_api_url(host="api.example.com", segments=segments)
        
        assert expected_path in result

    def test_build_preserves_special_chars(self):
        """Should preserve safe special characters."""
        result = build_google_api_url(
            host="api.example.com",
            segments=["v1", "resource-name", "item_123"]
        )
        
        assert "resource-name" in result
        assert "item_123" in result


class TestSafeExtractZip:
    """Test safe ZIP extraction with path traversal protection."""

    def test_extract_safe_zip(self, tmp_path):
        """Should extract safe ZIP file successfully."""
        zip_path = tmp_path / "test.zip"
        extract_path = tmp_path / "extract"
        extract_path.mkdir()

        # Create a safe ZIP file
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("file1.txt", "content1")
            zf.writestr("subdir/file2.txt", "content2")

        with zipfile.ZipFile(zip_path, "r") as zf:
            safe_extract_zip(zf, extract_path)

        assert (extract_path / "file1.txt").exists()
        assert (extract_path / "subdir" / "file2.txt").exists()

    def test_extract_rejects_path_traversal(self, tmp_path):
        """Should reject ZIP with path traversal attack."""
        zip_path = tmp_path / "malicious.zip"
        extract_path = tmp_path / "extract"
        extract_path.mkdir()

        # Create malicious ZIP with path traversal
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("../../../etc/passwd", "malicious")

        with zipfile.ZipFile(zip_path, "r") as zf:
            with pytest.raises(RuntimeError, match="unsafe path"):
                safe_extract_zip(zf, extract_path)

    def test_extract_empty_zip(self, tmp_path):
        """Should handle empty ZIP file."""
        zip_path = tmp_path / "empty.zip"
        extract_path = tmp_path / "extract"
        extract_path.mkdir()

        with zipfile.ZipFile(zip_path, "w"):
            pass  # Empty ZIP

        with zipfile.ZipFile(zip_path, "r") as zf:
            safe_extract_zip(zf, extract_path)

        # Should complete without error
        assert extract_path.exists()


class TestSafeExtractTar:
    """Test safe TAR extraction with path traversal protection."""

    def test_extract_safe_tar(self, tmp_path):
        """Should extract safe TAR file successfully."""
        tar_path = tmp_path / "test.tar"
        extract_path = tmp_path / "extract"
        extract_path.mkdir()

        # Create a safe TAR file
        with tarfile.open(tar_path, "w") as tf:
            file1 = tmp_path / "file1.txt"
            file1.write_text("content1")
            tf.add(file1, arcname="file1.txt")

        with tarfile.open(tar_path, "r") as tf:
            safe_extract_tar(tf, extract_path)

        assert (extract_path / "file1.txt").exists()

    def test_extract_rejects_path_traversal_tar(self, tmp_path):
        """Should reject TAR with path traversal attack."""
        tar_path = tmp_path / "malicious.tar"
        extract_path = tmp_path / "extract"
        extract_path.mkdir()

        # Create TAR with relative path traversal
        with tarfile.open(tar_path, "w") as tf:
            file1 = tmp_path / "temp_file.txt"
            file1.write_text("malicious")
            tf.add(file1, arcname="../../../etc/passwd")

        with tarfile.open(tar_path, "r") as tf:
            with pytest.raises(RuntimeError, match="unsafe path"):
                safe_extract_tar(tf, extract_path)


class TestDownloadHttpsFile:
    """Test HTTPS file download with security validation."""

    def test_download_validates_host(self, tmp_path):
        """Should reject download from non-allowed host."""
        destination = tmp_path / "file.txt"

        with pytest.raises(RuntimeError, match="Unexpected download host"):
            download_https_file(
                "https://evil.com/malware.zip",
                destination,
                allowed_host="trusted.com"
            )

    def test_download_requires_https(self, tmp_path):
        """Should reject non-HTTPS URLs."""
        destination = tmp_path / "file.txt"

        with pytest.raises(RuntimeError, match="Unexpected download host"):
            download_https_file(
                "http://trusted.com/file.zip",
                destination,
                allowed_host="trusted.com"
            )

    @patch("urllib.request.urlopen")
    def test_download_success(self, mock_urlopen, tmp_path):
        """Should download file successfully from allowed host."""
        destination = tmp_path / "file.txt"
        
        mock_response = MagicMock()
        mock_response.headers.get.return_value = "100"
        mock_response.read.side_effect = [b"test data", b""]
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        download_https_file(
            "https://trusted.com/file.txt",
            destination,
            allowed_host="trusted.com",
            show_progress=False
        )

        assert destination.exists()
        assert destination.read_text() == "test data"

    @patch("urllib.request.urlopen")
    def test_download_with_progress(self, mock_urlopen, tmp_path):
        """Should show progress bar for large downloads."""
        destination = tmp_path / "file.txt"
        
        mock_response = MagicMock()
        mock_response.headers.get.return_value = "1000000"  # 1MB
        mock_response.read.side_effect = [b"x" * 8192, b""]
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        download_https_file(
            "https://trusted.com/large.zip",
            destination,
            allowed_host="trusted.com",
            show_progress=True
        )

        assert destination.exists()


class TestDownloadHttpsText:
    """Test HTTPS text download."""

    @patch("urllib.request.urlopen")
    def test_download_text_success(self, mock_urlopen):
        """Should download text content."""
        mock_response = MagicMock()
        mock_response.read.return_value = b"Hello World"
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        result = download_https_text(
            "https://trusted.com/data.txt",
            allowed_host="trusted.com"
        )

        assert result == "Hello World"

    def test_download_text_validates_host(self):
        """Should reject text download from non-allowed host."""
        with pytest.raises(RuntimeError, match="Unexpected download host"):
            download_https_text(
                "https://evil.com/data.txt",
                allowed_host="trusted.com"
            )


class TestLooksLikePlaceholder:
    """Test placeholder detection for configuration values."""

    @pytest.mark.parametrize(
        "candidate,expected",
        [
            ("your_webhook_url", True),
            ("example.com", True),
            ("example_value", True),
            ("hooks.slack.com/services/xxx", True),
            ("https://hooks.slack.com/services/ABC123/DEF456", False),
            ("real-webhook-url.com", False),
            ("production-value", False),
            ("", False),
        ],
        ids=[
            "your_prefix",
            "example_domain",
            "example_prefix",
            "slack_placeholder",
            "real_slack",
            "real_url",
            "real_value",
            "empty",
        ]
    )
    def test_placeholder_detection(self, candidate, expected):
        """Should detect placeholder strings correctly."""
        result = looks_like_placeholder(candidate, "default")
        
        assert result == expected

    def test_placeholder_case_insensitive(self):
        """Should detect placeholders case-insensitively."""
        assert looks_like_placeholder("YOUR_WEBHOOK", "")
        assert looks_like_placeholder("EXAMPLE.COM", "")

    def test_placeholder_empty_string(self):
        """Should return False for empty string."""
        assert looks_like_placeholder("", "default") is False


@pytest.mark.parametrize(
    "url,segments,allow_colon",
    [
        ("run.googleapis.com", ["v1", "namespaces", "default"], False),
        ("compute.googleapis.com", ["v1", "projects", "test"], False),
        ("run.googleapis.com", ["v1", "jobs", "job:run"], True),
    ],
    ids=["run-api", "compute-api", "with-colon"]
)
def test_build_url_integration(url, segments, allow_colon):
    """Integration test for URL building with various configurations."""
    result = build_google_api_url(host=url, segments=segments, allow_colon_last=allow_colon)
    
    assert result.startswith("https://")
    assert url in result
    for segment in segments:
        # Check segment is in URL (encoded or not)
        assert segment in result or segment.replace(":", "%3A") in result
