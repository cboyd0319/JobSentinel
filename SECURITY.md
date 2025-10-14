# Security Policy

## Supported Versions

Latest minor version only. Upgrade to stay secure.

| Version | Support | Auto-Update |
|---------|---------|-------------|
| 0.6.x   | ✅ Active | ✅ Available |
| < 0.6   | ❌ EOL | ⚠️ Manual upgrade |

## Auto-Update Security (Windows)

JobSentinel includes automatic security updates — zero admin rights required.

**Features:**
- **Security detection** — Scans release notes for vulnerability keywords (CVE, exploit, critical)
- **Auto-backup** — Creates restore point before every update (mandatory)
- **Health verification** — Tests installation after update
- **Auto-rollback** — Restores previous version if update fails
- **SHA256 checksums** — Validates package integrity (when available in release)
- **Security-only mode** — `python -m jsa.cli update --security-only` checks only for security updates

**Usage:**
```bash
# Check for security updates only
python -m jsa.cli update --security-only --check-only

# Auto-install security updates (recommended for scheduled tasks)
python -m jsa.cli update --security-only --auto

# Check all updates with prompt
python -m jsa.cli update
```

**How it works:**
1. Queries GitHub releases API (no telemetry)
2. Parses release notes for security keywords
3. Creates automatic backup to `backups/before_vX.Y.Z_update.tar.gz`
4. Installs via pip from GitHub tag
5. Runs health check (`jsa.cli health`)
6. Auto-restores if health check fails

**Risk:** Low. Updates use official GitHub releases via pip. Backup+rollback prevent data loss.

## Reporting Vulnerabilities

**Contact:** GitHub issues at https://github.com/cboyd0319/JobSentinel/issues  
**Response:** 3 business days  
**Process:** Responsible disclosure, credit reporters (anonymous OK)

**Include:**
- Vulnerability description
- Reproduction steps
- Impact assessment
- Fix suggestion (optional)

**Don't:**
- Post publicly before patch
- Disclose exploits in public issues

## Security Architecture

**Secrets:**
- Store in `.env` file (gitignored) or environment variables
- Required (if enabled): `SLACK_WEBHOOK_URL`, SMTP credentials
- Optional: `OPENAI_API_KEY`, Reed API key
- Never committed to git

**Least privilege:**
- Scrapers: read-only HTTP requests to public job sites
- Slack: `incoming-webhook` scope only
- Database: file-system permissions (SQLite)
- No admin rights: runs in user directory on Windows

**Supply chain:**
- Dependencies pinned in `pyproject.toml`
- Dependabot auto-merge for security updates (patch/minor)
- Manual review for major version bumps
- `pip-audit` in CI/CD (fails on high/critical CVEs)
- PyGuard scans 20+ vulnerability categories weekly
- Playwright browsers from official Mozilla CDN

**Network access:**
- Job board websites (scraping only)
- SMTP servers (if email configured)
- Slack webhook (if configured)
- GitHub API (update checks only)
- No telemetry, no analytics, no third-party tracking

## Security Best Practices

### Local Deployment (default)
- SQLite in user directory (no admin rights)
- All data local (zero cloud services)
- Scrapers respect `robots.txt` + rate limits
- No external data transmission except configured alerts

### Cloud Deployment (optional)
- Secrets in cloud provider vault (GCP Secret Manager, AWS Secrets Manager)
- Encrypt databases at rest
- Least-privilege IAM roles
- Enable audit logs
- Network egress controls

### Dependency Hygiene
- Automated: Dependabot + GitHub Security Advisories
- CI/CD: `pip-audit` + PyGuard on every PR
- Manual: Review `CHANGELOG.md` for breaking changes
- Rollback: `python -m jsa.cli backup restore` if issues

### Windows-Specific
- No PowerShell execution policy bypass
- Desktop shortcuts via `pywin32` (no registry edits)
- Portable Node.js (no system-wide install)
- Python venv (isolated dependencies)

## Disclosure Timeline

1. **Report received** — 1 business day acknowledgement
2. **Triage** — 3 business days assessment
3. **Fix development** — 1-14 days (depends on severity)
4. **Release** — Tagged GitHub release with security notes
5. **Public disclosure** — After fix released (coordinated with reporter)

## Hall of Fame

Security researchers who responsibly disclosed vulnerabilities:

*(None yet — be the first!)*

---

**Questions?** Open a discussion: https://github.com/cboyd0319/JobSentinel/discussions
