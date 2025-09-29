"""Google Cloud Platform teardown workflow."""

from __future__ import annotations

import subprocess  # nosec B404

from cloud.utils import (
    confirm,
    print_header,
    run_command,
)

class GCPTeardown:
    """Interactive teardown for Google Cloud Run Jobs."""

    def __init__(self, project_id: str) -> None:
        self.project_id = project_id
        self.region = self._get_project_region()
        self.scheduler_region = self._get_scheduler_location()

    def _get_project_region(self) -> str:
        result = run_command([
            "gcloud", "config", "get-value", "run/region",
            f"--project={self.project_id}"
        ], capture_output=True, check=False)
        return result.stdout.strip()

    def _get_scheduler_location(self) -> str:
        result = run_command([
            "gcloud", "config", "get-value", "scheduler/location",
            f"--project={self.project_id}"
        ], capture_output=True, check=False)
        return result.stdout.strip()

    def run(self) -> None:
        self._print_welcome()
        if not confirm(f"Are you sure you want to delete all resources in project '{self.project_id}'? This action cannot be undone."):
            print("Teardown cancelled.")
            return

        self._delete_scheduler_job()
        self._delete_cloud_run_job()
        self._delete_cloud_function()
        self._delete_service_accounts()
        self._delete_secrets()
        self._delete_container_images()
        self._delete_artifact_registry_repo()
        self._delete_vpc_connector()
        self._delete_subnet()
        self._delete_vpc_network()
        self._delete_storage_bucket()
        self._delete_project()
        self._print_summary()

    def _print_welcome(self) -> None:
        print_header(f"Google Cloud Teardown for project: {self.project_id}")

    def _delete_scheduler_job(self) -> None:
        print_header("Deleting Cloud Scheduler Job")
        run_command([
            "gcloud", "scheduler", "jobs", "delete", "job-scraper-schedule",
            f"--location={self.scheduler_region}",
            f"--project={self.project_id}",
            "--quiet"
        ], check=False)

    def _delete_cloud_run_job(self) -> None:
        print_header("Deleting Cloud Run Job")
        run_command([
            "gcloud", "run", "jobs", "delete", "job-scraper",
            f"--region={self.region}",
            f"--project={self.project_id}",
            "--quiet"
        ], check=False)

    def _delete_cloud_function(self) -> None:
        print_header("Deleting Cloud Function")
        result = run_command([
            "gcloud", "functions", "list",
            f"--project={self.project_id}",
            "--filter=labels.managed-by=job-scraper",
            "--format=value(name)"
        ], capture_output=True, check=False)
        function_names = result.stdout.strip().split()
        for function_name in function_names:
            run_command([
                "gcloud", "functions", "delete", function_name,
                f"--region={self.region}",
                f"--project={self.project_id}",
                "--quiet"
            ], check=False)

    def _delete_service_accounts(self) -> None:
        print_header("Deleting Service Accounts")
        result = run_command([
            "gcloud", "iam", "service-accounts", "list",
            f"--project={self.project_id}",
            "--filter=labels.managed-by=job-scraper",
            "--format=value(email)"
        ], capture_output=True, check=False)
        sa_emails = result.stdout.strip().split()
        for sa_email in sa_emails:
            run_command([
                "gcloud", "iam", "service-accounts", "delete", sa_email,
                f"--project={self.project_id}",
                "--quiet"
            ], check=False)

    def _delete_secrets(self) -> None:
        print_header("Deleting Secrets")
        result = run_command([
            "gcloud", "secrets", "list",
            f"--project={self.project_id}",
            "--filter=labels.managed-by=job-scraper",
            "--format=value(name)"
        ], capture_output=True, check=False)
        secret_names = result.stdout.strip().split()
        for secret_name in secret_names:
            run_command([
                "gcloud", "secrets", "delete", secret_name,
                f"--project={self.project_id}",
                "--quiet"
            ], check=False)

    def _delete_container_images(self) -> None:
        print_header("Deleting Container Images")
        result = run_command([
            "gcloud", "artifacts", "docker", "images", "list",
            f"{self.region}-docker.pkg.dev/{self.project_id}/job-scraper",
            "--format=value(name)"
        ], capture_output=True, check=False)
        image_names = result.stdout.strip().split()
        for image_name in image_names:
            run_command([
                "gcloud", "artifacts", "docker", "images", "delete", image_name,
                "--delete-tags",
                "--quiet"
            ], check=False)

    def _delete_artifact_registry_repo(self) -> None:
        print_header("Deleting Artifact Registry Repository")
        run_command([
            "gcloud", "artifacts", "repositories", "delete", "job-scraper",
            f"--location={self.region}",
            f"--project={self.project_id}",
            "--quiet"
        ], check=False)

    def _delete_vpc_connector(self) -> None:
        print_header("Deleting VPC Connector")
        result = run_command([
            "gcloud", "compute", "networks", "vpc-access", "connectors", "list",
            f"--project={self.project_id}",
            "--filter=labels.managed-by=job-scraper",
            "--format=value(name)"
        ], capture_output=True, check=False)
        connector_names = result.stdout.strip().split()
        for connector_name in connector_names:
            run_command([
                "gcloud", "compute", "networks", "vpc-access", "connectors", "delete", connector_name,
                f"--region={self.region}",
                f"--project={self.project_id}",
                "--quiet"
            ], check=False)

    def _delete_subnet(self) -> None:
        print_header("Deleting Subnet")
        run_command([
            "gcloud", "compute", "networks", "subnets", "delete", "job-scraper-subnet",
            f"--region={self.region}",
            f"--project={self.project_id}",
            "--quiet"
        ], check=False)

    def _delete_vpc_network(self) -> None:
        print_header("Deleting VPC Network")
        result = run_command([
            "gcloud", "compute", "networks", "list",
            f"--project={self.project_id}",
            "--filter=labels.managed-by=job-scraper",
            "--format=value(name)"
        ], capture_output=True, check=False)
        network_names = result.stdout.strip().split()
        for network_name in network_names:
            run_command([
                "gcloud", "compute", "networks", "delete", network_name,
                f"--project={self.project_id}",
                "--quiet"
            ], check=False)

    def _delete_storage_bucket(self) -> None:
        print_header("Deleting Storage Bucket")
        result = run_command([
            "gcloud", "storage", "buckets", "list",
            f"--project={self.project_id}",
            "--filter=labels.managed-by=job-scraper",
            "--format=value(url)"
        ], capture_output=True, check=False)
        bucket_urls = result.stdout.strip().split()
        for bucket_url in bucket_urls:
            run_command([
                "gcloud", "storage", "buckets", "delete", bucket_url,
                "--project={self.project_id}",
                "--quiet"
            ], check=False)

    def _delete_project(self) -> None:
        print_header("Deleting Project")
        run_command([
            "gcloud", "projects", "delete", self.project_id,
            "--quiet"
        ], check=False)

    def _print_summary(self) -> None:
        print_header("Teardown Summary")
        print(f"All resources for project {self.project_id} have been scheduled for deletion.")
