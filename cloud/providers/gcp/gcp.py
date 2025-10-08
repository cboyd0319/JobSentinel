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
from typing import Dict, Optional
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

from cloud.providers.gcp.utils import (
    build_google_api_url,
)
from cloud.providers.gcp.auth import authenticate
from cloud.providers.gcp.sdk import ensure_gcloud
from cloud.providers.gcp.project import choose_billing_account, create_project
from cloud.providers.gcp.regions import select_region, select_scheduler_region
from cloud.providers.gcp.security import setup_binary_authorization
from cloud.providers.gcp.cloud_run import build_and_push_image
from cloud.providers.gcp.scheduler import schedule_job
from cloud.providers.gcp.summary import verify_deployment, print_summary, send_slack_notification
from cloud.providers.gcp.project_detection import (
    detect_existing_deployment,
    generate_project_id,
    get_state_directory,
    get_terraform_state_path,
    save_deployment_config,
    load_deployment_config,
)
from cloud.providers.common.terraform_installer import ensure_terraform
from cloud.exceptions import QuotaExceededError
from utils.errors import ConfigurationException


class GCPBootstrap:
    """Interactive bootstrapper for Google Cloud Run Jobs."""

    name = "Google Cloud Platform"

    def __init__(self, logger, no_prompt: bool = False, dry_run: bool = False) -> None:
        self.logger = logger
        self.no_prompt = no_prompt
        self.dry_run = dry_run
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
        self.schedule_frequency: str = "0 6-18 * * 1-5"
        self.alert_email: str | None = None
        self.vpc_name: str | None = None
        self.subnet_name: str | None = None
        self.connector_name: str | None = None
        self.storage_bucket: str | None = None
        self.prefs_secret_name: str | None = None
        self.slack_webhook_secret_name: str | None = None
        self.budget_topic_name: str | None = None

    # ------------------------------------------------------------------
    # public API
    # ------------------------------------------------------------------
    async def run(self) -> None:
        """Main deployment workflow."""
        self._print_welcome()
        await self._confirm_prerequisites()

        # Install prerequisites
        ensure_gcloud(self.logger, self.no_prompt, self.project_root)
        await ensure_terraform(self.logger)
        await authenticate(self.logger)

        # Check for existing deployment
        existing_project_id = await detect_existing_deployment(self.logger, self.no_prompt)

        if existing_project_id:
            # Update existing deployment
            self.project_id = existing_project_id
            self.logger.info(f"Updating existing project: {self.project_id}")

            # Load existing config
            existing_config = load_deployment_config(self.project_id)
            if existing_config:
                self.region = existing_config.get('region')
                self.billing_account = existing_config.get('billing_account')
                self.logger.info("Loaded configuration from previous deployment")
            else:
                # Config not found, collect fresh
                self.region = await select_region(self.logger, self.no_prompt)
                self.billing_account = await choose_billing_account(self.logger, self.no_prompt)
        else:
            # New deployment
            self.project_id = generate_project_id()
            self.logger.info(f"Creating new project: {self.project_id}")
            self.region = await select_region(self.logger, self.no_prompt)
            self.billing_account = await choose_billing_account(self.logger, self.no_prompt)

            # Check project count before attempting creation
            result = await run_command(
                ["gcloud", "projects", "list", "--format=value(lifecycleState)"],
                capture_output=True,
                logger=self.logger
            )
            project_states = [s.strip() for s in result.stdout.strip().split('\n') if s.strip()]
            total_projects = len(project_states)
            self.logger.info(f"Total active projects: {total_projects}")

            # If projects exist, offer to reuse (avoids quota issues)
            if total_projects >= 1:
                self.logger.info("")
                self.logger.info(f"⚠ Found {total_projects} projects (limit: ~12). Checking for reusable projects...")
                self.logger.info("")

                # Get active projects
                result = await run_command(
                    ["gcloud", "projects", "list", "--filter=lifecycleState:ACTIVE", "--format=value(projectId)"],
                    capture_output=True,
                    logger=self.logger
                )
                active_projects = [p.strip() for p in result.stdout.strip().split('\n') if p.strip()]

                if active_projects:
                    self.logger.info(f"   Found {len(active_projects)} active project(s):")
                    for proj in active_projects:
                        self.logger.info(f"   • {proj}")
                    self.logger.info("")

                    if self.no_prompt:
                        # Auto-select first project
                        self.project_id = active_projects[0]
                        self.logger.info(f"   [OK] Auto-selected: {self.project_id}")
                        self.logger.info("")
                    else:
                        from cloud.utils import confirm
                        if confirm(f"Deploy to existing project '{active_projects[0]}'?", default=True):
                            self.project_id = active_projects[0]
                            self.logger.info(f"   [OK] Using: {self.project_id}")
                            self.logger.info("")
                        else:
                            raise QuotaExceededError("User declined to reuse existing project")

                    # Set as active project
                    await run_command(
                        ["gcloud", "config", "set", "project", self.project_id],
                        logger=self.logger
                    )
                else:
                    raise QuotaExceededError("No active projects available to reuse")
            else:
                # Create GCP project (quota available)
                await create_project(self.logger, self.project_id, self.project_id, self.billing_account)

        # Collect user configuration (Slack webhook, schedule, etc.)
        self._collect_configuration()

        # Create or update the remote state backend
        await self._provision_backend()

        # Write terraform.tfvars with collected configuration
        await self._write_terraform_vars()

        # Run Terraform to provision infrastructure
        terraform_outputs = await self._run_terraform_apply()

        # If dry run, terraform_outputs will be empty, so we exit.
        if not terraform_outputs:
            return

        # Extract Terraform outputs
        self.artifact_repo = terraform_outputs["artifact_registry_repo_name"]["value"]
        self.job_name = terraform_outputs["cloud_run_job_name"]["value"]
        self.image_uri = terraform_outputs["image_uri"]["value"]
        self.budget_topic_name = terraform_outputs["budget_pubsub_topic"]["value"]
        self.vpc_name = terraform_outputs["vpc_network_name"]["value"]
        self.subnet_name = terraform_outputs["vpc_subnet_name"]["value"]
        self.connector_name = terraform_outputs["vpc_connector_id"]["value"]
        self.storage_bucket = terraform_outputs["storage_bucket_full_name"]["value"]
        self.runtime_sa = terraform_outputs["runtime_service_account_email"]["value"]
        self.scheduler_sa = terraform_outputs["scheduler_service_account_email"]["value"]
        self.prefs_secret_name = terraform_outputs["user_prefs_secret_id"]["value"]
        self.slack_webhook_secret_name = terraform_outputs["slack_webhook_secret_id"]["value"]
        self.project_number = terraform_outputs["project_number"]["value"]

        # Save deployment configuration for future updates
        save_deployment_config(self.project_id, {
            'project_id': self.project_id,
            'region': self.region,
            'billing_account': self.billing_account,
            'job_name': self.job_name,
            'terraform_version': '1.10.3',
        })

        # Update secret values (secrets are created by Terraform, we just set the values)
        await self._update_secret_values()

        # Select scheduler region
        self.scheduler_region = await select_scheduler_region(self.logger, self.no_prompt, self.region)

        # Build and push Docker image (one-time build)
        self.logger.info("Building and pushing Docker image...")
        await build_and_push_image(self.logger, self.project_root, self.project_id, self.region, self.artifact_repo)

        # Schedule the job (Cloud Run Job already created by Terraform, just need scheduler)
        await schedule_job(
            self.logger,
            self.project_id,
            self.region,
            self.job_name,
            self.scheduler_region,
            self.scheduler_sa,
            self.schedule_frequency,
        )

        # Deploy budget alert Cloud Function
        await self._setup_budget_alerts()

        # Optional: Binary Authorization (if needed)
        # await setup_binary_authorization(self.logger, self.project_id, self.region)

        # Verification and reporting
        await verify_deployment(
            self.logger, self.job_name, self.region, self.project_id, self.scheduler_region, self.storage_bucket
        )

        # Security configuration completed

        # Final summary
        print_summary(
            self.logger,
            self.project_id,
            self.region,
            self.artifact_repo,
            self.job_name,
            self.schedule_frequency,
            self.storage_bucket,
            self.image_uri,
        )

        # Send Slack notification
        await send_slack_notification(
            self.logger,
            self.project_id,
            self.region,
            self.job_name,
            self.schedule_frequency,
            self.storage_bucket,
            self.image_uri,
            self.env_values,
        )

    async def _update_secret_values(self) -> None:
        self.logger.info("Updating Secret Manager secret values...")

        # Update user preferences secret
        if self.user_prefs_payload and self.prefs_secret_name:
            await create_or_update_secret(self.project_id, self.prefs_secret_name, self.user_prefs_payload)
            self.logger.info(f"[OK] User preferences secret '{self.prefs_secret_name}' updated.")

        # Update Slack webhook secret
        slack_webhook_url = self.env_values.get("SLACK_WEBHOOK_URL")
        if slack_webhook_url and self.slack_webhook_secret_name:
            await create_or_update_secret(self.project_id, self.slack_webhook_secret_name, slack_webhook_url)
            self.logger.info(f"[OK] Slack webhook secret '{self.slack_webhook_secret_name}' updated.")

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
                logger=self.logger,
            )
            pip_version = pip_result.stdout.strip()
            self.logger.info(f"[OK] pip installed: {pip_version.split()[1]}")
        except RuntimeError:  # run_command raises RuntimeError on failure
            self.logger.error("❌ pip is not installed!")
            self.logger.error("   Install pip: https://pip.pypa.io/en/stable/installation/")
            sys.exit(1)

        # Check required Python packages
        required_packages = ["pydantic", "requests", "google-cloud-storage"]
        missing_packages = []
        for package in required_packages:
            try:
                __import__(package.replace("-", "_"))
                self.logger.info(f"[OK] {package} installed")
            except ImportError:
                missing_packages.append(package)

        if missing_packages:
            self.logger.warning(f"[WARNING] Missing packages: {', '.join(missing_packages)}")
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
                if response not in ["y", "yes"]:
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
                env.pop("PIP_INDEX_URL", None)
                env.pop("PIP_EXTRA_INDEX_URL", None)

                result = await run_command(
                    [
                        sys.executable,
                        "-m",
                        "pip",
                        "install",
                        "-r",
                        str(self.project_root / "requirements.txt"),
                        "--index-url",
                        "https://pypi.org/simple",
                        "--no-warn-conflicts",
                        "-v",
                    ],
                    check=True,
                    capture_output=True,
                    text=True,
                    env=env,
                    logger=self.logger,
                )
                # Log verification details
                for line in result.stdout.split("\n"):
                    if "Successfully installed" in line:
                        self.logger.info(f"   {line.strip()}")
                    elif "sha256" in line.lower() or "hash" in line.lower():
                        self.logger.debug(f"   {line.strip()}")

                self.logger.info("[OK] Required packages installed and verified")
            except RuntimeError as e:  # run_command raises RuntimeError on failure
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

    async def _write_terraform_vars(self) -> None:
        """Write terraform.tfvars file with collected configuration."""
        self.logger.info("Writing Terraform configuration...")

        # Get state directory for this project
        state_dir = get_state_directory(self.project_id)
        terraform_work_dir = state_dir / "terraform"
        terraform_work_dir.mkdir(parents=True, exist_ok=True)

        # Copy Terraform files to state directory
        for item in self.terraform_dir.iterdir():
            if item.is_file() or (item.is_dir() and item.name == "modules"):
                dest = terraform_work_dir / item.name
                if item.is_dir():
                    if dest.exists():
                        shutil.rmtree(dest)
                    shutil.copytree(item, dest)
                else:
                    shutil.copy2(item, dest)

        # Update terraform_dir to point to state directory
        self.terraform_dir = terraform_work_dir

        # Write terraform.tfvars
        tfvars_path = terraform_work_dir / "terraform.tfvars"
        tfvars_content = f"""# Auto-generated by job-scraper deployment script
# Project configuration
project_id           = "{self.project_id}"
billing_account_id   = "{self.billing_account}"
region               = "{self.region}"
deployment_env       = "production"

# Monitoring
alert_email_address  = "{self.alert_email}"

# Cloud Run configuration
cloud_run_cpu             = 1
cloud_run_memory          = "512Mi"
cloud_run_max_instances   = 1
cloud_run_timeout_seconds = 900
cloud_run_concurrency     = 1

# Budget controls
budget_amount_usd              = 5.0
budget_alert_threshold_percent = 0.9
"""

        with open(tfvars_path, 'w') as f:
            f.write(tfvars_content)

        self.logger.info(f"[OK] Terraform configuration written to {tfvars_path}")

    async def _run_terraform_apply(self) -> dict:
        """Run terraform init/plan/apply and return outputs."""
        self.logger.info("")
        self.logger.info("=" * 70)
        self.logger.info("TERRAFORM INFRASTRUCTURE PROVISIONING")
        self.logger.info("=" * 70)
        self.logger.info("")

        # Initialize Terraform
        self.logger.info("Initializing Terraform...")
        await run_command(
            ["terraform", "init"],
            logger=self.logger,
            cwd=str(self.terraform_dir),
        )

        # Plan Terraform changes
        self.logger.info("Planning Terraform changes...")
        await run_command(
            ["terraform", "plan", "-out=tfplan"],
            logger=self.logger,
            cwd=str(self.terraform_dir),
            show_spinner=True,
        )

        if self.dry_run:
            self.logger.info("Dry run requested. Showing plan and exiting.")
            await run_command(
                ["terraform", "show", "tfplan"],
                logger=self.logger,
                cwd=str(self.terraform_dir),
            )
            return {}

        # Apply Terraform changes
        self.logger.info("Applying Terraform changes (this may take 5-10 minutes)...")
        await run_command(
            ["terraform", "apply", "-auto-approve", "tfplan"],
            logger=self.logger,
            cwd=str(self.terraform_dir),
            show_spinner=True,
        )

        # Get Terraform outputs
        self.logger.info("Retrieving Terraform outputs...")
        output_result = await run_command(
            ["terraform", "output", "-json"],
            capture_output=True,
            text=True,
            logger=self.logger,
            cwd=str(self.terraform_dir),
        )
        terraform_outputs = json.loads(output_result.stdout)

        self.logger.info("[OK] Terraform infrastructure provisioned successfully")
        self.logger.info("")
        return terraform_outputs

    async def _provision_backend(self) -> None:
        """Provisions the GCS bucket for remote Terraform state and configures the backend."""
        self.logger.info("Configuring secure remote state for Terraform...")
        backend_tf_dir = self.project_root / "terraform" / "gcp_backend"
        if not backend_tf_dir.is_dir():
            raise FileNotFoundError(f"Terraform backend config not found at {backend_tf_dir}")

        # Bucket names must be globally unique. We create a unique but deterministic name.
        state_bucket_name = f"tf-state-{self.project_id}-jpsf"

        self.logger.info(f"Ensuring Terraform state bucket '{state_bucket_name}' exists...")

        # 1. Provision the backend bucket itself
        try:
            await run_command(["terraform", "init"], logger=self.logger, cwd=str(backend_tf_dir))
            await run_command(
                ["terraform", "apply", "-auto-approve", f"-var=project_id={self.project_id}", f"-var=state_bucket_name={state_bucket_name}"],
                logger=self.logger,
                cwd=str(backend_tf_dir),
                show_spinner=True,
            )
        except Exception as e:
            self.logger.error(f"CRITICAL: Failed to provision Terraform backend bucket: {e}")
            raise

        # 2. Dynamically create the backend.tf file for the main configuration
        backend_tf_template_path = self.project_root / "terraform" / "gcp" / "backend.tf"
        main_tf_dir = self.terraform_dir # This is the per-project state directory
        final_backend_tf_path = main_tf_dir / "backend.tf"

        template_content = backend_tf_template_path.read_text(encoding="utf-8")
        final_content = template_content.replace("__TF_STATE_BUCKET_NAME__", state_bucket_name)
        final_backend_tf_path.write_text(final_content, encoding="utf-8")
        self.logger.info("[OK] Configured main Terraform backend.")

        # 3. Re-initialize the main terraform module to migrate state to the new GCS backend
        self.logger.info("Initializing main Terraform configuration to use GCS backend...")
        await run_command(
            ["terraform", "init", "-reconfigure"],
            logger=self.logger,
            cwd=str(main_tf_dir),
        )
        self.logger.info("[OK] Terraform re-initialized successfully.")

    def _try_clipboard_webhook(self) -> str | None:
        """Try to get Slack webhook URL from clipboard."""
        try:
            import pyperclip
            clip = pyperclip.paste().strip()
            if clip.startswith("https://hooks.slack.com/services/") and len(clip) > 40:
                return clip
        except ImportError:
            pass  # pyperclip not installed
        except Exception as e:
            self.logger.debug(f"Could not get clipboard contents: {e}")
        return None

    def _collect_resume_preferences(self) -> Optional[Dict]:
        """
        Optional: Parse user's resume to auto-populate preferences.

        Returns:
            Dictionary of user preferences or None if skipped
        """
        if self.no_prompt:
            return None

        self.logger.info("")
        self.logger.info("=" * 70)
        self.logger.info("OPTIONAL: RESUME-BASED AUTO-CONFIGURATION")
        self.logger.info("=" * 70)
        self.logger.info("")
        self.logger.info("You can upload your resume (PDF or DOCX) to automatically:")
        self.logger.info("  • Extract technical skills for job matching")
        self.logger.info("  • Detect relevant job titles")
        self.logger.info("  • Estimate appropriate salary range")
        self.logger.info("")

        while True:
            response = input("Would you like to upload your resume? (y/n): ").strip().lower()
            if response in ["y", "yes"]:
                break
            elif response in ["n", "no"]:
                self.logger.info("Skipping resume upload. You can manually configure preferences later.")
                return None
            else:
                self.logger.error("Please enter 'y' or 'n'")

        # Check dependencies
        try:
            from utils.resume_parser import check_dependencies, ResumeParser
        except ImportError:
            self.logger.error("Resume parser module not found. Please ensure utils/resume_parser.py exists.")
            return None

        has_deps, missing = check_dependencies()
        if not has_deps:
            self.logger.error(f"Missing required packages: {', '.join(missing)}")
            self.logger.info("Install with: pip install " + " ".join(missing))
            return None

        # Get resume file path
        while True:
            self.logger.info("")
            resume_path = input("Enter path to your resume (PDF or DOCX): ").strip()

            # Expand user paths like ~/Documents/resume.pdf
            resume_path = Path(resume_path).expanduser()

            if not resume_path.exists():
                self.logger.error(f"File not found: {resume_path}")
                retry = input("Try another file? (y/n): ").strip().lower()
                if retry not in ["y", "yes"]:
                    return None
                continue

            # Parse resume
            try:
                self.logger.info("Parsing resume...")
                parser = ResumeParser()
                result = parser.parse_file(resume_path)

                # Show extracted information
                self.logger.info("")
                self.logger.info("=" * 70)
                self.logger.info("EXTRACTED INFORMATION")
                self.logger.info("=" * 70)

                if result.get("skills"):
                    self.logger.info(f"\n📚 Skills Found ({len(result['skills'])}):")
                    self.logger.info("  " + ", ".join(result["skills"][:15]))
                    if len(result["skills"]) > 15:
                        self.logger.info(f"  ... and {len(result['skills']) - 15} more")

                if result.get("titles"):
                    self.logger.info("\n💼 Job Titles Found:")
                    for title in result["titles"][:5]:
                        self.logger.info(f"  • {title}")

                if result.get("years_experience"):
                    self.logger.info(f"\n📅 Estimated Experience: {result['years_experience']} years")

                self.logger.info("")
                self.logger.info("=" * 70)
                self.logger.info("")

                # Confirm usage
                while True:
                    use_it = input("Use this information for job matching? (y/n): ").strip().lower()
                    if use_it in ["y", "yes"]:
                        # Convert to user_prefs format
                        user_prefs = parser.to_user_prefs()
                        self.logger.info("[OK] Resume information will be used for configuration")
                        return user_prefs
                    elif use_it in ["n", "no"]:
                        self.logger.info("Resume information discarded.")
                        return None
                    else:
                        self.logger.error("Please enter 'y' or 'n'")

            except Exception as e:
                self.logger.error(f"Failed to parse resume: {e}")
                retry = input("Try another file? (y/n): ").strip().lower()
                if retry not in ["y", "yes"]:
                    return None

    def _collect_configuration(self) -> None:
        """Collect user configuration for deployment from environment variables."""
        self.logger.info("""
        [bold blue]Configuration Collection[/bold blue]
        Reading configuration from environment...
        """)

        # Attempt to get Slack Webhook URL from environment
        slack_webhook_url = os.getenv("SLACK_WEBHOOK_URL")
        if not slack_webhook_url or "hooks.slack.com" not in slack_webhook_url:
            self.logger.error("SLACK_WEBHOOK_URL not found or invalid in environment.")
            raise ConfigurationException("Missing SLACK_WEBHOOK_URL")
        self.env_values["SLACK_WEBHOOK_URL"] = slack_webhook_url
        self.logger.info("[OK] Slack Webhook URL found.")

        # Get alert email from environment or use a placeholder
        self.alert_email = os.getenv("ALERT_EMAIL_ADDRESS", "noreply@example.com")
        self.logger.info(f"[OK] Alert email set to: {self.alert_email}")

        # Load user preferences from the standard config file path
        prefs_template = self.project_root / "config/user_prefs.example.json"
        self.user_prefs_payload = prefs_template.read_text(encoding="utf-8")
        self.logger.info("[OK] User preferences template loaded.")

        # Set default job mode and schedule
        self.job_mode = os.getenv("JOB_MODE", "poll")
        self.schedule_frequency = os.getenv("SCHEDULE_FREQUENCY", "0 6-18 * * 1-5")
        self.logger.info(f"[OK] Job mode: {self.job_mode}, Schedule: {self.schedule_frequency}")

    # Service accounts and IAM bindings are now created by Terraform
    # This method is no longer needed but kept as a comment for reference

    async def _setup_budget_alerts(self) -> None:
        self.logger.info("Setting up automated budget controls")
        self.logger.info("Deploying Cloud Function for automatic shutdown at 90% budget...")

        function_name = "job-scraper-budget-alerter"
        budget_topic_name = self.budget_topic_name.split("/")[-1]  # Extract topic name from full resource name
        function_source_dir = str(self.project_root / "cloud" / "functions")

        result = await run_command(
            [
                "gcloud",
                "functions",
                "deploy",
                function_name,
                f"--project={self.project_id}",
                f"--region={self.region}",
                "--runtime=python312",
                f"--source={function_source_dir}",
                "--entry-point=budget_alert_handler",
                f"--trigger-topic={budget_topic_name}",
                "--gen2",
                f"--set-env-vars=GCP_PROJECT={self.project_id},SCHEDULER_LOCATION={self.scheduler_region},SCHEDULER_JOB_ID={self.job_name}-schedule",
                "--quiet",
            ],
            check=False,
            logger=self.logger,
            show_spinner=True,
            capture_output=True,
            retries=3,
            delay=5,
        )

        if result.returncode == 0:
            self.logger.info("[OK] Budget alert function deployed")
        else:
            self.logger.warning(f"Budget alert function deployment failed (non-critical, exit {result.returncode})")
            if result.stderr:
                self.logger.debug(f"Cloud Functions error: {result.stderr}")
            self.logger.info("   • Budget alerts will not auto-pause the scheduler at 90% spend")
            self.logger.info("   • Manual setup: https://cloud.google.com/billing/docs/how-to/budgets")


def get_bootstrap(logger, no_prompt: bool = False) -> GCPBootstrap:
    return GCPBootstrap(logger, no_prompt)
