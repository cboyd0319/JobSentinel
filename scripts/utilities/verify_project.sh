#!/usr/bin/env bash
#
# Project Verification Script
# Checks for bugs, errors, lack of clarity, security issues, and automation gaps
#
# Usage: bash scripts/verify_project.sh

set -e  # Exit on error

echo "========================================================================"
echo "PROJECT VERIFICATION - Checking for bugs, errors, security issues"
echo "========================================================================"
echo ""

ERRORS=0
WARNINGS=0

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

error() {
    echo -e "${RED}✗ ERROR:${NC} $1"
    ERRORS=$((ERRORS + 1))
}

warning() {
    echo -e "${YELLOW}⚠ WARNING:${NC} $1"
    WARNINGS=$((WARNINGS + 1))
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

info() {
    echo "  $1"
}

echo "1. Checking Python syntax..."
if python3 -m compileall src utils sources cloud notify matchers scripts -q; then
    success "All Python files compile successfully"
else
    error "Python syntax errors detected"
fi
echo ""

echo "2. Checking for security issues..."

# Check .env not in git
if git ls-files | grep -q "^\.env$"; then
    error ".env file is tracked by git (SECURITY ISSUE)"
else
    success ".env is not tracked by git"
fi

# Check for hardcoded secrets
if grep -r "sk-[a-zA-Z0-9]" --include="*.py" src utils cloud 2>/dev/null | grep -v "example\|placeholder"; then
    error "Potential hardcoded API keys detected"
else
    success "No hardcoded API keys detected"
fi

# Check for TODO security items
TODO_COUNT=$(grep -r "TODO.*security\|FIXME.*security" --include="*.py" src utils cloud 2>/dev/null | wc -l)
if [ "$TODO_COUNT" -gt 0 ]; then
    warning "Found $TODO_COUNT security-related TODOs"
else
    success "No pending security TODOs"
fi

echo ""

echo "3. Checking documentation clarity..."

# Check for "we" in user-facing docs (should use "I" or "you")
WE_COUNT=$(grep -r "\bwe\b" README.md COST.md SECURITY.md docs/*.md 2>/dev/null | wc -l)
if [ "$WE_COUNT" -gt 0 ]; then
    warning "Found $WE_COUNT instances of 'we' in docs (tone guide violation)"
else
    success "Documentation follows tone guide (no 'we')"
fi

# Check for alpha warning
if grep -q "ALPHA" README.md && grep -q "ALPHA" LICENSE; then
    success "Alpha warnings present in README and LICENSE"
else
    warning "Missing alpha warnings"
fi

echo ""

echo "4. Checking for required files..."

REQUIRED_FILES=(
    "README.md"
    "LICENSE"
    "COST.md"
    "SECURITY.md"
    "QUICK_START.md"
    "requirements.txt"
    ".gitignore"
    "docs/SLACK_SETUP.md"
    "docs/RESUME_RESOURCES.md"
    "src/domains/ats/__init__.py"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        success "Found $file"
    else
        error "Missing required file: $file"
    fi
done

echo ""

echo "5. Checking automation..."

# Check if Slack wizard exists and is executable
if [ -f "scripts/slack_bootstrap.py" ]; then
    if python3 scripts/slack_bootstrap.py --help >/dev/null 2>&1 || [ $? -eq 0 ]; then
        success "Slack wizard is functional"
    else
        info "Slack wizard exists (interactive, no --help flag)"
    fi
else
    error "Slack wizard missing"
fi

# Check if ATS analyzer is accessible (new domain architecture)
if python3 -c "from src.domains.ats import ATSAnalysisService" 2>/dev/null; then
    success "ATS analyzer module loads successfully"
else
    warning "ATS analyzer may be missing dependencies (install with pip install -r requirements.txt)"
fi

echo ""

echo "6. Checking for duplicate files..."

# Check for HTML files in root (should be in templates/)
if ls *.html 2>/dev/null | grep -v "^$"; then
    error "HTML files found in root directory"
else
    success "No duplicate HTML files in root"
fi

# Check for duplicate agents directories
if [ -d "agents" ]; then
    warning "Duplicate agents/ directory exists (.claude/agents/ is canonical)"
fi

echo ""

echo "7. Checking dependencies..."

if [ -f "requirements.txt" ]; then
    # Count dependencies
    DEP_COUNT=$(grep -v "^#" requirements.txt | grep -v "^$" | wc -l)
    info "Found $DEP_COUNT dependencies in requirements.txt"

    # Check for version pins
    UNPINNED=$(grep -v "^#" requirements.txt | grep -v "^$" | grep -v "[<>=]" | wc -l)
    if [ "$UNPINNED" -gt 0 ]; then
        warning "$UNPINNED dependencies without version constraints"
    else
        success "All dependencies have version constraints"
    fi
fi

echo ""

echo "8. Checking for cache files..."

CACHE_COUNT=$(find . -name "__pycache__" -o -name "*.pyc" 2>/dev/null | wc -l)
if [ "$CACHE_COUNT" -gt 0 ]; then
    warning "Found $CACHE_COUNT cache files/directories (run: find . -name '__pycache__' -exec rm -rf {} +)"
else
    success "No Python cache files found"
fi

echo ""

echo "========================================================================"
echo "VERIFICATION SUMMARY"
echo "========================================================================"
echo ""

if [ "$ERRORS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}✓ EXCELLENT!${NC} No errors or warnings detected."
    echo "  Project is clean and ready for use."
elif [ "$ERRORS" -eq 0 ]; then
    echo -e "${YELLOW}✓ GOOD${NC} - No critical errors, but found $WARNINGS warnings."
    echo "  Review warnings above and address if needed."
else
    echo -e "${RED}✗ ISSUES DETECTED${NC}"
    echo "  Errors: $ERRORS"
    echo "  Warnings: $WARNINGS"
    echo ""
    echo "  Please fix errors before deploying."
fi

echo ""
echo "Next steps:"
echo "  1. Fix any errors/warnings above"
echo "  2. Install dependencies: pip install -r requirements.txt"
echo "  3. Test Slack setup: python scripts/slack_setup.py"
echo "  4. Test ATS analyzer: python -m src.domains.ats.cli <resume.pdf>"
echo "  5. Review QUICK_START.md for usage instructions"
echo ""

exit $ERRORS
