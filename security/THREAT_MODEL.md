# Threat Model Reference

This document serves as a reference to the main threat model documentation.

**Primary Threat Model:** [docs/THREAT_MODEL.md](../docs/THREAT_MODEL.md)

## Quick Links

- **Data Flows:** See [docs/THREAT_MODEL.md - Data Flow](../docs/THREAT_MODEL.md#data-flow-mermaid)
- **Trust Boundaries:** See [docs/THREAT_MODEL.md - Trust Boundaries](../docs/THREAT_MODEL.md#trust-boundaries)
- **Assets:** See [docs/THREAT_MODEL.md - Assets](../docs/THREAT_MODEL.md#assets)
- **Threats & Controls:** See [docs/THREAT_MODEL.md - Threats and Controls](../docs/THREAT_MODEL.md#threats-and-controls-owasp-asvs-aligned)

## Security Folder Structure

```
security/
├── RISK_LEDGER.md          # Current risk inventory (you are here for detailed risks)
├── THREAT_MODEL.md         # This file (pointer to main threat model)
├── SCANNER_RESULTS/        # SARIF outputs from security scans
├── POLICIES/
│   └── semgrep/
│       └── custom-rules.yml
└── SBOM/
    ├── sbom.spdx.json      # SPDX 2.3 format
    └── sbom.cyclonedx.json # CycloneDX 1.4 format
```

## Related Documentation

- **[RISK_LEDGER.md](./RISK_LEDGER.md)** - Detailed risk inventory with CWE mappings
- **[SECURITY.md](../SECURITY.md)** - Vulnerability disclosure policy
- **[SECURITY_DOMINANCE_PLAN.md](../docs/copilot/SECURITY_DOMINANCE_PLAN.md)** - Security implementation roadmap
- **[PYSEC.md](../docs/copilot/PYSEC.md)** - Python security engineering guidelines

---

*For detailed threat modeling, always refer to the canonical docs/THREAT_MODEL.md*
