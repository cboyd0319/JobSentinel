<#
.SYNOPSIS
    Production-grade GCP deployment orchestrator for Job Scraper
.DESCRIPTION
    Orchestrates Python cloud bootstrap, handles prerequisites, logging, and rollback.
    Follows strict error handling and provides detailed progress feedback.
.PARAMETER Action
    Action to perform: deploy (default), rollback, status, or teardown
.PARAMETER DryRun
    Perform validation without making changes
.EXAMPLE
    .\Deploy-GCP.ps1 deploy
.EXAMPLE
    .\Deploy-GCP.ps1 deploy -DryRun
#>

[CmdletBinding(SupportsShouldProcess=$true)]
param(
    [ValidateSet('deploy','rollback','status','teardown')]
    [string]$Action = 'deploy',
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# --- Region: Configuration ---

$script:TraceId = (New-Guid).Guid.Substring(0,8)
$script:LogDirectory = Join-Path $PSScriptRoot "..\..\..\..\logs"
$script:LogPath = Join-Path $script:LogDirectory "deploy-gcp-$script:TraceId.jsonl"
$script:ConsoleLogPath = Join-Path $script:LogDirectory "deploy-gcp-$script:TraceId.log"
$script:ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path

# --- Region: Styling ---

$script:UseColor = ($null -eq $env:NO_COLOR) -and $Host.UI.SupportsVirtualTerminal
$script:Theme = [ordered]@{
    Accent   = '36'
    Warning  = '33'
    Error    = '31'
    Success  = '32'
    Neutral  = '37'
    Muted    = '90'
}

function Format-ColorText {
    [OutputType([string])]
    param([string]$Text, [string]$ColorCode)

    if (-not $script:UseColor -or [string]::IsNullOrWhiteSpace($ColorCode)) {
        return $Text
    }
    "`e[1;${ColorCode}m$Text`e[0m"
}

# --- Region: Helpers ---

function New-Directory {
    <#
    .SYNOPSIS
        Create directory if it doesn't exist
    #>
    [CmdletBinding(SupportsShouldProcess)]
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

# --- Region: Logging ---

function Write-Log {
    <#
    .SYNOPSIS
        Dual-stream logger: pretty console + structured JSONL
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Message,

        [ValidateSet('Info','Success','Warn','Error','Debug')]
        [string]$Level = 'Info',

        [hashtable]$Extra = @{}
    )

    # Structured log entry
    $entry = [ordered]@{
        timestamp = (Get-Date).ToUniversalTime().ToString('o')
        trace_id = $script:TraceId
        level = $Level.ToLower()
        message = $Message
        action = $Action
    }

    foreach ($key in $Extra.Keys) {
        $entry[$key] = $Extra[$key]
    }

    # Write JSONL
    try {
        New-Directory (Split-Path $script:LogPath -Parent)
        ($entry | ConvertTo-Json -Compress) | Add-Content -Path $script:LogPath -Encoding UTF8 -ErrorAction SilentlyContinue
    } catch {
        Write-Error "Failed to write JSONL log: $_" -ErrorAction SilentlyContinue
    }

    # Console output
    $label, $color = switch ($Level) {
        'Success' { '✓', $script:Theme.Success }
        'Warn'    { '⚠', $script:Theme.Warning }
        'Error'   { '✗', $script:Theme.Error }
        'Debug'   { '→', $script:Theme.Muted }
        default   { '→', $script:Theme.Neutral }
    }

    $decorated = Format-ColorText "$label $Message" $color
    Write-Output $decorated

    # Also write to console log
    try {
        "[$Level] $Message" | Add-Content -Path $script:ConsoleLogPath -Encoding UTF8 -ErrorAction SilentlyContinue
    } catch {
        Write-Error "Failed to write to console log: $_" -ErrorAction SilentlyContinue
    }
}

function Write-Panel {
    <#
    .SYNOPSIS
        Pretty panel output
    #>
    param(
        [Parameter(Mandatory)]
        [string]$Title,
        [string[]]$Lines = @()
    )

    $width = 60
    Write-Output ""
    Write-Output (Format-ColorText "╔$("═" * $width)╗" $script:Theme.Accent)

    $paddedTitle = " $Title "
    $padding = [Math]::Max(0, $width - $paddedTitle.Length)
    $leftPad = [Math]::Floor($padding / 2)
    $rightPad = $padding - $leftPad
    $centeredTitle = (" " * $leftPad) + $paddedTitle + (" " * $rightPad)

    Write-Output (Format-ColorText "║$centeredTitle║" $script:Theme.Accent)
    Write-Output (Format-ColorText "╚$("═" * $width)╝" $script:Theme.Accent)

    foreach ($line in $Lines) {
        Write-Output "  $line"
    }
    Write-Output ""
}

# --- Region: Prerequisites ---

function Test-Prerequisite {
    <#
    .SYNOPSIS
        Check if a command exists
    #>
    [OutputType([bool])]
    param([string]$Command)

    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

function Assert-Prerequisites {
    <#
    .SYNOPSIS
        Ensure all required tools are present
    #>
    Write-Log "Checking prerequisites..." -Level Info

    $missing = @()

    # Python check
    if (-not (Test-Prerequisite 'python')) {
        $missing += 'Python 3.12+'
    } else {
        $pyVersion = & python --version 2>&1
        Write-Log "Found: $pyVersion" -Level Debug
    }

    # gcloud check
    if (-not (Test-Prerequisite 'gcloud')) {
        $missing += 'Google Cloud SDK (gcloud)'
    } else {
        $gcloudVersion = & gcloud version --format="value(core-version)" 2>&1 | Select-Object -First 1
        Write-Log "Found: gcloud $gcloudVersion" -Level Debug
    }

    # Check project root structure
    $requiredPaths = @(
        'cloud\bootstrap.py',
        'requirements.txt',
        'pyproject.toml'
    )

    foreach ($path in $requiredPaths) {
        $fullPath = Join-Path $script:ProjectRoot $path
        if (-not (Test-Path $fullPath)) {
            $missing += "Project file: $path"
        }
    }

    if ($missing.Count -gt 0) {
        Write-Log "Missing prerequisites:" -Level Error
        foreach ($item in $missing) {
            Write-Log "  - $item" -Level Error
        }
        throw "Prerequisites check failed. Please install missing components."
    }

    Write-Log "All prerequisites satisfied" -Level Success
}

# --- Region: Python Environment ---

function Invoke-PythonBootstrap {
    <#
    .SYNOPSIS
        Execute the Python cloud bootstrap module
    #>
    [OutputType([bool])]
    param()

    Write-Log "Launching Python cloud bootstrap..." -Level Info

    $pythonArgs = @(
        '-m', 'cloud.bootstrap',
        '--provider', 'gcp',
        '--log-level', 'info',
        '--no-prompt',
        '--yes'
    )

    if ($DryRun) {
        $pythonArgs += '--dry-run'
    }

    Write-Log "Command: python $($pythonArgs -join ' ')" -Level Debug

    # Create timestamped log files for Python output
    $pythonLogPath = Join-Path $script:LogDirectory "python-bootstrap-$script:TraceId.log"
    $pythonErrorPath = Join-Path $script:LogDirectory "python-bootstrap-$script:TraceId-error.log"

    try {
        # Run with output capture instead of -NoNewWindow which swallows everything
        $process = Start-Process `
            -FilePath 'python' `
            -ArgumentList $pythonArgs `
            -WorkingDirectory $script:ProjectRoot `
            -RedirectStandardOutput $pythonLogPath `
            -RedirectStandardError $pythonErrorPath `
            -Wait `
            -PassThru `
            -NoNewWindow

        $exitCode = $process.ExitCode

        # Log the Python output
        if (Test-Path $pythonLogPath) {
            $stdout = Get-Content $pythonLogPath -Raw -ErrorAction SilentlyContinue
            if ($stdout) {
                Write-Log "Python stdout: $stdout" -Level Debug
            }
        }

        if (Test-Path $pythonErrorPath) {
            $stderr = Get-Content $pythonErrorPath -Raw -ErrorAction SilentlyContinue
            if ($stderr) {
                Write-Log "Python stderr: $stderr" -Level Debug
            }
        }

        if ($exitCode -eq 0) {
            Write-Log "Python bootstrap completed successfully" -Level Success
            return $true
        } else {
            Write-Log "Python bootstrap failed with exit code: $exitCode" -Level Error
            return $false
        }
    } catch {
        Write-Log "Exception during Python bootstrap: $($_.Exception.Message)" -Level Error
        Write-Log "Stack trace: $($_.ScriptStackTrace)" -Level Debug
        return $false
    }
}

# --- Region: State Management ---

$script:DeploymentState = @{
    Action = $Action
    TraceId = $script:TraceId
    StartTime = Get-Date
    Steps = @()
}

function Save-State {
    <#
    .SYNOPSIS
        Persist deployment state for rollback/resume
    #>
    param([string]$Step, [string]$Status)

    $script:DeploymentState.Steps += [pscustomobject]@{
        Step = $Step
        Status = $Status
        Timestamp = Get-Date
    }

    $statePath = Join-Path $script:LogDirectory "deploy-state-$script:TraceId.json"
    try {
        $script:DeploymentState | ConvertTo-Json -Depth 10 | Set-Content -Path $statePath -Encoding UTF8
        Write-Log "State saved: $Step → $Status" -Level Debug
    } catch {
        Write-Log "Failed to save state: $($_.Exception.Message)" -Level Warn
    }
}

# --- Region: Deployment Workflow ---

function Set-InitialBudget {
    Write-Log -Message "Setting initial GCP budget to $5..." -Level Info
    try {
        $billingAccount = (gcloud billing projects describe (gcloud config get-value project) --format="value(billingAccountName)").Split("/")[1]
        gcloud billing budgets create --billing-account=$billingAccount --display-name="Job Finder Budget" --budget-amount=5
        Write-Log -Message "Initial GCP budget set successfully." -Level Success
    } catch {
        throw "Failed to set initial GCP budget: $($_.Exception.Message)"
    }
}

function Invoke-Deployment {
    <#
    .SYNOPSIS
        Main deployment workflow
    #>
    [OutputType([bool])]
    param()

    Write-Panel "Job Scraper → GCP Deployment" @(
        "Trace ID: $script:TraceId",
        "Action: $Action",
        "Dry Run: $DryRun",
        "Root: $script:ProjectRoot"
    )

    Write-Log "Starting deployment workflow" -Level Info -Extra @{ dry_run = $DryRun }

    # Step 1: Prerequisites
    Save-State -Step "prerequisites" -Status "started"
    try {
        Assert-Prerequisites
        Save-State -Step "prerequisites" -Status "completed"
    } catch {
        Save-State -Step "prerequisites" -Status "failed"
        throw
    }

    # Step 2: Python Bootstrap
    Save-State -Step "python_bootstrap" -Status "started"
    try {
        $success = Invoke-PythonBootstrap
        if (-not $success) {
            Save-State -Step "python_bootstrap" -Status "failed"
            throw "Python bootstrap returned failure"
        }
        Save-State -Step "python_bootstrap" -Status "completed"
    } catch {
        Save-State -Step "python_bootstrap" -Status "failed"
        throw
    }

    # Step 3: Set Initial Budget
    Save-State -Step "set_initial_budget" -Status "started"
    try {
        Set-InitialBudget
        Save-State -Step "set_initial_budget" -Status "completed"
    } catch {
        Save-State -Step "set_initial_budget" -Status "failed"
        throw
    }

    Write-Log "Deployment workflow completed successfully" -Level Success
    return $true
}

function Invoke-Rollback {
    <#
    .SYNOPSIS
        Rollback a failed deployment
    #>
    Write-Log "Rollback not yet implemented" -Level Warn
    Write-Log "To manually rollback, run: python -m cloud.teardown" -Level Info
}

function Invoke-Status {
    <#
    .SYNOPSIS
        Show deployment status
    #>
    Write-Log "Fetching deployment status..." -Level Info

    $stateFiles = Get-ChildItem -Path $script:LogDirectory -Filter "deploy-state-*.json" -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 5

    if ($stateFiles.Count -eq 0) {
        Write-Log "No deployment history found" -Level Warn
        return
    }

    Write-Output ""
    Write-Output "Recent Deployments:"
    Write-Output "═══════════════════"

    foreach ($file in $stateFiles) {
        $state = Get-Content $file.FullName -Raw | ConvertFrom-Json
        $status = $state.Steps | Select-Object -Last 1
        Write-Output "  $($state.TraceId) - $($status.Step): $($status.Status) @ $($file.LastWriteTime)"
    }
    Write-Output ""
}

function Invoke-Teardown {
    <#
    .SYNOPSIS
        Destroy all cloud resources
    #>
    Write-Log "Starting teardown..." -Level Warn

    if (-not $DryRun) {
        $confirmation = Read-Host "This will DELETE all cloud resources. Type 'yes' to confirm"
        if ($confirmation -ne 'yes') {
            Write-Log "Teardown cancelled" -Level Info
            return
        }
    }

    $teardownLogPath = Join-Path $script:LogDirectory "python-teardown-$script:TraceId.log"
    $teardownErrorPath = Join-Path $script:LogDirectory "python-teardown-$script:TraceId-error.log"

    try {
        $process = Start-Process `
            -FilePath 'python' `
            -ArgumentList @('-m', 'cloud.teardown') `
            -WorkingDirectory $script:ProjectRoot `
            -RedirectStandardOutput $teardownLogPath `
            -RedirectStandardError $teardownErrorPath `
            -Wait `
            -PassThru `
            -NoNewWindow

        # Log output
        if (Test-Path $teardownLogPath) {
            $stdout = Get-Content $teardownLogPath -Raw -ErrorAction SilentlyContinue
            if ($stdout) {
                Write-Log "Teardown stdout: $stdout" -Level Debug
            }
        }

        if (Test-Path $teardownErrorPath) {
            $stderr = Get-Content $teardownErrorPath -Raw -ErrorAction SilentlyContinue
            if ($stderr) {
                Write-Log "Teardown stderr: $stderr" -Level Debug
            }
        }

        if ($process.ExitCode -eq 0) {
            Write-Log "Teardown completed" -Level Success
        } else {
            Write-Log "Teardown failed with exit code: $($process.ExitCode)" -Level Error
        }
    } catch {
        Write-Log "Teardown exception: $($_.Exception.Message)" -Level Error
    }
}

# --- Region: Main Execution ---

[CmdletBinding(SupportsShouldProcess=$true)]
param(
    [ValidateSet('deploy','rollback','status','teardown', 'update-budget')]
    [string]$Action = 'deploy',
    [switch]$DryRun,
    [int]$NewBudgetAmount = 0
)

# ... (rest of the script) ...

function Update-GcpBudget {
    param([int]$Amount)

    if ($Amount -le 0) {
        throw "Budget amount must be greater than zero."
    }
    if ($Amount -gt 50) {
        Write-Log -Message "Budget amount exceeds the $50 hard cap. Setting budget to $50." -Level Warn
        $Amount = 50
    }

    Write-Log -Message "Updating GCP budget to `$$Amount`..." -Level Info
    try {
        $budgets = gcloud billing budgets list --format="value(name)"
        if (-not $budgets) {
            throw "No budgets found for the current billing account."
        }
        $budgetName = $budgets.Split("`n")[0]

        gcloud billing budgets update $budgetName --amount "$Amount"
        Write-Log -Message "GCP budget updated successfully." -Level Success
    } catch {
        throw "Failed to update GCP budget: $($_.Exception.Message)"
    }
}

# ... (rest of the script) ...

try {
    switch ($Action) {
        'deploy' {
            $success = Invoke-Deployment
            if ($success) {
                Write-Panel "Deployment Complete!" @(
                    "Your Job Scraper is now running in GCP",
                    "Logs: $script:LogPath",
                    "Trace ID: $script:TraceId"
                )
                exit 0
            } else {
                Write-Panel "Deployment Failed" @(
                    "Check logs: $script:LogPath",
                    "Trace ID: $script:TraceId"
                )
                exit 1
            }
        }
        'rollback' {
            Invoke-Rollback
            exit 0
        }
        'status' {
            Invoke-Status
            exit 0
        }
        'teardown' {
            Invoke-Teardown
            exit 0
        }
        'update-budget' {
            Update-GcpBudget -Amount $NewBudgetAmount
            exit 0
        }
    }
} catch {
    Write-Log "Fatal error: $($_.Exception.Message)" -Level Error
    Write-Log "Stack trace: $($_.ScriptStackTrace)" -Level Debug

    Write-Panel "❌ Operation Failed" @(
        "Error: $($_.Exception.Message)",
        "Logs: $script:LogPath",
        "Trace ID: $script:TraceId",
        "",
        "For help, see: docs\TROUBLESHOOTING.md"
    )

    exit 1
}
