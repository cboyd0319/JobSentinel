#!/bin/bash

set -e

status_emoji() {
  case "$1" in
    passed|success|succeeded) echo "✅" ;;
    failed|failure) echo "❌" ;;
    skipped) echo "⚪" ;;
    *) echo "⚠️" ;;
  esac
}

BANDIT_MARK=$(status_emoji "$BANDIT_STATUS")
SAFETY_MARK=$(status_emoji "$SAFETY_STATUS")
OSV_MARK=$(status_emoji "$OSV_RESULT")
SEMGREP_MARK=$(status_emoji "$SEMGREP_RESULT")
CODEQL_MARK=$(status_emoji "$CODEQL_RESULT")
YAMLLINT_MARK=$(status_emoji "$YAMLLINT_RESULT")
TRUFFLEHOG_MARK=$(status_emoji "$TRUFFLEHOG_RESULT")
if [ "$PROWLER_ENABLED" = "true" ]; then
  PROWLER_MARK=$(status_emoji "$PROWLER_RESULT")
  PROWLER_DESC="CIS 1.0 benchmark (prowler github)"
else
  PROWLER_MARK="⚪"
  PROWLER_RESULT="skipped"
  PROWLER_DESC="Configure PROWLER_GITHUB_TOKEN to enable"
fi

cat <<EOF > security-summary.md
# 🔒 Security Analysis Summary

## 📊 Scan Results

| Tool | Status | Integration | Description |
|------|--------|-------------|-------------|
| 🔍 Bandit | $BANDIT_MARK ${BANDIT_STATUS:-unknown} | ✅ Security Tab | Python static analysis (SARIF) |
| 🔒 Safety | $SAFETY_MARK ${SAFETY_STATUS:-unknown} | ✅ Security Tab | Dependency vulnerability scan |
| 🛡️ OSV Scanner | $OSV_MARK ${OSV_RESULT:-unknown} | ✅ Security Tab | Open Source Vulnerability database |
| 🔬 Semgrep | $SEMGREP_MARK ${SEMGREP_RESULT} | ✅ Security Tab | Multi-language security patterns |
| 🧪 CodeQL | $CODEQL_MARK ${CODEQL_RESULT} | ✅ Security Tab | GitHub's semantic code analysis |
| 📋 Dependency Review | $(status_emoji "$DEP_REVIEW_RESULT") ${DEP_REVIEW_RESULT} | ✅ Security Tab | License & vulnerability review |
| 🛡️ Prowler GitHub | $PROWLER_MARK ${PROWLER_RESULT} | 📊 Reports Only | $PROWLER_DESC |
| 📝 YAML Lint | $YAMLLINT_MARK ${YAMLLINT_RESULT} | ✅ CI Logs | YAML syntax and style checking |
| 🐷 TruffleHog | $TRUFFLEHOG_MARK ${TRUFFLEHOG_RESULT} | ✅ CI Logs | Secret scanning for verified secrets |

## 🎯 Where to View Results

- **[Code scanning alerts](../../security/code-scanning)**
- **[Dependabot alerts](../../security/dependabot)**
- **[Secret scanning alerts](../../security/secret-scanning)**

## 🚀 Local Development

Run these commands locally to catch issues before commit:

```bash
# Comprehensive scan
scripts/enhanced-security-scan.sh

# Quick scan
scripts/local-security-scan.sh

# Individual tools
bandit -r . -x ./.venv
safety scan --json --output safety-results.json --project config/.safety-project.ini
osv-scanner --format json --output osv-results.json .
semgrep --config=auto .
yamllint .
trufflehog filesystem .
```

_This summary was generated automatically by the Security & Vulnerability Scanning workflow._
EOF
