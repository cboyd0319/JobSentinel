<#
.SYNOPSIS
    Complete Windows-to-GCP deployment with beautiful UX, state management, and rollback.
.DESCRIPTION
    End-to-end deployment: installs prerequisites, runs Python bootstrap, creates receipt.
    Supports initial deploy, updates, status checks, and one-command rollbacks from snapshots.
.PARAMETER Operation
    deploy, update, teardown, status, or rollback.
.PARAMETER Force
    Skip confirmations (for automated deployments).
.PARAMETER SnapshotId
    The ID of the snapshot to use for a rollback operation.
.EXAMPLE
    .\Deploy-Windows-to-GCP.ps1 deploy
.EXAMPLE
    .\Deploy-Windows-to-GCP.ps1 encrypt-config
.EXAMPLE
    .\Deploy-Windows-to-GCP.ps1 deploy -WhatIf
.EXAMPLE
    .\Deploy-Windows-to-GCP.ps1 rollback -SnapshotId snapshot-20251001-143000
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('deploy', 'update', 'teardown', 'status', 'rollback', 'encrypt-config')]
    [string]$Operation = 'deploy',

    [switch]$Force,
    [switch]$NoColor,

    [Parameter(Mandatory=$false)]
    [string]$SlackWebhookUrl,

    [Parameter(Mandatory=$false)]
    [ValidateScript({
        if ($_ -and -not [string]::IsNullOrWhiteSpace($_)) {
            if ($_ -notmatch '^snapshot-\d{8}-\d{6}$') {
                throw "Invalid snapshot ID format. Must match: snapshot-YYYYMMDD-HHMMSS"
            }
            if ($_ -match '[\/.:]') {
                throw "Snapshot ID contains illegal path characters."
            }
        }
        $true
    })]
    [string]$SnapshotId
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

#region ═════════════════════ COLORS & STYLING ═════════════════════

$script:UseColor = (-not $NoColor) -and ($env:NO_COLOR -eq $null) -and $Host.UI.SupportsVirtualTerminal

$script:Colors = if ($UseColor) {
    @{
        Primary = "`e[36m"    # Cyan
        Accent  = "`e[32m"    # Green
        Warn    = "`e[33m"    # Yellow
        Error   = "`e[31m"    # Red
        Muted   = "`e[90m"    # Bright Black
        Reset   = "`e[0m"
    }
} else {
    @{
        Primary = ""
        Accent  = ""
        Warn    = ""
        Error   = ""
        Muted   = ""
        Reset   = ""
    }
}

$script:Symbols = @{
    Ok    = '✓'
    Fail  = '✗'
    Arrow = '→'
    Dot   = '•'
    Warn  = '⚠'
}

#endregion

#region ═════════════════════ MODULE & STATE MANAGEMENT ═════════════════════

# Import security module
$securityModulePath = Join-Path $PSScriptRoot "modules/Security.psm1"
if (-not (Test-Path $securityModulePath)) {
    Write-Error "Fatal: Security module not found at $securityModulePath"
    exit 1
}
Import-Module $securityModulePath -Force

$script:StateFile = ".deployment-state.json"
$script:SnapshotsDir = "snapshots"
$script:TraceId = (New-Guid).ToString('N').Substring(0,12)

function Get-DeploymentState {
    <#
    .SYNOPSIS
        Reads deployment state from .deployment-state.json
    #>
    if (Test-Path $StateFile) {
        try {
            return Get-Content $StateFile -Raw -ErrorAction Stop | ConvertFrom-Json
        } catch {
            Write-Warning "[$script:TraceId] Corrupted state file, treating as clean slate: $($_.Exception.Message)"
            return $null
        }
    }
    return $null
}

function Save-DeploymentState {
    <#
    .SYNOPSIS
        Atomically saves deployment state with file locking.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ValidateSet('none', 'in-progress', 'deployed', 'failed', 'rolling-back')]
        [string]$State,
        [string]$ProjectId = $null,
        [string]$Region = $null,
        [string]$ServiceUrl = $null,
        [string]$SnapshotId = $null
    )

    $lockFile = "$StateFile.lock"
    $maxWait = 30
    $waited = 0
    $pollInterval = 0.5

    while (Test-Path $lockFile) {
        if ($waited -ge $maxWait) {
            $lockOwner = "unknown"
            try { $lockOwner = Get-Content $lockFile -ErrorAction SilentlyContinue } catch {}
            throw [System.TimeoutException]::new("State file locked for >30s by PID $lockOwner. Another deployment may be stuck. Check process and delete lock manually if stale: $lockFile | trace_id=$script:TraceId")
        }
        Start-Sleep -Milliseconds ($pollInterval * 1000)
        $waited += $pollInterval
    }

    try {
        $PID | Set-Content $lockFile -Force -ErrorAction Stop
        if (Test-Path $StateFile) {
            try {
                $existing = Get-Content $StateFile -Raw -ErrorAction Stop | ConvertFrom-Json
                if ($existing.state -eq 'in-progress' -and $State -eq 'in-progress' -and $existing.pid -ne $PID) {
                    throw [System.InvalidOperationException]::new("Deployment already in progress (PID: $($existing.pid), started: $($existing.timestamp)). trace_id=$script:TraceId")
                }
            } catch [System.ArgumentException] {
                Write-Warning "[$script:TraceId] Corrupted state file detected, overwriting"
            }
        }

        $stateData = @{
            state = $State
            projectId = $ProjectId
            region = $Region
            serviceUrl = $ServiceUrl
            snapshotId = $SnapshotId
            timestamp = (Get-Date).ToString('o')
            lastOperation = $Operation
            version = "1.0"
            pid = $PID
            trace_id = $script:TraceId
        }

        $stateData | ConvertTo-Json -Depth 10 | Set-Content $StateFile -Force -ErrorAction Stop
        Write-Verbose "[$script:TraceId] State saved: $State (project: $ProjectId)"
    } catch {
        Write-Error "[$script:TraceId] Failed to save state: $($_.Exception.Message)"
        throw
    } finally {
        if (Test-Path $lockFile) {
            Remove-Item $lockFile -Force -ErrorAction SilentlyContinue
        }
    }
}

function Test-DeploymentInProgress {
    <#
    .SYNOPSIS
        Checks if a deployment is currently running and not stale.
    #>
    $state = Get-DeploymentState
    if ($state -and $state.state -eq 'in-progress') {
        try {
            $elapsed = (Get-Date) - [DateTime]::Parse($state.timestamp)
            if ($elapsed.TotalMinutes -gt 30) {
                Write-Warning "[$script:TraceId] Found stale deployment (>30 min old, PID: $($state.pid))"
                return $false
            }
            return $true
        } catch {
            Write-Warning "[$script:TraceId] Invalid timestamp in state file: $($_.Exception.Message)"
            return $false
        }
    }
    return $false
}

#endregion

#region ═════════════════════ SNAPSHOT MANAGEMENT ═════════════════════

function Save-DeploymentSnapshot {
    Write-Host "STATUS:Saving a backup of your current setup..."
    <#
    .SYNOPSIS
        Creates an atomic snapshot with SHA256 checksums.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$ProjectId,
        [string]$Description = "Pre-deployment snapshot"
    )

    $snapshotId = "snapshot-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    $snapshotPath = Join-Path $SnapshotsDir $snapshotId
    $tempPath = "$snapshotPath.tmp"

    if (-not (Test-Path $SnapshotsDir)) {
        New-Item -ItemType Directory -Path $SnapshotsDir -Force -ErrorAction Stop | Out-Null
    }

    try {
        New-Item -ItemType Directory -Path $tempPath -Force -ErrorAction Stop | Out-Null
        Write-Status "[$script:TraceId] Creating snapshot: $snapshotId" -Type Progress
        $checksums = @{}
        $filesCopied = 0

        $terraformDir = Join-Path (Get-Location) "terraform\gcp"
        if (Test-Path "$terraformDir\terraform.tfstate") {
            $tfstatePath = "$tempPath\terraform.tfstate"
            Copy-Item "$terraformDir\terraform.tfstate" $tfstatePath -ErrorAction Stop
            $checksums['terraform.tfstate'] = (Get-FileHash $tfstatePath -Algorithm SHA256).Hash
            $filesCopied++
        }

        if (Test-Path ".env") {
            Copy-Item ".env" "$tempPath\.env" -ErrorAction Stop
            $checksums['.env'] = (Get-FileHash "$tempPath\.env" -Algorithm SHA256).Hash
            $filesCopied++
        }

        if (Test-Path "config\user_prefs.json") {
            Copy-Item "config\user_prefs.json" "$tempPath\user_prefs.json" -ErrorAction Stop
            $checksums['user_prefs.json'] = (Get-FileHash "$tempPath\user_prefs.json" -Algorithm SHA256).Hash
            $filesCopied++
        }

        $metadata = @{
            snapshotId = $snapshotId; projectId = $ProjectId; description = $Description
            timestamp = (Get-Date).ToString('o'); version = "1.0"; trace_id = $script:TraceId
            checksums = $checksums; fileCount = $filesCopied
        }
        $metadata | ConvertTo-Json -Depth 10 | Set-Content "$tempPath\metadata.json" -ErrorAction Stop

        Move-Item $tempPath $snapshotPath -Force -ErrorAction Stop
        Write-Status "Snapshot saved: $snapshotId ($filesCopied files)" -Type Success
        return $snapshotId
    } catch {
        if (Test-Path $tempPath) { Remove-Item $tempPath -Recurse -Force -ErrorAction SilentlyContinue }
        $errMsg = "Failed to create snapshot: $($_.Exception.Message) | trace_id=$script:TraceId"
        Write-Error $errMsg
        throw [System.IO.IOException]::new($errMsg, $_.Exception)
    }
}

function Restore-DeploymentSnapshot {
    <#
    .SYNOPSIS
        Restores a deployment from a snapshot with integrity validation.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$SnapshotId
    )

    $snapshotPath = Join-Path $SnapshotsDir $SnapshotId
    if (-not (Test-Path $snapshotPath)) {
        throw [System.IO.DirectoryNotFoundException]::new("Snapshot not found: $SnapshotId | trace_id=$script:TraceId")
    }

    $metadataPath = "$snapshotPath\metadata.json"
    if (-not (Test-Path $metadataPath)) {
        throw [System.IO.FileNotFoundException]::new("Snapshot metadata missing: $metadataPath | trace_id=$script:TraceId")
    }
    $metadata = Get-Content $metadataPath -Raw | ConvertFrom-Json

    Write-Status "[$script:TraceId] Validating snapshot integrity..." -Type Progress
    foreach ($file in $metadata.checksums.Keys) {
        $filePath = Join-Path $snapshotPath $file
        if (-not (Test-Path $filePath)) { throw [System.IO.FileNotFoundException]::new("Snapshot file missing: $file | trace_id=$script:TraceId") }
        $actualHash = (Get-FileHash $filePath -Algorithm SHA256 -ErrorAction Stop).Hash
        $expectedHash = $metadata.checksums[$file]
        if ($actualHash -ne $expectedHash) { throw [System.Security.SecurityException]::new("Snapshot corrupted: $file checksum mismatch. Expected: $expectedHash, Got: $actualHash | trace_id=$script:TraceId") }
    }
    Write-Status "Snapshot validated ($($metadata.checksums.Keys.Count) files, all checksums OK)" -Type Success

    Write-Banner "Rollback to Snapshot"
    Write-Panel -Title "Snapshot Details" -Body "ID: $($metadata.snapshotId)`nProject: $($metadata.projectId)`nCreated: $($metadata.timestamp)" -Style Info

    if (-not $Force) {
        $confirm = Read-Host "Restore this snapshot? This will OVERWRITE current state [y/N]"
        if ($confirm -notmatch '^[Yy]') { Write-Status "Rollback cancelled" -Type Warning; return }
    }

    Save-DeploymentState -State 'rolling-back' -ProjectId $metadata.projectId
    $terraformDir = Join-Path (Get-Location) "terraform\gcp"
    if (Test-Path "$snapshotPath\terraform.tfstate") {
        Write-Status "[$script:TraceId] Restoring Terraform state..." -Type Progress
        Copy-Item "$snapshotPath\terraform.tfstate" "$terraformDir\terraform.tfstate" -Force -ErrorAction Stop
    }
    if (Test-Path "$snapshotPath\.env") { Copy-Item "$snapshotPath\.env" ".env" -Force -ErrorAction Stop }
    if (Test-Path "$snapshotPath\user_prefs.json") { Copy-Item "$snapshotPath\user_prefs.json" "config\user_prefs.json" -Force -ErrorAction Stop }

    Write-Status "[$script:TraceId] Applying restored state..." -Type Progress
    Push-Location $terraformDir
    try {
        terraform apply -auto-approve
        if ($LASTEXITCODE -eq 0) {
            Write-Status "Rollback successful!" -Type Success
            Save-DeploymentState -State 'deployed' -ProjectId $metadata.projectId
        } else {
            throw [System.ComponentModel.Win32Exception]::new($LASTEXITCODE, "Terraform apply failed during rollback | trace_id=$script:TraceId")
        }
    } finally {
        Pop-Location
    }
}

#endregion

#region ═════════════════════ RETRY LOGIC ═════════════════════

function Invoke-WithRetry {
    <#
    .SYNOPSIS
        Executes a command with exponential backoff retry logic.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [ScriptBlock]$Command,
        [int]$MaxRetries = 3,
        [int]$InitialDelay = 2,
        [string]$OperationName = "Operation",
        [string]$TraceId = $script:TraceId
    )

    $attempt = 1; $delay = $InitialDelay; $allErrors = @()
    while ($attempt -le $MaxRetries) {
        try {
            Write-Verbose "[$TraceId] $OperationName attempt $attempt/$MaxRetries"
            & $Command
            if ($null -ne $LASTEXITCODE -and $LASTEXITCODE -ne 0) {
                throw [System.ComponentModel.Win32Exception]::new($LASTEXITCODE, "$OperationName failed with exit code $LASTEXITCODE | trace_id=$TraceId")
            }
            return
        } catch {
            $allErrors += $_
            if ($attempt -eq $MaxRetries) {
                $errorDetails = for ($i = 0; $i -lt $allErrors.Count; $i++) { "Attempt $($i + 1): $($allErrors[$i].Exception.Message)" }
                throw [System.AggregateException]::new("$OperationName exhausted all $MaxRetries retries. Errors:`n" + ($errorDetails -join "`n") + " | trace_id=$TraceId", $allErrors.Exception)
            }
            Write-Warning "[$TraceId] Attempt $attempt failed: $($_.Exception.Message)"
            Write-Status "Retrying in ${delay}s... ($($MaxRetries - $attempt) attempts remaining)" -Type Progress
            Start-Sleep -Seconds $delay
            $delay *= 2; $attempt++
        }
    }
}

#endregion

#region ═════════════════════ LOGGING & OUTPUT ═════════════════════

function Write-RedactedLog {
    <#
    .SYNOPSIS
        Redacts secrets from log output using regex patterns.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(ValueFromPipeline, Mandatory)][AllowEmptyString()][string]$Line
    )
    process {
        if ([string]::IsNullOrEmpty($Line)) { return $Line }
        $redacted = $Line
        $patterns = @(
            @{ Regex = '(https://hooks\.slack\.com/services/[A-Z0-9/]+)'; Replace = 'https://hooks.slack.com/services/***REDACTED***' },
            @{ Regex = '(https://[a-z0-9-]+\.run\.app[^
]*)'; Replace = 'https://***REDACTED***.run.app/***' }, # Corrected regex for URL
            @{ Regex = '(AIza[0-9A-Za-z_-]{35})'; Replace = 'AIza***REDACTED***' },
            @{ Regex = '(ya29\.[0-9A-Za-z_-]+)'; Replace = 'ya29.***REDACTED***' },
            @{ Regex = '(projects/[a-z][a-z0-9-]{5,29})'; Replace = 'projects/***REDACTED***' }
        )
        foreach ($p in $patterns) { $redacted = $redacted -replace $p.Regex, $p.Replace }
        Write-Output $redacted
    }
}

function Write-Banner { param([string]$Text) $border = '═' * 70; Write-Host ""; Write-Host "$($Colors.Primary)╔$border╗$($Colors.Reset)"; $padding = [Math]::Max(0, (68 - $Text.Length) / 2); $line = "║" + (' ' * [Math]::Floor($padding)) + $Text + (' ' * [Math]::Ceiling($padding)) + "║"; Write-Host "$($Colors.Primary)$line$($Colors.Reset)"; Write-Host "$($Colors.Primary)╚$border╝$($Colors.Reset)"; Write-Host "" }
function Write-Status { param([string]$Message, [string]$Type = 'Info') $symbol, $color = switch ($Type) { 'Success' { $Symbols.Ok, $Colors.Accent } 'Warning' { $Symbols.Warn, $Colors.Warn } 'Error' { $Symbols.Fail, $Colors.Error } 'Progress' { $Symbols.Arrow, $Colors.Muted } default { $Symbols.Dot, $Colors.Primary } }; Write-Host "$color$symbol $Message$($Colors.Reset)" }
function Write-Panel { param([string]$Title, [string]$Body = "", [string]$Style = 'Info') $color = switch ($Style) { 'Success' { $Colors.Accent } 'Warning' { $Colors.Warn } 'Error' { $Colors.Error } default { $Colors.Primary } }; $border = '─' * 66; Write-Host ""; Write-Host "$color┌$border┐$($Colors.Reset)"; Write-Host "$color│ $Title$(' ' * (65 - $Title.Length))│$($Colors.Reset)"; if ($Body) { Write-Host "$color├$border┤$($Colors.Reset)"; $Body -split "`n" | ForEach-Object { $line = $_; if ($line.Length -gt 64) { $line = $line.Substring(0, 61) + "..." }; Write-Host "$color│ $line$(' ' * (65 - $line.Length))│$($Colors.Reset)" } }; Write-Host "$color└$border┘$($Colors.Reset)"; Write-Host "" }
function Confirm-Action { param([string]$Message, [bool]$DefaultYes = $true) if ($Force) { return $true }; $prompt = if ($DefaultYes) { "[Y/n]" } else { "[y/N]" }; $response = Read-Host "$Message $prompt"; if ([string]::IsNullOrWhiteSpace($response)) { return $DefaultYes }; return $response -match '^[Yy]' }

#endregion

#region ═════════════════════ PREREQUISITE CHECKS ═════════════════════

function Test-Prerequisites {
    Write-Host "STATUS:Checking computer setup..."
    Write-Status "[$script:TraceId] Checking prerequisites..." -Type Progress; $issues = @()
    $minTfVersion = [version]"1.5.0"
    $minGcloudVersion = [version]"400.0.0"

    # Python 3.12+
    try {
        $pyVersion = python --version 2>&1
        if ($pyVersion -match "Python (\d+\.\d+)") {
            $version = [version]$matches[1]
            if ($version -ge [version]"3.12") { Write-Status "Python $version detected" -Type Success } 
            else { $issues += "Python 3.12+ required (found: $version)" }
        } else { $issues += "Python not found" }
    } catch { $issues += "Python not found or not in PATH" }

    # gcloud CLI version check
    try {
        $gcloudVersionStr = (gcloud version --format="value(core)") 2>$null
        if ($gcloudVersionStr) {
            $gcloudVersion = [version]($gcloudVersionStr.Trim())
            if ($gcloudVersion -ge $minGcloudVersion) {
                Write-Status "gcloud $gcloudVersion detected" -Type Success
            } else {
                $issues += "Google Cloud SDK is too old (found $gcloudVersion, need $minGcloudVersion+). Please update it."
            }
        } else { $issues += "gcloud CLI not found" }
    } catch { $issues += "gcloud CLI not installed or not in PATH" }

    # Terraform version check
    try {
        $tfVersionJson = terraform version -json 2>$null | ConvertFrom-Json
        $tfVersion = [version]$tfVersionJson.terraform_version
        if ($tfVersion -ge $minTfVersion) {
            Write-Status "Terraform $tfVersion detected" -Type Success
        } else {
            $issues += "Terraform is too old (found $tfVersion, need $minTfVersion+). Please update it."
        }
    } catch { $issues += "Terraform not found or not in PATH" }

    # Authentication and Billing check
    if (-not $issues) {
        $account = (gcloud config get-value account 2>$null)
        if ($account) { 
            Write-Status "Authenticated as: $account" -Type Success
            try {
                Test-GcpBilling
            } catch {
                $issues += $_.Exception.Message
            }
        } 
        else { 
            Write-Status "Not authenticated to GCP. Running login..." -Type Warning
            try {
                gcloud auth login | Out-Null
                gcloud auth application-default login | Out-Null
                Write-Status "Authentication successful" -Type Success
                Test-GcpBilling # Check billing after successful login
            } catch { $issues += "GCP authentication or billing check failed: $($_.Exception.Message)" } 
        }
    }

    if ($issues) { Write-Panel -Title "Setup Problem Found" -Body ($issues -join "`n") -Style Error; throw "Prerequisites check failed" }
    Write-Status "All prerequisites met" -Type Success
}

function Test-GcpBilling {
    Write-Status "Checking for active Google Cloud billing account..." -Type Progress
    $billingAccounts = gcloud billing accounts list --filter="open=true" --format="json" 2>$null | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0 -or -not $billingAccounts) {
        $errorBody = "Could not find an active Google Cloud billing account.`n`nTo fix this, please visit the Google Cloud Console, create a billing account, and associate it with your project.`n`nURL: https://console.cloud.google.com/billing"
        throw $errorBody
    }
    $accountName = $billingAccounts[0].displayName
    Write-Status "✓ Found active billing account: $accountName" -Type Success
}

#endregion

#region ═════════════════════ DEPLOYMENT OPERATIONS ═════════════════════

function Invoke-Deploy {
    Write-Banner "Windows → GCP Deployment"
    if (Test-DeploymentInProgress) { Write-Panel -Title "⚠️ Deployment Already Running" -Body "A deployment is currently in progress. Started: $(Get-DeploymentState).timestamp`nIf this is stale (>30 min), delete: $StateFile" -Style Warning; return }
    
    if ($WhatIfPreference) {
        Write-Panel -Title "🔍 WhatIf: Deploy" -Body "This will run a 'terraform plan' to show you what changes would be made, without applying them." -Style Info
    } else {
        Write-Panel -Title "💰 Estimated Monthly Costs" -Body "Cloud Run: ~`$0.55`nStorage: ~`$0.10`nSecrets: ~`$0.18`nScheduler: ~`$0.10`nNetworking: ~`$0.20`n────────────────`nTOTAL: ~`$1.13/month" -Style Info
    }

    if (-not (Confirm-Action "Proceed with deployment?")) { Write-Status "Deployment cancelled" -Type Warning; return }

    $currentProject = (gcloud config get-value project 2>$null); $snapshotId = $null
    if (-not $WhatIfPreference -and $currentProject -and (Get-DeploymentState)) { try { $snapshotId = Save-DeploymentSnapshot -ProjectId $currentProject } catch { Write-Status "Warning: Could not create snapshot" -Type Warning } }
    Save-DeploymentState -State 'in-progress' -ProjectId $currentProject -SnapshotId $snapshotId

    try {
        $decryptedEnv = $null
        if (Test-Path ".env.enc") {
            Write-Status "Decrypting configuration..." -Type Progress
            $decryptedEnv = Unprotect-SecretString -EncryptedBase64 (Get-Content ".env.enc" -Raw)
        } elseif (Test-Path ".env") {
            Write-Status "Using plaintext .env file. Consider running 'encrypt-config'." -Type Warning
            $decryptedEnv = Get-Content ".env" -Raw
        }

        # Dynamically build the command with environment variables
        $envSetup = ""
        if ($SlackWebhookUrl) {
            $escapedUrl = $SlackWebhookUrl.Replace("'", "''")
            $envSetup += "`$env:SLACK_WEBHOOK_URL = '$escapedUrl'; "
        }

        if ($decryptedEnv) {
            $lines = $decryptedEnv.Split([Environment]::NewLine) | Where-Object { $_ -match '.*?=.+' }
            foreach ($line in $lines) {
                $key, $val = $line.Split('=', 2)
                $key = $key.Trim()
                $val = $val.Trim()
                # Important: Escape single quotes in value for PowerShell command string
                $escapedVal = $val.Replace("'", "''")
                $envSetup += "`$env:$key = '$escapedVal'; "
            }
        }

        $pythonCommand = "python -m cloud.bootstrap --yes --log-level info"
        if ($WhatIfPreference) { $pythonCommand += " --dry-run" }

        $fullCommand = [scriptblock]::Create("$envSetup $pythonCommand")

        Invoke-WithRetry -OperationName "Deployment" -MaxRetries 2 -ScriptBlock {
            $env:PYTHONPATH = (Get-Location).Path
            Write-Host "$($Colors.Muted)─────────────────────────────────────────────────────────────────────$($Colors.Reset)"
            & $fullCommand 2>&1 | Tee-Object -FilePath "logs\deploy.log" -Append | Write-RedactedLog | ForEach-Object { Write-Host $_ }
            Write-Host "$($Colors.Muted)─────────────────────────────────────────────────────────────────────$($Colors.Reset)"; Write-Host ""
            if ($LASTEXITCODE -ne 0) { throw "Deployment failed with exit code: $LASTEXITCODE" }
        }

        if (-not $WhatIfPreference) {
            $deployedProject = (gcloud config get-value project 2>$null)
            Save-DeploymentState -State 'deployed' -ProjectId $deployedProject -SnapshotId $snapshotId
            Write-Status "Deployment successful!" -Type Success
            if (Test-Path "deployment-receipt.md") { Write-Panel -Title "Deployment Receipt" -Body "Receipt saved to: deployment-receipt.md" -Style Success }
        } else {
            Write-Status "Dry run complete. No changes were applied." -Type Success
        }
    } catch {
        Save-DeploymentState -State 'failed' -ProjectId $currentProject -SnapshotId $snapshotId
        Write-Panel -Title "Deployment Error" -Body $_.Exception.Message -Style Error
        if ($snapshotId) { Write-Host "`n$($Colors.Warn)RECOVERY:$($Colors.Reset)`n  • Rollback: $($Colors.Muted).`\Deploy-Windows-to-GCP.ps1 rollback -SnapshotId $snapshotId$($Colors.Reset)"" }
        throw
    }
}

function Invoke-EncryptConfig {
    Write-Banner "Encrypt Configuration"
    $envFile = ".env"
    $encryptedFile = ".env.enc"

    if (-not (Test-Path $envFile)) {
        Write-Panel -Title "File Not Found" -Body "Plaintext .env file not found. Nothing to encrypt." -Style Error
        return
    }

    if (Test-Path $encryptedFile) {
        if (-not (Confirm-Action "Encrypted file .env.enc already exists. Overwrite?")) {
            Write-Status "Encryption cancelled." -Type Warning
            return
        }
    }

    try {
        Write-Status "Encrypting .env file..." -Type Progress
        $plainText = Get-Content $envFile -Raw
        $encrypted = Protect-SecretString -PlainText $plainText
        Set-Content -Path $encryptedFile -Value $encrypted -Force

        Write-Status ".env encrypted to .env.enc successfully." -Type Success
        Write-Host ""
        Write-Panel -Title "SECURITY WARNING" -Body "The original plaintext .env file still exists. It is highly recommended to delete it now." -Style Warn
        if (Confirm-Action "Delete the plaintext .env file now?") {
            Remove-Item $envFile -Force
            Write-Status "Plaintext .env file deleted." -Type Success
        }
    } catch {
        Write-Panel -Title "Encryption Failed" -Body $_.Exception.Message -Style Error
    }
}

function Invoke-Update { Write-Banner "Update GCP Deployment"; Write-Panel -Title "Update Operation" -Body "This will update your existing GCP deployment using Terraform. No data loss will occur." -Style Info; if (-not (Confirm-Action "Proceed with update?")) { Write-Status "Update cancelled" -Type Warning; return }; Invoke-Deploy }
function Invoke-Teardown { Write-Host "STATUS:Starting teardown process..."
Write-Banner "Teardown GCP Deployment"; $project = (gcloud config get-value project 2>$null); Write-Panel -Title "WARNING: Destructive Operation" -Body "This will DELETE all cloud resources: Cloud Run Jobs, Storage Buckets, Secrets, VPCs, Service Accounts, and Budget Alerts.`nProject: $project" -Style Warning; if (-not $Force) { $confirmation = Read-Host "Type 'yes delete everything' to confirm"; if ($confirmation -ne "yes delete everything") { Write-Status "Teardown cancelled. Resources are safe." -Type Success; return } }; Write-Status "Running Terraform destroy..." -Type Progress; try { $terraformDir = Join-Path (Get-Location) "terraform\gcp"; if (-not (Test-Path $terraformDir)) { throw "Terraform directory not found: $terraformDir" }; Push-Location $terraformDir; try { terraform destroy -auto-approve; if ($LASTEXITCODE -eq 0) { Write-Panel -Title "Teardown Successful" -Body "All resources have been deleted." -Style Success; Write-Host "`n$($Colors.Accent)NEXT STEPS:$($Colors.Reset)`n  $($Symbols.Dot) To delete project: $($Colors.Muted)gcloud projects delete $project$($Colors.Reset)" } else { throw "Terraform destroy failed with exit code: $LASTEXITCODE" } } finally { Pop-Location } } catch { Write-Panel -Title "Teardown Error" -Body $_.Exception.Message -Style Error; Write-Host "`n$($Colors.Warn)MANUAL CLEANUP:$($Colors.Reset)`n  1. View remaining: $($Colors.Muted)cd terraform\gcp && terraform state list$($Colors.Reset)`n  2. Delete project: $($Colors.Muted)gcloud projects delete $project$($Colors.Reset)" ; throw }
}
function Invoke-Status { Write-Banner "Deployment Status"; $state = Get-DeploymentState; if ($state) { Write-Panel -Title "Deployment State" -Body "State: $($state.state)`nProject: $($state.projectId)`nLast Op: $($state.lastOperation)`nTimestamp: $($state.timestamp)" -Style Info }; $project = (gcloud config get-value project 2>$null); if (-not $project) { Write-Panel -Title "No Active Project" -Body "No GCP project is currently selected." -Style Warning; return }; Write-Host "CURRENT CONFIGURATION:`n  $($Colors.Primary)Project:$($Colors.Reset) $project`n  $($Colors.Primary)Account:$($Colors.Reset) $(gcloud config get-value account 2>$null)`n  $($Colors.Primary)Region:$($Colors.Reset) $(gcloud config get-value run/region 2>$null)"; Write-Status "Checking Cloud Run jobs..." -Type Progress; try { $jobs = gcloud run jobs list --format=\"table(name,region,lastModified)\" 2>$null; if ($jobs) { Write-Host $jobs } else { Write-Status "No Cloud Run jobs found" -Type Warning } } catch { Write-Status "Could not list Cloud Run jobs" -Type Warning }; if (Test-Path $SnapshotsDir) { $snapshots = Get-ChildItem $SnapshotsDir -Directory | Select-Object -First 5; if ($snapshots) { Write-Host "`nRECENT SNAPSHOTS:"; foreach ($s in $snapshots) { $meta = Get-Content "$($s.FullName)\metadata.json" -EA SilentlyContinue | ConvertFrom-Json; if ($meta) { Write-Host "  $($Symbols.Dot) $($s.Name) - $($meta.timestamp)" } } } }; Write-Host "`nVIEW MORE:`n  $($Colors.Primary)Console:$($Colors.Reset) https://console.cloud.google.com`n  $($Colors.Primary)Logs:$($Colors.Reset) gcloud logging read" }
function Invoke-Rollback { if (-not $SnapshotId) { Write-Panel -Title "Snapshot ID Required" -Body "Use: .\Deploy-Windows-to-GCP.ps1 rollback -SnapshotId <id>" -Style Error; if (Test-Path $SnapshotsDir) { $snapshots = Get-ChildItem $SnapshotsDir -Directory; if ($snapshots) { Write-Host "`nAVAILABLE SNAPSHOTS:"; foreach ($s in $snapshots) { $meta = Get-Content "$($s.FullName)\metadata.json" -EA SilentlyContinue | ConvertFrom-Json; if ($meta) { Write-Host "  • $($s.Name)`n    Created: $($meta.timestamp)`n    Project: $($meta.projectId)" } } } else { Write-Host "No snapshots available" } }; return }; Restore-DeploymentSnapshot -SnapshotId $SnapshotId }

#endregion

#region ═════════════════════ MAIN ═════════════════════

try {
    if (-not (Test-Path (Join-Path (Get-Location) "logs"))) { New-Item -ItemType Directory -Path "logs" -Force | Out-Null }
    if ($Operation -notin @('status', 'rollback')) { Test-Prerequisites | Out-Null }
    switch ($Operation) {
        'deploy'   { Invoke-Deploy }
        'update'   { Invoke-Update }
        'teardown' { Invoke-Teardown }
        'status'   { Invoke-Status }
        'rollback' { Invoke-Rollback }
    }
    Write-Status "Operation complete" -Type Success
} catch {
    Write-Host ""; Write-Status "Operation failed: $($_.Exception.Message)" -Type Error
    Write-Host "`nFor help, see: docs\WINDOWS.md"; exit 1
}

#endregion