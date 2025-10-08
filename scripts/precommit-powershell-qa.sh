#!/bin/bash
# Pre-commit PowerShell QA Auto-Fix Hook
# Automatically detects and fixes PowerShell code quality issues before commit
# Exit codes: 0 = success, 1 = unfixable issues found, 2 = script error

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
QA_ENGINE="$REPO_ROOT/qa/tools/Invoke-PSQAEngine.ps1"
QA_CONFIG="$REPO_ROOT/qa/config"
TEMP_DIR=$(mktemp -d)
EXIT_CODE=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Cleanup function
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

echo -e "${BLUE}🔍 PowerShell QA Pre-commit Hook${NC}"
echo "================================="

# Check if PowerShell is available
if ! command -v pwsh >/dev/null 2>&1; then
    echo -e "${RED}❌ PowerShell (pwsh) not found. Please install PowerShell Core.${NC}"
    exit 2
fi

# Check if PSScriptAnalyzer is available
if ! pwsh -c "Get-Module -ListAvailable PSScriptAnalyzer" >/dev/null 2>&1; then
    echo -e "${RED}❌ PSScriptAnalyzer module not found. Installing...${NC}"
    pwsh -c "Install-Module -Name PSScriptAnalyzer -Force -Scope CurrentUser"
fi

# Get staged PowerShell files
STAGED_PS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ps1|psm1|psd1)$' | grep -v '\.venv/' || true)

if [[ -z "$STAGED_PS_FILES" ]]; then
    echo -e "${GREEN}✅ No PowerShell files staged for commit.${NC}"
    exit 0
fi

echo -e "${YELLOW}📁 Found PowerShell files to analyze:${NC}"
echo "$STAGED_PS_FILES" | sed 's/^/  - /'
echo

# Create temp copies of staged files for analysis
echo -e "${BLUE}🔧 Running PowerShell QA Auto-Fix...${NC}"
FILES_PROCESSED=0
FILES_FIXED=0
TOTAL_ISSUES_BEFORE=0
TOTAL_ISSUES_AFTER=0

while IFS= read -r file; do
    if [[ -z "$file" ]]; then continue; fi
    
    echo -e "${YELLOW}  Analyzing: $file${NC}"
    
    # Count issues before fix
    ISSUES_BEFORE=$(pwsh -c "
        try {
            \$issues = Invoke-ScriptAnalyzer -Path '$REPO_ROOT/$file' -Settings '$QA_CONFIG/PSScriptAnalyzerSettings.psd1' -ErrorAction Stop
            \$issues.Count
        } catch {
            Write-Output '0'
        }
    " 2>/dev/null || echo "0")
    
    TOTAL_ISSUES_BEFORE=$((TOTAL_ISSUES_BEFORE + ISSUES_BEFORE))
    
    if [[ "$ISSUES_BEFORE" -gt 0 ]]; then
        echo -e "    ${RED}Found $ISSUES_BEFORE issues - applying auto-fix...${NC}"
        
        # Run auto-fix using Make targets with correct path
        AUTOFIX_RESULT=$(cd "$REPO_ROOT" && make -C qa fix TARGET="../$file" 2>&1)
        
        if [[ "$AUTOFIX_RESULT" == *"ERROR:"* ]]; then
            echo -e "    ${RED}❌ Auto-fix failed: $AUTOFIX_RESULT${NC}"
            EXIT_CODE=1
            continue
        fi
        
        # Count issues after fix
        ISSUES_AFTER=$(pwsh -c "
            try {
                \$issues = Invoke-ScriptAnalyzer -Path '$REPO_ROOT/$file' -Settings '$QA_CONFIG/PSScriptAnalyzerSettings.psd1' -ErrorAction Stop
                \$issues.Count
            } catch {
                Write-Output '0'
            }
        " 2>/dev/null || echo "0")
        
        TOTAL_ISSUES_AFTER=$((TOTAL_ISSUES_AFTER + ISSUES_AFTER))
        
        if [[ "$ISSUES_AFTER" -eq 0 ]]; then
            echo -e "    ${GREEN}✅ All issues fixed! Re-staging file...${NC}"
            git add "$file"
            FILES_FIXED=$((FILES_FIXED + 1))
        else
            echo -e "    ${RED}❌ $ISSUES_AFTER issues remain after auto-fix${NC}"
            # Show remaining issues
            pwsh -c "
                Invoke-ScriptAnalyzer -Path '$REPO_ROOT/$file' -Settings '$QA_CONFIG/PSScriptAnalyzerSettings.psd1' | 
                Format-Table RuleName, Severity, Line, Message -AutoSize
            " 2>/dev/null || true
            EXIT_CODE=1
        fi
    else
        echo -e "    ${GREEN}✅ No issues found${NC}"
    fi
    
    FILES_PROCESSED=$((FILES_PROCESSED + 1))
done <<< "$STAGED_PS_FILES"

echo
echo -e "${BLUE}📊 PowerShell QA Summary${NC}"
echo "========================="
echo -e "Files processed: ${FILES_PROCESSED}"
echo -e "Files auto-fixed: ${FILES_FIXED}"
echo -e "Issues before: ${TOTAL_ISSUES_BEFORE}"
echo -e "Issues after: ${TOTAL_ISSUES_AFTER}"

if [[ $EXIT_CODE -eq 0 ]]; then
    if [[ $FILES_FIXED -gt 0 ]]; then
        echo -e "${GREEN}🎉 All PowerShell files automatically fixed and re-staged!${NC}"
        echo -e "${YELLOW}💡 Please review the auto-fixes before committing.${NC}"
    else
        echo -e "${GREEN}✅ All PowerShell files pass quality checks!${NC}"
    fi
else
    echo -e "${RED}❌ Some PowerShell files have unfixable quality issues.${NC}"
    echo -e "${YELLOW}💡 Please review and fix manually, then re-commit.${NC}"
fi

exit $EXIT_CODE