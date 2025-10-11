# Security Policy

## Supported Versions

We support the latest minor version with security patches. Alpha releases may have known issues.

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

**Email:** security@yourdomain.tld (update this with your actual contact)

**Response time:** We aim to respond within **3 business days**.

**What to include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Please do NOT:**
- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before we've had a chance to address it

We follow responsible disclosure practices and will credit reporters (unless they prefer to remain anonymous).

## Security Best Practices

### Secrets Management
- **Never commit secrets** to git. Use `.env` files (git-ignored) or environment variables.
- **Required secrets:** `SLACK_WEBHOOK_URL` (if using Slack alerts)
- **Optional secrets:** `OPENAI_API_KEY`, Reed API key, SMTP credentials
- **Rotation:** Change API keys regularly, especially if compromised.

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
- Python dependencies pinned in `pyproject.toml`
- Regular security audits with `pip-audit`
- Playwright browsers from official CDN only
- No executable scripts in dependencies

### Network Security
- All external API calls use HTTPS
- SSL certificate verification enabled by default
- Slack webhooks are outbound-only (you control the endpoint)
- No inbound network services by default

## Known Limitations

**Alpha status:** This is alpha software. Expect bugs and breaking changes. Test thoroughly before production use.

**Scrapers:** Web scraping may break when sites change. Report issues via GitHub.

**Rate limiting:** Respect job board terms of service. Built-in delays may not be sufficient for all sources.

## Supply Chain Security

**Release signing:** Future releases will be signed with Sigstore/cosign.

**SBOM:** Software Bill of Materials (SPDX format) will be published with releases.

**Build provenance:** SLSA provenance attestations planned for future releases.

**Dependencies:** Use `pip-audit` to scan for known vulnerabilities:
```bash
pip install pip-audit
pip-audit
```

## Security Headers (Web UI)

If using the optional web UI:
- CSRF protection enabled (Flask-WTF)
- Secure session cookies
- Content Security Policy recommended (configure in production)
- HTTPS strongly recommended for production

## Incident Response

If a security incident occurs:
1. Contain: Rotate compromised credentials immediately
2. Assess: Determine scope of impact
3. Notify: Contact affected users if necessary
4. Fix: Deploy patches
5. Document: Post-mortem for lessons learned

## Contact

For security concerns: security@yourdomain.tld (update this)

For general issues: https://github.com/cboyd0319/JobSentinel/issues
