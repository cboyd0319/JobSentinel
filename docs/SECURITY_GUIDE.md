# Security Guide

**Comprehensive security best practices for Job Finder deployment.**

---

## Overview

This guide covers **6 FREE security controls** implemented to protect against:
- 🔒 Credential leaks (API keys, tokens, passwords)
- 🛡️ Injection attacks (SQL, XSS, command injection)
- 🔐 RCE (Remote Code Execution) via MCP servers
- 🚫 Rate limiting abuse
- 📊 Audit trail for forensics

**Total Cost:** $0/month (all free/open-source tools)

---

## Security Controls

### 1. Secrets Scanning (TruffleHog)

**Prevents:** Accidentally committing API keys, passwords, tokens to GitHub.

**How it works:**
- Pre-commit hook scans all staged files
- CI/CD scans every push
- Blocks commits with detected secrets

**Usage:**
```bash
# Runs automatically on commit
git add .
git commit -m "my changes"
# ✅ Blocked if secrets found

# Manual scan
trufflehog git file://. --only-verified

# View pre-commit config
cat .pre-commit-config.yaml
```

**What it detects:**
- AWS keys (`AKIA...`)
- API keys (OpenAI, Google, etc.)
- Private keys (RSA, SSH, etc.)
- Passwords in code
- LinkedIn cookies (`li_at`)
- GitHub tokens (`ghp_...`, `ghs_...`)

**Bypass (emergency only):**
```bash
git commit --no-verify -m "emergency fix"
```

---

### 2. Input Validation (Pydantic)

**Prevents:** SQL injection, XSS, command injection, path traversal.

**How it works:**
- All MCP requests validated before execution
- Dangerous patterns automatically blocked
- Clear error messages for debugging

**Validation schemas:**

#### JobSearchRequest
```python
from utils.validators import validate_job_search

# ✅ Safe - passes validation
validated = validate_job_search(
    keywords=["python", "devops"],
    locations=[{"city": "Denver", "state": "CO"}],
    page=1
)

# ❌ Blocked - SQL injection
validate_job_search(keywords=["'; DROP TABLE jobs--"])
# ValueError: Dangerous pattern detected: DROP\s+TABLE

# ❌ Blocked - Command injection
validate_job_search(keywords=["python; rm -rf /"])
# ValueError: Dangerous pattern detected: [;&|`$()]
```

**Blocked patterns:**
- SQL injection: `DROP TABLE`, `UNION SELECT`, `' OR 1=1`
- Command injection: `;`, `|`, `` ` ``, `$`, `()`
- Path traversal: `../`, `..\\`
- XSS: `<script>`, `javascript:`
- Code execution: `eval()`, `exec()`, `__import__`

**Custom validation:**
```python
from utils.validators import MCPServerConfig

config = MCPServerConfig(
    enabled=True,
    server_path="/app/mcp/server.py",  # ✅ Must end in .py/.js
    allowed_networks=["https://api.example.com"],  # ✅ HTTP/HTTPS only
    max_requests_per_hour=100,
    timeout_seconds=30
)
```

---

### 3. Rate Limiting

**Prevents:** API bans, abuse, runaway loops.

**Per-server limits:**

| Server | Limit | Window | Rationale |
|--------|-------|--------|-----------|
| JobsWithGPT | 100 req | 1 hour | Public API |
| Reed | 300 req | 1 hour | Official API |
| JobSpy | 50 req | 1 hour | Aggressive scraper |

**Check limits:**
```python
from utils.rate_limiter import mcp_rate_limits

# Get stats
stats = mcp_rate_limits.get_all_stats()
print(stats["jobswithgpt"])
# {
#   "max_requests": 100,
#   "current_requests": 47,
#   "remaining": 53,
#   "wait_time_seconds": 0.0
# }
```

**Custom limits:**
```python
# Set custom rate limit
mcp_rate_limits.set_limits(
    server_name="custom_server",
    max_requests=50,
    time_window_seconds=3600
)
```

**Decorator usage:**
```python
from utils.rate_limiter import rate_limited

@rate_limited("jobswithgpt", tokens=1, timeout=30.0)
async def search_jobs(...):
    # Automatically rate-limited
    pass
```

---

### 4. Audit Logging

**Purpose:** Forensics, anomaly detection, compliance.

**Log format:** JSONL (JSON Lines) in `logs/audit.jsonl`

**Event types:**
- `mcp_call` - MCP tool invocation
- `rate_limit` - Rate limit exceeded
- `auth_failure` - Authentication failed
- `injection_attempt` - Blocked injection attack
- `path_traversal` - Blocked path traversal
- `suspicious_activity` - Anomaly detected

**Usage:**
```python
from utils.audit_log import audit_logger

# Log MCP call
audit_logger.log_mcp_call(
    server_name="jobswithgpt",
    tool_name="search_jobs",
    arguments={"keywords": ["python"]},
    result="success",
    duration_ms=1234.5
)

# Log security event
audit_logger.log_security_event(
    event_type="injection_attempt",
    server_name="jobspy",
    severity="critical",
    description="SQL injection detected: ' OR 1=1"
)
```

**View logs:**
```bash
# Tail audit log
tail -f logs/audit.jsonl | jq

# Get stats
python -c "
from utils.audit_log import audit_logger
stats = audit_logger.get_stats(hours=24)
print(stats)
"
```

**Anomaly detection:**
```python
from utils.audit_log import anomaly_detector

# Check for anomalies
anomalies = anomaly_detector.detect_anomalies(hours=1)

# Print report
anomaly_detector.print_anomaly_report(hours=24)
```

**Detected anomalies:**
- High error rate (>20%)
- Excessive rate limiting (>10 events/hour)
- Authentication failures
- Security events (injection, traversal)
- Unusual server activity (>3x normal)

**Sensitive data redaction:**
```python
# Automatic redaction of:
# - api_key
# - password
# - token
# - secret
# - cookie
# - auth

# Original
{"api_key": "sk-abc123", "query": "python"}

# Logged (redacted)
{"api_key": "***REDACTED***", "query": "python"}
```

---

### 5. Docker Isolation

**Prevents:** MCP servers compromising host system.

**Security features:**
1. **Read-only filesystem** - Cannot modify files
2. **Network isolation** - No/limited network access
3. **Resource limits** - Cannot consume all CPU/memory
4. **Minimal capabilities** - Cannot escalate privileges
5. **Non-root user** - Runs as unprivileged user

**Start isolated MCP servers:**
```bash
# Start all servers
docker-compose -f docker/docker-compose.mcp.yml up -d

# Start specific server
docker-compose -f docker/docker-compose.mcp.yml up -d jobswithgpt

# View logs
docker-compose -f docker/docker-compose.mcp.yml logs -f

# Stop servers
docker-compose -f docker/docker-compose.mcp.yml down
```

**Container security:**
```yaml
# docker/docker-compose.mcp.yml
services:
  jobswithgpt:
    user: "1000:1000"              # Non-root
    read_only: true                # Read-only FS
    security_opt:
      - no-new-privileges:true     # No privilege escalation
    cap_drop:
      - ALL                        # Drop all capabilities
    network_mode: bridge           # Limited network
    deploy:
      resources:
        limits:
          cpus: '0.5'              # Max 50% CPU
          memory: 512M             # Max 512MB RAM
```

**Risk levels:**

| Server | Network | Risk | Recommendation |
|--------|---------|------|----------------|
| JobsWithGPT | ✅ Allowed | 🟢 LOW | Safe to use |
| Reed | ✅ Allowed | 🟢 LOW | Official API |
| JobSpy | ❌ BLOCKED | 🟡 MEDIUM | Use with caution |

---

### 6. Panic Button

**Purpose:** Emergency disable for compromised MCP servers.

**Features:**
- ✅ Instant disable (all servers or specific)
- ✅ Automatic config backup
- ✅ Kill Docker containers
- ✅ Prevent restart with disable flag
- ✅ Easy restore from backup

**Usage:**

#### Disable All Servers (Emergency)
```bash
./scripts/mcp-panic-button.sh

# Output:
🚨 INITIATING PANIC MODE
...
✅ Created backup: config/user_prefs.json.backup.20251003_143025
✅ Disabled all MCP servers in config
✅ Stopped Docker containers
✅ Set disable flag: .mcp_disabled

🚨 PANIC MODE ACTIVE
```

#### Disable Specific Server
```bash
./scripts/mcp-panic-button.sh jobspy

# Output:
⚠️  Disabling MCP server: jobspy
✅ Disabled jobspy
✅ Stopped Docker container
```

#### Check Status
```bash
./scripts/mcp-panic-button.sh --status

# Output:
=== MCP Server Status ===
✅ Normal operation

Enabled servers:
  • jobswithgpt: ✅ ENABLED
  • reed: ❌ DISABLED
  • jobspy: ❌ DISABLED
```

#### Restore from Backup
```bash
./scripts/mcp-panic-button.sh --restore

# Output:
✅ Restored config
✅ Removed disable flag
✅ MCP servers restored
```

**When to use:**
- ✅ MCP server behaving suspiciously
- ✅ Security event detected
- ✅ High error rate in audit logs
- ✅ Credential leak suspected
- ✅ Debugging production issue

---

## API Key Management

### Best Practices

**✅ DO:**
- Store keys in environment variables
- Use `.env` file (never commit it!)
- Rotate keys regularly (every 90 days)
- Use short-lived tokens when possible
- Down-scope permissions (read-only if possible)

**❌ DON'T:**
- Hard-code keys in source code
- Commit keys to Git
- Share keys via email/Slack
- Use root/admin keys for automation

### Environment Variables

**Linux/macOS:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export REED_API_KEY=your_key_here
export SLACK_WEBHOOK_URL=your_webhook_url

# Or use .env file
echo "REED_API_KEY=your_key_here" >> .env
echo "SLACK_WEBHOOK_URL=your_webhook_url" >> .env
```

**Windows PowerShell:**
```powershell
# Add to PowerShell profile
$env:REED_API_KEY = "your_key_here"
$env:SLACK_WEBHOOK_URL = "your_webhook_url"

# Or use .env file
"REED_API_KEY=your_key_here" | Out-File -Append .env
"SLACK_WEBHOOK_URL=your_webhook_url" | Out-File -Append .env
```

### Google Cloud (Service Accounts)

**Create service account with minimal permissions:**
```bash
# Create service account
gcloud iam service-accounts create job-scraper \
    --display-name="Job Scraper Service Account"

# Grant minimal permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:job-scraper@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/run.invoker"

# Download key (store securely!)
gcloud iam service-accounts keys create key.json \
    --iam-account=job-scraper@PROJECT_ID.iam.gserviceaccount.com

# Use key
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
```

---

## Threat Model

### MCP Servers (Untrusted Code)

**Risks:**
- 🔴 **RCE** - Execute arbitrary code on host
- 🔴 **Credential theft** - Steal API keys, tokens
- 🟡 **Data exfiltration** - Send job data to attacker
- 🟡 **Supply chain attack** - Malicious dependency updates

**Mitigations:**
- ✅ Docker isolation (RCE containment)
- ✅ Read-only filesystem (malware persistence prevention)
- ✅ Network restrictions (data exfiltration prevention)
- ✅ Input validation (injection prevention)
- ✅ Audit logging (detection)

### Job Boards (Untrusted Data)

**Risks:**
- 🟡 **XSS** - Malicious JavaScript in job descriptions
- 🟡 **Phishing** - Fake job postings with malicious links
- 🟢 **Tracking** - Job board tracking pixels

**Mitigations:**
- ✅ Input validation (XSS prevention)
- ✅ URL normalization (tracking removal)
- ⚠️ User responsibility (verify job legitimacy)

### Cloud Deployment (GCP)

**Risks:**
- 🟡 **Cost overruns** - Runaway cloud charges
- 🟡 **Data breach** - Unauthorized access to job data
- 🟢 **Service disruption** - Cloud Run downtime

**Mitigations:**
- ✅ Budget alerts ($10/month default)
- ✅ IAM permissions (least privilege)
- ✅ Private data (jobs stored in GCS with encryption)
- ✅ Retry logic (automatic recovery)

---

## Compliance

### GDPR

**Personal Data:** Job search preferences, Slack webhook URLs

**User Rights:**
- **Right to access** - Export data: `python -m src.agent --mode export`
- **Right to erasure** - Delete data: `rm -rf data/`
- **Right to portability** - JSON export included

**Data retention:**
- Jobs: 90 days (configurable)
- Logs: 90 days (logrotate)
- Audit logs: 1 year (compliance)

### Secrets Management

**Compliance checklist:**
- ✅ No plaintext secrets in source code
- ✅ Secrets scanning (TruffleHog)
- ✅ Environment variables only
- ✅ .gitignore for sensitive files
- ✅ Audit logging enabled

---

## Cost Summary

| Security Control | FREE Alternative | Paid Alternative | Annual Savings |
|------------------|------------------|------------------|----------------|
| Secrets Scanning | TruffleHog | GitGuardian ($18/user/mo) | $216/user |
| Input Validation | Pydantic | WAF ($20-100/mo) | $240-1200 |
| Rate Limiting | Token bucket | Redis ($15-50/mo) | $180-600 |
| Audit Logging | JSONL | Datadog ($95-500/mo) | $1140-6000 |
| Docker Isolation | Docker CE | AWS Fargate ($30/mo) | $360 |
| Panic Button | Bash script | PagerDuty ($21/user/mo) | $252/user |

**Total Savings:** $2,388 - $9,200+/year per user

---

## Security Checklist

### Before First Run

- [ ] Review `config/user_prefs.json` - No secrets hard-coded
- [ ] Set environment variables - `REED_API_KEY`, `SLACK_WEBHOOK_URL`
- [ ] Enable secrets scanning - Pre-commit hook installed
- [ ] Review `.gitignore` - Sensitive files excluded
- [ ] Test panic button - `./scripts/mcp-panic-button.sh --status`

### Weekly Monitoring

- [ ] Check audit logs - `tail -100 logs/audit.jsonl`
- [ ] Run anomaly detection - `python -c "from utils.audit_log import anomaly_detector; anomaly_detector.print_anomaly_report()"`
- [ ] Review rate limits - `python -c "from utils.rate_limiter import mcp_rate_limits; print(mcp_rate_limits.get_all_stats())"`
- [ ] Rotate credentials - Every 90 days

### Incident Response

**If security event detected:**

1. **Panic button** - `./scripts/mcp-panic-button.sh`
2. **Check audit logs** - `tail -1000 logs/audit.jsonl | grep -i "security\|auth\|injection"`
3. **Review recent changes** - `git log --since="24 hours ago"`
4. **Rotate credentials** - All API keys, tokens, webhooks
5. **Restore from backup** - `./scripts/mcp-panic-button.sh --restore`

---

## Resources

- **TruffleHog Docs:** https://github.com/trufflesecurity/trufflehog
- **Pydantic Validation:** https://docs.pydantic.dev
- **Docker Security:** https://docs.docker.com/engine/security/
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/

---

**Next:** [Developer Guide](DEVELOPER_GUIDE.md) - Contributing to the project
