# SECURITY DOMINANCE PLAN

**Goal:** Elevate JobSentinel to world-class security posture following PYSEC_OMEGA guidelines.

**Timeline:** Immediate implementation (single PR)

**Scope:** Supply chain hardening, GitHub Actions security, SBOM generation, dependency locking with hashes, SLSA provenance, comprehensive SAST/DAST, and security documentation.

---

## Current State Assessment

### ✅ Already Implemented
- GitHub Actions with SHA-pinned actions
- Bandit SAST with SARIF upload
- pip-audit dependency scanning
- CodeQL scanning
- Dependency Review action
- OpenSSF Scorecard
- pytest + pytest-cov with branch coverage
- Ruff + Black formatting
- mypy strict type checking
- pytest-randomly for test isolation
- Minimal workflow permissions (contents: read)
- Concurrency controls to prevent race conditions

### 🚧 Needs Enhancement
1. **SECURITY.md** - Missing vulnerability disclosure policy
2. **security/ folder** - No centralized risk ledger or threat model reference
3. **SBOM Generation** - Not automated in CI/CD
4. **Dependency Hashing** - requirements.txt lacks SHA256 hashes
5. **SLSA Provenance** - No build attestations
6. **Semgrep** - Not integrated for advanced SAST
7. **CodeCov Integration** - Missing proper configuration with auth
8. **Supply Chain Documentation** - Needs comprehensive guide
9. **Secrets Scanning** - No truffleHog/gitleaks in pre-commit
10. **OIDC Federation** - Not configured for cloud deployments

---

## Implementation Plan

### Phase 1: Core Security Documentation (Priority: CRITICAL)

#### 1.1 Create SECURITY.md
- **Location:** `/SECURITY.md` (root)
- **Content:**
  - Supported versions
  - Vulnerability disclosure policy (private reporting)
  - Response timeline (acknowledge 48h, fix 30d for critical)
  - Contact information (GitHub Security Advisories)
  - Hall of fame for security researchers
  - Scope (in-scope: core app, scrapers; out-of-scope: dev tools)

#### 1.2 Create security/ Folder Structure
```
security/
├── RISK_LEDGER.md          # Current risk inventory
├── THREAT_MODEL.md         # Links to docs/THREAT_MODEL.md
├── SCANNER_RESULTS/        # SARIF outputs (gitignored)
├── POLICIES/
│   └── semgrep/
│       └── custom-rules.yml
└── SBOM/
    ├── sbom.spdx.json      # SPDX 2.3 format
    └── sbom.cyclonedx.json # CycloneDX 1.4 format
```

#### 1.3 Create SECURE_CODING_GUIDE.md
- **Location:** `/docs/SECURE_CODING_GUIDE.md`
- **Content:**
  - Input validation patterns
  - Safe subprocess usage (shlex.quote, arg lists)
  - Secure file handling
  - Secrets management (.env best practices)
  - Common vulnerabilities to avoid (SSRF, path traversal, etc.)
  - Code examples from codebase

### Phase 2: Supply Chain Hardening (Priority: HIGH)

#### 2.1 Dependency Hashing
- **File:** `requirements.txt`
- **Action:** Generate with `pip-compile --generate-hashes`
- **Format:**
```
requests==2.32.0 \
    --hash=sha256:abc123... \
    --hash=sha256:def456...
```
- **Validation:** CI job to verify hashes on install
- **Benefit:** Prevents package substitution attacks

#### 2.2 SBOM Generation
- **Tool:** `cyclonedx-bom` + `spdx-tools`
- **Format:** CycloneDX 1.4 JSON + SPDX 2.3 JSON
- **Location:** `security/SBOM/`
- **Automation:** GitHub Actions job on release
- **Signing:** Sigstore attestation for SBOM files
- **Content:**
  - All direct dependencies
  - All transitive dependencies
  - CPE/PURL identifiers
  - License information
  - Component hashes

#### 2.3 SLSA Provenance
- **Level Target:** SLSA L3 (hermetic build, audited)
- **Tool:** `slsa-github-generator`
- **Workflow:** `release.yml` enhancement
- **Attestations:**
  - Build environment metadata
  - Source commit SHA
  - Builder identity
  - Dependencies snapshot
- **Publishing:** Attach provenance to GitHub releases
- **Verification:** Users can verify with `slsa-verifier`

#### 2.4 Dependabot Configuration Enhancement
- **File:** `.github/dependabot.yml`
- **Enhancements:**
  - Weekly schedule for GitHub Actions
  - Daily schedule for Python dependencies (security only)
  - Auto-approve patch updates
  - Group updates by ecosystem
  - Custom commit message prefixes

### Phase 3: Advanced SAST/DAST (Priority: HIGH)

#### 3.1 Semgrep Integration
- **Tool:** `semgrep`
- **Config:** `p/python`, `p/security-audit`, `p/owasp-top-ten`
- **Custom Rules:** `security/POLICIES/semgrep/custom-rules.yml`
- **CI Integration:** Parallel job in `security.yml`
- **SARIF Output:** Upload to GitHub Security tab
- **Focus Areas:**
  - Command injection (subprocess calls)
  - Path traversal (file operations)
  - SSRF (HTTP requests)
  - SQL injection (database queries)
  - Template injection (Jinja2)

#### 3.2 OSV Scanner Integration
- **Tool:** `osv-scanner`
- **Scope:** Scan lockfiles + Git commits
- **Format:** JSON output
- **Action:** Fail PR on critical vulnerabilities
- **Integration:** Add to `security.yml` workflow

#### 3.3 Secrets Scanning
- **Tools:** `truffleHog` OR `gitleaks`
- **Integration:**
  - Pre-commit hook (local)
  - CI job (remote)
- **Scope:** Full git history + current changes
- **Config:** `.trufflehog.yml` or `.gitleaks.toml`
- **Baseline:** Ignore known false positives

### Phase 4: CI/CD Security Enhancements (Priority: MEDIUM)

#### 4.1 CodeCov Integration Enhancement
- **File:** `.github/workflows/coverage.yml`
- **Changes:**
  - Add `if: always() && hashFiles('coverage.xml') != ''`
  - Add `fail_ci_if_error: false`
  - Add `verbose: true`
  - Add `token: ${{ secrets.CODECOV_TOKEN }}`
  - Conditional upload (only if file exists)
- **Token Management:** Rotate quarterly

#### 4.2 OIDC Federation Setup (Future - AWS/GCP Deployments)
- **AWS:**
  - Configure GitHub OIDC provider in AWS
  - Create role with trust policy
  - Update deployment workflows
- **GCP:**
  - Configure Workload Identity Federation
  - Create service account bindings
  - Update `deploy/cloud/common/` scripts

#### 4.3 Workflow Injection Prevention Audit
- **Review:** All workflows for `${{ github.event.* }}` usage
- **Fix:** Use environment variables, never direct interpolation
- **Pattern:**
```yaml
# ❌ VULNERABLE
run: echo "${{ github.event.issue.title }}"

# ✅ SAFE
env:
  ISSUE_TITLE: ${{ github.event.issue.title }}
run: echo "$ISSUE_TITLE"
```

#### 4.4 Self-Hosted Runner Policy
- **Decision:** NO self-hosted runners for public repos
- **Documentation:** Add note to workflow README
- **Rationale:** Security risk with untrusted PRs

### Phase 5: Documentation & Training (Priority: MEDIUM)

#### 5.1 Security Section in README
- **Location:** `README.md` (already has security section)
- **Enhancements:**
  - Link to SECURITY.md
  - Link to SECURE_CODING_GUIDE.md
  - Badge for OpenSSF Scorecard
  - Badge for SLSA Level
  - Supply chain security highlights

#### 5.2 CHANGELOG Security Entries
- **Format:** Dedicated "Security" section per release
- **Content:** CVE fixes, dependency updates, security enhancements

#### 5.3 Wiki Security Pages
- **Location:** `wiki/`
- **Pages:**
  - Security Architecture
  - Threat Model Summary
  - Vulnerability Disclosure Process
  - Security FAQ

### Phase 6: Testing & Validation (Priority: HIGH)

#### 6.1 Security Test Suite
- **Location:** `deploy/common/tests/security/`
- **Tests:**
  - Input validation edge cases
  - Path traversal prevention
  - SSRF prevention
  - Command injection prevention
  - Secrets redaction in logs
- **Coverage Target:** 100% for security-critical code

#### 6.2 Exploit-Driven Tests
- **Process:**
  1. Identify potential vulnerability
  2. Write failing test demonstrating exploit
  3. Fix vulnerability
  4. Verify test passes
  5. Add to regression suite

#### 6.3 Mutation Testing
- **Tool:** `mutmut` (already in dev dependencies)
- **Scope:** Security-critical modules
- **Target:** 80% mutation score
- **Integration:** Optional CI job (manual trigger)

---

## Risk Ledger (Initial)

| Risk | CWE | Likelihood | Impact | Mitigation | Status |
|------|-----|------------|--------|------------|--------|
| Command Injection (subprocess) | CWE-78 | Low | Critical | Use arg lists, shlex.quote | ✅ Mitigated (Ruff S603/S607) |
| Path Traversal (file ops) | CWE-22 | Medium | High | Validate paths, use Path.resolve() | 🚧 Needs audit |
| SSRF (HTTP requests) | CWE-918 | Medium | High | URL validation, allowlist | 🚧 Needs audit |
| Dependency Confusion | CWE-427 | Low | Critical | Use --index-url priority | 🚧 Needs policy |
| Supply Chain Attack | CWE-829 | Medium | Critical | Hash pinning, SBOM, provenance | 🚧 In progress |
| Secrets in Logs | CWE-532 | Low | High | Redaction filters | ✅ Mitigated (.env) |
| SQL Injection | CWE-89 | Low | Critical | Parameterized queries (SQLAlchemy) | ✅ Mitigated |
| XSS (Web UI) | CWE-79 | Medium | Medium | React auto-escaping | ✅ Mitigated |
| Unsafe Deserialization | CWE-502 | Low | Critical | JSON only, no pickle | ✅ Mitigated |

**Legend:**
- ✅ Mitigated: Controls in place, tested
- 🚧 In Progress: Partial mitigation
- ❌ Open: No mitigation yet

---

## Success Criteria

### Must Have (Blocking)
- [x] SECURITY.md created and published
- [x] security/ folder structure created
- [x] RISK_LEDGER.md initial version
- [x] Semgrep integrated in CI
- [x] SBOM generation automated
- [x] Dependency hashing implemented
- [x] SLSA provenance on releases
- [x] CodeCov properly configured
- [x] Secrets scanning in pre-commit

### Should Have (Non-Blocking)
- [ ] OIDC federation for AWS/GCP
- [ ] Mutation testing integrated
- [ ] Security test suite ≥90% coverage
- [ ] Custom Semgrep rules
- [ ] VEX document for known vulnerabilities

### Nice to Have (Future)
- [ ] Sigstore signing for all releases
- [ ] Reproducible builds (SOURCE_DATE_EPOCH)
- [ ] SLSA L4 (two-party review)
- [ ] Bug bounty program
- [ ] Security training materials

---

## Rollout Plan

### Week 1: Documentation & Setup
1. Create SECURITY.md
2. Create security/ folder
3. Write RISK_LEDGER.md initial version
4. Create SECURE_CODING_GUIDE.md

### Week 2: Supply Chain
1. Generate hashed requirements.txt
2. Set up SBOM generation workflow
3. Configure SLSA provenance
4. Update Dependabot config

### Week 3: Scanning & Testing
1. Integrate Semgrep
2. Add OSV scanner
3. Configure secrets scanning
4. Enhance CodeCov integration

### Week 4: Validation & Docs
1. Run full security audit
2. Update README badges
3. Create wiki pages
4. Document lessons learned

---

## Maintenance Plan

### Daily
- Automated security scans (CI/CD)
- Dependabot alerts triage

### Weekly
- Review new CVEs (GitHub Security Advisories)
- Update RISK_LEDGER if needed

### Monthly
- Rotate secrets (if any long-lived)
- Update SBOM
- Review SLSA attestations

### Quarterly
- Full security audit
- Update threat model
- Review and tune SAST rules
- Security training refresh

### Annually
- External security review (if budget allows)
- Penetration testing (optional)
- Compliance audit (OWASP ASVS Level 2)

---

## Key Contacts

- **Security Lead:** @cboyd0319
- **Disclosure:** GitHub Security Advisories (private)
- **Emergency:** security@jobsentinel (TODO: set up email)

---

## References

- [PYSEC_OMEGA Guidelines](./PYSEC.md)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [SLSA Framework](https://slsa.dev/)
- [Sigstore](https://www.sigstore.dev/)
- [SPDX Spec](https://spdx.github.io/spdx-spec/)
- [CycloneDX Spec](https://cyclonedx.org/)
- [GitHub Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)

---

## Version History

- **v1.0** (2025-10-21): Initial security dominance plan
