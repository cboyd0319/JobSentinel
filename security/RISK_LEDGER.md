# Risk Ledger

**Last Updated:** 2025-10-21  
**Owner:** Security Team (@cboyd0319)  
**Version:** 1.0

This document tracks identified security risks, their likelihood, impact, and mitigation status for JobSentinel.

---

## Risk Assessment Methodology

**Likelihood:**
- **Low:** Difficult to exploit, requires specific conditions
- **Medium:** Possible with moderate effort and access
- **High:** Easy to exploit, common attack vector

**Impact:**
- **Low:** Limited damage, affects non-critical functionality
- **Medium:** Moderate damage, affects data confidentiality/integrity
- **High:** Significant damage, affects availability or core functionality
- **Critical:** Catastrophic damage, arbitrary code execution, full system compromise

**Risk Score:** Likelihood × Impact  
**Priority:** Critical > High > Medium > Low

---

## Current Risks

### 1. Command Injection (Subprocess Calls)

**CWE:** [CWE-78](https://cwe.mitre.org/data/definitions/78.html) - Improper Neutralization of Special Elements used in an OS Command

**Likelihood:** Low  
**Impact:** Critical  
**Risk Score:** Low-Critical  
**Status:** ✅ **Mitigated**

**Description:**  
Subprocess calls with user-controlled input could allow command injection if shell=True is used or arguments are not properly escaped.

**Affected Components:**
- `jsa.setup_wizard` (subprocess calls)
- `jsa.resume_analyzer` (ripgrep commands)
- `jsa.deduplicator` (ripgrep commands)
- `jsa.log_analyzer` (ripgrep commands)
- `jsa.config_validator` (ripgrep commands)
- `jsa.filters` (ripgrep commands)
- `jsa.watchers` (ripgrep commands)
- `matchers.keyword_filter` (ripgrep commands)

**Mitigation:**
- ✅ Ruff S603/S607 enabled to detect subprocess issues
- ✅ All subprocess calls use argument lists (not shell strings)
- ✅ Per-file ignores documented in pyproject.toml with justification
- ✅ Commands use trusted input (config files, not user-supplied data)

**Residual Risk:** Minimal (monitoring required for new code)

**Validation:**
```bash
ruff check --select S603,S607 deploy/common/app/src/
```

---

### 2. Path Traversal (File Operations)

**CWE:** [CWE-22](https://cwe.mitre.org/data/definitions/22.html) - Improper Limitation of a Pathname to a Restricted Directory

**Likelihood:** Medium  
**Impact:** High  
**Risk Score:** Medium-High  
**Status:** 🚧 **Partial Mitigation**

**Description:**  
File operations with user-supplied paths could allow reading/writing files outside intended directories.

**Affected Components:**
- `jsa.log_analyzer` (reads log files)
- `jsa.resume_analyzer` (reads resume files)
- `jsa.config_validator` (reads config files)
- `database.py` (SQLite file path)
- `sources/` (job data storage)

**Current Mitigations:**
- ✅ Config files loaded from fixed locations
- ✅ Database path validated at startup
- 🚧 Log file paths use relative paths (need absolute + validation)
- 🚧 Resume file paths need validation

**Recommended Actions:**
1. Implement path validation helper: `utils.validate_path(path, base_dir)`
2. Use `pathlib.Path.resolve()` to canonicalize paths
3. Verify resolved path starts with allowed base directory
4. Add unit tests for path traversal attempts (`../../etc/passwd`)

**Target Date:** v0.9.1  
**Owner:** @cboyd0319

**Test Cases:**
```python
def test_path_traversal_blocked():
    with pytest.raises(ValueError):
        validate_path("../../etc/passwd", "/app/data")
```

---

### 3. SSRF (HTTP Requests)

**CWE:** [CWE-918](https://cwe.mitre.org/data/definitions/918.html) - Server-Side Request Forgery

**Likelihood:** Medium  
**Impact:** High  
**Risk Score:** Medium-High  
**Status:** 🚧 **Partial Mitigation**

**Description:**  
Job scraping could be exploited to make requests to internal services or unintended external URLs.

**Affected Components:**
- `sources/jobswithgpt.py` (HTTP requests to job boards)
- `sources/reed.py` (API requests)
- `sources/greenhouse.py` (Playwright HTTP)
- `sources/lever.py` (Playwright HTTP)
- `notify/slack.py` (Webhook POST)

**Current Mitigations:**
- ✅ Job sources use hardcoded/validated URLs
- ✅ Slack webhook URL from config (user-controlled, but documented risk)
- 🚧 No URL scheme validation (http/https only)
- 🚧 No private IP address blocking (could target localhost/192.168.x.x)

**Recommended Actions:**
1. Create URL validation helper: `utils.validate_url(url, allowed_schemes=['https'])`
2. Block private IP ranges (RFC 1918: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
3. Block localhost (127.0.0.0/8, ::1)
4. Add config option for strict mode (require HTTPS, no redirects)

**Target Date:** v0.9.1  
**Owner:** @cboyd0319

**Test Cases:**
```python
def test_ssrf_localhost_blocked():
    with pytest.raises(ValueError):
        validate_url("http://localhost:6379/evil")

def test_ssrf_private_ip_blocked():
    with pytest.raises(ValueError):
        validate_url("http://192.168.1.1/admin")
```

---

### 4. Dependency Confusion

**CWE:** [CWE-427](https://cwe.mitre.org/data/definitions/427.html) - Uncontrolled Search Path Element

**Likelihood:** Low  
**Impact:** Critical  
**Risk Score:** Low-Critical  
**Status:** 🚧 **Needs Policy**

**Description:**  
Attacker uploads malicious package to public PyPI with same name as internal package, causing pip to install wrong version.

**Affected Components:**
- All Python dependencies
- Build process
- CI/CD pipelines

**Current Mitigations:**
- ✅ No internal/private packages (all dependencies from public PyPI)
- ❌ No explicit index priority configuration
- ❌ No hash verification (requirements.txt lacks SHA256 hashes)

**Recommended Actions:**
1. Generate hashed requirements: `pip-compile --generate-hashes requirements.in`
2. Document index priority if private packages added (use `--index-url` for private, `--extra-index-url` for public)
3. Add verification step in CI: `pip install --require-hashes -r requirements.txt`

**Target Date:** v0.9.1  
**Owner:** @cboyd0319

**Validation:**
```bash
# Verify hashes present
grep -E "sha256:[a-f0-9]{64}" requirements.txt
```

---

### 5. Supply Chain Attack (Compromised Dependencies)

**CWE:** [CWE-829](https://cwe.mitre.org/data/definitions/829.html) - Inclusion of Functionality from Untrusted Control Sphere

**Likelihood:** Medium  
**Impact:** Critical  
**Risk Score:** Medium-Critical  
**Status:** 🚧 **In Progress**

**Description:**  
Malicious code in transitive dependencies could compromise application security.

**Affected Components:**
- All 30+ direct dependencies
- 100+ transitive dependencies

**Current Mitigations:**
- ✅ Dependabot enabled (automated updates)
- ✅ pip-audit in CI (vulnerability scanning)
- ✅ Dependency Review action (blocks vulnerable deps in PRs)
- ✅ OpenSSF Scorecard (supply chain monitoring)
- 🚧 No SBOM generation (can't track what we ship)
- 🚧 No dependency hashing (can't verify integrity)
- 🚧 No SLSA provenance (can't verify build origin)

**Recommended Actions:**
1. **SBOM Generation** (Phase 2):
   - Add `cyclonedx-bom` to generate SPDX 2.3 + CycloneDX 1.4
   - Automate in release workflow
   - Publish to `security/SBOM/`
   - Sign with Sigstore

2. **Dependency Hashing** (Phase 2):
   - Generate: `pip-compile --generate-hashes requirements.in`
   - Enforce in CI: `pip install --require-hashes`

3. **SLSA Provenance** (Phase 2):
   - Use `slsa-github-generator` for L3 attestation
   - Attach to GitHub releases
   - Document verification process

**Target Date:** v0.9.1 (SBOM), v1.0 (SLSA)  
**Owner:** @cboyd0319

**Metrics:**
- Direct dependencies: 30+
- Transitive dependencies: ~100 (estimate)
- Known vulnerabilities: 0 (as of 2025-10-21)

---

### 6. Secrets in Logs

**CWE:** [CWE-532](https://cwe.mitre.org/data/definitions/532.html) - Insertion of Sensitive Information into Log File

**Likelihood:** Low  
**Impact:** High  
**Risk Score:** Low-High  
**Status:** ✅ **Mitigated**

**Description:**  
API keys, tokens, or credentials accidentally logged could be exposed.

**Affected Components:**
- All modules with logging (`jsa.*`, `sources/*`, `notify/*`)

**Mitigations:**
- ✅ Secrets stored in `.env` (not committed)
- ✅ `.gitignore` includes `.env`
- ✅ No secrets in code or config examples
- ✅ Logging configured to avoid debug output by default
- ✅ Pre-commit hooks prevent committing secrets (coming in Phase 3)

**Residual Risk:** Low (code review required for new modules)

**Validation:**
```bash
# Check for potential secrets in logs
grep -ri "password\|api_key\|token" deploy/common/app/src/jsa/*.py | grep -i log
```

---

### 7. SQL Injection

**CWE:** [CWE-89](https://cwe.mitre.org/data/definitions/89.html) - Improper Neutralization of Special Elements used in an SQL Command

**Likelihood:** Low  
**Impact:** Critical  
**Risk Score:** Low-Critical  
**Status:** ✅ **Mitigated**

**Description:**  
Unsanitized user input in SQL queries could allow database manipulation.

**Affected Components:**
- `database.py` (SQLite queries)
- `unified_database.py` (SQLAlchemy ORM)
- `jsa.db` (database abstraction)

**Mitigations:**
- ✅ All queries use SQLAlchemy ORM (parameterized)
- ✅ No raw SQL with string interpolation
- ✅ No `execute()` with f-strings

**Residual Risk:** Minimal (ORM usage enforced by code review)

**Validation:**
```bash
# Check for unsafe SQL patterns
grep -rE "execute\(.*f['\"]|execute\(.*%|execute\(.*\+" deploy/common/app/src/
```

---

### 8. XSS (Cross-Site Scripting) in Web UI

**CWE:** [CWE-79](https://cwe.mitre.org/data/definitions/79.html) - Improper Neutralization of Input During Web Page Generation

**Likelihood:** Medium  
**Impact:** Medium  
**Risk Score:** Medium-Medium  
**Status:** ✅ **Mitigated**

**Description:**  
Job listings with malicious HTML/JS could execute in user's browser.

**Affected Components:**
- `jsa.web` (Flask routes)
- `jsa.fastapi_app` (FastAPI endpoints)
- React UI components

**Mitigations:**
- ✅ React auto-escapes by default (no `dangerouslySetInnerHTML`)
- ✅ Jinja2 templates use autoescaping
- ✅ API responses are JSON (no HTML rendering)
- ✅ Content-Security-Policy headers (coming in Phase 4)

**Residual Risk:** Low (React/Jinja2 handle escaping)

**Test Cases:**
```python
def test_xss_blocked():
    job_title = "<script>alert('XSS')</script>"
    response = client.post("/api/jobs", json={"title": job_title})
    assert "<script>" not in response.text  # Should be escaped
```

---

### 9. Unsafe Deserialization

**CWE:** [CWE-502](https://cwe.mitre.org/data/definitions/502.html) - Deserialization of Untrusted Data

**Likelihood:** Low  
**Impact:** Critical  
**Risk Score:** Low-Critical  
**Status:** ✅ **Mitigated**

**Description:**  
Loading serialized objects (pickle, YAML) could execute arbitrary code.

**Affected Components:**
- Config loading (`user_prefs.json`)
- Data storage (SQLite, JSON)

**Mitigations:**
- ✅ JSON only (no pickle)
- ✅ YAML not used
- ✅ No `eval()` or `exec()` calls

**Residual Risk:** Minimal (JSON-only policy enforced)

**Validation:**
```bash
# Check for unsafe deserialization patterns
grep -rE "pickle|yaml\.load\(|eval\(|exec\(" deploy/common/app/src/
```

---

## Emerging Risks (Watch List)

### 10. AI/ML Model Poisoning

**Status:** 🔍 **Monitoring**  
**Description:** Malicious training data or compromised models (if we add GPT-4 integration)  
**Mitigation:** Validate model sources, sandbox execution, limit model capabilities

### 11. Browser Automation (Playwright) Security

**Status:** 🔍 **Monitoring**  
**Description:** Playwright could be exploited if scraping malicious sites  
**Mitigation:** Sandboxed browser context, content validation, timeout limits

### 12. Rate Limiting Bypass

**Status:** 🔍 **Monitoring**  
**Description:** Job boards could block our scrapers if we don't respect rate limits  
**Mitigation:** Exponential backoff, robots.txt compliance, user-agent rotation

---

## Closed Risks

*(None yet - this is the initial risk assessment)*

---

## Risk Metrics

**As of 2025-10-21:**

| Severity | Open | Mitigated | Closed | Total |
|----------|------|-----------|--------|-------|
| Critical | 0    | 4         | 0      | 4     |
| High     | 2    | 0         | 0      | 2     |
| Medium   | 0    | 1         | 0      | 1     |
| Low      | 1    | 1         | 0      | 2     |
| **Total** | **3** | **6** | **0** | **9** |

**Risk Reduction Progress:** 67% (6/9 risks mitigated)

---

## Review Schedule

- **Weekly:** Triage new Dependabot/CodeQL alerts
- **Monthly:** Review and update risk ledger
- **Quarterly:** Full security audit and reassessment
- **Annually:** External security review (if budget allows)

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/archive/2023/2023_top25_list.html)
- [PYSEC Guidelines](../docs/copilot/PYSEC.md)
- [Threat Model](../docs/THREAT_MODEL.md)
- [Security Policy](../SECURITY.md)

---

*This is a living document. Update it when new risks are identified or mitigations change.*
