# Cloud Deployment Guide

I run this project locally most of the time, but the cloud bootstrapper is handy when I want it on autopilot. This note walks through the current scripts and the trade-offs I keep in mind.

## Fast path

```bash
# Google Cloud Run (my default)
python3 -m cloud.bootstrap --provider gcp

# AWS Lambda
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/install.sh | bash -s -- --cloud-deploy aws

# Azure Container Instances
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/install.sh | bash -s -- --cloud-deploy azure
```

On Windows, swap `python` for `python3` if needed. Each script prints the resources it creates and usually asks you to confirm the billing setup step before it does anything destructive.

## Debugging the Deployment

The bootstrap script includes a powerful logging and debugging feature. You can control the verbosity of the script's output using the `--log-level` argument.

By default, the script runs at the `INFO` level, which provides a high-level overview of the deployment process. If you need to troubleshoot or get a more detailed view of the operations being performed, you can set the log level to `DEBUG`:

```bash
python3 -m cloud.bootstrap --log-level DEBUG
```

When running in `DEBUG` mode, the script will output:

*   Detailed information about each step of the deployment.
*   The exact `gcloud` commands being executed.
*   Color-coded log levels for easy readability.

All logs are also saved to the `data/logs/` directory for later analysis.

## What you need first

- A billing-enabled account on the provider you pick
- Docker if you plan to modify the container image yourself
- The provider CLI installed if you want to run the validation scripts (`gcloud`, `aws`, or `az`)

## GCP bootstrap, step by step

The Cloud Run flow is what I care about most, so it gets the most polish:

1. Creates (or reuses) a Google Cloud project and links billing
2. Enables Cloud Run, Build, Secret Manager, Cloud Scheduler, Artifact Registry, and friends
3. Builds the container, stores it in Artifact Registry, and locks Binary Authorization to that registry
4. Pushes secrets to Secret Manager and deploys the Cloud Run Job with a private VPC connector
5. Schedules the poller (hourly by default) and sets budget alerts at $5, $10, and $15

If something already exists, the script keeps the current settings unless you pick a different option at the prompt.

## Validation helpers

When I tweak the deployment scripts I usually run:

```bash
scripts/validate-cloud-config.sh gcp
scripts/deploy-cloud.sh --dry-run gcp
scripts/enhanced-cost-monitor.py --provider gcp --check
```

Those commands double-check IAM bindings, schedules, and cost protections without redeploying anything.

## Cost expectations

With the tuned defaults (hourly during business hours, 0.5 vCPU, 256Mi memory) Cloud Run costs me under a dollar a month. Turning the schedule up to every 15 minutes all day lands closer to $5–8/month. AWS and Azure have similar numbers but higher cold-start latency in my testing.

## Automated Budget Shutdown

The bootstrap script now includes a fully automated budget shutdown mechanism to protect against unexpected costs. When you deploy to GCP, the script sets up the following:

1.  **A $5 Budget:** A monthly budget is created for the new project.
2.  **A Pub/Sub Topic:** A topic named `job-scraper-budget-alerts` is created to receive notifications from the budget.
3.  **A Cloud Function:** A function named `job-scraper-budget-alerter` is deployed. This function is triggered by messages on the budget alert topic.

When the monthly cost exceeds 90% of the budget, a message is sent to the Pub/Sub topic. This message triggers the Cloud Function, which then automatically pauses the `job-scraper-schedule` Cloud Scheduler job, preventing any further executions and stopping additional costs from accruing.

## Updating Configuration

If you need to update your configuration after deployment (for example, to change the list of companies in `user_prefs.json`), you can use the `update.py` script. This script provides a safe and easy way to update secrets without having to tear down and rebuild your infrastructure.

To use the script, run the following command from the root of the repository:

```bash
python3 -m cloud.update --project-id <your-gcp-project-id>
```

The script will present you with a menu of configurations that can be updated. Select "User Preferences", and you will be prompted to provide the path to your updated `user_prefs.json` file.

## Tearing Down the Infrastructure

To make cleanup easy and safe, a `teardown.py` script is now included in the `cloud` directory. This script will deprovision all the resources created by the bootstrap process.

To use the script, run the following command from the root of the repository:

```bash
python3 -m cloud.teardown --project-id <your-gcp-project-id>
```

The script uses the `managed-by=job-scraper` label that is attached to all resources to identify what to delete. For an extra layer of safety, it will ask for a final confirmation before it begins deleting resources.

If you discover a cheaper or simpler deployment path, open an issue or PR — I’m happy to kick the tires.
