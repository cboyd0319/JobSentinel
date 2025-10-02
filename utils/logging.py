import logging
import os
from rich.console import Console
from rich.logging import RichHandler

# Initialize Rich Console for direct output
console = Console()


def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """Configures logging for the application, using Rich for console output."""
    level = getattr(logging, log_level.upper(), logging.INFO)

    # Create a root logger
    logger = logging.getLogger()
    logger.setLevel(level)

    # Clear existing handlers to prevent duplicate output
    if logger.hasHandlers():
        logger.handlers.clear()

    # RichHandler for console output
    rich_handler = RichHandler(
        console=console,
        show_time=True,
        show_level=True,
        show_path=False,
        markup=True,
    )
    logger.addHandler(rich_handler)

    # Optional: File handler for persistent logs
    log_dir = "data/logs"
    os.makedirs(log_dir, exist_ok=True)
    file_handler = logging.FileHandler(os.path.join(log_dir, "application.log"))
    file_handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger


def get_logger(name: str) -> logging.Logger:
    """Returns a logger instance for a given name."""
    return logging.getLogger(name)


def log_exception(logger: logging.Logger, message: str = "An error occurred"):
    """Log an exception with full traceback."""
    logger.exception(message)


def log_performance(logger: logging.Logger, operation: str, duration: float, extra_info: dict = None):
    """Log performance metrics for operations."""
    info = {"operation": operation, "duration_ms": round(duration * 1000, 2)}
    if extra_info:
        info.update(extra_info)

    logger.info(f"Performance: {operation} completed in {duration:.3f}s", extra=info)


def log_scrape_result(
    logger: logging.Logger,
    company: str,
    jobs_found: int,
    new_jobs: int,
    errors: int = 0,
):
    """Log scraping results in a standardized format."""
    logger.info(
        f"Scrape completed for {company}: {jobs_found} total jobs, {new_jobs} new, {errors} errors",
        extra={
            "company": company,
            "jobs_found": jobs_found,
            "new_jobs": new_jobs,
            "errors": errors,
        },
    )


def log_notification_sent(logger: logging.Logger, notification_type: str, recipient: str, job_count: int):
    """Log notification events."""
    logger.info(
        f"Notification sent: {notification_type} to {recipient} with {job_count} jobs",
        extra={
            "notification_type": notification_type,
            "recipient": recipient,
            "job_count": job_count,
        },
    )
