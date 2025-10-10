#!/bin/bash

set -euo pipefail

python3 <<'PY'
import os
import textwrap

STATUS_MAP = {
    'passed': 'PASS',
    'success': 'PASS',
    'succeeded': 'PASS',
    'failed': 'FAIL',
    'failure': 'FAIL',
    'skipped': 'SKIP',
}

def status_label(name: str) -> str:
    value = (name or '').strip().lower()
    return STATUS_MAP.get(value, 'WARN')

bandit_status = os.getenv('BANDIT_STATUS', 'unknown')
osv_status = os.getenv('OSV_RESULT', 'unknown')
semgrep_status = os.getenv('SEMGREP_RESULT', 'unknown')
codeql_status = os.getenv('CODEQL_RESULT', 'unknown')
yamllint_status = os.getenv('YAMLLINT_RESULT', 'unknown')
trufflehog_status = os.getenv('TRUFFLEHOG_RESULT', 'unknown')



summary = f"""\
# Security Analysis Summary

## Scan Results

| Tool | Status | Integration | Description |
|------|--------|-------------|-------------|
| Bandit | {status_label(bandit_status)} ({bandit_status}) | Security Tab | Python static analysis (SARIF) |
| OSV Scanner | {status_label(osv_status)} ({osv_status}) | Security Tab | Open Source Vulnerability database |
| Semgrep | {status_label(semgrep_status)} ({semgrep_status}) | Security Tab | Multi-language security patterns |
| CodeQL | {status_label(codeql_status)} ({codeql_status}) | Security Tab | GitHub's semantic code analysis |

| YAML Lint | {status_label(yamllint_status)} ({yamllint_status}) | CI Logs | YAML syntax and style checking |
| TruffleHog | {status_label(trufflehog_status)} ({trufflehog_status}) | CI Logs | Secret scanning for verified secrets |

## Where to View Results

- **[Code scanning alerts](../../security/code-scanning)**
- **[Dependabot alerts](../../security/dependabot)**
- **[Secret scanning alerts](../../security/secret-scanning)**

## Local Development

Run these commands locally to catch issues before commit:

```bash
# Pre-commit security scan
scripts/precommit-security-scan.sh

# Comprehensive scan (use GitHub workflow)
# See: .github/workflows/security.yml

# Individual tools
bandit -r . -x ./.venv
osv-scanner --format json --output osv-results.json .
semgrep --config=auto .
yamllint .
trufflehog filesystem .
```

_This summary was generated automatically by the Security & Vulnerability Scanning workflow._
"""

with open('security-summary.md', 'w', encoding='utf-8') as fh:
    fh.write(textwrap.dedent(summary))
PY
