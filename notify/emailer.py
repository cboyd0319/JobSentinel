"""Email notification module for job digest emails."""

from utils.logging import get_logger

logger = get_logger("emailer")


def send_digest_email(jobs):
    """Send digest email with job listings.

    Args:
        jobs: List of job dictionaries to include in digest
    """
    # TODO: Implement email sending functionality
    # This is a stub - email functionality needs to be implemented
    logger.warning(
        f"Email module not fully implemented - would send digest with {len(jobs)} jobs"
    )
    logger.debug(
        "Email notifications disabled - set EMAIL_* environment variables to enable"
    )
    pass
