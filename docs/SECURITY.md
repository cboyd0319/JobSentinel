# Security & Costs

**TL;DR:** Local mode is free and private. Cloud costs $5-15/month. Your data stays yours.

## Privacy & Data

**What I collect:** Nothing. This runs locally.

**What stays on your machine:**
- Job postings (SQLite database)
- Your preferences (config files)
- Scraping logs (auto-rotated)
- Resume analysis (if enabled)

**What goes to third parties:**
- HTTP requests to job sites (normal browsing)
- Slack notifications (if you set it up)
- Cloud deployment data (if you use GCP)

⚠️ **Risk:** If you deploy to cloud, job data lives on your GCP project. Use least privilege service accounts.

## Cloud Costs (Optional)

**Monthly estimate:** $5-15 depending on usage

**Breakdown:**
- Cloud Run: $5-10 (depends on frequency)
- Cloud Storage: $1-2 (job data)
- Networking: $1-3 (API calls)

**Cost calculator:**
```bash
# Check current spend
gcloud billing budgets list

# Set spending alert
gcloud billing budgets create \
  --billing-account=YOUR-ACCOUNT \
  --display-name="Job Scraper Budget" \
  --budget-amount=15 \
  --threshold-rule=percent:80
```

**Shutdown procedure:**
```bash
# Destroy everything
python cloud/bootstrap.py --destroy

# Verify deletion
gcloud run services list
gcloud storage buckets list
```

## Security Practices

**API keys:** Store in `.env` file (gitignored)

**Service accounts:** Use least privilege
```bash
# Check current permissions
gcloud projects get-iam-policy YOUR-PROJECT-ID

# Remove overprivileged roles
gcloud projects remove-iam-policy-binding YOUR-PROJECT-ID \
  --member="serviceAccount:scraper@project.iam.gserviceaccount.com" \
  --role="roles/owner"
```

**Local database:** Enable disk encryption on your machine

**Resume data:** Processed locally only, never uploaded

## Threat Model

| Asset | Risk | Impact | Mitigation |
|-------|------|--------|------------|
| Slack webhook | Spam notifications | Low | Easy to rotate, stored in .env only |
| Job database | Local access | Medium | Use disk encryption |
| Cloud credentials | Lateral movement | High | Least privilege, 2FA required |
| Resume text | Data leak | Medium | Processed locally, not stored in cloud |

## Incident Response

**If webhook compromised:**
```bash
# Rotate immediately
python scripts/setup/slack/slack_setup.py --force
```

**If cloud account compromised:**
```bash
# Emergency shutdown
python cloud/bootstrap.py --destroy
gcloud auth revoke --all
```

**If local machine compromised:**
```bash
# Change all API keys
rm .env
python scripts/setup/slack/slack_setup.py
# Regenerate Reed API key at reed.co.uk
```

## Supply Chain Security

**Dependencies:** Pinned in requirements.txt, but I don't audit everything

⚠️ **Risk:** Malicious packages could access your data. Review `requirements.txt` if paranoid.

**Sandboxing:** Consider running in Docker:
```bash
# Build container
docker build -t job-scraper .

# Run isolated
docker run --rm -v $(pwd)/config:/app/config job-scraper
```

## Compliance Notes

**GDPR:** You're the controller of scraped job data. Delete it when done.

**Terms of Service:** Respect robots.txt and rate limits. Don't spam job sites.

**Employment law:** Using this doesn't guarantee anything. Still apply properly.

## Audit Checklist

**Local setup:**
- [ ] `.env` file not in git
- [ ] Disk encryption enabled
- [ ] No hardcoded secrets in config
- [ ] Log retention set (auto-rotates after 30 days)

**Cloud setup:**
- [ ] Service account has minimal permissions
- [ ] Billing alerts configured
- [ ] VPC firewall rules restrictive
- [ ] No public database access

**Ongoing:**
- [ ] Monitor cloud costs monthly
- [ ] Rotate API keys quarterly
- [ ] Review access logs if suspicious activity

---

**Questions?** Check logs first, then open GitHub issue. Security issues: email directly.