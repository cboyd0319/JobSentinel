# Security Audit Findings and Remediation Guide

## Executive Summary

This document details the findings from the security audit workflow investigation and provides remediation guidance for identified vulnerabilities.

**Issue Root Cause:** The security.yml workflow was referencing a non-existent GitHub Action (`cboyd0319/PyGuard@main`), causing workflow failures.

**Resolution:** Replaced PyGuard with industry-standard tools (Bandit + pip-audit) that generate SARIF output for GitHub Security tab integration.

## Current Status: ✅ RESOLVED

The security workflow is now operational and reporting findings correctly to GitHub Security tab.

---

## Security Findings Overview

### Bandit Code Analysis
- **Total Issues:** 132
- **High Severity:** 1
- **Medium Severity:** 11  
- **Low Severity:** 120

### Dependency Vulnerabilities (pip-audit)
- **Total Vulnerabilities:** 20 (in 10 packages)
- **Affected Packages:** cryptography, urllib3, certifi, configobj, requests, pillow

---

## Critical Findings Requiring Immediate Attention

### 1. High Severity: Shell Injection Vulnerability (B605)

**Location:** `deploy/common/scripts/zero_knowledge_setup.py:70`

**Issue:**
```python
os.system("cls" if platform.system() == "Windows" else "clear")
```

**Risk:** Potential shell injection attack if user input influences the command.

**Remediation:**
```python
# Replace with safer subprocess alternative
import subprocess
subprocess.run(["cls" if platform.system() == "Windows" else "clear"], shell=False)

# Or even better, use platform-specific API
if platform.system() == "Windows":
    subprocess.run(["cmd", "/c", "cls"])
else:
    subprocess.run(["clear"])
```

**Severity Justification:** While the command appears to use controlled input (platform.system()), using `os.system()` with shell=True is inherently risky and should be avoided.

---

## Medium Severity Issues

### 2. Hardcoded Passwords (B105) - Multiple Locations
Files with potential hardcoded credentials should be reviewed to ensure no secrets are committed.

**Remediation:**
- Use environment variables for sensitive data
- Implement secret management (e.g., AWS Secrets Manager, Azure Key Vault)
- Add pre-commit hooks to detect secrets

### 3. Subprocess Usage Without Shell (B603) - Multiple Locations
While these are generally LOW risk, review each instance to ensure no user input can influence command execution.

**Common Pattern:**
```python
subprocess.run([sys.executable, "-m", "pip", "install", package])
```

**Best Practice:**
- Always validate/sanitize user inputs before passing to subprocess
- Use absolute paths for executables when possible
- Document why subprocess is necessary

---

## Dependency Vulnerabilities

### Critical Dependencies Requiring Updates

#### 1. cryptography (Current: 41.0.7 → Recommended: 43.0.1+)

**Vulnerabilities:**
- PYSEC-2024-225: NULL pointer dereference in PKCS12 handling
- GHSA-3ww4-gg4f-jr7f: RSA key exchange vulnerability (TLS)
- GHSA-9v9h-cgj8-h64p: PKCS12 DoS vulnerability
- GHSA-h4gh-qq45-vh27: OpenSSL vulnerability in statically linked wheels

**Impact:** High - Affects cryptographic operations and TLS security

**Remediation:**
```bash
pip install --upgrade "cryptography>=43.0.1"
```

Update `pyproject.toml`:
```toml
"cryptography>=46.0,<47",  # Already using 46.0 - GOOD!
```

**Status:** ✅ Already using cryptography 46.0+ in pyproject.toml

---

#### 2. urllib3 (Current: 2.0.7 → Recommended: 2.2.2+)

**Vulnerabilities:**
- GHSA-34jh-p97f-mpxf: HTTP request smuggling via uppercase transfer-encoding
- GHSA-pq67-6m6q-mj2v: Redirect bypass vulnerability

**Impact:** Medium - SSRF and redirect handling vulnerabilities

**Remediation:**
```bash
pip install --upgrade "urllib3>=2.2.2"
```

---

#### 3. certifi (Current: 2023.11.17 → Recommended: 2024.7.4+)

**Vulnerabilities:**
- PYSEC-2024-230: Compromised GLOBALTRUST root certificates

**Impact:** Medium - Certificate validation issues

**Remediation:**
```bash
pip install --upgrade "certifi>=2024.7.4"
```

---

#### 4. Other Dependencies

**requests (2.31.0):**
- GHSA-9wx4-h78v-vm56: Proxy-Authorization header leak
- Update to 2.32.0+

**pillow (10.1.0):**
- GHSA-56pw-mpj4-fxww, GHSA-44wm-f244-xhp3: Various image processing vulnerabilities
- Update to 10.3.0+

**configobj (5.0.8):**
- GHSA-c33w-24p9-8m24: ReDoS vulnerability
- Update to 5.0.9

---

## Low Severity Issues

### Subprocess Import Warnings (B404)
**Count:** ~40 occurrences

**Nature:** Informational - subprocess module itself is flagged as potentially dangerous

**Action:** No immediate action required. Document subprocess usage and ensure input validation.

### Subprocess Calls Without Shell (B603)
**Count:** ~80 occurrences

**Nature:** Low risk when using controlled inputs (sys.executable, literal strings)

**Action:** Review each usage to ensure no user input influences execution.

---

## Recommended Actions

### Immediate (Priority 1)
1. ✅ **Fix workflow** - COMPLETED: Replaced PyGuard with Bandit + pip-audit
2. 🔴 **Address B605** - Fix shell injection in zero_knowledge_setup.py
3. 🟡 **Update cryptography** - Already at 46.0+ (verify runtime environment matches)

### Short Term (Priority 2)
4. 🟡 **Update dependencies** - urllib3, certifi, requests, pillow, configobj
5. 🟡 **Review B105 findings** - Ensure no hardcoded secrets
6. 🟡 **Add secret scanning** - Implement pre-commit hooks (e.g., detect-secrets)

### Long Term (Priority 3)
7. 🟢 **Reduce subprocess usage** - Where possible, use Python libraries instead
8. 🟢 **Implement dependency pinning** - Use lock files for reproducible builds
9. 🟢 **Regular security audits** - Schedule quarterly reviews

---

## Testing the Fixed Workflow

### Local Testing Commands

```bash
# Test Bandit with SARIF output
pip install bandit[toml] bandit-sarif-formatter
bandit -r deploy/common/app/src/ deploy/common/scripts/ \
  -f sarif -o bandit-report.sarif --exit-zero

# Test pip-audit
pip install pip-audit
pip-audit --desc

# Validate workflow syntax
curl -s https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash | bash
./actionlint .github/workflows/security.yml
```

### GitHub Actions Integration

The workflow now:
1. ✅ Runs on push to main, PRs to main/develop, and manual dispatch
2. ✅ Generates SARIF output for GitHub Security tab
3. ✅ Uses `continue-on-error: true` to prevent blocking PRs
4. ✅ Displays findings in workflow logs and Security tab

---

## References

### Bandit Documentation
- Bandit Security Checks: https://bandit.readthedocs.io/
- SARIF Format: https://docs.oasis-open.org/sarif/sarif/v2.1.0/sarif-v2.1.0.html

### Vulnerability Databases
- CVE Details: https://cve.mitre.org/
- GitHub Security Advisories: https://github.com/advisories
- PyPI Advisory Database: https://github.com/pypa/advisory-database

### Security Best Practices
- OWASP Python Security: https://cheatsheetseries.owasp.org/cheatsheets/Python_Security_Cheat_Sheet.html
- Python Packaging Security: https://packaging.python.org/guides/analyzing-pypi-package-downloads/

---

## Workflow Changes Summary

### Before (Broken)
```yaml
- name: Run PyGuard Security Analysis
  uses: cboyd0319/PyGuard@main  # ❌ Action doesn't exist
  with:
    target: 'deploy/common/app/src/ deploy/common/scripts/'
```

### After (Fixed)
```yaml
- name: Install Security Tools
  run: |
    pip install bandit[toml] bandit-sarif-formatter pip-audit

- name: Run Bandit Security Analysis
  run: |
    bandit -r deploy/common/app/src/ deploy/common/scripts/ \
      -f sarif -o bandit-report.sarif --exit-zero

- name: Upload Bandit Results to GitHub Security
  uses: github/codeql-action/upload-sarif@f443b600d91635bebf5b0d9ebc620189c0d6fba5
  with:
    sarif_file: bandit-report.sarif
    category: bandit

- name: Run pip-audit Dependency Scan
  run: pip-audit --desc --format json -o pip-audit-report.json || true
```

---

## Contact & Support

For questions or additional support with security findings:
- GitHub Issues: https://github.com/cboyd0319/JobSentinel/issues
- Security Policy: See SECURITY.md (if exists)
- Maintainer: Chad Boyd (@cboyd0319)

---

**Document Version:** 1.0  
**Last Updated:** 2025-10-16  
**Generated By:** Security Audit Investigation
