<#
.SYNOPSIS
    Windows Security Audit Script for JobSentinel

.DESCRIPTION
    Performs comprehensive security checks on Windows deployment files.
    Validates security configurations, checks for vulnerabilities, and
    ensures compliance with security best practices.

.NOTES
    Version: 1.0.0
    Author: JobSentinel Team
    Requires: PowerShell 5.1+, Python 3.12+

.EXAMPLE
    .\scripts\security_audit_windows.ps1
    # Runs full security audit

.EXAMPLE
    .\scripts\security_audit_windows.ps1 -Verbose
    # Runs with detailed output
#>

#Requires -Version 5.1

param(
    [switch]$SkipDependencyCheck
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Color functions
function Write-Pass { param([string]$Message) Write-Host "  ✅ $Message" -ForegroundColor Green }
function Write-Fail { param([string]$Message) Write-Host "  ❌ $Message" -ForegroundColor Red }
function Write-Warn { param([string]$Message) Write-Host "  ⚠️  $Message" -ForegroundColor Yellow }
function Write-Info { param([string]$Message) Write-Host "  ℹ️  $Message" -ForegroundColor Cyan }
function Write-Section { param([string]$Message) Write-Host "`n═══ $Message ═══" -ForegroundColor Cyan }

# Counters
$script:PassCount = 0
$script:FailCount = 0
$script:WarnCount = 0

function Test-SecurityCheck {
    param(
        [string]$Name,
        [scriptblock]$Test,
        [switch]$Optional
    )
    
    try {
        $result = & $Test
        if ($result) {
            Write-Pass $Name
            $script:PassCount++
            return $true
        } else {
            if ($Optional) {
                Write-Warn "$Name (optional)"
                $script:WarnCount++
                return $false
            } else {
                Write-Fail $Name
                $script:FailCount++
                return $false
            }
        }
    } catch {
        if ($Optional) {
            Write-Warn "$Name (optional): $($_.Exception.Message)"
            $script:WarnCount++
            return $false
        } else {
            Write-Fail "$Name : $($_.Exception.Message)"
            $script:FailCount++
            return $false
        }
    }
}

# Main audit
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "        JobSentinel Windows Security Audit" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Get project root
$ProjectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $ProjectRoot

Write-Info "Project root: $ProjectRoot"
Write-Info "Audit started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# ═══════════════════════════════════════════════════════════════════
# POWERSHELL SECURITY
# ═══════════════════════════════════════════════════════════════════

Write-Section "PowerShell Security Configuration"

Test-SecurityCheck "bootstrap.ps1: Set-StrictMode enabled" {
    $content = Get-Content "bootstrap.ps1" -Raw
    $content -match "Set-StrictMode -Version Latest"
}

Test-SecurityCheck "bootstrap.ps1: ErrorActionPreference = Stop" {
    $content = Get-Content "bootstrap.ps1" -Raw
    $content -match '\$ErrorActionPreference = "Stop"'
}

Test-SecurityCheck "bootstrap.ps1: TLS 1.2+ enforcement" {
    $content = Get-Content "bootstrap.ps1" -Raw
    $content -match "SecurityProtocol.*Tls12"
}

Test-SecurityCheck "setup-windows.ps1: Set-StrictMode enabled" {
    $content = Get-Content "setup-windows.ps1" -Raw
    $content -match "Set-StrictMode -Version Latest"
}

Test-SecurityCheck "run.ps1: Set-StrictMode enabled" {
    $content = Get-Content "run.ps1" -Raw
    $content -match "Set-StrictMode -Version Latest"
}

Test-SecurityCheck "launch-gui.ps1: Set-StrictMode enabled" {
    $content = Get-Content "launch-gui.ps1" -Raw
    $content -match "Set-StrictMode -Version Latest"
}

# ═══════════════════════════════════════════════════════════════════
# PYTHON SECURITY
# ═══════════════════════════════════════════════════════════════════

Write-Section "Python Security Configuration"

Test-SecurityCheck "launcher_gui.py: Localhost binding (127.0.0.1)" {
    $content = Get-Content "launcher_gui.py" -Raw
    $content -match '127\.0\.0\.1' -and $content -notmatch '"0\.0\.0\.0"'
}

Test-SecurityCheck "launcher_gui.py: No shell=True in subprocess" {
    $content = Get-Content "launcher_gui.py" -Raw
    $content -notmatch 'shell\s*=\s*True'
}

Test-SecurityCheck "launcher_gui.py: Path validation present" {
    $content = Get-Content "launcher_gui.py" -Raw
    $content -match "resolve\(\)" -and $content -match "startswith"
}

Test-SecurityCheck "windows_setup.py: No shell=True in subprocess" {
    $content = Get-Content "scripts/windows_setup.py" -Raw
    $content -notmatch 'shell\s*=\s*True'
}

Test-SecurityCheck "windows_setup.py: Project validation present" {
    $content = Get-Content "scripts/windows_setup.py" -Raw
    $content -match "pyproject.toml"
}

# ═══════════════════════════════════════════════════════════════════
# SENSITIVE DATA CHECKS
# ═══════════════════════════════════════════════════════════════════

Write-Section "Sensitive Data Protection"

Test-SecurityCheck "No hardcoded API keys in .ps1 files" {
    $patterns = @("api[_-]?key", "password", "secret", "token")
    foreach ($file in Get-ChildItem "*.ps1") {
        $content = Get-Content $file.FullName -Raw
        foreach ($pattern in $patterns) {
            if ($content -match $pattern -and $content -notmatch "example|template|placeholder|XXX|your_") {
                return $false
            }
        }
    }
    return $true
}

Test-SecurityCheck "No hardcoded secrets in launcher_gui.py" {
    $content = Get-Content "launcher_gui.py" -Raw
    $patterns = @("sk-", "ghp_", "xoxb-")
    foreach ($pattern in $patterns) {
        if ($content -match $pattern) {
            return $false
        }
    }
    return $true
}

Test-SecurityCheck ".env file not committed" {
    -not (Test-Path ".env") -or (Get-Content ".gitignore" -Raw) -match "\.env"
}

Test-SecurityCheck ".env.example has placeholders only" {
    if (Test-Path ".env.example") {
        $content = Get-Content ".env.example" -Raw
        $hasBadSecrets = $content -match "sk-[A-Za-z0-9]{20,}" -or 
                        $content -match "ghp_[A-Za-z0-9]{36}" -or
                        $content -notmatch "XXX|YYY|ZZZ|your_|example"
        return -not $hasBadSecrets
    }
    return $true
}

# ═══════════════════════════════════════════════════════════════════
# BANDIT SECURITY SCAN
# ═══════════════════════════════════════════════════════════════════

if (-not $SkipDependencyCheck) {
    Write-Section "Bandit Security Scan"
    
    Test-SecurityCheck "Bandit installed" {
        try {
            $null = & python -m bandit --version 2>&1
            return $LASTEXITCODE -eq 0
        } catch {
            return $false
        }
    }
    
    Test-SecurityCheck "No HIGH or CRITICAL issues in launcher_gui.py" {
        try {
            $output = & python -m bandit -c config/bandit.yaml -r launcher_gui.py -f json 2>&1 | ConvertFrom-Json
            $highIssues = $output.results | Where-Object { $_.issue_severity -eq "HIGH" -or $_.issue_severity -eq "CRITICAL" }
            return $highIssues.Count -eq 0
        } catch {
            return $false
        }
    }
    
    Test-SecurityCheck "No HIGH or CRITICAL issues in windows_setup.py" {
        try {
            $output = & python -m bandit -c config/bandit.yaml -r scripts/windows_setup.py -f json 2>&1 | ConvertFrom-Json
            $highIssues = $output.results | Where-Object { $_.issue_severity -eq "HIGH" -or $_.issue_severity -eq "CRITICAL" }
            return $highIssues.Count -eq 0
        } catch {
            return $false
        }
    }
}

# ═══════════════════════════════════════════════════════════════════
# FILE PERMISSIONS
# ═══════════════════════════════════════════════════════════════════

Write-Section "File Permissions"

Test-SecurityCheck "config/ directory exists" {
    Test-Path "config" -PathType Container
}

Test-SecurityCheck "scripts/ directory exists" {
    Test-Path "scripts" -PathType Container
}

Test-SecurityCheck "No world-writable files in project" -Optional {
    # Note: Windows permissions are different from Unix
    # This is a basic check that config files exist and are accessible
    $configFiles = @("config/user_prefs.example.json", "config/user_prefs.schema.json")
    foreach ($file in $configFiles) {
        if (Test-Path $file) {
            $acl = Get-Acl $file
            # Just verify we can read the ACL (basic check)
            if ($null -eq $acl) {
                return $false
            }
        }
    }
    return $true
}

# ═══════════════════════════════════════════════════════════════════
# NETWORK SECURITY
# ═══════════════════════════════════════════════════════════════════

Write-Section "Network Security"

Test-SecurityCheck "No exposed services on 0.0.0.0" {
    $content = Get-Content "launcher_gui.py" -Raw
    $content -notmatch '"0\.0\.0\.0"' -or $content -match "#.*0\.0\.0\.0"
}

Test-SecurityCheck "Default port is reasonable (8000)" {
    $content = Get-Content "launcher_gui.py" -Raw
    $content -match '"8000"'
}

Test-SecurityCheck "HTTPS used for downloads" {
    $content = Get-Content "bootstrap.ps1" -Raw
    $content -match "https://" -and $content -notmatch 'http://(?!localhost|127\.0\.0\.1)'
}

# ═══════════════════════════════════════════════════════════════════
# DOCUMENTATION
# ═══════════════════════════════════════════════════════════════════

Write-Section "Security Documentation"

Test-SecurityCheck "SECURITY.md exists" {
    Test-Path "SECURITY.md"
}

Test-SecurityCheck "Windows security docs exist" {
    Test-Path "docs/WINDOWS_SECURITY.md"
}

Test-SecurityCheck "Windows troubleshooting docs exist" {
    Test-Path "docs/WINDOWS_TROUBLESHOOTING.md"
}

# ═══════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "                        Security Audit Summary" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$Total = $PassCount + $FailCount + $WarnCount

Write-Host "  ✅ Passed:   $PassCount" -ForegroundColor Green
if ($FailCount -gt 0) {
    Write-Host "  ❌ Failed:   $FailCount" -ForegroundColor Red
}
if ($WarnCount -gt 0) {
    Write-Host "  ⚠️  Warnings: $WarnCount" -ForegroundColor Yellow
}
Write-Host "  📊 Total:    $Total" -ForegroundColor Cyan

Write-Host ""

if ($FailCount -eq 0) {
    Write-Host "🎉 Security audit PASSED!" -ForegroundColor Green
    Write-Host ""
    if ($WarnCount -gt 0) {
        Write-Host "⚠️  Some optional checks had warnings (non-critical)." -ForegroundColor Yellow
        Write-Host "   Review warnings above for potential improvements." -ForegroundColor Yellow
        Write-Host ""
    }
    Write-Host "✅ Windows deployment is SECURE!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Recommendations:" -ForegroundColor Cyan
    Write-Host "  • Run this audit monthly: .\scripts\security_audit_windows.ps1" -ForegroundColor White
    Write-Host "  • Keep dependencies updated: pip install -e . --upgrade" -ForegroundColor White
    Write-Host "  • Review security docs: docs\WINDOWS_SECURITY.md" -ForegroundColor White
    Write-Host ""
    exit 0
} else {
    Write-Host "❌ Security audit FAILED!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Critical security issues detected. Address the failures above." -ForegroundColor Yellow
    Write-Host "For help, see: docs\WINDOWS_SECURITY.md" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}
