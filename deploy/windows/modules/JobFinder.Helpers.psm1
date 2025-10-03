<#
.SYNOPSIS
    Helper utilities for Job Finder
.DESCRIPTION
    Common utility functions used across components
#>

Set-StrictMode -Version Latest

function New-DesktopShortcut {
    <#
    .SYNOPSIS
        Create a desktop shortcut
    .PARAMETER Name
        Shortcut name (without .lnk extension)
    .PARAMETER TargetPath
        Path to the target file
    .PARAMETER WorkingDirectory
        Working directory for the shortcut
    .PARAMETER IconLocation
        Icon file path
    .EXAMPLE
        New-DesktopShortcut -Name "My Job Finder" -TargetPath "C:\App\run.ps1"
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param(
        [Parameter(Mandatory)]
        [string]$Name,

        [Parameter(Mandatory)]
        [string]$TargetPath,

        [string]$WorkingDirectory = (Split-Path $TargetPath -Parent),

        [string]$IconLocation = "shell32.dll,21",

        [string]$Arguments = ""
    )

    if ($PSCmdlet.ShouldProcess($Name, "Create desktop shortcut")) {
        try {
            $desktopPath = [Environment]::GetFolderPath('Desktop')
            $shortcutPath = Join-Path $desktopPath "$Name.lnk"

            $shell = New-Object -ComObject WScript.Shell
            $shortcut = $shell.CreateShortcut($shortcutPath)

            # For PowerShell scripts, target powershell.exe
            if ($TargetPath -like '*.ps1') {
                $shortcut.TargetPath = "powershell.exe"
                $shortcut.Arguments = "-ExecutionPolicy Bypass -NoProfile -File `"$TargetPath`" $Arguments"
            } else {
                $shortcut.TargetPath = $TargetPath
                $shortcut.Arguments = $Arguments
            }

            $shortcut.WorkingDirectory = $WorkingDirectory
            $shortcut.IconLocation = $IconLocation
            $shortcut.Description = $Name
            $shortcut.Save()

            Write-Verbose "Created shortcut: $shortcutPath"
            return $shortcutPath
        } catch {
            Write-Error "Failed to create shortcut: $_"
            return $null
        } finally {
            if ($shell) {
                [System.Runtime.Interopservices.Marshal]::ReleaseComObject($shell) | Out-Null
            }
        }
    }
}

function Start-ProcessWithProgress {
    <#
    .SYNOPSIS
        Start a process with animated progress indicator
    .PARAMETER FilePath
        Path to executable
    .PARAMETER ArgumentList
        Arguments to pass
    .PARAMETER Description
        Description shown during progress
    .OUTPUTS
        Exit code of the process
    .EXAMPLE
        $exitCode = Start-ProcessWithProgress -FilePath "installer.exe" -ArgumentList "/S" -Description "Installing"
    #>
    [CmdletBinding()]
    [OutputType([int])]
    param(
        [Parameter(Mandatory)]
        [string]$FilePath,

        [string[]]$ArgumentList = @(),

        [string]$Description = "Processing",

        [int]$TimeoutSeconds = 300
    )

    try {
        $job = Start-Job -ScriptBlock {
            param($File, $Args)
            $process = Start-Process -FilePath $File -ArgumentList $Args -Wait -PassThru -NoNewWindow
            return $process.ExitCode
        } -ArgumentList $FilePath, $ArgumentList

        $elapsed = 0
        $dots = 0

        while ($job.State -eq 'Running' -and $elapsed -lt $TimeoutSeconds) {
            $dots = ($dots + 1) % 4
            $animation = "." * $dots + " " * (3 - $dots)
            Write-Host "`r$Description$animation [$elapsed s]" -NoNewline -ForegroundColor Cyan

            Start-Sleep -Seconds 1
            $elapsed++
        }

        Write-Host "" # New line after progress

        if ($job.State -eq 'Running') {
            Stop-Job $job
            Remove-Job $job -Force
            Write-Error "Process timed out after $TimeoutSeconds seconds"
            return -1
        }

        $exitCode = Receive-Job $job
        Remove-Job $job -Force

        if ($exitCode -eq 0) {
            Write-Host "$Description completed successfully" -ForegroundColor Green
        } else {
            Write-Host "$Description exited with code $exitCode" -ForegroundColor Yellow
        }

        return $exitCode
    } catch {
        Write-Error "Process execution failed: $_"
        return -1
    }
}

function Test-UpdateAvailable {
    <#
    .SYNOPSIS
        Check if a newer version is available on GitHub
    .PARAMETER CurrentVersion
        Current installed version
    .PARAMETER RepositoryUrl
        GitHub repository URL
    .OUTPUTS
        Boolean indicating if update is available
    .EXAMPLE
        if (Test-UpdateAvailable -CurrentVersion "1.0.0") { ... }
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory)]
        [version]$CurrentVersion,

        [string]$RepositoryUrl = "cboyd0319/job-private-scraper-filter"
    )

    try {
        $apiUrl = "https://api.github.com/repos/$RepositoryUrl/releases/latest"
        $release = Invoke-RestMethod -Uri $apiUrl -ErrorAction Stop -TimeoutSec 10

        if ($release.tag_name -match '^v?(\d+\.\d+\.\d+)') {
            $latestVersion = [version]$matches[1]
            $updateAvailable = $latestVersion -gt $CurrentVersion

            Write-Verbose "Current: $CurrentVersion, Latest: $latestVersion, Update available: $updateAvailable"
            return $updateAvailable
        }
    } catch {
        Write-Verbose "Failed to check for updates: $_"
    }

    return $false
}

function Get-InstallerCache {
    <#
    .SYNOPSIS
        Get path to installer cache directory
    .PARAMETER Create
        Create directory if it doesn't exist
    .OUTPUTS
        Path to cache directory
    .EXAMPLE
        $cacheDir = Get-InstallerCache -Create
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [switch]$Create
    )

    $cacheDir = Join-Path $env:TEMP "job-finder-cache"

    if ($Create -and -not (Test-Path $cacheDir)) {
        New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
        Write-Verbose "Created cache directory: $cacheDir"
    }

    return $cacheDir
}

function Get-CachedInstaller {
    <#
    .SYNOPSIS
        Get cached installer if it exists and hash matches
    .PARAMETER Name
        Installer name (e.g., "python-3.12.10.exe")
    .PARAMETER ExpectedHash
        Expected SHA256 hash
    .OUTPUTS
        Path to cached installer or $null
    .EXAMPLE
        $installer = Get-CachedInstaller -Name "python.exe" -ExpectedHash $hash
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory)]
        [string]$Name,

        [Parameter(Mandatory)]
        [string]$ExpectedHash
    )

    $cacheDir = Get-InstallerCache
    $cachedFile = Join-Path $cacheDir $Name

    if (Test-Path $cachedFile) {
        try {
            $actualHash = (Get-FileHash $cachedFile -Algorithm SHA256).Hash

            if ($actualHash -eq $ExpectedHash) {
                Write-Host "Using cached installer: $Name" -ForegroundColor Green
                return $cachedFile
            } else {
                Write-Verbose "Cached file hash mismatch, will re-download"
                Remove-Item $cachedFile -Force -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Verbose "Failed to verify cached file: $_"
        }
    }

    return $null
}

function Set-CachedInstaller {
    <#
    .SYNOPSIS
        Copy installer to cache
    .PARAMETER SourcePath
        Source installer path
    .PARAMETER Name
        Name for cached file
    .EXAMPLE
        Set-CachedInstaller -SourcePath "C:\Temp\python.exe" -Name "python-3.12.10.exe"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$SourcePath,

        [Parameter(Mandatory)]
        [string]$Name
    )

    try {
        $cacheDir = Get-InstallerCache -Create
        $cachedPath = Join-Path $cacheDir $Name

        Copy-Item $SourcePath $cachedPath -Force -ErrorAction Stop
        Write-Verbose "Cached installer: $cachedPath"
        return $cachedPath
    } catch {
        Write-Verbose "Failed to cache installer: $_"
        return $null
    }
}

Export-ModuleMember -Function @(
    'New-DesktopShortcut',
    'Start-ProcessWithProgress',
    'Test-UpdateAvailable',
    'Get-InstallerCache',
    'Get-CachedInstaller',
    'Set-CachedInstaller'
)
