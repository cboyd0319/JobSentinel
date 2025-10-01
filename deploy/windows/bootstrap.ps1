# Job Finder Bootstrapper
# Safely downloads and launches the main installer.

# --- Configuration ---
$RepoUrl = "https://github.com/cboyd0319/job-private-scraper-filter/archive/refs/heads/main.zip"
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$InstallDir = Join-Path $DesktopPath "Job-Finder-Setup"
$ZipPath = Join-Path $InstallDir "project.zip"

# --- Friendly Introduction ---
Clear-Host
Write-Host "Hello!" -ForegroundColor Green
Write-Host "I'm going to download the Personal Job Finder for you."
Write-Host "It will be placed in a new folder on your Desktop called 'Job-Finder-Setup'."
Write-Host ""

$confirmation = Read-Host "Is that okay? (Press Y to continue, N to cancel)"
if ($confirmation -ne 'y') {
    Write-Host "Setup cancelled. No files were downloaded." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    return
}

# --- Safe Download and Unzip ---
try {
    Write-Host "`nDownloading... (this may take a minute)" -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Invoke-WebRequest -Uri $RepoUrl -OutFile $ZipPath -UseBasicParsing

    Write-Host "Unpacking the files..." -ForegroundColor Cyan
    Expand-Archive -Path $ZipPath -DestinationPath $InstallDir -Force

    # The unzipped folder has a dynamic name, so we find it
    $ExtractedFolderName = (Get-ChildItem -Path $InstallDir -Directory | Where-Object { $_.Name -like 'job-private-scraper-filter-*' }).Name
    $InstallerPath = Join-Path $InstallDir "$ExtractedFolderName\deploy\windows\install.ps1"

    if (-not (Test-Path $InstallerPath)) {
        throw "Installer file not found after download. Something went wrong."
    }

    Write-Host "✓ Download complete!" -ForegroundColor Green
    Write-Host "`nNow, I'll start the main setup window for you..."
    Start-Sleep -Seconds 2

    # --- Launch Main Installer ---
    # Use -ExecutionPolicy Bypass for this single, trusted script launch
    Start-Process powershell.exe -ArgumentList "-ExecutionPolicy Bypass -File `"$InstallerPath`"" -WorkingDirectory (Split-Path $InstallerPath -Parent)

} catch {
    Write-Host "`nOh dear, something went wrong during the download." -ForegroundColor Red
    if ($_.Exception -is [System.Net.WebException]) {
        Write-Host "This might be due to a network issue or a firewall blocking the download." -ForegroundColor Yellow
        Write-Host "You can try again, or download the project manually:" -ForegroundColor Yellow
        Write-Host "1. Go to: https://github.com/cboyd0319/job-private-scraper-filter" -ForegroundColor Cyan
        Write-Host "2. Click the green 'Code' button, then 'Download ZIP'." -ForegroundColor Cyan
        Write-Host "3. Unzip the file to your Desktop and run the 'install.ps1' file inside the 'deploy/windows' folder." -ForegroundColor Cyan
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
    Write-Host "Please check your internet connection and try again."
    Start-Sleep -Seconds 15
} finally {
    # Clean up the downloaded zip file
    if (Test-Path $ZipPath) {
        Remove-Item $ZipPath -Force -ErrorAction SilentlyContinue
    }
}
