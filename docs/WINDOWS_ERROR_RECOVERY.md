# Windows Setup Error Recovery

## Overview

Windows installer (`setup_windows.ps1`) includes automatic recovery features for common failures.

## Features

### Network connectivity check

Before downloads, checks:
- python.org
- github.com
- cloud.google.com

Shows diagnostic info on failure:
```
⚠️ Network connectivity issues detected:
   ✗ Python.org

Troubleshooting tips:
   • Check firewall/proxy settings
   • Verify internet connection
   • Try disabling VPN temporarily
```

### Auto-retry on failure

Python installation errors offer recovery:
```
Option 1: Manual Installation (Recommended)
   1. Download: https://python.org/downloads/
   2. Install Python 3.12.10 for Windows
   3. Check 'Add Python to PATH' during install
   4. Re-run this script

Option 2: Auto-retry (if network issue)
Retry download? (y/n)
```

### System requirements validation

Pre-flight checks:
- Windows 10+ required
- PowerShell 5.0+ required
- 2GB disk space available
- .NET Framework present

Fails early with clear guidance if missing.

## Common errors

### Execution policy blocked

**Error:**
```
script.ps1 cannot be loaded. The file is not digitally signed.
```

**Fix:**
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

### Python install fails (exit code 1603)

**Cause:** MSI installer conflict

**Fix:**
1. Close all Python processes
2. Uninstall existing Python (if any)
3. Reboot
4. Re-run installer

### gcloud SDK fails to install

**Cause:** Network timeout or proxy

**Fix:**
1. Download manually: https://cloud.google.com/sdk/docs/install
2. Run installer
3. Re-run setup script (will detect existing install)

### Terraform init fails

**Cause:** Plugin download blocked

**Fix:**
```powershell
cd terraform\gcp
terraform init -upgrade
```

If still fails, check proxy settings:
```powershell
$env:HTTPS_PROXY="http://proxy:port"
terraform init
```

### PATH not updated after install

**Cause:** PowerShell session stale

**Fix:**
1. Close PowerShell
2. Open new PowerShell window
3. Verify: `python --version`

Or refresh in current session:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

## Diagnostics

### Check what's installed

```powershell
# Python
python --version
pip --version

# Git
git --version

# gcloud
gcloud version

# Terraform
terraform version
```

### View install logs

Python install log:
```
%TEMP%\Python*.log
```

Setup script verbose mode:
```powershell
.\setup_windows.ps1 -Verbose
```

### Manual cleanup

Remove partial installs:
```powershell
# Python
$pythonPath = "$env:LOCALAPPDATA\Programs\Python"
Remove-Item $pythonPath -Recurse -Force -ErrorAction SilentlyContinue

# gcloud SDK
$gcloudPath = "$env:LOCALAPPDATA\Google\Cloud SDK"
Remove-Item $gcloudPath -Recurse -Force -ErrorAction SilentlyContinue

# Repo
Remove-Item "$env:USERPROFILE\job-scraper" -Recurse -Force
```

## Prevention

### Run as Administrator

Right-click PowerShell → "Run as Administrator"

Avoids permission errors.

### Disable antivirus temporarily

Some AV blocks installer downloads/execution.

**⚠️ Only if you trust the source!**

### Use stable network

- Wired connection preferred
- Disable VPN if causing issues
- Check corporate proxy settings

## Support

If auto-recovery doesn't work:

1. Capture error output:
```powershell
.\setup_windows.ps1 -Verbose 2>&1 | Tee-Object -FilePath error.log
```

2. Check prerequisites manually
3. Try manual installation steps
4. Open issue: https://github.com/cboyd0319/job-private-scraper-filter/issues

Include:
- Windows version: `winver`
- PowerShell version: `$PSVersionTable.PSVersion`
- Error log
- Network environment (corporate/home/VPN)
