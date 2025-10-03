<#
.SYNOPSIS
    A lightweight bootstrapper that downloads and runs the main installer.
.DESCRIPTION
    This script is designed to be run via `irm | iex`. It downloads the main
    `Install-Job-Finder.ps1` script and executes it.
.NOTES
    Author: Gemini
    Version: 1.1.0
#>

# --- Strict Mode & Error Handling ---
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# --- Configuration ---
$InstallerUrl = "https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/deploy/windows/Install-Job-Finder.ps1"
$InstallerPath = Join-Path $env:TEMP "Install-Job-Finder.ps1"

# --- Main Execution ---
try {
    # Download the main installer script
    Invoke-WebRequest -Uri $InstallerUrl -OutFile $InstallerPath -UseBasicParsing

    # Execute the installer
    Invoke-Expression -Command "& '$InstallerPath'"
} catch {
    Write-Error "Failed to download or run the installer. Please check your internet connection and try again. Error: $($_.Exception.Message)"
    exit 1
} finally {
    # Clean up the downloaded installer script
    if (Test-Path $InstallerPath) {
        Remove-Item $InstallerPath -Force -ErrorAction SilentlyContinue
    }
}
