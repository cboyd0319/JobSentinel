"""
Email notification system for JobSentinel.

Provides simple, secure email notifications as an alternative to Slack.
More accessible for non-technical users who may not have Slack.

Features:
- Gmail support (most common)
- Outlook/Office365 support
- Generic SMTP support
- HTML email templates
- Automatic batching (digest mode)
- App passwords guide
- Zero-knowledge friendly setup

Security:
- Uses app passwords (not main password)
- TLS encryption
- No credential storage in code
- Environment variable based

References:
- RFC 5321 (SMTP) | https://www.rfc-editor.org/rfc/rfc5321 | High | Email protocol
- RFC 2045-2049 (MIME) | https://www.rfc-editor.org/rfc/rfc2045 | High | Email format
- OWASP ASVS 5.0 | https://owasp.org/www-project-application-security-verification-standard/ | High | Secure communication

Author: JobSentinel Team
License: MIT
"""

import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import Any, Optional

from jsa.logging import get_logger

logger = get_logger(__name__, "notify_email")


class EmailNotifier:
    """Send email notifications about job matches."""

    # Common SMTP configurations
    SMTP_CONFIGS = {
        "gmail": {
            "host": "smtp.gmail.com",
            "port": 587,
            "tls": True,
            "help_url": "https://support.google.com/accounts/answer/185833",
        },
        "outlook": {
            "host": "smtp-mail.outlook.com",
            "port": 587,
            "tls": True,
            "help_url": "https://support.microsoft.com/en-us/account-billing/using-app-passwords-with-apps-that-don-t-support-two-step-verification-5896ed9b-4263-e681-128a-a6f2979a7944",
        },
        "office365": {
            "host": "smtp.office365.com",
            "port": 587,
            "tls": True,
            "help_url": "https://support.microsoft.com/en-us/office/pop-imap-and-smtp-settings-8361e398-8af4-4e97-b147-6c6c4ac95353",
        },
        "yahoo": {
            "host": "smtp.mail.yahoo.com",
            "port": 587,
            "tls": True,
            "help_url": "https://help.yahoo.com/kb/generate-third-party-passwords-sln15241.html",
        },
    }

    def __init__(
        self,
        smtp_host: str | None = None,
        smtp_port: int | None = None,
        smtp_user: str | None = None,
        smtp_password: str | None = None,
        from_email: str | None = None,
        to_email: str | None = None,
        use_tls: bool = True,
        provider: str | None = None,
    ) -> None:
        """Initialize email notifier.

        Args:
            smtp_host: SMTP server hostname
            smtp_port: SMTP server port
            smtp_user: SMTP username (usually email)
            smtp_password: SMTP password (app password recommended)
            from_email: Sender email address
            to_email: Recipient email address
            use_tls: Whether to use TLS encryption
            provider: Preset provider (gmail, outlook, office365, yahoo)
        """
        # Load from environment if not provided
        self.smtp_host = smtp_host or os.getenv("SMTP_HOST")
        self.smtp_port = smtp_port or int(os.getenv("SMTP_PORT", "587"))
        self.smtp_user = smtp_user or os.getenv("SMTP_USER")
        self.smtp_password = smtp_password or os.getenv("SMTP_PASSWORD")
        self.from_email = from_email or os.getenv("EMAIL_FROM") or self.smtp_user
        self.to_email = to_email or os.getenv("EMAIL_TO")
        self.use_tls = use_tls

        # Apply provider preset if specified
        if provider and provider.lower() in self.SMTP_CONFIGS:
            config = self.SMTP_CONFIGS[provider.lower()]
            self.smtp_host = self.smtp_host or config["host"]
            self.smtp_port = self.smtp_port or config["port"]
            self.use_tls = config["tls"]

        # Validate configuration
        self._validate_config()

    def _validate_config(self) -> None:
        """Validate email configuration.

        Raises:
            ValueError: If configuration is invalid
        """
        if not self.smtp_host:
            raise ValueError(
                "SMTP host is required. Set SMTP_HOST environment variable or pass smtp_host parameter."
            )

        if not self.smtp_user:
            raise ValueError(
                "SMTP user is required. Set SMTP_USER environment variable or pass smtp_user parameter."
            )

        if not self.smtp_password:
            raise ValueError(
                "SMTP password is required. Set SMTP_PASSWORD environment variable or pass smtp_password parameter.\n"
                "\nFor security, use an app password instead of your main password:\n"
                "- Gmail: https://support.google.com/accounts/answer/185833\n"
                "- Outlook: https://support.microsoft.com/account-billing/using-app-passwords"
            )

        if not self.to_email:
            raise ValueError(
                "Recipient email is required. Set EMAIL_TO environment variable or pass to_email parameter."
            )

        logger.debug(f"Email notifier configured: {self.smtp_host}:{self.smtp_port}")

    def send_job_alert(
        self,
        jobs: list[dict[str, Any]],
        subject: str | None = None,
        digest: bool = False,
    ) -> bool:
        """Send email alert for job matches.

        Args:
            jobs: List of job dictionaries with details
            subject: Email subject (optional, auto-generated)
            digest: Whether to send as digest (batch multiple jobs)

        Returns:
            True if email sent successfully, False otherwise
        """
        if not jobs:
            logger.warning("No jobs to send in email alert")
            return False

        # Generate subject
        if not subject:
            if digest:
                subject = f"🎯 JobSentinel: {len(jobs)} New Job Matches"
            else:
                job = jobs[0]
                subject = f"🎯 New Job Match: {job.get('title', 'Unknown')} at {job.get('company', 'Unknown')}"

        # Generate email body
        html_body = self._generate_html_email(jobs, digest)
        text_body = self._generate_text_email(jobs, digest)

        # Send email
        return self._send_email(subject, html_body, text_body)

    def _generate_html_email(self, jobs: list[dict[str, Any]], digest: bool) -> str:
        """Generate HTML email body.

        Args:
            jobs: List of job dictionaries
            digest: Whether this is a digest email

        Returns:
            HTML email body
        """
        html_parts = [
            "<!DOCTYPE html>",
            "<html>",
            "<head>",
            '<meta charset="utf-8">',
            "<style>",
            'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }',
            ".container { max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }",
            ".header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px 20px; text-align: center; }",
            ".header h1 { margin: 0; font-size: 28px; }",
            ".header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.9; }",
            ".job-card { padding: 20px; border-bottom: 1px solid #e5e7eb; }",
            ".job-card:last-child { border-bottom: none; }",
            ".job-title { font-size: 20px; font-weight: bold; color: #1f2937; margin: 0 0 8px 0; }",
            ".job-company { font-size: 16px; color: #3b82f6; margin: 0 0 12px 0; }",
            ".job-details { display: flex; gap: 15px; flex-wrap: wrap; margin: 12px 0; }",
            ".job-detail { font-size: 14px; color: #6b7280; }",
            ".job-detail strong { color: #374151; }",
            ".job-score { display: inline-block; background: #22c55e; color: white; padding: 4px 12px; border-radius: 12px; font-size: 14px; font-weight: bold; }",
            ".job-link { display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; margin-top: 12px; }",
            ".job-link:hover { background: #2563eb; }",
            ".footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; background-color: #f9fafb; }",
            ".footer a { color: #3b82f6; text-decoration: none; }",
            "</style>",
            "</head>",
            "<body>",
            '<div class="container">',
            '<div class="header">',
            "<h1>🎯 JobSentinel</h1>",
        ]

        if digest:
            html_parts.append(f"<p>You have {len(jobs)} new job matches!</p>")
        else:
            html_parts.append("<p>New job match found!</p>")

        html_parts.append("</div>")

        # Add job cards
        for job in jobs:
            score = job.get("score", {}).get("overall", 0) * 100
            html_parts.extend(
                [
                    '<div class="job-card">',
                    f'<h2 class="job-title">{job.get("title", "Unknown Position")}</h2>',
                    f'<p class="job-company">📍 {job.get("company", "Unknown Company")}</p>',
                    '<div class="job-details">',
                    f'<span class="job-detail"><strong>Location:</strong> {job.get("location", "Not specified")}</span>',
                ]
            )

            if job.get("remote"):
                html_parts.append('<span class="job-detail"><strong>🏠 Remote</strong></span>')

            if job.get("salary_min") and job.get("salary_max"):
                html_parts.append(
                    f'<span class="job-detail"><strong>Salary:</strong> ${job["salary_min"]:,} - ${job["salary_max"]:,}</span>'
                )

            html_parts.extend(
                [
                    "</div>",
                    f'<span class="job-score">Match: {score:.0f}%</span>',
                    f'<br><a href="{job.get("url", "#")}" class="job-link">View Job →</a>',
                    "</div>",
                ]
            )

        # Footer
        html_parts.extend(
            [
                '<div class="footer">',
                '<p>Sent by <a href="https://github.com/cboyd0319/JobSentinel">JobSentinel</a></p>',
                "<p>100% Local • 100% Private • 100% Free</p>",
                "</div>",
                "</div>",
                "</body>",
                "</html>",
            ]
        )

        return "\n".join(html_parts)

    def _generate_text_email(self, jobs: list[dict[str, Any]], digest: bool) -> str:
        """Generate plain text email body.

        Args:
            jobs: List of job dictionaries
            digest: Whether this is a digest email

        Returns:
            Plain text email body
        """
        lines = [
            "=" * 70,
            "🎯 JobSentinel Job Alert",
            "=" * 70,
            "",
        ]

        if digest:
            lines.append(f"You have {len(jobs)} new job matches!")
        else:
            lines.append("New job match found!")

        lines.append("")

        for i, job in enumerate(jobs, 1):
            score = job.get("score", {}).get("overall", 0) * 100

            lines.extend(
                [
                    "-" * 70,
                    f"Job {i} of {len(jobs)}",
                    "-" * 70,
                    f"Title: {job.get('title', 'Unknown Position')}",
                    f"Company: {job.get('company', 'Unknown Company')}",
                    f"Location: {job.get('location', 'Not specified')}",
                ]
            )

            if job.get("remote"):
                lines.append("Remote: Yes 🏠")

            if job.get("salary_min") and job.get("salary_max"):
                lines.append(f"Salary: ${job['salary_min']:,} - ${job['salary_max']:,}")

            lines.extend(
                [
                    f"Match Score: {score:.0f}%",
                    f"Link: {job.get('url', 'Not available')}",
                    "",
                ]
            )

        lines.extend(
            [
                "=" * 70,
                "Sent by JobSentinel",
                "100% Local • 100% Private • 100% Free",
                "https://github.com/cboyd0319/JobSentinel",
                "=" * 70,
            ]
        )

        return "\n".join(lines)

    def _send_email(self, subject: str, html_body: str, text_body: str) -> bool:
        """Send email via SMTP.

        Args:
            subject: Email subject
            html_body: HTML email body
            text_body: Plain text email body

        Returns:
            True if sent successfully, False otherwise
        """
        try:
            # Create message
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = self.to_email
            msg["X-Mailer"] = "JobSentinel v0.6.1"

            # Attach parts (plain text first, then HTML)
            msg.attach(MIMEText(text_body, "plain", "utf-8"))
            msg.attach(MIMEText(html_body, "html", "utf-8"))

            # Send email
            logger.debug(f"Connecting to SMTP server {self.smtp_host}:{self.smtp_port}")

            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                if self.use_tls:
                    server.starttls()
                    logger.debug("TLS enabled")

                server.login(self.smtp_user, self.smtp_password)
                logger.debug("SMTP authentication successful")

                server.send_message(msg)
                logger.info(f"Email sent successfully to {self.to_email}")

            return True

        except smtplib.SMTPAuthenticationError as e:
            logger.error(f"SMTP authentication failed: {e}")
            logger.error(
                "Tip: Use an app password instead of your main password.\n"
                "Gmail: https://support.google.com/accounts/answer/185833\n"
                "Outlook: https://support.microsoft.com/account-billing/using-app-passwords"
            )
            return False

        except smtplib.SMTPException as e:
            logger.error(f"SMTP error: {e}")
            return False

        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False

    def test_connection(self) -> bool:
        """Test SMTP connection and authentication.

        Returns:
            True if connection successful, False otherwise
        """
        try:
            logger.info(f"Testing SMTP connection to {self.smtp_host}:{self.smtp_port}")

            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as server:
                if self.use_tls:
                    server.starttls()
                    logger.debug("TLS enabled")

                server.login(self.smtp_user, self.smtp_password)
                logger.info("✓ SMTP connection test successful")

            return True

        except smtplib.SMTPAuthenticationError:
            logger.error("✗ SMTP authentication failed")
            logger.error(
                "\nTroubleshooting:\n"
                "1. Check your username and password\n"
                "2. Use an app password (not your main password)\n"
                "3. Enable 'less secure apps' if required\n"
                "\nApp password guides:\n"
                "- Gmail: https://support.google.com/accounts/answer/185833\n"
                "- Outlook: https://support.microsoft.com/account-billing/using-app-passwords"
            )
            return False

        except smtplib.SMTPException as e:
            logger.error(f"✗ SMTP error: {e}")
            return False

        except Exception as e:
            logger.error(f"✗ Connection test failed: {e}")
            return False


# Convenience function for quick email sending
def send_job_email(
    jobs: list[dict[str, Any]],
    provider: str = "gmail",
    digest: bool = False,
) -> bool:
    """Send job alert email (convenience function).

    Args:
        jobs: List of job dictionaries
        provider: Email provider (gmail, outlook, office365, yahoo)
        digest: Whether to send as digest

    Returns:
        True if sent successfully, False otherwise

    Example:
        >>> jobs = [{"title": "Backend Developer", "company": "Acme Inc", ...}]
        >>> send_job_email(jobs, provider="gmail")
    """
    try:
        notifier = EmailNotifier(provider=provider)
        return notifier.send_job_alert(jobs, digest=digest)
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        return False
