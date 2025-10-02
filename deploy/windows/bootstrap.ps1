# Job Finder Bootstrapper
# Safely downloads and launches the main installer.

# --- Configuration ---
$RepoUrl = "https://github.com/cboyd0319/job-private-scraper-filter/archive/refs/heads/main.zip"
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$InstallDir = Join-Path $DesktopPath "Job-Finder-Setup"
$ZipPath = Join-Path $InstallDir "project.zip"

# --- Friendly Introduction ---
Clear-Host
Write-Output "Hello!"
Write-Output "I'm going to download the Personal Job Finder for you."
Write-Output "It will be placed in a new folder on your Desktop called 'Job-Finder-Setup'."
Write-Output ""

$confirmation = Read-Host "Is that okay? (Press Y to continue, N to cancel)"
if ($confirmation -ne 'Y' -and $confirmation -ne 'y') {
    Write-Warning "Setup cancelled. No files were downloaded."
    Start-Sleep -Seconds 3
    return
}

# --- Safe Download and Unzip ---
try {
    Write-Output "`nDownloading... (this may take a minute)"
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Invoke-WebRequest -Uri $RepoUrl -OutFile $ZipPath -UseBasicParsing

    Write-Output "Unpacking the files..."
    Expand-Archive -Path $ZipPath -DestinationPath $InstallDir -Force

    $ExtractedFolderName = (Get-ChildItem -Path $InstallDir -Directory | Where-Object { $_.Name -like 'job-private-scraper-filter-*' }).Name
    $InstallerPath = Join-Path $InstallDir "$ExtractedFolderName\deploy\windows\install.ps1"

    if (-not (Test-Path $InstallerPath)) {
        throw "Installer file not found after download. Something went wrong."
    }

    Write-Output "✓ Download complete!"
    Write-Output "`nNow, I'll start the main setup window for you..."
    Start-Sleep -Seconds 2

    # --- Launch Main Installer ---
    Start-Process powershell.exe -ArgumentList "-NoExit -ExecutionPolicy Bypass -File `"$InstallerPath`"" -WorkingDirectory (Split-Path $InstallerPath -Parent) -Wait

} catch {
    Write-Error "`nOh dear, something went wrong during the download."
    if ($_.Exception -is [System.Net.WebException]) {
        Write-Warning "This might be due to a network issue or a firewall blocking the download."
        Write-Warning "You can try again, or download the project manually:"
        Write-Output "1. Go to: https://github.com/cboyd0319/job-private-scraper-filter"
        Write-Output "2. Click the green 'Code' button, then 'Download ZIP'."
        Write-Output "3. Unzip the file to your Desktop and run the 'install.ps1' file inside the 'deploy/windows' folder."
    } else {
        Write-Error "Error: $($_.Exception.Message)"
    }
    Write-Warning "Please check your internet connection and try again."
    Start-Sleep -Seconds 15
} finally {
    if (Test-Path $ZipPath) {
        Remove-Item $ZipPath -Force -ErrorAction SilentlyContinue
    }
}
