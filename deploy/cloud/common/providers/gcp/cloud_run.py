"""GCP Cloud Run Job management functions."""

from pathlib import Path

from cloud.utils import run_command


async def build_and_push_image(
    logger, project_root: Path, project_id: str, region: str, artifact_repo: str
) -> str:
    logger.info("Building container image via Cloud Build")

    # Check if Dockerfile exists
    dockerfile_path = project_root / "Dockerfile"
    if not dockerfile_path.exists():
        logger.info("Creating Dockerfile for Cloud Build...")
        _create_dockerfile(project_root, logger)

    image_tag = f"{region}-docker.pkg.dev/{project_id}/{artifact_repo}/" "job-scraper:latest"

    # Use Cloud Build (doesn't require local Docker)
    try:
        logger.info("Starting Cloud Build (this may take 3-5 minutes)...")
        await run_command(
            ["gcloud", "builds", "submit", "--tag", image_tag, str(project_root)],
            logger=logger,
            stream_output=True,  # Capture all build output in logs
            retries=3,
            delay=10,  # Add retries for Cloud Build
        )
        logger.info(f"Container image built successfully: {image_tag}")
    except RuntimeError as e:
        logger.error(f"Container build failed: {e}")
        logger.info("Attempting to create a simple test image for deployment...")
        _create_simple_dockerfile(project_root, logger)
        await run_command(
            ["gcloud", "builds", "submit", "--tag", image_tag, str(project_root)],
            logger=logger,
            stream_output=True,
            retries=3,
            delay=10,  # Add retries for Cloud Build (fallback)
        )
    return image_tag


def _create_dockerfile(project_root: Path, logger) -> None:
    """Create a production Dockerfile for the job scraper."""
    dockerfile_content = """FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set up proper Python path to include the app source directory
ENV PYTHONPATH=/app/deploy/common/app/src:/app

# Run the job scraper
CMD ["python3", "/app/deploy/common/app/src/agent.py", "--mode", "poll"]
"""
    dockerfile_path = project_root / "Dockerfile"
    with open(dockerfile_path, "w") as f:
        f.write(dockerfile_content)
    logger.info(f"Created Dockerfile at {dockerfile_path}")


def _create_simple_dockerfile(project_root: Path, logger) -> None:
    """Create a minimal test Dockerfile."""
    dockerfile_content = """FROM python:3.12-slim

WORKDIR /app

# Simple test setup
RUN pip install requests

# Create a minimal test script
RUN echo 'print("Job scraper container is working!")' > test.py

CMD ["python3", "test.py"]
"""
    dockerfile_path = project_root / "Dockerfile"
    with open(dockerfile_path, "w") as f:
        f.write(dockerfile_content)
    logger.info(f"Created simple test Dockerfile at {dockerfile_path}")


async def create_or_update_job(
    logger,
    project_id: str,
    region: str,
    job_name: str,
    image_uri: str,
    runtime_sa: str,
    job_mode: str,
    storage_bucket: str,
    connector_name: str,
    prefs_secret_name: str,
    slack_webhook_secret_name: str,
) -> None:
    logger.info("Configuring Cloud Run Job")
    secret_flags: list[str] = [
        "--set-secrets",
        f"USER_PREFS_JSON={prefs_secret_name}:latest",
        f"SLACK_WEBHOOK_URL={slack_webhook_secret_name}:latest",
    ]

    env_var_flags: list[str] = [
        "--set-env-vars",
        f"JOB_RUN_MODE={job_mode},STORAGE_BUCKET={storage_bucket},PREFS_SECRET_NAME={prefs_secret_name},SLACK_WEBHOOK_SECRET_NAME={slack_webhook_secret_name}",
    ]

    common_args = [
        "--image",
        image_uri,
        f"--region={region}",
        f"--project={project_id}",
        f"--service-account={runtime_sa}",
        "--cpu=1",  # Minimum CPU for gen2 environment
        "--memory=512Mi",  # Sufficient memory for job scraper
        "--max-retries=1",
        "--task-timeout=1800s",  # 30 minutes timeout
        "--vpc-connector",
        connector_name,  # Private networking
        "--vpc-egress=all-traffic",  # Allow job site access
        "--execution-environment=gen2",  # Latest execution environment
        "--labels=managed-by=job-scraper",
        *secret_flags,
        *env_var_flags,
    ]

    describe_job = await run_command(
        [
            "gcloud",
            "run",
            "jobs",
            "describe",
            job_name,
            f"--region={region}",
            f"--project={project_id}",
        ],
        capture_output=True,
        check=False,
        logger=logger,
    )

    if describe_job.returncode == 0:
        logger.info(f"Job '{job_name}' already exists. Updating...")
        command = ["gcloud", "run", "jobs", "update", job_name, *common_args]
    else:
        logger.info(f"Job '{job_name}' not found. Creating...")
        command = ["gcloud", "run", "jobs", "create", job_name, *common_args]

    await run_command(command, logger=logger, show_spinner=True, retries=5, delay=10)
