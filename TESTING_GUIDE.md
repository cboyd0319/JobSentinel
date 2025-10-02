# 🧪 Testing Guide - Full Debugging & Error Detection

**Purpose**: Test all fixed bugs with maximum logging to catch any remaining issues.

---

## 📋 Pre-Test Checklist

✅ All Python bugs fixed (8 NameErrors)
✅ All PowerShell bugs fixed (13 warnings)
✅ Static analysis tools installed (ruff, PSScriptAnalyzer)

---

## 🐍 Python Testing

### Test 1: Import All Fixed Modules

**Purpose**: Verify all NameError fixes work

```bash
# Enable verbose Python logging
export PYTHONVERBOSE=1

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

```bash
# Check for undefined names (the bugs we fixed)
ruff check . --select F821

# Expected: No errors found
```

```bash
# Run full linting suite
ruff check .

# Review any new issues
```

---

### Test 3: Test Agent Entry Point

**Purpose**: Verify parse_args() and init_unified_db() fixes

```bash
# Run with verbose logging
python -m src.agent --mode health 2>&1 | tee agent-test.log

# Check for errors
grep -i "error\|nameerror\|attributeerror" agent-test.log
```

**Expected Output**:
- Health check runs without NameError
- No undefined function errors
- Database initializes correctly

---

### Test 4: Test Database Functions

**Purpose**: Verify timedelta import fix

```bash
python -c "
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
"
```

**Expected Output**: No NameError about 'timedelta'

---

### Test 5: Test Cloud Bootstrap (with dry-run)

**Purpose**: Verify env_file fix and all imports

```bash
# Dry run won't deploy, just validates
python -m cloud.bootstrap --provider gcp --dry-run --log-level debug 2>&1 | tee bootstrap-test.log

# Check for errors
grep -i "nameerror\|undefined\|attributeerror" bootstrap-test.log
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
powershell -Command "
    \$ErrorActionPreference = 'Stop'
    . .\scripts\secure-update.ps1 -InstallPath C:\temp\test-path -ErrorAction SilentlyContinue
    Write-Host '✓ secure-update.ps1 loaded without errors'
"

powershell -Command "
    \$ErrorActionPreference = 'Stop'
    . .\deploy\windows\engine\Deploy-GCP.ps1 -Action status
    Write-Host '✓ Deploy-GCP.ps1 executed without errors'
"
```

**Expected Output**: Both scripts load/run without errors

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

**Purpose**: Test all our fixes in a real execution

```powershell
# Run in status mode (safe, read-only)
.\deploy\windows\engine\Deploy-GCP.ps1 -Action status -Verbose 2>&1 | Tee-Object deploy-test.log

# Check log for issues
Select-String -Path deploy-test.log -Pattern "error|exception|undefined" -CaseSensitive:$false
```

**Expected Output**:
- Script executes without errors
- Uses Write-Output (not Write-Host)
- New-Directory function works (not Ensure-Directory)
- Logging functions work without empty catch blocks

---

## 🔬 Full Integration Test

### Test 9: End-to-End Agent Test (Safe Mode)

```bash
# Set maximum debugging
export LOG_LEVEL=DEBUG
export PYTHONVERBOSE=1

# Run agent in test mode (doesn't scrape, just tests notifications)
python -m src.agent --mode test 2>&1 | tee integration-test.log

# Analyze log
echo "=== Checking for errors ==="
grep -i "nameerror\|undefined\|attributeerror\|importerror" integration-test.log

echo "=== Checking for warnings ==="
grep -i "warning" integration-test.log

echo "=== Summary ==="
tail -20 integration-test.log
```

**Expected Output**:
- All imports succeed
- Test notifications execute
- No NameError exceptions
- No undefined variable/function errors

---

## 📊 Recommended Test Sequence

Run tests in this order:

1. **Quick Validation** (5 min):
   ```bash
   # Test imports
   python -c "from cloud.bootstrap import deploy_gcp"
   python -c "from src import agent"
   python -c "from src import database"

   # Verify static analysis
   ruff check . --select F821
   ```

2. **Component Testing** (10 min):
   ```bash
   # Python health check
   python -m src.agent --mode health

   # PowerShell status check
   powershell -Command ".\deploy\windows\engine\Deploy-GCP.ps1 -Action status"
   ```

3. **Full Integration** (15 min):
   ```bash
   # Test mode (safe, no real scraping/deployment)
   python -m src.agent --mode test
   ```

---

## 🐛 What to Look For

### Python Errors to Watch:
- ❌ `NameError: name 'X' is not defined`
- ❌ `ImportError: cannot import name 'X'`
- ❌ `AttributeError: module 'X' has no attribute 'Y'`

### PowerShell Errors to Watch:
- ❌ `The term 'Ensure-Directory' is not recognized` (should be New-Directory)
- ❌ `Write-Host` in output (should be Write-Output)
- ❌ Silent failures from empty catch blocks

### Success Indicators:
- ✅ All imports work
- ✅ Functions execute without NameError
- ✅ Logging appears in output
- ✅ Health checks pass
- ✅ Test mode completes

---

## 📝 Logging Best Practices

### Enable Maximum Logging:

**Python**:
```bash
# Set in environment or .env file
LOG_LEVEL=DEBUG
PYTHONVERBOSE=1
PYTHONWARNINGS=all
```

**PowerShell**:
```powershell
# Run with -Verbose flag
.\deploy\windows\engine\Deploy-GCP.ps1 -Action status -Verbose -Debug
```

### Capture All Output:

```bash
# Capture both stdout and stderr
python -m src.agent --mode health 2>&1 | tee full-output.log

# PowerShell equivalent
.\deploy\windows\engine\Deploy-GCP.ps1 -Action status 2>&1 | Tee-Object ps-output.log
```

---

## 🚨 If You Find Errors

### 1. Capture the Full Error:
```bash
# Run with verbose output
python -m src.agent --mode health -v 2>&1 | tee error-capture.log
```

### 2. Check Error Type:
- **NameError** = Missing import or undefined variable
- **AttributeError** = Trying to access non-existent attribute
- **ImportError** = Module not found or circular import

### 3. Provide Context:
```bash
# Show the error with surrounding context
grep -A 5 -B 5 "NameError" error-capture.log
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

## 🎯 Quick One-Command Test

Run everything at once:

```bash
# Quick validation script
cat > quick-test.sh << 'EOF'
#!/bin/bash
set -e

echo "=== Testing Python Imports ==="
python -c "from cloud.bootstrap import deploy_gcp; print('✓ cloud.bootstrap')" || exit 1
python -c "from src import agent; print('✓ src.agent')" || exit 1
python -c "from src import database; print('✓ src.database')" || exit 1

echo ""
echo "=== Running Ruff Analysis ==="
ruff check . --select F821 || exit 1

echo ""
echo "=== Running Agent Health Check ==="
python -m src.agent --mode health || exit 1

echo ""
echo "=== All Tests Passed! ==="
EOF

chmod +x quick-test.sh
./quick-test.sh
```

---

**Questions? Found an error?**
1. Run the test that failed with `2>&1 | tee error.log`
2. Share the `error.log` with me
3. I'll identify and fix the issue immediately

---

*Happy Testing! All bugs should be squashed, but thorough testing ensures quality.* 🐛✨
