# --- SCRIPT METADATA AND SECURITY ---
<#
.SYNOPSIS
    A resilient, user-friendly, graphical installer that checks for and
    installs dependencies before deploying the application.
#>

# --- INITIAL SETUP ---
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

try {
    # --- GUI DEFINITION (WPF) ---
    Add-Type -AssemblyName PresentationFramework, System.Windows.Forms

    $brand = @{ Primary = '#4C8BF5'; Secondary = '#6c757d'; Accent = '#22C55E'; Text = '#333333'; BG = '#fdfdfd'; BtnText = '#ffffff'; Error = '#EF4444' }

    [xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="My Job Finder Setup" Height="450" Width="700" WindowStartupLocation="CenterScreen" Background="$($brand.BG)">
    <Grid Margin="30">
        <TextBlock x:Name="TitleText" Text="Welcome to Your Personal Job Finder!" FontSize="26" FontWeight="Bold" Foreground="$($brand.Text)" VerticalAlignment="Top"/>
        
        <StackPanel x:Name="ChoicePanel" VerticalAlignment="Center">
            <TextBlock Text="How would you like to set it up?" FontSize="18" Foreground="$($brand.Muted)" TextWrapping="Wrap" TextAlignment="Center"/>
            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,20,0,0">
                <Button x:Name="CloudButton" Content="Install in the Cloud (Recommended)" FontSize="18" FontWeight="Bold" Padding="15" Margin="0,0,10,0" Background="$($brand.Primary)" Foreground="$($brand.BtnText)" BorderThickness="0"/>
                <Button x:Name="LocalButton" Content="Install on this PC Only" FontSize="18" Padding="15" Margin="10,0,0,0" Background="$($brand.Secondary)" Foreground="$($brand.BtnText)" BorderThickness="0"/>
            </StackPanel>
        </StackPanel>

        <Grid x:Name="StatusGrid" Visibility="Collapsed">
            <Border Margin="0,50,0,80" BorderBrush="#e0e0e0" BorderThickness="1" CornerRadius="5" Background="#ffffff">
                <ScrollViewer x:Name="StatusScrollViewer" VerticalScrollBarVisibility="Auto">
                    <TextBlock x:Name="StatusBlock" Padding="15" FontSize="14" FontFamily="Segoe UI" TextWrapping="Wrap" Text="Ready to begin setup."/>
                </ScrollViewer>
            </Border>
            <Button x:Name="ActionButton" Content="Start Setup" VerticalAlignment="Bottom" FontSize="20" FontWeight="Bold" Padding="15" Background="$($brand.Primary)" Foreground="$($brand.BtnText)" BorderThickness="0"/>
        </Grid>
    </Grid>
</Window>
"@

    $reader = New-Object System.Xml.XmlNodeReader $xaml
    $window = [System.Windows.Markup.XamlReader]::Load($reader)

    # --- UI Elements ---
    $choicePanel = $window.FindName("ChoicePanel")
    $statusGrid = $window.FindName("StatusGrid")
    $statusBlock = $window.FindName("StatusBlock")
    $actionButton = $window.FindName("ActionButton")
    $cloudButton = $window.FindName("CloudButton")
    $localButton = $window.FindName("LocalButton")

    # --- State and Logic ---
    $script:State = @{ CurrentStep = "Start" }
    $stateFile = Join-Path $PSScriptRoot "installer-state.json"

    function Get-InstallerState {
        if (Test-Path $stateFile) {
            try { return Get-Content $stateFile -Raw -Encoding UTF8 | ConvertFrom-Json } catch {
                # This is safe to ignore; it just means the state file was corrupt or empty.
                return $null 
            }
        }
        return $null
    }

    function Set-InstallerState {
        [CmdletBinding(SupportsShouldProcess=$true)]
        [Diagnostics.CodeAnalysis.SuppressMessageAttribute('PSReviewUnusedParameter', 'errorMessage')]
        param([string]$stepName, [string]$errorMessage = $null)
        if ($PSCmdlet.ShouldProcess($stateFile, "Update Installer State")) {
            $currentState = Get-InstallerState
            if ($null -eq $currentState) {
                $currentState = @{ lastCompletedStep = "Start"; errorCount = 0 }
            }
            if ($errorMessage) {
                $currentState.errorCount = ([int]$currentState.errorCount) + 1
                $currentState.lastErrorMessage = $errorMessage
            } else {
                $currentState.lastCompletedStep = $script:State.CurrentStep
                $currentState.errorCount = 0
            }
            $currentState.lastAttemptedStep = $stepName
            $currentState | ConvertTo-Json | Set-Content -Path $stateFile -Encoding UTF8
            $script:State.CurrentStep = $stepName
        }
    }

    function Send-StatusUpdate {
        param(
            [Parameter(Mandatory)][string]$Message,
            [string]$Type = 'Info'
        )

        $prefix = switch ($Type) {
            'Success' { '✓ ' }
            'Warn'    { '⚠ ' }
            'Error'   { '✗ ' }
            default   { '' }
        }
        $trimmed = $Message.TrimStart()
        $decoratedMessage = if ($prefix -and -not $trimmed.StartsWith($prefix.Trim())) { "$prefix$Message" } else { $Message }

        $messageToAppend = $decoratedMessage
        $window.Dispatcher.Invoke([Action]{
            $statusBlock.Text += "`n→ $messageToAppend"
            $statusScrollViewer.ScrollToBottom()
        })
    }

    function Show-StatusView {
        $choicePanel.Visibility = 'Collapsed'
        $statusGrid.Visibility = 'Visible'
    }

    function Set-InstallerStep {
        [CmdletBinding(SupportsShouldProcess=$true)]
        param([string]$stepName, [string]$buttonText, [scriptblock]$action)
        if ($PSCmdlet.ShouldProcess($stepName, "Set Installer Step")) {
            Set-InstallerState -stepName $stepName
            $actionButton.Content = $buttonText
            $evt = $actionButton.GetType().GetEvent('Click')
            $OldHandlers = $evt.GetInvocationList()
            if ($OldHandlers) {
                foreach ($Handler in $OldHandlers) { $evt.RemoveEventHandler($actionButton, $Handler) }
            }
            $actionButton.add_Click($action)
            $actionButton.IsEnabled = true
        }
    }

    function Invoke-InstallerJob {
        param(
            [Parameter(Mandatory)][scriptblock]$Task,
            [object[]]$ArgumentList = @(),
            [int]$PollMilliseconds = 200
        )

        $job = Start-Job -ScriptBlock $Task -ArgumentList $ArgumentList
        $result = $null
        try {
            do {
                $entries = Receive-Job $job
                foreach ($entry in $entries) {
                    if ($null -eq $entry) { continue }
                    if ($entry.PSObject.Properties.Match('Kind').Count -eq 0) {
                        if ($entry -is [string]) {
                            Send-StatusUpdate $entry
                        }
                        continue
                    }

                    switch ($entry.Kind) {
                        'Status' {
                            $message = $entry.Message
                            $type = if ($entry.PSObject.Properties.Match('Type').Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($entry.Type)) { $entry.Type } else { 'Info' }
                            Send-StatusUpdate $message -Type $type
                        }
                        'Result' {
                            $result = [bool]$entry.Success
                            if ($entry.PSObject.Properties.Match('Message').Count -gt 0 -and $entry.Message) {
                                $type = if ($entry.PSObject.Properties.Match('Type').Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($entry.Type)) { $entry.Type } else { 'Info' }
                                Send-StatusUpdate $entry.Message -Type $type
                            }
                        }
                    }
                }
                if ($job.State -eq 'Running') {
                    Start-Sleep -Milliseconds $PollMilliseconds
                }
            } while ($job.State -eq 'Running' -or $job.HasMoreData)

            $remaining = Receive-Job $job
            foreach ($entry in $remaining) {
                if ($null -eq $entry) { continue }
                if ($entry.PSObject.Properties.Match('Kind').Count -eq 0) {
                    if ($entry -is [string]) { Send-StatusUpdate $entry }
                    continue
                }
                if ($entry.Kind -eq 'Result') {
                    $result = [bool]$entry.Success
                    if ($entry.PSObject.Properties.Match('Message').Count -gt 0 -and $entry.Message) {
                        $type = if ($entry.PSObject.Properties.Match('Type').Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($entry.Type)) { $entry.Type } else { 'Info' }
                        Send-StatusUpdate $entry.Message -Type $type
                    }
                } elseif ($entry.Kind -eq 'Status') {
                    $type = if ($entry.PSObject.Properties.Match('Type').Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($entry.Type)) { $entry.Type } else { 'Info' }
                    Send-StatusUpdate $entry.Message -Type $type
                }
            }

            if ($null -eq $result) {
                throw "Installer job did not report completion."
            }
            return $result
        } finally {
            Remove-Job $job -Force -ErrorAction SilentlyContinue
        }
    }

    # --- Step Definitions for Cloud Install ---
    function Invoke-StepCheckPython {
        Send-StatusUpdate "Checking for Python..."
        if (Get-Command python -ErrorAction SilentlyContinue) {
            Send-StatusUpdate "✓ Python is installed!" -Type Success
            Set-InstallerStep -stepName "CheckGcloud" -buttonText "Next: Check Google Cloud Tools" -action $function:Invoke-StepCheckGcloud
            $actionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
        } else {
            Send-StatusUpdate "It looks like Python is not installed. It’s a required tool." -Type Warn
            Set-InstallerStep -stepName "InstallPython" -buttonText "Install Python For Me" -action $function:Invoke-StepInstallPython
        }
    }

    function Invoke-StepInstallPython {
        $actionButton.IsEnabled = $false
        Send-StatusUpdate "Downloading Python installer from python.org..."
        $pythonInstalled = Invoke-InstallerJob -Task {
            function PublishStatus {
                param([string]$Message, [string]$Type = 'Info')
                Write-Output ([pscustomobject]@{ Kind = 'Status'; Message = $Message; Type = $Type })
            }

            $pythonVersion = "3.12.10"
            $pythonUrl = "https://www.python.org/ftp/python/$pythonVersion/python-$pythonVersion-amd64.exe"
            $installerPath = Join-Path $env:TEMP "python-installer.exe"
            $expectedSHA256 = "c3a526c6a84353c8633f01add54abe584535048303455150591e3e9ad884b424"

            try {
                Invoke-WebRequest -Uri $pythonUrl -OutFile $installerPath -UseBasicParsing
                PublishStatus "Verifying download..."
                $actualHash = (Get-FileHash $installerPath -Algorithm SHA256).Hash
                if ([string]::IsNullOrWhiteSpace($actualHash) -or $actualHash -ne $expectedSHA256) {
                    throw "Python installer checksum failed! File may be corrupt."
                }
                PublishStatus "Installing Python..."
                Start-Process -FilePath $installerPath -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1 Include_test=0" -Wait
                $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
                $env:Path = $env:Path + ";" + $userPath
                Write-Output ([pscustomobject]@{ Kind = 'Result'; Success = $true })
            } catch {
                PublishStatus "Error installing Python: $($_.Exception.Message)" 'Error'
                Write-Output ([pscustomobject]@{ Kind = 'Result'; Success = $false })
            } finally {
                if (Test-Path $installerPath) { Remove-Item $installerPath -Force -ErrorAction SilentlyContinue }
            }
        }

        if ($pythonInstalled) {
            Send-StatusUpdate "✓ Python has been installed!" -Type Success
            Set-InstallerStep -stepName "CheckGcloud" -buttonText "Next: Check Google Cloud Tools" -action $function:Invoke-StepCheckGcloud
            $actionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
        } else {
            Send-StatusUpdate "Python installation failed." -Type Error
            $actionButton.IsEnabled = $true
        }
    }

    function Invoke-StepCheckGcloud {
        Send-StatusUpdate "Checking for Google Cloud tools..."
        if (Get-Command gcloud -ErrorAction SilentlyContinue) {
            Send-StatusUpdate "✓ Google Cloud tools are installed!" -Type Success
            Set-InstallerStep -stepName "Deploy" -buttonText "Begin Cloud Setup" -action $function:Invoke-StepDeploy
            $actionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
        } else {
            Send-StatusUpdate "Google Cloud tools are needed to create your secure cloud space." -Type Warn
            Set-InstallerStep -stepName "InstallGcloud" -buttonText "Install Google Cloud Tools" -action $function:Invoke-StepInstallGcloud
        }
    }

    function Invoke-StepInstallGcloud {
        $actionButton.IsEnabled = false
        Send-StatusUpdate "Downloading Google Cloud SDK... (this may take a moment)"
        $gcloudReady = Invoke-InstallerJob -Task {
            function PublishStatus {
                param([string]$Message, [string]$Type = 'Info')
                Write-Output ([pscustomobject]@{ Kind = 'Status'; Message = $Message; Type = $Type })
            }

            $installerUrl = "https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe"
            $installerPath = Join-Path $env:TEMP "gcloud-installer.exe"

            try {
                Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing
                PublishStatus "Installing Google Cloud tools..."
                Start-Process -FilePath $installerPath -ArgumentList "/S /allusers /noreporting" -Wait
                $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
                $env:Path = $env:Path + ";" + $machinePath
                Write-Output ([pscustomobject]@{ Kind = 'Result'; Success = $true })
            } catch {
                PublishStatus "Error installing Google Cloud SDK: $($_.Exception.Message)" 'Error'
                Write-Output ([pscustomobject]@{ Kind = 'Result'; Success = $false })
            } finally {
                if (Test-Path $installerPath) { Remove-Item $installerPath -Force -ErrorAction SilentlyContinue }
            }
        }

        if ($gcloudReady) {
            Send-StatusUpdate "✓ Google Cloud tools installed!" -Type Success
            Set-InstallerStep -stepName "Deploy" -buttonText "Begin Cloud Setup" -action $function:Invoke-StepDeploy
            $actionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
        } else {
            Send-StatusUpdate "Google Cloud SDK installation failed." -Type Error
            $actionButton.IsEnabled = $true
        }
    }

    function Invoke-StepDeploy {
        $actionButton.IsEnabled = $false
        Send-StatusUpdate "Starting the main cloud setup. This is the longest step (5-10 minutes)..."
        $enginePath = Join-Path $PSScriptRoot "engine\Deploy-GCP.ps1"
        $logPath = Join-Path $PSScriptRoot "..\..\logs\deploy_cloud.log"
        $errorLogPath = Join-Path $PSScriptRoot "..\..\logs\error_cloud.log"

        $jobContext = [pscustomobject]@{
            EnginePath   = $enginePath
            LogPath      = $logPath
            ErrorLogPath = $errorLogPath
        }

        $deployJobScript = {
            param([pscustomobject]$Context)

            $enginePath = $Context.EnginePath
            $logPath = $Context.LogPath
            $errorLogPath = $Context.ErrorLogPath

            function PublishStatus {
                param([string]$Message, [string]$Type = 'Info')
                Write-Output ([pscustomobject]@{ Kind = 'Status'; Message = $Message; Type = $Type })
            }

            try {
                $process = Start-Process -FilePath 'powershell.exe' -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$enginePath`" deploy" -PassThru -RedirectStandardOutput $logPath -RedirectStandardError $errorLogPath -Wait -WindowStyle Hidden
                if ($process.ExitCode -ne 0) {
                    $errorMessage = if (Test-Path $errorLogPath) { Get-Content $errorLogPath -Raw -ErrorAction SilentlyContinue } else { "Deployment exited with code $($process.ExitCode) but no error log was produced." }
                    PublishStatus 'Deployment failed.' 'Error'
                    Write-Output ([pscustomobject]@{ Kind = 'Result'; Success = $false; Message = $errorMessage; Type = 'Error' })
                } else {
                    PublishStatus '✓ Your secure Job Finder is ready!' 'Success'
                    Write-Output ([pscustomobject]@{ Kind = 'Result'; Success = $true; Message = 'Cloud deployment completed.'; Type = 'Success' })
                }
            } catch {
                PublishStatus 'Oh dear, we hit a snag during the cloud setup.' 'Error'
                PublishStatus "Please email me the file at $errorLogPath so I can help." 'Warn'
                Write-Output ([pscustomobject]@{ Kind = 'Result'; Success = $false; Message = $_.Exception.Message; Type = 'Error' })
            }
        }

        $job = Start-Job -ScriptBlock $deployJobScript -ArgumentList $jobContext

        $lastPosition = 0
        $deploySucceeded = $false
        do {
            $entries = Receive-Job $job
            foreach ($entry in $entries) {
                if ($null -eq $entry) { continue }
                if ($entry.PSObject.Properties.Match('Kind').Count -eq 0) {
                    if ($entry -is [string]) { Send-StatusUpdate $entry }
                    continue
                }
                if ($entry.Kind -eq 'Status') {
                    $type = if ($entry.PSObject.Properties.Match('Type').Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($entry.Type)) { $entry.Type } else { 'Info' }
                    Send-StatusUpdate $entry.Message -Type $type
                } elseif ($entry.Kind -eq 'Result') {
                    $deploySucceeded = [bool]$entry.Success
                    $type = if ($entry.PSObject.Properties.Match('Type').Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($entry.Type)) { $entry.Type } else { 'Info' }
                    if ($entry.PSObject.Properties.Match('Message').Count -gt 0 -and $entry.Message) {
                        Send-StatusUpdate $entry.Message -Type $type
                    }
                }
            }

            if (Test-Path $logPath) {
                $content = Get-Content $logPath -Raw -Encoding UTF8 -ErrorAction SilentlyContinue
                if ($content.Length -gt $lastPosition) {
                    $newContent = $content.Substring($lastPosition)
                    $lastPosition = $content.Length
                    foreach ($line in $newContent.Split("`n")) {
                        if ($line -match 'STATUS:(.*)') {
                            Send-StatusUpdate $matches[1].Trim()
                        }
                    }
                }
            }

            if ($job.State -eq 'Running') {
                Start-Sleep -Milliseconds 500
            }
        } while ($job.State -eq 'Running' -or $job.HasMoreData)

        $remaining = Receive-Job $job
        foreach ($entry in $remaining) {
            if ($null -eq $entry) { continue }
            if ($entry.PSObject.Properties.Match('Kind').Count -eq 0) {
                if ($entry -is [string]) { Send-StatusUpdate $entry }
                continue
            }
            if ($entry.Kind -eq 'Status') {
                $type = if ($entry.PSObject.Properties.Match('Type').Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($entry.Type)) { $entry.Type } else { 'Info' }
                Send-StatusUpdate $entry.Message -Type $type
            } elseif ($entry.Kind -eq 'Result') {
                $deploySucceeded = [bool]$entry.Success
                $type = if ($entry.PSObject.Properties.Match('Type').Count -gt 0 -and -not [string]::IsNullOrWhiteSpace($entry.Type)) { $entry.Type } else { 'Info' }
                if ($entry.PSObject.Properties.Match('Message').Count -gt 0 -and $entry.Message) {
                    Send-StatusUpdate $entry.Message -Type $type
                }
            }
        }

        Remove-Job $job -Force -ErrorAction SilentlyContinue

        if ($deploySucceeded) {
            Set-InstallerStep -stepName "Done" -buttonText "Finish" -action { $window.Close() }
        } else {
            $actionButton.Content = "Finished with Errors"
            $actionButton.Background = [System.Windows.Media.Brushes]::Red
            $actionButton.IsEnabled = true
        }
    }

    # --- Main Button Handlers ---
    $cloudButton.add_Click({
        Show-StatusView
        Set-InstallerStep -stepName "CheckPython" -buttonText "Start Cloud Setup" -action $function:Invoke-StepCheckPython
        $actionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
    })

    $localButton.add_Click({
        Show-StatusView
        Send-StatusUpdate "Starting Local PC Setup..."
        Send-StatusUpdate "A new window will open. Please answer the questions there."
        try {
            $wizardPath = Join-Path $PSScriptRoot "..\..\scripts\setup_wizard.py"
            Start-Process powershell.exe -ArgumentList "-NoExit -Command `"cd '$PSScriptRoot'; python `"$wizardPath`"`""
            Send-StatusUpdate "✓ Local setup wizard has started!" -Type Success
            Set-InstallerStep -stepName "Done" -buttonText "Finish" -action { $window.Close() }
        } catch {
            Send-StatusUpdate "Could not start the local setup. Is Python installed?" -Type Error
            Set-InstallerStep -stepName "Done" -buttonText "Finish" -action { $window.Close() }
        }
    })

    # --- Initial State Check & Window Launch ---
    $initialState = Get-InstallerState
    if ($initialState -and $initialState.lastAttemptedStep) {
        Show-StatusView
        Send-StatusUpdate "Welcome back! Resuming previous cloud setup..."
        switch ($initialState.lastAttemptedStep) {
            "InstallPython" { Set-InstallerStep -stepName "InstallPython" -buttonText "Install Python For Me" -action $function:Invoke-StepInstallPython }
            "CheckGcloud"   { Set-InstallerStep -stepName "CheckGcloud" -buttonText "Next: Check Google Cloud Tools" -action $function:Invoke-StepCheckGcloud }
            "InstallGcloud" { Set-InstallerStep -stepName "InstallGcloud" -buttonText "Install Google Cloud Tools" -action $function:Invoke-StepInstallGcloud }
            "Deploy"        { Set-InstallerStep -stepName "Deploy" -buttonText "Begin Cloud Setup" -action $function:Invoke-StepDeploy }
            default         { Set-InstallerStep -stepName "CheckPython" -buttonText "Start Cloud Setup" -action $function:Invoke-StepCheckPython }
        }
        $actionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
    }

    $window.ShowDialog() | Out-Null

} catch {
    # This is the final safety net. It catches any terminating error and logs it to disk.
    $errorLogPath = Join-Path $PSScriptRoot "installer-crash.log"
    $errorDetails = "Timestamp: $(Get-Date -Format o)`n`n"
    $errorDetails += "Error: $($_.Exception.Message)`n`n"
    $errorDetails += "StackTrace: $($_.Exception.StackTrace)`n`n"
    $errorDetails += "ScriptStackTrace: $($_.ScriptStackTrace)`n"
    Set-Content -Path $errorLogPath -Value $errorDetails -Encoding UTF8
    
    # Also try to show a message box, which might work even if the main window failed.
    try {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show("A critical error occurred during setup. A file named 'installer-crash.log' has been created with the details. Please send this file to the developer for help.", "Setup Failed", 0, [System.Windows.Forms.MessageBoxIcon]::Error)
    } catch {
        # Silently fail if we can't show the message box - the error is already logged
        $null = $_
    }
}
