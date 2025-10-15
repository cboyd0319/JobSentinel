#!/usr/bin/env python3
"""
Example: Complete Automated Job Search Workflow

This example demonstrates a complete end-to-end workflow:
1. Load user preferences
2. Scrape jobs from multiple sources
3. Score jobs against preferences
4. Filter high-scoring matches
5. Send Slack alerts
6. Save to database

This is the pattern used by the main CLI application.

Requirements:
- Python 3.13+
- Valid configuration in config/user_prefs.json
- Slack webhook URL (optional)

Usage:
    python examples/automated_workflow.py
    python examples/automated_workflow.py --config custom_config.json
    python examples/automated_workflow.py --dry-run

Author: JobSentinel Contributors
License: MIT
"""

import asyncio
import argparse
import json
from pathlib import Path
from typing import List, Dict
from datetime import datetime

from utils.logging import get_logger
from utils.config import load_config
from sources.job_scraper import search_jobs_by_keywords
from matchers.scoring import score_jobs
from notify.slack import send_slack_alert
from database import save_jobs, get_recent_jobs

logger = get_logger(__name__)


class JobSearchWorkflow:
    """
    Complete automated job search workflow.

    This class orchestrates the entire process from scraping to alerting.
    """

    def __init__(self, config_path: str = "config/user_prefs.json"):
        """
        Initialize workflow with configuration.

        Args:
            config_path: Path to user preferences JSON file
        """
        self.config_path = Path(config_path)
        self.config = self._load_config()
        self.dry_run = False

    def _load_config(self) -> Dict:
        """
        Load and validate configuration.

        Returns:
            Configuration dictionary

        Raises:
            FileNotFoundError: If config file doesn't exist
            ValueError: If config is invalid
        """
        if not self.config_path.exists():
            raise FileNotFoundError(
                f"Configuration file not found: {self.config_path}\n"
                f"Copy config/user_prefs.example.json to create one."
            )

        with open(self.config_path) as f:
            config = json.load(f)

        # Validate required fields
        required = ["keywords", "job_sources"]
        for field in required:
            if field not in config:
                raise ValueError(f"Missing required field: {field}")

        return config

    async def run(self, dry_run: bool = False) -> Dict:
        """
        Execute the complete workflow.

        Args:
            dry_run: If True, don't save to database or send alerts

        Returns:
            Dictionary with workflow results
        """
        self.dry_run = dry_run

        logger.info("Starting automated job search workflow")
        start_time = datetime.utcnow()

        # Step 1: Scrape jobs
        logger.info("Step 1/5: Scraping jobs from enabled sources")
        jobs = await self._scrape_jobs()
        logger.info(f"Scraped {len(jobs)} total jobs")

        # Step 2: Remove duplicates
        logger.info("Step 2/5: Removing duplicate jobs")
        unique_jobs = self._deduplicate_jobs(jobs)
        logger.info(f"Found {len(unique_jobs)} unique jobs")

        # Step 3: Score jobs
        logger.info("Step 3/5: Scoring jobs against preferences")
        scored_jobs = self._score_jobs(unique_jobs)
        logger.info(f"Scored {len(scored_jobs)} jobs")

        # Step 4: Filter high-scoring matches
        logger.info("Step 4/5: Filtering high-scoring matches")
        threshold = self.config.get("min_score", 0.7)
        matches = [job for job in scored_jobs if job["score"] >= threshold]
        logger.info(f"Found {len(matches)} matches above threshold {threshold}")

        # Step 5: Save and alert
        logger.info("Step 5/5: Saving to database and sending alerts")
        if not self.dry_run:
            saved_count = await self._save_jobs(matches)
            alert_count = await self._send_alerts(matches)

            logger.info(f"Saved {saved_count} jobs, sent {alert_count} alerts")
        else:
            logger.info("Dry run: Skipping save and alerts")
            saved_count = 0
            alert_count = 0

        # Calculate execution time
        duration = (datetime.utcnow() - start_time).total_seconds()

        # Build result summary
        result = {
            "success": True,
            "duration_seconds": duration,
            "jobs_scraped": len(jobs),
            "jobs_unique": len(unique_jobs),
            "jobs_scored": len(scored_jobs),
            "matches_found": len(matches),
            "jobs_saved": saved_count,
            "alerts_sent": alert_count,
            "timestamp": start_time.isoformat(),
        }

        logger.info("Workflow completed successfully", extra=result)

        return result

    async def _scrape_jobs(self) -> List[Dict]:
        """
        Scrape jobs from all enabled sources.

        Returns:
            List of raw job dictionaries
        """
        jobs = []

        # Get enabled sources
        enabled_sources = {
            name: config
            for name, config in self.config.get("job_sources", {}).items()
            if config.get("enabled", False)
        }

        if not enabled_sources:
            logger.warning("No job sources enabled in configuration")
            return jobs

        # Scrape from each source
        for source_name, source_config in enabled_sources.items():
            try:
                logger.info(f"Scraping {source_name}...")

                # Use keywords from config
                keywords = self.config.get("keywords", [])
                locations = self.config.get("locations", [])

                source_jobs = await search_jobs_by_keywords(
                    keywords=keywords,
                    locations=[{"name": loc} for loc in locations],
                    source=source_name,
                )

                logger.info(f"Found {len(source_jobs)} jobs from {source_name}")
                jobs.extend(source_jobs)

            except Exception as e:
                logger.error(f"Error scraping {source_name}: {e}", exc_info=True)
                # Continue with other sources
                continue

        return jobs

    def _deduplicate_jobs(self, jobs: List[Dict]) -> List[Dict]:
        """
        Remove duplicate jobs based on title and company.

        Args:
            jobs: List of job dictionaries

        Returns:
            Deduplicated list of jobs
        """
        seen = set()
        unique = []

        for job in jobs:
            # Create unique key from title and company
            key = (job.get("title", "").lower().strip(), job.get("company", "").lower().strip())

            if key not in seen and key != ("", ""):
                seen.add(key)
                unique.append(job)

        return unique

    def _score_jobs(self, jobs: List[Dict]) -> List[Dict]:
        """
        Score jobs against user preferences.

        Args:
            jobs: List of job dictionaries

        Returns:
            List of jobs with added "score" field
        """
        preferences = {
            "keywords": self.config.get("keywords", []),
            "required_skills": self.config.get("required_skills", []),
            "preferred_skills": self.config.get("preferred_skills", []),
            "denied_companies": self.config.get("denied_companies", []),
            "min_salary": self.config.get("salary_min", 0),
            "locations": self.config.get("locations", []),
        }

        return score_jobs(jobs, preferences)

    async def _save_jobs(self, jobs: List[Dict]) -> int:
        """
        Save jobs to database.

        Args:
            jobs: List of job dictionaries to save

        Returns:
            Number of jobs saved
        """
        try:
            save_jobs(jobs)
            return len(jobs)
        except Exception as e:
            logger.error(f"Error saving jobs to database: {e}", exc_info=True)
            return 0

    async def _send_alerts(self, jobs: List[Dict]) -> int:
        """
        Send Slack alerts for high-scoring jobs.

        Args:
            jobs: List of job dictionaries to alert on

        Returns:
            Number of alerts sent
        """
        slack_config = self.config.get("slack", {})

        if not slack_config.get("webhook_url"):
            logger.info("Slack webhook not configured, skipping alerts")
            return 0

        # Get top N jobs to alert on
        max_alerts = slack_config.get("max_alerts_per_run", 5)
        top_jobs = sorted(jobs, key=lambda j: j.get("score", 0), reverse=True)[:max_alerts]

        alert_count = 0
        for job in top_jobs:
            try:
                await send_slack_alert(
                    webhook_url=slack_config["webhook_url"],
                    channel=slack_config.get("channel", "#job-alerts"),
                    job=job,
                )
                alert_count += 1
            except Exception as e:
                logger.error(f"Error sending alert for job {job.get('id')}: {e}")
                continue

        return alert_count

    def print_summary(self, result: Dict):
        """
        Print workflow summary to console.

        Args:
            result: Workflow result dictionary
        """
        print("\n" + "=" * 60)
        print("WORKFLOW SUMMARY")
        print("=" * 60)
        print(f"Duration: {result['duration_seconds']:.1f} seconds")
        print(f"Jobs Scraped: {result['jobs_scraped']}")
        print(f"Unique Jobs: {result['jobs_unique']}")
        print(f"Matches Found: {result['matches_found']}")
        print(f"Jobs Saved: {result['jobs_saved']}")
        print(f"Alerts Sent: {result['alerts_sent']}")
        print("=" * 60)
        print()


async def main():
    """
    Main entry point for the workflow example.
    """
    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description="Automated job search workflow",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                                    # Use default config
  %(prog)s --config custom_config.json       # Use custom config
  %(prog)s --dry-run                          # Preview without saving
        """,
    )

    parser.add_argument(
        "--config",
        default="config/user_prefs.json",
        help="Path to configuration file (default: config/user_prefs.json)",
    )

    parser.add_argument(
        "--dry-run", action="store_true", help="Preview results without saving or sending alerts"
    )

    args = parser.parse_args()

    # Run workflow
    try:
        workflow = JobSearchWorkflow(config_path=args.config)
        result = await workflow.run(dry_run=args.dry_run)
        workflow.print_summary(result)

        if args.dry_run:
            print("ℹ️  This was a dry run. No jobs were saved or alerts sent.")
            print("   Remove --dry-run to execute fully.\n")

    except FileNotFoundError as e:
        print(f"✗ Error: {e}")
        return 1

    except ValueError as e:
        print(f"✗ Configuration error: {e}")
        return 1

    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        logger.error("Workflow failed", exc_info=True)
        return 1

    return 0


if __name__ == "__main__":
    print("=" * 60)
    print("JobSentinel Automated Workflow")
    print("=" * 60)
    print()

    exit_code = asyncio.run(main())
    exit(exit_code)
