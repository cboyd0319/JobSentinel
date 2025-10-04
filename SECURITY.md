# Security Guide

This software handles your personal data. Here's what you need to know.

⚠️ **Alpha software = alpha security.** I do my best, but expect gaps.

## Security Checklist

Before you run this:

- ✅ Check that `.env` is in `.gitignore` (it is, but verify)
- ✅ Don't share your Slack webhook URL with anyone
- ✅ Keep resume files local (this software never uploads them)
- ✅ Set cloud budget alerts if deploying to cloud
- ✅ Update dependencies: `pip install -U -r requirements.txt`

**Skip the cloud if you're paranoid.** Local-only is completely safe.

---

## What Gets Stored and Where

**Local storage (your computer):**

- Job postings (title, company, URL, description)
- Your job preferences (keywords, salary targets)
- Resume skills (if you use the parser)
- Logs (when it runs, what it finds)

**Sent to Slack:**

- Job matches only (title, company, URL, score)

**Cloud storage (if you deploy):**

- Everything from local storage
- Encrypted SQLite backups

**Never stored or sent:**
- Your actual resume file
- Personal info (name, address, phone)
- Browsing history
- Financial data

**Bottom line:** If you don't trust the cloud, run local-only. It works fine.

---

## Secrets (API Keys, Passwords, etc.)

**What counts as a secret:**

Secrets are sensitive pieces of information like passwords, API keys, and webhook URLs. If someone gets these, they could:

- Post fake job alerts to your Slack
- Access your cloud resources
- Rack up charges on your account

### How This Project Protects Secrets

**Local Deployment:**

1. **`.env` file:** Contains your secrets (Slack webhook, database URL, etc.)
   - This file is automatically ignored by git (won't be uploaded to GitHub)
   - File permissions are set to 600 (only you can read it)
   - Check: Run `cat .gitignore | grep .env` to confirm

2. **`config/user_prefs.json`:** Contains your preferences
   - Should also be git-ignored (contains salary expectations, companies)
   - Check: Run `git status` - you should NOT see this file listed

**Cloud Deployment (GCP):**

1. **GCP Secret Manager:** Stores secrets encrypted
   - Only the Cloud Run service can access them
   - Secrets are encrypted at rest and in transit
   - You can rotate (change) secrets without redeploying

2. **Service Accounts:** Limited permission identities
   - The scraper runs as a service account with minimal permissions
   - It can only read secrets, write logs, and store data
   - It cannot create new resources or access billing

### How to Check Your Secrets are Safe

```bash
# Make sure .env is NOT tracked by git
git ls-files | grep .env

# If .env shows up, remove it:
git rm --cached .env
git commit -m "Remove .env from git"

# Check file permissions (Unix/macOS/Linux)
ls -l .env
# Should show: -rw------- (only you can read/write)

# If not, fix it:
chmod 600 .env
```

---

## Network Security

### Local Deployment

**What the scraper connects to:**
- Job boards (to scrape listings)
- Slack API (to send notifications)
- Nothing else

**What it doesn't connect to:**
- No analytics or tracking servers
- No ads networks
- No third-party data collectors

### Cloud Deployment

**Additional connections:**
- Cloud provider APIs (GCP currently, AWS/Azure planned)
- Cloud storage (for database backups)

**Protections:**
- All traffic is encrypted (HTTPS/TLS)
- Cloud Run uses private networking (not exposed to internet)
- Only the scheduler can trigger the scraper (URL is authenticated)

---

## Container Security (for Cloud Deployments)

If you deploy to GCP (AWS/Azure are future enhancements), the scraper runs in a "container" (a isolated, secure environment).

### What I Did to Secure the Container

1. **Minimal base image:** Uses `python:3.12-slim` (smallest, fewest vulnerabilities)
2. **Non-root user:** Runs as user `scraper`, not `root` (limits damage if compromised)
3. **No unnecessary tools:** Doesn't include shells, editors, or debugging tools
4. **Vulnerability scanning:** GCP Artifact Registry scans for known issues
5. **Binary authorization:** Only signed, trusted images can deploy

### How You Can Verify

```bash
# Check what's in the Docker image
docker run --rm job-scraper:latest ls -la /

# Verify it runs as non-root user
docker run --rm job-scraper:latest whoami
# Should output: scraper
```

---

## Data Encryption

### At Rest (Stored Data)

**Local:**
- SQLite database is NOT encrypted by default
- **Risk:** If someone gains access to your computer, they can read `data/jobs.sqlite`
- **Mitigation:** Use full-disk encryption (FileVault on macOS, BitLocker on Windows, LUKS on Linux)

**Cloud:**
- All data is encrypted by cloud provider (AES-256)
- Encryption keys are managed by Google (AWS/Azure support planned)
- Backups are also encrypted

### In Transit (Data Being Sent)

- All network traffic uses TLS 1.2+ encryption
- Slack webhooks use HTTPS
- Cloud API calls use HTTPS
- No data is sent in plain text

---

## Logging and Monitoring

### What Gets Logged

**Locally:**
- When the scraper runs
- How many jobs were found
- Errors and warnings
- Stored in: `data/logs/`

**In the Cloud:**
- Same as local, plus:
- Who triggered the scraper (scheduler or manual)
- Resource usage (memory, CPU)
- Stored in: Google Cloud Logging

### What is NOT Logged

- ❌ Secrets (passwords, API keys, webhook URLs)
- ❌ Personal information
- ❌ Full job descriptions (only title/company/URL)

### How to Review Logs

```bash
# Local logs
tail -f data/logs/job_scraper_*.log

# Cloud logs (GCP)
gcloud logging read "resource.type=cloud_run_revision" --limit 50
```

---

## Vulnerability Scanning

This project includes automated security checks:

### Pre-Commit Hooks (Run Before Every Git Commit)

1. **Bandit:** Scans Python code for security issues
2. **Safety:** Checks dependencies for known vulnerabilities
3. **Detect-secrets:** Prevents committing API keys or passwords

To run manually:

```bash
# Install pre-commit hooks
pip install pre-commit
pre-commit install

# Run all checks
pre-commit run --all-files
```

### Dependency Updates

Check for vulnerable dependencies:

```bash
# Install safety
pip install safety

# Scan for vulnerabilities
safety check --file requirements.txt
```

Update vulnerable packages:

```bash
# Update all dependencies
pip install -U -r requirements.txt

# Or update specific package
pip install -U <package-name>
```

---

## Cloud-Specific Security

### Google Cloud Platform (GCP)

**What I configured:**

1. **Budget Alerts:** You'll get emails at $5, $10, and $15 spending
2. **IAM Roles:** Service account has minimal permissions
3. **VPC Network:** Private networking (not internet-exposed)
4. **Secret Manager:** Encrypted secret storage
5. **Cloud Armor (optional):** DDoS protection

**What you should do:**

1. Enable 2-Factor Authentication on your Google account
2. Review IAM permissions: `gcloud projects get-iam-policy PROJECT_ID`
3. Check security findings: Visit Security Command Center in GCP Console

### AWS (Future)

Similar security controls will be implemented:
- IAM roles with least privilege
- KMS for encryption
- VPC for network isolation
- CloudWatch for monitoring

### Azure (Future)

- Azure AD for authentication
- Key Vault for secrets
- Virtual Network for isolation
- Security Center for monitoring

---

## Common Security Mistakes to Avoid

### ❌ Don't

1. **Commit `.env` to git**
   - Your secrets will be public on GitHub
   - Fix: Run `git rm --cached .env` if you already did this

2. **Share your Slack webhook URL**
   - Anyone can send fake job alerts to your channel
   - Fix: Revoke the old webhook, create a new one

3. **Use the same password everywhere**
   - If one account is compromised, all are at risk
   - Fix: Use a password manager (1Password, Bitwarden, LastPass)

4. **Ignore budget alerts**
   - You could rack up unexpected cloud bills
   - Fix: Set up billing alerts and check spending weekly

5. **Run as root/admin**
   - If the scraper is compromised, attackers get full system access
   - Fix: Run as a regular user account

### ✅ Do

1. **Keep dependencies updated**
   - Run `pip install -U -r requirements.txt` monthly

2. **Review logs regularly**
   - Check for errors or unusual activity

3. **Enable 2FA on cloud accounts**
   - Prevents unauthorized access even if password is stolen

4. **Back up your data**
   - Export SQLite database occasionally: `cp data/jobs.sqlite backups/`

5. **Test your backups**
   - Make sure you can restore from a backup if needed

---

## Incident Response (What to Do If Something Goes Wrong)

### If You Think Your Secrets Were Exposed

1. **Immediately rotate (change) all secrets:**

   ```bash
   # Slack webhook: Delete old webhook, create new one via scripts/slack_bootstrap.py
   python scripts/slack_bootstrap.py

   # GCP: Rotate service account key
   gcloud iam service-accounts keys create new-key.json --iam-account=...
   ```

2. **Check for unauthorized access:**
   ```bash
   # GCP audit logs
   gcloud logging read "protoPayload.authenticationInfo.principalEmail!='YOUR_EMAIL'" --limit 100
   ```

3. **Review recent activity:**
   - Check Slack for fake messages
   - Check cloud billing for unexpected charges
   - Check database for unusual jobs

### If You See Unexpected Cloud Charges

1. **Immediately pause the scheduler:**
   ```bash
   gcloud scheduler jobs pause job-scraper-trigger --location=us-central1
   ```

2. **Check what's running:**
   ```bash
   gcloud run services list
   gcloud compute instances list
   ```

3. **If you don't recognize a resource, delete it:**
   ```bash
   python -m cloud.teardown --provider gcp
   ```

### If the Scraper Stops Working

1. **Check logs for errors:**
   ```bash
   tail -f data/logs/*.log
   ```

2. **Test connectivity:**
   ```bash
   python -c "import requests; print(requests.get('https://google.com').status_code)"
   ```

3. **Verify secrets are still valid:**
   ```bash
   python scripts/slack_bootstrap.py  # Test Slack webhook
   ```

---

## Security Audit Checklist

Run this checklist monthly:

- [ ] Update Python dependencies: `pip install -U -r requirements.txt`
- [ ] Run vulnerability scan: `safety check --file requirements.txt`
- [ ] Review cloud spending (if deployed)
- [ ] Check for unusual log entries
- [ ] Verify `.env` is not in git: `git ls-files | grep .env` (should be empty)
- [ ] Test Slack webhook still works
- [ ] Check that backups are being created (cloud deployment)
- [ ] Review IAM permissions (cloud deployment)

---

## Reporting Security Issues

If you find a security vulnerability in this project:

1. **Do NOT open a public GitHub issue** (that would expose the vulnerability)
2. Email the maintainer directly (check README for contact info)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if you have one)

I'll respond within 48 hours and work with you to fix it.

---

## Additional Resources

- **OWASP Top 10:** [https://owasp.org/www-project-top-ten/](https://owasp.org/www-project-top-ten/)
- **GCP Security Best Practices:** [https://cloud.google.com/security/best-practices](https://cloud.google.com/security/best-practices)
- **Python Security Guide:** [https://python.readthedocs.io/en/latest/library/security_warnings.html](https://python.readthedocs.io/en/latest/library/security_warnings.html)
- **NIST Cybersecurity Framework:** [https://www.nist.gov/cyberframework](https://www.nist.gov/cyberframework)

---

## Threat Model (Alpha Draft)

| Asset | Threat | Risk (Low/Med/High) | Mitigation |
|-------|--------|---------------------|------------|
| Slack Webhook URL | Disclosure -> Spam/Fake Alerts | Medium | Stored only in `.env`; never logged; easy to rotate. |
| Local SQLite DB | Unauthorized local access | Medium | Encourage full-disk encryption; optional future DB encryption. |
| Cloud Credentials (gcloud) | Privilege abuse / lateral movement | High | Least-privilege service accounts; secure subprocess allowlist; user 2FA. |
| Resume Text (parsed) | Leakage via logs/cache | Low | Cache contains derived JSON only (skills/titles); no raw resume file stored. |
| Subprocess Invocation | Command injection / binary spoof | Medium | Central secure allowlist wrapper; no `shell=True`; path verification. |
| PDF/DOCX Parsing | Malicious document exploits | Medium | Uses maintained libs (pdfplumber, python-docx); advise scanning suspicious resumes; future sandbox. |
| External Downloads (spaCy model, gcloud SDK) | Supply-chain tampering | Medium | HTTPS + host allowlist + hash verification (SDK) + explicit consent prompts. |
| Excessive Scraping | IP blocking / legal friction | Medium | Respect rate limits; configurable concurrency; user warning in README. |

### Trust Boundaries
1. Local runtime (user machine) – high trust; all sensitive processing stays here.
2. Slack Webhook – outbound only; restricts data to job summaries.
3. Cloud APIs (optional) – network boundary; restrict permissions; rotate credentials.

### Attack Surfaces
* File parsing for resumes.
* Network HTTP scraping.
* Subprocess calls to `gcloud` and system utilities.
* Dependency supply chain.

### Planned Hardening (Roadmap)
1. Async secure subprocess wrapper (parity with cloud `run_command`).
2. Optional PDF sandbox (qpdf or isolated container) for untrusted resumes.
3. JSON Schema validation for `user_prefs.json` and resume taxonomy.
4. CLI flag `--offline` disabling all outbound downloads (except target job boards).
5. Hash pinning for spaCy model wheel (if feasible) and additional SDK versions.

### User Guidance (Practical)
* Run locally first; only enable cloud when comfortable with cost & IAM.
* Treat webhook URLs like passwords—rotate if posted publicly.
* Keep dependencies updated monthly; stale libs increase exploit risk.
* If suspicious resume behavior (parsing crash), delete the file and re-run with verbose logs.

> Alpha status: Security controls are evolving. Review this section after each update.

