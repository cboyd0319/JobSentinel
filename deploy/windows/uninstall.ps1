<#
.SYNOPSIS
    Uninstall Job Finder and optionally remove dependencies
.DESCRIPTION
    Removes the Job Finder application with options to preserve user data
    and optionally uninstall Python and Google Cloud SDK.
.PARAMETER RemovePython
    Remove Python 3.12 installation
.PARAMETER RemoveGcloud
    Remove Google Cloud SDK installation
.PARAMETER KeepData
    Preserve user data (database, logs, configuration)
.PARAMETER Force
    Skip confirmation prompts
.EXAMPLE
    .\uninstall.ps1
    Standard uninstall, keeps user data and dependencies
.EXAMPLE
    .\uninstall.ps1 -RemovePython -RemoveGcloud
    Complete removal including Python and gcloud
.EXAMPLE
    .\uninstall.ps1 -Force
    Silent uninstall without prompts
#>

[CmdletBinding(SupportsShouldProcess=$true)]
param(
    [switch]$RemovePython,
    [switch]$RemoveGcloud,
    [switch]$KeepData,
    [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# --- Region: Configuration ---

$script:UninstallLog = Join-Path $env:TEMP "job-finder-uninstall-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$script:ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$script:ItemsRemoved = @()

# --- Region: Logging ---

function Write-UninstallLog {
    param(
        [Parameter(Mandatory)]
        [string]$Message,
        [ValidateSet('Info','Success','Warn','Error')]
        [string]$Level = 'Info'
    )

    $timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $logEntry = "[$timestamp] [$Level] $Message"

    Add-Content -Path $script:UninstallLog -Value $logEntry -ErrorAction SilentlyContinue

    $color = switch ($Level) {
        'Success' { 'Green' }
        'Warn'    { 'Yellow' }
        'Error'   { 'Red' }
        default   { 'White' }
    }

    Write-Host $Message -ForegroundColor $color
}

# --- Region: Confirmation ---

function Confirm-Uninstall {
    if ($Force) { return $true }

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Job Finder Uninstallation" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan

    Write-Host "This will remove:"
    Write-Host "  - Job Finder application files"

    if (-not $KeepData) {
        Write-Host "  - User data (database, logs, config)" -ForegroundColor Yellow
    } else {
        Write-Host "  - User data: PRESERVED" -ForegroundColor Green
    }

    if ($RemovePython) {
        Write-Host "  - Python 3.12 installation" -ForegroundColor Yellow
    }

    if ($RemoveGcloud) {
        Write-Host "  - Google Cloud SDK" -ForegroundColor Yellow
    }

    Write-Host ""
    $response = Read-Host "Continue with uninstallation? (yes/no)"
    return $response -eq 'yes'
}

# --- Region: Uninstall Functions ---

function Remove-ScheduledTask {
    Write-UninstallLog "Checking for scheduled tasks..." -Level Info

    $tasks = @('JobScraperDaily', 'JobScraperHourly', 'JobFinder-Daily')

    foreach ($taskName in $tasks) {
        try {
            $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
            if ($task) {
                Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction Stop
                Write-UninstallLog "Removed scheduled task: $taskName" -Level Success
                $script:ItemsRemoved += "Scheduled Task: $taskName"
            }
        } catch {
            Write-UninstallLog "Failed to remove task $taskName : $($_.Exception.Message)" -Level Warn
        }
    }
}

function Remove-ApplicationFiles {
    Write-UninstallLog "Removing application files..." -Level Info

    if ($KeepData) {
        # Selective removal - keep data directory
        $foldersToRemove = @('src', 'scripts', 'deploy', 'cloud', 'tests', '.venv')
        $filesToRemove = @('*.py', '*.ps1', 'requirements.txt', 'pyproject.toml', 'README.md')

        foreach ($folder in $foldersToRemove) {
            $folderPath = Join-Path $script:ProjectRoot $folder
            if (Test-Path $folderPath) {
                try {
                    Remove-Item $folderPath -Recurse -Force -ErrorAction Stop
                    Write-UninstallLog "Removed folder: $folder" -Level Success
                    $script:ItemsRemoved += "Folder: $folder"
                } catch {
                    Write-UninstallLog "Failed to remove $folder : $($_.Exception.Message)" -Level Warn
                }
            }
        }

        Write-UninstallLog "User data preserved in: $(Join-Path $script:ProjectRoot 'data')" -Level Info
        Write-UninstallLog "Config preserved in: $(Join-Path $script:ProjectRoot 'config')" -Level Info
    } else {
        # Complete removal
        if (Test-Path $script:ProjectRoot) {
            try {
                Remove-Item $script:ProjectRoot -Recurse -Force -ErrorAction Stop
                Write-UninstallLog "Removed all application files" -Level Success
                $script:ItemsRemoved += "Application Directory: $script:ProjectRoot"
            } catch {
                Write-UninstallLog "Failed to remove application files: $($_.Exception.Message)" -Level Error
                throw
            }
        }
    }
}

function Remove-DesktopShortcut {
    Write-UninstallLog "Removing desktop shortcuts..." -Level Info

    $desktopPath = [Environment]::GetFolderPath('Desktop')
    $shortcuts = @('My Job Finder.lnk', 'Job Finder.lnk')

    foreach ($shortcut in $shortcuts) {
        $shortcutPath = Join-Path $desktopPath $shortcut
        if (Test-Path $shortcutPath) {
            try {
                Remove-Item $shortcutPath -Force -ErrorAction Stop
                Write-UninstallLog "Removed shortcut: $shortcut" -Level Success
                $script:ItemsRemoved += "Desktop Shortcut: $shortcut"
            } catch {
                Write-UninstallLog "Failed to remove shortcut $shortcut : $($_.Exception.Message)" -Level Warn
            }
        }
    }
}

function Remove-PythonInstallation {
    if (-not $RemovePython) { return }

    Write-UninstallLog "Removing Python 3.12..." -Level Info

    # Check for Python installation
    $pythonPaths = @(
        (Join-Path $env:LOCALAPPDATA "Programs\Python\Python312"),
        (Join-Path $env:ProgramFiles "Python312"),
        (Join-Path ${env:ProgramFiles(x86)} "Python312")
    )

    foreach ($pythonPath in $pythonPaths) {
        if (Test-Path $pythonPath) {
            $uninstallerPath = Join-Path $pythonPath "Uninstall.exe"

            if (Test-Path $uninstallerPath) {
                try {
                    if ($PSCmdlet.ShouldProcess("Python 3.12", "Uninstall")) {
                        $process = Start-Process -FilePath $uninstallerPath -ArgumentList "/quiet" -Wait -PassThru
                        if ($process.ExitCode -eq 0) {
                            Write-UninstallLog "Python 3.12 uninstalled successfully" -Level Success
                            $script:ItemsRemoved += "Python 3.12"
                        } else {
                            Write-UninstallLog "Python uninstaller exited with code $($process.ExitCode)" -Level Warn
                        }
                    }
                } catch {
                    Write-UninstallLog "Failed to uninstall Python: $($_.Exception.Message)" -Level Error
                }
            } else {
                Write-UninstallLog "Python uninstaller not found at: $uninstallerPath" -Level Warn
                Write-UninstallLog "Manual removal may be required" -Level Info
            }
            break
        }
    }
}

function Remove-GcloudInstallation {
    if (-not $RemoveGcloud) { return }

    Write-UninstallLog "Removing Google Cloud SDK..." -Level Info

    $gcloudPaths = @(
        (Join-Path $env:LOCALAPPDATA "Google\Cloud SDK"),
        (Join-Path $env:ProgramFiles "Google\Cloud SDK"),
        (Join-Path ${env:ProgramFiles(x86)} "Google\Cloud SDK")
    )

    foreach ($gcloudPath in $gcloudPaths) {
        if (Test-Path $gcloudPath) {
            $uninstallerPath = Join-Path $gcloudPath "uninstall.exe"

            if (Test-Path $uninstallerPath) {
                try {
                    if ($PSCmdlet.ShouldProcess("Google Cloud SDK", "Uninstall")) {
                        $process = Start-Process -FilePath $uninstallerPath -ArgumentList "/S" -Wait -PassThru
                        if ($process.ExitCode -eq 0) {
                            Write-UninstallLog "Google Cloud SDK uninstalled successfully" -Level Success
                            $script:ItemsRemoved += "Google Cloud SDK"
                        } else {
                            Write-UninstallLog "gcloud uninstaller exited with code $($process.ExitCode)" -Level Warn
                        }
                    }
                } catch {
                    Write-UninstallLog "Failed to uninstall gcloud: $($_.Exception.Message)" -Level Error
                }
            } else {
                # Try manual removal
                try {
                    Remove-Item $gcloudPath -Recurse -Force -ErrorAction Stop
                    Write-UninstallLog "Manually removed Google Cloud SDK directory" -Level Success
                    $script:ItemsRemoved += "Google Cloud SDK (manual)"
                } catch {
                    Write-UninstallLog "Failed to remove gcloud directory: $($_.Exception.Message)" -Level Warn
                }
            }
            break
        }
    }
}

function Remove-EnvironmentPaths {
    Write-UninstallLog "Cleaning PATH environment variable..." -Level Info

    $pathsToRemove = @(
        'job-finder',
        'job-scraper',
        'Python312',
        'Google\Cloud SDK'
    )

    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $originalPath = $userPath

    foreach ($pathPart in $pathsToRemove) {
        $userPath = ($userPath -split ';' | Where-Object { $_ -notlike "*$pathPart*" }) -join ';'
    }

    if ($userPath -ne $originalPath) {
        try {
            [Environment]::SetEnvironmentVariable("Path", $userPath, "User")
            Write-UninstallLog "PATH environment variable cleaned" -Level Success
        } catch {
            Write-UninstallLog "Failed to update PATH: $($_.Exception.Message)" -Level Warn
        }
    }
}

# --- Region: Main Execution ---

try {
    Write-UninstallLog "=== Job Finder Uninstallation Started ===" -Level Info
    Write-UninstallLog "Log file: $script:UninstallLog" -Level Info

    # Confirmation
    if (-not (Confirm-Uninstall)) {
        Write-UninstallLog "Uninstallation cancelled by user" -Level Info
        exit 0
    }

    Write-Host ""
    Write-UninstallLog "Beginning uninstallation process..." -Level Info

    # Execute uninstall steps
    Remove-ScheduledTask
    Remove-DesktopShortcut
    Remove-ApplicationFiles
    Remove-PythonInstallation
    Remove-GcloudInstallation
    Remove-EnvironmentPaths

    # Summary
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "Uninstallation Complete!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green

    if ($script:ItemsRemoved.Count -gt 0) {
        Write-Host "Items removed:"
        foreach ($item in $script:ItemsRemoved) {
            Write-Host "  - $item"
        }
    }

    Write-Host "`nLog saved to: $script:UninstallLog" -ForegroundColor Cyan

    if ($KeepData) {
        Write-Host "`nUser data preserved in: $script:ProjectRoot\data" -ForegroundColor Yellow
        Write-Host "To completely remove all data, delete this directory manually." -ForegroundColor Yellow
    }

    Write-UninstallLog "=== Uninstallation Completed Successfully ===" -Level Success
    exit 0

} catch {
    Write-UninstallLog "Fatal error during uninstallation: $($_.Exception.Message)" -Level Error
    Write-UninstallLog "Stack trace: $($_.ScriptStackTrace)" -Level Error

    Write-Host "`n========================================" -ForegroundColor Red
    Write-Host "Uninstallation Failed" -ForegroundColor Red
    Write-Host "========================================`n" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nLog file: $script:UninstallLog" -ForegroundColor Yellow

    exit 1
}
