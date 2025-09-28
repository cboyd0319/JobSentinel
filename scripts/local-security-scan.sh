#!/bin/bash
# Local Security Scanning Script
# Catches security issues before commit

set -euo pipefail

echo "🔒 Running local security analysis..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ISSUES_FOUND=0

# Function to report issues
report_issue() {
    echo -e "${RED}❌ Security Issue Found: $1${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
}

report_warning() {
    echo -e "${YELLOW}⚠️  Warning: $1${NC}"
}

report_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 1. Bandit Security Scan
echo "Running Bandit security scan..."
if bandit -r . -x ./.venv --quiet -f json -o bandit-report.json; then
    # Check if any issues were found
    BANDIT_ISSUES=$(python3 -c "
import json
try:
    with open('bandit-report.json', 'r') as f:
        data = json.load(f)
        print(len(data.get('results', [])))
except:
    print('0')
" 2>/dev/null || echo "0")

    if [ "$BANDIT_ISSUES" -gt 0 ]; then
        report_issue "Bandit found $BANDIT_ISSUES security issues"
        echo "Run: bandit -r . -x ./.venv to see details"
    else
        report_success "Bandit security scan passed"
    fi
else
    report_issue "Bandit scan failed"
fi

# 2. Safety Dependency Scan
echo "Running Safety dependency vulnerability scan..."
if command -v safety &> /dev/null; then
    SAFETY_PROJECT_ARGS=()
    if [ -f "config/.safety-project.ini" ]; then
        SAFETY_PROJECT_ARGS+=(--project "config/.safety-project.ini")
    fi

    set +e
    if safety --help 2>/dev/null | grep -q "scan"; then
        safety scan --json --output safety-results.json "${SAFETY_PROJECT_ARGS[@]}" 1>/dev/null 2>&1
        SAFETY_EXIT=$?
    else
        safety check --json "${SAFETY_PROJECT_ARGS[@]}" > safety-results.json 2>/dev/null
        SAFETY_EXIT=$?
    fi
    set -e

    if [ ! -f safety-results.json ]; then
        echo '{"vulnerabilities": []}' > safety-results.json
    fi

    SAFETY_SUMMARY=$(python3 <<'PY'
import json
from pathlib import Path

path = Path('safety-results.json')
try:
    raw = json.loads(path.read_text(encoding='utf-8')) if path.exists() else []
except Exception:
    print('0,0,0,False')
    raise SystemExit(0)

vulns = raw if isinstance(raw, list) else raw.get('vulnerabilities', [])
blocked = 0
allowed = 0
should_block = False

for vuln in vulns:
    severity = (vuln.get('severity') or 'unknown').lower()
    has_fix = bool(vuln.get('fix_available') or vuln.get('patched_versions'))
    if severity in {'critical', 'high', 'medium', 'moderate'} and has_fix:
        blocked += 1
        should_block = True
    else:
        allowed += 1

print(f"{len(vulns)},{blocked},{allowed},{should_block}")
PY
    )

    IFS=',' read -r SAFETY_TOTAL SAFETY_BLOCKED SAFETY_ALLOWED SAFETY_SHOULD_BLOCK <<< "$SAFETY_SUMMARY"

    if [ "$SAFETY_SHOULD_BLOCK" = "True" ]; then
        report_issue "Safety found $SAFETY_BLOCKED fixable Critical/High/Medium vulnerabilities (Total: $SAFETY_TOTAL)"
        echo "  ⚠️  $SAFETY_ALLOWED vulnerabilities allowed (unfixed or low severity)"
    elif [ "$SAFETY_TOTAL" -gt 0 ]; then
        report_warning "Safety found $SAFETY_TOTAL vulnerabilities ($SAFETY_ALLOWED allowed by policy)"
    else
        report_success "Safety scan passed - no vulnerabilities found"
    fi

    rm -f safety-results.json safety-results.sarif

    if [ $SAFETY_EXIT -ne 0 ] && [ "$SAFETY_SHOULD_BLOCK" != "True" ]; then
        report_warning "Safety exited with status $SAFETY_EXIT (results still processed)"
    fi
else
    report_warning "Safety not installed - run: pip install safety"
fi

# 3. Check for hardcoded secrets
echo "Checking for hardcoded secrets..."
SECRET_PATTERNS=(
    "password\s*=\s*['\"][^'\"]+['\"]"
    "api_key\s*=\s*['\"][^'\"]+['\"]"
    "secret\s*=\s*['\"][^'\"]+['\"]"
    "token\s*=\s*['\"][^'\"]+['\"]"
    "AKIA[0-9A-Z]{16}"  # AWS Access Key
    "sk-[a-zA-Z0-9]{48}" # OpenAI API Key
)

for pattern in "${SECRET_PATTERNS[@]}"; do
    if grep -r -E "$pattern" --include="*.py" --include="*.yaml" --include="*.yml" --exclude-dir=.venv . 2>/dev/null; then
        report_issue "Potential hardcoded secret found matching pattern: $pattern"
    fi
done

# 4. URL Substring Sanitization Check
echo "Checking for URL substring sanitization issues..."
URL_ISSUES=$(python3 -c "
import re
import os

issues = []
patterns = [
    r'if\s+['\"][\w.-]+['\"].*in.*url',
    r'if\s+['\"][\w.-]+['\"].*in.*domain',
    r'if\s+['\"][\w.-]+['\"].*in.*netloc',
    r'if\s+['\"][\w.-]+['\"].*in.*page_content.*domain',
]

for root, dirs, files in os.walk('.'):
    if '.venv' in root or '.git' in root:
        continue
    for file in files:
        if file.endswith('.py'):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                    lines = content.split('\n')
                    for i, line in enumerate(lines, 1):
                        for pattern in patterns:
                            if re.search(pattern, line, re.IGNORECASE):
                                issues.append(f'{filepath}:{i} - {line.strip()}')
            except:
                pass

print(len(issues))
for issue in issues:
    print(issue)
" 2>/dev/null || echo "0")

if [ "$URL_ISSUES" != "0" ]; then
    echo "$URL_ISSUES" | while read -r line; do
        if [[ "$line" =~ ^[0-9]+$ ]]; then
            if [ "$line" -gt 0 ]; then
                report_issue "Found $line potential URL substring sanitization issues"
            fi
        else
            echo "  $line"
        fi
    done
fi

# 5. Check for subprocess security issues
echo "Checking for subprocess security issues..."
if grep -r "shell=True" --include="*.py" --exclude-dir=.venv . 2>/dev/null; then
    report_warning "Found subprocess calls with shell=True - review for security"
fi

# 6. Check .env files are not tracked
echo "Checking for accidentally tracked .env files..."
if git ls-files | grep -E "\.(env|key|pem)$" 2>/dev/null; then
    report_issue "Found potentially sensitive files tracked in git"
fi

# 7. Python syntax check
echo "Running Python syntax validation..."
find . -name "*.py" -not -path "./.venv/*" -exec python3 -m py_compile {} \; 2>/dev/null || {
    report_issue "Python syntax errors found"
}

# 8. Check for SQL injection patterns
echo "Checking for potential SQL injection..."
if grep -r -E "(execute|query)\s*\(\s*['\"].*%.*['\"]" --include="*.py" --exclude-dir=.venv . 2>/dev/null; then
    report_warning "Found potential SQL injection patterns - review string formatting in queries"
fi

# Summary
echo ""
echo "=================="
if [ $ISSUES_FOUND -eq 0 ]; then
    report_success "All security checks passed! 🎉"
    exit 0
else
    echo -e "${RED}❌ Found $ISSUES_FOUND security issues that must be fixed before commit${NC}"
    echo ""
    echo "To fix these issues:"
    echo "1. Review the security issues above"
    echo "2. Fix the identified problems"
    echo "3. Run this script again: scripts/local-security-scan.sh"
    echo "4. Or run individual tools:"
    echo "   • bandit -r . -x ./.venv"
    echo "   • safety scan --json --output safety-results.json --project config/.safety-project.ini"
    exit 1
fi
