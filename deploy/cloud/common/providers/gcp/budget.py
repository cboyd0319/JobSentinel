"""GCP budget management functions."""

from pathlib import Path

from cloud.utils import run_command


async def setup_budget_alerts(
    logger, project_id: str, region: str, project_root: Path, scheduler_region: str, job_name: str
) -> None:
    logger.info("Setting up automated budget controls")
    logger.info("Deploying Cloud Function for automatic shutdown at 90% budget...")

    function_name = "job-scraper-budget-alerter"
    budget_topic_name = "job-scraper-budget-alerts"
    function_source_dir = str(project_root / "cloud" / "functions")

    result = await run_command(
        [
            "gcloud",
            "functions",
            "deploy",
            function_name,
            f"--project={project_id}",
            f"--region={region}",
            "--runtime=python312",
            f"--source={function_source_dir}",
            "--entry-point=budget_alert_handler",
            f"--trigger-topic={budget_topic_name}",
            "--gen2",
            f"--set-env-vars=GCP_PROJECT={project_id},SCHEDULER_LOCATION={scheduler_region},SCHEDULER_JOB_ID={job_name}-schedule",
            "--quiet",
        ],
        check=False,
        logger=logger,
        show_spinner=True,
        capture_output=True,
    )

    if result.returncode == 0:
        logger.info("[OK] Budget alert function deployed")
    else:
        logger.warning(
            f"Budget alert function deployment failed (non-critical, exit {result.returncode})"
        )
        if result.stderr:
            logger.debug(f"Cloud Functions error: {result.stderr}")
        logger.info("   • Budget alerts will not auto-pause the scheduler at 90% spend")
        logger.info("   • Manual setup: https://cloud.google.com/billing/docs/how-to/budgets")
