## Security Policy

I take security and user privacy seriously. JobSentinel is local-first and does not collect telemetry.

Reporting a Vulnerability
- Preferred: open a private security advisory at the repository’s Security tab
- Alternate: open an issue at https://github.com/cboyd0319/JobSentinel (do not include sensitive details)
- Include reproduction steps, impact, affected versions, and any mitigations

Supported Versions
- Current `main` branch and the latest tagged release are supported for security fixes.

Security Posture (at a glance)
- Secrets: store in environment variables or `.env`; never commit secrets
- Least privilege: scrapers are read-only; no write actions to job boards
- Supply chain: pinned dependencies in `pyproject.toml`; releases tracked via `CHANGELOG.md`
- Disclosure: I aim to respond within 3 business days and fix high-severity issues promptly
