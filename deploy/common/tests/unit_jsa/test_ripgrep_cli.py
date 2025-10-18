"""Tests for RipGrep integration CLI commands."""

import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from jsa.cli import _cmd_analyze_resume, _cmd_watch


@pytest.fixture
def temp_resume(tmp_path):
    """Create temporary resume file."""
    resume_file = tmp_path / "resume.txt"
    resume_file.write_text("Python Django SQL Developer")
    return resume_file


@pytest.fixture
def temp_jobs_dir(tmp_path):
    """Create temporary jobs directory."""
    jobs_dir = tmp_path / "jobs"
    jobs_dir.mkdir()
    return jobs_dir


@pytest.fixture
def args_analyze_resume(temp_resume, temp_jobs_dir, tmp_path):
    """Create mock args for analyze-resume command."""
    args = MagicMock()
    args.resume = str(temp_resume)
    args.jobs_dir = str(temp_jobs_dir)
    args.output = str(tmp_path / "report.txt")
    return args


@pytest.fixture
def args_watch(temp_jobs_dir):
    """Create mock args for watch command."""
    args = MagicMock()
    args.jobs_dir = str(temp_jobs_dir)
    args.verbose = False
    return args


def test_cmd_analyze_resume_success(args_analyze_resume):
    """Test analyze-resume command success."""
    with patch("shutil.which", return_value=None):
        result = _cmd_analyze_resume(args_analyze_resume)

        # Should succeed
        assert result == 0


def test_cmd_analyze_resume_missing_resume(args_analyze_resume):
    """Test analyze-resume with missing resume file."""
    args_analyze_resume.resume = "/nonexistent/resume.txt"

    result = _cmd_analyze_resume(args_analyze_resume)

    # Should fail
    assert result == 1


def test_cmd_analyze_resume_missing_jobs_dir(args_analyze_resume):
    """Test analyze-resume with missing jobs directory."""
    args_analyze_resume.jobs_dir = "/nonexistent/jobs"

    result = _cmd_analyze_resume(args_analyze_resume)

    # Should fail
    assert result == 1


def test_cmd_watch_creates_directory(tmp_path):
    """Test watch command creates jobs directory if missing."""
    args = MagicMock()
    jobs_dir = tmp_path / "new_jobs"
    args.jobs_dir = str(jobs_dir)
    args.verbose = False

    # Mock watch_for_new_jobs to raise SystemExit (simulating missing entr)
    with patch("jsa.watchers.watch_for_new_jobs", side_effect=SystemExit(1)):
        result = _cmd_watch(args)

        # Directory should have been created
        assert jobs_dir.exists()
        assert result == 1


def test_cmd_watch_verbose(args_watch):
    """Test watch command with verbose flag."""
    args_watch.verbose = True

    # Mock watch_for_new_jobs to simulate missing entr
    with patch("jsa.watchers.watch_for_new_jobs", side_effect=SystemExit(1)):
        result = _cmd_watch(args_watch)

        # Should return error code from SystemExit
        assert result == 1


def test_cmd_watch_exception(args_watch):
    """Test watch command with generic exception."""
    with patch("jsa.watchers.watch_for_new_jobs", side_effect=Exception("Test error")):
        result = _cmd_watch(args_watch)

        # Should return error code
        assert result == 1
