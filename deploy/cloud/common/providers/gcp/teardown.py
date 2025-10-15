"""Google Cloud Platform teardown workflow."""

from __future__ import annotations

import subprocess  # nosec B404

from utils.logging import get_logger
from utils.secure_subprocess import SubprocessSecurityError, run_secure

from cloud.utils import (
    _redact_command_for_logging,
    confirm,
    run_command,
)

logger = get_logger("gcp_teardown")


class GCPTeardown:
    """Interactive teardown for Google Cloud Run Jobs."""

    def __init__(self, project_id: str, dry_run: bool = False) -> None:
        self.project_id = project_id
        self.dry_run = dry_run
        self.region = self._get_project_region()
        self.scheduler_region = self._get_scheduler_location()

    def _get_project_region(self) -> str:
        try:
            result = run_secure(
                [
                    "gcloud",
                    "config",
                    "get-value",
                    "run/region",
                    f"--project={self.project_id}",
                ],
                capture_output=True,
                check=False,
            )
            return (result.stdout or "").strip()
        except (SubprocessSecurityError, subprocess.CalledProcessError):  # noqa: BLE001
            return ""

    def _get_scheduler_location(self) -> str:
        try:
            result = run_secure(
                [
                    "gcloud",
                    "config",
                    "get-value",
                    "scheduler/location",
                    f"--project={self.project_id}",
                ],
                capture_output=True,
                check=False,
            )
            return (result.stdout or "").strip()
        except (SubprocessSecurityError, subprocess.CalledProcessError):  # noqa: BLE001
            return ""

    async def _execute_gcloud_command(self, command: list[str], description: str) -> None:
        if self.dry_run:
            logger.info(
                f"DRY RUN: Would execute: {_redact_command_for_logging(command)} ({description})"
            )
        else:
            logger.info(f"Executing: {_redact_command_for_logging(command)} ({description})")
            await run_command(command, check=False, logger=logger)

    async def run(self) -> None:
        self._print_welcome()
        if self.dry_run:
            logger.info("DRY RUN MODE: No resources will be deleted.\n")

        if not confirm(
            f"Are you sure you want to delete all resources in project '{self.project_id}'? This action cannot be undone."
        ):
            logger.info("Teardown cancelled.")
            return

        await self._delete_scheduler_job()
        await self._delete_cloud_run_job()
        await self._delete_cloud_function()
        await self._delete_service_accounts()
        await self._delete_secrets()
        await self._delete_container_images()
        await self._delete_artifact_registry_repo()
        await self._delete_vpc_connector()
        await self._delete_subnet()
        await self._delete_vpc_network()
        await self._delete_storage_bucket()
        await self._delete_project()
        self._print_summary()

    def _print_welcome(self) -> None:
        logger.info(f"Google Cloud Teardown for project: {self.project_id}")

    async def _delete_scheduler_job(self) -> None:
        logger.info("Deleting Cloud Scheduler Job")
        await self._execute_gcloud_command(
            [
                "gcloud",
                "scheduler",
                "jobs",
                "delete",
                "job-scraper-schedule",
                f"--location={self.scheduler_region}",
                f"--project={self.project_id}",
                "--quiet",
            ],
            "Delete Cloud Scheduler job",
        )

    async def _delete_cloud_run_job(self) -> None:
        logger.info("Deleting Cloud Run Job")
        await self._execute_gcloud_command(
            [
                "gcloud",
                "run",
                "jobs",
                "delete",
                "job-scraper",
                f"--region={self.region}",
                f"--project={self.project_id}",
                "--quiet",
            ],
            "Delete Cloud Run job",
        )

    async def _delete_cloud_function(self) -> None:
        logger.info("Deleting Cloud Function")
        result = await run_command(
            [
                "gcloud",
                "functions",
                "list",
                f"--project={self.project_id}",
                "--filter=labels.managed-by=job-scraper",
                "--format=value(name)",
            ],
            capture_output=True,
            check=False,
            logger=logger,
        )
        function_names = result.stdout.strip().split()
        if function_names:
            for function_name in function_names:
                await self._execute_gcloud_command(
                    [
                        "gcloud",
                        "functions",
                        "delete",
                        function_name,
                        f"--region={self.region}",
                        f"--project={self.project_id}",
                        "--quiet",
                    ],
                    f"Delete Cloud Function {function_name}",
                )
        else:
            logger.info("No Cloud Functions with label 'managed-by=job-scraper' found.")

    async def _delete_service_accounts(self) -> None:
        logger.info("Deleting Service Accounts")
        result = await run_command(
            [
                "gcloud",
                "iam",
                "service-accounts",
                "list",
                f"--project={self.project_id}",
                "--filter=labels.managed-by=job-scraper",
                "--format=value(email)",
            ],
            capture_output=True,
            check=False,
            logger=logger,
        )
        sa_emails = result.stdout.strip().split()
        if sa_emails:
            for sa_email in sa_emails:
                await self._execute_gcloud_command(
                    [
                        "gcloud",
                        "iam",
                        "service-accounts",
                        "delete",
                        sa_email,
                        f"--project={self.project_id}",
                        "--quiet",
                    ],
                    f"Delete Service Account {sa_email}",
                )
        else:
            logger.info("No Service Accounts with label 'managed-by=job-scraper' found.")

    async def _delete_secrets(self) -> None:
        logger.info("Deleting Secrets")
        result = await run_command(
            [
                "gcloud",
                "secrets",
                "list",
                f"--project={self.project_id}",
                "--filter=labels.managed-by=job-scraper",
                "--format=value(name)",
            ],
            capture_output=True,
            check=False,
            logger=logger,
        )
        secret_names = result.stdout.strip().split()
        if secret_names:
            for secret_name in secret_names:
                await self._execute_gcloud_command(
                    [
                        "gcloud",
                        "secrets",
                        "delete",
                        secret_name,
                        f"--project={self.project_id}",
                        "--quiet",
                    ],
                    f"Delete Secret {secret_name}",
                )
        else:
            logger.info("No Secrets with label 'managed-by=job-scraper' found.")

    async def _delete_container_images(self) -> None:
        logger.info("Deleting Container Images")
        result = await run_command(
            [
                "gcloud",
                "artifacts",
                "docker",
                "images",
                "list",
                f"{self.region}-docker.pkg.dev/{self.project_id}/job-scraper",
                "--format=value(name)",
            ],
            capture_output=True,
            check=False,
            logger=logger,
        )
        image_names = result.stdout.strip().split()
        if image_names:
            for image_name in image_names:
                await self._execute_gcloud_command(
                    [
                        "gcloud",
                        "artifacts",
                        "docker",
                        "images",
                        "delete",
                        image_name,
                        "--delete-tags",
                        "--quiet",
                    ],
                    f"Delete Container Image {image_name}",
                )
        else:
            logger.info("No Container Images found in 'job-scraper' repository.")

    async def _delete_artifact_registry_repo(self) -> None:
        logger.info("Deleting Artifact Registry Repository")
        await self._execute_gcloud_command(
            [
                "gcloud",
                "artifacts",
                "repositories",
                "delete",
                "job-scraper",
                f"--location={self.region}",
                f"--project={self.project_id}",
                "--quiet",
            ],
            "Delete Artifact Registry repository",
        )

    async def _delete_vpc_connector(self) -> None:
        logger.info("Deleting VPC Connector")
        result = await run_command(
            [
                "gcloud",
                "compute",
                "networks",
                "vpc-access",
                "connectors",
                "list",
                f"--project={self.project_id}",
                "--filter=labels.managed-by=job-scraper",
                "--format=value(name)",
            ],
            capture_output=True,
            check=False,
            logger=logger,
        )
        connector_names = result.stdout.strip().split()
        if connector_names:
            for connector_name in connector_names:
                await self._execute_gcloud_command(
                    [
                        "gcloud",
                        "compute",
                        "networks",
                        "vpc-access",
                        "connectors",
                        "delete",
                        connector_name,
                        f"--region={self.region}",
                        f"--project={self.project_id}",
                        "--quiet",
                    ],
                    f"Delete VPC Connector {connector_name}",
                )
        else:
            logger.info("No VPC Connectors with label 'managed-by=job-scraper' found.")

    async def _delete_subnet(self) -> None:
        logger.info("Deleting Subnet")
        await self._execute_gcloud_command(
            [
                "gcloud",
                "compute",
                "networks",
                "subnets",
                "delete",
                "job-scraper-subnet",
                f"--region={self.region}",
                f"--project={self.project_id}",
                "--quiet",
            ],
            "Delete Subnet",
        )

    async def _delete_vpc_network(self) -> None:
        logger.info("Deleting VPC Network")
        result = await run_command(
            [
                "gcloud",
                "compute",
                "networks",
                "list",
                f"--project={self.project_id}",
                "--filter=labels.managed-by=job-scraper",
                "--format=value(name)",
            ],
            capture_output=True,
            check=False,
            logger=logger,
        )
        network_names = result.stdout.strip().split()
        if network_names:
            for network_name in network_names:
                await self._execute_gcloud_command(
                    [
                        "gcloud",
                        "compute",
                        "networks",
                        "delete",
                        network_name,
                        f"--project={self.project_id}",
                        "--quiet",
                    ],
                    f"Delete VPC Network {network_name}",
                )
        else:
            logger.info("No VPC Networks with label 'managed-by=job-scraper' found.")

    async def _delete_storage_bucket(self) -> None:
        logger.info("Deleting Storage Bucket")
        result = await run_command(
            [
                "gcloud",
                "storage",
                "buckets",
                "list",
                f"--project={self.project_id}",
                "--filter=labels.managed-by=job-scraper",
                "--format=value(url)",
            ],
            capture_output=True,
            check=False,
            logger=logger,
        )
        bucket_urls = result.stdout.strip().split()
        if bucket_urls:
            for bucket_url in bucket_urls:
                await self._execute_gcloud_command(
                    [
                        "gcloud",
                        "storage",
                        "buckets",
                        "delete",
                        bucket_url,
                        "--project={self.project_id}",
                        "--quiet",
                    ],
                    f"Delete Storage Bucket {bucket_url}",
                )
        else:
            logger.info("No Storage Buckets with label 'managed-by=job-scraper' found.")

    async def _delete_project(self) -> None:
        logger.info("Deleting Project")
        await self._execute_gcloud_command(
            ["gcloud", "projects", "delete", self.project_id, "--quiet"], "Delete GCP Project"
        )

    def _print_summary(self) -> None:
        logger.info("Teardown Summary")
        logger.info(
            f"All resources for project {self.project_id} have been scheduled for deletion."
        )
