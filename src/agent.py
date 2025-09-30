import os
import argparse
import json
import asyncio
from dotenv import load_dotenv

from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn, TimeRemainingColumn
from rich.text import Text

from utils.logging import setup_logging, get_logger, console
from utils.config import config_manager
from utils.errors import ConfigurationException, ScrapingException
from utils.health import health_monitor
from utils.resilience import (
    run_startup_checks,
    db_resilience,
    network_resilience,
    process_resilience,
)

from src.database import (
    get_job_by_hash,
    add_job,
    get_jobs_for_digest,
    mark_jobs_digest_sent,
    mark_job_alert_sent,
    cleanup_old_jobs,
)
from cloud.providers.gcp.cloud_database import init_cloud_db, sync_cloud_db, get_cloud_db_stats
from sources import job_scraper
from sources.concurrent_scraper import scrape_multiple_async_fast  # Import the async scraper
from matchers.rules import score_job
from notify import slack, emailer

# Load environment variables
load_dotenv()

# Setup logging (now uses RichHandler internally)
logger = setup_logging(log_level=os.getenv("LOG_LEVEL", "INFO"))
main_logger = get_logger("agent")


def get_job_board_urls() -> list[str]:
    """Extracts job board URLs from configured companies."""
    companies = config_manager.get_companies()
    urls = [company.url for company in companies]
    return urls


def load_user_prefs():
    """Loads and validates user preferences."""
    try:
        return config_manager.load_config()
    except ConfigurationException as e:
        main_logger.error(f"[bold red]Configuration error:[/bold red] {e}")
        raise
    except Exception as e:
        main_logger.error(f"[bold red]Failed to load configuration:[/bold red] {e}")
        raise


async def process_jobs(jobs, prefs):
    """Scores and alerts for new jobs."""
    immediate_alerts = []
    digest_jobs = []
    processed_count = 0

    filter_config = config_manager.get_filter_config()
    notification_config = config_manager.get_notification_config()

    main_logger.info(f"Processing {len(jobs)} jobs...")

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        TimeRemainingColumn(),
        console=console,
        transient=True,
    ) as progress:
        processing_task = progress.add_task("[cyan]Processing jobs...", total=len(jobs))

        for job in jobs:
            try:
                # Get enhanced scoring with metadata
                result = score_job(job, prefs)

                # Handle both old and new scoring formats
                if len(result) == 3:
                    score, reasons, metadata = result
                    job["score_metadata"] = metadata
                else:
                    # Backward compatibility
                    score, reasons = result
                    job["score_metadata"] = {"scoring_method": "legacy"}

                job["score"] = score
                job["score_reasons"] = reasons

                if score > 0:
                    # Add to database
                    db_job = await add_job(job)
                    processed_count += 1

                    if score >= filter_config.immediate_alert_threshold:
                        immediate_alerts.append(job)
                        # Mark as alert sent
                        await mark_job_alert_sent(db_job.id)
                    else:
                        digest_jobs.append(job)

                    # Enhanced logging with metadata
                    method = job["score_metadata"].get("scoring_method", "unknown")
                    tokens = job["score_metadata"].get("tokens_used", 0)
                    log_msg = f"Processed job: {job['title']} (score: {score:.2f}, method: {method}"
                    if tokens > 0:
                        log_msg += f", tokens: {tokens}"
                    log_msg += ")"
                    main_logger.debug(log_msg)
                else:
                    main_logger.debug(f"Filtered out job: {job['title']} (score: {score:.2f})")

            except Exception as e:
                main_logger.error(f"[bold red]Error processing job {job.get('title', 'Unknown')}:[/bold red] {e}")
            progress.update(processing_task, advance=1)

    # Send immediate Slack alerts
    if immediate_alerts and notification_config.validate_slack():
        try:
            main_logger.info(f"Sending {len(immediate_alerts)} immediate alerts to Slack")
            slack.send_slack_alert(immediate_alerts)
        except Exception as e:
            main_logger.error(f"[bold red]Failed to send Slack alerts:[/bold red] {e}")
    elif immediate_alerts:
        main_logger.warning(f"[yellow]Have {len(immediate_alerts)} high-score jobs but Slack not configured[/yellow]")

    main_logger.info(f"Job processing completed: {processed_count} jobs added to database")


async def send_digest():
    """Sends the daily email digest."""
    main_logger.info("Starting digest generation...")

    try:
        notification_config = config_manager.get_notification_config()

        if not notification_config.validate_email():
            main_logger.warning("[yellow]Email not configured, skipping digest[/yellow]")
            return

        # Get jobs for digest, using the new preference
        filter_config = config_manager.get_filter_config()
        min_score = getattr(filter_config, "digest_min_score", 0.0)  # Safely get the new attribute
        digest_jobs = await get_jobs_for_digest(min_score=min_score, hours_back=24)

        if not digest_jobs:
            main_logger.info("No jobs to include in digest")
            return

        # Convert to dict format expected by emailer
        jobs_data = []
        for job in digest_jobs:
            # Safely parse score_reasons JSON instead of using eval()
            try:
                score_reasons = json.loads(job.score_reasons) if job.score_reasons else []
            except (json.JSONDecodeError, TypeError):
                score_reasons = []
                main_logger.warning(
                    f"[yellow]Could not parse score_reasons for job {job.id}:[/yellow] {job.score_reasons}"
                )

            jobs_data.append(
                {
                    "title": job.title,
                    "url": job.url,
                    "company": job.company,
                    "location": job.location,
                    "score": job.score,
                    "score_reasons": score_reasons,
                }
            )

        # Send digest email
        emailer.send_digest_email(jobs_data)

        # Mark jobs as digest sent
        job_ids = [job.id for job in digest_jobs]
        await mark_jobs_digest_sent(job_ids)

        main_logger.info(f"Digest sent successfully with {len(digest_jobs)} jobs")

    except Exception as e:
        main_logger.error(f"[bold red]Failed to send digest:[/bold red] {e}")
        raise


def test_notifications():
    """Sends a test message to all configured notification channels."""
    main_logger.info("Testing notification channels...")

    notification_config = config_manager.get_notification_config()

    test_job = [
        {
            "title": "Test Security Engineer Position",
            "url": "https://example.com/job/test-123",
            "company": "TestCorp",
            "location": "Remote (US)",
            "score": 0.95,
            "score_reasons": [
                'Title matched "Security Engineer"',
                'Location matched "Remote"',
                'Keyword boost: "Security"',
            ],
        }
    ]

    # Test Slack
    if notification_config.validate_slack():
        try:
            slack.send_slack_alert(test_job)
            main_logger.info("[green]✅ Slack test message sent successfully[/green]")
        except Exception as e:
            main_logger.error(f"[bold red]❌ Slack test failed:[/bold red] {e}")
    else:
        main_logger.warning("[yellow]❌ Slack not configured or invalid webhook URL[/yellow]")

    # Test Email
    if notification_config.validate_email():
        try:
            emailer.send_digest_email(test_job)
            main_logger.info("[green]✅ Email test message sent successfully[/green]")
        except Exception as e:
            main_logger.error(f"[bold red]❌ Email test failed:[/bold red] {e}")
    else:
        main_logger.warning("[yellow]❌ Email not configured or missing required settings[/yellow]")

    main_logger.info("Notification testing completed")


async def cleanup():
    """Perform database cleanup and maintenance."""
    main_logger.info("Starting cleanup tasks...")

    try:
        # Clean up old jobs (configurable, default 90 days)
        cleanup_days = int(os.getenv("CLEANUP_DAYS", "90"))
        deleted_count = await cleanup_old_jobs(cleanup_days)
        main_logger.info(f"Cleanup completed: removed {deleted_count} old jobs")
    except Exception as e:
        main_logger.error(f"[bold red]Cleanup failed:[/bold red] {e}")


def health_check():
    """Perform an interactive system health check."""
    main_logger.info("Starting interactive health check...")
    report = health_monitor.generate_health_report()

    # --- ANSI Colors for printing ---
    # C_OK, C_WARN, C_CRIT, C_END = "\033[92m", "\033[93m", "\033[91m", "\033[0m"

    def print_metric(m):
        status_colors = {
            "ok": "[green]OK[/green]",
            "warning": "[yellow]WARNING[/yellow]",
            "critical": "[bold red]CRITICAL[/bold red]",
        }
        status_text = status_colors.get(m["status"], m["status"].upper())
        console.print(f"  - {m['name']:<20} | Status: {status_text:<25} | {m['message']}")

    console.print("\n[bold blue]--- 🏥 Job Scraper Health Report ---[/bold blue]")
    console.print(f"Overall Status: [bold]{report['overall_status'].upper()}[/bold]")
    console.print("-" * 35)

    for metric in report["metrics"]:
        print_metric(metric)

    console.print("-" * 35)

    # --- Interactive Actions for Critical Issues ---
    critical_metrics = [m for m in report["metrics"] if m["status"] == "critical"]
    if critical_metrics:
        console.print(f"\n[bold red]CRITICAL ISSUES DETECTED:[/bold red]")

        # Check for database corruption issue
        db_integrity_issue = any(
            m["name"] == "database_status" and "Integrity check failed" in m["message"] for m in critical_metrics
        )

        if db_integrity_issue:
            from utils.resilience import db_resilience

            latest_backup = db_resilience._get_latest_backup()
            if latest_backup:
                console.print("Database integrity check failed. A recent backup is available:")
                console.print(f"  -> [cyan]{latest_backup.name}[/cyan]")

                try:
                    response = console.input(
                        "[bold yellow]Attempt to restore from this backup? (y/n):[/bold yellow] "
                    ).lower()
                    if response == "y":
                        console.print("Restoring database...")
                        if db_resilience.restore_from_backup(latest_backup):
                            console.print(f"[green]Database restored successfully.[/green]")
                        else:
                            console.print(f"[bold red]Database restore failed. Check logs for details.[/bold red]")
                    else:
                        console.print("Skipping database restore.")
                except KeyboardInterrupt:
                    console.print("\nOperation cancelled.")
    else:
        console.print(f"\n[green]System is healthy. No critical issues found.[/green]")

    return report


async def main():
    args = parse_args()
    console.print(f"[bold blue]Starting job scraper in {args.mode} mode...[/bold blue]")

    # Initialize unified database (local and cloud)
    await init_unified_db()

    if args.mode == "poll":
        console.print("[cyan]Polling for new jobs...[/cyan]")
        urls = get_job_board_urls()
        if not urls:
            console.print("[yellow]No job board URLs configured. Exiting.[/yellow]")
            return

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            TimeRemainingColumn(),
            console=console,
            transient=True,
        ) as progress:
            scraping_task = progress.add_task("[cyan]Scraping job boards...", total=len(urls))

            results = await scrape_multiple_async_fast(urls, fetch_descriptions=True)

            all_jobs = []
            for result in results:
                if result.success:
                    all_jobs.extend(result.jobs)
                    progress.update(
                        scraping_task,
                        advance=1,
                        description=f"[green]Scraped {result.url} - {len(result.jobs)} jobs[/green]",
                    )
                else:
                    main_logger.error(f"[bold red]Scraping failed for {result.url}:[/bold red] {result.error}")
                    progress.update(scraping_task, advance=1, description=f"[red]Failed {result.url}[/red]")

            console.print(f"[bold green]Found {len(all_jobs)} total jobs.[/bold green]")
            await process_jobs(all_jobs)

    elif args.mode == "digest":
        console.print("[cyan]Generating daily digest...[/cyan]")
        await send_digest()

    elif args.mode == "health":
        console.print("[cyan]Running health check...[/cyan]")
        health_check()

    elif args.mode == "test":
        console.print("[cyan]Running test mode...[/cyan]")
        test_notifications()

    elif args.mode == "cleanup":
        console.print("[cyan]Running cleanup...[/cyan]")
        await cleanup()

    console.print("[bold blue]Job scraper finished.[/bold blue]")


if __name__ == "__main__":
    asyncio.run(main())
