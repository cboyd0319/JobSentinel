"""Tests for resume_analyzer module."""

import json
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from jsa.resume_analyzer import (
    analyze_resume_gaps,
    extract_keywords_from_jobs,
    generate_resume_report,
)


@pytest.fixture
def temp_jobs_dir(tmp_path):
    """Create temporary jobs directory with sample data."""
    jobs_dir = tmp_path / "jobs"
    jobs_dir.mkdir()

    # Create sample job files
    job1 = {
        "title": "Python Developer",
        "description": "Looking for experienced Python developer with Django and Flask knowledge",
        "company": "TechCorp",
        "url": "http://example.com/job1",
    }
    job2 = {
        "title": "Backend Engineer",
        "description": "Backend engineer needed. Must know Python, PostgreSQL, and Docker",
        "company": "StartupInc",
        "url": "http://example.com/job2",
    }

    (jobs_dir / "job1.json").write_text(json.dumps(job1))
    (jobs_dir / "job2.json").write_text(json.dumps(job2))

    return jobs_dir


@pytest.fixture
def temp_resume(tmp_path):
    """Create temporary resume file."""
    resume_file = tmp_path / "resume.txt"
    resume_file.write_text(
        """
        John Doe
        Software Engineer
        
        Skills: Python, Django, JavaScript, SQL
        
        Experience:
        - Built web applications using Python and Django
        - Worked with PostgreSQL databases
        """
    )
    return resume_file


def test_extract_keywords_fallback(temp_jobs_dir):
    """Test keyword extraction using Python fallback (no ripgrep)."""
    with patch("shutil.which", return_value=None):
        keywords = extract_keywords_from_jobs(str(temp_jobs_dir), top_n=10)

        # Should extract keywords from job descriptions
        assert len(keywords) > 0
        # Keywords should be tuples of (word, count)
        assert all(isinstance(kw, tuple) for kw in keywords)
        assert all(len(kw) == 2 for kw in keywords)


def test_extract_keywords_empty_dir(tmp_path):
    """Test keyword extraction with empty directory."""
    empty_dir = tmp_path / "empty"
    empty_dir.mkdir()

    keywords = extract_keywords_from_jobs(str(empty_dir), top_n=10)
    assert len(keywords) == 0


def test_extract_keywords_nonexistent_dir():
    """Test keyword extraction with nonexistent directory."""
    keywords = extract_keywords_from_jobs("/nonexistent/path", top_n=10)
    assert len(keywords) == 0


def test_analyze_resume_gaps_fallback(temp_resume):
    """Test resume gap analysis using Python fallback (no ripgrep)."""
    with patch("shutil.which", return_value=None):
        target_keywords = ["python", "django", "docker", "kubernetes"]
        analysis = analyze_resume_gaps(str(temp_resume), target_keywords)

        # Check results
        assert "python" in analysis["found"]
        assert "django" in analysis["found"]
        assert "docker" not in analysis["found"]  # Not in resume
        assert "kubernetes" in analysis["missing"]  # Not in resume
        assert 0 <= analysis["coverage_pct"] <= 100


def test_analyze_resume_gaps_nonexistent_file():
    """Test resume gap analysis with nonexistent file."""
    analysis = analyze_resume_gaps("/nonexistent/resume.txt", ["python", "java"])

    assert len(analysis["found"]) == 0
    assert len(analysis["missing"]) == 2
    assert analysis["coverage_pct"] == 0.0
    assert "not found" in analysis["recommendation"].lower()


def test_generate_resume_report(temp_resume, temp_jobs_dir, tmp_path):
    """Test resume report generation."""
    with patch("shutil.which", return_value=None):
        output_file = tmp_path / "report.txt"

        analysis = generate_resume_report(
            str(temp_resume), str(temp_jobs_dir), str(output_file)
        )

        # Check analysis results
        assert "found" in analysis
        assert "missing" in analysis
        assert "coverage_pct" in analysis
        assert "recommendation" in analysis

        # Check that report file was created
        assert output_file.exists()
        report_content = output_file.read_text()
        assert "JobSentinel Resume Analysis Report" in report_content
        assert "Resume Coverage" in report_content


def test_generate_resume_report_write_error(temp_resume, temp_jobs_dir, tmp_path):
    """Test resume report generation with write error."""
    with patch("shutil.which", return_value=None):
        # Use read-only directory to trigger write error
        output_file = "/invalid/path/report.txt"

        # Should not raise exception, just print warning
        analysis = generate_resume_report(
            str(temp_resume), str(temp_jobs_dir), output_file
        )

        # Analysis should still be returned
        assert "found" in analysis
        assert "missing" in analysis


@patch("shutil.which")
@patch("subprocess.run")
def test_extract_keywords_ripgrep(mock_run, mock_which, temp_jobs_dir):
    """Test keyword extraction using RipGrep."""
    mock_which.return_value = "/usr/bin/rg"

    # Mock ripgrep output
    mock_result = MagicMock()
    mock_result.stdout = """
{"type":"match","data":{"lines":{"text":"python developer"}}}
{"type":"match","data":{"lines":{"text":"django flask"}}}
"""
    mock_run.return_value = mock_result

    keywords = extract_keywords_from_jobs(str(temp_jobs_dir), top_n=5)

    # Should have called ripgrep
    mock_run.assert_called_once()
    assert mock_run.call_args[0][0][0] == "rg"


@patch("shutil.which")
@patch("subprocess.run")
def test_analyze_resume_ripgrep(mock_run, mock_which, temp_resume):
    """Test resume analysis using RipGrep."""
    mock_which.return_value = "/usr/bin/rg"

    # Mock ripgrep responses
    call_count = 0

    def mock_subprocess(cmd, **kwargs):
        nonlocal call_count
        call_count += 1
        result = MagicMock()
        # Return code 0 means keyword found, 1 means not found
        # Check the command argument that contains the keyword
        cmd_str = " ".join(cmd)
        if "python" in cmd_str:
            result.returncode = 0
        elif "kubernetes" in cmd_str:
            result.returncode = 1
        else:
            result.returncode = 1
        return result

    mock_run.side_effect = mock_subprocess

    target_keywords = ["python", "kubernetes"]
    analysis = analyze_resume_gaps(str(temp_resume), target_keywords)

    # Should have called ripgrep for each keyword
    assert call_count == len(target_keywords)
    assert "python" in analysis["found"]
    assert "kubernetes" in analysis["missing"]
