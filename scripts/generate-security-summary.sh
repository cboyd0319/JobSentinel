#!/bin/bash

set -euo pipefail

python3 <<'PY'
import os
import textwrap

STATUS_MAP = {
    'passed': '✅',
    'success': '✅',
    'succeeded': '✅',
    'failed': '❌',
    'failure': '❌',
    'skipped': '⚪',
}

def status_emoji(name: str) -> str:
    value = (name or '').strip().lower()
    return STATUS_MAP.get(value, '⚠️')

bandit_status = os.getenv('BANDIT_STATUS', 'unknown')
safety_status = os.getenv('SAFETY_STATUS', 'unknown')
osv_status = os.getenv('OSV_RESULT', 'unknown')
semgrep_status = os.getenv('SEMGREP_RESULT', 'unknown')
codeql_status = os.getenv('CODEQL_RESULT', 'unknown')
yamllint_status = os.getenv('YAMLLINT_RESULT', 'unknown')
trufflehog_status = os.getenv('TRUFFLEHOG_RESULT', 'unknown')

prowler_enabled = os.getenv('PROWLER_ENABLED', 'false').lower() == 'true'
prowler_status = os.getenv('PROWLER_RESULT', 'skipped')
if prowler_enabled:
    prowler_mark = status_emoji(prowler_status)
    prowler_desc = 'CIS 1.0 benchmark (prowler github)'
else:
    prowler_mark = '⚪'
    prowler_status = 'skipped'
    prowler_desc = 'Configure PROWLER_GITHUB_TOKEN to enable'

summary = f"""\
# 🔒 Security Analysis Summary

## 📊 Scan Results

| Tool | Status | Integration | Description |
|------|--------|-------------|-------------|
| 🔍 Bandit | {status_emoji(bandit_status)} {bandit_status} | ✅ Security Tab | Python static analysis (SARIF) |
| 🔒 Safety | {status_emoji(safety_status)} {safety_status} | ✅ Security Tab | Dependency vulnerability scan |
| 🛡️ OSV Scanner | {status_emoji(osv_status)} {osv_status} | ✅ Security Tab | Open Source Vulnerability database |
| 🔬 Semgrep | {status_emoji(semgrep_status)} {semgrep_status} | ✅ Security Tab | Multi-language security patterns |
| 🧪 CodeQL | {status_emoji(codeql_status)} {codeql_status} | ✅ Security Tab | GitHub's semantic code analysis |
| 🛡️ Prowler GitHub | {prowler_mark} {prowler_status} | 📊 Reports Only | {prowler_desc} |
| 📝 YAML Lint | {status_emoji(yamllint_status)} {yamllint_status} | ✅ CI Logs | YAML syntax and style checking |
| 🐷 TruffleHog | {status_emoji(trufflehog_status)} {trufflehog_status} | ✅ CI Logs | Secret scanning for verified secrets |

## 🎯 Where to View Results

- **[Code scanning alerts](../../security/code-scanning)**
- **[Dependabot alerts](../../security/dependabot)**
- **[Secret scanning alerts](../../security/secret-scanning)**

## 🚀 Local Development

Run these commands locally to catch issues before commit:

```bash
# Pre-commit security scan
scripts/precommit-security-scan.sh

# Comprehensive scan (use GitHub workflow)
# See: .github/workflows/security.yml

# Individual tools
bandit -r . -x ./.venv
safety scan --output json --project config/.safety-project.ini
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
