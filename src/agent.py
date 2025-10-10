import argparse
import asyncio
import json
import os

from dotenv import load_dotenv
from matchers.rules import score_job
from notify import slack
from rich.progress import (
    BarColumn,
    Progress,
    SpinnerColumn,
    TaskProgressColumn,
    TextColumn,
    TimeRemainingColumn,
)
from sources.concurrent_scraper import (  # Import the async scraper
    scrape_multiple_async_fast,
)
from utils.cache import job_cache
from utils.config import config_manager
from utils.errors import ConfigurationException
from utils.health import health_monitor
from utils.logging import console, get_logger, setup_logging

from src.database import (
    add_job,
    cleanup_old_jobs,
    get_jobs_for_digest,
    mark_jobs_alert_sent_batch,
    mark_jobs_digest_sent,
)
from src.unified_database import init_unified_db

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
    """Scores and alerts for new jobs with parallel processing."""
    immediate_alerts = []
    digest_jobs = []
    processed_count = 0
    filter_config = config_manager.get_filter_config()
    notification_config = config_manager.get_notification_config()

    main_logger.info(f"Processing {len(jobs)} jobs in parallel...")

    # Control concurrency to avoid overwhelming system
    max_concurrent = int(os.getenv("MAX_CONCURRENT_JOBS", "50"))
    semaphore = asyncio.Semaphore(max_concurrent)

    async def process_single_job(job, job_index):
        """Process a single job with scoring and classification."""
        async with semaphore:
            try:
                # Check cache for duplicates (fast in-memory check)
                if job_cache.is_duplicate(job):
                    main_logger.debug(
                        f"Skipping duplicate job (cached): {job.get('title', 'Unknown')}"
                    )
                    return {
                        "job": job,
                        "success": False,
                        "duplicate": True,
                        "index": job_index,
                    }

                # Score job in thread pool (CPU-bound operation)
                result = await asyncio.to_thread(score_job, job, prefs)

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

                    # Enhanced logging with metadata
                    method = job["score_metadata"].get("scoring_method", "unknown")
                    tokens = job["score_metadata"].get("tokens_used", 0)
                    log_msg = f"Processed job: {job['title']} (score: {score:.2f}, method: {method}"
                    if tokens > 0:
                        log_msg += f", tokens: {tokens}"
                    log_msg += ")"
                    main_logger.debug(log_msg)

                    return {
                        "job": job,
                        "db_job": db_job,
                        "score": score,
                        "category": (
                            "alert"
                            if score >= filter_config.immediate_alert_threshold
                            else "digest"
                        ),
                        "index": job_index,
                        "success": True,
                    }
                else:
                    main_logger.debug(f"Filtered out job: {job['title']} (score: {score:.2f})")
                    return {
                        "job": job,
                        "score": score,
                        "success": False,
                        "index": job_index,
                    }

            except Exception as e:
                main_logger.error(
                    f"[bold red]Error processing job {job.get('title', 'Unknown')}:[/bold red] {e}"
                )
                return {
                    "job": job,
                    "error": str(e),
                    "success": False,
                    "index": job_index,
                }

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

        # Process all jobs concurrently
        tasks = [process_single_job(job, i) for i, job in enumerate(jobs)]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Collect results
        alert_job_ids = []
        for result in results:
            if isinstance(result, Exception):
                main_logger.error(f"Job processing failed with exception: {result}")
                continue

            if result.get("success"):
                processed_count += 1
                if result["category"] == "alert":
                    immediate_alerts.append(result["job"])
                    alert_job_ids.append(result["db_job"].id)
                else:
                    digest_jobs.append(result["job"])

            progress.update(processing_task, advance=1)

    # Batch mark jobs as alert sent
    if alert_job_ids:
        try:
            await mark_jobs_alert_sent_batch(alert_job_ids)
        except Exception as e:
            main_logger.error(f"Failed to batch mark alerts: {e}")

    # Send immediate Slack alerts
    if immediate_alerts and notification_config.validate_slack():
        try:
            main_logger.info(f"Sending {len(immediate_alerts)} immediate alerts to Slack")
            slack.send_slack_alert(immediate_alerts)
        except Exception as e:
            main_logger.error(f"[bold red]Failed to send Slack alerts:[/bold red] {e}")
    elif immediate_alerts:
        main_logger.warning(
            f"[yellow]Have {len(immediate_alerts)} high-score jobs but Slack not configured[/yellow]"
        )

    main_logger.info(f"Job processing completed: {processed_count} jobs added to database")


async def send_digest():
    """Sends the daily digest."""
    main_logger.info("Starting digest generation...")

    try:
        notification_config = config_manager.get_notification_config()

        # Get jobs for digest
        filter_config = config_manager.get_filter_config()
        min_score = getattr(filter_config, "digest_min_score", 0.0)  # Safely get the new attribute
        digest_jobs = await get_jobs_for_digest(min_score=min_score, hours_back=24)

        if not digest_jobs:
            main_logger.info("No jobs to include in digest")
            return

        jobs_data = []
        for job in digest_jobs:
            try:
                score_reasons = json.loads(job.score_reasons) if job.score_reasons else []
            except (json.JSONDecodeError, TypeError):
                score_reasons = []
                main_logger.warning(
                    f"[yellow]Could not parse score_reasons for job {job.id}:[/yellow] {job.score_reasons}"
                )

            jobs_data.append(
                {
                    "id": job.id,
                    "title": job.title,
                    "url": job.url,
                    "company": job.company,
                    "location": job.location,
                    "score": job.score,
                    "score_reasons": score_reasons,
                }
            )

        # Send digest to Slack
        if notification_config.validate_slack():
            try:
                main_logger.info(f"Sending digest with {len(jobs_data)} jobs to Slack")
                slack.send_slack_alert(
                    jobs_data, custom_message=slack.format_digest_for_slack(jobs_data)
                )
            except Exception as e:
                main_logger.error(f"[bold red]Failed to send Slack digest:[/bold red] {e}")

        # Mark jobs as digest sent
        job_ids = [job.id for job in digest_jobs]
        await mark_jobs_digest_sent(job_ids)

        main_logger.info(f"Digest processed successfully with {len(digest_jobs)} jobs")

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
            main_logger.info("[green]Slack test message sent successfully[/green]")
        except Exception as e:
            main_logger.error(f"[bold red]Slack test failed:[/bold red] {e}")
    else:
        main_logger.warning("[yellow]Slack not configured or invalid webhook URL[/yellow]")

    # Email removed - skip email test
    main_logger.warning("[yellow]Email functionality removed - skipping email test[/yellow]")

    main_logger.info("Notification testing completed")


async def cleanup():
    """Perform database cleanup and maintenance."""
    main_logger.info("Starting cleanup tasks...")

    try:
        # Clean up old jobs (configurable, default 90 days)
        cleanup_days_str = os.getenv("CLEANUP_DAYS", "90")
        try:
            cleanup_days = int(cleanup_days_str)
            if cleanup_days < 1:
                main_logger.warning(f"Invalid CLEANUP_DAYS value: {cleanup_days}, using default 90")
                cleanup_days = 90
        except ValueError:
            main_logger.warning(f"Invalid CLEANUP_DAYS value: {cleanup_days_str}, using default 90")
            cleanup_days = 90

        deleted_count = await cleanup_old_jobs(cleanup_days)
        main_logger.info(f"Cleanup completed: removed {deleted_count} old jobs")

        # Clean up old cloud backups (configurable, default 30 days)
        backup_retention_str = os.getenv("BACKUP_RETENTION_DAYS", "30")
        try:
            backup_retention = int(backup_retention_str)
            if backup_retention < 1:
                main_logger.warning(
                    f"Invalid BACKUP_RETENTION_DAYS value: {backup_retention}, using default 30"
                )
                backup_retention = 30
        except ValueError:
            main_logger.warning(
                f"Invalid BACKUP_RETENTION_DAYS value: {backup_retention_str}, using default 30"
            )
            backup_retention = 30

        from cloud.providers.gcp.cloud_database import cleanup_old_backups

        backup_deleted = await cleanup_old_backups(backup_retention)
        main_logger.info(f"Backup cleanup completed: removed {backup_deleted} old backups")

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

    console.print("\n[bold blue]--- Job Scraper Health Report ---[/bold blue]")
    console.print(f"Overall Status: [bold]{report['overall_status'].upper()}[/bold]")
    console.print("-" * 35)

    for metric in report["metrics"]:
        print_metric(metric)

    console.print("-" * 35)

    # --- Interactive Actions for Critical Issues ---
    critical_metrics = [m for m in report["metrics"] if m["status"] == "critical"]
    if critical_metrics:
        console.print("\n[bold red]CRITICAL ISSUES DETECTED:[/bold red]")

        # Check for database corruption issue
        db_integrity_issue = any(
            m["name"] == "database_status" and "Integrity check failed" in m["message"]
            for m in critical_metrics
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
                            console.print("[green]Database restored successfully.[/green]")
                        else:
                            console.print(
                                "[bold red]Database restore failed. Check logs for details.[/bold red]"
                            )
                    else:
                        console.print("Skipping database restore.")
                except KeyboardInterrupt:
                    console.print("\nOperation cancelled.")
    else:
        console.print("\n[green]System is healthy. No critical issues found.[/green]")

    return report


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Job Scraper Agent")
    parser.add_argument(
        "--mode",
        choices=["poll", "digest", "health", "test", "cleanup"],
        default="poll",
        help="Run mode (default: poll)",
    )
    return parser.parse_args()


async def main():
    args = parse_args()
    console.print(f"[bold blue]Starting job scraper in {args.mode} mode...[/bold blue]")

    # Self-healing state
    scraper_failures = {}
    FAILURE_THRESHOLD = 3

    # Run self-healing checks before starting
    enable_self_healing = os.getenv("ENABLE_SELF_HEALING", "true").lower() == "true"
    if enable_self_healing:
        try:
            from utils.self_healing import run_self_healing_check

            healing_results = await run_self_healing_check()
            if healing_results["actions_taken"]:
                main_logger.info(
                    f"Self-healing actions taken: {len(healing_results['actions_taken'])}"
                )
        except Exception as e:
            main_logger.warning(f"Self-healing check failed: {e}")

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

            # Add timeout to scraping operations (5 minutes per company)
            timeout_seconds = int(os.getenv("SCRAPER_TIMEOUT", "300"))
            try:
                results = await asyncio.wait_for(
                    scrape_multiple_async_fast(urls, fetch_descriptions=True),
                    timeout=timeout_seconds,
                )
            except TimeoutError:
                main_logger.error(
                    f"[bold red]Scraping timed out after {timeout_seconds} seconds[/bold red]"
                )
                console.print(
                    f"[bold red]Scraping operation timed out after {timeout_seconds}s[/bold red]"
                )
                return

            all_jobs = []
            for result in results:
                if result.success:
                    all_jobs.extend(result.jobs)
                    scraper_failures[result.url] = 0  # Reset failure count on success
                    progress.update(
                        scraping_task,
                        advance=1,
                        description=f"[green]Scraped {result.url} - {len(result.jobs)} jobs[/green]",
                    )
                else:
                    main_logger.error(
                        f"[bold red]Scraping failed for {result.url}:[/bold red] {result.error}"
                    )
                    scraper_failures[result.url] = scraper_failures.get(result.url, 0) + 1
                    progress.update(
                        scraping_task,
                        advance=1,
                        description=f"[red]Failed {result.url}[/red]",
                    )
                    # Self-healing: if a scraper fails too many times, try the PlaywrightScraper
                    if scraper_failures.get(result.url, 0) >= FAILURE_THRESHOLD:
                        main_logger.warning(
                            f"Scraper for {result.url} has failed {scraper_failures[result.url]} times. Attempting fallback..."
                        )
                        try:
                            from sources.playwright_scraper import PlaywrightScraper

                            fallback_scraper = PlaywrightScraper()
                            fallback_jobs = await fallback_scraper.scrape(result.url)
                            if fallback_jobs:
                                all_jobs.extend(fallback_jobs)
                                main_logger.info(f"Fallback scraper succeeded for {result.url}")
                                scraper_failures[result.url] = (
                                    0  # Reset failure count on fallback success
                                )
                        except Exception as e:
                            main_logger.error(f"Fallback scraper failed for {result.url}: {e}")

            console.print(f"[bold green]Found {len(all_jobs)} total jobs.[/bold green]")
            prefs = load_user_prefs()
            await process_jobs(all_jobs, prefs)

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
