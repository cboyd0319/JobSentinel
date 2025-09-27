# Cloud Deployment Cost Analysis 💰

This document analyzes the **cheapest** cloud deployment options for personal/friend accounts running the job scraper.

## Executive Summary

**Best Option for Friends: Google Cloud Run** 
- **Monthly Cost: $0** (for typical personal job scraping)
- **After free tier: ~$1-3/month** for heavy usage
- **Why:** Most generous free tier, scales to zero, dead simple deployment

## Detailed Cost Breakdown

### 🥇 Tier 1: 100% FREE (or nearly free)

#### Google Cloud Run (RECOMMENDED)
```yaml
FREE TIER:
  - 2 million requests/month
  - 360,000 GiB-seconds CPU/month  
  - 200,000 GiB-seconds memory/month
  - 1TB network egress/month

TYPICAL JOB SCRAPER USAGE:
  - ~96 requests/day (every 15 min)
  - ~2,880 requests/month
  - Well within free tier limits

COST AFTER FREE TIER:
  - $0.0000025 per request
  - $0.000009 per GiB-second CPU
  - Realistic monthly cost: $1-3 for heavy users
```

#### AWS Lambda  
```yaml
FREE TIER:
  - 1 million requests/month
  - 400,000 GB-seconds compute/month

TYPICAL USAGE:
  - ~2,880 requests/month (within free tier)
  - Job scraping fits well in execution time limits

COST AFTER FREE TIER:
  - $0.0000002 per request  
  - $0.0000166667 per GB-second
  - Realistic monthly cost: $2-5
```

#### Oracle Cloud Always Free (MOST GENEROUS)
```yaml
ALWAYS FREE (Forever):
  - 2 AMD OCPU instances (24/7)
  - 200GB block storage
  - 10TB outbound traffic/month
  - No time limits (truly forever free)

PERFECT FOR:
  - Friends who want maximum control
  - Long-running scrapers
  - No vendor lock-in concerns
```

### 🥈 Tier 2: Nearly Free Options  

#### Railway.app (Developer-Friendly)
```yaml
FREE TIER:
  - $5 usage credit/month
  - Simple deployment
  - Perfect for non-technical friends

COST:
  - Usually stays within $5 credit
  - Simple pricing model
```

#### Azure Container Instances
```yaml
FREE TIER:
  - First 1 million executions/month (first 12 months only)

AFTER FREE TRIAL:
  - Most expensive of the options
  - ~$0.000014 per GB-second
  - Not recommended for personal use
```

## Security Cost Analysis 🔐

### Personal Account Security Scanning (Future Feature)

We should add a cloud security scanner that checks friends' personal accounts for:

#### AWS Personal Account Issues:
- Root account with no MFA ❌
- Overly permissive IAM policies ❌
- Public S3 buckets ❌
- No billing alerts ❌
- Unused/excessive permissions ❌

#### GCP Personal Account Issues:  
- No organization policies ❌
- Public storage buckets ❌
- No budget alerts ❌
- Overprivileged service accounts ❌

#### Azure Personal Account Issues:
- No resource locks ❌
- Public storage accounts ❌
- No spending limits ❌
- Excessive contributor permissions ❌

**Implementation Plan:**
1. Use cloud provider APIs to scan configurations
2. Generate friendly, actionable reports
3. Provide one-click fixes where possible
4. Weekly security check reminders

## Deployment Recommendations by User Type

### Technical Friends
- **Primary:** Google Cloud Run
- **Backup:** AWS Lambda
- **Why:** Familiar with cloud concepts, want reliability

### Non-Technical Friends  
- **Primary:** Railway.app
- **Backup:** Oracle Cloud Always Free
- **Why:** Simple deployment, generous free tiers

### Privacy-Conscious Friends
- **Primary:** Oracle Cloud Always Free  
- **Backup:** Self-hosted on personal hardware
- **Why:** No vendor lock-in, maximum control

### Cost-Sensitive Friends
- **Primary:** Oracle Cloud Always Free
- **Backup:** Google Cloud Run  
- **Why:** Truly free forever vs. very generous free tier

## Hidden Costs to Watch

### Data Transfer Costs
- **Most providers:** First 1TB/month free
- **Job scraper usage:** ~100MB/month typical
- **Risk:** Very low

### Storage Costs  
- **SQLite database:** ~50MB after 1 year
- **Log files:** ~500MB after 1 year  
- **Cloud storage:** Usually $0.02-0.05/GB/month
- **Monthly cost:** <$0.50

### API Costs (AI-Enhanced Mode)
- **OpenAI GPT-4:** ~$0.30 per 1M tokens
- **Typical usage:** 100-500 job descriptions/month
- **Monthly cost:** $2-10 for AI features

## Implementation Priority

1. **Phase 1:** Google Cloud Run deployment template
2. **Phase 2:** AWS Lambda template  
3. **Phase 3:** Oracle Cloud template
4. **Phase 4:** Personal account security scanner
5. **Phase 5:** Cost monitoring and alerts

## One-Click Security Fixes

Future feature: Automated security hardening

```bash
# Example security fixes
./install.sh --cloud-deploy gcp --harden-security
```

This would automatically:
- Enable MFA requirements
- Set up billing alerts  
- Configure least-privilege IAM
- Enable audit logging
- Set up monitoring alerts