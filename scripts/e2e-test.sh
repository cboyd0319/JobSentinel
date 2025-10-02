#!/bin/bash
# Comprehensive End-to-End Test Script
# Tests all components without requiring GCP deployment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         COMPREHENSIVE END-TO-END TEST SUITE                  ║${NC}"
echo -e "${BLUE}║         Fresh Environment - Debug Mode                       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Test 1: Python Syntax Check
echo -e "${BLUE}[TEST 1] Python Syntax Validation${NC}"
if python3 -m py_compile cloud/bootstrap.py cloud/providers/gcp/gcp.py utils/resume_parser.py scripts/validate-deployment.py 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} All Python files compile successfully"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Python compilation failed"
    ((FAILED++))
fi
echo ""

# Test 2: Bootstrap Help
echo -e "${BLUE}[TEST 2] Bootstrap Entry Point${NC}"
if python3 -m cloud.bootstrap --help > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Bootstrap module loads correctly"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Bootstrap module failed to load"
    ((FAILED++))
fi
echo ""

# Test 3: Bootstrap Version
echo -e "${BLUE}[TEST 3] Bootstrap Version${NC}"
VERSION=$(python3 -m cloud.bootstrap --version 2>&1)
EXPECTED_VERSION=$(python3 -c "import tomllib; print(tomllib.load(open('pyproject.toml', 'rb'))['project']['version'])")
if [[ $VERSION == *"$EXPECTED_VERSION"* ]]; then
    echo -e "  ${GREEN}✓${NC} Version check: $VERSION (matches pyproject.toml)"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Version mismatch: $VERSION (expected $EXPECTED_VERSION)"
    ((FAILED++))
fi
echo ""

# Test 4: Wrapper Script
echo -e "${BLUE}[TEST 4] Deploy Wrapper Script${NC}"
if bash scripts/deploy-cloud.sh --help > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Wrapper script works correctly"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Wrapper script failed"
    ((FAILED++))
fi
echo ""

# Test 5: Wrapper Dry-Run
echo -e "${BLUE}[TEST 5] Wrapper Dry-Run Mode${NC}"
if bash scripts/deploy-cloud.sh --dry-run gcp 2>&1 | grep -q "Would execute"; then
    echo -e "  ${GREEN}✓${NC} Dry-run mode works correctly"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Dry-run mode failed"
    ((FAILED++))
fi
echo ""

# Test 6: Validation Script List
echo -e "${BLUE}[TEST 6] Deployment Validation Script${NC}"
if python3 scripts/validate-deployment.py --list 2>&1 | grep -q "No deployments found"; then
    echo -e "  ${GREEN}✓${NC} Validation script works (no deployments)"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Validation script failed"
    ((FAILED++))
fi
echo ""

# Test 7: Terraform Init
echo -e "${BLUE}[TEST 7] Terraform Initialization${NC}"
if terraform -chdir=terraform/gcp init -backend=false > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Terraform initializes successfully"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Terraform initialization failed"
    ((FAILED++))
fi
echo ""

# Test 8: Terraform Validate
echo -e "${BLUE}[TEST 8] Terraform Configuration Validation${NC}"
if terraform -chdir=terraform/gcp validate > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Terraform configuration is valid"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Terraform validation failed"
    ((FAILED++))
fi
echo ""

# Test 9: Terraform Format Check
echo -e "${BLUE}[TEST 9] Terraform Formatting${NC}"
UNFORMATTED=$(terraform -chdir=terraform/gcp fmt -check -recursive 2>&1)
if [[ -z "$UNFORMATTED" ]]; then
    echo -e "  ${GREEN}✓${NC} All Terraform files properly formatted"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠${NC}  Some files need formatting: $UNFORMATTED"
    ((WARNINGS++))
fi
echo ""

# Test 10: Configuration Files
echo -e "${BLUE}[TEST 10] Configuration Files Present${NC}"
MISSING=0
if [[ ! -f "config/user_prefs.example.json" ]]; then
    echo -e "  ${RED}✗${NC} Missing: config/user_prefs.example.json"
    ((MISSING++))
else
    echo -e "  ${GREEN}✓${NC} Found: config/user_prefs.example.json"
fi

if [[ ! -f ".env.example" ]]; then
    echo -e "  ${RED}✗${NC} Missing: .env.example"
    ((MISSING++))
else
    echo -e "  ${GREEN}✓${NC} Found: .env.example"
fi

if [[ ! -f "terraform/gcp/terraform.tfvars.example" ]]; then
    echo -e "  ${RED}✗${NC} Missing: terraform.tfvars.example"
    ((MISSING++))
else
    echo -e "  ${GREEN}✓${NC} Found: terraform.tfvars.example"
fi

if [[ $MISSING -eq 0 ]]; then
    ((PASSED++))
else
    ((FAILED++))
fi
echo ""

# Test 11: JSON Configuration Validation
echo -e "${BLUE}[TEST 11] JSON Configuration Validation${NC}"
if python3 -c "import json; json.load(open('config/user_prefs.example.json'))" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} user_prefs.example.json is valid JSON"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} user_prefs.example.json is invalid JSON"
    ((FAILED++))
fi
echo ""

# Test 12: Resume Parser Import
echo -e "${BLUE}[TEST 12] Resume Parser Module${NC}"
if python3 -c "from utils.resume_parser import ResumeParser, check_dependencies; print('OK')" 2>/dev/null | grep -q "OK"; then
    echo -e "  ${GREEN}✓${NC} Resume parser module loads"
    ((PASSED++))
else
    echo -e "  ${RED}✗${NC} Resume parser import failed"
    ((FAILED++))
fi
echo ""

# Test 13: Check No State Exists
echo -e "${BLUE}[TEST 13] Clean State Verification${NC}"
if [[ ! -d "$HOME/.job-scraper" ]]; then
    echo -e "  ${GREEN}✓${NC} No existing deployment state"
    ((PASSED++))
else
    echo -e "  ${YELLOW}⚠${NC}  Deployment state exists (not fresh)"
    ((WARNINGS++))
fi
echo ""

# Summary
echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                       TEST SUMMARY                           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${GREEN}Passed:${NC}   $PASSED"
echo -e "  ${RED}Failed:${NC}   $FAILED"
echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

TOTAL=$((PASSED + FAILED))
if [[ $FAILED -eq 0 ]]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    exit 1
fi
