#!/bin/bash
# Local Security Scanning Script
# Catches security issues before commit

set -euo pipefail

echo "Running local security analysis..."

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

# 1. TruffleHog Secrets Scan (reuse existing CI tool)
echo "Running TruffleHog secrets scan..."
if ! command -v trufflehog &> /dev/null; then
    report_warning "TruffleHog not installed - run: curl -sSfL https://github.com/trufflesecurity/trufflehog/releases/download/v3.90.8/trufflehog_3.90.8_$(uname -s | tr '[:upper:]' '[:lower:]')_amd64.tar.gz | tar -xz && sudo mv trufflehog /usr/local/bin/"
    echo "Skipping TruffleHog scan..."
else
    echo "Scanning git history for secrets..."
    if trufflehog git file://. --only-verified --fail --json > /dev/null 2>&1; then
        report_success "TruffleHog scan passed - no verified secrets found"
    else
        report_issue "TruffleHog found verified secrets in repository"
        echo "Run: trufflehog git file://. --only-verified to see details"
    fi
fi

# 2. Bandit Security Scan
echo "Running Bandit security scan..."
if ! command -v bandit &> /dev/null; then
    report_warning "Bandit not installed - run: pip install bandit"
    echo "Skipping Bandit scan..."
elif bandit -r . -x ./.venv --quiet -f json -o bandit-report.json; then
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


# 3. URL Substring Sanitization Check
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

# 4. Check for subprocess security issues
echo "Checking for subprocess security issues..."
if grep -r "shell=True" --include="*.py" --exclude-dir=.venv . 2>/dev/null; then
    report_warning "Found subprocess calls with shell=True - review for security"
fi

# 5. Check .env files are not tracked
echo "Checking for accidentally tracked .env files..."
if git ls-files | grep -E "\.(env|key|pem)$" 2>/dev/null; then
    report_issue "Found potentially sensitive files tracked in git"
fi

# 6. Python syntax check
echo "Running Python syntax validation..."
find . -name "*.py" -not -path "./.venv/*" -exec python3 -m py_compile {} \; 2>/dev/null || {
    report_issue "Python syntax errors found"
}

# 7. Check for SQL injection patterns
echo "Checking for potential SQL injection..."
if grep -r -E "(execute|query)\s*\(\s*['\"].*%.*['\"]" --include="*.py" --exclude-dir=.venv . 2>/dev/null; then
    report_warning "Found potential SQL injection patterns - review string formatting in queries"
fi

# Summary
echo ""
echo "=================="
if [ $ISSUES_FOUND -eq 0 ]; then
    report_success "All security checks passed!"
    exit 0
else
    echo -e "${RED}❌ Found $ISSUES_FOUND security issues that must be fixed before commit${NC}"
    echo ""
    echo "To fix these issues:"
    echo "1. Review the security issues above"
    echo "2. Fix the identified problems"
    echo "3. Run this script again: scripts/precommit-security-scan.sh"
    echo "4. Or run individual tools:"
    echo "   • bandit -r . -x ./.venv"
    echo "   • safety scan --output json --project config/.safety-project.ini"
    exit 1
fi
