# Job Finder Bootstrapper
# Safely downloads and launches the main installer.

# --- INITIAL SETUP ---
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# --- Configuration ---
$RepoUrl = "https://github.com/cboyd0319/job-private-scraper-filter/archive/refs/heads/main.zip"
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$InstallDir = Join-Path $DesktopPath "Job-Finder-Setup"
$ZipPath = Join-Path $InstallDir "project.zip"

# --- Friendly Introduction ---
Clear-Host
Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "   Personal Job Finder Setup" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Hello!" -ForegroundColor Green
Write-Host ""
Write-Host "This tool helps you find job postings that match what you're looking for."
Write-Host "It checks company websites automatically and shows you the best matches."
Write-Host ""
Write-Host "I'm going to help you install it on your computer."
Write-Host ""
Write-Host "Here's what will happen:" -ForegroundColor Yellow
Write-Host "  1. Download the Job Finder (takes about 30 seconds)"
Write-Host "  2. Put it in a folder on your Desktop called 'Job-Finder-Setup'"
Write-Host "  3. Open the main setup window for you"
Write-Host ""

$confirmation = Read-Host "Ready to begin? Type Y and press Enter (or N to cancel)"
if ($confirmation -ne 'Y' -and $confirmation -ne 'y') {
    Write-Host ""
    Write-Host "No problem! Setup cancelled." -ForegroundColor Yellow
    Write-Host "No files were downloaded or changed." -ForegroundColor Green
    Write-Host ""
    Write-Host "Press any key to close this window..."
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 0
}

# --- Safe Download and Unzip ---
try {
    Write-Host ""
    Write-Host "Step 1: Downloading the Job Finder..." -ForegroundColor Cyan
    Write-Host "(This takes about 30 seconds on fast internet)" -ForegroundColor Gray
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Invoke-WebRequest -Uri $RepoUrl -OutFile $ZipPath -UseBasicParsing -TimeoutSec 300

    # SECURITY: Validate we actually downloaded a ZIP file
    if ((Get-Item $ZipPath).Length -lt 1KB) {
        throw "Downloaded file is too small - may be corrupt or incomplete"
    }

    Write-Host "✓ Download complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Step 2: Unpacking the files..." -ForegroundColor Cyan
    Expand-Archive -Path $ZipPath -DestinationPath $InstallDir -Force

    # ROBUSTNESS: Find the extracted folder more reliably
    $ExtractedFolders = Get-ChildItem -Path $InstallDir -Directory | Where-Object {
        $_.Name -match '^job-private-scraper-filter'
    }

    if ($ExtractedFolders.Count -eq 0) {
        throw "Could not find extracted project folder. Archive may be corrupt."
    }

    if ($ExtractedFolders.Count -gt 1) {
        # Use the most recently created folder
        $ExtractedFolder = $ExtractedFolders | Sort-Object CreationTime -Descending | Select-Object -First 1
    } else {
        $ExtractedFolder = $ExtractedFolders[0]
    }

    $InstallerPath = Join-Path $ExtractedFolder.FullName "deploy\windows\install.ps1"

    if (-not (Test-Path $InstallerPath)) {
        throw "Installer file not found at: $InstallerPath"
    }

    Write-Host "✓ Files unpacked successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Step 3: Opening the main setup window..." -ForegroundColor Cyan
    Write-Host "(A new window will pop up in a moment)" -ForegroundColor Gray
    Start-Sleep -Seconds 2

    # --- Launch Main Installer ---
    $workingDir = Split-Path $InstallerPath -Parent
    Start-Process powershell.exe `
        -ArgumentList "-ExecutionPolicy Bypass -File `"$InstallerPath`"" `
        -WorkingDirectory $workingDir `
        -Wait

} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   Oops! Something Went Wrong" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""

    if ($_.Exception -is [System.Net.WebException]) {
        Write-Host "The download didn't work. This usually means:" -ForegroundColor Yellow
        Write-Host "  • Your internet connection is slow or interrupted" -ForegroundColor Gray
        Write-Host "  • A firewall is blocking the download" -ForegroundColor Gray
        Write-Host "  • The website is temporarily down" -ForegroundColor Gray
        Write-Host ""
        Write-Host "What to try:" -ForegroundColor Cyan
        Write-Host "  1. Check your internet is working (try opening a website)"
        Write-Host "  2. Wait a minute and run this installer again"
        Write-Host "  3. Or download manually from:"
        Write-Host "     https://github.com/cboyd0319/job-private-scraper-filter" -ForegroundColor White
        Write-Host "     (Click the green 'Code' button, then 'Download ZIP')"
    } elseif ($_.Exception -is [System.IO.IOException]) {
        Write-Host "Couldn't save files to your Desktop." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "This might be because:" -ForegroundColor Cyan
        Write-Host "  • Another program is using the folder"
        Write-Host "  • You don't have permission to save there"
        Write-Host ""
        Write-Host "What to try:" -ForegroundColor Cyan
        Write-Host "  1. Close other programs"
        Write-Host "  2. Right-click this installer and choose 'Run as administrator'"
        Write-Host "  3. Try again"
    } else {
        Write-Host "An unexpected error occurred." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Technical details (for troubleshooting):" -ForegroundColor Gray
        Write-Host "  Error type: $($_.Exception.GetType().Name)" -ForegroundColor Gray
        Write-Host "  Message: $($_.Exception.Message)" -ForegroundColor Gray
    }

    Write-Host ""
    Write-Host "Press any key to close this window..." -ForegroundColor Cyan
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    exit 1
} finally {
    # Clean up the ZIP file
    if (Test-Path $ZipPath) {
        Remove-Item $ZipPath -Force -ErrorAction SilentlyContinue
    }
}
