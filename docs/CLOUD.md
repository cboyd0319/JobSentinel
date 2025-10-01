# Cloud Deployment (GCP)

Deploy job scraper to Google Cloud Platform using Terraform (10 minutes, $0-5/month).

## Quick Start

```bash
python -m cloud.bootstrap --yes
```

This automatically:
- Creates GCP project with unique ID
- Provisions Cloud Run Job (serverless)
- Sets up Cloud Scheduler (hourly, Mon-Fri 6am-6pm)
- Configures budget alerts ($5 limit)
- Deploys with security best practices

---

## Prerequisites

### 1. Google Cloud Account

- Sign up: https://cloud.google.com (free $300 credit for 90 days)
- Enable billing: Console → Billing

### 2. Install gcloud CLI

**macOS:**
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

**Windows:** See [WINDOWS.md](WINDOWS.md#4-install-google-cloud-cli)

**Linux:**
```bash
curl https://sdk.cloud.google.com | bash
```

Verify:
```bash
gcloud --version
```

### 3. Authenticate

```bash
gcloud auth login
gcloud auth application-default login
```

---

## Deployment

### Automated (Recommended)

```bash
python -m cloud.bootstrap --yes
```

**What it does:**
1. Checks for existing projects (reuses if quota reached)
2. Selects region (default: us-central1)
3. Links billing account
4. Runs Terraform to provision:
   - Cloud Run Job (`job-scraper`)
   - Artifact Registry (Docker images)
   - VPC network (private subnet)
   - Secret Manager (Slack webhook)
   - Cloud Scheduler (cron trigger)
   - Budget alerts ($5 threshold)
5. Builds and pushes Docker image
6. Prints deployment receipt
7. Saves receipt to `deployment-receipt.md`

### Manual Steps

```bash
# 1. Set variables
export GCP_PROJECT_ID="your-project-id"
export GCP_REGION="us-central1"

# 2. Create project
gcloud projects create $GCP_PROJECT_ID

# 3. Link billing
gcloud billing projects link $GCP_PROJECT_ID --billing-account=YOUR_BILLING_ACCOUNT_ID

# 4. Set active project
gcloud config set project $GCP_PROJECT_ID

# 5. Run Terraform
cd terraform/gcp
terraform init
terraform plan
terraform apply

# 6. Build and push image
gcloud builds submit --tag gcr.io/$GCP_PROJECT_ID/job-scraper:latest

# 7. Deploy Cloud Run Job
gcloud run jobs deploy job-scraper \
  --image gcr.io/$GCP_PROJECT_ID/job-scraper:latest \
  --region $GCP_REGION \
  --max-instances 1 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 15m
```

---

## Cost Breakdown

### Typical Monthly Costs

**Recommended schedule (hourly, business hours Mon-Fri):**
- Cloud Run: $0.50-$1.50
- Cloud Storage: $0.05
- Networking: $0.10
- **Total: $1-2/month**

**Aggressive schedule (every 15 min, 24/7):**
- Cloud Run: $4-$6
- Other: $0.20
- **Total: $5-8/month**

### Free Tier Limits

Google Cloud free tier includes:
- 2 million Cloud Run requests/month
- 360,000 GB-seconds compute time/month
- 5 GB Cloud Storage
- 1 GB network egress (North America)

**Most users stay within free tier** with business-hours schedule.

### Cost Guardrails

Terraform automatically configures:
- **Budget alert** at $4 (80% of $5 limit)
- **Auto-shutdown** at $4.50 (90% of limit)
- **Max 1 concurrent execution** (prevents scaling costs)
- **15-minute timeout** (prevents runaway jobs)
- **Minimal resources**: 1 CPU, 512MB RAM

---

## Monitoring

### View Logs

```bash
gcloud logging read "resource.type=cloud_run_job" \
  --project $GCP_PROJECT_ID \
  --limit 50 \
  --format json
```

### Trigger Manual Run

```bash
gcloud run jobs execute job-scraper \
  --region us-central1 \
  --wait
```

### Check Scheduler

```bash
gcloud scheduler jobs list --location us-central1
```

### View Costs

Console: https://console.cloud.google.com/billing/reports

CLI:
```bash
gcloud billing accounts list
```

---

## Configuration

### Change Schedule

Edit `terraform/gcp/terraform.tfvars`:
```hcl
schedule_frequency = "0 */2 * * 1-5"  # Every 2 hours, weekdays
```

Re-deploy:
```bash
cd terraform/gcp
terraform apply
```

### Update Slack Webhook

```bash
# Update secret
gcloud secrets versions add slack-webhook-url \
  --data-file=- <<EOF
https://hooks.slack.com/services/YOUR/NEW/WEBHOOK
EOF
```

### Adjust Budget

Edit `terraform/gcp/terraform.tfvars`:
```hcl
monthly_budget_amount = 10  # $10/month
```

Re-deploy:
```bash
terraform apply
```

---

## Teardown

**Complete removal:**
```bash
./scripts/teardown-cloud.sh
```

Or manually:
```bash
# Delete all resources
cd terraform/gcp
terraform destroy

# Delete project
gcloud projects delete $GCP_PROJECT_ID
```

**Note:** Projects count against quota for 30 days after deletion.

---

## Troubleshooting

### Project quota exceeded

**Symptom:** "exceeded your allotted project quota"

**Fix:** Bootstrap automatically reuses existing projects. Or manually delete old projects:
```bash
gcloud projects list --filter="lifecycleState:ACTIVE"
gcloud projects delete OLD_PROJECT_ID
```

### Build failed

**Symptom:** "Cloud Build failed"

**Fix:**
1. Check logs: `gcloud builds list --limit 5`
2. View details: `gcloud builds log BUILD_ID`
3. Common causes:
   - Missing dependencies in `requirements.txt`
   - Syntax error in Dockerfile
   - Insufficient permissions

### Job execution timeout

**Symptom:** "Job exceeded timeout"

**Fix:** Increase timeout in Terraform:
```hcl
# terraform/gcp/main.tf
timeout = "1800s"  # 30 minutes
```

### Secret not found

**Symptom:** "Secret not found: slack-webhook-url"

**Fix:** Create secret manually:
```bash
echo -n "https://hooks.slack.com/services/YOUR/WEBHOOK/URL" | \
  gcloud secrets create slack-webhook-url --data-file=-
```

---

## Security

### Secrets Management

- Slack webhook stored in Google Secret Manager (encrypted at rest)
- Accessed via service account with least-privilege IAM role
- Automatic rotation available (not enabled by default)

### Network

- Private VPC with single subnet
- VPC Connector for Cloud Run egress
- No public IPs exposed
- Firewall rules deny all ingress by default

### IAM Roles

**Runtime service account:**
- `roles/secretmanager.secretAccessor`
- `roles/storage.objectViewer`
- `roles/logging.logWriter`

**Scheduler service account:**
- `roles/run.invoker`

### Binary Authorization

Optional (not enabled by default):
```bash
# Require signed container images
gcloud container binauthz policy import policy.yaml
```

---

## Advanced

### Multi-Region Deployment

Deploy to multiple regions for redundancy:
```bash
for region in us-central1 europe-west1 asia-east1; do
  terraform apply -var="region=$region"
done
```

### Custom Domain

Map custom domain to Cloud Run:
```bash
gcloud beta run domain-mappings create \
  --service job-scraper \
  --domain jobs.yourdomain.com \
  --region us-central1
```

### CI/CD Integration

Trigger deployment from GitHub Actions:
```yaml
# .github/workflows/deploy.yml
- name: Deploy to GCP
  run: |
    gcloud auth activate-service-account --key-file=${{ secrets.GCP_SA_KEY }}
    python -m cloud.bootstrap --yes
```

---

## Next Steps

- [Configure job filters](../config/user_prefs.example.json)
- [Set up Slack notifications](SLACK.md)
- [View architecture](JOB_SCRAPER_ARCHITECTURE.md)
- [Troubleshooting guide](TROUBLESHOOTING.md)
