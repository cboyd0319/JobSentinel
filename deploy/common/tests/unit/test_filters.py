"""Comprehensive tests for jsa.filters module.

Tests company blacklist enforcement with RipGrep and fallback mechanisms:
- Finding blacklisted companies via ripgrep (fast path)
- Fallback to Python when ripgrep unavailable
- Bulk deletion of blacklisted job files
- Edge cases (empty lists, missing dirs, invalid JSON)
- Subprocess error handling
"""

from __future__ import annotations

import json
import subprocess
from pathlib import Path
from unittest.mock import MagicMock, Mock, patch

import pytest

from jsa.filters import (
    bulk_delete_blacklisted_jobs,
    find_blacklisted_companies,
)


class TestFindBlacklistedCompanies:
    """Test find_blacklisted_companies function."""

    def test_find_blacklisted_companies_empty_blacklist_returns_empty(self, tmp_path):
        """Empty blacklist should return empty list."""
        # Arrange
        jobs_dir = tmp_path / "jobs"
        jobs_dir.mkdir()
        # Act
        result = find_blacklisted_companies(str(jobs_dir), [])
        # Assert
        assert result == []

    def test_find_blacklisted_companies_nonexistent_dir_returns_empty(self):
        """Nonexistent directory should return empty list."""
        # Act
        result = find_blacklisted_companies("/nonexistent/path", ["company1"])
        # Assert
        assert result == []

    @patch("jsa.filters.shutil.which")
    @patch("jsa.filters._find_blacklisted_ripgrep")
    def test_find_blacklisted_companies_uses_ripgrep_when_available(
        self, mock_ripgrep, mock_which, tmp_path
    ):
        """Should use ripgrep when available."""
        # Arrange
        jobs_dir = tmp_path / "jobs"
        jobs_dir.mkdir()
        mock_which.return_value = "/usr/bin/rg"
        mock_ripgrep.return_value = ["file1.json"]
        # Act
        result = find_blacklisted_companies(str(jobs_dir), ["Evil Corp"])
        # Assert
        mock_ripgrep.assert_called_once_with(str(jobs_dir), ["Evil Corp"])
        assert result == ["file1.json"]

    @patch("jsa.filters.shutil.which")
    @patch("jsa.filters._find_blacklisted_fallback")
    def test_find_blacklisted_companies_uses_fallback_when_ripgrep_unavailable(
        self, mock_fallback, mock_which, tmp_path
    ):
        """Should use fallback when ripgrep is not available."""
        # Arrange
        jobs_dir = tmp_path / "jobs"
        jobs_dir.mkdir()
        mock_which.return_value = None  # ripgrep not available
        mock_fallback.return_value = ["file1.json"]
        # Act
        result = find_blacklisted_companies(str(jobs_dir), ["Evil Corp"])
        # Assert
        mock_fallback.assert_called_once_with(str(jobs_dir), ["Evil Corp"])
        assert result == ["file1.json"]


class TestFindBlacklistedRipgrep:
    """Test _find_blacklisted_ripgrep function."""

    @patch("jsa.filters.subprocess.run")
    def test_find_blacklisted_ripgrep_returns_matching_files(self, mock_run):
        """Ripgrep should return list of matching files."""
        # Arrange
        mock_run.return_value = Mock(
            stdout="file1.json\nfile2.json\nfile3.json\n", returncode=0
        )
        # Import here to test the private function
        from jsa.filters import _find_blacklisted_ripgrep

        # Act
        result = _find_blacklisted_ripgrep("/jobs", ["Evil Corp", "Bad Company"])
        # Assert
        assert len(result) == 3
        assert "file1.json" in result
        assert "file2.json" in result
        assert "file3.json" in result

    @patch("jsa.filters.subprocess.run")
    def test_find_blacklisted_ripgrep_filters_empty_lines(self, mock_run):
        """Ripgrep should filter out empty strings from output."""
        # Arrange
        mock_run.return_value = Mock(stdout="file1.json\n\nfile2.json\n", returncode=0)
        from jsa.filters import _find_blacklisted_ripgrep

        # Act
        result = _find_blacklisted_ripgrep("/jobs", ["Evil Corp"])
        # Assert
        assert len(result) == 2
        assert "" not in result

    @patch("jsa.filters.subprocess.run")
    def test_find_blacklisted_ripgrep_handles_no_matches(self, mock_run):
        """Ripgrep should return empty list when no matches."""
        # Arrange
        mock_run.return_value = Mock(stdout="", returncode=1)
        from jsa.filters import _find_blacklisted_ripgrep

        # Act
        result = _find_blacklisted_ripgrep("/jobs", ["Evil Corp"])
        # Assert
        assert result == []

    @patch("jsa.filters.subprocess.run")
    @patch("jsa.filters._find_blacklisted_fallback")
    def test_find_blacklisted_ripgrep_falls_back_on_timeout(
        self, mock_fallback, mock_run
    ):
        """Should fall back to Python on ripgrep timeout."""
        # Arrange
        mock_run.side_effect = subprocess.TimeoutExpired("rg", 30)
        mock_fallback.return_value = ["fallback.json"]
        from jsa.filters import _find_blacklisted_ripgrep

        # Act
        result = _find_blacklisted_ripgrep("/jobs", ["Evil Corp"])
        # Assert
        mock_fallback.assert_called_once()
        assert result == ["fallback.json"]

    @patch("jsa.filters.subprocess.run")
    @patch("jsa.filters._find_blacklisted_fallback")
    def test_find_blacklisted_ripgrep_falls_back_on_subprocess_error(
        self, mock_fallback, mock_run
    ):
        """Should fall back to Python on subprocess error."""
        # Arrange
        mock_run.side_effect = subprocess.SubprocessError("ripgrep failed")
        mock_fallback.return_value = ["fallback.json"]
        from jsa.filters import _find_blacklisted_ripgrep

        # Act
        result = _find_blacklisted_ripgrep("/jobs", ["Evil Corp"])
        # Assert
        mock_fallback.assert_called_once()
        assert result == ["fallback.json"]

    @patch("jsa.filters.subprocess.run")
    def test_find_blacklisted_ripgrep_builds_correct_pattern(self, mock_run):
        """Ripgrep should build correct regex pattern from blacklist."""
        # Arrange
        mock_run.return_value = Mock(stdout="", returncode=0)
        from jsa.filters import _find_blacklisted_ripgrep

        # Act
        _find_blacklisted_ripgrep("/jobs", ["Company A", "Company B", "Company C"])
        # Assert
        mock_run.assert_called_once()
        args = mock_run.call_args[0][0]
        pattern_arg = args[3]
        assert "Company A" in pattern_arg
        assert "Company B" in pattern_arg
        assert "Company C" in pattern_arg
        assert "|" in pattern_arg  # Should use pipe for OR


class TestFindBlacklistedFallback:
    """Test _find_blacklisted_fallback function."""

    def test_find_blacklisted_fallback_finds_blacklisted_company_in_dict(
        self, tmp_path
    ):
        """Should find blacklisted company in JSON dict."""
        # Arrange
        from jsa.filters import _find_blacklisted_fallback

        jobs_dir = tmp_path / "jobs"
        jobs_dir.mkdir()
        job_file = jobs_dir / "job1.json"
        job_file.write_text(json.dumps({"company": "Evil Corp", "title": "Developer"}))
        # Act
        result = _find_blacklisted_fallback(str(jobs_dir), ["Evil Corp"])
        # Assert
        assert len(result) == 1
        assert str(job_file) in result

    def test_find_blacklisted_fallback_case_insensitive(self, tmp_path):
        """Should match companies case-insensitively."""
        # Arrange
        from jsa.filters import _find_blacklisted_fallback

        jobs_dir = tmp_path / "jobs"
        jobs_dir.mkdir()
        job_file = jobs_dir / "job1.json"
        job_file.write_text(json.dumps({"company": "evil corp", "title": "Developer"}))
        # Act
        result = _find_blacklisted_fallback(str(jobs_dir), ["Evil Corp"])
        # Assert
        assert len(result) == 1
        assert str(job_file) in result

    def test_find_blacklisted_fallback_finds_company_in_list(self, tmp_path):
        """Should find blacklisted company in JSON list."""
        # Arrange
        from jsa.filters import _find_blacklisted_fallback

        jobs_dir = tmp_path / "jobs"
        jobs_dir.mkdir()
        job_file = jobs_dir / "job1.json"
        job_file.write_text(
            json.dumps([{"company": "Evil Corp", "title": "Developer"}])
        )
        # Act
        result = _find_blacklisted_fallback(str(jobs_dir), ["Evil Corp"])
        # Assert
        assert len(result) == 1

    def test_find_blacklisted_fallback_ignores_non_blacklisted(self, tmp_path):
        """Should not return files with non-blacklisted companies."""
        # Arrange
        from jsa.filters import _find_blacklisted_fallback

        jobs_dir = tmp_path / "jobs"
        jobs_dir.mkdir()
        job_file = jobs_dir / "job1.json"
        job_file.write_text(json.dumps({"company": "Good Corp", "title": "Developer"}))
        # Act
        result = _find_blacklisted_fallback(str(jobs_dir), ["Evil Corp"])
        # Assert
        assert len(result) == 0

    def test_find_blacklisted_fallback_handles_invalid_json(self, tmp_path):
        """Should skip files with invalid JSON."""
        # Arrange
        from jsa.filters import _find_blacklisted_fallback

        jobs_dir = tmp_path / "jobs"
        jobs_dir.mkdir()
        bad_file = jobs_dir / "bad.json"
        bad_file.write_text("{invalid json}")
        # Act
        result = _find_blacklisted_fallback(str(jobs_dir), ["Evil Corp"])
        # Assert - should not crash, just skip bad file
        assert result == []

    def test_find_blacklisted_fallback_handles_os_error(self, tmp_path):
        """Should skip files that cannot be read."""
        # Arrange
        from jsa.filters import _find_blacklisted_fallback

        jobs_dir = tmp_path / "jobs"
        jobs_dir.mkdir()
        # Create file that will cause OSError when reading
        # (we'll mock the open to raise OSError)
        job_file = jobs_dir / "job1.json"
        job_file.write_text(json.dumps({"company": "Evil Corp"}))

        # Act - using patch to simulate OSError
        with patch("builtins.open", side_effect=OSError("Cannot read")):
            result = _find_blacklisted_fallback(str(jobs_dir), ["Evil Corp"])
        # Assert - should not crash
        assert result == []

    def test_find_blacklisted_fallback_handles_nested_directories(self, tmp_path):
        """Should recursively search nested directories."""
        # Arrange
        from jsa.filters import _find_blacklisted_fallback

        jobs_dir = tmp_path / "jobs"
        nested_dir = jobs_dir / "subdir" / "nested"
        nested_dir.mkdir(parents=True)
        job_file = nested_dir / "job1.json"
        job_file.write_text(json.dumps({"company": "Evil Corp"}))
        # Act
        result = _find_blacklisted_fallback(str(jobs_dir), ["Evil Corp"])
        # Assert
        assert len(result) == 1
        assert str(job_file) in result

    def test_find_blacklisted_fallback_handles_empty_company_field(self, tmp_path):
        """Should handle jobs with empty company field."""
        # Arrange
        from jsa.filters import _find_blacklisted_fallback

        jobs_dir = tmp_path / "jobs"
        jobs_dir.mkdir()
        job_file = jobs_dir / "job1.json"
        job_file.write_text(json.dumps({"company": "", "title": "Developer"}))
        # Act
        result = _find_blacklisted_fallback(str(jobs_dir), ["Evil Corp"])
        # Assert
        assert len(result) == 0

    def test_find_blacklisted_fallback_handles_missing_company_field(self, tmp_path):
        """Should handle jobs without company field."""
        # Arrange
        from jsa.filters import _find_blacklisted_fallback

        jobs_dir = tmp_path / "jobs"
        jobs_dir.mkdir()
        job_file = jobs_dir / "job1.json"
        job_file.write_text(json.dumps({"title": "Developer"}))
        # Act
        result = _find_blacklisted_fallback(str(jobs_dir), ["Evil Corp"])
        # Assert
        assert len(result) == 0

    def test_find_blacklisted_fallback_matches_multiple_blacklisted(self, tmp_path):
        """Should find all blacklisted companies."""
        # Arrange
        from jsa.filters import _find_blacklisted_fallback

        jobs_dir = tmp_path / "jobs"
        jobs_dir.mkdir()
        job1 = jobs_dir / "job1.json"
        job1.write_text(json.dumps({"company": "Evil Corp"}))
        job2 = jobs_dir / "job2.json"
        job2.write_text(json.dumps({"company": "Bad Company"}))
        job3 = jobs_dir / "job3.json"
        job3.write_text(json.dumps({"company": "Good Corp"}))
        # Act
        result = _find_blacklisted_fallback(
            str(jobs_dir), ["Evil Corp", "Bad Company"]
        )
        # Assert
        assert len(result) == 2
        assert str(job1) in result
        assert str(job2) in result
        assert str(job3) not in result


class TestBulkDeleteBlacklistedJobs:
    """Test bulk_delete_blacklisted_jobs function."""

    @patch("jsa.filters.find_blacklisted_companies")
    def test_bulk_delete_no_blacklisted_files_returns_zero(
        self, mock_find, tmp_path, capsys
    ):
        """Should return 0 when no blacklisted files found."""
        # Arrange
        mock_find.return_value = []
        # Act
        result = bulk_delete_blacklisted_jobs(str(tmp_path), ["Evil Corp"])
        # Assert
        assert result == 0

    @patch("jsa.filters.find_blacklisted_companies")
    def test_bulk_delete_deletes_blacklisted_files(self, mock_find, tmp_path, capsys):
        """Should delete blacklisted files and return count."""
        # Arrange
        job1 = tmp_path / "job1.json"
        job2 = tmp_path / "job2.json"
        job1.write_text(json.dumps({"company": "Evil Corp"}))
        job2.write_text(json.dumps({"company": "Evil Corp"}))
        mock_find.return_value = [str(job1), str(job2)]
        # Act
        result = bulk_delete_blacklisted_jobs(str(tmp_path), ["Evil Corp"])
        # Assert
        assert result == 2
        assert not job1.exists()
        assert not job2.exists()
        captured = capsys.readouterr()
        assert "Removing 2 jobs" in captured.out

    @patch("jsa.filters.find_blacklisted_companies")
    @patch("jsa.filters.os.remove")
    def test_bulk_delete_handles_os_error(self, mock_remove, mock_find, capsys):
        """Should handle OSError when deleting files."""
        # Arrange
        mock_find.return_value = ["file1.json", "file2.json"]
        mock_remove.side_effect = [None, OSError("Permission denied")]
        # Act
        result = bulk_delete_blacklisted_jobs("/jobs", ["Evil Corp"])
        # Assert
        assert result == 2  # Still returns count of attempted deletions
        captured = capsys.readouterr()
        assert "Warning" in captured.out
        assert "Permission denied" in captured.out

    @patch("jsa.filters.find_blacklisted_companies")
    def test_bulk_delete_prints_removal_message(self, mock_find, tmp_path, capsys):
        """Should print message about removing files."""
        # Arrange
        job1 = tmp_path / "job1.json"
        job1.write_text(json.dumps({"company": "Evil Corp"}))
        mock_find.return_value = [str(job1)]
        # Act
        bulk_delete_blacklisted_jobs(str(tmp_path), ["Evil Corp"])
        # Assert
        captured = capsys.readouterr()
        assert "Removing 1 jobs from blacklisted companies" in captured.out
