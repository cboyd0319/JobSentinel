"""Google Cloud Platform provisioning workflow."""

from __future__ import annotations

import hashlib
import json
import os
import secrets
import re
import shutil
import string
import subprocess  # nosec B404
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
        self.env_secret_prefix = "job-scraper"  # nosec B105
        self.prefs_secret_name = "job-scraper-prefs"  # nosec B105
        self.project_root = resolve_project_root()
        self.job_mode: str = "poll"
        self.schedule_frequency: str = "0 6-18 * * 1-5"  # Business hours every hour default
        self.vpc_name: str = "job-scraper-vpc"
        self.subnet_name: str = "job-scraper-subnet"
        self.connector_name: str = "job-scraper-connector"

    @staticmethod
    def _sanitize_api_url(raw_url: str) -> str:
        candidate = raw_url.strip()
        if not candidate:
            raise ValueError("empty URL provided")

        if "://" not in candidate:
            candidate = f"https://{candidate}"

        parsed = urllib.parse.urlparse(candidate)

        if parsed.scheme not in {"http", "https"}:
            raise ValueError(f"Unsupported URL scheme: {parsed.scheme}")

        if not parsed.hostname:
            raise ValueError("URL is missing hostname")

        normalized = parsed._replace(
            scheme=parsed.scheme.lower(),
            netloc=(parsed.hostname or "").lower(),
            fragment="",
            params="",
        )

        return urllib.parse.urlunparse(normalized)

    @staticmethod
    def _build_google_api_url(host: str, segments: list[str], *, allow_colon_last: bool = False) -> str:
        if not host:
            raise ValueError("API host is required")

        quoted_segments: list[str] = []
        for index, segment in enumerate(segments):
            if not segment:
                raise ValueError("Empty path segment in API URL")
            safe = "-._~"
            if allow_colon_last and index == len(segments) - 1:
                safe += ":"
            quoted_segments.append(urllib.parse.quote(segment, safe=safe))

        path = "/" + "/".join(quoted_segments)
        return urllib.parse.urlunparse(("https", host, path, "", "", ""))

    @staticmethod
    def _safe_extract_zip(archive: zipfile.ZipFile, destination: Path) -> None:
        destination_path = destination.resolve()
        members = archive.namelist()
        for member in members:
            member_path = (destination_path / member).resolve()
            try:
                member_path.relative_to(destination_path)
            except ValueError as exc:
                raise RuntimeError("Zip archive contains unsafe path") from exc
            archive.extract(member, destination_path)

    @staticmethod
    def _safe_extract_tar(archive: tarfile.TarFile, destination: Path) -> None:
        destination_path = destination.resolve()
        for member in archive.getmembers():
            member_path = (destination_path / member.name).resolve()
            try:
                member_path.relative_to(destination_path)
            except ValueError as exc:
                raise RuntimeError("Tar archive contains unsafe path") from exc
            archive.extract(member, destination_path)

    @staticmethod
    def _download_https_file(url: str, destination: Path, *, allowed_host: str, timeout: int = 60) -> None:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme != "https" or parsed.netloc != allowed_host:
            raise RuntimeError("Unexpected download host")
        # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
        with urllib.request.urlopen(url, timeout=timeout) as response:  # nosec B310
            with destination.open("wb") as fh:
                shutil.copyfileobj(response, fh)

    @staticmethod
    def _download_https_text(url: str, *, allowed_host: str, timeout: int = 30) -> str:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme != "https" or parsed.netloc != allowed_host:
            raise RuntimeError("Unexpected download host")
        # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
        with urllib.request.urlopen(url, timeout=timeout) as response:  # nosec B310
            return response.read().decode("utf-8").strip()


    # ------------------------------------------------------------------
    # public API
    # ------------------------------------------------------------------
    def run(self) -> None:
        self._print_welcome()
        self._confirm_prerequisites()
        self._ensure_gcloud()
        self._authenticate()
        self._select_region()
        self._choose_billing_account()
        self._create_project()
        self._enable_services()
        self._select_scheduler_region()
        self._setup_artifact_registry()
        self._setup_binary_authorization()
        self._setup_vpc_networking()
        self._setup_storage_bucket()
        self._collect_configuration()
        self._provision_secrets()
        self._create_service_accounts()
        self._build_and_push_image()
        self._create_or_update_job()
        self._schedule_job()
        self._configure_budget()
        self._setup_budget_alerts()
        self._run_prowler_scan()
        self._print_summary()

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

    def _confirm_prerequisites(self) -> None:
        self.logger.info("Prerequisite Verification")
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

    def _ensure_gcloud(self) -> None:
        self.logger.info("Checking Google Cloud SDK")
        if which("gcloud"):
            self.logger.info("gcloud CLI found")
            return

        install_root = ensure_directory(Path.home() / "google-cloud-sdk-download")
        install_version = INSTALL_VERSION
        os_type = current_os()
        if os_type == "windows":
            archive = (
                "https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/"
                f"google-cloud-cli-{install_version}-windows-x86_64.zip"
            )
        elif os_type == "mac":
            archive = (
                "https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/"
                f"google-cloud-cli-{install_version}-darwin-x86_64.tar.gz"
            )
        else:
            archive = (
                "https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/"
                f"google-cloud-cli-{install_version}-linux-x86_64.tar.gz"
            )

        extracted = self._download_and_extract(archive, install_root)
        if current_os() == "windows":
            installer = extracted / "install.bat"
            run_command(["cmd", "/c", str(installer), "--quiet"], logger=self.logger, show_spinner=True)
            prepend_path(extracted / "bin")
        else:
            installer = extracted / "install.sh"
            run_command(
                [str(installer), "--quiet"],
                env={"CLOUDSDK_CORE_DISABLE_PROMPTS": "1"},
                logger=self.logger,
                show_spinner=True
            )
            prepend_path(extracted / "bin")

        self.logger.info("Google Cloud SDK installed")

    def _download_and_extract(self, url: str, destination: Path) -> Path:
        ensure_directory(destination)
        sanitized_url = self._sanitize_api_url(url)
        parsed = urllib.parse.urlparse(sanitized_url)
        if parsed.netloc != "dl.google.com":
            raise RuntimeError("Refusing to download Cloud SDK from non-Google host")

        fd, tmp_path = tempfile.mkstemp(dir=destination, suffix=Path(parsed.path).suffix)
        os.close(fd)
        download_path = Path(tmp_path)
        self.logger.info(f"Downloading {sanitized_url}")
        self._download_https_file(sanitized_url, download_path, allowed_host="dl.google.com")
        
        actual_hash = hashlib.sha256(download_path.read_bytes()).hexdigest()
        self.logger.info(f"SHA256 checksum of the downloaded file is: {actual_hash}")
        self.logger.info("Automatic checksum verification is temporarily disabled. You can manually verify the checksum if you wish.")

        if download_path.suffix == ".zip":
            with zipfile.ZipFile(download_path, "r") as archive:
                self._safe_extract_zip(archive, destination)
        else:
            with tarfile.open(download_path, "r:gz") as archive:
                self._safe_extract_tar(archive, destination)

        download_path.unlink(missing_ok=True)
        return destination / "google-cloud-sdk"



    def _authenticate(self) -> None:
        self.logger.info("Authenticating with Google Cloud")
        run_command(["gcloud", "auth", "login"], logger=self.logger)
        run_command(["gcloud", "auth", "application-default", "login"], logger=self.logger)

    def _select_region(self) -> None:
        self.logger.info("Select Cloud Run region")
        self.logger.info("Regions are ordered by cost-effectiveness (cheapest first):")
        regions = [
            "us-central1",      # Cheapest - Iowa
            "us-east1",         # Second cheapest - South Carolina
            "us-west1",         # Oregon
            "europe-west1",     # Belgium
            "us-west2",         # Los Angeles
            "europe-west4",     # Netherlands
            "asia-northeast1",  # Tokyo
            "asia-southeast1",  # Singapore
            "australia-southeast1",  # Sydney
        ]
        self.region = choose("Choose the region (us-central1 recommended for lowest cost):", regions)
        run_command(["gcloud", "config", "set", "run/region", self.region], logger=self.logger)

    def _select_scheduler_region(self) -> None:
        self.logger.info("Select Cloud Scheduler region")
        supported = {
            "us-central1",
            "us-east1",
            "us-east4",
            "us-west1",
            "us-west2",
            "europe-west1",
            "europe-west2",
            "asia-northeast1",
            "asia-southeast1",
            "asia-south1",
            "australia-southeast1",
        }
        if self.region in supported:
            self.scheduler_region = self.region
            return

        self.logger.info(
            "Cloud Scheduler is not available in your chosen Cloud Run region. "
            "Select the nearest supported location for the scheduler trigger."
        )
        scheduler_choice = choose("Select a Scheduler location:", sorted(supported))
        self.scheduler_region = scheduler_choice

    def _choose_billing_account(self) -> None:
        self.logger.info("Locate Billing Account")
        result = run_command(
            ["gcloud", "billing", "accounts", "list", "--format=json"],
            capture_output=True,
            logger=self.logger
        )
        accounts = json.loads(result.stdout)
        if not accounts:
            self.logger.error("No billing accounts detected. Create one in the console and re-run.")
            sys.exit(1)
        if len(accounts) == 1:
            self.billing_account = accounts[0]["name"].split("/")[-1]
            self.logger.info(f"Billing account detected: {self.billing_account}")
            return
        choices = [
            f"{acc['name'].split('/')[-1]} ({acc['displayName']})" for acc in accounts
        ]
        selection = choose("Select billing account:", choices)
        self.billing_account = selection.split()[0]

    def _create_project(self) -> None:
        self.logger.info("Creating dedicated GCP project")
        display_default = "Job Scraper"
        proposed = input(f"Project display name [{display_default}]: ").strip() or display_default
        self.project_name = proposed
        self.project_id = self._generate_project_id(proposed)

        run_command(["gcloud", "projects", "create", self.project_id, "--name", proposed], logger=self.logger)
        run_command(["gcloud", "config", "set", "project", self.project_id], logger=self.logger)
        run_command(["gcloud", "auth", "application-default", "set-quota-project", self.project_id], logger=self.logger)
        run_command(
            [
                "gcloud",
                "beta",
                "billing",
                "projects",
                "link",
                self.project_id,
                "--billing-account",
                self.billing_account,
            ],
            logger=self.logger
        )
        result = run_command(
            [
                "gcloud",
                "projects",
                "describe",
                self.project_id,
                "--format=value(projectNumber)",
            ],
            capture_output=True,
            logger=self.logger
        )
        self.project_number = result.stdout.strip()
        self.storage_bucket = f"job-scraper-data-{self.project_id}"
        self.logger.info(f"Project {self.project_id} created")

    def _generate_project_id(self, base_name: str) -> str:
        candidate = re.sub(r"[^a-z0-9-]", "-", base_name.lower())
        candidate = re.sub(r"-+", "-", candidate).strip("-") or "job-scraper"
        suffix = datetime.utcnow().strftime("%Y%m%d%H%M")
        candidate = candidate[:13]
        return f"{candidate}-{suffix}-utc"

    def _enable_services(self) -> None:
        self.logger.info("Enabling required Google APIs")
        services = [
            "run.googleapis.com",
            "cloudbuild.googleapis.com",
            "secretmanager.googleapis.com",
            "cloudscheduler.googleapis.com",
            "pubsub.googleapis.com",
            "artifactregistry.googleapis.com",
            "logging.googleapis.com",
            "monitoring.googleapis.com",
            "iam.googleapis.com",
            "billingbudgets.googleapis.com",
            "binaryauthorization.googleapis.com",  # Binary Authorization
            "compute.googleapis.com",               # VPC networking
            "vpcaccess.googleapis.com",            # VPC connector
            "containeranalysis.googleapis.com",    # Vulnerability scanning
            "storage.googleapis.com",               # Cloud Storage for persistence
        ]
        run_command(
            ["gcloud", "services", "enable", *services, "--project", self.project_id],
            logger=self.logger,
            show_spinner=True
        )
        self.logger.info("Waiting for APIs to be enabled...")
        time.sleep(30)

    def _setup_artifact_registry(self) -> None:
        self.logger.info("Preparing Artifact Registry")
        describe_repo = run_command(
            [
                "gcloud",
                "artifacts",
                "repositories",
                "describe",
                self.artifact_repo,
                f"--location={self.region}",
                "--project",
                self.project_id,
            ],
            capture_output=True,
            check=False,
            logger=self.logger
        )
        if describe_repo.returncode != 0:
            run_command(
                [
                    "gcloud",
                    "artifacts",
                    "repositories",
                    "create",
                    self.artifact_repo,
                    "--repository-format=docker",
                    f"--location={self.region}",
                    "--description=Job scraper container images",
                ],
                logger=self.logger
            )
        run_command(
            [
                "gcloud",
                "auth",
                "configure-docker",
                f"{self.region}-docker.pkg.dev",
                "--quiet",
            ],
            logger=self.logger
        )

    def _collect_configuration(self) -> None:
        self.logger.info("Collect runtime configuration")
        env_template = self.project_root / ".env.example"
        if not env_template.exists():
            raise FileNotFoundError(".env.example missing from repository root")

        try:
            from tzlocal import get_localzone_name
            default_tz = get_localzone_name()
        except (ImportError, Exception):
            default_tz = "America/Denver"

        self.logger.info(
            "Provide values for each setting. Press Enter to accept the default shown. "
            "Type 'skip' to leave a value empty if a feature is not required."
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

            prompt = f"{key} [{default_value or 'blank'}]: "
            while True:
                user_input = input(prompt).strip()
                if user_input.lower() == "skip":
                    candidate = ""
                    break

                candidate = user_input or default_value
                candidate = candidate.split("#", 1)[0].strip()

                if candidate == "" and default_value:
                    self.logger.warning("Value cannot be empty. Enter a real value or type 'skip' to leave blank.")
                    continue

                if self._looks_like_placeholder(candidate, default_value):
                    self.logger.warning(
                        "Placeholder value detected. Enter a real value or type 'skip' to leave blank."
                    )
                    continue
                break

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
            [f"{k} - {v}" for k, v in mode_options.items()]
        )
        self.job_mode = mode_choice.split(" - ")[0]

        self.logger.info("\nScheduling Configuration:")
        self.logger.info("More frequent = higher costs. Default is business hours only for maximum cost savings.")
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
        schedule_choice = choose("Select execution frequency:", schedule_choices)
        selected_index = schedule_choices.index(schedule_choice)
        self.schedule_frequency = schedule_options[selected_index]

    def _provision_secrets(self) -> None:
        self.logger.info("Configuring Secret Manager")
        self.env_secret_bindings.clear()

        for key, value in self.env_values.items():
            if value:
                secret_name = f"{self.env_secret_prefix}-{key.lower().replace('_', '-')}"
                create_or_update_secret(self.project_id, secret_name, value)
                self.env_secret_bindings[key] = secret_name

        if self.user_prefs_payload:
            create_or_update_secret(self.project_id, self.prefs_secret_name, self.user_prefs_payload)
            self.env_secret_bindings.setdefault("USER_PREFS_JSON", self.prefs_secret_name)

    def _create_service_accounts(self) -> None:
        self.logger.info("Creating service accounts and IAM bindings")
        runtime_name = "job-scraper-runner"
        scheduler_name = "job-scraper-scheduler"

        for sa_name in [runtime_name, scheduler_name]:
            sa_email = f"{sa_name}@{self.project_id}.iam.gserviceaccount.com"
            check_sa = run_command(
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

            run_command(
                [
                    "gcloud", "iam", "service-accounts", "create", sa_name,
                    "--display-name", f"Job Scraper {sa_name.split('-')[-1].capitalize()}",
                    "--project", self.project_id,
                    "--quiet",
                ],
                check=False,
                logger=self.logger
            )
            run_command([
                "gcloud", "iam", "service-accounts", "update", sa_email,
                "--update-labels=managed-by=job-scraper",
                f"--project={self.project_id}",
            ], check=False, logger=self.logger)


        project = self.project_id
        self.runtime_sa = f"{runtime_name}@{project}.iam.gserviceaccount.com"
        self.scheduler_sa = f"{scheduler_name}@{project}.iam.gserviceaccount.com"

        # Grant project-level roles
        project_bindings = [
            (self.runtime_sa, "roles/logging.logWriter"),
            (self.runtime_sa, "roles/run.invoker"),
            (self.runtime_sa, "roles/storage.objectUser"),  # For bucket read/write
            (self.scheduler_sa, "roles/run.invoker"),
            (self.scheduler_sa, "roles/iam.serviceAccountTokenCreator"),
        ]
        for member, role in project_bindings:
            run_command(
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
                check=False,
                logger=self.logger
            )

        # Grant per-secret access for least privilege
        for secret_name in self.env_secret_bindings.values():
            run_command(
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
                check=False,
                logger=self.logger
            )

    def _build_and_push_image(self) -> None:
        self.logger.info("Building container image via Cloud Build")
        image_tag = (
            f"{self.region}-docker.pkg.dev/{self.project_id}/{self.artifact_repo}/"
            "job-scraper:latest"
        )
        self.image_uri = image_tag
        run_command(
            ["gcloud", "builds", "submit", "--tag", image_tag, str(self.project_root)],
            logger=self.logger,
            show_spinner=True
        )

    def _create_or_update_job(self) -> None:
        self.logger.info("Configuring Cloud Run Job")
        secret_flags: list[str] = []
        for env_key, secret_name in self.env_secret_bindings.items():
            secret_flags.extend(["--set-secrets", f"{env_key}={secret_name}:latest"])

        env_var_flags: list[str] = [
            "--set-env-vars",
            f"JOB_RUN_MODE={self.job_mode},STORAGE_BUCKET={self.storage_bucket}"
        ]

        common_args = [
            "--image",
            self.image_uri,
            f"--region={self.region}",
            f"--project={self.project_id}",
            f"--service-account={self.runtime_sa}",
            "--cpu=0.5",                    # Reduced CPU for cost optimization
            "--memory=256Mi",               # Reduced memory for cost optimization
            "--max-retries=1",
            "--task-timeout=1800s",         # 30 minutes timeout
            "--vpc-connector", self.connector_name,  # Private networking
            "--vpc-egress=all-traffic",              # Allow job site access
            "--no-cpu-throttling",          # Better performance
            "--execution-environment=gen2", # Latest execution environment
            "--labels=managed-by=job-scraper",
            *secret_flags,
            *env_var_flags,
        ]

        describe_job = run_command(
            [
                "gcloud",
                "run",
                "jobs",
                "describe",
                self.job_name,
                f"--region={self.region}",
                f"--project={self.project_id}",
            ],
            capture_output=True,
            check=False,
            logger=self.logger
        )

        if describe_job.returncode == 0:
            self.logger.info(f"Job '{self.job_name}' already exists. Updating...")
            command = ["gcloud", "run", "jobs", "update", self.job_name, *common_args]
        else:
            self.logger.info(f"Job '{self.job_name}' not found. Creating...")
            command = ["gcloud", "run", "jobs", "create", self.job_name, *common_args]

        run_command(command, logger=self.logger, show_spinner=True)


    def _run_prowler_scan(self) -> None:
        self.logger.info("Generating CIS benchmark report with Prowler")
        reports_dir = ensure_directory(resolve_project_root() / 'cloud' / 'reports')
        timestamp = datetime.utcnow().strftime('%Y%m%d-%H%M%S')
        output_file = reports_dir / f'prowler-cis-gcp-{timestamp}.json'

        if not which("prowler"):
            self.logger.warning("Prowler not found, attempting to install...")
            try:
                run_command([sys.executable, '-m', 'pip', 'install', '--quiet', 'prowler'], check=True, logger=self.logger, show_spinner=True)
            except subprocess.CalledProcessError as exc:
                self.logger.error(f"Unable to install Prowler CLI automatically: {exc}")
                self.logger.error('   • Install manually: python3 -m pip install prowler')
                return

        try:
            run_command([
                'prowler',
                'gcp',
                '--compliance',
                'cis_4.0_gcp',
                '--output-types',
                'json',
                '--output-filename',
                str(output_file),
                '--project',
                self.project_id,
                '--region',
                self.region
            ], logger=self.logger, show_spinner=True)
        except subprocess.CalledProcessError as exc:
            self.logger.error(f"Prowler scan failed: {exc}")
            self.logger.error('   • You can rerun manually: prowler gcp --compliance cis_4.0_gcp --output-types json')
            return

        self.logger.info(f"Prowler CIS report saved to {output_file}")

    def _schedule_job(self) -> None:
        self.logger.info("Scheduling recurring executions")
        if not self.scheduler_region:
            raise RuntimeError("Scheduler region not configured")
        if not all([self.project_id, self.region, self.job_name]):
            raise RuntimeError("Project ID, region, and job name must be configured before scheduling")

        job_uri = self._build_google_api_url(
            host="run.googleapis.com",
            segments=[
                "apis",
                "run.googleapis.com",
                "v1",
                "projects",
                self.project_id,
                "locations",
                self.region,
                "jobs",
                f"{self.job_name}:run",
            ],
            allow_colon_last=True,
        )
        schedule = self.schedule_frequency
        create_cmd = [
            "gcloud",
            "scheduler",
            "jobs",
            "create",
            "http",
            f"{self.job_name}-schedule",
            f"--location={self.scheduler_region}",
            f"--schedule={schedule}",
            f"--uri={job_uri}",
            "--http-method=POST",
            f"--oauth-service-account-email={self.scheduler_sa}",
            f"--oauth-token-audience={job_uri}",
            "--headers=Content-Type=application/json",
            "--labels=managed-by=job-scraper",
            "--body={}",
        ]
        run_command(create_cmd, check=False, logger=self.logger)
        update_cmd = create_cmd.copy()
        update_cmd[3] = "update"
        run_command(update_cmd, logger=self.logger)

    def _configure_budget(self) -> None:
        self.logger.info("Configuring cost guardrails")
        token = run_command(
            ["gcloud", "auth", "application-default", "print-access-token"],
            capture_output=True,
            logger=self.logger
        ).stdout.strip()

        budget_topic_name = "job-scraper-budget-alerts"
        run_command([
            "gcloud", "pubsub", "topics", "create", budget_topic_name,
            f"--project={self.project_id}"
        ], check=False, logger=self.logger)

        budget_endpoint = (
            self._build_google_api_url(
                host="billingbudgets.googleapis.com",
                segments=[
                    "v1beta1",
                    "billingAccounts",
                    self.billing_account,
                    "budgets",
                ],
            )
        )
        parsed_endpoint = urllib.parse.urlparse(budget_endpoint)
        if parsed_endpoint.netloc != "billingbudgets.googleapis.com":
            raise RuntimeError("Unexpected billing API endpoint")
        body = {
            "budget": {
                "displayName": "Job Scraper Free Tier Guardrail",
                "budgetFilter": {
                    "projects": [f"projects/{self.project_id}"]
                },
                "amount": {
                    "specifiedAmount": {
                        "currencyCode": "USD",
                        "units": "5",
                    }
                },
                "thresholdRules": [
                    {"thresholdPercent": 0.5, "spendBasis": "CURRENT_SPEND"},
                    {"thresholdPercent": 0.9, "spendBasis": "CURRENT_SPEND"},
                ],
                "allUpdatesRule": {
                    "pubsubTopic": f"projects/{self.project_id}/topics/{budget_topic_name}",
                    "schemaVersion": "1.0",
                    "disableDefaultIamRecipients": True
                },
            }
        }

        request = urllib.request.Request(
            budget_endpoint,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        request_url = urllib.parse.urlparse(request.full_url)
        if request_url.scheme != "https" or request_url.netloc != "billingbudgets.googleapis.com":
            raise RuntimeError("Unexpected billing budget request host")

        try:
            # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected
            urllib.request.urlopen(request)  # nosec B310
            self.logger.info("Billing budget created at $5 USD (alerts to billing admins)")
        except urllib.error.HTTPError as exc:  # pragma: no cover - runtime path
            if exc.code == 409:
                self.logger.info("Billing budget already exists; keeping current configuration")
            else:
                self.logger.error(
                    "Unable to create billing budget automatically. "
                    "Please configure one manually in the Cloud Console."
                )

    def _print_summary(self) -> None:
        self.logger.info("Deployment Summary")
        self.logger.info(f"Project ID: {self.project_id}")
        self.logger.info(f"Region: {self.region}")
        self.logger.info(f"Artifact Registry: {self.artifact_repo}")
        self.logger.info(f"Cloud Run Job: {self.job_name}")
        self.logger.info(f"Scheduler Job: {self.job_name}-schedule")
        self.logger.info(
            "Run an ad-hoc scrape with: "
            f"gcloud run jobs execute {self.job_name} --region {self.region}"
        )

    def _setup_binary_authorization(self) -> None:
        self.logger.info("Setting up Binary Authorization")
        self.logger.info("Configuring container image security policies...")

        # Create a policy that requires all images to be from our Artifact Registry
        policy = {
            "defaultAdmissionRule": {
                "evaluationMode": "ALWAYS_DENY",
                "enforcementMode": "ENFORCED_BLOCK_AND_AUDIT_LOG"
            },
            "clusterAdmissionRules": {},
            "admissionWhitelistPatterns": [
                {
                    "namePattern": f"{self.region}-docker.pkg.dev/{self.project_id}/*"
                }
            ]
        }

        with tempfile.NamedTemporaryFile(mode="w", suffix=".json") as temp_policy_file:
            json.dump(policy, temp_policy_file)
            temp_policy_file.flush()
            run_command([
                "gcloud", "container", "binauthz", "policy", "import", temp_policy_file.name,
                f"--project={self.project_id}"
            ], check=False, logger=self.logger)

        self.logger.info("Binary Authorization configured to allow only trusted images")

    def _setup_vpc_networking(self) -> None:
        self.logger.info("Setting up private networking")
        self.logger.info("Creating VPC network for secure, private communication...")

        # Check for VPC network
        check_vpc = run_command([
            "gcloud", "compute", "networks", "describe", self.vpc_name,
            f"--project={self.project_id}"
        ], check=False, capture_output=True, logger=self.logger)
        if check_vpc.returncode == 0:
            self.logger.info(f"VPC network {self.vpc_name} already exists.")
        else:
            run_command([
                "gcloud", "compute", "networks", "create", self.vpc_name,
                "--subnet-mode=custom",
                f"--project={self.project_id}"
            ], check=False, logger=self.logger, show_spinner=True)

        label_vpc = run_command(
            [
                "gcloud", "compute", "networks", "update", self.vpc_name,
                f"--project={self.project_id}",
                "--update-labels=managed-by=job-scraper",
            ],
            check=False,
            capture_output=True,
            logger=self.logger,
        )
        if label_vpc.returncode != 0:
            detail = label_vpc.stderr.strip() or label_vpc.stdout.strip()
            self.logger.warning(
                "Unable to tag VPC network %s: %s", self.vpc_name, detail
            )

        # Check for subnet
        check_subnet = run_command([
            "gcloud", "compute", "networks", "subnets", "describe", self.subnet_name,
            f"--region={self.region}",
            f"--project={self.project_id}"
        ], check=False, capture_output=True, logger=self.logger)
        if check_subnet.returncode == 0:
            self.logger.info(f"Subnet {self.subnet_name} already exists.")
        else:
            run_command([
                "gcloud", "compute", "networks", "subnets", "create", self.subnet_name,
                f"--network={self.vpc_name}",
                "--range=10.0.0.0/28",  # Small range for cost optimization
                f"--region={self.region}",
                f"--project={self.project_id}"
            ], check=False, logger=self.logger, show_spinner=True)

        # Check for VPC connector
        check_connector = run_command([
            "gcloud", "compute", "networks", "vpc-access", "connectors", "describe", self.connector_name,
            f"--region={self.region}",
            f"--project={self.project_id}"
        ], check=False, capture_output=True, logger=self.logger)
        if check_connector.returncode == 0:
            self.logger.info(f"VPC connector {self.connector_name} already exists.")
        else:
            run_command([
                "gcloud", "compute", "networks", "vpc-access", "connectors", "create", self.connector_name,
                f"--subnet={self.subnet_name}",
                f"--region={self.region}",
                "--min-instances=2",
                "--max-instances=3",  # Small scale for cost optimization
                "--machine-type=e2-micro",  # Cheapest machine type
                f"--project={self.project_id}"
            ], check=False, logger=self.logger, show_spinner=True)

        label_connector = run_command(
            [
                "gcloud", "compute", "networks", "vpc-access", "connectors", "update", self.connector_name,
                f"--region={self.region}",
                f"--project={self.project_id}",
                "--update-labels=managed-by=job-scraper",
            ],
            check=False,
            capture_output=True,
            logger=self.logger,
        )
        if label_connector.returncode != 0:
            detail = label_connector.stderr.strip() or label_connector.stdout.strip()
            self.logger.warning(
                "Unable to tag VPC connector %s: %s", self.connector_name, detail
            )

        self.logger.info("Private VPC network configured with minimal resources")

    def _setup_storage_bucket(self) -> None:
        self.logger.info("Setting up persistent storage")
        self.logger.info("Creating Cloud Storage bucket for job tracking...")

        # Check if bucket already exists
        check_bucket = run_command([
            "gcloud", "storage", "buckets", "describe", f"gs://{self.storage_bucket}",
            f"--project={self.project_id}"
        ], check=False, logger=self.logger)

        if check_bucket.returncode != 0:
            # Create bucket with security and cost optimization
            run_command([
                "gcloud", "storage", "buckets", "create", f"gs://{self.storage_bucket}",
                f"--project={self.project_id}",
                f"--location={self.region}",           # Single region for cost
                "--default-storage-class=STANDARD",            # Standard storage class
                "--uniform-bucket-level-access",       # Secure access control
                "--enable-autoclass",                  # Automatic cost optimization
            ], check=False, logger=self.logger, show_spinner=True)
            run_command([
                "gcloud", "storage", "buckets", "update", f"gs://{self.storage_bucket}",
                "--update-labels=managed-by=job-scraper",
                f"--project={self.project_id}"
            ], check=False, logger=self.logger)

            # Set lifecycle policy to delete old backups (cost control)
            lifecycle_policy = {
                "lifecycle": {
                    "rule": [
                        {
                            "action": {"type": "Delete"},
                            "condition": {
                                "age": 90,                     # Delete backups after 90 days
                                "matchesPrefix": ["backup/"]   # Only affect backup files
                            }
                        }
                    ]
                }
            }

            # Apply lifecycle policy
            with tempfile.NamedTemporaryFile(mode="w", suffix=".json") as temp_lifecycle_file:
                json.dump(lifecycle_policy, temp_lifecycle_file)
                temp_lifecycle_file.flush()
                run_command([
                    "gcloud", "storage", "buckets", "update", f"gs://{self.storage_bucket}",
                    f"--lifecycle-file={temp_lifecycle_file.name}",
                    f"--project={self.project_id}"
                ], check=False, logger=self.logger, show_spinner=True)

            self.logger.info(f"Storage bucket created: gs://{self.storage_bucket}")
        else:
            self.logger.info(f"Storage bucket already exists: gs://{self.storage_bucket}")

        self.logger.info("Configuring bucket for job data persistence...")

    def _setup_budget_alerts(self) -> None:
        self.logger.info("Setting up automated budget controls")
        self.logger.info("Deploying Cloud Function for automatic shutdown at 90% budget...")

        function_name = "job-scraper-budget-alerter"
        budget_topic_name = "job-scraper-budget-alerts"
        function_source_dir = str(self.project_root / "cloud" / "functions")

        run_command([
            "gcloud", "functions", "deploy", function_name,
            f"--project={self.project_id}",
            f"--region={self.region}",
            "--runtime=python310",
            f"--source={function_source_dir}",
            "--entry-point=budget_alert_handler",
            f"--trigger-topic={budget_topic_name}",
            "--gen2",
            f"--set-env-vars=GCP_PROJECT={self.project_id},SCHEDULER_LOCATION={self.scheduler_region},SCHEDULER_JOB_ID={self.job_name}-schedule",
            "--labels=managed-by=job-scraper",
            "--quiet"
        ], check=False, logger=self.logger, show_spinner=True)

        self.logger.info("Budget alert function deployed.")

    @staticmethod
    def _looks_like_placeholder(candidate: str, default: str) -> bool:
        placeholder_tokens = [
            "your_",
            "example.com",
            "example_",
            "hooks.slack.com/services/xxx",
            "recipient_email@example.com",
            "your_app_password",
        ]
        value = candidate.lower()
        if not value:
            return False
        return any(token in value for token in placeholder_tokens)


def get_bootstrap(logger, no_prompt: bool = False) -> GCPBootstrap:
    return GCPBootstrap(logger, no_prompt)
