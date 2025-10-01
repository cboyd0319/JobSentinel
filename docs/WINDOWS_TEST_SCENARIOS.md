# Windows-to-GCP Deployment Test Scenarios

Comprehensive testing guide for `scripts/Deploy-Windows-to-GCP.ps1` to ensure flawless operation.

---

## Prerequisites

- **Test Environment**: Windows 10/11 with PowerShell 7+ (or 5.1)
- **Required Tools**: Python 3.12+, gcloud CLI
- **Test Project**: Clean GCP project or quota to create one
- **Network**: Internet access for GCP API calls

---

## Test Scenario 1: Fresh Deployment (Happy Path)

**Description**: First-time deployment on a clean Windows system with all prerequisites installed.

### Pre-conditions
- Python 3.12+ installed and in PATH
- gcloud CLI installed and authenticated (`gcloud auth list` shows active account)
- No existing deployment (no `terraform.tfstate`)
- GCP project quota available (or existing projects to reuse)

### Test Steps
```powershell
cd \path\to\job-private-scraper-filter
.\scripts\Deploy-Windows-to-GCP.ps1 deploy
```

### Expected Results
✅ **Banner displays**: "Windows → GCP Deployment" with styled borders
✅ **Prerequisites check**: All green checkmarks
✅ **Configuration panel**: Shows provider, architecture, cost estimate
✅ **Confirmation prompt**: Asks "Proceed with deployment? [Y/n]"
✅ **Python bootstrap runs**: Real-time output shown with horizontal dividers
✅ **Exit code 0**: Deployment completes successfully
✅ **Receipt generated**: `deployment-receipt.md` created
✅ **Next steps shown**: Commands for monitoring and triggering jobs

### Log Validation
```powershell
# Check log file exists
Test-Path logs\deploy.log

# Verify no errors (exit code 0)
$LASTEXITCODE -eq 0

# Check receipt exists
Test-Path deployment-receipt.md
```

---

## Test Scenario 2: Update Existing Deployment (Idempotent)

**Description**: Re-run deployment on an existing GCP project (should be idempotent).

### Pre-conditions
- Deployment already completed (Scenario 1 passed)
- `terraform.tfstate` exists in `terraform/gcp/`
- GCP resources already created

### Test Steps
```powershell
.\scripts\Deploy-Windows-to-GCP.ps1 update
```

### Expected Results
✅ **Update banner**: "Update GCP Deployment"
✅ **Info panel**: Explains update operation, no data loss
✅ **Terraform detects changes**: Shows "No changes" or applies only diffs
✅ **Exit code 0**: Update completes successfully
✅ **No resource recreation**: Existing resources untouched unless code changed

---

## Test Scenario 3: Teardown with Confirmation

**Description**: Safely destroy all GCP resources with user confirmation.

### Pre-conditions
- Deployment exists (Scenarios 1-2 passed)
- Active GCP project configured (`gcloud config get-value project`)

### Test Steps
```powershell
.\scripts\Deploy-Windows-to-GCP.ps1 teardown
```

### Expected Results
✅ **Warning banner**: "Teardown GCP Deployment" in yellow/red
✅ **Destructive operation panel**: Lists all resources to be deleted
✅ **Strict confirmation**: Requires typing `"yes delete everything"`
✅ **Wrong confirmation cancels**: Typing anything else exits safely
✅ **Terraform destroy runs**: Shows resource deletion progress
✅ **Completion message**: "Teardown complete!" with next steps
✅ **Project remains**: GCP project exists but is empty

### Log Validation
```powershell
# Verify resources deleted
gcloud run jobs list --format="value(name)" | Should -BeNullOrEmpty

# Terraform state should be empty
cd terraform\gcp
terraform state list | Should -BeNullOrEmpty
```

---

## Test Scenario 4: Force Teardown (Skip Confirmation)

**Description**: Automated teardown without confirmation prompts.

### Pre-conditions
- Deployment exists

### Test Steps
```powershell
.\scripts\Deploy-Windows-to-GCP.ps1 teardown -Force
```

### Expected Results
✅ **Warning shown**: "FORCE MODE: Skipping confirmation!"
✅ **2-second delay**: Brief pause before destruction begins
✅ **No user input required**: Proceeds directly to `terraform destroy`
✅ **Exit code 0**: Teardown completes

---

## Test Scenario 5: Status Check

**Description**: Query current deployment state without making changes.

### Pre-conditions
- gcloud authenticated
- Project selected (or none)

### Test Steps
```powershell
.\scripts\Deploy-Windows-to-GCP.ps1 status
```

### Expected Results
✅ **Configuration shown**: Project ID, account, region
✅ **Cloud Run jobs listed**: Shows deployed jobs (if any)
✅ **Links provided**: Console URL, log commands
✅ **No prerequisites check**: Runs even without Python
✅ **No modifications**: Read-only operation

---

## Error Recovery Scenarios

### ER-1: Missing Python

**Setup**: Temporarily remove Python from PATH or uninstall
**Command**: `.\scripts\Deploy-Windows-to-GCP.ps1 deploy`
**Expected**:
❌ Red error panel: "Missing Prerequisites"
📋 Shows: "Python not found or not in PATH"
🔗 Provides: Download link (python.org)
🛑 Exits with code 1

---

### ER-2: Missing gcloud CLI

**Setup**: Temporarily remove gcloud from PATH
**Command**: `.\scripts\Deploy-Windows-to-GCP.ps1 deploy`
**Expected**:
❌ Red error panel: "Missing Prerequisites"
📋 Shows: "gcloud CLI not installed"
🔗 Provides: Download link (cloud.google.com/sdk)
🛑 Exits with code 1

---

### ER-3: Not Authenticated to GCP

**Setup**: `gcloud auth revoke` to remove credentials
**Command**: `.\scripts\Deploy-Windows-to-GCP.ps1 deploy`
**Expected**:
⚠️ Warning: "Not authenticated to GCP"
🔄 Auto-runs: `gcloud auth login` (opens browser)
✅ After login: Continues with deployment
⛔ If login fails: Exits with error

---

### ER-4: GCP Project Quota Exceeded

**Setup**: User has 12+ projects (free tier limit)
**Command**: `.\scripts\Deploy-Windows-to-GCP.ps1 deploy`
**Expected**:
⚠️ Python bootstrap detects quota issue
♻️ Auto-reuses existing project (`bot-yglprl` or similar)
📊 Log shows: "Auto-selected: bot-yglprl"
✅ Deployment continues successfully

---

### ER-5: Python Bootstrap Failure (Generic)

**Setup**: Simulate failure by modifying bootstrap to return exit code 1
**Command**: `.\scripts\Deploy-Windows-to-GCP.ps1 deploy`
**Expected**:
❌ Red panel: "Deployment Failed"
📄 Shows: "Exit code: 1"
📝 Instructs: "Check logs/deploy.log for details"
🔧 Troubleshooting steps shown
🛑 Script exits with error

---

### ER-6: Authentication Error During Deployment

**Setup**: Revoke credentials mid-deployment (rare edge case)
**Command**: `.\scripts\Deploy-Windows-to-GCP.ps1 deploy`
**Expected**:
⚠️ Warning: "AUTHENTICATION ISSUE DETECTED"
📋 Shows: Commands to re-authenticate
🔗 Provides: `gcloud auth login` and `gcloud auth application-default login`
🛑 Exits with error (user must fix and retry)

---

## Cross-Platform Testing

### Windows PowerShell 5.1 (Legacy)

**Command**: `powershell.exe -File .\scripts\Deploy-Windows-to-GCP.ps1 deploy`
**Expected**:
✅ Colors may not display (ANSI codes not supported)
✅ Functionality works correctly
✅ Script detects PS version and disables colors if needed

### PowerShell 7+ (Modern)

**Command**: `pwsh -File .\scripts\Deploy-Windows-to-GCP.ps1 deploy`
**Expected**:
✅ Full ANSI color support
✅ Beautiful styled panels and banners
✅ All operations work

---

## Performance & Timeout Testing

### PT-1: Normal Deployment Duration

**Expected Duration**: 5-10 minutes (depending on GCP API speed)
**Log Location**: `logs\deploy.log`

### PT-2: Hanging Operations (Future)

> **Note**: Current version removed timeout handling for simplicity. If timeouts become an issue, consider adding `Start-Job` with `Wait-Job -Timeout`.

---

## Validation Checklist

Use this checklist after running all scenarios:

- [ ] **Fresh Deploy** (Scenario 1): ✅ Passes
- [ ] **Update Deploy** (Scenario 2): ✅ Idempotent
- [ ] **Teardown Confirmed** (Scenario 3): ✅ Requires full phrase
- [ ] **Teardown Forced** (Scenario 4): ✅ No prompt
- [ ] **Status Check** (Scenario 5): ✅ Read-only
- [ ] **ER-1 Missing Python**: ❌ Exits cleanly with help
- [ ] **ER-2 Missing gcloud**: ❌ Exits cleanly with help
- [ ] **ER-3 No Auth**: ⚠️ Prompts to login
- [ ] **ER-4 Quota Error**: ♻️ Auto-reuses project
- [ ] **ER-5 Generic Failure**: 📄 Shows log path
- [ ] **ER-6 Auth Failure**: 🔗 Shows recovery commands
- [ ] **PowerShell 5.1**: ✅ Works without colors
- [ ] **PowerShell 7+**: ✅ Full color support

---

## Manual Testing Script

Run this to automate parts of the testing:

```powershell
# Test 1: Syntax validation
. .\scripts\Deploy-Windows-to-GCP.ps1 -ErrorAction Stop
Write-Host "✅ Syntax valid"

# Test 2: Help text
Get-Help .\scripts\Deploy-Windows-to-GCP.ps1 -Full

# Test 3: Status (read-only)
.\scripts\Deploy-Windows-to-GCP.ps1 status

# Test 4: Prerequisites check (will error if missing tools)
try {
    .\scripts\Deploy-Windows-to-GCP.ps1 deploy
} catch {
    Write-Host "Caught expected error: $_"
}

# Test 5: Verify logs directory creation
Test-Path logs

# Test 6: Check for stale background processes
Get-Job | Where-Object { $_.Name -like "*deploy*" }
```

---

## Known Issues & Workarounds

### Issue 1: Tee-Object Not Showing Real-Time Output

**Symptom**: Deployment output appears all at once at the end
**Cause**: `Tee-Object` buffers output in some PowerShell versions
**Workaround**: Use `2>&1 | ForEach-Object { $_ | Tee-Object -Append ... }`

### Issue 2: Color Codes Not Rendering

**Symptom**: `[36m` text shows literally instead of colors
**Cause**: Terminal doesn't support ANSI escape codes
**Fix**: Use PowerShell 7+ or Windows Terminal

---

## Success Criteria

**All tests pass when:**

1. ✅ Fresh deployment completes in under 10 minutes
2. ✅ Update is idempotent (no unintended changes)
3. ✅ Teardown requires strict confirmation
4. ✅ Status check is read-only and informative
5. ✅ All error scenarios exit gracefully with helpful messages
6. ✅ No stack traces shown to users (errors are clean)
7. ✅ Logs are saved to `logs/deploy.log` for debugging
8. ✅ Receipt generation works (`deployment-receipt.md`)
9. ✅ Colors display correctly in modern terminals
10. ✅ Script works in both PowerShell 5.1 and 7+

---

**Last Updated**: 2025-10-01
**Script Version**: `Deploy-Windows-to-GCP.ps1` (initial release)
**Related Docs**: [`docs/WINDOWS.md`](WINDOWS.md), [`docs/CLOUD.md`](CLOUD.md)
