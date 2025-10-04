"""Email notification module for job digest emails."""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Optional
from utils.logging import get_logger

logger = get_logger("emailer")


def send_digest_email(jobs: List[Dict]) -> bool:
    """
    Send digest email with job listings.

    Args:
        jobs: List of job dictionaries to include in digest

    Returns:
        bool: True if email sent successfully, False otherwise

    Environment Variables Required:
        SMTP_HOST: SMTP server hostname (e.g., smtp.gmail.com)
        SMTP_PORT: SMTP server port (e.g., 587)
        SMTP_USER: SMTP username/email
        SMTP_PASS: SMTP password or app-specific password
        DIGEST_TO: Recipient email address
    """
    # Check if email is configured
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = os.getenv("SMTP_PORT", "587")
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    digest_to = os.getenv("DIGEST_TO")

    if not all([smtp_host, smtp_user, smtp_pass, digest_to]):
        logger.info(
            "Email not configured - set SMTP_* environment variables to enable email notifications"
        )
        return False

    if not jobs:
        logger.debug("No jobs to send in digest email")
        return False

    try:
        # Create message
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Job Digest - {len(jobs)} New Opportunities"
        msg["From"] = smtp_user
        msg["To"] = digest_to

        # Create HTML content
        html_content = _create_html_digest(jobs)
        html_part = MIMEText(html_content, "html")
        msg.attach(html_part)

        # Send email
        with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)

        logger.info(f"Successfully sent digest email with {len(jobs)} jobs to {digest_to}")
        return True

    except smtplib.SMTPAuthenticationError:
        logger.error(
            "SMTP authentication failed - check SMTP_USER and SMTP_PASS credentials"
        )
        return False
    except smtplib.SMTPException as e:
        logger.error(f"SMTP error sending digest email: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending digest email: {e}")
        return False


def _create_html_digest(jobs: List[Dict]) -> str:
    """
    Create HTML email content for job digest.

    Args:
        jobs: List of job dictionaries

    Returns:
        HTML string
    """
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4CAF50; color: white; padding: 20px; text-align: center; }
            .job { border: 1px solid #ddd; margin: 15px 0; padding: 15px; border-radius: 5px; }
            .job-title { font-size: 18px; font-weight: bold; color: #2196F3; margin-bottom: 5px; }
            .job-company { color: #666; font-size: 14px; margin-bottom: 10px; }
            .job-details { font-size: 14px; color: #555; }
            .score { background: #4CAF50; color: white; padding: 5px 10px; border-radius: 3px; display: inline-block; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
            a { color: #2196F3; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔔 Job Digest</h1>
                <p>Found {count} new opportunities matching your criteria</p>
            </div>
    """.format(count=len(jobs))

    # Add each job
    for job in jobs:
        score = job.get("score", 0) * 100
        html += f"""
            <div class="job">
                <div class="job-title"><a href="{job.get('url', '#')}">{job.get('title', 'N/A')}</a></div>
                <div class="job-company">{job.get('company', 'N/A')} - {job.get('location', 'N/A')}</div>
                <div class="job-details">
                    <span class="score">Match: {score:.0f}%</span>
                </div>
            </div>
        """

    html += """
            <div class="footer">
                <p>This is an automated digest from your job scraper.</p>
                <p>To stop receiving these emails, remove SMTP configuration from .env</p>
            </div>
        </div>
    </body>
    </html>
    """

    return html


def test_email_config() -> bool:
    """
    Test email configuration by sending a test email.

    Returns:
        bool: True if test successful, False otherwise
    """
    test_job = {
        "title": "Test Job - Email Configuration Test",
        "company": "Test Company",
        "location": "Remote",
        "url": "https://example.com",
        "score": 0.95
    }

    logger.info("Sending test email...")
    return send_digest_email([test_job])
