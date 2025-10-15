#Requires -Version 5.1

<#
.SYNOPSIS
    Comprehensive Windows Deployment Validation Script

.DESCRIPTION
    Validates the entire JobSentinel Windows deployment end-to-end.
    Tests all components, configurations, and functionality.
    
    Based on: docs/WINDOWS_DEPLOYMENT_CHECKLIST.md

.NOTES
    Version: 1.0.0
    Author: JobSentinel Team
    Requires: Windows 11, Python 3.11+ (3.12+ recommended), PowerShell 5.1+

.EXAMPLE
    .\scripts\validate_windows_deployment.ps1
    # Runs all validation checks

.EXAMPLE
    .\scripts\validate_windows_deployment.ps1 -Verbose
    # Runs with detailed output
#>

param(
    [switch]$SkipDependencies,
    [switch]$SkipDatabase,
    [switch]$SkipEmail
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Color functions
function Write-Success { param([string]$Message) Write-Host "  ✅ $Message" -ForegroundColor Green }
function Write-Failure { param([string]$Message) Write-Host "  ❌ $Message" -ForegroundColor Red }
function Write-Warning-Custom { param([string]$Message) Write-Host "  ⚠️  $Message" -ForegroundColor Yellow }
function Write-Info { param([string]$Message) Write-Host "  ℹ️  $Message" -ForegroundColor Cyan }
function Write-Section { param([string]$Message) Write-Host "`n═══ $Message ═══" -ForegroundColor Cyan }

# Counters
$script:PassCount = 0
$script:FailCount = 0
$script:WarnCount = 0
$script:SkipCount = 0

function Test-Check {
    param(
        [string]$Name,
        [scriptblock]$Test,
        [switch]$Optional
    )
    
    try {
        $result = & $Test
        if ($result) {
            Write-Success $Name
            $script:PassCount++
            return $true
        } else {
            if ($Optional) {
                Write-Warning-Custom "$Name (optional)"
                $script:WarnCount++
                return $false
            } else {
                Write-Failure $Name
                $script:FailCount++
                return $false
            }
        }
    } catch {
        if ($Optional) {
            Write-Warning-Custom "$Name (optional): $($_.Exception.Message)"
            $script:WarnCount++
            return $false
        } else {
            Write-Failure "$Name : $($_.Exception.Message)"
            $script:FailCount++
            return $false
        }
    }
}

# Main validation
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "        JobSentinel Windows Deployment Validation" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Get project root
$ProjectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $ProjectRoot

Write-Info "Project root: $ProjectRoot"
Write-Info "Validation started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# ═══════════════════════════════════════════════════════════════════
# SYSTEM REQUIREMENTS
# ═══════════════════════════════════════════════════════════════════

Write-Section "System Requirements"

Test-Check "Windows 11 (build 22000+)" {
    $build = [System.Environment]::OSVersion.Version.Build
    $build -ge 22000
}

Test-Check "Python 3.12+ installed" {
    try {
        $version = & python --version 2>&1
        if ($version -match "Python (\d+)\.(\d+)") {
            $major = [int]$Matches[1]
            $minor = [int]$Matches[2]
            return ($major -ge 3 -and $minor -ge 12)
        }
        return $false
    } catch {
        return $false
    }
}

Test-Check "Python in PATH" {
    $null -ne (Get-Command python -ErrorAction SilentlyContinue)
}

Test-Check "pip available" {
    try {
        $null = & python -m pip --version 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

Test-Check "Minimum 1GB disk space" {
    $drive = (Get-Location).Drive
    $free = (Get-PSDrive $drive.Name).Free / 1GB
    $free -ge 1
}

Test-Check "Internet connectivity" -Optional {
    try {
        $result = Test-NetConnection -ComputerName "8.8.8.8" -Port 53 -InformationLevel Quiet -WarningAction SilentlyContinue -ErrorAction Stop
        return $result
    } catch {
        return $false
    }
}

# ═══════════════════════════════════════════════════════════════════
# FILE STRUCTURE
# ═══════════════════════════════════════════════════════════════════

Write-Section "File Structure"

$RequiredFiles = @(
    "launcher_gui.py",
    "launch-gui.bat",
    "launch-gui.ps1",
    "setup-windows.bat",
    "setup-windows.ps1",
    "bootstrap.ps1",
    "run.ps1",
    "pyproject.toml",
    "README.md"
)

foreach ($file in $RequiredFiles) {
    Test-Check "File exists: $file" {
        Test-Path $file
    }
}

$RequiredDirs = @(
    "src",
    "src/jsa",
    "config",
    "docs",
    "scripts",
    "tests"
)

foreach ($dir in $RequiredDirs) {
    Test-Check "Directory exists: $dir" {
        Test-Path $dir -PathType Container
    }
}

# ═══════════════════════════════════════════════════════════════════
# DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════

if (-not $SkipDependencies) {
    Write-Section "Python Dependencies"
    
    $CorePackages = @(
        "sqlalchemy",
        "pydantic",
        "requests",
        "bs4",
        "flask",
        "fastapi",
        "uvicorn",
        "click"
    )
    
    foreach ($package in $CorePackages) {
        Test-Check "Package: $package" {
            try {
                $null = & python -c "import $package" 2>&1
                return $LASTEXITCODE -eq 0
            } catch {
                return $false
            }
        }
    }
    
    Test-Check "tkinter (for GUI)" -Optional {
        try {
            $null = & python -c "import tkinter" 2>&1
            return $LASTEXITCODE -eq 0
        } catch {
            return $false
        }
    }
    
    Test-Check "playwright (for scraping)" -Optional {
        try {
            $null = & python -c "import playwright" 2>&1
            return $LASTEXITCODE -eq 0
        } catch {
            return $false
        }
    }
}

# ═══════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

Write-Section "Configuration"

Test-Check "Config example exists" {
    Test-Path "config/user_prefs.example.json"
}

Test-Check "Config schema exists" {
    Test-Path "config/user_prefs.schema.json"
}

Test-Check "User config exists" -Optional {
    Test-Path "config/user_prefs.json"
}

if (Test-Path "config/user_prefs.json") {
    Test-Check "User config is valid JSON" {
        try {
            $null = Get-Content "config/user_prefs.json" -Raw | ConvertFrom-Json
            return $true
        } catch {
            return $false
        }
    }
}

Test-Check ".env.example exists" {
    Test-Path ".env.example"
}

# ═══════════════════════════════════════════════════════════════════
# CLI COMMANDS
# ═══════════════════════════════════════════════════════════════════

Write-Section "CLI Commands"

Test-Check "CLI module loads" {
    try {
        $output = & python -m jsa.cli --help 2>&1
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    }
}

$Commands = @("setup", "run-once", "web", "api", "health", "diagnostic", "privacy", "backup", "config-validate")

foreach ($cmd in $Commands) {
    Test-Check "Command available: $cmd" {
        try {
            $output = & python -m jsa.cli --help 2>&1
            return $output -match $cmd
        } catch {
            return $false
        }
    }
}

# ═══════════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════════

if (-not $SkipDatabase) {
    Write-Section "Database"
    
    Test-Check "SQLite available" {
        try {
            $null = & python -c "import sqlite3; print(sqlite3.version)" 2>&1
            return $LASTEXITCODE -eq 0
        } catch {
            return $false
        }
    }
    
    Test-Check "Data directory exists or can be created" {
        if (Test-Path "data") {
            return $true
        } else {
            try {
                New-Item -ItemType Directory -Path "data" -Force | Out-Null
                return $true
            } catch {
                return $false
            }
        }
    }
    
    if (Test-Path "data/jobs.sqlite") {
        Test-Check "Database file accessible" -Optional {
            try {
                $null = & python -c "import sqlite3; conn = sqlite3.connect('data/jobs.sqlite'); conn.close()" 2>&1
                return $LASTEXITCODE -eq 0
            } catch {
                return $false
            }
        }
    }
}

# ═══════════════════════════════════════════════════════════════════
# WINDOWS MODULES
# ═══════════════════════════════════════════════════════════════════

Write-Section "Windows-Specific Modules"

Test-Check "Windows pre-check module" {
    Test-Path "src/jsa/windows_precheck.py"
}

Test-Check "Windows shortcuts module" {
    Test-Path "src/jsa/windows_shortcuts.py"
}

Test-Check "Windows setup script" {
    Test-Path "scripts/windows_setup.py"
}

# ═══════════════════════════════════════════════════════════════════
# DOCUMENTATION
# ═══════════════════════════════════════════════════════════════════

Write-Section "Documentation"

$Docs = @(
    "README.md",
    "docs/BEGINNER_GUIDE.md",
    "docs/WINDOWS_TROUBLESHOOTING.md",
    "docs/WINDOWS_DEPLOYMENT_CHECKLIST.md",
    "docs/WINDOWS_QUICK_START.md",
    "docs/DEPLOYMENT_GUIDE.md",
    "docs/DOCUMENTATION_INDEX.md"
)

foreach ($doc in $Docs) {
    Test-Check "Doc exists: $doc" {
        Test-Path $doc
    }
}

# ═══════════════════════════════════════════════════════════════════
# TESTS
# ═══════════════════════════════════════════════════════════════════

Write-Section "Test Suite"

Test-Check "GUI launcher tests exist" {
    Test-Path "tests/test_gui_launcher.py"
}

Test-Check "Windows deployment tests exist" {
    Test-Path "tests/test_windows_deployment.py"
}

Test-Check "Windows enhancements tests exist" {
    Test-Path "tests/test_windows_enhancements.py"
}

# ═══════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "                        Validation Summary" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$Total = $PassCount + $FailCount + $WarnCount + $SkipCount

Write-Host "  ✅ Passed:  $PassCount" -ForegroundColor Green
if ($FailCount -gt 0) {
    Write-Host "  ❌ Failed:  $FailCount" -ForegroundColor Red
}
if ($WarnCount -gt 0) {
    Write-Host "  ⚠️  Warnings: $WarnCount" -ForegroundColor Yellow
}
if ($SkipCount -gt 0) {
    Write-Host "  ⏭️  Skipped: $SkipCount" -ForegroundColor Gray
}
Write-Host "  📊 Total:   $Total" -ForegroundColor Cyan

Write-Host ""

if ($FailCount -eq 0) {
    Write-Host "🎉 All critical checks passed!" -ForegroundColor Green
    Write-Host ""
    if ($WarnCount -gt 0) {
        Write-Host "⚠️  Some optional features may not be available." -ForegroundColor Yellow
        Write-Host "   See warnings above for details." -ForegroundColor Yellow
        Write-Host ""
    }
    Write-Host "✅ Windows deployment is READY!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "❌ Deployment validation FAILED!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please address the failed checks above before deploying." -ForegroundColor Yellow
    Write-Host "For help, see: docs/WINDOWS_TROUBLESHOOTING.md" -ForegroundColor Cyan
    exit 1
}
