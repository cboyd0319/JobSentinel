<#
.SYNOPSIS
    Structured logging module for Job Finder
.DESCRIPTION
    Provides consistent logging across all components with support for
    multiple output formats and log levels
#>

Set-StrictMode -Version Latest

# Module-level variables
$script:LogDirectory = $null
$script:CurrentLogFile = $null
$script:TraceId = (New-Guid).Guid.Substring(0, 8)

function Initialize-Logging {
    <#
    .SYNOPSIS
        Initialize logging subsystem
    .PARAMETER LogDirectory
        Directory where log files will be stored
    .PARAMETER Component
        Component name for log file naming
    .EXAMPLE
        Initialize-Logging -LogDirectory "C:\App\logs" -Component "installer"
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$LogDirectory,

        [Parameter(Mandatory)]
        [string]$Component
    )

    $script:LogDirectory = $LogDirectory
    $script:TraceId = (New-Guid).Guid.Substring(0, 8)

    # Ensure log directory exists
    if (-not (Test-Path $LogDirectory)) {
        New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
    }

    # Create log file with timestamp
    $timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $script:CurrentLogFile = Join-Path $LogDirectory "$Component-$timestamp-$script:TraceId.log"

    Write-LogEntry -Message "Logging initialized" -Level Info -Extra @{
        component = $Component
        trace_id = $script:TraceId
        log_file = $script:CurrentLogFile
    }
}

function Write-LogEntry {
    <#
    .SYNOPSIS
        Write a structured log entry
    .PARAMETER Message
        Log message
    .PARAMETER Level
        Log level (Debug, Info, Warn, Error)
    .PARAMETER Extra
        Additional structured data
    .EXAMPLE
        Write-LogEntry -Message "Operation started" -Level Info -Extra @{duration=10}
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Message,

        [ValidateSet('Debug', 'Info', 'Warn', 'Error')]
        [string]$Level = 'Info',

        [hashtable]$Extra = @{}
    )

    # Structured log entry
    $entry = [ordered]@{
        timestamp = (Get-Date).ToUniversalTime().ToString('o')
        trace_id = $script:TraceId
        level = $Level.ToLower()
        message = $Message
    }

    # Add extra fields
    foreach ($key in $Extra.Keys) {
        $entry[$key] = $Extra[$key]
    }

    # Write to file (JSON Lines format)
    if ($script:CurrentLogFile) {
        try {
            ($entry | ConvertTo-Json -Compress) | Add-Content -Path $script:CurrentLogFile -Encoding UTF8 -ErrorAction SilentlyContinue
        } catch {
            Write-Warning "Failed to write to log file: $_"
        }
    }

    # Console output
    $color = switch ($Level) {
        'Debug' { 'Gray' }
        'Info'  { 'White' }
        'Warn'  { 'Yellow' }
        'Error' { 'Red' }
        default { 'White' }
    }

    $prefix = switch ($Level) {
        'Debug' { '[DEBUG]' }
        'Info'  { '[INFO] ' }
        'Warn'  { '[WARN] ' }
        'Error' { '[ERROR]' }
    }

    Write-Host "$prefix $Message" -ForegroundColor $color
}

function Write-LogDebug {
    <#
    .SYNOPSIS
        Write debug-level log entry
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Message,

        [hashtable]$Extra = @{}
    )

    if ($VerbosePreference -ne 'SilentlyContinue' -or $DebugPreference -ne 'SilentlyContinue') {
        Write-LogEntry -Message $Message -Level Debug -Extra $Extra
    }
}

function Write-LogInfo {
    <#
    .SYNOPSIS
        Write info-level log entry
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Message,

        [hashtable]$Extra = @{}
    )

    Write-LogEntry -Message $Message -Level Info -Extra $Extra
}

function Write-LogWarn {
    <#
    .SYNOPSIS
        Write warning-level log entry
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Message,

        [hashtable]$Extra = @{}
    )

    Write-LogEntry -Message $Message -Level Warn -Extra $Extra
}

function Write-LogError {
    <#
    .SYNOPSIS
        Write error-level log entry
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Message,

        [hashtable]$Extra = @{},

        [System.Management.Automation.ErrorRecord]$ErrorRecord
    )

    if ($ErrorRecord) {
        $Extra['error_message'] = $ErrorRecord.Exception.Message
        $Extra['error_type'] = $ErrorRecord.Exception.GetType().FullName
        $Extra['stack_trace'] = $ErrorRecord.ScriptStackTrace
    }

    Write-LogEntry -Message $Message -Level Error -Extra $Extra
}

function Get-CurrentTraceId {
    <#
    .SYNOPSIS
        Get the current trace ID for correlation
    .OUTPUTS
        String containing the trace ID
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param()

    return $script:TraceId
}

function Get-CurrentLogFile {
    <#
    .SYNOPSIS
        Get the current log file path
    .OUTPUTS
        String containing the log file path
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param()

    return $script:CurrentLogFile
}

Export-ModuleMember -Function @(
    'Initialize-Logging',
    'Write-LogEntry',
    'Write-LogDebug',
    'Write-LogInfo',
    'Write-LogWarn',
    'Write-LogError',
    'Get-CurrentTraceId',
    'Get-CurrentLogFile'
)
