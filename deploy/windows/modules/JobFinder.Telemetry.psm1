<#
.SYNOPSIS
    Provides privacy-first telemetry for the Job Finder suite.
.DESCRIPTION
    This module tracks anonymous usage and performance metrics for diagnostic purposes.
    It is designed with privacy as the top priority:
    - All data is stored locally on the user's machine.
    - NO data is ever sent over the network.
    - Telemetry is enabled by default but can be easily disabled.
    - Data is automatically pruned after a configurable retention period.
.NOTES
    Author: Gemini
    Version: 1.0.0
#>

Set-StrictMode -Version Latest

# --- Module Imports & State ---
try {
    Import-Module (Join-Path $PSScriptRoot '..\Config.ps1')
    $script:TelemetryConfig = Get-JobFinderConfig -Path "Telemetry"
} catch {
    # If config fails, disable telemetry to be safe.
    $script:TelemetryConfig = @{ Enabled = $false }
    Write-Error "Could not load configuration. Telemetry will be disabled."
}

$script:TelemetryFile = Join-Path $env:TEMP $script:TelemetryConfig.EventFile

# --- Core Functions ---

function Write-TelemetryEvent {
    <#
    .SYNOPSIS
        Writes a telemetry event to the local JSONL file.
    .PARAMETER EventName
        The name of the event (e.g., "install_started").
    .PARAMETER Properties
        A hashtable of additional, non-sensitive properties.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$EventName,
        [hashtable]$Properties = @{}
    )

    if (-not $script:TelemetryConfig.Enabled) {
        return
    }

    try {
        $entry = [ordered]@{
            timestamp = (Get-Date).ToUniversalTime().ToString('o')
            event     = $EventName
            version   = Get-JobFinderConfig -Path "Product.Version"
            os        = [System.Environment]::OSVersion.VersionString
        }

        foreach ($key in $Properties.Keys) {
            $entry[$key] = $Properties[$key]
        }

        ($entry | ConvertTo-Json -Compress) | Add-Content -Path $script:TelemetryFile -Encoding UTF8
        Write-Verbose "Telemetry event logged: $EventName"
    } catch {
        # This is a non-critical failure.
        Write-Verbose "Failed to write telemetry event. Error: $($_.Exception.Message)"
    }
}

function Get-TelemetryEvents {
    <#
    .SYNOPSIS
        Retrieves and filters telemetry events from the local file.
    #>
    [CmdletBinding()]
    [OutputType([array])]
    param(
        [string]$EventName,
        [datetime]$Since
    )

    if (-not (Test-Path $script:TelemetryFile)) {
        return @()
    }

    try {
        $events = Get-Content $script:TelemetryFile -Encoding UTF8 | ForEach-Object { $_ | ConvertFrom-Json }

        if ($EventName) {
            $events = $events | Where-Object { $_.event -eq $EventName }
        }
        if ($Since) {
            $events = $events | Where-Object { ([datetime]$_.timestamp) -gt $Since }
        }
        return $events
    } catch {
        Write-Warning "Could not read or parse telemetry file. It may be corrupt."
        return @()
    }
}

function Clear-OldTelemetryEvents {
    <#
    .SYNOPSIS
        Removes telemetry events older than the configured retention period.
    #>
    [CmdletBinding(SupportsShouldProcess=$true)]
    param()

    if (-not (Test-Path $script:TelemetryFile)) { return }

    $retentionDays = $script:TelemetryConfig.DataRetentionDays
    $cutoffDate = (Get-Date).AddDays(-$retentionDays)

    if ($PSCmdlet.ShouldProcess($script:TelemetryFile, "Remove events older than $cutoffDate")) {
        try {
            $events = Get-Content $script:TelemetryFile -Encoding UTF8 | ForEach-Object { $_ | ConvertFrom-Json }
            $recentEvents = $events | Where-Object { ([datetime]$_.timestamp) -ge $cutoffDate }

            if ($recentEvents.Count -lt $events.Count) {
                $recentEvents | ForEach-Object { $_ | ConvertTo-Json -Compress } | Set-Content -Path $script:TelemetryFile -Encoding UTF8
                Write-Verbose "Cleared $($events.Count - $recentEvents.Count) old telemetry events."
            }
        } catch {
            Write-Warning "Could not clear old telemetry events. Error: $($_.Exception.Message)"
        }
    }
}

# --- Helper Functions for Common Events ---

function Write-InstallStartedEvent { [CmdletBinding()] param([string]$Method) { Write-TelemetryEvent -EventName "install_started" -Properties @{ method = $Method } } }
function Write-InstallCompletedEvent { [CmdletBinding()] param([string]$Method, [int]$DurationSeconds) { Write-TelemetryEvent -EventName "install_completed" -Properties @{ method = $Method; duration = $DurationSeconds } } }
function Write-InstallFailedEvent { [CmdletBinding()] param([string]$Method, [string]$FailedStep, [string]$ErrorMessage) { Write-TelemetryEvent -EventName "install_failed" -Properties @{ method = $Method; step = $FailedStep; error = $ErrorMessage } } }
function Write-UninstallStartedEvent { [CmdletBinding()] param([bool]$KeepData) { Write-TelemetryEvent -EventName "uninstall_started" -Properties @{ keep_data = $KeepData } } }

# --- Export Members ---
Export-ModuleMember -Function Write-TelemetryEvent, Get-TelemetryEvents, Clear-OldTelemetryEvents, Write-InstallStartedEvent, Write-InstallCompletedEvent, Write-InstallFailedEvent, Write-UninstallStartedEvent