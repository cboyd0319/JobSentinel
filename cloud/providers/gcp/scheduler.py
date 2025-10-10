"""GCP Cloud Scheduler management functions."""

from cloud.providers.gcp.utils import build_google_api_url
from cloud.utils import run_command


async def schedule_job(
    logger,
    project_id: str,
    region: str,
    job_name: str,
    scheduler_region: str,
    scheduler_sa: str,
    schedule_frequency: str,
) -> None:
    logger.info("Scheduling recurring executions")
    if not scheduler_region:
        raise RuntimeError("Scheduler region not configured")
    if not all([project_id, region, job_name]):
        raise RuntimeError("Project ID, region, and job name must be configured before scheduling")

    job_uri = build_google_api_url(
        host="run.googleapis.com",
        segments=[
            "apis",
            "run.googleapis.com",
            "v1",
            "projects",
            project_id,
            "locations",
            region,
            "jobs",
            f"{job_name}:run",
        ],
        allow_colon_last=True,
    )
    schedule = schedule_frequency
    create_cmd = [
        "gcloud",
        "scheduler",
        "jobs",
        "create",
        "http",
        f"{job_name}-schedule",
        f"--location={scheduler_region}",
        f"--schedule={schedule}",
        f"--uri={job_uri}",
        "--http-method=POST",
        f"--oidc-service-account-email={scheduler_sa}",
        f"--oidc-token-audience={job_uri}",
        "--message-body={}",
    ]
    await run_command(create_cmd, check=False, logger=logger, retries=3, delay=5)
    update_cmd = create_cmd.copy()
    update_cmd[3] = "update"
    await run_command(update_cmd, logger=logger, retries=3, delay=5)
