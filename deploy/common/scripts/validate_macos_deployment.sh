#!/usr/bin/env bash
#
# macOS Deployment Validation Script
#
# Comprehensive validation of JobSentinel macOS deployment.
# Tests all features, scripts, and documentation for completeness.
#
# Usage:
#   ./scripts/validate_macos_deployment.sh
#
# Returns:
#   0 if all validations pass
#   1 if any validation fails

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Catch errors in pipelines

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

# Print functions
print_header() {
    echo ""
    echo -e "${CYAN}========================================================================${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}========================================================================${NC}"
    echo ""
}

print_test() {
    echo -e "${YELLOW}Testing: $1${NC}"
}

print_pass() {
    echo -e "${GREEN}✓ PASS: $1${NC}"
    ((PASS_COUNT++))
}

print_fail() {
    echo -e "${RED}✗ FAIL: $1${NC}"
    ((FAIL_COUNT++))
}

print_skip() {
    echo -e "${YELLOW}⊘ SKIP: $1${NC}"
    ((SKIP_COUNT++))
}

# Banner
echo ""
echo "========================================================================"
echo "          JobSentinel macOS Deployment Validation"
echo "========================================================================"
echo ""
echo "This script validates the complete macOS deployment."
echo ""

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${YELLOW}Warning: Not running on macOS. Some tests will be skipped.${NC}"
    echo ""
fi

# ============================================================================
# FILE EXISTENCE CHECKS
# ============================================================================

print_header "File Existence Checks"

# Setup scripts
print_test "setup-macos.sh exists"
if [[ -f "setup-macos.sh" ]]; then
    print_pass "setup-macos.sh found"
else
    print_fail "setup-macos.sh not found"
fi

print_test "scripts/macos_setup.py exists"
if [[ -f "scripts/macos_setup.py" ]]; then
    print_pass "scripts/macos_setup.py found"
else
    print_fail "scripts/macos_setup.py not found"
fi

# Launcher scripts
print_test "launch-gui.sh exists"
if [[ -f "launch-gui.sh" ]]; then
    print_pass "launch-gui.sh found"
else
    print_fail "launch-gui.sh not found"
fi

# Python modules
print_test "src/jsa/macos_precheck.py exists"
if [[ -f "src/jsa/macos_precheck.py" ]]; then
    print_pass "src/jsa/macos_precheck.py found"
else
    print_fail "src/jsa/macos_precheck.py not found"
fi

print_test "src/jsa/macos_shortcuts.py exists"
if [[ -f "src/jsa/macos_shortcuts.py" ]]; then
    print_pass "src/jsa/macos_shortcuts.py found"
else
    print_fail "src/jsa/macos_shortcuts.py not found"
fi

# Documentation
print_test "docs/MACOS_QUICK_START.md exists"
if [[ -f "docs/MACOS_QUICK_START.md" ]]; then
    print_pass "MACOS_QUICK_START.md found"
else
    print_fail "MACOS_QUICK_START.md not found"
fi

print_test "docs/MACOS_TROUBLESHOOTING.md exists"
if [[ -f "docs/MACOS_TROUBLESHOOTING.md" ]]; then
    print_pass "MACOS_TROUBLESHOOTING.md found"
else
    print_fail "MACOS_TROUBLESHOOTING.md not found"
fi

print_test "docs/MACOS_DEPLOYMENT_CHECKLIST.md exists"
if [[ -f "docs/MACOS_DEPLOYMENT_CHECKLIST.md" ]]; then
    print_pass "MACOS_DEPLOYMENT_CHECKLIST.md found"
else
    print_fail "MACOS_DEPLOYMENT_CHECKLIST.md not found"
fi

# Tests
print_test "tests/test_macos_deployment.py exists"
if [[ -f "tests/test_macos_deployment.py" ]]; then
    print_pass "test_macos_deployment.py found"
else
    print_fail "test_macos_deployment.py not found"
fi

print_test "tests/test_macos_enhancements.py exists"
if [[ -f "tests/test_macos_enhancements.py" ]]; then
    print_pass "test_macos_enhancements.py found"
else
    print_fail "test_macos_enhancements.py not found"
fi

# ============================================================================
# SCRIPT PERMISSIONS
# ============================================================================

print_header "Script Permissions"

print_test "setup-macos.sh is executable"
if [[ -x "setup-macos.sh" ]]; then
    print_pass "setup-macos.sh is executable"
else
    print_fail "setup-macos.sh is not executable"
fi

print_test "scripts/macos_setup.py is executable"
if [[ -x "scripts/macos_setup.py" ]]; then
    print_pass "scripts/macos_setup.py is executable"
else
    print_fail "scripts/macos_setup.py is not executable"
fi

print_test "launch-gui.sh is executable"
if [[ -x "launch-gui.sh" ]]; then
    print_pass "launch-gui.sh is executable"
else
    print_fail "launch-gui.sh is not executable"
fi

# ============================================================================
# SCRIPT SYNTAX CHECKS
# ============================================================================

print_header "Script Syntax Checks"

print_test "setup-macos.sh has shebang"
if head -n 1 "setup-macos.sh" | grep -q "^#!/usr/bin/env bash"; then
    print_pass "setup-macos.sh has correct shebang"
else
    print_fail "setup-macos.sh missing or incorrect shebang"
fi

print_test "launch-gui.sh has shebang"
if head -n 1 "launch-gui.sh" | grep -q "^#!/usr/bin/env bash"; then
    print_pass "launch-gui.sh has correct shebang"
else
    print_fail "launch-gui.sh missing or incorrect shebang"
fi

print_test "scripts/macos_setup.py has shebang"
if head -n 1 "scripts/macos_setup.py" | grep -q "^#!/usr/bin/env python"; then
    print_pass "scripts/macos_setup.py has correct shebang"
else
    print_fail "scripts/macos_setup.py missing or incorrect shebang"
fi

# ============================================================================
# PYTHON MODULE IMPORTS
# ============================================================================

print_header "Python Module Import Checks"

# Determine Python command
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    print_fail "Python not found"
    PYTHON_CMD=""
fi

if [[ -n "$PYTHON_CMD" ]]; then
    print_test "macos_precheck module imports"
    if $PYTHON_CMD -c "from jsa.macos_precheck import MacOSPreCheck" 2>/dev/null; then
        print_pass "macos_precheck module imports successfully"
    else
        print_fail "macos_precheck module import failed"
    fi

    print_test "macos_shortcuts module imports"
    if $PYTHON_CMD -c "from jsa.macos_shortcuts import create_command_file" 2>/dev/null; then
        print_pass "macos_shortcuts module imports successfully"
    else
        print_fail "macos_shortcuts module import failed"
    fi
else
    print_skip "Python module checks (Python not found)"
fi

# ============================================================================
# DOCUMENTATION CONTENT CHECKS
# ============================================================================

print_header "Documentation Content Checks"

print_test "MACOS_QUICK_START.md mentions Homebrew"
if grep -q "Homebrew\|brew" "docs/MACOS_QUICK_START.md"; then
    print_pass "Quick start mentions Homebrew"
else
    print_fail "Quick start doesn't mention Homebrew"
fi

print_test "MACOS_QUICK_START.md mentions .command files"
if grep -q "\.command" "docs/MACOS_QUICK_START.md"; then
    print_pass "Quick start mentions .command files"
else
    print_fail "Quick start doesn't mention .command files"
fi

print_test "MACOS_TROUBLESHOOTING.md mentions Gatekeeper"
if grep -q "Gatekeeper" "docs/MACOS_TROUBLESHOOTING.md"; then
    print_pass "Troubleshooting mentions Gatekeeper"
else
    print_fail "Troubleshooting doesn't mention Gatekeeper"
fi

print_test "MACOS_TROUBLESHOOTING.md mentions Apple Silicon"
if grep -q "Apple Silicon\|M1\|M2\|M3" "docs/MACOS_TROUBLESHOOTING.md"; then
    print_pass "Troubleshooting mentions Apple Silicon"
else
    print_fail "Troubleshooting doesn't mention Apple Silicon"
fi

# ============================================================================
# FEATURE PARITY CHECKS
# ============================================================================

print_header "Feature Parity with Windows"

print_test "macOS has setup script (like Windows)"
if [[ -f "setup-macos.sh" ]] && [[ -f "setup-windows.ps1" ]]; then
    print_pass "Both macOS and Windows have setup scripts"
else
    print_fail "Setup script missing for one platform"
fi

print_test "macOS has GUI launcher (like Windows)"
if [[ -f "launch-gui.sh" ]] && [[ -f "launch-gui.ps1" ]]; then
    print_pass "Both macOS and Windows have GUI launchers"
else
    print_fail "GUI launcher missing for one platform"
fi

print_test "macOS has precheck module (like Windows)"
if [[ -f "src/jsa/macos_precheck.py" ]] && [[ -f "src/jsa/windows_precheck.py" ]]; then
    print_pass "Both macOS and Windows have precheck modules"
else
    print_fail "Precheck module missing for one platform"
fi

print_test "macOS has shortcuts module (like Windows)"
if [[ -f "src/jsa/macos_shortcuts.py" ]] && [[ -f "src/jsa/windows_shortcuts.py" ]]; then
    print_pass "Both macOS and Windows have shortcuts modules"
else
    print_fail "Shortcuts module missing for one platform"
fi

# ============================================================================
# TEST EXECUTION (if on macOS)
# ============================================================================

if [[ "$OSTYPE" == "darwin"* ]] && [[ -n "$PYTHON_CMD" ]]; then
    print_header "Running macOS Tests"

    print_test "Running test_macos_deployment.py"
    if $PYTHON_CMD -m pytest tests/test_macos_deployment.py -v --tb=short 2>/dev/null; then
        print_pass "test_macos_deployment.py passed"
    else
        print_fail "test_macos_deployment.py failed"
    fi

    print_test "Running test_macos_enhancements.py"
    if $PYTHON_CMD -m pytest tests/test_macos_enhancements.py -v --tb=short 2>/dev/null; then
        print_pass "test_macos_enhancements.py passed"
    else
        print_fail "test_macos_enhancements.py failed"
    fi
else
    print_skip "Test execution (not on macOS or Python not available)"
fi

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "========================================================================"
echo "                          Validation Summary"
echo "========================================================================"
echo ""
echo -e "${GREEN}Passed:  $PASS_COUNT${NC}"
echo -e "${RED}Failed:  $FAIL_COUNT${NC}"
echo -e "${YELLOW}Skipped: $SKIP_COUNT${NC}"
echo ""

TOTAL_TESTS=$((PASS_COUNT + FAIL_COUNT))
if [[ $TOTAL_TESTS -gt 0 ]]; then
    PASS_RATE=$((PASS_COUNT * 100 / TOTAL_TESTS))
    echo "Pass Rate: ${PASS_RATE}%"
    echo ""
fi

if [[ $FAIL_COUNT -eq 0 ]]; then
    echo -e "${GREEN}✓ All validations passed!${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some validations failed. See details above.${NC}"
    echo ""
    exit 1
fi
