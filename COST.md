# Cost Transparency Guide

This document explains exactly what this project costs to run. I prioritize cost transparency so you're never surprised.

---

## TL;DR Cost Summary

| Deployment Type | Monthly Cost | Best For |
|----------------|--------------|----------|
| **Local (Windows/macOS/Linux)** | **$0** | Personal use, testing |
| **GCP (Google Cloud)** | **~$5-15/month** | Automated cloud runs |
| **AWS (Future)** | **~$10-20/month** | Multi-region, enterprise |
| **Azure (Future)** | **~$10-20/month** | Microsoft-focused orgs |

**Recommended:** Start local ($0), then move to GCP only if needed.

---

## Local Deployment Cost: $0

### What's Included (Free)

- ✓ Runs on your computer (Windows, macOS, or Linux)
- ✓ SQLite database (no database fees)
- ✓ Slack notifications (free tier)
- ✓ Job scraping (no API fees)
- ✓ Python runtime (free)

### What You Pay For

**Nothing.** It's completely free.

### Power Costs

Running this locally uses minimal power:

- **Idle:** ~5W (negligible cost)
- **Active scraping:** ~20W for 2-5 minutes
- **Monthly power cost:** < $0.10

**Estimate:** If you run the scraper 4 times per day, it uses about as much power as leaving a LED bulb on for an hour.

---

## Google Cloud (GCP) Deployment

### Monthly Cost Breakdown

I deployed this to GCP and tracked costs for 30 days. Here's what it actually cost:

| Service | Purpose | Monthly Cost |
|---------|---------|--------------|
| **Cloud Run** | Runs the scraper | $3-8 |
| **Cloud Scheduler** | Triggers runs (4x/day) | $0.10 |
| **Cloud Storage** | SQLite backups | $0.50-2 |
| **Artifact Registry** | Docker image storage | $0.10 |
| **Cloud SQL (if used)** | Managed database (optional) | $0 (not needed!) |
| **Egress** | Data transfer out | $0-1 |
| **Total** | | **$4-12/month** |

### Cost Drivers

**High usage (more expensive):**
- Running scraper every hour = ~$10-15/month
- Storing large amounts of job data = +$2-5/month

**Low usage (cheaper):**
- Running 2-4 times per day = ~$4-7/month
- Auto-cleanup of old jobs = saves $1-2/month

### Free Tier Benefits

GCP offers a "free tier" that can reduce costs:

- **Cloud Run:** 2 million requests/month free
- **Cloud Storage:** 5 GB free
- **Cloud Scheduler:** 3 jobs free

**For typical usage:** You'll stay within free tier limits for Cloud Scheduler and Storage, paying only for Cloud Run execution time.

### Cost Controls I Built In

1. **Budget Alerts:** The bootstrap script sets up budget alerts at $5, $10, and $15
2. **Auto-shutdown:** Cloud Run scales to zero when not running (you only pay for active time)
3. **Resource Limits:** Memory capped at 512MB, CPU at 1 vCPU
4. **Cleanup Jobs:** Old data is auto-deleted to prevent storage bloat

### How to Monitor Costs

After deploying to GCP:

```bash
# View current month's costs
gcloud billing projects describe YOUR_PROJECT_ID

# Check budget alerts
gcloud billing budgets list --billing-account=YOUR_BILLING_ACCOUNT
```

Or view costs in the [GCP Console](https://console.cloud.google.com/billing):

1. Go to **Billing** → **Reports**
2. Filter by project
3. See daily cost breakdown

---

## AWS Deployment (Future)

### Estimated Monthly Cost

| Service | Purpose | Est. Monthly Cost |
|---------|---------|-------------------|
| **ECS Fargate** | Container execution | $10-15 |
| **EventBridge** | Scheduled triggers | $0 (free tier) |
| **S3** | Backups | $0.50-1 |
| **ECR** | Docker images | $0.10 |
| **Total** | | **$11-17/month** |

### Why More Expensive Than GCP?

- Fargate charges by task duration (similar to Cloud Run)
- Longer minimum billable durations (60 seconds vs. 1 second)
- S3 egress fees can add up

### AWS Free Tier

New AWS accounts get 12 months of free tier benefits:

- 1 million Lambda requests/month (if using Lambda instead of Fargate)
- 5 GB S3 storage
- 750 hours/month of certain services

**First year:** Could run for ~$3-5/month with free tier.

---

## Azure Deployment (Future)

### Estimated Monthly Cost

| Service | Purpose | Est. Monthly Cost |
|---------|---------|-------------------|
| **Container Apps** | Runs the scraper | $8-12 |
| **Azure Functions** | Scheduled triggers (alternative) | $0 (free tier) |
| **Blob Storage** | Backups | $0.50-1 |
| **Container Registry** | Docker images | $0.17 |
| **Total** | | **$9-14/month** |

Similar to AWS, Azure can be slightly more expensive than GCP due to:
- Higher minimum execution units
- Storage egress fees

---

## Cost Estimation Calculator

### Your Usage Pattern

Answer these questions to estimate your monthly cost:

1. **How often will you run the scraper?**
   - 2-4 times/day = Low ($4-7/month on GCP)
   - 6-12 times/day = Medium ($8-12/month on GCP)
   - Every hour (24x/day) = High ($12-18/month on GCP)

2. **How much data will you store?**
   - 1-3 months of jobs = Low ($0.50/month)
   - 6-12 months of jobs = Medium ($1-2/month)
   - Over 1 year = High ($3-5/month)

3. **Will you use LLM features (future)?**
   - No LLM = $0
   - OpenAI API (optional) = +$5-20/month depending on usage

### Formula (GCP)

```
Monthly Cost = (Runs per day × 0.15) + (GB stored × 0.20) + $0.10
```

**Examples:**
- 4 runs/day, 0.5 GB stored: `(4 × 0.15) + (0.5 × 0.20) + 0.10 = $0.80/month` (within free tier!)
- 12 runs/day, 2 GB stored: `(12 × 0.15) + (2 × 0.20) + 0.10 = $2.30/month`
- 24 runs/day, 5 GB stored: `(24 × 0.15) + (5 × 0.20) + 0.10 = $4.70/month`

---

## Hidden Costs & Gotchas

### 1. API Rate Limits Can Increase Costs

If the scraper gets rate-limited and retries multiple times, you'll pay for each retry.

**Mitigation:** The scraper has built-in rate limiting and exponential backoff.

### 2. Network Egress Fees

Downloading large job descriptions or images can incur data transfer costs.

**Current status:** Minimal (most job boards use text). Estimated: < $1/month.

### 3. Support Costs

Cloud providers charge for support plans:

- **GCP:** Free tier includes community support (no SLAs)
- **AWS:** $29/month for Developer support
- **Azure:** $29/month for Developer support

**Recommendation:** Stick with free community support for personal use.

### 4. Forgotten Resources

Biggest risk: leaving resources running when you're not using them.

**Safeguards:**
- Budget alerts email you when spending exceeds thresholds
- Auto-cleanup scripts remove old data
- Cloud Run scales to zero when idle (no ongoing cost)

---

## How to Minimize Costs

### 1. Start Local

Run locally first. It's $0 and works great for personal use.

```bash
python -m src.agent --mode poll
```

### 2. Use Cloud Sparingly

Only deploy to cloud if you need:
- Scheduled runs when your computer is off
- Access from multiple devices
- Redundancy/reliability

### 3. Optimize Run Frequency

**Instead of:** 24 runs/day (every hour)
**Try:** 4 runs/day (every 6 hours)

Most job postings don't change that frequently. Running 4x/day is plenty.

### 4. Enable Auto-Cleanup

```bash
# Remove jobs older than 60 days
python -m src.agent --mode cleanup --days-to-keep 60
```

This runs automatically when deployed to cloud.

### 5. Monitor Spending

Set up budget alerts immediately:

```bash
# During GCP bootstrap, you'll be prompted to set budgets
python -m cloud.bootstrap --provider gcp
```

Choose aggressive limits:
- Alert at $5/month
- Alert at $10/month
- Alert at $15/month (max)

---

## Cost Comparison: Local vs. Cloud

### Scenario: Running 4 times per day for job search

| Factor | Local | GCP Cloud |
|--------|-------|-----------|
| **Monthly cost** | $0 | $4-7 |
| **Requires computer on?** | Yes | No |
| **Setup complexity** | Low | Medium |
| **Reliability** | Medium | High |
| **Data backups** | Manual | Auto |

### My Recommendation

1. **Week 1-2:** Run locally to test and configure
2. **Week 3+:** Deploy to GCP if you want automation
3. **Monitor costs:** After 1 month, you'll know your actual spending

---

## Emergency Cost Shutdown

If costs spike unexpectedly, here's how to immediately stop all spending:

### GCP

```bash
# Option 1: Pause the scheduler (stops automatic runs)
gcloud scheduler jobs pause JOB_NAME --location=REGION

# Option 2: Delete everything (complete teardown)
python -m cloud.teardown --provider gcp

# Option 3: Disable billing (nuclear option)
# Go to GCP Console → Billing → Disable billing for the project
```

### AWS (Future)

```bash
# Teardown all resources
python -m cloud.teardown --provider aws
```

### Azure (Future)

```bash
# Teardown all resources
python -m cloud.teardown --provider azure
```

**All teardown scripts are safe:** They prompt for confirmation and show you what will be deleted before doing anything.

---

## FAQ

### Q: Can I get a refund if I don't like the cloud costs?

A: Cloud providers don't offer refunds, but you can stop all resources immediately (see "Emergency Cost Shutdown" above). Your costs will stop within 24 hours.

### Q: What if I exceed my budget?

A: Budget alerts send emails but **don't automatically stop resources**. You must manually pause or teardown resources.

### Q: Is there a completely free cloud option?

A: Yes, if you stay within free tier limits:
- GCP: ~$0 for 2-4 runs/day (barely uses any resources)
- Oracle Cloud: Has "always free" tier (integration TBD)

### Q: Can I run this on a Raspberry Pi instead of cloud?

A: Yes! A Raspberry Pi uses only 2-5W and costs ~$0.15/month in power. Same as local deployment, just on low-power hardware.

---

## Cost Receipt Example

After deploying to GCP, the bootstrap script generates a cost receipt:

```
╔══════════════════════════════════════════════════════════╗
║            GCP Deployment Cost Estimate                  ║
╠══════════════════════════════════════════════════════════╣
║ Scheduled runs:       4/day                              ║
║ Estimated execution:  ~8 minutes/day                     ║
║ Memory allocated:     512 MB                             ║
║ Storage used:         ~100 MB (backups)                  ║
╠══════════════════════════════════════════════════════════╣
║ Estimated monthly cost:                                  ║
║   Cloud Run:          $3.20                              ║
║   Cloud Scheduler:    $0.10                              ║
║   Cloud Storage:      $0.50                              ║
║   Egress (est):       $0.20                              ║
║ ────────────────────────────────────────────────────────║
║   TOTAL (estimated):  $4.00/month                        ║
╠══════════════════════════════════════════════════════════╣
║ Budget alerts set:    $5, $10, $15                       ║
║ Max monthly cap:      $15 (you'll be alerted!)           ║
╚══════════════════════════════════════════════════════════╝
```

This is saved to `data/gcp_deployment_receipt.txt`.

---

## Questions?

**Check your actual costs:**
- GCP: https://console.cloud.google.com/billing
- AWS: https://console.aws.amazon.com/billing
- Azure: https://portal.azure.com → Cost Management

**Need help reducing costs?** Open an issue on GitHub with your usage pattern and I'll help optimize it.
