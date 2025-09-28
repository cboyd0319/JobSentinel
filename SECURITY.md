# Security Policy

## 🔒 Security Overview

The Private Job Scraper & Filter is designed with **privacy and security as core principles**. This document outlines the security practices and how to report vulnerabilities.

## 🛡️ Security Features

### Privacy by Design
- **100% Local Execution**: All data processing happens on your machine
- **No External Data Transmission**: Job data never leaves your computer
- **Environment Variable Secrets**: All credentials stored in local `.env` files
- **No Telemetry**: Zero data collection or usage tracking

### Security Hardening
- **Input Validation**: All user inputs are validated and sanitized
- **Rate Limiting**: Respectful scraping prevents abuse
- **Process Isolation**: File locking prevents multiple instances
- **Database Encryption**: SQLite database with secure file permissions
- **Error Handling**: Comprehensive exception handling prevents crashes

### Credential Management
- **No Hardcoded Secrets**: All API keys and credentials via environment variables
- **Example Files Only**: No real credentials committed to repository
- **Secure File Permissions**: Automatic `.env` file permission warnings
- **Token Management**: ChatGPT API usage tracking and cost controls

## 📋 Supported Versions

Security updates are provided for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Yes             |
| < 1.0   | ❌ No              |

## 🚨 Reporting a Vulnerability

If you discover a security vulnerability, please help us keep the project secure by following responsible disclosure:

### Preferred Method: Private Security Advisory

1. Go to the [Security tab](https://github.com/cboyd0319/job-private-scraper-filter/security) of this repository
2. Click "Report a vulnerability"
3. Fill out the private security advisory form

### Alternative: Email

Send details to: **security@[project-domain]** (or create a private issue)

### What to Include

Please provide:
- **Description** of the vulnerability
- **Steps to reproduce** the issue
- **Potential impact** assessment
- **Suggested fix** (if you have one)
- **Your contact information** for follow-up

### What NOT to Include

- ❌ Do not open public issues for security vulnerabilities
- ❌ Do not share vulnerabilities on social media
- ❌ Do not attempt to exploit vulnerabilities on others' systems

## ⏱️ Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Resolution Target**: Within 30 days (depends on complexity)

## 🎯 Security Best Practices for Users

### Installation Security
- **Verify Downloads**: Only download from official GitHub releases
- **Check Checksums**: Verify file integrity when available
- **Use Virtual Environments**: Isolate Python dependencies
- **Review Code**: Inspect source code before running (it's open source!)

### Configuration Security
- **Strong Credentials**: Use app-specific passwords for email
- **Secure Webhooks**: Use HTTPS-only Slack webhook URLs
- **File Permissions**: Ensure `.env` files are not world-readable
- **Regular Updates**: Keep Python and dependencies updated

### Operational Security
- **Monitor Logs**: Check `data/logs/` for suspicious activity
- **Health Checks**: Run `python3 -m src.agent --mode health` regularly
- **Backup Verification**: Test database backup restoration
- **Network Monitoring**: Monitor outbound connections if needed

### API Key Security
- **Rotate Keys**: Regularly rotate OpenAI API keys
- **Monitor Usage**: Track ChatGPT API costs and usage
- **Principle of Least Privilege**: Use minimum required permissions
- **Revoke Unused Keys**: Remove old or unused API keys

## 🔍 Security Auditing

### Regular Security Reviews
- Code reviews for all contributions
- Dependency vulnerability scanning
- Security-focused testing of new features
- Documentation updates for security practices

### Automated Security
- Dependabot alerts for vulnerable dependencies
- CodeQL analysis for code vulnerabilities
- Security-focused CI/CD pipelines
- Safety CLI dependency scanning with project policy (`config/.safety-project.ini`)
- Benchmarked against CIS GitHub and GCP foundations (see docs/CIS Github Benchmark V1.1.0.PDF and docs/CIS_Google_Cloud_Platform_Foundation_Benchmark_v4.0.0.pdf)
- Regular penetration testing recommendations
- Prowler CIS scanning for Cloud Run (cis_4.0_gcp) and GitHub (cis_1.0)
  (set repo secret `PROWLER_GITHUB_TOKEN` with a PAT containing the `repo` scope to enable GitHub scans)

#### Safety Dependency Scanning
- **Configuration**: `[tool.safety]` block in `pyproject.toml` enforces the blocking policy and output format (JSON for automation).
- **Project metadata**: `config/.safety-project.ini` links findings back to this repository.
- **CI coverage**: `.github/workflows/security.yml` and `.github/workflows/enhanced-security.yml` run `safety scan` with SARIF uploads and the same blocking policy used locally.
- **Local parity**: `scripts/enhanced-security-scan.sh` and `scripts/local-security-scan.sh` run Safety with automatic fallbacks, generate SARIF for GitHub uploads, and honour the Critical/High/Medium fix-required gate.

## 📚 Security Resources

### For Developers
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Python Security Guidelines](https://python.org/dev/security/)
- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [CIS GitHub Benchmark v1.1.0 (PDF)](docs/CIS%20Github%20Benchmark%20V1.1.0.PDF)
- [CIS Google Cloud Platform Foundation Benchmark v4.0.0 (PDF)](docs/CIS_Google_Cloud_Platform_Foundation_Benchmark_v4.0.0.pdf)

### For Users
- [Secure Development Practices](CONTRIBUTING.md#security)
- [Developer Workflow & Security Checks](docs/DEVELOPMENT.md#code-quality)
- [Troubleshooting & Incident Response Tips](docs/TROUBLESHOOTING.md)

## 🏆 Security Recognition

I appreciate security researchers who help improve this project:

### Hall of Fame
*Contributors who responsibly disclose vulnerabilities will be listed here (with permission)*

### Acknowledgments
- Security researchers who follow responsible disclosure
- Community members who suggest security improvements
- Contributors who implement security features

## 📞 Security Contact

For urgent security matters:
- **GitHub Security Advisory**: Preferred method
- **Project Maintainer**: @cboyd0319
- **Security Team**: [To be established]

---

## 🔐 Threat Model

### Threats This Project Protects Against
- **Credential Theft**: Environment variable isolation
- **Data Exfiltration**: Local-only processing
- **Code Injection**: Input validation and sanitization
- **Denial of Service**: Rate limiting and resource controls
- **Supply Chain Attacks**: Dependency pinning and verification
## 📝 Quick Reference

- Local-first processing ensures job data stays on your machine; keep `.env` permissions tight (`chmod 600 .env`).
- Run `scripts/local-security-scan.sh` before committing to catch Bandit and Safety findings early.
- Use virtual environments and keep dependencies updated to pick up security fixes quickly.
- Monitor `data/logs/` for long-running deployments and rotate API keys periodically.

*Last reviewed: January 26, 2025*
