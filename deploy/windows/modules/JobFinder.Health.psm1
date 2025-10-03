<#
.SYNOPSIS
    Provides health check functions for the Job Finder suite.
.DESCRIPTION
    This module contains functions to verify that all components of the application
    are correctly installed and configured.
.NOTES
    Author: Gemini
    Version: 1.0.0
#>

Set-StrictMode -Version Latest

# --- Module Imports ---
try {
    Import-Module (Join-Path $PSScriptRoot '..\Config.ps1')
    Import-Module (Join-Path $PSScriptRoot 'JobFinder.Prerequisites.psm1')
} catch {
    Write-Error "Could not load a required module. Health checks cannot proceed."
    return
}

# --- Health Check Functions ---

function Test-LocalHealth {
    <#
    .SYNOPSIS
        Performs a comprehensive health check for a local installation.
    .OUTPUTS
        An array of hashtables, each representing a health check result.
    #>
    [CmdletBinding()]
    [OutputType([array])]
    param()

    $results = @()

    # 1. Check Python Installation
    $pyCheck = @{ Name = "Python Installation"; Status = 'Fail'; Details = "Python is not installed." }
    if (Test-CommandExists -CommandName 'python') {
        $pyVersion = Get-PythonVersion
        $minVersion = Get-JobFinderConfig -Path "Dependencies.Python.MinVersion"
        if ($pyVersion -ge $minVersion) {
            $pyCheck.Status = 'Pass'
            $pyCheck.Details = "Version $pyVersion installed."
        } else {
            $pyCheck.Details = "Version $pyVersion is installed, but version $minVersion or higher is required."
        }
    }
    $results += $pyCheck

    # 2. Check Python Packages
    $pkgCheck = @{ Name = "Python Packages"; Status = 'Fail'; Details = "Could not verify packages." }
    try {
        $missing = & python -m pip check 2>&1 | Where-Object { $_ -match 'has requirement' }
        if ($missing.Length -eq 0) {
            $pkgCheck.Status = 'Pass'
            $pkgCheck.Details = "All required packages are installed."
        } else {
            $pkgCheck.Details = "Missing packages: $($missing -join ", ")"
        }
    } catch {
        $pkgCheck.Details = "An error occurred while checking packages: $($_.Exception.Message)"
    }
    $results += $pkgCheck

    # 3. Check Playwright Browsers
    $pwCheck = @{ Name = "Playwright Browser"; Status = 'Fail'; Details = "Could not verify Playwright browsers." }
    try {
        $playwrightCheck = & python -m playwright install --dry-run chromium
        if ($playwrightCheck -match 'chromium is already installed') {
            $pwCheck.Status = 'Pass'
            $pwCheck.Details = "Chromium browser is installed."
        } else {
            $pwCheck.Details = "Playwright browser is not installed. Please run 'python -m playwright install chromium'."
        }
    } catch {
        $pwCheck.Details = "An error occurred while checking Playwright: $($_.Exception.Message)"
    }
    $results += $pwCheck

    # 4. Check Database File
    $dbCheck = @{ Name = "Database File"; Status = 'Fail'; Details = "Database file not found." }
    $dbPath = Get-ProjectPath -RelativePath (Get-JobFinderConfig -Path "Paths.DatabaseFile")
    if (Test-Path $dbPath) {
        $dbCheck.Status = 'Pass'
        $dbCheck.Details = "Database file is present."
    }
    $results += $dbCheck

    return $results
}

function Test-GcpHealth {
    <#
    .SYNOPSIS
        Performs a comprehensive health check for a GCP cloud installation.
    .OUTPUTS
        An array of hashtables, each representing a health check result.
    #>
    [CmdletBinding()]
    [OutputType([array])]
    param()

    $results = @()

    # 1. Check gcloud Authentication
    $authCheck = @{ Name = "GCP Authentication"; Status = 'Fail'; Details = "gcloud is not authenticated." }
    if (Test-GcloudAuthenticated) {
        $authCheck.Status = 'Pass'
        $authCheck.Details = "Authenticated as $(& gcloud config get-value account)"
    }
    $results += $authCheck

    # 2. Check Cloud Run Job
    $crCheck = @{ Name = "Cloud Run Job"; Status = 'Fail'; Details = "Cloud Run job not found." }
    try {
        $job = & gcloud run jobs describe job-scraper --format="value(name)" --region us-central1 2>$null
        if ($job -eq 'job-scraper') {
            $crCheck.Status = 'Pass'
            $crCheck.Details = "Job 'job-scraper' is deployed."
        }
    } catch {}
    $results += $crCheck

    # 3. Check Cloud Scheduler Job
    $schedulerCheck = @{ Name = "Cloud Scheduler"; Status = 'Fail'; Details = "Scheduler job not found." }
    try {
        $schedule = & gcloud scheduler jobs describe job-scraper-schedule --location us-central1 --format="value(name)" 2>$null
        if ($schedule -eq 'job-scraper-schedule') {
            $schedulerCheck.Status = 'Pass'
            $schedulerCheck.Details = "Job 'job-scraper-schedule' is configured."
        }
    } catch {}
    $results += $schedulerCheck

    return $results
}

# --- Export Members ---
Export-ModuleMember -Function Test-LocalHealth, Test-GcpHealth
