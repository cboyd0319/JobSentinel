# Cloud Deployment Guide

I run this project locally most of the time, but the cloud bootstrapper is handy when I want it on autopilot. This note walks through the current scripts and the trade-offs I keep in mind.

## Fast path

```bash
# Google Cloud Run (my default)
python -m cloud.bootstrap --provider gcp

# AWS Lambda
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/install.sh | bash -s -- --cloud-deploy aws

# Azure Container Instances
curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/scripts/install.sh | bash -s -- --cloud-deploy azure
```

On Windows, swap `python` for `python3` if needed. Each script prints the resources it creates and usually asks you to confirm the billing setup step before it does anything destructive.

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

## Rolling back

Every script prints the commands it runs, so you can delete things manually with the provider CLI if you want a clean slate. For GCP I usually run:

```bash
gcloud run jobs delete job-private-scraper --quiet
gcloud scheduler jobs delete job-private-scraper --quiet
gcloud artifacts repositories delete job-private-scraper --location=us-central1 --quiet
```

Adjust the names to match whatever you chose during bootstrap.

If you discover a cheaper or simpler deployment path, open an issue or PR — I’m happy to kick the tires.
