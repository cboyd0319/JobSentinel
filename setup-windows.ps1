# Windows Setup Script for JobSentinel (PowerShell)
#
# This PowerShell script provides automated setup for JobSentinel on Windows 11+.
# It handles all installation steps with proper error handling and user feedback.
#
# Requirements:
# - Windows 11 (build 22000+)
# - Python 3.12+ installed
# - PowerShell 5.1 or later
#
# No admin rights needed!
#
# Usage:
#   .\setup-windows.ps1
#
# Or if execution policy prevents running:
#   powershell -ExecutionPolicy Bypass -File setup-windows.ps1

# Set strict mode for better error handling
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Banner
Write-Host ""
Write-Host "========================================================================"
Write-Host "                     JobSentinel Windows Setup" -ForegroundColor Cyan
Write-Host "========================================================================"
Write-Host ""

# Check Windows version
Write-Host "Checking Windows version..." -ForegroundColor Yellow

$version = [System.Environment]::OSVersion.Version
$build = $version.Build

if ($version.Major -ge 10 -and $build -ge 22000) {
    Write-Host "✓ Windows 11 detected (build $build)" -ForegroundColor Green
} else {
    Write-Host "✗ Windows 11 required (build 22000+). Found: build $build" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please upgrade to Windows 11 to use JobSentinel." -ForegroundColor Yellow
    Write-Host ""
    Pause
    exit 1
}

Write-Host ""

# Check for Python
Write-Host "Checking for Python..." -ForegroundColor Yellow

try {
    $pythonVersion = & python --version 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ $pythonVersion found" -ForegroundColor Green
        
        # Check if it's 3.12+
        if ($pythonVersion -match "Python (\d+)\.(\d+)") {
            $major = [int]$matches[1]
            $minor = [int]$matches[2]
            
            if ($major -lt 3 -or ($major -eq 3 -and $minor -lt 12)) {
                Write-Host "✗ Python 3.12+ required. Found: $major.$minor" -ForegroundColor Red
                Write-Host ""
                Write-Host "Please install Python 3.12 or newer from:" -ForegroundColor Yellow
                Write-Host "https://www.python.org/downloads/" -ForegroundColor Cyan
                Write-Host ""
                Write-Host "IMPORTANT: When installing, check 'Add Python to PATH'" -ForegroundColor Yellow
                Write-Host ""
                Pause
                exit 1
            }
        }
    }
} catch {
    Write-Host "✗ Python not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python 3.12 or newer from:" -ForegroundColor Yellow
    Write-Host "https://www.python.org/downloads/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "IMPORTANT: When installing, check 'Add Python to PATH'" -ForegroundColor Yellow
    Write-Host ""
    Pause
    exit 1
}

Write-Host ""

# Check disk space
Write-Host "Checking disk space..." -ForegroundColor Yellow

$drive = (Get-Location).Drive
$freeSpace = (Get-PSDrive $drive.Name).Free / 1GB

if ($freeSpace -ge 1.0) {
    Write-Host "✓ $([math]::Round($freeSpace, 1)) GB free" -ForegroundColor Green
} else {
    Write-Host "✗ Only $([math]::Round($freeSpace, 1)) GB free. Need at least 1 GB." -ForegroundColor Red
    Write-Host ""
    Write-Host "Please free up some disk space and try again." -ForegroundColor Yellow
    Write-Host ""
    Pause
    exit 1
}

Write-Host ""

# Check internet connectivity
Write-Host "Checking internet connection..." -ForegroundColor Yellow

try {
    $response = Test-NetConnection -ComputerName "8.8.8.8" -Port 53 -InformationLevel Quiet -WarningAction SilentlyContinue
    
    if ($response) {
        Write-Host "✓ Internet connected" -ForegroundColor Green
    } else {
        Write-Host "✗ No internet connection" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please connect to the internet and try again." -ForegroundColor Yellow
        Write-Host ""
        Pause
        exit 1
    }
} catch {
    Write-Host "⚠ Could not verify internet connection (continuing anyway)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================================================"
Write-Host "All checks passed! Ready to install." -ForegroundColor Green
Write-Host "========================================================================"
Write-Host ""

# Confirm with user
$response = Read-Host "Continue with installation? (y/n)"
if ($response -ne "y" -and $response -ne "yes") {
    Write-Host "Installation cancelled by user." -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# Run Python setup script
Write-Host "Starting setup wizard..." -ForegroundColor Cyan
Write-Host ""

try {
    & python scripts\windows_setup.py
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "========================================================================"
        Write-Host "Setup encountered errors." -ForegroundColor Red
        Write-Host ""
        Write-Host "For help, see: docs\WINDOWS_TROUBLESHOOTING.md" -ForegroundColor Yellow
        Write-Host "========================================================================"
        Write-Host ""
        Pause
        exit 1
    }
    
    Write-Host ""
    Write-Host "========================================================================"
    Write-Host "Setup completed successfully!" -ForegroundColor Green
    Write-Host "========================================================================"
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "Error running setup: $_" -ForegroundColor Red
    Write-Host ""
    Pause
    exit 1
}

Pause
