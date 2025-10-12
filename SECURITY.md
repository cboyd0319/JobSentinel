# Security Policy

## Supported versions

We support the latest minor version and security patches.

| Version | Supported          |
| ------- | ------------------ |
| 0.6.x   | ✅ Yes             |
| 0.5.x   | ⚠️ Security fixes only |
| < 0.5   | ❌ No              |

## Reporting a vulnerability

**Email:** cboyd0319@gmail.com  
**Subject:** `[SECURITY] JobSentinel - <brief description>`  
**Response time:** Within 3 business days

### What to include

- Description of the vulnerability
- Steps to reproduce
- Affected versions
- Potential impact
- Suggested fix (if available)

### What happens next

1. **Acknowledgment** - We'll confirm receipt within 3 days
2. **Assessment** - We'll evaluate severity and impact
3. **Fix** - We'll develop and test a patch
4. **Disclosure** - Coordinated disclosure once fixed (typically 90 days)
5. **Credit** - You'll be credited in the release notes (unless you prefer anonymity)

## Security best practices

### Handling of secrets

- **Never commit secrets** to version control
- Use environment variables or secret managers
- Required secrets documented in README (Security section)
- Example: `.env` file (never committed, in `.gitignore`)

### Least privilege

- JobSentinel runs with **user privileges only**
- No admin/root access required
- Scrapers = read-only access to job sites
- Database = file-system permissions only

### Supply chain

- Dependencies pinned in `pyproject.toml`
- Playwright browsers from official CDN
- Future: Releases will be signed (Sigstore/cosign)
- Future: SBOM (SPDX) attached to releases

### Data privacy

- All data stored **locally** (SQLite) by default
- No telemetry or analytics
- Cloud deployment is **opt-in** only
- Slack webhooks = outbound-only, user-controlled

## Known security considerations

### Web scraping

- Rate limiting to avoid triggering security measures
- User-Agent rotation to appear as normal browser
- Cookie handling for session management
- Risk: Job sites may block if rate limits exceeded

### API keys

- OpenAI API key (optional) - stored in `.env`
- Reed API key (optional) - stored in `.env`
- Slack webhook URL - stored in `.env`
- All keys loaded at runtime, never logged

### Local database

- SQLite file permissions = user-only read/write
- No encryption at rest (local machine assumed secure)
- Backup files contain same data (use disk encryption)

### Network security

- All HTTPS connections
- Certificate validation enabled
- No custom CA certs
- Timeouts on all requests

## Security updates

Security fixes are released as soon as possible. Subscribe to:
- GitHub Security Advisories for this repo
- Watch releases for security tags
- Follow CHANGELOG.md for security notes

## Hall of fame

We thank the following researchers for responsible disclosure:

- *Your name could be here!*

## Further reading

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OpenSSF Best Practices](https://bestpractices.coreinfrastructure.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
