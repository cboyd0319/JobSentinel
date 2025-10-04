"""GCP deployment summary and notification functions."""

import json
import urllib.request
from typing import Dict

from cloud.utils import run_command
from cloud.providers.gcp.utils import looks_like_placeholder


def verify_deployment(
    logger, job_name: str, region: str, project_id: str, scheduler_region: str, storage_bucket: str
) -> None:
    logger.info("Verifying deployment")

    verification_passed = True
    checks = [
        (
            "Cloud Run Job",
            lambda: run_command(
                ["gcloud", "run", "jobs", "describe", job_name, f"--region={region}", f"--project={project_id}"],
                capture_output=True,
                check=False,
                logger=logger,
            ).returncode
            == 0,
        ),
        (
            "Cloud Scheduler",
            lambda: run_command(
                ["gcloud", "scheduler", "jobs", "describe", f"{job_name}-schedule", f"--location={scheduler_region}"],
                capture_output=True,
                check=False,
                logger=logger,
            ).returncode
            == 0,
        ),
        (
            "Storage Bucket",
            lambda: run_command(
                ["gcloud", "storage", "buckets", "describe", f"gs://{storage_bucket}", f"--project={project_id}"],
                capture_output=True,
                check=False,
                logger=logger,
            ).returncode
            == 0,
        ),
    ]

    for check_name, check_func in checks:
        try:
            if check_func():
                logger.info(f"[OK] {check_name} verified")
            else:
                logger.warning(f"✗ {check_name} verification failed")
                verification_passed = False
        except Exception as e:
            logger.warning(f"✗ {check_name} verification error: {e}")
            verification_passed = False

    if verification_passed:
        logger.info("All critical resources verified successfully")
    else:
        logger.warning("Some resources may not have deployed correctly")


def print_summary(
    logger,
    project_id: str,
    region: str,
    artifact_repo: str,
    job_name: str,
    schedule_frequency: str,
    storage_bucket: str,
    image_uri: str,
) -> None:
    logger.info("Deployment Summary")
    logger.info(f"Project ID: {project_id}")
    logger.info(f"Region: {region}")
    logger.info(f"Artifact Registry: {artifact_repo}")
    logger.info(f"Cloud Run Job: {job_name}")
    logger.info(f"Scheduler Job: {job_name}-schedule")
    logger.info(f"Storage Bucket: gs://{storage_bucket}")
    logger.info("Run an ad-hoc scrape with: " f"gcloud run jobs execute {job_name} --region {region}")


def send_slack_notification(
    logger,
    project_id: str,
    region: str,
    job_name: str,
    schedule_frequency: str,
    storage_bucket: str,
    image_uri: str,
    env_values: Dict[str, str],
) -> None:
    """Send deployment summary to Slack webhook if configured."""
    webhook_url = env_values.get("SLACK_WEBHOOK_URL")
    if not webhook_url or looks_like_placeholder(webhook_url, ""):
        logger.info("Slack webhook not configured, skipping notification")
        return

    logger.info("Sending deployment summary to Slack")

    message = {
        "text": "GCP Job Scraper Deployment Complete",
        "blocks": [
            {"type": "header", "text": {"type": "plain_text", "text": "GCP Job Scraper Deployed Successfully"}},
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": f"""*Project ID:*\n{project_id}"""},
                    {"type": "mrkdwn", "text": f"""*Region:*\n{region}"""},
                    {"type": "mrkdwn", "text": f"""*Job:*\n{job_name}"""},
                    {"type": "mrkdwn", "text": f"""*Schedule:*\n{schedule_frequency}"""},
                ],
            },
            {
                "type": "section",
                "text": {"type": "mrkdwn", "text": f"""*Storage:* `gs://{storage_bucket}`\n*Image:* `{image_uri}`"""},
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"""Execute manually:\n```gcloud run jobs execute {job_name} --region {region}```""",
                },
            },
        ],
    }

    try:
        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(message).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as response:  # nosec B310
            if response.status == 200:
                logger.info("Slack notification sent successfully")
            else:
                logger.warning(f"Slack notification returned status {response.status}")
    except Exception as e:
        logger.warning(f"Failed to send Slack notification: {e}")
