"""Google Cloud Platform provisioning workflow."""

from __future__ import annotations

import hashlib
import json
import os
import secrets
import re
import shutil
import string
import sys
import tarfile
import tempfile
import textwrap
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path
from typing import Dict
from datetime import datetime
from tzlocal import get_localzone_name
import asyncio
import aiohttp

from cloud.utils import (
    choose,
    confirm,
    create_or_update_secret,
    current_os,
    ensure_directory,
    prepend_path,
    resolve_project_root,
    run_command,
    which,
)

INSTALL_VERSION = "540.0.0"




class GCPBootstrap:
    """Interactive bootstrapper for Google Cloud Run Jobs."""

    name = "Google Cloud Platform"

    def __init__(self, logger, no_prompt: bool = False) -> None:
        self.logger = logger
        self.no_prompt = no_prompt
        self.project_id: str | None = None
        self.project_number: str | None = None
        self.project_name: str | None = None
        self.billing_account: str | None = None
        self.region: str | None = None
        self.artifact_repo: str = "job-scraper"
        self.image_uri: str | None = None
        self.job_name: str = "job-scraper"
        self.runtime_sa: str | None = None
        self.scheduler_sa: str | None = None
        self.scheduler_region: str | None = None
        self.user_prefs_payload: str = ""
        self.env_values: Dict[str, str] = {}
        self.env_secret_bindings: Dict[str, str] = {}
        self.project_root = resolve_project_root()
        self.terraform_dir = self.project_root / "terraform" / "gcp"
        self.job_mode: str = "poll"
        self.schedule_frequency: str = "0 6-18 * * 1-5"  # Business hours every hour default
        self.vpc_name: str | None = None
        self.subnet_name: str | None = None
        self.connector_name: str | None = None
        self.prefs_secret_name: str | None = None
        self.slack_webhook_secret_name: str | None = None
        self.budget_topic_name: str | None = None
from cloud.providers.gcp.utils import (
    build_google_api_url,
    get_gcp_project_id,
    get_gcp_region,
    get_gcp_zone,
    run_command,
    set_gcp_project_id,
    set_gcp_region,
    set_gcp_zone,
)
from cloud.providers.gcp.auth import authenticate
from cloud.providers.gcp.sdk import ensure_gcloud
from cloud.providers.gcp.project import choose_billing_account, create_project, enable_services
from cloud.providers.gcp.regions import select_region, select_scheduler_region
from cloud.providers.gcp.security import setup_binary_authorization, run_prowler_scan
from cloud.providers.gcp.cloud_run import build_and_push_image, create_or_update_job
from cloud.providers.gcp.scheduler import schedule_job
from cloud.providers.gcp.budget import configure_budget, setup_budget_alerts
from cloud.providers.gcp.summary import verify_deployment, print_summary, send_slack_notification

class GCPBootstrap:
    """Interactive bootstrapper for Google Cloud Run Jobs."""

    name = "Google Cloud Platform"

    def __init__(self, logger, no_prompt: bool = False) -> None:
        self.logger = logger
        self.no_prompt = no_prompt
        self.project_id: str | None = None
        self.project_number: str | None = None
        self.project_name: str | None = None
        self.billing_account: str | None = None
        self.region: str | None = None
        self.artifact_repo: str = "job-scraper"
        self.image_uri: str | None = None
        self.job_name: str = "job-scraper"
        self.runtime_sa: str | None = None
        self.scheduler_sa: str | None = None
        self.scheduler_region: str | None = None
        self.user_prefs_payload: str = ""
        self.env_values: Dict[str, str] = {}
        self.env_secret_bindings: Dict[str, str] = {}
        self.project_root = resolve_project_root()
        self.terraform_dir = self.project_root / "terraform" / "gcp"

    # ------------------------------------------------------------------
    # public API
    # ------------------------------------------------------------------
    async def run(self) -> None:
        self._print_welcome()
        await self._confirm_prerequisites()
        await ensure_gcloud(self.logger, self.no_prompt, self.project_root)
        await authenticate(self.logger)
        self.region = await select_region(self.logger, self.no_prompt)
        self.billing_account = await choose_billing_account(self.logger, self.no_prompt)
        terraform_outputs = await self._run_terraform_apply()

        # Extract Terraform outputs
        self.artifact_repo = terraform_outputs["artifact_registry_repo_name"]["value"]
        self.job_name = terraform_outputs["cloud_run_job_name"]["value"]
        self.image_uri = terraform_outputs["cloud_build_image_name_with_tag"]["value"]
        self.budget_topic_name = terraform_outputs["budget_pubsub_topic"]["value"]
        self.vpc_name = terraform_outputs["vpc_network_name"]["value"]
        self.subnet_name = terraform_outputs["vpc_subnet_name"]["value"]
        self.connector_name = terraform_outputs["vpc_connector_id"]["value"]
        self.storage_bucket = terraform_outputs["storage_bucket_full_name"]["value"]
        self.runtime_sa = terraform_outputs["runtime_service_account_email"]["value"]
        self.scheduler_sa = terraform_outputs["scheduler_service_account_email"]["value"]
        self.prefs_secret_name = terraform_outputs["user_prefs_secret_id"]["value"]
        self.slack_webhook_secret_name = terraform_outputs["slack_webhook_secret_id"]["value"]
        self.scheduler_region = await select_scheduler_region(self.logger, self.no_prompt, self.region)

        # Infrastructure setup - now largely managed by Terraform, but some post-TF steps remain
        # setup_binary_authorization is still needed as it's not in Terraform
        await setup_binary_authorization(self.logger, self.project_id, self.region)

        # Configuration and secrets
        self._collect_configuration()
        # Secrets are now defined in Terraform, only their values are managed by Python
        # We need to update the secret values using the Terraform-provided secret IDs
        await self._update_secret_values()

        # Build and deploy
        # image_uri and job_name are now from Terraform outputs
        # build_and_push_image is still needed to build the image and push it to the repo created by Terraform
        await build_and_push_image(self.logger, self.project_root, self.project_id, self.region, self.artifact_repo)
        # Pass Terraform-managed service account and connector to create_or_update_job
        await create_or_update_job(self.logger, self.project_id, self.region, self.job_name, self.image_uri, self.runtime_sa, self.job_mode, self.storage_bucket, self.connector_name, self.prefs_secret_name, self.slack_webhook_secret_name)
        # Pass Terraform-managed service account to schedule_job
        await schedule_job(self.logger, self.project_id, self.region, self.job_name, self.scheduler_region, self.scheduler_sa, self.schedule_frequency)

        # Budget controls (now largely managed by Terraform)
        # The budget itself and the Pub/Sub topic are created by Terraform.
        # We still need to deploy the Cloud Function for budget alerts.
        await self._setup_budget_alerts() # This will use self.budget_topic_name

        # Verification and reporting (MUST run last after all resources created)
        await verify_deployment(self.logger, self.job_name, self.region, self.project_id, self.scheduler_region, self.storage_bucket)
        await run_prowler_scan(self.logger, self.project_id, self.project_root)  # Security scan after everything is deployed

        # Final summary and notification
        print_summary(self.logger, self.project_id, self.region, self.artifact_repo, self.job_name, self.schedule_frequency, self.storage_bucket, self.image_uri)
        await send_slack_notification(self.logger, self.project_id, self.region, self.job_name, self.schedule_frequency, self.storage_bucket, self.image_uri, self.env_values)

    async def _update_secret_values(self) -> None:
        self.logger.info("Updating Secret Manager secret values...")

        # Update user preferences secret
        if self.user_prefs_payload and self.prefs_secret_name:
            await create_or_update_secret(self.project_id, self.prefs_secret_name, self.user_prefs_payload)
            self.logger.info(f"✓ User preferences secret '{self.prefs_secret_name}' updated.")

        # Update Slack webhook secret
        slack_webhook_url = self.env_values.get("SLACK_WEBHOOK_URL")
        if slack_webhook_url and self.slack_webhook_secret_name:
            await create_or_update_secret(self.project_id, self.slack_webhook_secret_name, slack_webhook_url)
            self.logger.info(f"✓ Slack webhook secret '{self.slack_webhook_secret_name}' updated.")

        self.logger.info("Secret Manager secret values updated successfully.")

    # ------------------------------------------------------------------
    # workflow steps
    # ------------------------------------------------------------------
    def _print_welcome(self) -> None:
        self.logger.info("Google Cloud Run Automated Provisioning")
        self.logger.info(
            textwrap.dedent(
                """
                This guided workflow will deploy the Job Private Scraper & Filter to
                Google Cloud Run Jobs with a focus on zero-idle cost, locked-down
                permissions, and secret isolation. You will be prompted for minimal
                configuration values; everything else is automated.
                """
            ).strip()
        )
        self.logger.info("")
        self.logger.info("=" * 70)
        self.logger.info("INSTALLATION & CONSENT")
        self.logger.info("=" * 70)
        self.logger.info("")
        self.logger.info("Prerequisites (must already be installed):")
        self.logger.info("")
        self.logger.info("  • Python 3.11+ (required to run this script)")
        self.logger.info("  • pip (Python package manager)")
        self.logger.info("")
        self.logger.info("What will be installed/configured on YOUR COMPUTER:")
        self.logger.info("")
        self.logger.info("  • Python packages (if not already installed):")
        self.logger.info("    - google-cloud-storage, pydantic, requests, etc.")
        self.logger.info("    - Installed via: pip install -r requirements.txt")
        self.logger.info("")
        self.logger.info("  • Google Cloud SDK (gcloud CLI) - if not already installed")
        self.logger.info("    - Location: ~/google-cloud-sdk/")
        self.logger.info("    - PATH modification: Added to ~/.zshrc or ~/.bashrc")
        self.logger.info("    - Size: ~450 MB")
        self.logger.info("")
        self.logger.info("  • Google Cloud authentication credentials")
        self.logger.info("    - Location: ~/.config/gcloud/")
        self.logger.info("    - Includes: application_default_credentials.json")
        self.logger.info("")
        self.logger.info("What will be created in GOOGLE CLOUD (billed to your account):")
        self.logger.info("")
        self.logger.info("  • New GCP Project (dedicated, isolated)")
        self.logger.info("  • Cloud Run Job (serverless container)")
        self.logger.info("  • Cloud Storage bucket (job data persistence)")
        self.logger.info("  • VPC network & connector (secure private networking)")
        self.logger.info("  • Service accounts (least-privilege IAM)")
        self.logger.info("  • Cloud Scheduler (automated runs)")
        self.logger.info("  • Secret Manager secrets (secure configuration)")
        self.logger.info("  • Artifact Registry (container images)")
        self.logger.info("  • Optional: Cloud Function (budget alerts)")
        self.logger.info("")
        self.logger.info("Estimated monthly cost: $0-5 USD (designed for free tier)")
        self.logger.info("Free tier limits: 2M Cloud Run requests, 5GB storage, etc.")
        self.logger.info("")
        self.logger.info("=" * 70)
        self.logger.info("")

        if not confirm("Do you understand and consent to these installations?", self.no_prompt):
            self.logger.info("Deployment cancelled by user")
            sys.exit(0)

    async def _confirm_prerequisites(self) -> None:
        self.logger.info("Prerequisite Verification")
        self.logger.info("")
        self.logger.info("=" * 70)
        self.logger.info("CHECKING SYSTEM REQUIREMENTS")
        self.logger.info("=" * 70)
        self.logger.info("")

        # Check Python version
        python_version = sys.version_info
        required_python = (3, 11)
        self.logger.info(f"Python version: {python_version.major}.{python_version.minor}.{python_version.micro}")
        if python_version < required_python:
            self.logger.error(f"❌ Python {required_python[0]}.{required_python[1]}+ is required!")
            self.logger.error(f"   You have: {python_version.major}.{python_version.minor}.{python_version.micro}")
            self.logger.error("   Please upgrade Python: https://www.python.org/downloads/")
            sys.exit(1)
        self.logger.info(f"✓ Python {required_python[0]}.{required_python[1]}+ detected")

        # Check pip
        try:
            pip_result = await run_command(
                [sys.executable, "-m", "pip", "--version"],
                capture_output=True,
                text=True,
                check=True,
                logger=self.logger
            )
            pip_version = pip_result.stdout.strip()
            self.logger.info(f"✓ pip installed: {pip_version.split()[1]}")
        except RuntimeError: # run_command raises RuntimeError on failure
            self.logger.error("❌ pip is not installed!")
            self.logger.error("   Install pip: https://pip.pypa.io/en/stable/installation/")
            sys.exit(1)

        # Check required Python packages
        required_packages = ["pydantic", "requests", "google-cloud-storage"]
        missing_packages = []
        for package in required_packages:
            try:
                __import__(package.replace("-", "_"))
                self.logger.info(f"✓ {package} installed")
            except ImportError:
                missing_packages.append(package)

        if missing_packages:
            self.logger.warning(f"⚠ Missing packages: {', '.join(missing_packages)}")
            self.logger.info("")
            self.logger.info("SECURITY NOTE: Package Installation")
            self.logger.info("   Packages will be installed from PyPI (Python Package Index)")
            self.logger.info("   pip uses HTTPS and verifies package integrity via:")
            self.logger.info("     • TLS/SSL encryption for download")
            self.logger.info("     • SHA256 hash verification of downloaded files")
            self.logger.info("     • Digital signatures from package maintainers")
            self.logger.info("   You can review requirements.txt before continuing")
            self.logger.info("")

            if not self.no_prompt:
                response = input("Install missing packages now? (y/n): ").strip().lower()
                if response not in ['y', 'yes']:
                    self.logger.error("Package installation declined by user")
                    self.logger.info("Please install manually: pip install -r requirements.txt")
                    sys.exit(1)

            self.logger.info("   Installing required packages with hash verification...")
            try:
                # Use --require-hashes if hashes are available in requirements.txt
                # Force PyPI as index to avoid conflicts with Safety CLI or other mirrors
                # --no-index-url ignores pip.conf settings
                env = os.environ.copy()
                # Remove any Safety CLI environment variables that might affect pip
                env.pop('PIP_INDEX_URL', None)
                env.pop('PIP_EXTRA_INDEX_URL', None)

                result = await run_command(
                    [sys.executable, "-m", "pip", "install", "-r",
                     str(self.project_root / "requirements.txt"),
                     "--index-url", "https://pypi.org/simple",
                     "--no-warn-conflicts", "-v"],
                    check=True,
                    capture_output=True,
                    text=True,
                    env=env,
                    logger=self.logger
                )
                # Log verification details
                for line in result.stdout.split('\n'):
                    if 'Successfully installed' in line:
                        self.logger.info(f"   {line.strip()}")
                    elif 'sha256' in line.lower() or 'hash' in line.lower():
                        self.logger.debug(f"   {line.strip()}")

                self.logger.info("✓ Required packages installed and verified")
            except RuntimeError as e: # run_command raises RuntimeError on failure
                self.logger.error("❌ Failed to install required packages")
                self.logger.error(f"   Error: {e}")
                self.logger.error("   Please run: pip install -r requirements.txt")
                sys.exit(1)

        self.logger.info("")
        self.logger.info("=" * 70)
        self.logger.info("")

        self.logger.info(
            textwrap.dedent(
                """
                Before continuing, please ensure you have completed the following Google Cloud setup steps.
                The script will pause until you confirm.

                  1. Create a Google Cloud Account:
                     - If you don't have one, go to https://cloud.google.com/ and sign up. You will need a standard Google account (like Gmail) to begin.
                     - The setup wizard will guide you through the initial steps.

                  2. Accept the Terms of Service:
                     - This is a standard part of the Google Cloud sign-up process. You must agree to the terms to proceed.

                  3. Add a Billing Profile:
                     - Even if you plan to use only the free tier, Google requires a billing account to be associated with your project to prevent abuse.
                     - You can set up a billing account at: https://console.cloud.google.com/billing
                     - This typically involves providing a credit card, but you will not be charged unless your usage exceeds the generous free tier limits. This script is designed to stay within those limits.
                """
            ).strip()
        )
        if not confirm("Have you completed these steps?", self.no_prompt):
            self.logger.error("Please finish the account setup and re-run this script.")
            sys.exit(1)

    async def _run_terraform_apply(self) -> None:
        self.logger.info("Applying Terraform configuration for GCP infrastructure...")

        # Initialize Terraform
        self.logger.info("Initializing Terraform...")
        await run_command(["terraform", "init"], logger=self.logger, cwd=self.terraform_dir)

        # Plan Terraform changes
        self.logger.info("Planning Terraform changes...")
        plan_command = [
            "terraform", "plan",
            f"-var=project_id={self.project_id}",
            f"-var=project_name={self.project_name}",
            f"-var=billing_account={self.billing_account}",
            f"-var=region={self.region}",
            "-out=tfplan"
        ]
        await run_command(plan_command, logger=self.logger, cwd=self.terraform_dir)

        # Apply Terraform changes
        self.logger.info("Applying Terraform changes...")
        apply_command = ["terraform", "apply", "-auto-approve", "tfplan"]
        await run_command(apply_command, logger=self.logger, cwd=self.terraform_dir)

        # Get Terraform outputs
        self.logger.info("Retrieving Terraform outputs...")
        output_command = ["terraform", "output", "-json"]
        output_result = await run_command(output_command, capture_output=True, logger=self.logger, cwd=self.terraform_dir)
        terraform_outputs = json.loads(output_result.stdout)

        self.project_id = terraform_outputs["project_id"]["value"]
        self.project_number = terraform_outputs["project_number"]["value"]
        self.logger.info(f"Terraform applied successfully. Project ID: {self.project_id}")
        return terraform_outputs













    def _collect_configuration(self) -> None:
        self.logger.info("Collect runtime configuration")
        self.logger.info("")
        self.logger.info("=" * 70)
        self.logger.info("SLACK WEBHOOK SETUP (REQUIRED FOR NOTIFICATIONS)")
        self.logger.info("=" * 70)
        self.logger.info("")
        self.logger.info("Slack webhooks allow the job scraper to send you job alerts.")
        self.logger.info("Setting up a FREE Slack workspace takes about 5 minutes.")
        self.logger.info("")
        self.logger.info("DETAILED STEP-BY-STEP GUIDE:")
        self.logger.info("")
        self.logger.info("STEP 1: Create a FREE Slack workspace")
        self.logger.info("  1. Open: https://slack.com/create")
        self.logger.info("  2. Enter your email address")
        self.logger.info("  3. Click 'Continue'")
        self.logger.info("  4. Check your email and copy the 6-digit confirmation code")
        self.logger.info("  5. Enter the code on the Slack page")
        self.logger.info("  6. When asked 'What's your company or team working on?'")
        self.logger.info("     Type something like: 'Job Alerts' or 'Personal'")
        self.logger.info("  7. When asked 'What's your team's name?'")
        self.logger.info("     Use the same name or 'Job Search'")
        self.logger.info("  8. Skip inviting teammates - click 'Skip this step'")
        self.logger.info("  9. You'll land in your new Slack workspace (#general channel)")
        self.logger.info("")
        self.logger.info("STEP 2: Create an Incoming Webhook")
        self.logger.info("  1. Open a new browser tab and go to: https://api.slack.com/apps")
        self.logger.info("  2. Click the green 'Create New App' button")
        self.logger.info("  3. Choose 'From scratch'")
        self.logger.info("  4. App Name: Type 'Job Scraper' (or any name you like)")
        self.logger.info("  5. Pick a workspace: Select the workspace you just created")
        self.logger.info("  6. Click 'Create App'")
        self.logger.info("")
        self.logger.info("STEP 3: Activate Incoming Webhooks")
        self.logger.info("  1. You'll see a menu on the left side")
        self.logger.info("  2. Click 'Incoming Webhooks' (under 'Features')")
        self.logger.info("  3. Toggle the switch at the top from 'Off' to 'On'")
        self.logger.info("     (The page will reload)")
        self.logger.info("  4. Scroll down to 'Webhook URLs for Your Workspace'")
        self.logger.info("  5. Click 'Add New Webhook to Workspace'")
        self.logger.info("  6. Choose a channel: Select '#general' (or create a new channel)")
        self.logger.info("  7. Click the green 'Allow' button")
        self.logger.info("")
        self.logger.info("STEP 4: Copy the Webhook URL")
        self.logger.info("  1. You'll be back at the 'Incoming Webhooks' page")
        self.logger.info("  2. Scroll down to 'Webhook URLs for Your Workspace'")
        self.logger.info("  3. You'll see a URL that looks like:")
        self.logger.info("     https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX")
        self.logger.info("  4. Click the 'Copy' button next to the URL")
        self.logger.info("  5. Keep this tab open so you can paste it below!")
        self.logger.info("")
        self.logger.info("=" * 70)
        self.logger.info("")
        self.logger.info("NOTE: For email notifications, you'll need to configure those")
        self.logger.info("   separately after deployment. For now, we'll focus on Slack.")
        self.logger.info("")

        env_template = self.project_root / ".env.example"
        if not env_template.exists():
            raise FileNotFoundError(".env.example missing from repository root")

        default_tz = get_localzone_name()

        self.logger.info(
            "Provide values for each setting. Press Enter to accept the default shown. "
            "Type 'skip' to leave a value empty if email is not configured yet."
        )

        for line in env_template.read_text(encoding="utf-8").splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("#") or "=" not in stripped:
                continue

            key, default = stripped.split("=", 1)
            default = default.strip()
            default_value = default.split("#", 1)[0].strip()

            if key == "TZ":
                default_value = default_tz

            if self.no_prompt:
                # In no-prompt mode, skip all configuration collection
                candidate = ""
            else:
                prompt = f"{key} [{default_value or 'blank'}]: "
                while True:
                    user_input = input(prompt).strip()
                    if user_input.lower() == "skip":
                        candidate = ""
                        break

                    candidate = user_input or default_value
                    candidate = candidate.split("#", 1)[0].strip()

                    # Special validation for SLACK_WEBHOOK_URL - it's required
                    if key == "SLACK_WEBHOOK_URL":
                        if not candidate or candidate == "":
                            self.logger.error("❌ Slack webhook URL is REQUIRED for job notifications!")
                            self.logger.error("   Please follow the instructions above to create one.")
                            continue
                        if not candidate.startswith("https://hooks.slack.com/"):
                            self.logger.error("❌ Invalid webhook URL format!")
                            self.logger.error("   It should start with: https://hooks.slack.com/services/")
                            continue
                        if self._looks_like_placeholder(candidate, default_value):
                            self.logger.error("❌ That looks like a placeholder URL, not a real one!")
                            self.logger.error("   Please paste the actual webhook URL from Slack.")
                            continue
                        self.logger.info("✓ Valid Slack webhook URL!")
                        # Do not add to env_values, it will be handled by _update_secret_values
                        self.env_values[key] = candidate # Temporarily store for _update_secret_values
                        break

                    # For non-required fields, allow empty/skip
                    if candidate == "" and default_value:
                        self.logger.warning("Value cannot be empty. Enter a real value or type 'skip' to leave blank.")
                        continue

                    if self._looks_like_placeholder(candidate, default_value):
                        self.logger.warning(
                            "Placeholder value detected. Enter a real value or type 'skip' to leave blank."
                        )
                        continue
                    break

            if key != "SLACK_WEBHOOK_URL": # Only add non-Slack webhook values to env_values
                self.env_values[key] = candidate

        prefs_template = self.project_root / "config/user_prefs.example.json"
        self.user_prefs_payload = prefs_template.read_text(encoding="utf-8")
        self.logger.info(
            "A default config/user_prefs.json template has been scheduled for upload to"
            " Secret Manager. Update it after deployment if you need different companies."
        )

        mode_options = {
            "poll": "(Default) Full scrape and alert mode. Use for most scheduled jobs.",
            "digest": "Send a daily digest of all new jobs found in the last 24 hours.",
            "health": "Run an interactive health check of the system.",
        }
        mode_choice = choose(
            "Select default Cloud Run job mode:",
            [f"{k} - {v}" for k, v in mode_options.items()],
            self.no_prompt
        )
        self.job_mode = mode_choice.split(" - ")[0]

        self.logger.info("\nScheduling Configuration:")
        self.logger.info("More frequent runs will incur higher costs. The default is optimized for minimal cost.")
        self.logger.info("Please choose a frequency that balances your alerting needs with your budget.")
        self.logger.info("Default is business hours only for maximum cost savings.")
        schedule_options = [
            "0 6-18 * * 1-5", # Business hours 6AM-6PM Mon-Fri every hour (lowest cost - default)
            "0 6,8,10,12,14,16,18 * * 1-5", # Business hours every 2 hours
            "0 */4 * * *",   # Every 4 hours 24/7
            "0 */2 * * *",   # Every 2 hours 24/7
            "0 */1 * * *",   # Every hour 24/7
            "*/30 * * * *",  # Every 30 minutes 24/7
            "*/15 * * * *",  # Every 15 minutes 24/7
        ]
        schedule_descriptions = [
            "Business hours 6AM-6PM Mon-Fri every hour (lowest cost - recommended)",
            "Business hours 6AM-6PM Mon-Fri every 2hrs (very low cost)",
            "Every 4 hours 24/7 (low cost)",
            "Every 2 hours 24/7 (moderate cost)",
            "Every hour 24/7 (higher cost)",
            "Every 30 minutes 24/7 (much higher cost)",
            "Every 15 minutes 24/7 (highest cost)",
        ]
        schedule_choices = [f"{desc} - {sched}" for desc, sched in zip(schedule_descriptions, schedule_options)]
        schedule_choice = choose("Select execution frequency:", schedule_choices, self.no_prompt)
        selected_index = schedule_choices.index(schedule_choice)
        self.schedule_frequency = schedule_options[selected_index]



    async def _create_service_accounts(self) -> None:
        self.logger.info("Creating service accounts and IAM bindings")
        runtime_name = "job-scraper-runner"
        scheduler_name = "job-scraper-scheduler"

        for sa_name in [runtime_name, scheduler_name]:
            sa_email = f"{sa_name}@{self.project_id}.iam.gserviceaccount.com"
            check_sa = await run_command(
                [
                    "gcloud", "iam", "service-accounts", "describe", sa_email,
                    f"--project={self.project_id}"
                ],
                check=False, capture_output=True,
                logger=self.logger
            )
            if check_sa.returncode == 0:
                self.logger.info(f"Service account {sa_name} already exists.")
                continue

            await run_command(
                [
                    "gcloud", "iam", "service-accounts", "create", sa_name,
                    "--display-name", f"Job Scraper {sa_name.split('-')[-1].capitalize()}",
                    "--project", self.project_id,
                    "--quiet",
                ],
                check=False,
                logger=self.logger
            )
            # Note: Service accounts don't support --update-labels, skip labeling
            pass


        project = self.project_id
        self.runtime_sa = f"{runtime_name}@{project}.iam.gserviceaccount.com"
        self.scheduler_sa = f"{scheduler_name}@{project}.iam.gserviceaccount.com"

        # Wait for service account propagation (IAM can take a few seconds)
        self.logger.info("Waiting for service accounts to propagate (5 seconds)...")
        import asyncio
        await asyncio.sleep(5)

        # Grant project-level roles
        project_bindings = [
            (self.runtime_sa, "roles/logging.logWriter"),
            (self.runtime_sa, "roles/run.invoker"),
            (self.runtime_sa, "roles/storage.objectUser"),  # For bucket read/write
            (self.scheduler_sa, "roles/run.invoker"),
            (self.scheduler_sa, "roles/iam.serviceAccountTokenCreator"),
        ]
        for member, role in project_bindings:
            await run_command(
                [
                    "gcloud",
                    "projects",
                    "add-iam-policy-binding",
                    project,
                    "--member",
                    f"serviceAccount:{member}",
                    "--role",
                    role,
                    "--quiet",
                ],
                logger=self.logger,
                retries=5,  # Add retries for IAM propagation delays
                delay=2,    # Start with 2 seconds delay
            )

        # Grant per-secret access for least privilege
        for secret_name in self.env_secret_bindings.values():
            await run_command(
                [
                    "gcloud",
                    "secrets",
                    "add-iam-policy-binding",
                    secret_name,
                    "--member",
                    f"serviceAccount:{self.runtime_sa}",
                    "--role",
                    "roles/secretmanager.secretAccessor",
                    "--project",
                    project,
                    "--quiet",
                ],
                logger=self.logger,
                retries=5,  # Add retries for IAM propagation delays
                delay=2,    # Start with 2 seconds delay
            )








    async def _setup_budget_alerts(self) -> None:
        self.logger.info("Setting up automated budget controls")
        self.logger.info("Deploying Cloud Function for automatic shutdown at 90% budget...")

        function_name = "job-scraper-budget-alerter"
        budget_topic_name = self.budget_topic_name.split('/')[-1] # Extract topic name from full resource name
        function_source_dir = str(self.project_root / "cloud" / "functions")

        result = await run_command([
            "gcloud", "functions", "deploy", function_name,
            f"--project={self.project_id}",
            f"--region={self.region}",
            f"--runtime=python312",
            f"--source={function_source_dir}",
            "--entry-point=budget_alert_handler",
            f"--trigger-topic={budget_topic_name}",
            "--gen2",
            f"--set-env-vars=GCP_PROJECT={self.project_id},SCHEDULER_LOCATION={self.scheduler_region},SCHEDULER_JOB_ID={self.job_name}-schedule",
            "--quiet"
        ], check=False, logger=self.logger, show_spinner=True, capture_output=True, retries=3, delay=5)

        if result.returncode == 0:
            self.logger.info("✓ Budget alert function deployed")
        else:
            self.logger.warning(f"Budget alert function deployment failed (non-critical, exit {result.returncode})")
            if result.stderr:
                self.logger.debug(f"Cloud Functions error: {result.stderr}")
            self.logger.info("   • Budget alerts will not auto-pause the scheduler at 90% spend")
            self.logger.info("   • Manual setup: https://cloud.google.com/billing/docs/how-to/budgets")




def get_bootstrap(logger, no_prompt: bool = False) -> GCPBootstrap:
    return GCPBootstrap(logger, no_prompt)
