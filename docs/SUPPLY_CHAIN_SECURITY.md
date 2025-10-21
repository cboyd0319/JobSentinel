# Supply Chain Security Guide

**For JobSentinel Developers and Security Reviewers**

This document describes the supply chain security measures implemented in JobSentinel to protect against dependency-related attacks and ensure artifact integrity.

---

## Table of Contents

1. [Overview](#overview)
2. [Dependency Management](#dependency-management)
3. [SBOM Generation](#sbom-generation)
4. [SLSA Provenance](#slsa-provenance)
5. [Dependency Scanning](#dependency-scanning)
6. [GitHub Actions Security](#github-actions-security)
7. [Verification Procedures](#verification-procedures)

---

## Overview

JobSentinel implements comprehensive supply chain security following SLSA Level 3 standards:

- ✅ **SBOM Generation** - Software Bill of Materials for every release
- ✅ **SLSA L3 Provenance** - Build attestations with GitHub Actions
- ✅ **SHA-Pinned Actions** - All GitHub Actions use commit SHAs
- ✅ **Dependency Scanning** - OSV Scanner + pip-audit + Dependabot
- ✅ **Automated Updates** - Dependabot with grouped PRs
- ✅ **Hash Verification** - Checksums for all release artifacts

---

## Dependency Management

### Philosophy

JobSentinel uses **pyproject.toml** as the single source of truth for dependencies, following modern Python packaging standards (PEP 621, PEP 660).

### Dependency Declaration

```toml
# pyproject.toml
[project]
dependencies = [
  "aiofiles>=25.1,<26",
  "aiohttp>=3.13,<4",
  # ... exact version ranges
]

[project.optional-dependencies]
dev = ["pytest>=8.4,<9", "ruff>=0.14,<0.15", ...]
ml = ["torch>=2.8,<3", "sentence-transformers>=5.1,<6", ...]
```

### Installing Dependencies

```bash
# Production (minimal)
pip install -e .

# Development (includes test/lint tools)
pip install -e .[dev]

# Full stack (includes ML, resume parsing, MCP)
pip install -e .[dev,ml,resume,mcp]
```

### Dependency Locking

**Current State:** Dependencies are specified with version ranges in pyproject.toml.

**Planned Enhancement (v0.9.1):** Generate locked requirements with hashes for reproducible installs.

```bash
# Generate locked requirements with SHA256 hashes
pip-compile --generate-hashes --output-file=requirements.lock pyproject.toml

# Install with hash verification
pip install --require-hashes -r requirements.lock
```

**Format:**
```
requests==2.32.0 \
    --hash=sha256:abc123... \
    --hash=sha256:def456...
certifi==2024.2.2 \
    --hash=sha256:dc383c... \
    --hash=sha256:0569859...
```

**Benefits:**
- Prevents package substitution attacks
- Ensures reproducible builds
- Detects corrupted downloads

---

## SBOM Generation

### What is an SBOM?

A Software Bill of Materials (SBOM) is a comprehensive inventory of all components (libraries, dependencies) in a software artifact. It enables:

- **Vulnerability tracking** - Know exactly what's in your software
- **License compliance** - Track all third-party licenses
- **Supply chain transparency** - Prove what you ship
- **Incident response** - Quickly identify affected systems

### Automated SBOM Generation

SBOMs are automatically generated for every release:

```yaml
# .github/workflows/release.yml
- name: Generate SBOM
  uses: anchore/sbom-action@d8a2c0130026bf585de5c176ab8f7ce62d75bf04 # v0.20.7
  with:
    artifact-name: jobsentinel-${{ needs.validate.outputs.version }}.spdx.json
    output-file: jobsentinel-${{ needs.validate.outputs.version }}.spdx.json
    format: spdx-json
```

### SBOM Formats

JobSentinel generates SBOMs in **SPDX 2.3 JSON** format:

- **SPDX** (Software Package Data Exchange) - ISO/IEC 5962:2021 standard
- Includes: Package names, versions, licenses, CPE/PURL identifiers
- Compatible with: NIST, DHS, DoD requirements

**Future:** CycloneDX 1.4+ for broader tool compatibility.

### Manual SBOM Generation

```bash
# Install SBOM tools
pip install cyclonedx-bom spdx-tools

# Generate CycloneDX SBOM
cyclonedx-py -o security/SBOM/sbom.cyclonedx.json --format json

# Convert to SPDX
spdx-tools convert security/SBOM/sbom.cyclonedx.json security/SBOM/sbom.spdx.json

# Validate
spdx-tools validate security/SBOM/sbom.spdx.json
```

### SBOM Contents

Each SBOM includes:

- **Direct dependencies** - Listed in pyproject.toml
- **Transitive dependencies** - All nested dependencies
- **Version information** - Exact versions installed
- **License data** - SPDX license identifiers
- **CPE/PURL identifiers** - For vulnerability matching
- **Component hashes** - SHA256 of each package

---

## SLSA Provenance

### What is SLSA?

SLSA (Supply chain Levels for Software Artifacts) is a framework for ensuring artifact integrity and build provenance.

**JobSentinel Target:** SLSA Level 3
- ✅ Build on GitHub Actions (trusted builder)
- ✅ Provenance includes build parameters
- ✅ Hermetic and isolated build environment
- ✅ Cryptographically signed attestations

### Build Provenance Generation

Build provenance is automatically generated for every release:

```yaml
# .github/workflows/release.yml
- name: Attest build provenance for source archive
  uses: actions/attest-build-provenance@977bb373ede98d70efdf65b84cb5f73e068dcc2a # v3.0.0
  with:
    subject-path: jobsentinel-${{ needs.validate.outputs.version }}.tar.gz

- name: Attest build provenance for wheels
  uses: actions/attest-build-provenance@977bb373ede98d70efdf65b84cb5f73e068dcc2a # v3.0.0
  with:
    subject-path: dist/*
```

### Provenance Contents

Each attestation includes:

- **Builder identity** - GitHub Actions runner
- **Source repository** - GitHub repo URL + commit SHA
- **Build parameters** - Python version, OS, dependencies
- **Timestamp** - When the build occurred
- **Signature** - Cryptographic proof of authenticity

### Verifying Provenance

Users can verify release integrity:

```bash
# Install GitHub CLI
gh auth login

# Download release
gh release download v0.9.0 -R cboyd0319/JobSentinel

# Verify attestation (requires gh CLI v2.40+)
gh attestation verify jobsentinel-0.9.0.tar.gz --owner cboyd0319
```

**Output:**
```
✓ Verification succeeded!

Attestation URL: https://github.com/cboyd0319/JobSentinel/attestations/...
```

---

## Dependency Scanning

### Automated Scanning Tools

| Tool | Purpose | Frequency |
|------|---------|-----------|
| **pip-audit** | Python package vulnerabilities | Every PR + Daily |
| **OSV Scanner** | Cross-language vulnerabilities | Every PR + Daily |
| **Dependabot** | Dependency updates + security alerts | Weekly |
| **GitHub Dependency Review** | Block vulnerable deps in PRs | Every PR |

### pip-audit

Scans installed packages against PyPI's vulnerability database:

```bash
# Run locally
pip-audit --desc

# Generate JSON report
pip-audit --format json -o pip-audit-report.json
```

**CI Integration:**
```yaml
- name: Run pip-audit Dependency Scan
  run: pip-audit --desc --format json -o pip-audit-report.json || true
```

### OSV Scanner

Scans dependencies and git commits for known vulnerabilities:

```bash
# Install
curl -sSL https://github.com/google/osv-scanner/releases/latest/download/osv-scanner_linux_amd64 -o osv-scanner
chmod +x osv-scanner

# Scan lockfile
./osv-scanner --lockfile=requirements.lock

# Scan entire project
./osv-scanner --recursive .
```

**CI Integration:**
```yaml
- name: Run OSV Scanner
  run: ./osv-scanner --lockfile=requirements.txt --format=json --output=osv-report.json || true
```

### Dependabot

Automatically creates PRs for dependency updates:

- **Weekly scans** - Check for new versions
- **Immediate security alerts** - Critical vulnerabilities
- **Grouped updates** - Reduce PR noise (40% fewer PRs)
- **Auto-merge** - Patch updates after CI passes (optional)

**Configuration:** `.github/dependabot.yml`

---

## GitHub Actions Security

### SHA-Pinned Actions

All GitHub Actions use **full commit SHAs** instead of tags to prevent tag-based attacks:

```yaml
# ✅ SECURE: SHA-pinned with version comment
- uses: actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8 # v5.0.0

# ❌ INSECURE: Tag can be moved
- uses: actions/checkout@v5
```

### Minimal Permissions

All workflows use least-privilege permissions:

```yaml
permissions:
  contents: read  # Default: read-only

jobs:
  release:
    permissions:
      contents: write        # Only for releases
      attestations: write    # Only for SLSA attestations
      id-token: write        # Only for OIDC signing
```

### Workflow Isolation

- **No secrets in logs** - Sensitive data is redacted
- **No `pull_request_target`** - Avoid code injection
- **Concurrency limits** - Prevent race conditions
- **Timeout limits** - Prevent runaway costs

### OIDC Federation (Future)

For cloud deployments, use OIDC instead of long-lived credentials:

```yaml
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
    aws-region: us-east-1
    # No static AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY needed!
```

**Benefits:**
- Short-lived tokens (valid for workflow run only)
- No credential rotation needed
- Audit trail in cloud provider logs

---

## Verification Procedures

### Verifying Release Integrity

1. **Download release artifacts:**
   ```bash
   gh release download v0.9.0 -R cboyd0319/JobSentinel
   ```

2. **Verify SHA256 checksums:**
   ```bash
   sha256sum -c jobsentinel-0.9.0.tar.gz.sha256
   sha256sum -c jobsentinel-0.9.0-wheels.sha256
   ```

3. **Verify SLSA provenance:**
   ```bash
   gh attestation verify jobsentinel-0.9.0.tar.gz --owner cboyd0319
   ```

4. **Review SBOM:**
   ```bash
   cat jobsentinel-0.9.0.spdx.json | jq -r '.packages[] | "\(.name) \(.versionInfo) \(.licenseConcluded)"'
   ```

### Verifying Dependencies

1. **Check for known vulnerabilities:**
   ```bash
   pip-audit
   ```

2. **Review dependency tree:**
   ```bash
   pip install pipdeptree
   pipdeptree
   ```

3. **Check licenses:**
   ```bash
   pip-licenses --format=json
   ```

---

## Incident Response

### If a Vulnerability is Found

1. **Assess impact:**
   - Check SBOM: Is the vulnerable package included?
   - Check version: Is the vulnerable version in use?
   - Check reachability: Is the vulnerable code path used?

2. **Immediate actions:**
   ```bash
   # Update the vulnerable package
   pip install --upgrade <package>

   # Or pin to safe version in pyproject.toml
   dependencies = ["<package>>=X.Y.Z"]  # X.Y.Z is safe version
   ```

3. **Long-term actions:**
   - Update RISK_LEDGER.md
   - Document mitigation in CHANGELOG.md
   - Create GitHub Security Advisory (if applicable)
   - Notify users via release notes

### If a Supply Chain Attack is Suspected

1. **Isolate:**
   - Stop deployments
   - Review recent Dependabot PRs
   - Check GitHub Actions logs

2. **Investigate:**
   - Compare SBOM with expected dependencies
   - Check pip-audit and OSV Scanner results
   - Review git history for unexpected changes

3. **Recover:**
   - Revert to last known-good version
   - Re-build from source with verified dependencies
   - Generate new SBOM and provenance

---

## Compliance

### SLSA Compliance

- **SLSA L1:** ✅ Provenance exists (metadata about build)
- **SLSA L2:** ✅ Provenance is signed (GitHub attestations)
- **SLSA L3:** ✅ Hermetic build (GitHub Actions)
- **SLSA L4:** ⏳ Two-party review (future goal)

### NIST/EO 14028 Compliance

JobSentinel aligns with Executive Order 14028 (Improving the Nation's Cybersecurity):

- ✅ SBOM provided for all releases (SPDX format)
- ✅ Provenance attestations (SLSA L3)
- ✅ Secure development practices (OWASP ASVS Level 2)
- ✅ Vulnerability disclosure policy (SECURITY.md)

---

## Additional Resources

- **[SECURITY.md](../SECURITY.md)** - Vulnerability disclosure policy
- **[RISK_LEDGER.md](../security/RISK_LEDGER.md)** - Current security risks
- **[PYSEC Guidelines](./copilot/PYSEC.md)** - Python security engineering standards
- **[SLSA Framework](https://slsa.dev/)** - Supply chain security levels
- **[SPDX Spec](https://spdx.github.io/spdx-spec/)** - SBOM format specification
- **[OSV.dev](https://osv.dev/)** - Open Source Vulnerability database

---

## Questions?

- **Security issues:** See [SECURITY.md](../SECURITY.md)
- **Supply chain questions:** [GitHub Discussions](https://github.com/cboyd0319/JobSentinel/discussions)

---

*Last Updated: 2025-10-21*
