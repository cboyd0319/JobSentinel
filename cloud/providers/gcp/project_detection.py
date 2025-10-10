"""GCP project detection and state management for updates."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from cloud.utils import run_command


def get_state_directory(project_id: str) -> Path:
    """Get the state directory for a specific project.

    Args:
        project_id: GCP project ID

    Returns:
        Path to state directory (~/.job-scraper/{project_id}/)
    """
    state_dir = Path.home() / ".job-scraper" / project_id
    state_dir.mkdir(parents=True, exist_ok=True)
    return state_dir


def get_terraform_state_path(project_id: str) -> Path:
    """Get path to Terraform state file for a project.

    Args:
        project_id: GCP project ID

    Returns:
        Path to terraform.tfstate file
    """
    return get_state_directory(project_id) / "terraform.tfstate"


def get_config_path(project_id: str) -> Path:
    """Get path to config file for a project.

    Args:
        project_id: GCP project ID

    Returns:
        Path to deployment config JSON file
    """
    return get_state_directory(project_id) / "deployment_config.json"


async def list_job_scraper_projects(logger) -> list[dict]:
    """List all job-scraper-* projects accessible to the user.

    Args:
        logger: Logger instance

    Returns:
        List of project dicts with keys: project_id, name, created_time, state
    """
    try:
        result = await run_command(
            ["gcloud", "projects", "list", "--format=json", "--filter=projectId:job-scraper-*"],
            capture_output=True,
            text=True,
            logger=logger,
        )

        projects = json.loads(result.stdout)
        project_list = []

        for project in projects:
            project_id = project.get("projectId")
            name = project.get("name", project_id)
            create_time = project.get("createTime", "Unknown")
            lifecycle_state = project.get("lifecycleState", "UNKNOWN")

            # Check if we have local state for this project
            state_path = get_terraform_state_path(project_id)
            has_local_state = state_path.exists()

            project_list.append({
                "project_id": project_id,
                "name": name,
                "created_time": create_time,
                "state": lifecycle_state,
                "has_local_state": has_local_state,
                "state_path": str(state_path) if has_local_state else None,
            })

        return project_list

    except Exception as e:
        logger.debug(f"Error listing projects: {e}")
        return []


async def detect_existing_deployment(logger, no_prompt: bool = False) -> str | None:
    """Detect if user has existing job-scraper deployment.

    Args:
        logger: Logger instance
        no_prompt: If True, skip interactive prompts

    Returns:
        Project ID to update, or None to create new deployment
    """
    logger.info("=" * 70)
    logger.info("DEPLOYMENT MODE SELECTION")
    logger.info("=" * 70)
    logger.info("")

    projects = await list_job_scraper_projects(logger)

    if not projects:
        logger.info("No existing job-scraper projects found.")
        logger.info("Proceeding with new deployment...")
        logger.info("")
        return None

    logger.info(f"Found {len(projects)} existing job-scraper project(s):")
    logger.info("")

    for idx, project in enumerate(projects, 1):
        logger.info(f"{idx}. {project['project_id']}")
        logger.info(f"   Created: {project['created_time']}")
        logger.info(f"   Status: {project['state']}")
        if project['has_local_state']:
            logger.info(f"   Local state: [OK] {project['state_path']}")
        else:
            logger.info("   Local state: ✗ (no local Terraform state found)")
        logger.info("")

    if no_prompt:
        logger.info("Running in no-prompt mode. Creating new deployment.")
        return None

    logger.info("What would you like to do?")
    logger.info("")
    logger.info("1. Update an existing project (recommended if you have local state)")
    logger.info("2. Create a new deployment")
    logger.info("3. Exit")
    logger.info("")

    while True:
        choice = input("Enter choice (1-3): ").strip()

        if choice == "1":
            # Select project to update
            logger.info("")
            logger.info("Select project to update:")
            for idx, project in enumerate(projects, 1):
                logger.info(f"{idx}. {project['project_id']}")

            while True:
                project_choice = input(f"Enter project number (1-{len(projects)}): ").strip()
                try:
                    project_idx = int(project_choice) - 1
                    if 0 <= project_idx < len(projects):
                        selected_project = projects[project_idx]
                        project_id = selected_project['project_id']

                        # Warn if no local state
                        if not selected_project['has_local_state']:
                            logger.warning("")
                            logger.warning("[WARNING] WARNING: No local Terraform state found for this project!")
                            logger.warning("   Updating without state may cause resource conflicts.")
                            logger.warning("   Consider creating a new deployment instead.")
                            logger.warning("")
                            confirm = input("Continue anyway? (yes/no): ").strip().lower()
                            if confirm not in ["yes", "y"]:
                                logger.info("Update cancelled. Creating new deployment instead.")
                                return None

                        logger.info(f"[OK] Selected project: {project_id}")
                        return project_id
                    else:
                        logger.error(f"Invalid choice. Enter 1-{len(projects)}")
                except ValueError:
                    logger.error("Invalid input. Enter a number.")

        elif choice == "2":
            logger.info("Creating new deployment...")
            return None

        elif choice == "3":
            logger.info("Exiting...")
            import sys
            sys.exit(0)

        else:
            logger.error("Invalid choice. Enter 1, 2, or 3.")


def save_deployment_config(project_id: str, config: dict) -> None:
    """Save deployment configuration to disk.

    Args:
        project_id: GCP project ID
        config: Configuration dictionary to save
    """
    config_path = get_config_path(project_id)
    config['last_updated'] = datetime.utcnow().isoformat()

    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)


def load_deployment_config(project_id: str) -> dict | None:
    """Load deployment configuration from disk.

    Args:
        project_id: GCP project ID

    Returns:
        Configuration dict if found, None otherwise
    """
    config_path = get_config_path(project_id)

    if not config_path.exists():
        return None

    try:
        with open(config_path) as f:
            return json.load(f)
    except Exception:
        return None


def generate_project_id() -> str:
    """Generate a new project ID with timestamp.

    Returns:
        Project ID string in format: job-scraper-YYYYMMDD-HHMMSS
    """
    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    return f"job-scraper-{timestamp}"
