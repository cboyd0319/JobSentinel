# Security Policy

## 🔒 Security Overview

This project takes security seriously and implements multiple layers of protection through automated scanning and monitoring.

## 🛡️ Security Monitoring

### GitHub Security Tab Integration

All security findings are automatically reported to the [Security tab](../../security) with the following tools:

| Tool | Purpose | Reporting | Frequency |
|------|---------|----------|-----------|
| **CodeQL** | Static code analysis | ✅ SARIF (auto upload) | Every push, daily |
| **Bandit** | Python security vulnerabilities | ✅ SARIF upload | Every push, daily |
| **Safety** | Python dependency vulnerabilities | ✅ SARIF + JSON artifact | Every push, daily |
| **OSV-Scanner** | Open source vulnerability intelligence | ✅ SARIF upload | Every push, daily |
| **Semgrep** | Multi-language security & secret patterns | ✅ SARIF upload | Full scans & on push |
| **TruffleHog** | Secret scanning (verified findings) | 📦 Artifact upload | Every push, daily |
| **Dependabot** | Dependency updates & vulnerabilities | ✅ Native GitHub | Weekly |

### Security Scanning Categories

**Code Scanning Alerts** (`.github/workflows/security.yml`):
- Source code vulnerabilities
- Security anti-patterns
- Injection vulnerabilities
- Cryptographic issues

**Dependency Alerts**:
- Known CVEs in dependencies (Safety, OSV-Scanner, Dependabot)
- Outdated packages with security fixes
- License compliance issues

**Secret Scanning**:
- TruffleHog verified findings
- GitHub native secret scanning (repo-level)

## 🚨 Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | ✅ Active support  |
| 0.x.x   | ❌ End of life     |

## 📢 Reporting a Vulnerability

### For Public Issues
- Open a [GitHub Issue](../../issues/new?template=security-issue.md) using the security template
- Use the "security" label
- Provide detailed reproduction steps

### For Private/Critical Issues
- **DO NOT** open a public issue for critical security vulnerabilities
- Email: security@yourproject.com (if configured)
- Use GitHub's [private vulnerability reporting](../../security/advisories/new)

### What to Include
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if known)
- Your contact information

## ⚡ Response Timeline

- **Initial Response**: Within 24 hours
- **Triage & Validation**: Within 48 hours
- **Fix Development**: Within 7 days (critical), 30 days (high)
- **Public Disclosure**: After fix is released and users have time to update

## 🔧 Local Security Testing

### Before Contributing

Run these commands locally to catch security issues:

```bash
# Setup development security tools (once)
scripts/setup-dev-tools.sh

# Pre-commit security check
scripts/precommit-security-scan.sh

# Comprehensive security scan (use GitHub workflow)
# See: .github/workflows/security.yml

# Individual scans
bandit -r . -x ./.venv                # Python security
safety scan --json --output safety-results.json --project config/.safety-project.ini
rm -f safety-results.json safety-results.sarif
osv-scanner .                        # OSV vulnerability database
semgrep --config=auto .              # Advanced patterns
```

### Pre-commit Hooks

Security checks run automatically on every commit:
- Basic security scan (fast)
- Code formatting validation
- Secret detection

Comprehensive scans run on push:
- Full vulnerability scanning
- License compliance
- Advanced security analysis

## 🎯 Security Best Practices

### For Contributors

1. **Never commit secrets**
   - Use environment variables
   - Add sensitive files to `.gitignore`
   - Use the provided security scanners

2. **Follow secure coding practices**
   - Validate all inputs
   - Use parameterized queries
   - Avoid shell injection (no `shell=True`)
   - Handle errors securely

3. **Dependencies**
   - Keep dependencies updated
   - Review Dependabot PRs promptly
   - Avoid packages with known vulnerabilities

4. **Testing**
   - Run security scans before committing
   - Test with untrusted inputs
   - Verify access controls

### For Users

1. **Keep Updated**
   - Use the latest version
   - Subscribe to security advisories
   - Review release notes for security fixes

2. **Configuration**
   - Use strong API keys
   - Enable HTTPS-only communication
   - Review access permissions regularly

3. **Monitoring**
   - Monitor logs for unusual activity
   - Set up alerts for failures
   - Regular security audits

## 📊 Security Metrics

Track our security posture:

- **Vulnerability Response Time**: Target < 7 days for critical
- **Dependency Freshness**: Weekly Dependabot scans
- **Code Coverage**: Security tests included in CI/CD
- **Scan Results**: All findings tracked in Security tab

## 🛠️ Infrastructure Security

### CI/CD Pipeline
- All workflows use pinned action versions
- SARIF results uploaded to Security tab
- Secrets managed through GitHub secrets
- No long-lived credentials in code

### Safety Blocking Policy
The CI/CD pipeline implements a strict blocking policy for dependency vulnerabilities:

**🚫 BLOCKED (Build fails):**
- Critical, High, or Medium severity vulnerabilities
- **ONLY if** fixes are available (patches/updates exist)

**✅ ALLOWED (Build continues):**
- Low severity vulnerabilities
- Unfixed vulnerabilities (no patches available yet)
- Unknown severity vulnerabilities

**Configuration:**
- Requires `SAFETY_API_KEY` repository secret for enhanced scanning
- API key provides access to comprehensive vulnerability database
- Custom logic processes Safety results and applies blocking policy
- Provides clear remediation instructions for blocked vulnerabilities

### Cloud Deployment
- Cost monitoring and alerts
- Least-privilege IAM roles
- Encrypted data at rest and in transit
- Network security controls

### Local Development
- Pre-commit hooks for security validation
- Automated dependency scanning
- Secret detection before commit
- Code quality and security analysis

## 🔗 Resources

- [GitHub Security Best Practices](https://docs.github.com/en/code-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Python Security Guidelines](https://python.org/dev/security/)
- [SARIF Specification](https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html)

## 📝 Changelog

### Security Updates

All security-related changes are documented in the main [CHANGELOG.md](../CHANGELOG.md) with the `[SECURITY]` prefix.

---

**This security policy is automatically enforced through GitHub Actions and local tooling.**

Last updated: $(date +%Y-%m-%d)
