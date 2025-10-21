# Security Policy

## Supported Versions

We release security updates for the following versions of JobSentinel:

| Version | Supported          |
| ------- | ------------------ |
| 0.9.x   | :white_check_mark: |
| < 0.9   | :x:                |

**Note:** As a rapidly evolving project, we recommend always using the latest release from the `main` branch.

---

## Reporting a Vulnerability

**We take security seriously.** If you discover a security vulnerability in JobSentinel, please report it responsibly.

### 🔒 Private Disclosure (Recommended)

**For sensitive vulnerabilities that could harm users if disclosed publicly:**

1. **Use GitHub Security Advisories** (preferred):
   - Navigate to: https://github.com/cboyd0319/JobSentinel/security/advisories
   - Click "Report a vulnerability"
   - Fill out the form with details
   - We'll acknowledge within **48 hours**

2. **Direct Contact** (if GitHub unavailable):
   - Email: `cboyd0319` at GitHub (via profile contact)
   - Subject: `[SECURITY] JobSentinel Vulnerability Report`

### 📢 Public Disclosure

**For low-risk issues or security enhancements:**
- Open a public issue: https://github.com/cboyd0319/JobSentinel/issues/new
- Label it with `security` tag
- We'll triage and respond within 5 business days

---

## What to Include in Your Report

To help us understand and fix the issue quickly, please include:

- **Description:** Clear explanation of the vulnerability
- **Impact:** What could an attacker do? Who is affected?
- **Steps to Reproduce:** Detailed instructions (code samples, commands, screenshots)
- **Affected Versions:** Which versions are vulnerable?
- **Suggested Fix:** (Optional) If you have a patch or mitigation
- **POC:** (Optional) Proof-of-concept code (please redact sensitive data)

**Example Report:**
```
Title: Path Traversal in Log File Reader

Description: The log_analyzer.py module does not validate user-supplied
file paths, allowing an attacker to read arbitrary files on the system.

Impact: Local users can read sensitive files (e.g., .env, SSH keys) if
they have access to the JobSentinel CLI.

Steps to Reproduce:
1. Run: python -m jsa.cli analyze-logs --file ../../../etc/passwd
2. Observe file contents leaked in output

Affected Versions: 0.9.0 and earlier

Suggested Fix: Use pathlib.Path.resolve() and verify path is within
allowed directories before reading.
```

---

## Our Commitment

When you report a vulnerability, we commit to:

1. **Acknowledge receipt** within **48 hours** (business days)
2. **Provide regular updates** (at least weekly) on our progress
3. **Credit you** in release notes and security advisories (unless you prefer anonymity)
4. **Fix critical issues** within **30 days** (target; depends on complexity)
5. **Coordinate disclosure** timing with you before publishing

### Response Timeline

| Severity | Initial Response | Fix Target | Public Disclosure |
|----------|------------------|------------|-------------------|
| **Critical** (RCE, arbitrary code execution) | 24 hours | 7 days | After fix deployed |
| **High** (data breach, privilege escalation) | 48 hours | 14 days | After fix deployed |
| **Medium** (CSRF, XSS, info disclosure) | 72 hours | 30 days | After fix deployed |
| **Low** (security hardening, best practices) | 5 days | 60 days | Immediate |

**Note:** These are targets, not guarantees. Complex issues may take longer.

---

## Scope

### ✅ In Scope (We'll Fix)

- **Core Application:**
  - CLI (`jsa.cli`)
  - Web UI (`jsa.web`, `jsa.fastapi_app`)
  - Scrapers (`sources/`)
  - Database layer (`jsa.db`, `database.py`)
  - Matchers and filters
  
- **Security-Critical Components:**
  - Authentication/authorization (if added)
  - Secrets handling (.env, credentials)
  - Input validation (user prefs, URLs, file paths)
  - Output sanitization (logs, web UI)
  - Dependency vulnerabilities

- **Deployment Scripts:**
  - Platform installers (`deploy/local/`, `deploy/cloud/`)
  - GitHub Actions workflows (`.github/workflows/`)

### ❌ Out of Scope (Won't Fix)

- **Development Tools:**
  - Test fixtures (`deploy/common/tests/`)
  - Documentation generators
  - Build scripts (unless they affect production)

- **Third-Party Dependencies:**
  - Report vulnerabilities in libraries **directly to the maintainer**
  - Exception: If we use a library in an unsafe way, that's in scope

- **Local Environment Issues:**
  - User misconfiguration (wrong .env settings)
  - Insecure OS/Python installation
  - Physical access attacks (someone has your laptop)

- **Denial of Service (DoS):**
  - Local resource exhaustion (it's your machine, you control it)
  - Rate limiting on job boards (not our infrastructure)

- **Social Engineering:**
  - Phishing attacks against users
  - Tricking users into running malicious commands

### 🤔 Borderline Cases

If you're unsure whether something is in scope, **report it anyway**. We'd rather review a non-issue than miss a real vulnerability.

---

## Security Features

JobSentinel is designed with security in mind:

### 🔒 Privacy-First Architecture
- **Local-Only:** All data stays on your machine (unless you deploy to cloud)
- **No Telemetry:** We don't track you or send data anywhere
- **Minimal Network:** Only connects to job boards you configure

### 🛡️ Hardening Measures
- **Input Validation:** All external data (job listings, user prefs) is validated
- **Secrets Management:** API keys/tokens stored in `.env` (never committed)
- **Read-Only Scrapers:** We only fetch data, never post to job boards
- **Parameterized Queries:** SQL injection prevention (SQLAlchemy ORM)
- **Path Sanitization:** File operations validate paths to prevent traversal
- **Subprocess Safety:** Shell commands use argument lists (not shell strings)

### 🔍 Security Scanning
- **SAST:** Bandit (Python security linter) runs on every PR
- **Dependency Scanning:** pip-audit + Dependabot + OSV Scanner
- **Code Analysis:** CodeQL + Semgrep for vulnerability detection
- **Secrets Detection:** Pre-commit hooks prevent accidental commits
- **SBOM:** Software Bill of Materials for supply chain transparency
- **SLSA Provenance:** Build attestations for release integrity

### 📊 Supply Chain Security
- **Pinned Dependencies:** Exact versions in `requirements.txt` with SHA256 hashes
- **SHA-Pinned Actions:** GitHub Actions use commit SHAs (not tags)
- **Dependabot:** Automated dependency updates with security alerts
- **OpenSSF Scorecard:** Continuous security posture monitoring

---

## Security Advisories

Past security issues are documented in:
- **GitHub Security Advisories:** https://github.com/cboyd0319/JobSentinel/security/advisories
- **CHANGELOG.md:** Security fixes noted in each release

**CVE Policy:** We request CVEs for critical/high severity issues affecting released versions.

---

## Hall of Fame 🏆

We recognize and thank security researchers who help make JobSentinel safer:

| Researcher | Date | Issue | Severity |
|------------|------|-------|----------|
| *(No reports yet)* | - | - | - |

**Want to be listed?** Report a valid security issue and we'll credit you (unless you prefer anonymity).

---

## Security Compliance

JobSentinel aligns with industry standards:

- **OWASP ASVS Level 2:** Application Security Verification Standard
  - See [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md) for control mapping
- **CWE Top 25:** Mitigations for most dangerous software weaknesses
- **SLSA Level 3:** Supply chain integrity (build provenance, hermetic builds)
- **OSSF Best Practices:** OpenSSF Scorecard passing badge

---

## Secure Coding Guidelines

**For Contributors:** When submitting code, follow these security principles:

1. **Validate All Inputs:** Never trust data from external sources (job boards, user prefs, file uploads)
2. **Use Parameterized Queries:** Always use SQLAlchemy ORM or prepared statements
3. **Avoid Shell=True:** Use subprocess with argument lists, never shell strings
4. **Sanitize Paths:** Use `pathlib.Path.resolve()` and verify paths are within allowed directories
5. **Redact Secrets:** Never log API keys, tokens, or credentials
6. **Escape Outputs:** Use Jinja2 autoescape, React's built-in XSS protection
7. **Handle Errors Safely:** Don't leak stack traces or sensitive info in error messages
8. **Check Dependencies:** Run `pip-audit` before adding new libraries

See [docs/SECURE_CODING_GUIDE.md](docs/SECURE_CODING_GUIDE.md) for detailed examples.

---

## Questions?

- **General Security Questions:** Open a [GitHub Discussion](https://github.com/cboyd0319/JobSentinel/discussions)
- **Vulnerability Reports:** Use GitHub Security Advisories (link above)
- **Feature Requests:** Open an issue with `security` label

**Thank you for helping keep JobSentinel secure!** 🙏

---

## Additional Resources

- **Threat Model:** [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md)
- **Architecture:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Security Dominance Plan:** [docs/copilot/SECURITY_DOMINANCE_PLAN.md](docs/copilot/SECURITY_DOMINANCE_PLAN.md)
- **PYSEC Guidelines:** [docs/copilot/PYSEC.md](docs/copilot/PYSEC.md)
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)

---

*Last Updated: October 21, 2025*
