# 🧪 Testing Guide - PowerShell Edition

**For Windows PowerShell Users**

---

## 🐍 Python Testing (PowerShell Commands)

### Test 1: Import All Fixed Modules

```powershell
# Enable verbose Python logging
$env:PYTHONVERBOSE = "1"
$env:LOG_LEVEL = "DEBUG"

# Test each fixed module
python -c "from cloud.bootstrap import deploy_gcp; print('✓ cloud.bootstrap')"
python -c "from cloud.providers.gcp import sdk; print('✓ cloud.providers.gcp.sdk')"
python -c "from cloud.providers.gcp import gcp; print('✓ cloud.providers.gcp.gcp')"
python -c "from src import agent; print('✓ src.agent')"
python -c "from src import database; print('✓ src.database')"
```

**Expected Output**: All ✓ marks, no ImportError or NameError

---

### Test 2: Run Static Analysis (Verify 0 Errors)

```powershell
# Check for undefined names (the bugs we fixed)
ruff check . --select F821

# Expected: No errors found
```

```powershell
# Run full linting suite
ruff check .

# Review any new issues
```

---

### Test 3: Test Agent Entry Point

```powershell
# Run with verbose logging
python -m src.agent --mode health 2>&1 | Tee-Object agent-test.log

# Check for errors
Select-String -Path agent-test.log -Pattern "error|nameerror|attributeerror" -CaseSensitive:$false
```

**Expected Output**:
- Health check runs without NameError
- No undefined function errors
- Database initializes correctly

---

### Test 4: Test Database Functions

```powershell
python -c @"
from src.database import get_database_stats, cleanup_old_jobs
import asyncio

async def test():
    try:
        stats = await get_database_stats()
        print(f'✓ get_database_stats() works: {stats}')
    except NameError as e:
        print(f'✗ NameError: {e}')
    except Exception as e:
        print(f'⚠ Other error (expected if no DB): {e}')

asyncio.run(test())
"@
```

**Expected Output**: No NameError about 'timedelta'

---

### Test 5: Test Cloud Bootstrap (with dry-run)

```powershell
# Dry run won't deploy, just validates
python -m cloud.bootstrap --provider gcp --dry-run --log-level debug 2>&1 | Tee-Object bootstrap-test.log

# Check for errors
Select-String -Path bootstrap-test.log -Pattern "nameerror|undefined|attributeerror" -CaseSensitive:$false
```

**Expected Output**:
- No NameError about 'env_file'
- No import errors
- Dry-run validation completes

---

## 🔵 PowerShell Testing

### Test 6: Verify PowerShell Script Syntax

```powershell
# Test scripts for syntax errors
$ErrorActionPreference = 'Stop'

# Test secure-update.ps1
try {
    . .\scripts\secure-update.ps1 -InstallPath C:\temp\test-path -ErrorAction SilentlyContinue
    Write-Host "✓ secure-update.ps1 loaded without errors" -ForegroundColor Green
} catch {
    Write-Host "✗ Error in secure-update.ps1: $_" -ForegroundColor Red
}

# Test Deploy-GCP.ps1
try {
    .\deploy\windows\engine\Deploy-GCP.ps1 -Action status
    Write-Host "✓ Deploy-GCP.ps1 executed without errors" -ForegroundColor Green
} catch {
    Write-Host "✗ Error in Deploy-GCP.ps1: $_" -ForegroundColor Red
}
```

---

### Test 7: Re-run PSScriptAnalyzer

```powershell
# Verify fixes still pass
Invoke-ScriptAnalyzer -Path scripts\secure-update.ps1 -Severity Error,Warning
# Expected: 0 warnings

Invoke-ScriptAnalyzer -Path deploy\windows\engine\Deploy-GCP.ps1 -Severity Error
# Expected: 0 errors
```

---

### Test 8: Test Deploy-GCP Status Mode

```powershell
# Run in status mode (safe, read-only)
.\deploy\windows\engine\Deploy-GCP.ps1 -Action status -Verbose 2>&1 | Tee-Object deploy-test.log

# Check log for issues
Select-String -Path deploy-test.log -Pattern "error|exception|undefined" -CaseSensitive:$false
```

---

## 🔬 Full Integration Test

### Test 9: End-to-End Agent Test (Safe Mode)

```powershell
# Set maximum debugging
$env:LOG_LEVEL = "DEBUG"
$env:PYTHONVERBOSE = "1"

# Run agent in test mode (doesn't scrape, just tests notifications)
python -m src.agent --mode test 2>&1 | Tee-Object integration-test.log

# Analyze log
Write-Host "`n=== Checking for errors ===" -ForegroundColor Yellow
Select-String -Path integration-test.log -Pattern "nameerror|undefined|attributeerror|importerror" -CaseSensitive:$false

Write-Host "`n=== Checking for warnings ===" -ForegroundColor Yellow
Select-String -Path integration-test.log -Pattern "warning" -CaseSensitive:$false

Write-Host "`n=== Summary ===" -ForegroundColor Yellow
Get-Content integration-test.log -Tail 20
```

---

## 📊 Recommended Test Sequence

### 1. Quick Validation (5 min):

```powershell
# Set environment
$env:LOG_LEVEL = "DEBUG"

# Test imports
python -c "from cloud.bootstrap import deploy_gcp; print('✓ cloud.bootstrap')"
python -c "from src import agent; print('✓ src.agent')"
python -c "from src import database; print('✓ src.database')"

# Verify static analysis
ruff check . --select F821
```

### 2. Component Testing (10 min):

```powershell
# Python health check
python -m src.agent --mode health

# PowerShell status check
.\deploy\windows\engine\Deploy-GCP.ps1 -Action status
```

### 3. Full Integration (15 min):

```powershell
# Test mode (safe, no real scraping/deployment)
python -m src.agent --mode test 2>&1 | Tee-Object test-results.log

# Review results
Get-Content test-results.log | Select-String "error|✓|✗"
```

---

## 🎯 Quick One-Command Test (PowerShell)

Run everything at once:

```powershell
# Quick validation script
$testScript = @'
Write-Host "`n=== Testing Python Imports ===" -ForegroundColor Cyan
try {
    python -c "from cloud.bootstrap import deploy_gcp; print('✓ cloud.bootstrap')"
    python -c "from src import agent; print('✓ src.agent')"
    python -c "from src import database; print('✓ src.database')"
    Write-Host "✓ All imports successful" -ForegroundColor Green
} catch {
    Write-Host "✗ Import failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Running Ruff Analysis ===" -ForegroundColor Cyan
$ruffResult = ruff check . --select F821
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ No undefined name errors found" -ForegroundColor Green
} else {
    Write-Host "✗ Ruff found errors" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Running Agent Health Check ===" -ForegroundColor Cyan
python -m src.agent --mode health
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Health check passed" -ForegroundColor Green
} else {
    Write-Host "✗ Health check failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== All Tests Passed! ===" -ForegroundColor Green
'@

Invoke-Expression $testScript
```

---

## 🚨 If You Find Errors

### 1. Capture the Full Error:
```powershell
# Run with verbose output
python -m src.agent --mode health 2>&1 | Tee-Object error-capture.log
```

### 2. Check Error Type:
```powershell
# Search for specific error types
Select-String -Path error-capture.log -Pattern "NameError|AttributeError|ImportError"
```

### 3. Provide Context:
```powershell
# Show error with context
$errorLines = Select-String -Path error-capture.log -Pattern "NameError" -Context 5,5
$errorLines | ForEach-Object { $_.Context.PreContext; $_.Line; $_.Context.PostContext }
```

### 4. Share the Log:
- Send me the full `error-capture.log`
- Include the command you ran
- Note which test failed

---

## ✅ Success Criteria

All tests pass when:

1. ✅ **Python Import Test**: All 5 modules import without error
2. ✅ **Ruff Analysis**: `ruff check . --select F821` returns 0 errors
3. ✅ **Agent Health Check**: Runs without NameError/ImportError
4. ✅ **Database Test**: No 'timedelta' NameError
5. ✅ **Bootstrap Dry-Run**: No 'env_file' errors
6. ✅ **PowerShell Syntax**: Both scripts load without errors
7. ✅ **PSScriptAnalyzer**: 0 critical warnings remain
8. ✅ **Deploy Status Mode**: Executes successfully
9. ✅ **Integration Test**: Test mode completes without errors

---

## 💡 PowerShell Tips

### Set Environment Variables (Session):
```powershell
$env:LOG_LEVEL = "DEBUG"
$env:PYTHONVERBOSE = "1"
```

### Set Environment Variables (Permanent):
```powershell
[System.Environment]::SetEnvironmentVariable('LOG_LEVEL', 'DEBUG', 'User')
```

### Capture Output:
```powershell
# Capture both stdout and stderr
command 2>&1 | Tee-Object output.log
```

### Run Multiple Commands:
```powershell
# Use semicolon or ampersand
command1; command2; command3
command1 && command2 && command3  # PowerShell 7+
```

---

**Ready to test!** Start with the Quick One-Command Test above. 🚀
