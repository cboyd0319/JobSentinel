"""
Tests for email notification system.

Tests the EmailNotifier class for sending job alerts via email.
"""

import os
from unittest import mock

import pytest

from jsa.notify_email import EmailNotifier, send_job_email


class TestEmailNotifier:
    """Test EmailNotifier class."""

    def test_init_with_environment_variables(self, monkeypatch):
        """Test initialization from environment variables."""
        monkeypatch.setenv("SMTP_HOST", "smtp.test.com")
        monkeypatch.setenv("SMTP_PORT", "587")
        monkeypatch.setenv("SMTP_USER", "test@test.com")
        monkeypatch.setenv("SMTP_PASSWORD", "testpass")
        monkeypatch.setenv("EMAIL_TO", "recipient@test.com")

        notifier = EmailNotifier()

        assert notifier.smtp_host == "smtp.test.com"
        assert notifier.smtp_port == 587
        assert notifier.smtp_user == "test@test.com"
        assert notifier.smtp_password == "testpass"
        assert notifier.to_email == "recipient@test.com"

    def test_init_with_parameters(self):
        """Test initialization with direct parameters."""
        notifier = EmailNotifier(
            smtp_host="smtp.test.com",
            smtp_port=587,
            smtp_user="test@test.com",
            smtp_password="testpass",
            to_email="recipient@test.com",
        )

        assert notifier.smtp_host == "smtp.test.com"
        assert notifier.smtp_port == 587
        assert notifier.smtp_user == "test@test.com"

    def test_init_with_provider_preset(self):
        """Test initialization with provider preset."""
        notifier = EmailNotifier(
            provider="gmail",
            smtp_user="test@gmail.com",
            smtp_password="testpass",
            to_email="recipient@test.com",
        )

        assert notifier.smtp_host == "smtp.gmail.com"
        assert notifier.smtp_port == 587
        assert notifier.use_tls is True

    def test_init_missing_required_fields(self):
        """Test validation of required fields."""
        with pytest.raises(ValueError, match="SMTP host is required"):
            EmailNotifier(smtp_user="test@test.com", smtp_password="pass", to_email="to@test.com")

        with pytest.raises(ValueError, match="SMTP user is required"):
            EmailNotifier(smtp_host="smtp.test.com", smtp_password="pass", to_email="to@test.com")

        with pytest.raises(ValueError, match="SMTP password is required"):
            EmailNotifier(smtp_host="smtp.test.com", smtp_user="test@test.com", to_email="to@test.com")

        with pytest.raises(ValueError, match="Recipient email is required"):
            EmailNotifier(smtp_host="smtp.test.com", smtp_user="test@test.com", smtp_password="pass")

    def test_generate_html_email_single_job(self):
        """Test HTML email generation for single job."""
        notifier = EmailNotifier(
            smtp_host="smtp.test.com",
            smtp_user="test@test.com",
            smtp_password="testpass",
            to_email="recipient@test.com",
        )

        jobs = [
            {
                "title": "Backend Developer",
                "company": "Acme Inc",
                "location": "San Francisco",
                "remote": True,
                "salary_min": 120000,
                "salary_max": 150000,
                "url": "https://example.com/job/123",
                "score": {"overall": 0.85},
            }
        ]

        html = notifier._generate_html_email(jobs, digest=False)

        # Check key elements present
        assert "Backend Developer" in html
        assert "Acme Inc" in html
        assert "San Francisco" in html
        assert "Remote" in html
        assert "$120,000" in html
        assert "$150,000" in html
        assert "85%" in html
        assert "https://example.com/job/123" in html

    def test_generate_html_email_digest(self):
        """Test HTML email generation for digest mode."""
        notifier = EmailNotifier(
            smtp_host="smtp.test.com",
            smtp_user="test@test.com",
            smtp_password="testpass",
            to_email="recipient@test.com",
        )

        jobs = [
            {
                "title": "Job 1",
                "company": "Company 1",
                "location": "Location 1",
                "url": "https://example.com/1",
                "score": {"overall": 0.75},
            },
            {
                "title": "Job 2",
                "company": "Company 2",
                "location": "Location 2",
                "url": "https://example.com/2",
                "score": {"overall": 0.82},
            },
        ]

        html = notifier._generate_html_email(jobs, digest=True)

        # Check both jobs present
        assert "Job 1" in html
        assert "Job 2" in html
        assert "Company 1" in html
        assert "Company 2" in html
        assert "You have 2 new job matches" in html

    def test_generate_text_email(self):
        """Test plain text email generation."""
        notifier = EmailNotifier(
            smtp_host="smtp.test.com",
            smtp_user="test@test.com",
            smtp_password="testpass",
            to_email="recipient@test.com",
        )

        jobs = [
            {
                "title": "Frontend Developer",
                "company": "Tech Corp",
                "location": "Remote",
                "remote": True,
                "url": "https://example.com/job/456",
                "score": {"overall": 0.78},
            }
        ]

        text = notifier._generate_text_email(jobs, digest=False)

        # Check key elements present
        assert "Frontend Developer" in text
        assert "Tech Corp" in text
        assert "Remote" in text
        assert "78%" in text
        assert "https://example.com/job/456" in text
        assert "JobSentinel" in text

    @mock.patch("jsa.notify_email.smtplib.SMTP")
    def test_send_email_success(self, mock_smtp):
        """Test successful email sending."""
        # Mock SMTP server
        mock_server = mock.MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server

        notifier = EmailNotifier(
            smtp_host="smtp.test.com",
            smtp_user="test@test.com",
            smtp_password="testpass",
            to_email="recipient@test.com",
        )

        jobs = [
            {
                "title": "Test Job",
                "company": "Test Company",
                "location": "Test Location",
                "url": "https://example.com/test",
                "score": {"overall": 0.80},
            }
        ]

        result = notifier.send_job_alert(jobs)

        assert result is True
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once_with("test@test.com", "testpass")
        mock_server.send_message.assert_called_once()

    @mock.patch("jsa.notify_email.smtplib.SMTP")
    def test_send_email_auth_failure(self, mock_smtp):
        """Test email sending with authentication failure."""
        import smtplib

        # Mock SMTP server to raise auth error
        mock_server = mock.MagicMock()
        mock_server.login.side_effect = smtplib.SMTPAuthenticationError(535, b"Authentication failed")
        mock_smtp.return_value.__enter__.return_value = mock_server

        notifier = EmailNotifier(
            smtp_host="smtp.test.com",
            smtp_user="test@test.com",
            smtp_password="wrongpass",
            to_email="recipient@test.com",
        )

        jobs = [{"title": "Test", "company": "Test", "location": "Test", "url": "http://test", "score": {"overall": 0.8}}]

        result = notifier.send_job_alert(jobs)

        assert result is False

    @mock.patch("jsa.notify_email.smtplib.SMTP")
    def test_send_email_no_jobs(self, mock_smtp):
        """Test email sending with no jobs."""
        notifier = EmailNotifier(
            smtp_host="smtp.test.com",
            smtp_user="test@test.com",
            smtp_password="testpass",
            to_email="recipient@test.com",
        )

        result = notifier.send_job_alert([])

        assert result is False
        mock_smtp.assert_not_called()

    @mock.patch("jsa.notify_email.smtplib.SMTP")
    def test_test_connection_success(self, mock_smtp):
        """Test connection testing with success."""
        mock_server = mock.MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server

        notifier = EmailNotifier(
            smtp_host="smtp.test.com",
            smtp_user="test@test.com",
            smtp_password="testpass",
            to_email="recipient@test.com",
        )

        result = notifier.test_connection()

        assert result is True
        mock_server.starttls.assert_called_once()
        mock_server.login.assert_called_once()

    @mock.patch("jsa.notify_email.smtplib.SMTP")
    def test_test_connection_failure(self, mock_smtp):
        """Test connection testing with failure."""
        import smtplib

        mock_server = mock.MagicMock()
        mock_server.login.side_effect = smtplib.SMTPAuthenticationError(535, b"Auth failed")
        mock_smtp.return_value.__enter__.return_value = mock_server

        notifier = EmailNotifier(
            smtp_host="smtp.test.com",
            smtp_user="test@test.com",
            smtp_password="wrongpass",
            to_email="recipient@test.com",
        )

        result = notifier.test_connection()

        assert result is False

    def test_provider_configs(self):
        """Test that all provider configs are valid."""
        for provider, config in EmailNotifier.SMTP_CONFIGS.items():
            assert "host" in config
            assert "port" in config
            assert "tls" in config
            assert "help_url" in config
            assert isinstance(config["host"], str)
            assert isinstance(config["port"], int)
            assert isinstance(config["tls"], bool)
            assert config["help_url"].startswith("http")

    @mock.patch("jsa.notify_email.EmailNotifier")
    def test_send_job_email_convenience_function(self, mock_notifier_class):
        """Test convenience function for sending emails."""
        mock_notifier = mock.MagicMock()
        mock_notifier.send_job_alert.return_value = True
        mock_notifier_class.return_value = mock_notifier

        jobs = [{"title": "Test", "company": "Test", "location": "Test", "url": "http://test", "score": {"overall": 0.8}}]

        result = send_job_email(jobs, provider="gmail", digest=True)

        assert result is True
        mock_notifier_class.assert_called_once_with(provider="gmail")
        mock_notifier.send_job_alert.assert_called_once_with(jobs, digest=True)


class TestEmailSecurity:
    """Test security aspects of email notifications."""

    def test_password_not_in_logs(self, caplog):
        """Test that password is not logged."""
        import logging

        caplog.set_level(logging.DEBUG)

        notifier = EmailNotifier(
            smtp_host="smtp.test.com",
            smtp_user="test@test.com",
            smtp_password="supersecret",
            to_email="recipient@test.com",
        )

        # Check that password doesn't appear in logs
        for record in caplog.records:
            assert "supersecret" not in record.message

    def test_tls_enabled_by_default(self):
        """Test that TLS is enabled by default."""
        notifier = EmailNotifier(
            smtp_host="smtp.test.com",
            smtp_user="test@test.com",
            smtp_password="testpass",
            to_email="recipient@test.com",
        )

        assert notifier.use_tls is True

    def test_app_password_guidance_in_error(self):
        """Test that error messages mention app passwords."""
        with pytest.raises(ValueError) as exc_info:
            EmailNotifier(
                smtp_host="smtp.test.com",
                smtp_user="test@test.com",
                to_email="recipient@test.com",
            )

        error_message = str(exc_info.value)
        assert "app password" in error_message.lower()
