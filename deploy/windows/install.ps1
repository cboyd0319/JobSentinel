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

    $brand = @{ Primary = '#4C8BF5'; Secondary = '#6c757d'; Muted = '#6c757d'; Accent = '#22C55E'; Text = '#333333'; BG = '#fdfdfd'; BtnText = '#ffffff'; Error = '#EF4444' }

    [xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="My Job Finder Setup" Height="500" Width="650" WindowStartupLocation="CenterScreen" Background="$($brand.BG)">
    <Grid Margin="30">
        <TextBlock x:Name="TitleText" Text="Welcome to Your Personal Job Finder!" FontSize="28" FontWeight="Bold" Foreground="$($brand.Text)" VerticalAlignment="Top"/>

        <StackPanel x:Name="ChoicePanel" VerticalAlignment="Center">
            <TextBlock Text="How would you like to set it up?" FontSize="20" Foreground="$($brand.Muted)" TextWrapping="Wrap" TextAlignment="Center" Margin="0,0,0,30"/>
            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center" Margin="0,20,0,0">
                <Button x:Name="CloudButton" Content="Install in the Cloud (Recommended)" FontSize="24" FontWeight="Bold" Padding="25,20" MinHeight="90" MinWidth="320" Margin="0,0,15,0" Background="$($brand.Primary)" Foreground="$($brand.BtnText)" BorderThickness="0"/>
                <Button x:Name="LocalButton" Content="Install on this PC Only" FontSize="24" FontWeight="Bold" Padding="25,20" MinHeight="90" MinWidth="320" Margin="15,0,0,0" Background="$($brand.Secondary)" Foreground="$($brand.BtnText)" BorderThickness="0"/>
            </StackPanel>
        </StackPanel>

        <Grid x:Name="StatusGrid" Visibility="Collapsed">
            <Border Margin="0,60,0,90" BorderBrush="#e0e0e0" BorderThickness="1" CornerRadius="5" Background="#ffffff">
                <ScrollViewer x:Name="StatusScrollViewer" VerticalScrollBarVisibility="Auto">
                    <TextBlock x:Name="StatusBlock" Padding="20" FontSize="16" FontFamily="Segoe UI" TextWrapping="Wrap" Text="Ready to begin setup."/>
                </ScrollViewer>
            </Border>
            <Button x:Name="ActionButton" Content="Start Setup" VerticalAlignment="Bottom" FontSize="24" FontWeight="Bold" Padding="20,15" MinHeight="65" Background="$($brand.Primary)" Foreground="$($brand.BtnText)" BorderThickness="0"/>
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
        Send-StatusUpdate "Checking what tools you already have installed..."
        if (Get-Command python -ErrorAction SilentlyContinue) {
            Send-StatusUpdate "✓ Great! Python is already on your computer!" -Type Success
            Set-InstallerStep -stepName "CheckGcloud" -buttonText "Continue" -action $function:Invoke-StepCheckGcloud
            $actionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
        } else {
            Send-StatusUpdate "We need to install Python (a free tool that helps the Job Finder work)." -Type Warn
            Send-StatusUpdate "Don't worry - this happens automatically!" -Type Info
            Set-InstallerStep -stepName "InstallPython" -buttonText "Install Python (takes 2 minutes)" -action $function:Invoke-StepInstallPython
        }
    }

    function Invoke-StepInstallPython {
        $actionButton.IsEnabled = $false
        Send-StatusUpdate "Downloading Python from python.org (about 25 MB - takes 30 seconds)..."
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
                Invoke-WebRequest -Uri $pythonUrl -OutFile $installerPath -UseBasicParsing -TimeoutSec 300
                PublishStatus "Checking the download is complete and safe..."
                $actualHash = (Get-FileHash $installerPath -Algorithm SHA256).Hash
                if ([string]::IsNullOrWhiteSpace($actualHash) -or $actualHash -ne $expectedSHA256) {
                    throw "DOWNLOAD_CORRUPT"
                }
                PublishStatus "Installing Python (takes about 2 minutes - please wait)..."

                $installProcess = Start-Process -FilePath $installerPath `
                    -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1 Include_test=0" `
                    -Wait -PassThru

                if ($installProcess.ExitCode -ne 0) {
                    if ($installProcess.ExitCode -eq 1602) {
                        throw "USER_CANCELLED"
                    } elseif ($installProcess.ExitCode -eq 5 -or $installProcess.ExitCode -eq 1603) {
                        throw "ACCESS_DENIED"
                    } else {
                        throw "INSTALL_FAILED:$($installProcess.ExitCode)"
                    }
                }

                # Refresh PATH properly
                $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
                $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
                $env:Path = "$machinePath;$userPath"

                Write-Output ([pscustomobject]@{ Kind = 'Result'; Success = $true })
            } catch {
                $errorCode = $_.Exception.Message
                if ($errorCode -like "DOWNLOAD_CORRUPT*") {
                    PublishStatus "The download got corrupted. This happens sometimes with slow internet." 'Error'
                    PublishStatus "Let's try downloading again - click the button below to retry." 'Warn'
                } elseif ($errorCode -eq "USER_CANCELLED") {
                    PublishStatus "You cancelled the installation. That's okay!" 'Warn'
                    PublishStatus "Click the button below when you're ready to try again." 'Info'
                } elseif ($errorCode -eq "ACCESS_DENIED") {
                    PublishStatus "Windows needs your permission to install Python." 'Error'
                    PublishStatus "Here's what to do:" 'Info'
                    PublishStatus "  1. Close this installer" 'Info'
                    PublishStatus "  2. Right-click the installer icon" 'Info'
                    PublishStatus "  3. Choose 'Run as administrator'" 'Info'
                    PublishStatus "  4. Click 'Yes' when Windows asks for permission" 'Info'
                } elseif ($errorCode -like "System.Net.WebException*") {
                    PublishStatus "The download didn't work. This usually means:" 'Error'
                    PublishStatus "  • Your internet connection is slow or interrupted" 'Info'
                    PublishStatus "  • The website is temporarily down" 'Info'
                    PublishStatus "Wait a minute and click the button below to try again." 'Warn'
                } else {
                    PublishStatus "Something went wrong installing Python." 'Error'
                    PublishStatus "Don't worry - no changes were made to your computer." 'Info'
                    PublishStatus "Technical details (for troubleshooting): $errorCode" 'Info'
                }
                Write-Output ([pscustomobject]@{ Kind = 'Result'; Success = $false })
            } finally {
                if (Test-Path $installerPath) { Remove-Item $installerPath -Force -ErrorAction SilentlyContinue }
            }
        }

        if ($pythonInstalled) {
            Send-StatusUpdate "✓ Python is now installed and ready!" -Type Success
            Set-InstallerStep -stepName "CheckGcloud" -buttonText "Continue" -action $function:Invoke-StepCheckGcloud
            $actionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
        } else {
            Send-StatusUpdate "Ready to try again when you are!" -Type Warn
            $actionButton.Content = "Try Installing Python Again"
            $actionButton.IsEnabled = $true
        }
    }

    function Invoke-StepCheckGcloud {
        Send-StatusUpdate "Checking for Google Cloud tools..."
        if (Get-Command gcloud -ErrorAction SilentlyContinue) {
            Send-StatusUpdate "✓ Excellent! Google Cloud tools are already here!" -Type Success
            Set-InstallerStep -stepName "Deploy" -buttonText "Start Setting Up Your Job Finder" -action $function:Invoke-StepDeploy
            $actionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
        } else {
            Send-StatusUpdate "We need Google Cloud tools to create your secure online space." -Type Warn
            Send-StatusUpdate "This is the last tool we need - installing it now!" -Type Info
            Set-InstallerStep -stepName "InstallGcloud" -buttonText "Install Cloud Tools (takes 3 minutes)" -action $function:Invoke-StepInstallGcloud
        }
    }

    function Invoke-StepInstallGcloud {
        $actionButton.IsEnabled = false
        Send-StatusUpdate "Downloading Google Cloud tools (about 80 MB - takes 1-2 minutes)..."
        $gcloudReady = Invoke-InstallerJob -Task {
            function PublishStatus {
                param([string]$Message, [string]$Type = 'Info')
                Write-Output ([pscustomobject]@{ Kind = 'Status'; Message = $Message; Type = $Type })
            }

            $installerUrl = "https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe"
            $installerPath = Join-Path $env:TEMP "gcloud-installer.exe"

            try {
                Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing -TimeoutSec 600
                PublishStatus "Installing Google Cloud tools (takes about 3 minutes - be patient, it's working!)..."

                # Check if we have admin rights
                $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
                $isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

                # Use appropriate install flags based on privileges
                $installArgs = if ($isAdmin) {
                    "/S /allusers /noreporting"
                } else {
                    "/S /noreporting"  # Install for current user only
                }

                $gcloudProcess = Start-Process -FilePath $installerPath `
                    -ArgumentList $installArgs `
                    -Wait -PassThru

                if ($gcloudProcess.ExitCode -ne 0) {
                    if ($gcloudProcess.ExitCode -eq 1602) {
                        throw "USER_CANCELLED"
                    } elseif ($gcloudProcess.ExitCode -eq 5 -or $gcloudProcess.ExitCode -eq 1603) {
                        throw "ACCESS_DENIED"
                    } else {
                        throw "INSTALL_FAILED:$($gcloudProcess.ExitCode)"
                    }
                }

                # Refresh PATH properly
                $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
                $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
                $env:Path = "$machinePath;$userPath"

                Write-Output ([pscustomobject]@{ Kind = 'Result'; Success = $true })
            } catch {
                $errorCode = $_.Exception.Message
                if ($errorCode -eq "USER_CANCELLED") {
                    PublishStatus "You cancelled the installation. That's okay!" 'Warn'
                    PublishStatus "Click the button below when you're ready to continue." 'Info'
                } elseif ($errorCode -eq "ACCESS_DENIED") {
                    PublishStatus "Windows needs your permission to install the Cloud tools." 'Error'
                    PublishStatus "Here's what to do:" 'Info'
                    PublishStatus "  1. Close this installer" 'Info'
                    PublishStatus "  2. Right-click the installer icon" 'Info'
                    PublishStatus "  3. Choose 'Run as administrator'" 'Info'
                    PublishStatus "  4. Click 'Yes' when Windows asks" 'Info'
                } elseif ($errorCode -like "System.Net.WebException*") {
                    PublishStatus "The download didn't work. Please check your internet and try again." 'Error'
                } else {
                    PublishStatus "Something went wrong installing the Cloud tools." 'Error'
                    PublishStatus "Don't worry - your computer is fine. We just need to try again." 'Info'
                    PublishStatus "Technical details: $errorCode" 'Info'
                }
                Write-Output ([pscustomobject]@{ Kind = 'Result'; Success = $false })
            } finally {
                if (Test-Path $installerPath) { Remove-Item $installerPath -Force -ErrorAction SilentlyContinue }
            }
        }

        if ($gcloudReady) {
            Send-StatusUpdate "✓ Google Cloud tools are ready!" -Type Success
            Set-InstallerStep -stepName "Deploy" -buttonText "Start Setting Up Your Job Finder" -action $function:Invoke-StepDeploy
            $actionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
        } else {
            Send-StatusUpdate "Ready to try again when you are!" -Type Warn
            $actionButton.Content = "Try Installing Cloud Tools Again"
            $actionButton.IsEnabled = $true
        }
    }

    function Invoke-StepDeploy {
        $actionButton.IsEnabled = $false
        Send-StatusUpdate "Starting your Job Finder cloud setup..."
        Send-StatusUpdate "This is the big one - takes 8-10 minutes. Perfect time for a cup of tea!" -Type Info

        $enginePath = Join-Path $PSScriptRoot "engine\Deploy-GCP.ps1"

        # SECURITY: Validate the deploy script exists and is within expected directory
        if (-not (Test-Path $enginePath)) {
            Send-StatusUpdate "Oops! A setup file is missing from the installation." -Type Error
            Send-StatusUpdate "This means the download didn't complete properly." -Type Warn
            Send-StatusUpdate "Please download and run the installer again." -Type Info
            $actionButton.IsEnabled = $true
            return
        }

        $resolvedEnginePath = (Resolve-Path $enginePath).Path
        $expectedBasePath = (Resolve-Path $PSScriptRoot).Path

        if (-not $resolvedEnginePath.StartsWith($expectedBasePath, [StringComparison]::OrdinalIgnoreCase)) {
            Send-StatusUpdate "Security check failed - please reinstall from the official source." -Type Error
            $actionButton.IsEnabled = $true
            return
        }

        $logPath = Join-Path $PSScriptRoot "..\..\logs\deploy_cloud.log"
        $errorLogPath = Join-Path $PSScriptRoot "..\..\logs\error_cloud.log"

        # Ensure log directory exists
        $logDir = Split-Path $logPath -Parent
        if (-not (Test-Path $logDir)) {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        }

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
                    PublishStatus 'The cloud setup hit a snag.' 'Error'
                    PublishStatus 'This happens sometimes - your computer is fine, nothing was changed.' 'Info'
                    PublishStatus 'Here''s what to do:' 'Info'
                    PublishStatus '  1. Wait 2 minutes (let the cloud servers reset)' 'Info'
                    PublishStatus '  2. Run this installer again' 'Info'
                    PublishStatus '  3. If it still doesn''t work, ask for help and mention this file:' 'Info'
                    PublishStatus "     $errorLogPath" 'Warn'
                    Write-Output ([pscustomobject]@{ Kind = 'Result'; Success = $false; Message = 'Cloud setup needs retry'; Type = 'Error' })
                } else {
                    PublishStatus '✓ Amazing! Your Job Finder is ready in the cloud!' 'Success'
                    PublishStatus 'You can now use it from any computer by visiting your personal web address.' 'Success'
                    Write-Output ([pscustomobject]@{ Kind = 'Result'; Success = $true; Message = 'All done!'; Type = 'Success' })
                }
            } catch {
                PublishStatus 'Something unexpected happened during cloud setup.' 'Error'
                PublishStatus 'Don''t worry - your computer is completely safe.' 'Info'
                PublishStatus 'What to do next:' 'Info'
                PublishStatus '  1. Close this window' 'Info'
                PublishStatus '  2. Wait 2 minutes' 'Info'
                PublishStatus '  3. Run the installer again' 'Info'
                PublishStatus '  4. If you need help, save this file and send it to someone technical:' 'Info'
                PublishStatus "     $errorLogPath" 'Warn'
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
        Send-StatusUpdate "Starting setup on your computer..."
        Send-StatusUpdate "A new window will open in a moment with some questions. Take your time!"
        try {
            $wizardPath = Join-Path $PSScriptRoot "..\..\scripts\setup_wizard.py"

            # SECURITY: Validate wizard path
            if (-not (Test-Path $wizardPath)) {
                Send-StatusUpdate "Oops! The setup helper file is missing." -Type Error
                Send-StatusUpdate "This means the download didn't finish properly." -Type Warn
                Send-StatusUpdate "Please download and run the installer again." -Type Info
                Set-InstallerStep -stepName "Done" -buttonText "Close" -action { $window.Close() }
                return
            }

            $resolvedWizardPath = (Resolve-Path $wizardPath).Path
            $safeScriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }

            # Change to project root (2 levels up from deploy\windows)
            $projectRoot = Join-Path $PSScriptRoot "..\..\" | Resolve-Path

            Start-Process powershell.exe -ArgumentList "-NoExit -Command `"Set-Location '$projectRoot'; python '$resolvedWizardPath'`""
            Send-StatusUpdate "✓ The setup wizard has opened in a new window!" -Type Success
            Send-StatusUpdate "Look for the black window with questions. Answer them one at a time." -Type Info
            Set-InstallerStep -stepName "Done" -buttonText "All Done - Close This" -action { $window.Close() }
        } catch {
            Send-StatusUpdate "Couldn't open the setup wizard." -Type Error
            Send-StatusUpdate "Make sure Python is installed on your computer." -Type Warn
            Send-StatusUpdate "Technical details: $($_.Exception.Message)" -Type Info
            Set-InstallerStep -stepName "Done" -buttonText "Close" -action { $window.Close() }
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
        $crashMessage = @"
Oops! The installer stopped unexpectedly.

This is unusual and we've saved the details to help fix it.

What to do next:
  1. Check your Desktop for a file called 'installer-crash.log'
  2. Ask someone technical to look at this file
  3. They can use it to figure out what went wrong

If you want to try again:
  • Close this window
  • Make sure you're connected to the internet
  • Run the installer again

Sorry for the trouble!
"@
        [System.Windows.Forms.MessageBox]::Show($crashMessage, "Setup Stopped Unexpectedly", 0, [System.Windows.Forms.MessageBoxIcon]::Warning)
    } catch {
        # Silently fail if we can't show the message box - the error is already logged
        $null = $_
    }
}
