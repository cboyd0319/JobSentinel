# Cloud Deployment Guide

This guide outlines the process for deploying the job scraper to various cloud providers. The primary deployment mechanism for GCP is now Terraform, orchestrated by `scripts/deploy-cloud.sh`.

## Fast path

To deploy to Google Cloud Platform (GCP) using Terraform, run the interactive setup wizard or the deployment script directly:

```bash
# Interactive Setup Wizard (Recommended)
python3 scripts/setup_wizard.py

# Direct Deployment Script
# Ensure GCP_PROJECT_ID and GCP_SOURCE_REPO environment variables are set.
scripts/deploy-cloud.sh gcp
```

This script orchestrates the Terraform deployment, ensuring all GCP resources are provisioned and configured correctly.

## Debugging the Deployment

The deployment scripts (e.g., `scripts/setup_wizard.py` or `scripts/deploy-cloud.sh`) include robust logging. You can control the verbosity of the script's output by setting the `LOG_LEVEL` environment variable or by passing a `--log-level` argument if available.

By default, the scripts run at the `INFO` level, which provides a high-level overview of the deployment process. If you need to troubleshoot or get a more detailed view of the operations being performed, you can set the log level to `DEBUG`:

```bash
# For setup_wizard.py
LOG_LEVEL=DEBUG python3 scripts/setup_wizard.py

# For deploy-cloud.sh
LOG_LEVEL=DEBUG scripts/deploy-cloud.sh gcp
```

When running in `DEBUG` mode, the scripts will output:

*   Detailed information about each step of the deployment.
*   The exact `gcloud` and `terraform` commands being executed.
*   Color-coded log levels for easy readability.

All logs are also saved to the `data/logs/` directory for later analysis.

## What you need first

-   A billing-enabled Google Cloud account.
-   The `gcloud` CLI installed and authenticated.
-   The `terraform` CLI installed.
-   Docker if you plan to modify the container image yourself (though Cloud Build handles this for deployment).

## GCP Deployment with Terraform, step by step

For GCP, the deployment is now managed by Terraform, providing a declarative and version-controlled infrastructure setup. The Terraform configuration is located in the `terraform/gcp` directory.

When you run `scripts/deploy-cloud.sh gcp` (or use the setup wizard), the following actions are performed via Terraform:

1.  **Provider Initialization:** Terraform initializes the Google Cloud provider.
2.  **API Enablement:** Necessary Google Cloud APIs are enabled, including Cloud Run, Cloud Build, Artifact Registry, and Serverless VPC Access.
3.  **VPC Network Setup:** A custom VPC network, subnet, and Serverless VPC Access connector are created for secure, private communication.
4.  **Cloud Storage Bucket:** A Cloud Storage bucket is provisioned for job data persistence, with cost-optimized settings and lifecycle rules.
5.  **Service Accounts & IAM:** Dedicated service accounts for the Cloud Run job and Cloud Scheduler are created, along with fine-grained IAM roles for least privilege access.
6.  **Secret Manager Secrets:** Secret Manager secrets are created to securely store sensitive configuration (e.g., user preferences, Slack webhook URL).
7.  **Artifact Registry Setup:** An Artifact Registry repository is created to store Docker images.
8.  **Cloud Build Trigger:** A Cloud Build trigger is configured to automatically build your application's Docker image from your specified source repository (e.g., GitHub) and push it to the Artifact Registry upon changes to the `main` branch.
9.  **Cloud Run Job Deployment:** The application is deployed as a Cloud Run job, pulling the Docker image from Artifact Registry. This includes configuring resources (CPU, memory), scaling parameters (max instances, concurrency), and environment variables.
10. **Cloud Scheduler Job:** A Cloud Scheduler job is set up to trigger the Cloud Run job at a defined frequency.
11. **Cloud Monitoring & Budget Alerts:** Cloud Monitoring alerts are configured for job failures and budget thresholds, including a Cloud Function to automatically pause the scheduler if budget limits are approached.

Terraform ensures that if resources already exist, it will update them to match the desired state defined in the configuration. This approach provides idempotency and makes infrastructure changes predictable and repeatable.

## Validation helpers

When I tweak the deployment scripts I usually run:

```bash
scripts/validate-cloud-config.sh gcp
scripts/deploy-cloud.sh --dry-run gcp # This will perform a Terraform plan for GCP
scripts/enhanced-cost-monitor.py --provider gcp --check
```

Those commands double-check IAM bindings, schedules, and cost protections without redeploying anything.

## Cost expectations

With the tuned defaults (hourly during business hours, 0.5 vCPU, 256Mi memory) Cloud Run costs me under a dollar a month. Turning the schedule up to every 15 minutes all day lands closer to $5–8/month. AWS and Azure have similar numbers but higher cold-start latency in my testing.


## Updating Configuration

For GCP deployments managed by Terraform, you can update the infrastructure configuration by modifying the Terraform files in `terraform/gcp` and then running:

```bash
scripts/deploy-cloud.sh gcp
```

This will perform a `terraform plan` and `terraform apply` to update your resources to match the new configuration.

To update application-specific configurations stored in Secret Manager (e.g., `user_prefs.json` or the Slack webhook URL), use the `cloud/update.py` script:

```bash
python3 cloud/update.py --provider gcp --project-id your-gcp-project-id
```

This script will guide you through updating the values of the secrets that were provisioned by Terraform.
## Tearing Down the Infrastructure

To deprovision all GCP resources created by Terraform, use the teardown script:

```bash
scripts/teardown-cloud.sh gcp
```

This script will orchestrate `terraform destroy`, showing you all the resources that will be destroyed and asking for confirmation. For other cloud providers, or for specific resources not managed by Terraform, the `cloud.teardown` script might still be applicable.

If you discover a cheaper or simpler deployment path, open an issue or PR — I’m happy to kick the tires.
