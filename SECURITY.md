# Security Policy

## Supported Versions

We support the latest minor version with security patches.

| Version | Supported |
| ------- | --------- |
| 0.6.x   | ✅        |
| < 0.6   | ❌        |

## Reporting a Vulnerability

**Contact:** Report via GitHub at https://github.com/cboyd0319/JobSentinel/issues

**Response time:** 3 business days

**What to include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Do NOT:**
- Open a public GitHub issue for security vulnerabilities
- Disclose publicly before we've addressed it

We follow responsible disclosure and credit reporters (unless anonymous preferred).

## Security

**Secrets:** Use `.env` or environment variables; never commit. Required: `SLACK_WEBHOOK_URL` (if using Slack). Optional: `OPENAI_API_KEY`, Reed API key, SMTP credentials.

**Least privilege:** Scrapers = read-only job sites. Slack webhook = `incoming-webhook` scope only. SQLite = file-system permissions.

**Supply chain:** Dependencies pinned in `pyproject.toml`. Playwright browsers from official CDN. No executable scripts in dependencies.

**Disclosure:** Report via GitHub issues at https://github.com/cboyd0319/JobSentinel/issues. Response SLA: 3 business days.

## Security Best Practices

### Local Deployment
- SQLite database stored locally with file-system permissions
- No telemetry or external data transmission (except configured alerts)
- Scrapers respect `robots.txt` and include rate limiting

### Cloud Deployment
- Use separate credentials for cloud environments
- Store secrets in cloud provider's secret manager (GCP Secret Manager, AWS Secrets Manager)
- Enable encryption at rest for databases
- Use least-privilege IAM roles
- Enable audit logging

### Dependencies
- Pin versions in `pyproject.toml`
- Run `pip-audit` regularly for CVE checks
- Update dependencies via Dependabot or manual review

## PGP Key

Not yet configured. Update this section when available.
