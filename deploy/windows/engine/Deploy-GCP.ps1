<#
.SYNOPSIS
    A robust, non-interactive deployment engine for provisioning the Job Scraper to GCP.
#>

param()

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# region === Colors & Styling ===

$script:UseColor = ($null -eq $env:NO_COLOR) -and $Host.UI.SupportsVirtualTerminal
$script:Theme = [ordered]@{
    Accent   = '36'
    Warning  = '33'
    Error    = '31'
    Success  = '32'
    Neutral  = '37'
}

function Format-ColorizedText {
    param(
        [string]$Text,
        [string]$ColorCode
    )

    if (-not $script:UseColor -or [string]::IsNullOrWhiteSpace($ColorCode)) {
        return $Text
    }

    "`e[1;${ColorCode}m$Text`e[0m"
}

# endregion

# region === Module & State Management ===

$script:DeploymentState = [ordered]@{ History = @() }

function Save-DeploymentState {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$State,
        [string]$ProjectId = $null,
        [string]$Region = $null,
        [string]$ServiceUrl = $null,
        [string]$SnapshotId = $null
    )

    $snapshot = [pscustomobject]@{
        Timestamp  = Get-Date -Format o
        State      = $State
        ProjectId  = $ProjectId
        Region     = $Region
        ServiceUrl = $ServiceUrl
        SnapshotId = $SnapshotId
    }

    $script:DeploymentState.History += $snapshot
    return $snapshot
}

# endregion

# region === Logging & Output ===

function Write-RedactedLog {
    [CmdletBinding()]
    [OutputType([string])]
    param([Parameter(ValueFromPipeline, Mandatory)][AllowEmptyString()][string]$Line)

    process {
        if ($Line -eq $null) { return }
        $sanitized = $Line -replace '(?i)(key|token|password)=([^\s;]+)', '$1=***'
        $sanitized.TrimEnd()
    }
}

function Write-Banner {
    param([Parameter(Mandatory)][string]$Text)

    $body = "==== $Text ===="
    Format-ColorizedText -Text $body -ColorCode $script:Theme.Accent
}

function Write-Status {
    param([Parameter(Mandatory)][string]$Message, [string]$Type = 'Info')

    $label, $color = switch ($Type) {
        'Success' { '[SUCCESS]', $script:Theme.Success }
        'Warn'    { '[WARN]',    $script:Theme.Warning }
        'Error'   { '[ERROR]',   $script:Theme.Error }
        default   { '[INFO]',    $script:Theme.Neutral }
    }

    Format-ColorizedText -Text "$label $Message" -ColorCode $color
}

function Write-Panel {
    param(
        [Parameter(Mandatory)][string]$Title,
        [string]$Body = '',
        [string]$Style = 'Info'
    )

    $header = Write-Status -Message $Title -Type $Style
    $content = if ([string]::IsNullOrWhiteSpace($Body)) { @() } else { $Body.Split([Environment]::NewLine) }
    @($header) + $content
}

# endregion

# ... (rest of the script: prerequisites, deployment, main execution) ...

# region === Main ===

try {
    # ... (main logic) ...
} catch {
    Write-Output ''
    Write-Output (Write-Status "Operation failed: $($_.Exception.Message)" -Type Error)
    Write-Output ''
    Write-Output 'For help, see: docs\WINDOWS.md'
    Write-Output ''
    exit 1
}

# endregion
