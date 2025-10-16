# Google Cloud Platform (GCP) Deployment

Deploy JobSentinel to Google Cloud Platform using Cloud Run, Cloud Functions, or Compute Engine.

## Directory Contents

```
gcp/
├── gcp/                    # Main Terraform configurations
│   ├── main.tf            # GCP resources
│   ├── variables.tf       # Configuration variables
│   ├── outputs.tf         # Output values
│   └── ...
└── gcp_backend/           # Terraform backend configuration
    ├── backend.tf         # State storage setup
    └── ...
```

## Deployment Options

### Option 1: Cloud Run (Recommended)

**Best for:** Serverless, auto-scaling, pay-per-use

```bash
# Build and deploy
cd gcp/
terraform init
terraform plan
terraform apply

# Or use gcloud CLI directly
gcloud run deploy jobsentinel \
  --source=../../../ \
  --region=us-central1 \
  --platform=managed \
  --memory=1Gi \
  --timeout=900s \
  --set-env-vars="SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}" \
  --no-allow-unauthenticated
```

**Cost:** ~$8-15/month (minimal usage)

### Option 2: Cloud Functions

**Best for:** Event-driven, scheduled jobs

```bash
# Deploy function
gcloud functions deploy jobsentinel-scraper \
  --runtime=python312 \
  --trigger-http \
  --entry-point=run_scraper \
  --region=us-central1 \
  --memory=1024MB \
  --timeout=540s \
  --set-env-vars="SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}"
```

**Cost:** ~$5-10/month

### Option 3: Compute Engine

**Best for:** Full control, persistent instance

```bash
# Create VM
gcloud compute instances create jobsentinel \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB

# SSH and setup
gcloud compute ssh jobsentinel --zone=us-central1-a
# Then run local setup scripts
```

**Cost:** ~$25-40/month (always-on)

## Prerequisites

1. **GCP Account**: https://cloud.google.com/
2. **gcloud CLI**: 
   ```bash
   # Install
   curl https://sdk.cloud.google.com | bash
   
   # Initialize
   gcloud init
   ```

3. **Terraform** (for infrastructure as code):
   ```bash
   # macOS
   brew install terraform
   
   # Linux
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

4. **Enable APIs**:
   ```bash
   gcloud services enable \
     run.googleapis.com \
     cloudfunctions.googleapis.com \
     cloudscheduler.googleapis.com \
     secretmanager.googleapis.com
   ```

## Terraform Deployment

### 1. Configure Backend

```bash
cd gcp_backend/
terraform init
terraform apply
```

This creates:
- GCS bucket for Terraform state
- State locking

### 2. Deploy Infrastructure

```bash
cd ../gcp/
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### 3. Configure Secrets

```bash
# Store Slack webhook
gcloud secrets create slack-webhook \
  --data-file=- <<< "${SLACK_WEBHOOK_URL}"

# Store Reed API key (if used)
gcloud secrets create reed-api-key \
  --data-file=- <<< "${REED_API_KEY}"
```

### 4. Schedule Execution

```bash
# Create Cloud Scheduler job (runs every 2 hours)
gcloud scheduler jobs create http jobsentinel-trigger \
  --schedule="0 */2 * * *" \
  --uri="https://jobsentinel-XXX-uc.a.run.app/run" \
  --http-method=POST \
  --oidc-service-account-email=jobsentinel-sa@PROJECT_ID.iam.gserviceaccount.com
```

## Configuration

### Environment Variables

Set in Cloud Run/Functions:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/...
DATABASE_URL=postgresql://...
LOG_LEVEL=INFO
ENABLE_METRICS=true
```

### Terraform Variables

Edit `gcp/terraform.tfvars`:

```hcl
project_id = "your-gcp-project"
region     = "us-central1"
zone       = "us-central1-a"

# Cloud Run settings
service_name = "jobsentinel"
memory       = "1Gi"
timeout      = 900

# Schedule
cron_schedule = "0 */2 * * *"  # Every 2 hours
```

## Monitoring

### Cloud Logging

```bash
# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=jobsentinel" \
  --limit=50 \
  --format=json

# Stream logs
gcloud logging tail "resource.type=cloud_run_revision" --format=json
```

### Cloud Monitoring

1. Go to Cloud Console → Monitoring
2. Create dashboard for:
   - Request count
   - Error rate
   - Latency (p95, p99)
   - Memory usage

### Alerts

```bash
# Create alert for high error rate
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="JobSentinel High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05
```

## Costs Breakdown

### Cloud Run (Recommended)
- **Requests:** 2M free/month, then $0.40/M
- **CPU:** $0.00002400/GB-second
- **Memory:** $0.00000250/GB-second
- **Estimated:** $8-15/month

### Cloud Functions
- **Invocations:** 2M free/month, then $0.40/M
- **Compute:** $0.0000025/GB-second
- **Estimated:** $5-10/month

### Compute Engine (e2-medium)
- **VM:** $24.27/month (730 hours)
- **Storage:** $2/month (20GB)
- **Estimated:** $25-40/month

## Optimization Tips

1. **Use Spot VMs**: 60-91% discount (if using Compute Engine)
2. **Schedule Wisely**: Run during off-peak hours
3. **Optimize Memory**: Right-size Cloud Run memory allocation
4. **Use Free Tier**: Stay within 2M requests/month
5. **Regional Selection**: Choose closest region to reduce latency

## Security

### Service Account

```bash
# Create service account with least privilege
gcloud iam service-accounts create jobsentinel-sa \
  --display-name="JobSentinel Service Account"

# Grant necessary permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:jobsentinel-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### VPC and Firewall

For Compute Engine deployments:
- Use VPC with private subnet
- Firewall rules: Allow only HTTPS (443)
- Use Cloud NAT for outbound

## Troubleshooting

### "Permission denied"
```bash
# Check IAM permissions
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:YOUR_EMAIL"
```

### "Quota exceeded"
```bash
# Check quotas
gcloud compute project-info describe --project=PROJECT_ID

# Request increase
gcloud alpha compute project-info describe --project=PROJECT_ID
```

### "Build failed"
```bash
# Check Cloud Build logs
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```

## Support

- [GCP Documentation](https://cloud.google.com/docs)
- [Deployment Guide](../../../../docs/reference/DEPLOYMENT_GUIDE.md)
- [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues)

---

**Provider:** Google Cloud Platform  
**Last Updated:** October 14, 2025  
**Estimated Cost:** $8-40/month depending on option
