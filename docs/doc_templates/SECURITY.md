# Security Policy

## Supported versions
We generally support the latest minor and security patches.

## Reporting a vulnerability
Contact: https://github.com/cboyd0319  
We aim to respond within **3 business days**.

## Handling of secrets
- Never commit secrets. Use a secret manager.
- Required runtime secrets are documented in README (Security section).

## Supply chain
- Releases are signed (Sigstore/cosign).
- SBOM (SPDX 2.3) is attached to every release.
- Build provenance is attached when available.
