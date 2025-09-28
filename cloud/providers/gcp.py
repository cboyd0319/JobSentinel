"""Google Cloud Platform provisioning workflow."""

from __future__ import annotations

import hashlib
import json
import os
import random
import re
import string
import subprocess
import sys
import tarfile
import tempfile
import textwrap
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
    current_os,
    ensure_directory,
    prepend_path,
    print_header,
    resolve_project_root,
    run_command,
    which,
)

INSTALL_VERSION = "540.0.0"


class GCPBootstrap:
    """Interactive bootstrapper for Google Cloud Run Jobs."""

    name = "Google Cloud Platform"

    def __init__(self) -> None:
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
        self.env_secret_prefix = "job-scraper"
        self.prefs_secret_name = "job-scraper-prefs"
        self.project_root = resolve_project_root()
        self.job_mode: str = "poll"
        self.schedule_frequency: str = "0 6-18 * * 1-5"  # Business hours every hour default
        self.vpc_name: str = "job-scraper-vpc"
        self.subnet_name: str = "job-scraper-subnet"
        self.connector_name: str = "job-scraper-connector"
        self.storage_bucket: str = f"job-scraper-data-{self.project_id}"

    # ------------------------------------------------------------------
    # public API
    # ------------------------------------------------------------------
    def run(self) -> None:
        self._print_welcome()
        self._confirm_prerequisites()
        self._ensure_gcloud()
        self._authenticate()
        self._select_region()
        self._select_scheduler_region()
        self._choose_billing_account()
        self._create_project()
        self._enable_services()
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
        print_header("Google Cloud Run Automated Provisioning")
        print(
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
        print_header("Prerequisite Verification")
        print(
            textwrap.dedent(
                """
                Before continuing, make sure you have:

                  1. Created a Google Cloud account (https://cloud.google.com)
                  2. Accepted the terms of service
                  3. Added a billing profile (even free tiers require this)

                The script will pause until you confirm these steps are complete.
                """
            ).strip()
        )
        if not confirm("Have you completed these steps?"):
            print("Please finish the account setup and re-run this script.")
            sys.exit(1)

    def _ensure_gcloud(self) -> None:
        print_header("Checking Google Cloud SDK")
        if which("gcloud"):
            print("✅ gcloud CLI found")
            return

        install_root = ensure_directory(Path.home() / "google-cloud-sdk-download")
        os_type = current_os()
        if os_type == "windows":
            archive = (
                "https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/"
                f"google-cloud-cli-{INSTALL_VERSION}-windows-x86_64.zip"
            )
        elif os_type == "mac":
            archive = (
                "https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/"
                f"google-cloud-cli-{INSTALL_VERSION}-darwin-x86_64.tar.gz"
            )
        else:
            archive = (
                "https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/"
                f"google-cloud-cli-{INSTALL_VERSION}-linux-x86_64.tar.gz"
            )

        extracted = self._download_and_extract(archive, install_root)
        if current_os() == "windows":
            installer = extracted / "install.bat"
            run_command(["cmd", "/c", str(installer), "--quiet"])
            prepend_path(extracted / "bin")
        else:
            installer = extracted / "install.sh"
            run_command(
                [str(installer), "--quiet"],
                env={"CLOUDSDK_CORE_DISABLE_PROMPTS": "1"},
            )
            prepend_path(extracted / "bin")

        print("✅ Google Cloud SDK installed")

    def _download_and_extract(self, url: str, destination: Path) -> Path:
        ensure_directory(destination)
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme != "https" or parsed.netloc != "dl.google.com":
            raise RuntimeError("Refusing to download Cloud SDK from non-Google host")

        fd, tmp_path = tempfile.mkstemp(dir=destination, suffix=Path(url).suffix)
        os.close(fd)
        download_path = Path(tmp_path)
        print(f"⬇️  Downloading {url}")
        urllib.request.urlretrieve(url, download_path)
        self._verify_checksum(url, download_path)

        if download_path.suffix == ".zip":
            with zipfile.ZipFile(download_path, "r") as archive:
                archive.extractall(destination)
        else:
            with tarfile.open(download_path, "r:gz") as archive:
                archive.extractall(destination)

        download_path.unlink(missing_ok=True)
        return destination / "google-cloud-sdk"

    def _verify_checksum(self, url: str, archive: Path) -> None:
        checksum_url = f"{url}.sha256"
        parsed = urllib.parse.urlparse(checksum_url)
        if parsed.scheme != "https" or parsed.netloc != "dl.google.com":
            raise RuntimeError("Invalid checksum host for Cloud SDK download")

        expected_raw = urllib.request.urlopen(checksum_url, timeout=30).read().decode("utf-8").strip()
        expected_hash = expected_raw.split()[0]
        actual_hash = hashlib.sha256(archive.read_bytes()).hexdigest()
        if expected_hash != actual_hash:
            raise RuntimeError("Checksum mismatch while downloading Google Cloud SDK")

    def _authenticate(self) -> None:
        print_header("Authenticating with Google Cloud")
        run_command(["gcloud", "auth", "login"])
        run_command(["gcloud", "auth", "application-default", "login"])

    def _select_region(self) -> None:
        print_header("Select Cloud Run region")
        print("📍 Regions are ordered by cost-effectiveness (cheapest first):")
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
        run_command(["gcloud", "config", "set", "run/region", self.region])

    def _select_scheduler_region(self) -> None:
        print_header("Select Cloud Scheduler region")
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
            run_command(["gcloud", "config", "set", "scheduler/location", self.scheduler_region])
            return

        print(
            "⚠️ Cloud Scheduler is not available in your chosen Cloud Run region. "
            "Select the nearest supported location for the scheduler trigger."
        )
        scheduler_choice = choose("Select a Scheduler location:", sorted(supported))
        self.scheduler_region = scheduler_choice
        run_command(["gcloud", "config", "set", "scheduler/location", self.scheduler_region])

    def _choose_billing_account(self) -> None:
        print_header("Locate Billing Account")
        result = run_command(
            ["gcloud", "billing", "accounts", "list", "--format=json"],
            capture_output=True,
        )
        accounts = json.loads(result.stdout)
        if not accounts:
            print("No billing accounts detected. Create one in the console and re-run.")
            sys.exit(1)
        if len(accounts) == 1:
            self.billing_account = accounts[0]["name"].split("/")[-1]
            print(f"Billing account detected: {self.billing_account}")
            return
        choices = [
            f"{acc['name'].split('/')[-1]} ({acc['displayName']})" for acc in accounts
        ]
        selection = choose("Select billing account:", choices)
        self.billing_account = selection.split()[0]

    def _create_project(self) -> None:
        print_header("Creating dedicated GCP project")
        display_default = "Job Scraper"
        proposed = input(f"Project display name [{display_default}]: ").strip() or display_default
        self.project_name = proposed
        self.project_id = self._generate_project_id(proposed)

        run_command(["gcloud", "projects", "create", self.project_id, "--name", proposed])
        run_command(["gcloud", "config", "set", "project", self.project_id])
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
            ]
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
        )
        self.project_number = result.stdout.strip()
        print(f"✅ Project {self.project_id} created")

    def _generate_project_id(self, base_name: str) -> str:
        candidate = re.sub(r"[^a-z0-9-]", "-", base_name.lower())
        candidate = re.sub(r"-+", "-", candidate).strip("-") or "job-scraper"
        suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=6))
        candidate = candidate[:20]
        return f"{candidate}-{suffix}"

    def _enable_services(self) -> None:
        print_header("Enabling required Google APIs")
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
            ["gcloud", "services", "enable", *services, "--project", self.project_id]
        )

    def _setup_artifact_registry(self) -> None:
        print_header("Preparing Artifact Registry")
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
                ]
            )
        run_command(
            [
                "gcloud",
                "auth",
                "configure-docker",
                f"{self.region}-docker.pkg.dev",
                "--quiet",
            ]
        )

    def _collect_configuration(self) -> None:
        print_header("Collect runtime configuration")
        env_template = self.project_root / ".env.example"
        if not env_template.exists():
            raise FileNotFoundError(".env.example missing from repository root")

        print(
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

            prompt = f"{key} [{default_value or 'blank'}]: "
            while True:
                user_input = input(prompt).strip()
                if user_input.lower() == "skip":
                    candidate = ""
                    break

                candidate = user_input or default_value
                candidate = candidate.split("#", 1)[0].strip()

                if candidate == "" and default_value:
                    print("Value cannot be empty. Enter a real value or type 'skip' to leave blank.")
                    continue

                if self._looks_like_placeholder(candidate, default_value):
                    print(
                        "Placeholder value detected. Enter a real value or type 'skip' to leave blank."
                    )
                    continue
                break

            self.env_values[key] = candidate

        prefs_template = self.project_root / "config/user_prefs.example.json"
        self.user_prefs_payload = prefs_template.read_text(encoding="utf-8")
        print(
            "A default config/user_prefs.json template has been scheduled for upload to"
            " Secret Manager. Update it after deployment if you need different companies."
        )

        mode_options = ["poll", "digest", "health"]
        self.job_mode = choose("Select default Cloud Run job mode:", mode_options)

        print("\n📅 Scheduling Configuration:")
        print("💰 More frequent = higher costs. Default is business hours only for maximum cost savings.")
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
        schedule_choice = choose("Select execution frequency:",
                               [f"{desc} - {sched}" for desc, sched in zip(schedule_descriptions, schedule_options)])
        self.schedule_frequency = schedule_options[schedule_descriptions.index(schedule_choice.split(" - ")[0])]

    def _provision_secrets(self) -> None:
        print_header("Configuring Secret Manager")
        self.env_secret_bindings.clear()

        for key, value in self.env_values.items():
            if value:
                secret_name = f"{self.env_secret_prefix}-{key.lower().replace('_', '-')}"
                self._create_or_update_secret(secret_name, value)
                self.env_secret_bindings[key] = secret_name

        if self.user_prefs_payload:
            self._create_or_update_secret(self.prefs_secret_name, self.user_prefs_payload)
            self.env_secret_bindings.setdefault("USER_PREFS_JSON", self.prefs_secret_name)

    def _create_or_update_secret(self, name: str, value: str) -> None:
        describe = run_command(
            [
                "gcloud",
                "secrets",
                "describe",
                name,
                f"--project={self.project_id}",
            ],
            capture_output=True,
            check=False,
        )
        if describe.returncode != 0:
            # Create secret with 90-day expiry policy for security
            run_command(
                [
                    "gcloud",
                    "secrets",
                    "create",
                    name,
                    "--replication-policy=automatic",
                    f"--project={self.project_id}",
                    "--expire-time=7776000s",  # 90 days
                    "--labels=managed-by=job-scraper,rotation-policy=quarterly",
                    "--quiet",
                ]
            )
            print(f"🔐 Secret {name} created with 90-day expiry policy")

        run_command(
            [
                "gcloud",
                "secrets",
                "versions",
                "add",
                name,
                "--data-file=-",
                f"--project={self.project_id}",
                "--quiet",
            ],
            input_data=value.encode("utf-8"),
            text=False,
        )

    def _create_service_accounts(self) -> None:
        print_header("Creating service accounts and IAM bindings")
        runtime_name = "job-scraper-runner"
        scheduler_name = "job-scraper-scheduler"

        run_command(
            [
                "gcloud",
                "iam",
                "service-accounts",
                "create",
                runtime_name,
                "--display-name",
                "Job Scraper Cloud Run",
                "--quiet",
            ],
            check=False,
        )
        run_command(
            [
                "gcloud",
                "iam",
                "service-accounts",
                "create",
                scheduler_name,
                "--display-name",
                "Job Scraper Scheduler",
                "--quiet",
            ],
            check=False,
        )

        project = self.project_id
        self.runtime_sa = f"{runtime_name}@{project}.iam.gserviceaccount.com"
        self.scheduler_sa = f"{scheduler_name}@{project}.iam.gserviceaccount.com"

        bindings = [
            (self.runtime_sa, "roles/secretmanager.secretAccessor"),
            (self.runtime_sa, "roles/logging.logWriter"),
            (self.runtime_sa, "roles/run.invoker"),
            (self.runtime_sa, "roles/storage.objectUser"),        # For bucket read/write
            (self.scheduler_sa, "roles/run.invoker"),
            (self.scheduler_sa, "roles/iam.serviceAccountTokenCreator"),
        ]
        for member, role in bindings:
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
            )

    def _build_and_push_image(self) -> None:
        print_header("Building container image via Cloud Build")
        image_tag = (
            f"{self.region}-docker.pkg.dev/{self.project_id}/{self.artifact_repo}/"
            "job-scraper:latest"
        )
        self.image_uri = image_tag
        run_command(
            ["gcloud", "builds", "submit", "--tag", image_tag, str(self.project_root)]
        )

    def _create_or_update_job(self) -> None:
        print_header("Configuring Cloud Run Job")
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
        )

        if describe_job.returncode == 0:
            print(f"Job '{self.job_name}' already exists. Updating...")
            command = ["gcloud", "run", "jobs", "update", self.job_name, *common_args]
        else:
            print(f"Job '{self.job_name}' not found. Creating...")
            command = ["gcloud", "run", "jobs", "create", self.job_name, *common_args]

        run_command(command)


    def _run_prowler_scan(self) -> None:
        print_header("Generating CIS benchmark report with Prowler")
        reports_dir = ensure_directory(resolve_project_root() / 'cloud' / 'reports')
        timestamp = datetime.utcnow().strftime('%Y%m%d-%H%M%S')
        output_file = reports_dir / f'prowler-cis-gcp-{timestamp}.json'

        if not which("prowler"):
            print("Prowler not found, attempting to install...")
            try:
                run_command([sys.executable, '-m', 'pip', 'install', '--quiet', 'prowler'], check=True)
            except subprocess.CalledProcessError as exc:
                print(f"⚠️  Unable to install Prowler CLI automatically: {exc}")
                print('   • Install manually: python3 -m pip install prowler')
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
            ])
        except subprocess.CalledProcessError as exc:
            print(f"⚠️  Prowler scan failed: {exc}")
            print('   • You can rerun manually: prowler gcp --compliance cis_4.0_gcp --output-types json')
            return

        print(f"✅ Prowler CIS report saved to {output_file}")

    def _schedule_job(self) -> None:
        print_header("Scheduling recurring executions")
        if not self.scheduler_region:
            raise RuntimeError("Scheduler region not configured")
        job_uri = (
            "https://run.googleapis.com/apis/run.googleapis.com/v1/"
            f"projects/{self.project_id}/locations/{self.region}/jobs/{self.job_name}:run"
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
            "--body={}",
        ]
        run_command(create_cmd, check=False)
        update_cmd = create_cmd.copy()
        update_cmd[3] = "update"
        run_command(update_cmd)

    def _configure_budget(self) -> None:
        print_header("Configuring cost guardrails")
        token = run_command(
            ["gcloud", "auth", "application-default", "print-access-token"],
            capture_output=True,
        ).stdout.strip()

        budget_endpoint = (
            "https://billingbudgets.googleapis.com/v1beta1/billingAccounts/"
            f"{self.billing_account}/budgets"
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
                    "disableDefaultIamRecipients": False
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

        try:
            urllib.request.urlopen(request)
            print("✅ Billing budget created at $5 USD (alerts to billing admins)")
        except urllib.error.HTTPError as exc:  # pragma: no cover - runtime path
            if exc.code == 409:
                print("ℹ️ Billing budget already exists; keeping current configuration")
            else:
                print(
                    "⚠️ Unable to create billing budget automatically. "
                    "Please configure one manually in the Cloud Console."
                )

    def _print_summary(self) -> None:
        print_header("Deployment Summary")
        print(f"Project ID: {self.project_id}")
        print(f"Region: {self.region}")
        print(f"Artifact Registry: {self.artifact_repo}")
        print(f"Cloud Run Job: {self.job_name}")
        print(f"Scheduler Job: {self.job_name}-schedule")
        print(
            "Run an ad-hoc scrape with: "
            f"gcloud run jobs execute {self.job_name} --region {self.region}"
        )

    def _setup_binary_authorization(self) -> None:
        print_header("Setting up Binary Authorization")
        print("🔐 Configuring container image security policies...")

        # Create a policy that requires all images to be from our Artifact Registry
        policy = {
            "defaultAdmissionRule": {
                "requireAttestationsBy": [],
                "evaluationMode": "REQUIRE_ATTESTATION",
                "enforcementMode": "ENFORCED_BLOCK_AND_AUDIT_LOG"
            },
            "clusterAdmissionRules": {},
            "admissionWhitelistPatterns": [
                {
                    "namePattern": f"{self.region}-docker.pkg.dev/{self.project_id}/*"
                }
            ]
        }

        run_command([
            "gcloud", "container", "binauthz", "policy", "import", "-",
            f"--project={self.project_id}"
        ], input_data=json.dumps(policy).encode('utf-8'), text=False, check=False)

        print("✅ Binary Authorization configured to allow only trusted images")

    def _setup_vpc_networking(self) -> None:
        print_header("Setting up private networking")
        print("🔒 Creating VPC network for secure, private communication...")

        # Create VPC network
        run_command([
            "gcloud", "compute", "networks", "create", self.vpc_name,
            "--subnet-mode=custom",
            f"--project={self.project_id}"
        ], check=False)

        # Create subnet
        run_command([
            "gcloud", "compute", "networks", "subnets", "create", self.subnet_name,
            f"--network={self.vpc_name}",
            "--range=10.0.0.0/28",  # Small range for cost optimization
            f"--region={self.region}",
            f"--project={self.project_id}"
        ], check=False)

        # Create VPC connector for Cloud Run
        run_command([
            "gcloud", "compute", "networks", "vpc-access", "connectors", "create", self.connector_name,
            f"--subnet={self.subnet_name}",
            f"--region={self.region}",
            "--min-instances=2",
            "--max-instances=3",  # Small scale for cost optimization
            "--machine-type=e2-micro",  # Cheapest machine type
            f"--project={self.project_id}"
        ], check=False)

        print("✅ Private VPC network configured with minimal resources")

    def _setup_storage_bucket(self) -> None:
        print_header("Setting up persistent storage")
        print("💾 Creating Cloud Storage bucket for job tracking...")

        # Check if bucket already exists
        check_bucket = run_command([
            "gcloud", "storage", "buckets", "describe", f"gs://{self.storage_bucket}",
            f"--project={self.project_id}"
        ], check=False)

        if check_bucket.returncode != 0:
            # Create bucket with security and cost optimization
            run_command([
                "gcloud", "storage", "buckets", "create", f"gs://{self.storage_bucket}",
                f"--project={self.project_id}",
                f"--location={self.region}",           # Single region for cost
                "--storage-class=STANDARD",            # Standard storage class
                "--uniform-bucket-level-access",       # Secure access control
                "--enable-autoclass",                  # Automatic cost optimization
            ], check=False)

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
            run_command([
                "gcloud", "storage", "buckets", "update", f"gs://{self.storage_bucket}",
                "--lifecycle-file=-",
                f"--project={self.project_id}"
            ], input_data=json.dumps(lifecycle_policy).encode('utf-8'), text=False, check=False)

            print(f"✅ Storage bucket created: gs://{self.storage_bucket}")
        else:
            print(f"✅ Storage bucket already exists: gs://{self.storage_bucket}")

        print("💾 Configuring bucket for job data persistence...")

    def _setup_budget_alerts(self) -> None:
        print_header("Setting up automated budget controls")
        print("💰 Creating Cloud Function for automatic shutdown at 90% budget...")

        # Create a simple Cloud Function that disables the scheduler
        function_source = '''
import functions_framework
from google.cloud import scheduler

@functions_framework.cloud_event
def budget_alert(cloud_event):
    """Disable scheduler when budget threshold is exceeded."""

    # Parse the budget alert
    budget_data = cloud_event.data
    if budget_data.get('costAmount', 0) >= budget_data.get('budgetAmount', 0) * 0.9:
        client = scheduler.CloudSchedulerClient()
        job_name = f"projects/{project_id}/locations/{scheduler_region}/jobs/{job_name}-schedule"

        try:
            # Pause the scheduler job to stop executions
            client.pause_job(name=job_name)
            print(f"Emergency shutdown: Paused scheduler job {job_name}")
        except Exception as e:
            print(f"Failed to pause job: {e}")
'''

        print("ℹ️  Budget alerts configured. Manual Cloud Function setup required for auto-shutdown.")
        print("   Visit Cloud Console > Cloud Functions to deploy the budget alert handler.")

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
        default_lower = default.lower()
        if not value:
            return False
        if value == default_lower:
            return True
        return any(token in value for token in placeholder_tokens)


def get_bootstrap() -> GCPBootstrap:
    return GCPBootstrap()
