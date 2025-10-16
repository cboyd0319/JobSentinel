"""
Comprehensive unit tests for notify.emailer module.

Tests cover email sending, HTML digest creation, configuration handling,
SMTP error handling, and edge cases.
"""

from __future__ import annotations

import smtplib
from email.mime.multipart import MIMEMultipart
from unittest.mock import MagicMock, Mock, patch

import pytest

from notify.emailer import _create_html_digest, send_digest_email, test_email_config


# ============================================================================
# Test Data Fixtures
# ============================================================================


@pytest.fixture
def sample_jobs():
    """Provide sample job data for testing."""
    return [
        {
            "title": "Senior Python Developer",
            "company": "Tech Corp",
            "location": "San Francisco, CA",
            "url": "https://example.com/job1",
            "score": 0.95,
        },
        {
            "title": "Backend Engineer",
            "company": "Startup Inc",
            "location": "Remote",
            "url": "https://example.com/job2",
            "score": 0.88,
        },
    ]


@pytest.fixture
def smtp_config(monkeypatch):
    """Set up valid SMTP configuration."""
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_USER", "test@example.com")
    monkeypatch.setenv("SMTP_PASS", "password123")
    monkeypatch.setenv("DIGEST_TO", "recipient@example.com")


# ============================================================================
# Test: send_digest_email - Configuration Validation
# ============================================================================


def test_send_digest_email_missing_smtp_host(monkeypatch, sample_jobs):
    """Test that missing SMTP_HOST returns False."""
    monkeypatch.delenv("SMTP_HOST", raising=False)
    monkeypatch.setenv("SMTP_USER", "test@example.com")
    monkeypatch.setenv("SMTP_PASS", "password")
    monkeypatch.setenv("DIGEST_TO", "to@example.com")
    
    result = send_digest_email(sample_jobs)
    
    assert result is False


def test_send_digest_email_missing_smtp_user(monkeypatch, sample_jobs):
    """Test that missing SMTP_USER returns False."""
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.delenv("SMTP_USER", raising=False)
    monkeypatch.setenv("SMTP_PASS", "password")
    monkeypatch.setenv("DIGEST_TO", "to@example.com")
    
    result = send_digest_email(sample_jobs)
    
    assert result is False


def test_send_digest_email_missing_smtp_pass(monkeypatch, sample_jobs):
    """Test that missing SMTP_PASS returns False."""
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_USER", "test@example.com")
    monkeypatch.delenv("SMTP_PASS", raising=False)
    monkeypatch.setenv("DIGEST_TO", "to@example.com")
    
    result = send_digest_email(sample_jobs)
    
    assert result is False


def test_send_digest_email_missing_digest_to(monkeypatch, sample_jobs):
    """Test that missing DIGEST_TO returns False."""
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_USER", "test@example.com")
    monkeypatch.setenv("SMTP_PASS", "password")
    monkeypatch.delenv("DIGEST_TO", raising=False)
    
    result = send_digest_email(sample_jobs)
    
    assert result is False


def test_send_digest_email_empty_jobs_list(smtp_config):
    """Test that empty jobs list returns False without sending."""
    result = send_digest_email([])
    
    assert result is False


# ============================================================================
# Test: send_digest_email - Successful Sending
# ============================================================================


@patch("notify.emailer.smtplib.SMTP")
def test_send_digest_email_success(mock_smtp, smtp_config, sample_jobs):
    """Test successful email sending with valid config."""
    # Setup mock SMTP server
    mock_server = MagicMock()
    mock_smtp.return_value.__enter__.return_value = mock_server
    
    result = send_digest_email(sample_jobs)
    
    assert result is True
    mock_smtp.assert_called_once_with("smtp.example.com", 587)
    mock_server.starttls.assert_called_once()
    mock_server.login.assert_called_once_with("test@example.com", "password123")
    mock_server.send_message.assert_called_once()


@patch("notify.emailer.smtplib.SMTP")
def test_send_digest_email_message_structure(mock_smtp, smtp_config, sample_jobs):
    """Test that email message has correct structure."""
    mock_server = MagicMock()
    mock_smtp.return_value.__enter__.return_value = mock_server
    
    send_digest_email(sample_jobs)
    
    # Get the message that was sent
    call_args = mock_server.send_message.call_args
    msg = call_args[0][0]
    
    assert isinstance(msg, MIMEMultipart)
    assert msg["Subject"] == "Job Digest - 2 New Opportunities"
    assert msg["From"] == "test@example.com"
    assert msg["To"] == "recipient@example.com"


@patch("notify.emailer.smtplib.SMTP")
def test_send_digest_email_uses_default_port(mock_smtp, monkeypatch, sample_jobs):
    """Test that default port 587 is used when SMTP_PORT not set."""
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_USER", "test@example.com")
    monkeypatch.setenv("SMTP_PASS", "password")
    monkeypatch.setenv("DIGEST_TO", "to@example.com")
    monkeypatch.delenv("SMTP_PORT", raising=False)
    
    mock_server = MagicMock()
    mock_smtp.return_value.__enter__.return_value = mock_server
    
    send_digest_email(sample_jobs)
    
    mock_smtp.assert_called_once_with("smtp.example.com", 587)


# ============================================================================
# Test: send_digest_email - Error Handling
# ============================================================================


@patch("notify.emailer.smtplib.SMTP")
def test_send_digest_email_authentication_error(mock_smtp, smtp_config, sample_jobs):
    """Test handling of SMTP authentication errors."""
    mock_server = MagicMock()
    mock_server.login.side_effect = smtplib.SMTPAuthenticationError(535, "Authentication failed")
    mock_smtp.return_value.__enter__.return_value = mock_server
    
    result = send_digest_email(sample_jobs)
    
    assert result is False


@patch("notify.emailer.smtplib.SMTP")
def test_send_digest_email_smtp_exception(mock_smtp, smtp_config, sample_jobs):
    """Test handling of general SMTP exceptions."""
    mock_server = MagicMock()
    mock_server.send_message.side_effect = smtplib.SMTPException("Server error")
    mock_smtp.return_value.__enter__.return_value = mock_server
    
    result = send_digest_email(sample_jobs)
    
    assert result is False


@patch("notify.emailer.smtplib.SMTP")
def test_send_digest_email_unexpected_exception(mock_smtp, smtp_config, sample_jobs):
    """Test handling of unexpected exceptions."""
    mock_server = MagicMock()
    mock_server.starttls.side_effect = Exception("Unexpected error")
    mock_smtp.return_value.__enter__.return_value = mock_server
    
    result = send_digest_email(sample_jobs)
    
    assert result is False


@patch("notify.emailer.smtplib.SMTP")
def test_send_digest_email_connection_error(mock_smtp, smtp_config, sample_jobs):
    """Test handling of connection errors."""
    mock_smtp.side_effect = ConnectionError("Cannot connect to server")
    
    result = send_digest_email(sample_jobs)
    
    assert result is False


# ============================================================================
# Test: _create_html_digest - HTML Generation
# ============================================================================


def test_create_html_digest_basic_structure(sample_jobs):
    """Test that HTML digest has correct basic structure."""
    html = _create_html_digest(sample_jobs)
    
    assert "<!DOCTYPE html>" in html
    assert "<html>" in html
    assert "</html>" in html
    assert "<body>" in html
    assert "</body>" in html
    assert "Job Digest" in html


def test_create_html_digest_job_count(sample_jobs):
    """Test that HTML includes correct job count."""
    html = _create_html_digest(sample_jobs)
    
    assert "2 new opportunities" in html


def test_create_html_digest_includes_all_jobs(sample_jobs):
    """Test that all jobs are included in HTML."""
    html = _create_html_digest(sample_jobs)
    
    for job in sample_jobs:
        assert job["title"] in html
        assert job["company"] in html
        assert job["location"] in html
        assert job["url"] in html


def test_create_html_digest_score_formatting(sample_jobs):
    """Test that scores are formatted as percentages."""
    html = _create_html_digest(sample_jobs)
    
    # First job: 0.95 * 100 = 95%
    assert "95%" in html
    # Second job: 0.88 * 100 = 88%
    assert "88%" in html


def test_create_html_digest_includes_styling():
    """Test that HTML includes CSS styling."""
    html = _create_html_digest([])
    
    assert "<style>" in html
    assert "font-family" in html
    assert ".job" in html
    assert ".score" in html


def test_create_html_digest_single_job():
    """Test HTML generation with single job."""
    job = {
        "title": "Solo Job",
        "company": "Solo Corp",
        "location": "Anywhere",
        "url": "https://example.com",
        "score": 0.75,
    }
    
    html = _create_html_digest([job])
    
    assert "1 new opportunities" in html
    assert "Solo Job" in html
    assert "75%" in html


def test_create_html_digest_missing_fields():
    """Test HTML generation handles missing job fields gracefully."""
    job = {"score": 0.5}  # Minimal job data
    
    html = _create_html_digest([job])
    
    assert "N/A" in html  # Should use N/A for missing fields
    assert "50%" in html  # Score should still work


def test_create_html_digest_zero_score():
    """Test HTML generation with zero score."""
    job = {
        "title": "Low Match Job",
        "company": "Company",
        "location": "Location",
        "url": "https://example.com",
        "score": 0.0,
    }
    
    html = _create_html_digest([job])
    
    assert "0%" in html


# ============================================================================
# Test: test_email_config - Configuration Testing
# ============================================================================


@patch("notify.emailer.send_digest_email")
def test_test_email_config_calls_send_digest(mock_send):
    """Test that test_email_config calls send_digest_email with test job."""
    mock_send.return_value = True
    
    result = test_email_config()
    
    assert result is True
    mock_send.assert_called_once()
    
    # Check that it was called with a single test job
    args = mock_send.call_args[0]
    jobs = args[0]
    assert len(jobs) == 1
    assert "Test Job" in jobs[0]["title"]


@patch("notify.emailer.send_digest_email")
def test_test_email_config_returns_send_result(mock_send):
    """Test that test_email_config returns result from send_digest_email."""
    mock_send.return_value = False
    
    result = test_email_config()
    
    assert result is False


@patch("notify.emailer.send_digest_email")
def test_test_email_config_test_job_structure(mock_send):
    """Test that test job has expected structure."""
    mock_send.return_value = True
    
    test_email_config()
    
    args = mock_send.call_args[0]
    test_job = args[0][0]
    
    assert "title" in test_job
    assert "company" in test_job
    assert "location" in test_job
    assert "url" in test_job
    assert "score" in test_job
    assert test_job["score"] == 0.95


# ============================================================================
# Test: Edge Cases and Integration
# ============================================================================


def test_send_digest_email_large_job_list(smtp_config):
    """Test with large number of jobs."""
    large_job_list = [
        {
            "title": f"Job {i}",
            "company": f"Company {i}",
            "location": f"Location {i}",
            "url": f"https://example.com/job{i}",
            "score": 0.8 + (i * 0.01),
        }
        for i in range(50)
    ]
    
    html = _create_html_digest(large_job_list)
    
    assert "50 new opportunities" in html
    assert "Job 0" in html
    assert "Job 49" in html


def test_create_html_digest_special_characters():
    """Test HTML generation handles special characters safely."""
    job = {
        "title": "Job with <special> & 'characters\"",
        "company": "Company & Co.",
        "location": "São Paulo",
        "url": "https://example.com",
        "score": 0.9,
    }
    
    html = _create_html_digest([job])
    
    # Should contain the special characters (HTML should handle them)
    assert "&" in html
    assert "São Paulo" in html


def test_send_digest_email_custom_port(monkeypatch, sample_jobs):
    """Test using custom SMTP port."""
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_PORT", "465")
    monkeypatch.setenv("SMTP_USER", "test@example.com")
    monkeypatch.setenv("SMTP_PASS", "password")
    monkeypatch.setenv("DIGEST_TO", "to@example.com")
    
    with patch("notify.emailer.smtplib.SMTP") as mock_smtp:
        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server
        
        send_digest_email(sample_jobs)
        
        mock_smtp.assert_called_once_with("smtp.example.com", 465)


@patch("notify.emailer.smtplib.SMTP")
def test_send_digest_email_html_content_type(mock_smtp, smtp_config, sample_jobs):
    """Test that email uses HTML content type."""
    mock_server = MagicMock()
    mock_smtp.return_value.__enter__.return_value = mock_server
    
    send_digest_email(sample_jobs)
    
    # Get the message that was sent
    call_args = mock_server.send_message.call_args
    msg = call_args[0][0]
    
    # Check that message is multipart/alternative (supports HTML)
    assert msg.get_content_maintype() == "multipart"
    assert msg.get_content_subtype() == "alternative"
