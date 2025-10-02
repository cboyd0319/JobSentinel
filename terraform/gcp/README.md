# GCP Terraform Infrastructure

This directory contains Terraform configurations for deploying the Job Scraper to Google Cloud Platform.

## Architecture Overview

```
User's Local Machine
├── Python Bootstrap Script (cloud/providers/gcp/gcp.py)
│   ├── Collects configuration (Slack webhook, email, region, etc.)
│   ├── Generates terraform.tfvars
│   └── Executes Terraform

Terraform Provisions:
├── GCP Project (if new)
├── VPC Network & Subnet
├── Serverless VPC Access Connector
├── Cloud Storage Bucket (job data)
├── Service Accounts (runtime, scheduler)
├── IAM Bindings (least privilege)
├── Secret Manager Secrets (user_prefs, slack_webhook)
├── Artifact Registry (Docker images)
├── Cloud Run Job (serverless container)
├── Pub/Sub Topic (budget alerts)
├── Billing Budget
└── Monitoring Alert Policies

Python Post-Processing:
├── Builds Docker image via Cloud Build
├── Updates secret values in Secret Manager
├── Creates Cloud Scheduler job
├── Deploys budget alert Cloud Function
└── Verifies deployment
```

## File Structure

```
terraform/gcp/
├── main.tf                      # Root module - all infrastructure
├── variables.tf                 # Input variables
├── outputs.tf                   # Output values
├── versions.tf                  # Provider versions
├── terraform.tfvars.example     # Example configuration
└── modules/
    └── cloud_run/               # Cloud Run Job module
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

## Key Resources Created

### Networking
- **VPC Network**: Private network for Cloud Run jobs
- **VPC Subnet**: `10.0.0.0/28` for VPC connector
- **VPC Connector**: Enables Cloud Run to access private resources

### Compute
- **Cloud Run Job**: Batch execution container (NOT always-on service)
  - CPU: 1 vCPU
  - Memory: 512Mi
  - Timeout: 900s (15 minutes)
  - Max instances: 1
  - Execution: Triggered by Cloud Scheduler

### Storage
- **Cloud Storage Bucket**: Job data persistence
  - Autoclass: Enabled (automatic storage class optimization)
  - Lifecycle: Delete objects in `backup/` after 90 days

### Security
- **Service Accounts**:
  - `job-scraper-runner`: Runs the Cloud Run job
  - `job-scraper-scheduler`: Invokes the job via scheduler
- **IAM Roles** (least privilege):
  - Runtime SA: `logging.logWriter`, `run.invoker`, `storage.objectUser`
  - Scheduler SA: `run.invoker`, `iam.serviceAccountTokenCreator`
- **Secret Manager**: Encrypted secrets for user prefs and Slack webhook

### Monitoring & Alerts
- **Email Alert Channel**: Sends notifications to configured email
- **Alert Policies**:
  - Cloud Run job failures
  - Budget threshold exceeded (via Pub/Sub + Cloud Function)

## Usage

### Automated Deployment (Recommended)

The easiest way to deploy is via the Python bootstrap script, which handles everything:

```bash
python3 -m cloud.bootstrap
```

or for non-interactive deployment:

```bash
python3 -m cloud.bootstrap --no-prompt --yes
```

This will:
1. Install Terraform automatically if needed
2. Detect existing deployments
3. Collect configuration interactively
4. Generate `terraform.tfvars`
5. Run `terraform apply`
6. Complete post-Terraform steps (build image, set secrets, etc.)

### Manual Deployment

If you prefer to run Terraform manually:

1. **Copy example config**:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. **Edit terraform.tfvars** with your values:
   ```hcl
   project_id           = "job-scraper-20250130-123456"
   billing_account_id   = "012345-ABCDEF-678901"
   region               = "us-central1"
   alert_email_address  = "you@example.com"
   ```

3. **Initialize Terraform**:
   ```bash
   terraform init
   ```

4. **Plan changes**:
   ```bash
   terraform plan
   ```

5. **Apply configuration**:
   ```bash
   terraform apply
   ```

6. **Complete post-Terraform steps**:
   - Build and push Docker image to Artifact Registry
   - Update secret values in Secret Manager
   - Create Cloud Scheduler job
   - Deploy budget alert Cloud Function

## State Management

### Local State (Default)

By default, Terraform state is stored locally:
- New deployments: `~/.job-scraper/{project-id}/terraform/terraform.tfstate`
- Updates: Reads from the same location

**Advantages**:
- Simple setup
- No additional GCP resources needed
- Suitable for single-user deployments

**Disadvantages**:
- State file must be backed up manually
- Cannot collaborate with team members
- Lost state = lost ability to manage infrastructure

### Remote State (Optional)

For team environments or production use, consider remote state:

```hcl
# backend.tf
terraform {
  backend "gcs" {
    bucket  = "your-terraform-state-bucket"
    prefix  = "terraform/state/job-scraper"
  }
}
```

## Cost Optimization

This configuration is designed to minimize costs:

| Resource | Cost | Optimization |
|----------|------|--------------|
| Cloud Run Job | $0 idle, ~$0.10/hour active | Only runs when scheduled (13 times/day default) |
| VPC Connector | ~$8-12/month | Minimal throughput (200-300 Mbps), 2-3 instances |
| Cloud Storage | ~$0.02/GB/month | Small data (~10MB), autoclass enabled |
| Secret Manager | $0.06/10k accesses | ~400 accesses/month |
| Cloud Scheduler | $0.10/job/month | 1 job |
| Cloud Function | Free tier | Budget alerts only |
| **Total** | **~$8-15/month** | Well within free tier for most usage |

## Security Features

1. **No Public Access**: Cloud Run Job is NOT publicly accessible
2. **Private Networking**: VPC connector isolates traffic
3. **Least Privilege IAM**: Service accounts have minimal required permissions
4. **Encrypted Secrets**: Secret Manager with automatic encryption
5. **Budget Controls**: Automatic alerts at 90% budget threshold
6. **Monitoring**: Alert policies for failures and cost overruns

## Troubleshooting

### Terraform Errors

**Error: Module not installed**
```bash
terraform init
```

**Error: Invalid provider version**
```bash
rm -rf .terraform .terraform.lock.hcl
terraform init
```

**Error: Resource already exists**
```bash
# Import existing resource
terraform import google_project_service.run_api projects/PROJECT_ID/services/run.googleapis.com
```

### Deployment Failures

**VPC Connector fails to create**
- Check quota: `gcloud compute networks vpc-access connectors list`
- Ensure VPC Access API is enabled
- Verify subnet CIDR doesn't conflict

**Budget fails to create**
- Verify billing account ID: `gcloud billing accounts list`
- Ensure you have billing admin permissions
- Check billing account is active

**Cloud Run Job fails to deploy**
- Ensure Docker image exists in Artifact Registry
- Check service account permissions
- Verify VPC connector is ready

## Updating Infrastructure

To update an existing deployment:

1. **Run deployment script** (detects existing project):
   ```bash
   python scripts/deploy_gcp.py
   ```

2. **Or manually**:
   ```bash
   cd ~/.job-scraper/{project-id}/terraform
   terraform plan
   terraform apply
   ```

## Destroying Infrastructure

### Option 1: Delete Entire Project (Recommended)

```bash
gcloud projects delete PROJECT_ID
```

This is the simplest and ensures no orphaned resources.

### Option 2: Terraform Destroy

```bash
cd ~/.job-scraper/{project-id}/terraform
terraform destroy
```

**Note**: Some resources may fail to destroy (e.g., VPC if in use). You may need to manually clean up.

## Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `project_id` | Yes | - | GCP project ID |
| `billing_account_id` | Yes | - | Billing account for project |
| `region` | No | `us-central1` | GCP region for resources |
| `deployment_env` | No | `dev` | Environment label |
| `alert_email_address` | Yes | - | Email for monitoring alerts |
| `cloud_run_cpu` | No | `1` | vCPUs for Cloud Run job |
| `cloud_run_memory` | No | `512Mi` | Memory for Cloud Run job |
| `cloud_run_timeout_seconds` | No | `900` | Job timeout (15 min) |
| `budget_amount_usd` | No | `5.0` | Monthly budget cap |
| `budget_alert_threshold_percent` | No | `0.9` | Alert at 90% budget |

## Outputs Reference

| Output | Description |
|--------|-------------|
| `cloud_run_job_name` | Name of Cloud Run job |
| `project_id` | GCP project ID |
| `project_number` | GCP project number |
| `image_uri` | Full Docker image URI |
| `storage_bucket_full_name` | Cloud Storage bucket name |
| `runtime_service_account_email` | Runtime SA email |
| `scheduler_service_account_email` | Scheduler SA email |
| `user_prefs_secret_id` | User preferences secret ID |
| `slack_webhook_secret_id` | Slack webhook secret ID |

## Support

For issues or questions:
- Check logs: `gcloud logging read "resource.type=cloud_run_job"`
- Review Terraform docs: https://registry.terraform.io/providers/hashicorp/google/latest
- Open issue: https://github.com/your-repo/issues
