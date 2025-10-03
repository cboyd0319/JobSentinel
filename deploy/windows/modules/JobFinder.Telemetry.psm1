<#
.SYNOPSIS
    Privacy-conscious telemetry module for Job Finder
.DESCRIPTION
    Tracks installation success/failure metrics locally only.
    NO data is sent externally. Used for diagnostics only.
#>

Set-StrictMode -Version Latest

$script:TelemetryEnabled = $true
$script:TelemetryFile = Join-Path $env:TEMP "job-finder-telemetry.jsonl"

function Initialize-Telemetry {
    <#
    .SYNOPSIS
        Initialize telemetry system
    .PARAMETER Enabled
        Enable or disable telemetry
    .PARAMETER TelemetryPath
        Path to telemetry file
    .EXAMPLE
        Initialize-Telemetry -Enabled $true
    #>
    [CmdletBinding()]
    param(
        [bool]$Enabled = $true,
        [string]$TelemetryPath = (Join-Path $env:TEMP "job-finder-telemetry.jsonl")
    )

    $script:TelemetryEnabled = $Enabled
    $script:TelemetryFile = $TelemetryPath

    if ($Enabled) {
        Write-Verbose "Telemetry initialized (local only): $TelemetryPath"
    } else {
        Write-Verbose "Telemetry disabled"
    }
}

function Write-TelemetryEvent {
    <#
    .SYNOPSIS
        Write a telemetry event (local only, never sent externally)
    .PARAMETER Event
        Event name
    .PARAMETER Properties
        Event properties (hashtable)
    .EXAMPLE
        Write-TelemetryEvent -Event "install_started" -Properties @{method="cloud"}
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Event,

        [hashtable]$Properties = @{}
    )

    if (-not $script:TelemetryEnabled) {
        return
    }

    try {
        $entry = [ordered]@{
            timestamp = (Get-Date).ToUniversalTime().ToString('o')
            event = $Event
            version = '0.4.5'
            os = [System.Environment]::OSVersion.VersionString
            ps_version = $PSVersionTable.PSVersion.ToString()
        }

        # Add custom properties
        foreach ($key in $Properties.Keys) {
            $entry[$key] = $Properties[$key]
        }

        # Append to JSONL file
        ($entry | ConvertTo-Json -Compress) | Add-Content -Path $script:TelemetryFile -Encoding UTF8 -ErrorAction SilentlyContinue

        Write-Verbose "Telemetry event: $Event"
    } catch {
        Write-Verbose "Failed to write telemetry: $_"
    }
}

function Get-TelemetryEvents {
    <#
    .SYNOPSIS
        Retrieve telemetry events
    .PARAMETER EventName
        Filter by event name
    .PARAMETER Since
        Only return events after this date
    .OUTPUTS
        Array of telemetry events
    .EXAMPLE
        Get-TelemetryEvents -EventName "install_completed"
    #>
    [CmdletBinding()]
    [OutputType([array])]
    param(
        [string]$EventName,
        [datetime]$Since
    )

    if (-not (Test-Path $script:TelemetryFile)) {
        Write-Verbose "No telemetry file found"
        return @()
    }

    try {
        $events = Get-Content $script:TelemetryFile -Encoding UTF8 -ErrorAction Stop |
            ForEach-Object { $_ | ConvertFrom-Json }

        if ($EventName) {
            $events = $events | Where-Object { $_.event -eq $EventName }
        }

        if ($Since) {
            $events = $events | Where-Object {
                [datetime]$_.timestamp -gt $Since
            }
        }

        return $events
    } catch {
        Write-Verbose "Failed to read telemetry: $_"
        return @()
    }
}

function Get-TelemetrySummary {
    <#
    .SYNOPSIS
        Get summary statistics from telemetry
    .OUTPUTS
        Hashtable with summary statistics
    .EXAMPLE
        $summary = Get-TelemetrySummary
    #>
    [CmdletBinding()]
    [OutputType([hashtable])]
    param()

    $events = Get-TelemetryEvents

    if ($events.Count -eq 0) {
        return @{
            TotalEvents = 0
            EventTypes = @()
        }
    }

    $summary = @{
        TotalEvents = $events.Count
        EventTypes = ($events | Group-Object -Property event | ForEach-Object {
            @{
                Name = $_.Name
                Count = $_.Count
            }
        })
        FirstEvent = ($events | Sort-Object timestamp | Select-Object -First 1).timestamp
        LastEvent = ($events | Sort-Object timestamp | Select-Object -Last 1).timestamp
    }

    return $summary
}

function Clear-TelemetryData {
    <#
    .SYNOPSIS
        Clear all telemetry data
    .EXAMPLE
        Clear-TelemetryData
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param()

    if ($PSCmdlet.ShouldProcess($script:TelemetryFile, "Clear telemetry data")) {
        if (Test-Path $script:TelemetryFile) {
            try {
                Remove-Item $script:TelemetryFile -Force -ErrorAction Stop
                Write-Verbose "Telemetry data cleared"
            } catch {
                Write-Error "Failed to clear telemetry: $_"
            }
        }
    }
}

# Common telemetry events helper functions

function Write-InstallStartedEvent {
    [CmdletBinding()]
    param([string]$Method = "unknown")
    Write-TelemetryEvent -Event "install_started" -Properties @{ method = $Method }
}

function Write-InstallCompletedEvent {
    [CmdletBinding()]
    param([int]$DurationSeconds, [string]$Method = "unknown")
    Write-TelemetryEvent -Event "install_completed" -Properties @{
        duration_seconds = $DurationSeconds
        method = $Method
    }
}

function Write-InstallFailedEvent {
    [CmdletBinding()]
    param([string]$ErrorType, [string]$Step)
    Write-TelemetryEvent -Event "install_failed" -Properties @{
        error_type = $ErrorType
        failed_step = $Step
    }
}

function Write-UninstallEvent {
    [CmdletBinding()]
    param([bool]$KeepData)
    Write-TelemetryEvent -Event "uninstall" -Properties @{
        keep_data = $KeepData
    }
}

Export-ModuleMember -Function @(
    'Initialize-Telemetry',
    'Write-TelemetryEvent',
    'Get-TelemetryEvents',
    'Get-TelemetrySummary',
    'Clear-TelemetryData',
    'Write-InstallStartedEvent',
    'Write-InstallCompletedEvent',
    'Write-InstallFailedEvent',
    'Write-UninstallEvent'
)
