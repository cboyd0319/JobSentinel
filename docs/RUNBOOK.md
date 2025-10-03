# Operations Runbook

## Quick Reference

**Emergency Contacts:** @cboyd0319  
**Status Page:** https://github.com/cboyd0319/job-private-scraper-filter/actions  
**Security Alerts:** https://github.com/cboyd0319/job-private-scraper-filter/security

---

## Table of Contents

1. [Deployment](#deployment)
2. [Rollback](#rollback)
3. [Security Incidents](#security-incidents)
4. [Troubleshooting](#troubleshooting)
5. [Monitoring](#monitoring)

---

## Deployment

### Standard Deployment

Deployments are **fully automated** via semantic-release:

1. Merge PR to `main` branch
2. CI/CD runs automatically
3. If commit follows conventional commits, semantic-release creates a new version
4. Release is published to GitHub Releases

**Manual Trigger:**
```bash
gh workflow run release.yml
```

### Cloud Deployment (GCP)

```bash
# From repository root
PYTHONPATH=. python -m cloud.bootstrap --log-level INFO --yes
```

**Prerequisites:**
- GCP credentials configured
- `GOOGLE_APPLICATION_CREDENTIALS_JSON` set or service account JSON available

---

## Rollback

### Application Rollback

**GitHub Releases:**
```bash
# List recent releases
gh release list

# Download specific version
gh release download v1.2.0

# Deploy specific version
git checkout v1.2.0
# Re-run deployment steps
```

### Cloud Rollback (GCP)

```bash
# Teardown current deployment
PYTHONPATH=. python -m cloud.providers.gcp.teardown <PROJECT_ID>

# Deploy previous version
git checkout <previous-version-tag>
PYTHONPATH=. python -m cloud.bootstrap --yes
```

---

## Security Incidents

### Leaked Credentials

**Immediate Actions:**
1. Rotate affected credentials immediately
2. Review TruffleHog scan results:
   ```bash
   gh run list --workflow=security.yml --limit 1
   gh run view <RUN_ID> --log | grep -i trufflehog
   ```
3. Check Security tab for alerts
4. Revoke compromised keys in cloud provider console

**Prevention:**
- All secrets in environment variables or secret managers
- Never commit to git
- Use `.env` files (gitignored)

### Vulnerability Detected

**Response:**
1. Check severity in Security tab
2. Review Dependabot/OSV Scanner alerts
3. Update dependency:
   ```bash
   # Update requirements.txt
   pip install <package>==<fixed-version>
   pip freeze > requirements.txt
   ```
4. Run security scan:
   ```bash
   gh workflow run security.yml
   ```

---

## Troubleshooting

### Workflow Failures

**Check logs:**
```bash
# List recent runs
gh run list

# View specific run
gh run view <RUN_ID>

# Download logs
gh run download <RUN_ID>
```

**Common Issues:**

| Issue | Solution |
|-------|----------|
| Cache failures | GitHub infrastructure issue - safe to ignore |
| Flake8 failures | Black auto-formats on failure |
| Branch protection | Create PR instead of direct push |
| Test failures | Check database initialization in logs |

### Database Issues

**SQLite (Local):**
```bash
# Reinitialize database
rm job_scraper.db
python -m src.agent --mode health
```

**GCP Cloud SQL:**
```bash
# Check connection
gcloud sql instances list

# View logs
gcloud sql operations list --instance=<INSTANCE_NAME>
```

### Cloud Deployment Failures

**Common Issues:**
- **Project ID conflict:** Choose different project ID
- **API not enabled:** Enable required APIs in GCP console
- **Quota exceeded:** Request quota increase
- **Permissions:** Ensure service account has required roles

**Debug:**
```bash
# Verbose logging
PYTHONPATH=. python -m cloud.bootstrap --log-level DEBUG
```

---

## Monitoring

### CI/CD Health

**Metrics to Watch:**
- Workflow success rate: Target >95%
- Average run time: CI <5min, Security <10min
- Artifact retention: 1-2 days (cost control)

**Dashboard:**
```bash
gh run list --limit 20
```

### Security Posture

**Weekly Review:**
1. Check Security tab: https://github.com/cboyd0319/job-private-scraper-filter/security
2. Review Dependabot alerts
3. Verify all scanners reporting:
   - Bandit
   - CodeQL
   - OpenGrep
   - OSV Scanner
   - TruffleHog
   - PSScriptAnalyzer

**Target Metrics:**
- Open High/Critical alerts: 0
- SARIF uploads: 6/6 tools
- Dependency freshness: <30 days old

### Application Health

**Manual Health Check:**
```bash
python -m src.agent --mode health
```

**Expected Output:**
- Database initialized
- Configuration loaded
- No critical errors

---

## Key Rotation

### GitHub Tokens

1. Generate new token: https://github.com/settings/tokens
2. Update repository secret:
   ```bash
   gh secret set GITHUB_TOKEN
   ```

### GCP Service Accounts

1. Create new key in GCP Console
2. Update secret:
   ```bash
   gh secret set GCP_SA_KEY < service-account-key.json
   ```
3. Revoke old key in GCP Console

---

## Disaster Recovery

### Repository Corruption

```bash
# Clone fresh copy
git clone https://github.com/cboyd0319/job-private-scraper-filter.git
cd job-private-scraper-filter

# Verify integrity
git fsck
```

### Complete Data Loss

**Recovery Sources:**
1. GitHub repository (code + releases)
2. GCP Cloud SQL backups (if configured)
3. Local SQLite backups (if exist)

**Steps:**
1. Clone repository
2. Restore latest release
3. Restore database from backup
4. Re-run cloud deployment if needed

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-10-03 | Initial runbook creation | Claude Code |

---

## Appendix: Useful Commands

```bash
# View all workflows
gh workflow list

# Trigger security scan
gh workflow run security.yml

# Check branch protection
gh api /repos/cboyd0319/job-private-scraper-filter/branches/main/protection

# List open security alerts
gh api /repos/cboyd0319/job-private-scraper-filter/code-scanning/alerts?state=open

# View recent releases
gh release list

# Download latest release
gh release download

# View repository settings
gh repo view cboyd0319/job-private-scraper-filter
```
