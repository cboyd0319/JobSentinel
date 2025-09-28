#!/bin/bash
# Enhanced Security & Code Quality Scanner
# Comprehensive local security analysis with OSV vulnerability scanning

set -euo pipefail

echo "🔒 Enhanced Security & Code Quality Analysis"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

ISSUES_FOUND=0
WARNINGS_FOUND=0

# Function to report issues
report_issue() {
    echo -e "${RED}❌ CRITICAL: $1${NC}"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
}

report_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    WARNINGS_FOUND=$((WARNINGS_FOUND + 1))
}

report_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

report_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

report_section() {
    echo -e "\n${PURPLE}=== $1 ===${NC}"
}

# Install required tools if missing
install_if_missing() {
    local tool=$1
    local install_cmd=$2

    if ! command -v "$tool" &> /dev/null; then
        echo "Installing $tool..."
        eval "$install_cmd"
    fi
}

# Check if we're in a Python project
if [ ! -f "requirements.txt" ] && [ ! -f "pyproject.toml" ] && [ ! -f "setup.py" ]; then
    report_warning "No Python project files found (requirements.txt, pyproject.toml, setup.py)"
fi

# ============================================================================
# SECTION 1: VULNERABILITY SCANNING
# ============================================================================
report_section "Vulnerability Scanning"

# 1.1 OSV-Scanner (Google's Open Source Vulnerability scanner)
echo "Installing and running OSV-Scanner..."
if ! command -v osv-scanner &> /dev/null; then
    # Install OSV scanner
    if command -v go &> /dev/null; then
        go install github.com/google/osv-scanner/cmd/osv-scanner@v1
    else
        # Download binary
        OS=$(uname -s | tr '[:upper:]' '[:lower:]')
        ARCH=$(uname -m)
        if [ "$ARCH" = "x86_64" ]; then ARCH="amd64"; fi
        if [ "$ARCH" = "aarch64" ]; then ARCH="arm64"; fi

        curl -L "https://github.com/google/osv-scanner/releases/latest/download/osv-scanner_${OS}_${ARCH}" -o /tmp/osv-scanner
        chmod +x /tmp/osv-scanner
        sudo mv /tmp/osv-scanner /usr/local/bin/ 2>/dev/null || {
            report_warning "Could not install osv-scanner to /usr/local/bin, using /tmp/osv-scanner"
            export PATH="/tmp:$PATH"
        }
    fi
fi

if command -v osv-scanner &> /dev/null; then
    echo "Running OSV vulnerability scan..."
        # Generate both JSON and SARIF formats
    osv-scanner --format json . > osv-results.json 2>/dev/null || true
    osv-scanner --format sarif . > osv-results.sarif 2>/dev/null || true

    if [ -f "osv-results.json" ]; then
        VULNS=$(python3 -c "
import json
try:
    with open('osv-results.json', 'r') as f:
        data = json.load(f)
        vulns = data.get('results', [])
        total_vulns = sum(len(result.get('packages', [])) for result in vulns)
        print(total_vulns)

        # Print vulnerability details
        for result in vulns:
            for pkg in result.get('packages', []):
                for vuln in pkg.get('vulnerabilities', []):
                    severity = vuln.get('database_specific', {}).get('severity', 'UNKNOWN')
                    print(f'VULN: {pkg.get(\"package\", {}).get(\"name\", \"unknown\")} - {vuln.get(\"id\", \"\")} ({severity})')
except Exception as e:
    print('0')
" 2>/dev/null || echo "0")

        if [ "$VULNS" != "0" ]; then
            echo "$VULNS" | while read -r line; do
                if [[ "$line" =~ ^[0-9]+$ ]]; then
                    if [ "$line" -gt 0 ]; then
                        report_issue "Found $line known vulnerabilities in dependencies"
                    fi
                elif [[ "$line" =~ ^VULN: ]]; then
                    echo "  $line"
                fi
            done
        else
            report_success "No known vulnerabilities found in dependencies"
        fi
    else
        report_warning "OSV scan failed - check network connectivity"
    fi
else
    report_warning "OSV-Scanner not available - vulnerability scanning skipped"
fi

# 1.2 Safety - Python dependency vulnerability scanner
echo "Running Safety dependency scan with blocking policy..."
install_if_missing "safety" "python3 -m pip install safety"

if command -v safety &> /dev/null; then
    echo "Policy: Block Critical/High/Medium issues WITH fixes available"
    echo "Policy: Allow unfixed or unknown severity issues"

    if [ -f "config/.safety-project.ini" ]; then
        echo "Using project metadata from config/.safety-project.ini"
    fi

    SAFETY_PROJECT_ARGS=()
    if [ -f "config/.safety-project.ini" ]; then
        SAFETY_PROJECT_ARGS+=(--project "config/.safety-project.ini")
    fi

    # Run safety scan (prefer new 'scan' sub-command, fall back to legacy 'check')
    set +e
    if safety --help 2>/dev/null | grep -q "scan"; then
        if [ -n "$SAFETY_API_KEY" ]; then
            echo "Using Safety API key for enhanced scanning..."
        else
            echo "No SAFETY_API_KEY found - using free tier (limited vulnerability database)"
        fi
        safety scan --json --output safety-results.json "${SAFETY_PROJECT_ARGS[@]}" 2>/dev/null
        SAFETY_EXIT_CODE=$?
    else
        if [ -n "$SAFETY_API_KEY" ]; then
            echo "Using Safety API key for enhanced scanning (legacy mode)..."
        else
            echo "No SAFETY_API_KEY found - using free tier (legacy mode)"
        fi
        safety check --json "${SAFETY_PROJECT_ARGS[@]}" > safety-results.json 2>/dev/null
        SAFETY_EXIT_CODE=$?
    fi
    set -e

    # Ensure JSON file exists
    if [ ! -f safety-results.json ]; then
        echo '{"vulnerabilities": []}' > safety-results.json
    fi

    # Apply blocking policy, emit summary data, and generate SARIF
    SAFETY_RESULT=$(python3 <<'PY'
import json
from datetime import datetime, timezone
from pathlib import Path

json_path = Path('safety-results.json')
sarif_path = Path('safety-results.sarif')

def write_empty_sarif():
    sarif = {
        "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
        "version": "2.1.0",
        "runs": [
            {
                "tool": {
                    "driver": {
                        "name": "Safety",
                        "informationUri": "https://safetycli.com/",
                        "rules": []
                    }
                },
                "results": [],
                "invocations": [
                    {
                        "executionSuccessful": True,
                        "startTimeUtc": datetime.now(timezone.utc).isoformat()
                    }
                ]
            }
        ]
    }
    sarif_path.write_text(json.dumps(sarif, indent=2), encoding='utf-8')
    return '0,0,0,False'

try:
    raw = json.loads(json_path.read_text(encoding='utf-8')) if json_path.exists() else []
except Exception:
    print(write_empty_sarif())
    raise SystemExit(0)

vulns = raw if isinstance(raw, list) else raw.get('vulnerabilities', [])

severity_levels = {
    'critical': ('error', 'critical'),
    'high': ('error', 'high'),
    'medium': ('warning', 'medium'),
    'moderate': ('warning', 'medium'),
    'low': ('note', 'low'),
    'info': ('note', 'info'),
    'unknown': ('note', 'unknown'),
}

rules = {}
results = []
blocked = 0
allowed = 0
should_block = False

for vuln in vulns:
    severity = (vuln.get('severity') or 'unknown').lower()
    level, normalized = severity_levels.get(severity, ('note', severity))
    has_fix = bool(vuln.get('fix_available') or vuln.get('patched_versions'))
    package = vuln.get('package_name', 'unknown')
    vuln_id = vuln.get('vulnerability_id') or vuln.get('id') or 'UNKNOWN'
    description = vuln.get('description') or ''
    recommendation = vuln.get('remediation') or ''

    if severity in {'critical', 'high', 'medium', 'moderate'} and has_fix:
        blocked += 1
        should_block = True
    else:
        allowed += 1

    rule = {
        'id': vuln_id,
        'name': package,
        'shortDescription': {'text': f"{package} {normalized.upper()} vulnerability"},
        'fullDescription': {'text': description or f"Safety reported {normalized} severity vulnerability in {package}"},
        'help': {'text': recommendation or 'Refer to Safety report for remediation guidance.'},
        'properties': {
            'security-severity': normalized.upper(),
            'tags': ['vulnerability', 'dependency', 'safety']
        }
    }
    rules[vuln_id] = rule

    results.append({
        'ruleId': vuln_id,
        'level': level,
        'message': {
            'text': f"{package} {normalized.upper()} vulnerability (fix available: {'yes' if has_fix else 'no'})"
        },
        'locations': [
            {
                'physicalLocation': {
                    'artifactLocation': {
                        'uri': 'requirements.txt'
                    }
                }
            }
        ],
        'properties': {
            'package_name': package,
            'analyzed_version': vuln.get('analyzed_version'),
            'severity': normalized.upper(),
            'fix_available': has_fix,
            'patched_versions': vuln.get('patched_versions', []),
        }
    })

sarif_document = {
    "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
    "version": "2.1.0",
    "runs": [
        {
            "tool": {
                "driver": {
                    "name": "Safety",
                    "informationUri": "https://safetycli.com/",
                    "rules": list(rules.values())
                }
            },
            "results": results,
            "invocations": [
                {
                    "executionSuccessful": not should_block,
                    "startTimeUtc": datetime.now(timezone.utc).isoformat()
                }
            ]
        }
    ]
}

sarif_path.write_text(json.dumps(sarif_document, indent=2), encoding='utf-8')
print(f"{len(vulns)},{blocked},{allowed},{should_block}")
PY
    )

    IFS=',' read -r TOTAL_VULNS BLOCKED_COUNT ALLOWED_COUNT SHOULD_BLOCK <<< "$SAFETY_RESULT"

    if [ "$SHOULD_BLOCK" = "True" ]; then
        report_issue "Safety found $BLOCKED_COUNT fixable Critical/High/Medium vulnerabilities (Total: $TOTAL_VULNS)"
        echo "  ⚠️  $ALLOWED_COUNT vulnerabilities allowed (unfixed or low severity)"
        echo "  🔧 Fix blocking vulnerabilities by updating dependencies"
    elif [ "$TOTAL_VULNS" -gt 0 ]; then
        report_warning "Safety found $TOTAL_VULNS vulnerabilities ($ALLOWED_COUNT allowed by policy)"
        echo "  ✅ No blocking vulnerabilities (all unfixed or low severity)"
    else
        report_success "Safety scan passed - no vulnerabilities found"
    fi

else
    report_warning "Safety not available - install with: python3 -m pip install safety"
fi

# ============================================================================
# SECTION 2: SECURITY ANALYSIS
# ============================================================================
report_section "Security Analysis"

# 2.1 Bandit Security Scan
echo "Running Bandit security scan..."
# Generate JSON format (SARIF requires bandit[toml] version)
bandit -r . -x ./.venv --quiet -f json -o bandit-results.json 2>/dev/null || true

# Try to generate SARIF if supported (requires bandit[toml])
if bandit --help | grep -q "sarif" 2>/dev/null; then
    bandit -r . -x ./.venv --quiet -f sarif -o bandit-results.sarif 2>/dev/null || true
    report_info "Bandit SARIF format generated for GitHub Security tab"
else
    report_info "Bandit SARIF format not available (install with: pip install bandit[toml])"
fi

if [ -f "bandit-results.json" ]; then
    BANDIT_ISSUES=$(python3 -c "
import json
try:
    with open('bandit-results.json', 'r') as f:
        data = json.load(f)
        issues = data.get('results', [])
        high_issues = [i for i in issues if i.get('issue_severity') == 'HIGH']
        medium_issues = [i for i in issues if i.get('issue_severity') == 'MEDIUM']
        print(f'{len(high_issues)},{len(medium_issues)},{len(issues)}')
except:
    print('0,0,0')
" 2>/dev/null || echo "0,0,0")

    IFS=',' read -r HIGH MEDIUM TOTAL <<< "$BANDIT_ISSUES"
    if [ "$HIGH" -gt 0 ]; then
        report_issue "Bandit found $HIGH high-severity security issues"
    fi
    if [ "$MEDIUM" -gt 0 ]; then
        report_warning "Bandit found $MEDIUM medium-severity security issues"
    fi
    if [ "$TOTAL" -eq 0 ]; then
        report_success "Bandit security scan passed"
    else
        echo "  Run: bandit -r . -x ./.venv for details"
    fi
fi

# 2.2 Semgrep Security Analysis (if available)
echo "Checking for Semgrep security analysis..."
if command -v semgrep &> /dev/null; then
    echo "Running Semgrep security analysis..."
    # Generate both JSON and SARIF formats
    semgrep --config=auto --json --output=semgrep-results.json . &>/dev/null || true
    semgrep --config=auto --sarif --output=semgrep.sarif . &>/dev/null || true

    if [ -f "semgrep-results.json" ]; then
        SEMGREP_ISSUES=$(python3 -c "
import json
try:
    with open('semgrep-results.json', 'r') as f:
        data = json.load(f)
        results = data.get('results', [])
        print(len(results))
except:
    print('0')
" 2>/dev/null || echo "0")

        if [ "$SEMGREP_ISSUES" -gt 0 ]; then
            report_warning "Semgrep found $SEMGREP_ISSUES potential security issues"
        else
            report_success "Semgrep analysis passed"
        fi
    fi
else
    report_info "Semgrep not installed (optional: pip install semgrep)"
fi

# 2.3 Hardcoded Secrets Detection
echo "Scanning for hardcoded secrets..."
SECRET_PATTERNS=(
    "password\s*=\s*['\"][^'\"]{3,}['\"]"
    "api_key\s*=\s*['\"][^'\"]{10,}['\"]"
    "secret\s*=\s*['\"][^'\"]{10,}['\"]"
    "token\s*=\s*['\"][^'\"]{10,}['\"]"
    "AKIA[0-9A-Z]{16}"                # AWS Access Key
    "sk-[a-zA-Z0-9]{48}"             # OpenAI API Key
    "[0-9a-fA-F]{32}"                # Generic 32-char hex (API keys)
    "ghp_[a-zA-Z0-9]{36}"            # GitHub Personal Access Token
    "xox[baprs]-[a-zA-Z0-9-]+"       # Slack tokens
)

SECRETS_FOUND=0
for pattern in "${SECRET_PATTERNS[@]}"; do
    if grep -r -E "$pattern" --include="*.py" --include="*.yaml" --include="*.yml" --exclude="*results.json" --exclude-dir=.venv --exclude-dir=.git . 2>/dev/null | grep -v "SECRET_PATTERNS" | grep -v "example" | grep -v "commit.*github"; then
        SECRETS_FOUND=1
    fi
done

if [ $SECRETS_FOUND -eq 1 ]; then
    report_issue "Potential hardcoded secrets found"
else
    report_success "No hardcoded secrets detected"
fi

# ============================================================================
# SECTION 3: CODE QUALITY ANALYSIS
# ============================================================================
report_section "Code Quality Analysis"

# 3.1 Flake8 - Style and Error Checking
echo "Running Flake8 code quality analysis..."
install_if_missing "flake8" "python3 -m pip install flake8 flake8-complexity flake8-docstrings flake8-import-order"

if command -v flake8 &> /dev/null; then
    FLAKE8_ISSUES=$(flake8 --max-line-length=120 --exclude=.venv --statistics --count . 2>/dev/null | tail -1 || echo "0")
    if [ "$FLAKE8_ISSUES" != "0" ]; then
        report_warning "Flake8 found $FLAKE8_ISSUES code quality issues"
        echo "  Run: flake8 --max-line-length=120 --exclude=.venv . for details"
    else
        report_success "Flake8 code quality check passed"
    fi
fi

# 3.2 Pylint - Comprehensive Code Analysis
echo "Running Pylint analysis..."
install_if_missing "pylint" "python3 -m pip install pylint"

if command -v pylint &> /dev/null; then
    PYLINT_SCORE=$(pylint --recursive=y --score=y . 2>/dev/null | grep "Your code has been rated" | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "0")
    if (( $(echo "$PYLINT_SCORE < 8.0" | bc -l 2>/dev/null || echo "1") )); then
        report_warning "Pylint score: $PYLINT_SCORE/10 (consider improving)"
    else
        report_success "Pylint score: $PYLINT_SCORE/10"
    fi
fi

# 3.3 MyPy - Type Checking
echo "Running MyPy type analysis..."
install_if_missing "mypy" "python3 -m pip install mypy"

if command -v mypy &> /dev/null; then
    MYPY_ERRORS=$(mypy --ignore-missing-imports . 2>&1 | grep -c "error:" || echo "0")
    if [ "$MYPY_ERRORS" -gt 0 ]; then
        report_warning "MyPy found $MYPY_ERRORS type errors"
    else
        report_success "MyPy type checking passed"
    fi
fi

# 3.4 Complexity Analysis
echo "Analyzing code complexity..."
if command -v radon &> /dev/null || python3 -m pip install radon &>/dev/null; then
    COMPLEX_FUNCTIONS=$(radon cc . -s -n B 2>/dev/null | wc -l || echo "0")
    if [ "$COMPLEX_FUNCTIONS" -gt 0 ]; then
        report_warning "$COMPLEX_FUNCTIONS functions have high complexity (>= B grade)"
    else
        report_success "Code complexity analysis passed"
    fi
fi

# ============================================================================
# SECTION 4: INFRASTRUCTURE SECURITY
# ============================================================================
report_section "Infrastructure Security"

# 4.1 Docker Security (if Dockerfile exists)
if [ -f "Dockerfile" ]; then
    echo "Analyzing Dockerfile security..."

    # Check for common Dockerfile security issues
    DOCKER_ISSUES=0

    if grep -q "FROM.*:latest" Dockerfile; then
        report_warning "Dockerfile uses 'latest' tag (specify exact versions)"
        DOCKER_ISSUES=1
    fi

    if grep -q "USER root" Dockerfile || ! grep -q "USER " Dockerfile; then
        report_warning "Dockerfile runs as root user"
        DOCKER_ISSUES=1
    fi

    if grep -q "ADD http" Dockerfile; then
        report_warning "Dockerfile uses ADD with HTTP (use curl/wget in RUN)"
        DOCKER_ISSUES=1
    fi

    if [ $DOCKER_ISSUES -eq 0 ]; then
        report_success "Dockerfile security check passed"
    fi
fi

# 4.2 Configuration Security
echo "Checking configuration security..."
CONFIG_ISSUES=0

# Check for insecure configurations
if grep -r "debug.*=.*true" --include="*.py" --include="*.yaml" --include="*.yml" . 2>/dev/null | grep -v "# "; then
    report_warning "Debug mode enabled in configuration"
    CONFIG_ISSUES=1
fi

if grep -r "host.*=.*0\.0\.0\.0" --include="*.py" . 2>/dev/null; then
    report_warning "Service binding to all interfaces (0.0.0.0)"
    CONFIG_ISSUES=1
fi

if [ $CONFIG_ISSUES -eq 0 ]; then
    report_success "Configuration security check passed"
fi

# ============================================================================
# SECTION 5: DEPENDENCY ANALYSIS
# ============================================================================
report_section "Dependency Analysis"

# 5.1 License Compliance
echo "Checking license compliance..."
if [ -f "requirements.txt" ]; then
    install_if_missing "pip-licenses" "python3 -m pip install pip-licenses"

    if command -v pip-licenses &> /dev/null; then
        COPYLEFT_LICENSES=$(pip-licenses --format=json 2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    copyleft = ['GPL', 'AGPL', 'LGPL', 'CC BY-SA']
    issues = [pkg for pkg in data if any(cl in pkg.get('License', '') for cl in copyleft)]
    print(len(issues))
    for issue in issues:
        print(f'LICENSE: {issue.get(\"Name\", \"\")} - {issue.get(\"License\", \"\")}')
except:
    print('0')
" || echo "0")

        if [ "$COPYLEFT_LICENSES" != "0" ]; then
            echo "$COPYLEFT_LICENSES" | while read -r line; do
                if [[ "$line" =~ ^[0-9]+$ ]]; then
                    if [ "$line" -gt 0 ]; then
                        report_warning "Found $line packages with copyleft licenses"
                    fi
                elif [[ "$line" =~ ^LICENSE: ]]; then
                    echo "  $line"
                fi
            done
        else
            report_success "License compliance check passed"
        fi
    fi
fi

# 5.2 Outdated Dependencies
echo "Checking for outdated dependencies..."
if command -v python3 &> /dev/null; then
    OUTDATED=$(python3 -m pip list --outdated --format=json 2>/dev/null | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    print(len(data))
except:
    print('0')
" || echo "0")

    if [ "$OUTDATED" -gt 0 ]; then
        report_info "$OUTDATED packages have updates available"
        echo "  Run: python3 -m pip list --outdated for details"
    else
        report_success "All dependencies are up to date"
    fi
fi

# ============================================================================
# SECTION 6: FINAL REPORT
# ============================================================================
report_section "Security Scan Summary"

echo ""
echo "Scan Results:"
echo "============="
if [ $ISSUES_FOUND -eq 0 ] && [ $WARNINGS_FOUND -eq 0 ]; then
    echo -e "${GREEN}🎉 EXCELLENT! No security issues or warnings found!${NC}"
    echo -e "${GREEN}✨ Your code meets high security and quality standards${NC}"
elif [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Found $WARNINGS_FOUND warnings (no critical issues)${NC}"
    echo -e "${GREEN}✅ No critical security vulnerabilities detected${NC}"
else
    echo -e "${RED}❌ Found $ISSUES_FOUND critical issues and $WARNINGS_FOUND warnings${NC}"
    echo -e "${RED}🚨 Address critical issues before deploying to production${NC}"
fi

echo ""
echo "Generated Reports:"
echo "=================="
echo "📊 bandit-results.json     - Security vulnerability details"
echo "📊 bandit-results.sarif    - Bandit SARIF for GitHub Security tab"
echo "📊 osv-results.json        - OSV vulnerability database results"
echo "📊 osv-results.sarif       - OSV SARIF for GitHub Security tab"
echo "📊 safety-results.json     - Python dependency vulnerabilities"
echo "📊 safety-results.sarif    - Safety SARIF for GitHub Security tab"
[ -f "semgrep-results.json" ] && echo "📊 semgrep-results.json     - Advanced security analysis"
[ -f "semgrep.sarif" ] && echo "📊 semgrep.sarif           - Semgrep SARIF for GitHub Security tab"

echo ""
echo "Next Steps:"
echo "==========="
echo "1. Review any critical issues above"
echo "2. Run specific tools for detailed analysis:"
echo "   • bandit -r . -x ./.venv"
echo "   • safety scan --json --output safety-results.json --project config/.safety-project.ini"
echo "   • osv-scanner ."
echo "3. Fix issues and re-run this scan"
echo "4. Consider adding to CI/CD pipeline"
echo "5. Test SARIF integration locally:"
echo "   • Upload SARIF files to GitHub for testing"
echo "   • View results in Security tab"
echo "   • Validate SARIF format: https://docs.oasis-open.org/sarif/"

# Cleanup temporary files
rm -f /tmp/osv-scanner 2>/dev/null || true

# Exit with appropriate code
if [ $ISSUES_FOUND -gt 0 ]; then
    exit 1
else
    exit 0
fi
