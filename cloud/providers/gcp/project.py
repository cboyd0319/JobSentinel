"""GCP project management functions."""

import json
import sys

from cloud.utils import choose, run_command


async def create_project(logger, project_id: str, project_name: str, billing_account: str) -> None:
    """Create a new GCP project and link billing account.

    Args:
        logger: Logger instance
        project_id: Unique project ID
        project_name: Display name for the project
        billing_account: Billing account ID to link

    Raises:
        RuntimeError: If project creation fails (including quota errors)
    """
    logger.info(f"Creating GCP project: {project_id}")

    # Create the project (may raise RuntimeError on quota/other failures)
    result = await run_command(
        ["gcloud", "projects", "create", project_id, f"--name={project_name}"], logger=logger
    )

    # Link billing account
    logger.info(f"Linking billing account: {billing_account}")
    await run_command(
        [
            "gcloud",
            "billing",
            "projects",
            "link",
            project_id,
            f"--billing-account={billing_account}",
        ],
        logger=logger,
    )

    # Set as active project
    await run_command(["gcloud", "config", "set", "project", project_id], logger=logger)

    logger.info(f"[OK] Project {project_id} created and configured")


async def choose_billing_account(logger, no_prompt: bool) -> str:
    logger.info("Locate Billing Account")
    result = await run_command(
        ["gcloud", "billing", "accounts", "list", "--format=json"],
        capture_output=True,
        logger=logger,
    )
    accounts = json.loads(result.stdout)
    if not accounts:
        logger.error("No billing accounts detected. Create one in the console and re-run.")
        sys.exit(1)
    # Filter for open accounts first
    open_accounts = [acc for acc in accounts if acc.get("open", False)]
    if open_accounts and len(open_accounts) == 1:
        billing_account = open_accounts[0]["name"].split("/")[-1]
        logger.info(f"Open billing account detected: {billing_account}")
        return billing_account
    elif open_accounts:
        # Use only open accounts if available
        accounts = open_accounts
        logger.info("Using open billing accounts")

    if len(accounts) == 1:
        billing_account = accounts[0]["name"].split("/")[-1]
        logger.info(f"Billing account detected: {billing_account}")
        return billing_account

    choices = [
        f"{acc['name'].split('/')[-1]} ({acc['displayName']}) {'[OPEN]' if acc.get('open', False) else '[CLOSED]'}"
        for acc in accounts
    ]
    selection = choose("Select billing account:", choices, no_prompt)
    return selection.split()[0]
