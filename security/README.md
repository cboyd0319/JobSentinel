# Security Documentation

This directory contains security-related documentation and artifacts for JobSentinel.

## Contents

- **[RISK_LEDGER.md](./RISK_LEDGER.md)** - Current security risks, mitigations, and status
- **[THREAT_MODEL.md](./THREAT_MODEL.md)** - Reference to main threat model (see docs/THREAT_MODEL.md)
- **SCANNER_RESULTS/** - Security scan outputs (SARIF files, gitignored)
- **POLICIES/** - Custom security policies and rules
  - **semgrep/** - Semgrep custom rules for code scanning
- **SBOM/** - Software Bill of Materials (SPDX + CycloneDX)

## Quick Links

### For Users
- **[Security Policy](../SECURITY.md)** - How to report vulnerabilities
- **[Threat Model](../docs/THREAT_MODEL.md)** - Data flows and trust boundaries

### For Developers
- **[Secure Coding Guide](../docs/SECURE_CODING_GUIDE.md)** - Security best practices (coming soon)
- **[PYSEC Guidelines](../docs/copilot/PYSEC.md)** - Python security engineering standards
- **[Security Dominance Plan](../docs/copilot/SECURITY_DOMINANCE_PLAN.md)** - Security roadmap

### For Security Researchers
- **[Vulnerability Disclosure](../SECURITY.md#reporting-a-vulnerability)** - Responsible disclosure process
- **[Scope](../SECURITY.md#scope)** - What's in/out of scope for bug bounty

## Security Scanning

### Run Security Scans Locally

```bash
# Install security tools
pip install bandit[toml] semgrep pip-audit

# Run Bandit (SAST)
bandit -r deploy/common/app/src/ -f sarif -o security/SCANNER_RESULTS/bandit.sarif

# Run Semgrep (SAST)
semgrep scan --config auto --sarif --output security/SCANNER_RESULTS/semgrep.sarif

# Run pip-audit (dependency vulnerabilities)
pip-audit --desc --format json -o security/SCANNER_RESULTS/pip-audit.json
```

### Automated Scans

Security scans run automatically in CI/CD:
- **On every PR:** Bandit, CodeQL, pip-audit
- **On every push to main:** Full security suite + Scorecard
- **Weekly:** Dependency updates via Dependabot

See `.github/workflows/security.yml` for details.

## SBOM (Software Bill of Materials)

SBOMs are generated on every release and published to this directory.

### Generate SBOM Locally

```bash
# Install SBOM tools
pip install cyclonedx-bom spdx-tools

# Generate CycloneDX SBOM
cyclonedx-py -o security/SBOM/sbom.cyclonedx.json --format json

# Convert to SPDX
spdx-tools convert security/SBOM/sbom.cyclonedx.json security/SBOM/sbom.spdx.json
```

### Verify SBOM

```bash
# Validate SPDX SBOM
spdx-tools validate security/SBOM/sbom.spdx.json

# Validate CycloneDX SBOM
cyclonedx validate --input-file security/SBOM/sbom.cyclonedx.json
```

## Policies

### Semgrep Custom Rules

Custom Semgrep rules are in `POLICIES/semgrep/custom-rules.yml`. These rules are specific to JobSentinel's architecture and complement the standard Semgrep rulesets.

To add a new rule:
1. Write the rule in YAML format
2. Test locally: `semgrep scan --config POLICIES/semgrep/custom-rules.yml`
3. Add tests in rule file (under `pattern-not`)
4. Update this README with rule description

## Contributing

When contributing security-related changes:
1. Update RISK_LEDGER.md if you fix a vulnerability
2. Add tests demonstrating the fix
3. Run security scans locally before submitting PR
4. Follow [Secure Coding Guide](../docs/SECURE_CODING_GUIDE.md)

## Questions?

- **Security issues:** See [SECURITY.md](../SECURITY.md)
- **General questions:** [GitHub Discussions](https://github.com/cboyd0319/JobSentinel/discussions)

---

*Last Updated: 2025-10-21*
