<#
.SYNOPSIS
    Provides a structured, dual-stream logging system for the Job Finder suite.
.DESCRIPTION
    This module offers a centralized way to handle logging. It writes structured
    JSONL logs to a file for detailed diagnostics and simultaneously provides
    color-coded, human-readable output to the console.

    It is designed to be initialized once and then used throughout the application.
.NOTES
    Author: Gemini
    Version: 1.0.0
#>

Set-StrictMode -Version Latest

# --- Module-level State ---
$script:LogInitialized = $false
$script:CurrentLogFile = $null
$script:TraceId = (New-Guid).Guid.Substring(0, 8)
$script:UI = $null

# --- Core Functions ---

function Initialize-Logging {
    <#
    .SYNOPSIS
        Initializes the logging system for a component.
    .PARAMETER ComponentName
        The name of the component, used in the log file name (e.g., "installer", "uninstaller").
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ComponentName
    )

    if ($script:LogInitialized) {
        Write-Verbose "Logging already initialized."
        return
    }

    try {
        Import-Module (Join-Path $PSScriptRoot '..\Config.ps1') -ErrorAction Stop
        $script:UI = Get-JobFinderConfig -Path "UI"
    } catch {
        Write-Error "Could not load Config.ps1. Logging will be written to console only."
    }

    try {
        $logDir = Get-ProjectPath -RelativePath (Get-JobFinderConfig -Path "Paths.LogsDirectory")
        if (-not (Test-Path $logDir)) {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        }
        $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
        $script:CurrentLogFile = Join-Path $logDir "$ComponentName-$timestamp-$script:TraceId.jsonl"
        $script:LogInitialized = $true
        Write-LogInfo -Message "Logging initialized for component '$ComponentName'." -Extra @{ log_file = $script:CurrentLogFile }
    } catch {
        Write-Error "Failed to initialize file logging. Logs will be written to console only. Error: $($_.Exception.Message)"
    }
}

function Write-LogEntry {
    <#
    .SYNOPSIS
        The core function for writing a log entry to all streams.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Message,
        [ValidateSet('Debug', 'Info', 'Warn', 'Error', 'Success')]
        [string]$Level = 'Info',
        [hashtable]$Extra = @{},
        [System.Management.Automation.ErrorRecord]$ErrorRecord
    )

    # 1. Console Output
    $useColor = ($null -eq $env:NO_COLOR) -and $Host.UI.SupportsVirtualTerminal
    if ($script:UI -and $useColor) {
        $symbol = $script:UI.Symbols[$Level]
        $colorCode = $script:UI.Colors[$Level]
        $formattedMessage = "`e[1;${colorCode}m$symbol $Message`e[0m"
    } else {
        $formattedMessage = "[$Level] $Message"
    }
    Write-Host $formattedMessage

    # 2. File Output (JSONL)
    if (-not $script:LogInitialized) { return }

    $logEntry = [ordered]@{
        timestamp = (Get-Date).ToUniversalTime().ToString('o')
        trace_id  = $script:TraceId
        level     = $Level.ToLower()
        message   = $Message
    }

    if ($ErrorRecord) {
        $Extra.error_message = $ErrorRecord.Exception.Message
        $Extra.error_type = $ErrorRecord.Exception.GetType().FullName
        $Extra.stack_trace = $ErrorRecord.ScriptStackTrace
    }

    foreach ($key in $Extra.Keys) {
        $logEntry[$key] = $Extra[$key]
    }

    try {
        ($logEntry | ConvertTo-Json -Compress -Depth 5) | Add-Content -Path $script:CurrentLogFile -Encoding UTF8
    } catch {
        Write-Warning "Failed to write to log file '$script:CurrentLogFile'. Error: $($_.Exception.Message)"
        $script:LogInitialized = $false # Stop trying to write to a broken file
    }
}

# --- Public Helper Functions ---

function Write-LogDebug { [CmdletBinding()] param([string]$Message, [hashtable]$Extra = @{}) { if ($VerbosePreference -ne 'SilentlyContinue' -or $DebugPreference -ne 'SilentlyContinue') { Write-LogEntry -Level Debug -Message $Message -Extra $Extra } } }
function Write-LogInfo { [CmdletBinding()] param([string]$Message, [hashtable]$Extra = @{}) { Write-LogEntry -Level Info -Message $Message -Extra $Extra } }
function Write-LogSuccess { [CmdletBinding()] param([string]$Message, [hashtable]$Extra = @{}) { Write-LogEntry -Level Success -Message $Message -Extra $Extra } }
function Write-LogWarn { [CmdletBinding()] param([string]$Message, [hashtable]$Extra = @{}) { Write-LogEntry -Level Warn -Message $Message -Extra $Extra } }
function Write-LogError { [CmdletBinding()] param([string]$Message, [hashtable]$Extra = @{}, [System.Management.Automation.ErrorRecord]$ErrorRecord) { Write-LogEntry -Level Error -Message $Message -Extra $Extra -ErrorRecord $ErrorRecord } }

function Get-CurrentTraceId { [CmdletBinding()] [OutputType([string])] param() { return $script:TraceId } }
function Get-CurrentLogFile { [CmdletBinding()] [OutputType([string])] param() { return $script:CurrentLogFile } }

# --- Export Members ---
Export-ModuleMember -Function Initialize-Logging, Write-LogDebug, Write-LogInfo, Write-LogSuccess, Write-LogWarn, Write-LogError, Get-CurrentTraceId, Get-CurrentLogFile