# Windows Security - Local Deployment

> **Last Updated:** 2025-10-14  
> **Status:** Production-Ready  
> **Security Level:** High (Local-First, Privacy-Focused)

## Overview

JobSentinel's Windows deployment follows security best practices for local-first, privacy-focused applications. This document outlines the security measures, threat model, and hardening configurations.

## Security Principles

### 1. **Local-First Architecture**
- **Localhost Binding Only**: API server binds to `127.0.0.1` (localhost), not `0.0.0.0`
- **No Remote Access**: Default configuration prevents external network access
- **Local Data Storage**: All data stored locally in SQLite database
- **No Telemetry**: Zero data exfiltration to third parties

### 2. **Minimal Privileges**
- **No Admin Rights Required**: All operations run with standard user privileges
- **User-Space Installation**: Everything installs in user directories
- **Portable Node.js**: Self-contained, no system-wide modifications
- **Virtual Environment**: Python dependencies isolated from system Python

### 3. **Secure Downloads**
- **TLS 1.2+ Enforcement**: All downloads use modern TLS versions
- **HTTPS Only**: No HTTP fallback for security-critical downloads
- **File Size Validation**: Sanity checks for downloaded files
- **Checksum Verification**: SHA256 hash validation (when available)

### 4. **Input Validation**
- **Path Traversal Prevention**: All file paths validated against project root
- **Subprocess Safety**: No shell=True, all arguments are literal strings
- **Command Injection Prevention**: PowerShell uses strict mode and proper escaping

## Threat Model

### In Scope
1. **Local Privilege Escalation**: ❌ Prevented (no admin operations)
2. **Remote Code Execution**: ❌ Prevented (localhost binding, input validation)
3. **Path Traversal**: ❌ Prevented (path validation)
4. **Command Injection**: ❌ Prevented (no shell=True, strict mode)
5. **Man-in-the-Middle**: ✅ Mitigated (TLS 1.2+, HTTPS)
6. **Credential Theft**: ✅ Protected (.env not committed, local storage)

### Out of Scope
1. **Physical Access Attacks**: User's computer must be physically secure
2. **OS-Level Vulnerabilities**: Requires Windows 11 with security updates
3. **Malicious Browser Extensions**: User responsible for browser security
4. **Social Engineering**: User training assumed

## Security Features

### PowerShell Security

**Strict Mode Enabled** (`bootstrap.ps1`, `setup-windows.ps1`, `run.ps1`, `launch-gui.ps1`):
```powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
```

**Benefits:**
- Undefined variables cause errors (no silent failures)
- Function calls must use proper syntax
- All errors halt execution (fail-secure)

**TLS Enforcement** (`bootstrap.ps1`):
```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
```

**Benefits:**
- Forces TLS 1.2 or 1.3 for all HTTPS downloads
- Prevents downgrade attacks
- Ensures modern cryptography

### Python Security

**Localhost Binding** (`launcher_gui.py`):
```python
"--host", "127.0.0.1",  # localhost only - no remote access
```

**Path Validation**:
```python
# Validate path is within project directory
resolved_path = self.config_path.resolve()
project_root_resolved = self.project_root.resolve()
if not str(resolved_path).startswith(str(project_root_resolved)):
    raise ValueError("Configuration file must be within project directory")
```

**Subprocess Safety**:
- All subprocess calls use list format (no shell=True)
- All arguments are literal strings (no user input)
- Bandit security scanner validates all subprocess calls

**Exception Handling**:
- Specific exception types (no bare `except:`)
- Security-relevant errors logged
- Fail-secure behavior (errors stop execution)

## Security Validations

### Automated Scans

**Bandit** (Python security scanner):
```bash
bandit -c config/bandit.yaml -r launcher_gui.py scripts/windows_setup.py
```

**Results**: 
- ✅ No HIGH or CRITICAL issues
- ✅ 1 MEDIUM issue addressed (localhost binding)
- ✅ 21 LOW issues documented (false positives with #nosec comments)

**Safety** (Dependency vulnerability scanner):
```bash
safety check --json
```

**PyGuard** (Additional security checks):
```bash
make security
```

### Manual Review Checklist

- [x] No hardcoded secrets (API keys, passwords, tokens)
- [x] No shell=True in subprocess calls
- [x] No eval(), exec(), or compile() with user input
- [x] No pickle, marshal, or unsafe serialization
- [x] No SQL injection vulnerabilities (using SQLAlchemy ORM)
- [x] No path traversal vulnerabilities (validated paths)
- [x] No command injection (PowerShell strict mode)
- [x] No remote code execution vectors
- [x] TLS 1.2+ enforced for downloads
- [x] Localhost binding for API server

## Configuration Security

### Environment Variables (`.env`)

**Best Practices:**
1. **Never commit `.env` files** (in .gitignore)
2. **Use app-specific passwords** for email (Gmail: App Passwords, not account password)
3. **Rotate credentials regularly** (especially Slack webhooks)
4. **Minimal permissions** (Slack webhook = post-only, no read access)

**Example (`.env.example`)**:
```bash
# ✅ GOOD: Template with placeholders
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ
SMTP_PASS=your_app_password

# ❌ BAD: Real credentials in example file (never do this)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T123/B456/abc789
SMTP_PASS=my_actual_password
```

### User Preferences (`config/user_prefs.json`)

**Security Considerations:**
- Contains **no secrets** (only preferences like keywords, locations)
- Validated against JSON schema (`user_prefs.schema.json`)
- Allows custom denylist but no code execution
- Safe to share or commit (if sanitized of personal info)

## Incident Response

### If Credentials Are Compromised

**Slack Webhook:**
1. Revoke webhook in Slack workspace settings
2. Generate new webhook URL
3. Update `.env` file
4. Restart JobSentinel

**Email Credentials:**
1. Revoke app-specific password (Gmail, etc.)
2. Generate new app password
3. Update `.env` file
4. Test with: `python -m jsa.cli test-email`

**Database Breach:**
1. Database contains only public job listings (no credentials)
2. If concerned, delete `data/jobs.sqlite` and restart

### Suspicious Activity

**Check Logs:**
```bash
# Review application logs
cat logs/jobsentinel.log | grep -i "error\|warning\|suspicious"

# Check Windows Event Viewer
eventvwr.msc
# Look for: Application logs, Security logs
```

**Network Activity:**
```powershell
# Check open ports (PowerShell)
Get-NetTCPConnection | Where-Object {$_.LocalPort -eq 8000}

# Should show ONLY localhost (127.0.0.1), NOT 0.0.0.0
```

## Security Updates

### Keeping JobSentinel Secure

**Monthly Updates:**
1. Update dependencies: `pip install -e . --upgrade`
2. Run security scan: `make security`
3. Check for CVEs: `safety check`
4. Review changelogs: `cat CHANGELOG.md`

**Immediate Action Required:**
- **Critical CVE** in dependencies: Update immediately
- **Security advisory** from project: Follow remediation steps
- **OS security patch** (Windows): Install via Windows Update

### Dependency Management

**Dependabot** (automated PRs):
- Weekly security updates
- Auto-merge for patch versions (after CI passes)
- Manual review for major/minor versions

**Manual Check:**
```bash
# Check for outdated dependencies
pip list --outdated

# Check for known vulnerabilities
safety check --json

# Update all dependencies (test thoroughly!)
pip install -e . --upgrade
```

## Compliance & Standards

### Referenced Standards

1. **OWASP Top 10** (2021): Addressed injection, broken auth, sensitive data exposure
2. **CWE Top 25**: Mitigated command injection, path traversal, insecure deserialization
3. **NIST Cybersecurity Framework**: Identify, Protect, Detect, Respond, Recover
4. **Microsoft Security Development Lifecycle (SDL)**: Threat modeling, code review, testing

### Privacy Compliance

- **GDPR**: Not applicable (no personal data of others, only user's own data)
- **CCPA**: Not applicable (local-only, no data sharing)
- **Privacy by Design**: Local-first architecture, no telemetry, no third-party data sharing

## Security Contact

**Found a Security Issue?**

**DO NOT** open a public GitHub issue.

**Instead:**
1. Email: [security contact in SECURITY.md]
2. Include: Description, steps to reproduce, impact assessment
3. Allow: 90 days for responsible disclosure

**Bug Bounty:** Not currently available (open-source project)

## Frequently Asked Questions

### Q: Is it safe to run JobSentinel on a work computer?

**A:** Generally yes, but check your employer's policies:
- ✅ No admin rights required
- ✅ Installs in user directory only
- ✅ No system modifications
- ❌ May trigger endpoint security alerts (scrapers look like automation)
- ❌ Check policy on personal job search tools

### Q: Can JobSentinel access my other data?

**A:** No, by design:
- Only accesses its own config (`config/`, `data/`, `.env`)
- Does not read browser history, cookies, or passwords
- Does not access Windows credential store
- Sandboxed in its own directory

### Q: What network connections does JobSentinel make?

**A:**
- **Public job boards**: Greenhouse, Lever, Reed, etc. (read-only scraping)
- **Slack/Email**: If configured (outbound only, no inbound)
- **Package managers**: pip, npm (during installation only)
- **Local API**: `127.0.0.1:8000` (localhost only, no external access)

### Q: How do I verify the download integrity?

**A:**
```powershell
# PowerShell: Verify bootstrap.ps1 hash
Get-FileHash .\bootstrap.ps1 -Algorithm SHA256

# Compare with GitHub:
# https://github.com/cboyd0319/JobSentinel/blob/main/bootstrap.ps1
```

### Q: Should I run JobSentinel in a VM or container?

**A:** Optional but recommended for extra security:
- ✅ **VM** (VirtualBox, Hyper-V): Full isolation, easy snapshots
- ✅ **Docker** (Windows containers): Lightweight, reproducible
- ⚠️ **WSL2**: Works but may have networking complexity

## Hardening Guide (Advanced)

### Network Isolation

**Firewall Rule** (block external access to port 8000):
```powershell
# PowerShell (Run as Administrator)
New-NetFirewallRule -DisplayName "Block JobSentinel External" `
    -Direction Inbound `
    -LocalPort 8000 `
    -Protocol TCP `
    -Action Block `
    -RemoteAddress !127.0.0.1
```

### File System Permissions

**Restrict config directory** (Windows 11):
```powershell
# Remove inheritance, set owner only
$acl = Get-Acl "config"
$acl.SetAccessRuleProtection($true, $false)
$acl | Set-Acl "config"
```

### Audit Logging

**Enable detailed logging** (`.env`):
```bash
LOG_LEVEL=DEBUG
AUDIT_LOG=true
```

**Monitor logs**:
```powershell
# Real-time log monitoring
Get-Content -Path "logs\jobsentinel.log" -Wait -Tail 50
```

## Conclusion

JobSentinel's Windows deployment follows industry best practices for local-first, privacy-focused applications. By binding to localhost only, validating all inputs, using secure download practices, and maintaining zero telemetry, it provides a secure foundation for private job search automation.

**Remember:**
- 🔒 **Security is a process, not a product**
- 🔄 **Update regularly** (dependencies, OS, application)
- 🧠 **Stay informed** (read changelogs, security advisories)
- 🛡️ **Defense in depth** (multiple layers of security)

**Questions?** See `docs/WINDOWS_TROUBLESHOOTING.md` or open a GitHub discussion.

---
**Document Version:** 1.0.0  
**Last Security Audit:** 2025-10-14  
**Next Review:** 2026-01-14 (Quarterly)
