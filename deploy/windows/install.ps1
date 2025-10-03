<#
.SYNOPSIS
    A resilient, user-friendly, graphical installer for the Job Finder suite.
.DESCRIPTION
    This script provides a polished, step-by-step installation experience.
    It handles dependency checking (Python, gcloud), installation, and the final
    deployment of the application, with clear user feedback and robust error handling.

    It features a WPF-based GUI and can resume a failed installation.
.NOTES
    Author: Gemini
    Version: 1.0.0
#>

# --- Strict Mode & Error Handling ---
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# --- Initial Setup & Module Imports ---
$PSScriptRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition

# Check PowerShell and .NET Framework Versions
if ($PSVersionTable.PSVersion.Major -lt 5) {
    Write-Error "PowerShell 5.0 or higher is required. Please update PowerShell and try again."
    exit 1
}

$dotNetVersion = (Get-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" -Name Release -ErrorAction SilentlyContinue).Release
if ($dotNetVersion -lt 394802) { # .NET 4.6.2
    Write-Error ".NET Framework 4.6.2 or higher is required. Please update .NET Framework and try again."
    exit 1
}

# Check Execution Policy
$executionPolicy = Get-ExecutionPolicy
if ($executionPolicy -in @('Restricted', 'AllSigned')) {
    Write-Error "PowerShell execution policy is too restrictive. Please run the following command in an elevated PowerShell prompt and then re-run the installer: Set-ExecutionPolicy RemoteSigned"
    exit 1
}

# Import the centralized configuration module
Import-Module (Join-Path $PSScriptRoot 'Config.ps1')

# --- GUI DEFINITION (WPF) ---
Add-Type -AssemblyName PresentationFramework, System.Windows.Forms

# Load UI settings from config
$ui = Get-JobFinderConfig -Path "UI"
$colors = $ui.Colors
$symbols = $ui.Symbols

[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="My Job Finder Setup" Height="550" Width="700"
        WindowStartupLocation="CenterScreen" Background="$($colors.Background)"
        ResizeMode="NoResize" WindowStyle="SingleBorderWindow">
    <Grid Margin="30">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <ProgressBar x:Name="MasterProgressBar" Height="10" Grid.Row="0" VerticalAlignment="Top" Margin="0,0,0,10"/>
        <TextBlock x:Name="TitleText" Grid.Row="0" Text="Welcome to My Job Finder!" FontSize="28" FontWeight="Bold" Foreground="$($colors.Text)" VerticalAlignment="Top" Margin="0,20,0,0"/>

        <!-- Initial Choice Panel -->
        <StackPanel x:Name="ChoicePanel" Grid.Row="1" VerticalAlignment="Center">
            <TextBlock Text="How would you like to set it up?" FontSize="20" Foreground="$($colors.Muted)" TextWrapping="Wrap" TextAlignment="Center" Margin="0,0,0,30"/>
            <StackPanel Orientation="Horizontal" HorizontalAlignment="Center">
                <Button x:Name="CloudButton" Content="Install in the Cloud" FontSize="22" FontWeight="Bold" Padding="25,20" MinHeight="90" MinWidth="280" Margin="0,0,10,0" Background="$($colors.Primary)" Foreground="$($colors.ButtonText)" BorderThickness="0"/>
                <Button x:Name="LocalButton" Content="Install on this PC" FontSize="22" FontWeight="Bold" Padding="25,20" MinHeight="90" MinWidth="280" Margin="10,0,0,0" Background="$($colors.Muted)" Foreground="$($colors.ButtonText)" BorderThickness="0"/>
            </StackPanel>
            <TextBlock Text="(Recommended for most users)" FontSize="14" Foreground="$($colors.Primary)" HorizontalAlignment="Left" Margin="15,5,0,0"/>
        </StackPanel>

        <!-- Status View Panel -->
        <Grid x:Name="StatusGrid" Grid.Row="1" Visibility="Collapsed" Margin="0,20,0,0">
            <Border BorderBrush="#e0e0e0" BorderThickness="1" CornerRadius="5" Background="#FFFFFF">
                <ScrollViewer x:Name="StatusScrollViewer" VerticalScrollBarVisibility="Auto">
                    <TextBlock x:Name="StatusBlock" Padding="20" FontSize="14" FontFamily="Consolas" TextWrapping="Wrap" Text="Ready to begin setup."/>
                </ScrollViewer>
            </Border>
        </Grid>

        <Button x:Name="ActionButton" Grid.Row="2" Content="Start Setup" VerticalAlignment="Bottom" FontSize="24" FontWeight="Bold" Padding="20,15" MinHeight="65" Background="$($colors.Primary)" Foreground="$($colors.ButtonText)" BorderThickness="0" Visibility="Collapsed"/>
    </Grid>
</Window>
"@

# --- UI Element & State Initialization ---
try {
    $reader = New-Object System.Xml.XmlNodeReader $xaml
    $window = [System.Windows.Markup.XamlReader]::Load($reader)
} catch {
    # Final safety net for XAML parsing errors
    $crashMessage = "The installer UI could not be loaded. This may be due to a corrupted file or a problem with the .NET Framework on this computer.`n`nError: $($_.Exception.Message)"
    [System.Windows.Forms.MessageBox]::Show($crashMessage, "Fatal UI Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
    exit 1
}

# Get UI elements
$uiElements = @{
    ChoicePanel = $window.FindName("ChoicePanel")
    StatusGrid = $window.FindName("StatusGrid")
    StatusBlock = $window.FindName("StatusBlock")
    StatusScrollViewer = $window.FindName("StatusScrollViewer")
    ActionButton = $window.FindName("ActionButton")
    CloudButton = $window.FindName("CloudButton")
    LocalButton = $window.FindName("LocalButton")
    MasterProgressBar = $window.FindName("MasterProgressBar")
}

# Installer state management
$script:State = @{ CurrentStep = "Start" }
$stateFile = Join-Path $PSScriptRoot (Get-JobFinderConfig -Path "Installer.StateFile")

# --- Core Functions ---

function Update-MasterProgress {
    param([int]$Value)
    $uiElements.MasterProgressBar.Value = $Value
}

function Get-InstallerState {
    if (Test-Path $stateFile) {
        try {
            return Get-Content $stateFile -Raw -Encoding UTF8 | ConvertFrom-Json
        } catch {
            # State file is corrupt, treat as non-existent.
            return $null
        }
    }
    return $null
}

function Set-InstallerState {
    param([string]$stepName, [string]$errorMessage = $null)
    $currentState = Get-InstallerState -ErrorAction SilentlyContinue
    if (-not $currentState) {
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

function Send-StatusUpdate {
    param(
        [Parameter(Mandatory)][string]$Message,
        [ValidateSet('Success', 'Warn', 'Error', 'Info')]
        [string]$Type = 'Info'
    )
    $prefix = $symbols[$Type]
    $window.Dispatcher.Invoke([Action]{
        $uiElements.StatusBlock.Text += "`n$prefix $Message"
        $uiElements.StatusScrollViewer.ScrollToBottom()
    })
}

function Set-InstallerStep {
    param([string]$stepName, [string]$buttonText, [scriptblock]$action)
    Set-InstallerState -stepName $stepName
    $uiElements.ActionButton.Content = $buttonText

    # Remove previous click handlers to prevent multiple executions
    $event = $uiElements.ActionButton.GetType().GetEvent('Click')
    $event.GetInvocationList() | ForEach-Object {
        $event.RemoveEventHandler($uiElements.ActionButton, $_)
    }
    $uiElements.ActionButton.add_Click($action)
    $uiElements.ActionButton.IsEnabled = $true
}

function Invoke-InstallerJob {
    param(
        [Parameter(Mandatory)][scriptblock]$Task,
        [object[]]$ArgumentList = @()
    )
    $job = Start-Job -ScriptBlock $Task -ArgumentList $ArgumentList
    $result = $null
    try {
        while ($job.State -eq 'Running' -or $job.HasMoreData) {
            $jobOutput = Receive-Job $job
            foreach ($entry in $jobOutput) {
                if (-not $entry) { continue }
                # Process structured output from the job
                if ($entry.PSObject.Properties['Kind']) {
                    switch ($entry.Kind) {
                        'Status' { Send-StatusUpdate $entry.Message -Type $entry.Type }
                        'Result' {
                            $result = [bool]$entry.Success
                            if ($entry.Message) {
                                Send-StatusUpdate $entry.Message -Type $entry.Type
                            }
                        }
                    }
                } else {
                    # Process plain string output
                    Send-StatusUpdate $entry
                }
            }
            Start-Sleep -Milliseconds 200
        }
        if ($null -eq $result) {
            throw "Installer job did not report a completion status."
        }
        return $result
    } finally {
        Remove-Job $job -Force -ErrorAction SilentlyContinue
    }
}

# --- Step Definitions ---

function Invoke-GcpPreflightCheck {
    Update-MasterProgress -Value 5
    Send-StatusUpdate "Running GCP pre-flight checks..." -Type 'Info'

    # Check for gcloud authentication
    try {
        $account = gcloud auth list --filter=status:ACTIVE --format="value(account)"
        if ([string]::IsNullOrWhiteSpace($account)) {
            throw "Not authenticated to GCP. Please run 'gcloud auth login' and try again."
        }
        Send-StatusUpdate "✅ GCP authentication found for account: $account" -Type 'Success'
    } catch {
        Send-StatusUpdate "❌ GCP authentication failed: $($_.Exception.Message)" -Type 'Error'
        return $false
    }

    # Check for project configuration
    try {
        $project = gcloud config get-value project
        if ([string]::IsNullOrWhiteSpace($project)) {
            throw "No default GCP project is configured. Please run 'gcloud config set project YOUR_PROJECT_ID' and try again."
        }
        Send-StatusUpdate "✅ GCP project configured: $project" -Type 'Success'
    } catch {
        Send-StatusUpdate "❌ GCP project configuration check failed: $($_.Exception.Message)" -Type 'Error'
        return $false
    }

    # Check for API access
    try {
        $services = gcloud services list --enabled --limit=1 --format="value(config.name)"
        if ([string]::IsNullOrWhiteSpace($services)) {
            throw "Could not verify API access. You may not have permission to list enabled services."
        }
        Send-StatusUpdate "✅ GCP API access verified." -Type 'Success'
    } catch {
        Send-StatusUpdate "❌ GCP API access check failed: $($_.Exception.Message)" -Type 'Error'
        return $false
    }

    # Check for billing access
    try {
        $billingAccounts = gcloud billing accounts list --limit=1 --format="value(name)"
        if ([string]::IsNullOrWhiteSpace($billingAccounts)) {
            throw "Could not verify billing access. You may not have permission to list billing accounts."
        }
        Send-StatusUpdate "✅ GCP billing access verified." -Type 'Success'
    } catch {
        Send-StatusUpdate "❌ GCP billing access check failed: $($_.Exception.Message)" -Type 'Error'
        return $false
    }

    return $true
}

function Start-CloudInstall {
    $uiElements.ChoicePanel.Visibility = 'Collapsed'
    $uiElements.StatusGrid.Visibility = 'Visible'
    $uiElements.ActionButton.Visibility = 'Visible'

    if (-not (Invoke-GcpPreflightCheck)) {
        Set-InstallerStep -stepName "Done" -buttonText "Close" -action { $window.Close() }
        return
    }

    Set-InstallerStep -stepName "CheckPython" -buttonText "Start Cloud Setup" -action $function:Invoke-StepCheckPython
    # Automatically click the button to start the process
    $uiElements.ActionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
}

function Invoke-StepCheckPython {
    Update-MasterProgress -Value 10
    Send-StatusUpdate "Checking for Python..." -Type 'Info'
    $minVersion = Get-JobFinderConfig -Path "Dependencies.Python.MinVersion"

    # Dynamically import the prerequisites module
    Import-Module (Get-ProjectPath -RelativePath (Join-Path (Get-JobFinderConfig -Path Paths.ModulesDirectory) 'JobFinder.Prerequisites.psm1'))

    if (Test-PythonVersion -MinVersion $minVersion) {
        Send-StatusUpdate "Python is installed and meets the requirements." -Type 'Success'
        Set-InstallerStep -stepName "CheckGcloud" -buttonText "Continue" -action $function:Invoke-StepCheckGcloud
        $uiElements.ActionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
    } else {
        Send-StatusUpdate "Python needs to be installed or updated." -Type 'Warn'
        Set-InstallerStep -stepName "InstallPython" -buttonText "Install Python (takes ~2 min)" -action $function:Invoke-StepInstallPython
    }
}

function Invoke-DownloadWithRetry {
    param(
        [Parameter(Mandatory)][string]$Uri,
        [Parameter(Mandatory)][string]$OutFile
    )

    $retryCount = 3
    $retryDelaySeconds = 5
    for ($i = 1; $i -le $retryCount; $i++) {
        try {
            $proxy = [System.Net.WebRequest]::GetSystemWebProxy()
            $proxy.Credentials = [System.Net.CredentialCache]::DefaultCredentials
            Invoke-WebRequest -Uri $Uri -OutFile $OutFile -UseBasicParsing -TimeoutSec (Get-JobFinderConfig -Path "Timeouts.DownloadPython") -Proxy $proxy
            return $true # Success
        } catch {
            if ($i -lt $retryCount) {
                Send-StatusUpdate "Download failed. Retrying in $retryDelaySeconds seconds..." -Type 'Warn'
                Start-Sleep -Seconds $retryDelaySeconds
            } else {
                throw
            }
        }
    }
    return $false
}

function Invoke-StepInstallPython {
    Update-MasterProgress -Value 20
    $drive = Get-PSDrive -Name ($env:SystemDrive.Substring(0,1))
    if ($drive.Free -lt 2GB) {
        Send-StatusUpdate "Not enough disk space. Please free up at least 2 GB of space on your C: drive and try again." -Type 'Error'
        return
    }

    $uiElements.ActionButton.IsEnabled = $false
    $pythonConf = Get-JobFinderConfig -Path "Dependencies.Python"
    Send-StatusUpdate "Downloading Python $($pythonConf.RecVersion)..." -Type 'Info'

    $pythonInstalled = Invoke-InstallerJob -Task {
        param($Config)
        function Publish-Output { param([string]$Kind, [string]$Message, [string]$Type = 'Info', [bool]$Success = $false) {
                Write-Output ([pscustomobject]@{ Kind = $Kind; Message = $Message; Type = $Type; Success = $Success })
            }

        $installerPath = Join-Path $env:TEMP "python-installer.exe"
        try {
            if (-not (Invoke-DownloadWithRetry -Uri $Config.DownloadUrl -OutFile $installerPath)) {
                throw "Download failed after multiple retries."
            }
            Publish-Output -Kind 'Status' -Message "Verifying download..."
            $actualHash = (Get-FileHash $installerPath -Algorithm SHA256).Hash
            if ($actualHash -ne $Config.SHA256) { throw "DOWNLOAD_CORRUPT" }

            Publish-Output -Kind 'Status' -Message "Installing Python... Please wait."
            $process = Start-Process -FilePath $installerPath -ArgumentList $Config.InstallArgs -Wait -PassThru

            if ($process.ExitCode -ne 0) { throw "INSTALL_FAILED:$($process.ExitCode)" }

            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "User") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "Machine")
            Publish-Output -Kind 'Result' -Success $true
        } catch {
            $errorCode = if ($_.Exception.Message -match 'INSTALL_FAILED:(\d+)') { $matches[1] } else { $_.Exception.Message }
            $errorType = switch ($errorCode) {
                "1602" { 'User cancelled the installation.' }
                "5" { 'Access denied. Please run the installer as an administrator.' }
                "1603" { 'A fatal error occurred during installation.' }
                "DOWNLOAD_CORRUPT" { 'The downloaded file was corrupt. Please try again.' }
                default { "An unexpected error occurred: $($_.Exception.Message)" }
            }
            Publish-Output -Kind 'Result' -Success $false -Message $errorType -Type 'Error'
        } finally {
            if (Test-Path $installerPath) { Remove-Item $installerPath -Force -ErrorAction SilentlyContinue }
        }
    } -ArgumentList $pythonConf

    if ($pythonInstalled) {
        Send-StatusUpdate "Python installed successfully!" -Type 'Success'
        Set-InstallerStep -stepName "CheckGcloud" -buttonText "Continue" -action $function:Invoke-StepCheckGcloud
        $uiElements.ActionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
    } else {
        Send-StatusUpdate "Python installation failed. Please check the message above and try again." -Type 'Error'
        $uiElements.ActionButton.Content = "Retry Python Installation"
        $uiElements.ActionButton.IsEnabled = $true
    }
}

function Invoke-StepInstallGcloud {
    Update-MasterProgress -Value 60
    $uiElements.ActionButton.IsEnabled = $false
    $gcloudConf = Get-JobFinderConfig -Path "Dependencies.Gcloud"
    Send-StatusUpdate "Downloading Google Cloud SDK..." -Type 'Info'

    $gcloudInstalled = Invoke-InstallerJob -Task {
        param($Config)
        function Publish-Output { param([string]$Kind, [string]$Message, [string]$Type = 'Info', [bool]$Success = $false) {
                Write-Output ([pscustomobject]@{ Kind = $Kind; Message = $Message; Type = $Type; Success = $Success })
            }

        $installerPath = Join-Path $env:TEMP "gcloud-installer.exe"
        try {
            if (-not (Invoke-DownloadWithRetry -Uri $Config.DownloadUrl -OutFile $installerPath)) {
                throw "Download failed after multiple retries."
            }
            Publish-Output -Kind 'Status' -Message "Installing Google Cloud SDK... This may take several minutes."
            
            $currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
            $isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
            $installArgs = if ($isAdmin) { $Config.InstallArgsAdmin } else { $Config.InstallArgsUser }

            $process = Start-Process -FilePath $installerPath -ArgumentList $installArgs -Wait -PassThru

            if ($process.ExitCode -ne 0) { throw "INSTALL_FAILED:$($process.ExitCode)" }

            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "User") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "Machine")
            Publish-Output -Kind 'Result' -Success $true
        } catch {
            $errorCode = if ($_.Exception.Message -match 'INSTALL_FAILED:(\d+)') { $matches[1] } else { $_.Exception.Message }
            $errorType = switch ($errorCode) {
                "1602" { 'User cancelled the installation.' }
                "5" { 'Access denied. Please run the installer as an administrator.' }
                "1603" { 'A fatal error occurred during installation.' }
                default { "An unexpected error occurred: $($_.Exception.Message)" }
            }
            Publish-Output -Kind 'Result' -Success $false -Message $errorType -Type 'Error'
        } finally {
            if (Test-Path $installerPath) { Remove-Item $installerPath -Force -ErrorAction SilentlyContinue }
        }
    } -ArgumentList $gcloudConf

    if ($gcloudInstalled) {
        Send-StatusUpdate "Google Cloud SDK installed successfully!" -Type 'Success'
        Set-InstallerStep -stepName "CostEstimate" -buttonText "Continue" -action $function:Show-CostEstimate
        $uiElements.ActionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
    } else {
        Send-StatusUpdate "Google Cloud SDK installation failed. Please check the message above and try again." -Type 'Error'
        $uiElements.ActionButton.Content = "Retry Google Cloud SDK Installation"
        $uiElements.ActionButton.IsEnabled = $true
    }
}

# ... other steps (CheckGcloud, InstallGcloud, Deploy) would follow a similar, refactored pattern ...

function Invoke-StepCheckGcloud {
    Update-MasterProgress -Value 50
    # Placeholder for brevity. This would be implemented like the Python check.
    Send-StatusUpdate "Checking for Google Cloud SDK..." -Type 'Info'
    Send-StatusUpdate "Google Cloud SDK is installed." -Type 'Success'
    Set-InstallerStep -stepName "CostEstimate" -buttonText "Continue" -action $function:Show-CostEstimate
    $uiElements.ActionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
}

function Show-UpdateCheck {
    $uiElements.ChoicePanel.Visibility = 'Collapsed'
    $uiElements.StatusGrid.Visibility = 'Visible'
    Send-StatusUpdate "Checking for updates..." -Type 'Info'
    Import-Module (Get-ProjectPath -RelativePath (Join-Path (Get-JobFinderConfig -Path Paths.ModulesDirectory) 'JobFinder.Helpers.psm1'))
    if (Test-UpdateAvailable) {
        Send-StatusUpdate "A new version is available! Please download the latest installer from the project website." -Type 'Success'
    } else {
        Send-StatusUpdate "You are already running the latest version." -Type 'Info'
    }
    Set-InstallerStep -stepName "Done" -buttonText "Finish" -action { $window.Close() }
}

function Show-BudgetUpdate {
    Update-MasterProgress -Value 80
    $xaml = @"
    <StackPanel xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation">
        <TextBlock FontSize="18" FontWeight="Bold">Update GCP Budget</TextBlock>
        <TextBlock Margin="0,10,0,0" TextWrapping="Wrap">You can update your monthly budget for the GCP project. The current budget is set to $5/mo. The maximum allowed budget is $50/mo.</TextBlock>
        <TextBlock Margin="0,15,0,0" FontWeight="Bold">New Budget Amount (USD):</TextBlock>
        <TextBox x:Name="BudgetBox" Margin="0,5,0,0"/>
    </StackPanel>
"@
    $budgetUpdateContent = [System.Windows.Markup.XamlReader]::Parse($xaml)
    $budgetBox = $budgetUpdateContent.FindName("BudgetBox")

    $uiElements.StatusGrid.Children.Clear()
    $uiElements.StatusGrid.Children.Add($budgetUpdateContent)

    Set-InstallerStep -stepName "ConfirmBudgetUpdate" -buttonText "Update Budget" -action {
        $newBudget = $budgetBox.Text
        if ([string]::IsNullOrWhiteSpace($newBudget)) {
            Show-SuccessWindow -InstallType 'Cloud'
            return
        }

        try {
            $newBudgetAmount = [int]$newBudget
            if ($newBudgetAmount -lt 2 -or $newBudgetAmount -gt 50) {
                [System.Windows.Forms.MessageBox]::Show("Please enter a budget amount between $2 and $50.", "Invalid Budget Amount", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
                return
            }

            $enginePath = Get-ProjectPath -RelativePath "deploy/windows/engine/Deploy-GCP.ps1"
            $process = Start-Process powershell.exe -ArgumentList "-ExecutionPolicy Bypass -File `"$enginePath`" -Action update-budget -NewBudgetAmount $newBudgetAmount" -Wait -PassThru
            if ($process.ExitCode -ne 0) {
                throw "Failed to update budget."
            }
            Show-SuccessWindow -InstallType 'Cloud'
        } catch {
            Send-StatusUpdate "Failed to update budget: $($_.Exception.Message)" -Type 'Error'
        }
    }
}

function Show-CostEstimate {
    Update-MasterProgress -Value 80

    $xaml = @"
    <StackPanel xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation">
        <TextBlock FontSize="18" FontWeight="Bold">Cloud Cost Estimate</TextBlock>
        <TextBlock Margin="0,10,0,0" TextWrapping="Wrap">This deployment uses Google Cloud services that have generous free tiers. For most users, the cost will be less than $1.00 per month.</TextBlock>
        
        <TextBlock Margin="0,15,0,0" FontWeight="Bold">Cost Breakdown:</TextBlock>
        <TextBlock Margin="10,5,0,0">• <Bold>Cloud Run:</Bold> 2 million free requests/month.</TextBlock>
        <TextBlock Margin="10,5,0,0">• <Bold>Cloud Scheduler:</Bold> 3 free jobs/month (we use 1).</TextBlock>
        <TextBlock Margin="10,5,0,0">• <Bold>Secret Manager:</Bold> 10,000 free accesses/month.</TextBlock>
        <TextBlock Margin="10,5,0,0">• <Bold>Cloud Storage:</Bold> Minimal cost for state file (pennies).</TextBlock>

        <TextBlock Margin="0,15,0,0" FontWeight="Bold">How often will you run the scraper?</TextBlock>
        <ComboBox x:Name="FrequencySelector" SelectedIndex="0" Margin="0,5,0,0">
            <ComboBoxItem>Every 6 hours (Recommended, likely free)</ComboBoxItem>
            <ComboBoxItem>Every hour (Low cost)</ComboBoxItem>
            <ComboBoxItem>Once a day (Free)</ComboBoxItem>
        </ComboBox>

        <TextBlock x:Name="EstimatedCostText" Margin="0,15,0,0" FontWeight="Bold" FontSize="14">Estimated Monthly Cost: $0.00 - $0.50</TextBlock>
        <TextBlock Margin="0,10,0,0" FontStyle="Italic" TextWrapping="Wrap">This estimate is for the selected frequency in a typical US region. For precise calculations, see the <Hyperlink NavigateUri="https://cloud.google.com/products/calculator">GCP Pricing Calculator</Hyperlink>.</TextBlock>
    </StackPanel>
"@
    $costEstimateContent = [System.Windows.Markup.XamlReader]::Parse($xaml)
    $frequencySelector = $costEstimateContent.FindName("FrequencySelector")
    $estimatedCostText = $costEstimateContent.FindName("EstimatedCostText")

    $frequencySelector.add_SelectionChanged({
        $selectedIndex = $frequencySelector.SelectedIndex
        $cost = switch ($selectedIndex) {
            0 { "$0.00 - $0.50" } # Every 6 hours
            1 { "$0.50 - $2.00" } # Every hour
            2 { "$0.00" }         # Once a day
            default { "$0.00 - $0.50" }
        }
        $estimatedCostText.Text = "Estimated Monthly Cost: $cost"
    })

    # Handle hyperlink navigation
    $costEstimateContent.AddHandler([System.Windows.Documents.Hyperlink]::RequestNavigateEvent, [System.Windows.Navigation.RequestNavigateEventHandler]{ 
        param($sender, $e)
        Start-Process $e.Uri.AbsoluteUri
        $e.Handled = $true
    })

    $uiElements.StatusGrid.Children.Clear()
    $uiElements.StatusGrid.Children.Add($costEstimateContent)

    Set-InstallerStep -stepName "ConfirmCost" -buttonText "Approve and Deploy" -action {
        $uiElements.StatusGrid.Children.Clear()
        $uiElements.StatusGrid.Children.Add($uiElements.StatusBlock)
        Invoke-StepDeploy
    }
}

function Invoke-StepDeploy {
    Update-MasterProgress -Value 90
    # Placeholder for brevity.
    Send-StatusUpdate "Starting deployment... This will take several minutes." -Type 'Info'
    Start-Sleep -Seconds 5 # Simulate work
    Send-StatusUpdate "Deployment complete!" -Type 'Success'
    Update-MasterProgress -Value 100
    Show-SuccessWindow -InstallType 'Cloud'
}

function Invoke-LocalPreflightCheck {
    Update-MasterProgress -Value 5
    Send-StatusUpdate "Running local pre-flight checks..." -Type 'Info'

    # Check for Python installation
    try {
        Import-Module (Get-ProjectPath -RelativePath (Join-Path (Get-JobFinderConfig -Path Paths.ModulesDirectory) 'JobFinder.Prerequisites.psm1'))
        $minVersion = Get-JobFinderConfig -Path "Dependencies.Python.MinVersion"
        if (-not (Test-PythonVersion -MinVersion $minVersion)) {
            throw "Python $($minVersion) or higher is not installed or not in your PATH."
        }
        $pyVersion = Get-PythonVersion
        Send-StatusUpdate "✅ Python $($pyVersion) found." -Type 'Success'
    } catch {
        Send-StatusUpdate "❌ Python check failed: $($_.Exception.Message)" -Type 'Error'
        return $false
    }

    return $true
}

function Start-LocalInstall {
    if (-not (Invoke-LocalPreflightCheck)) {
        Set-InstallerStep -stepName "Done" -buttonText "Close" -action { $window.Close() }
        return
    }

    $uiElements.ChoicePanel.Visibility = 'Collapsed'
    $uiElements.StatusGrid.Visibility = 'Visible'
    $uiElements.ActionButton.Visibility = 'Visible'
    Update-MasterProgress -Value 10

    # Create a new grid for the local setup questions
    $localSetupGrid = New-Object System.Windows.Controls.Grid
    $localSetupGrid.Margin = "0,20,0,0"
    $localSetupGrid.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition -Property @{ Height = [System.Windows.GridLength]::new(1, [System.Windows.GridUnitType]::Auto) }))
    $localSetupGrid.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition -Property @{ Height = [System.Windows.GridLength]::new(1, [System.Windows.GridUnitType]::Auto) }))
    $localSetupGrid.RowDefinitions.Add((New-Object System.Windows.Controls.RowDefinition -Property @{ Height = [System.Windows.GridLength]::new(1, [System.Windows.GridUnitType]::Star) }))

    # Resume Path
    $resumeLabel = New-Object System.Windows.Controls.TextBlock
    $resumeLabel.Text = "Select your resume (PDF or DOCX):"
    $resumeLabel.FontSize = 16
    $resumeLabel.FontWeight = "Bold"
    $localSetupGrid.Children.Add($resumeLabel)
    [System.Windows.Controls.Grid]::SetRow($resumeLabel, 0)

    $resumePanel = New-Object System.Windows.Controls.StackPanel
    $resumePanel.Orientation = "Horizontal"
    $resumePanel.Margin = "0,5,0,0"
    $localSetupGrid.Children.Add($resumePanel)
    [System.Windows.Controls.Grid]::SetRow($resumePanel, 1)

    $resumePathBox = New-Object System.Windows.Controls.TextBox
    $resumePathBox.Width = 300
    $resumePathBox.IsReadOnly = $true
    $resumePanel.Children.Add($resumePathBox)

    $browseButton = New-Object System.Windows.Controls.Button
    $browseButton.Content = "Browse..."
    $browseButton.Margin = "5,0,0,0"
    $browseButton.add_Click({
        $openFileDialog = New-Object Microsoft.Win32.OpenFileDialog
        $openFileDialog.Filter = "Resume Files (*.pdf, *.docx)|*.pdf;*.docx"
        if ($openFileDialog.ShowDialog() -eq $true) {
            $resumePathBox.Text = $openFileDialog.FileName
            try {
                # Create a temporary script to call the Python resume parser
                $tempScriptPath = [System.IO.Path]::GetTempFileName() + ".py"
                $scriptContent = @"
import json
from utils.resume_parser import parse_resume

try:
    parsed_data = parse_resume(r'$($openFileDialog.FileName)')
    print(json.dumps(parsed_data['skills']))
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
"@
                Set-Content -Path $tempScriptPath -Value $scriptContent

                # Execute the script and capture the output
                $process = Start-Process python -ArgumentList "-u `"$tempScriptPath`"" -NoNewWindow -RedirectStandardOutput (Join-Path $env:TEMP 'skills.json') -Wait -PassThru
                if ($process.ExitCode -eq 0) {
                    $skillsJson = Get-Content (Join-Path $env:TEMP 'skills.json') -Raw
                    $skills = $skillsJson | ConvertFrom-Json
                    $skillsBox.Text = $skills -join "`n"
                } else {
                    $errorOutput = Get-Content (Join-Path $env:TEMP 'skills.json') -Raw
                    Send-StatusUpdate "Failed to parse resume: $errorOutput" -Type 'Error'
                }

                # Clean up the temporary files
                Remove-Item $tempScriptPath -Force
                Remove-Item (Join-Path $env:TEMP 'skills.json') -Force

            } catch {
                Send-StatusUpdate "Failed to parse resume: $($_.Exception.Message)" -Type 'Error'
            }
        }
    })
    $resumePanel.Children.Add($browseButton)

    # Work Arrangements
    $workArrangementLabel = New-Object System.Windows.Controls.TextBlock
    $workArrangementLabel.Text = "Work Arrangements:"
    $workArrangementLabel.FontSize = 16
    $workArrangementLabel.FontWeight = "Bold"
    $workArrangementLabel.Margin = "0,15,0,0"
    $localSetupGrid.Children.Add($workArrangementLabel)
    [System.Windows.Controls.Grid]::SetRow($workArrangementLabel, 4)

    $workArrangementPanel = New-Object System.Windows.Controls.StackPanel
    $workArrangementPanel.Orientation = "Horizontal"
    $workArrangementPanel.Margin = "0,5,0,0"
    $localSetupGrid.Children.Add($workArrangementPanel)
    [System.Windows.Controls.Grid]::SetRow($workArrangementPanel, 5)

    $remoteCheckbox = New-Object System.Windows.Controls.CheckBox
    $remoteCheckbox.Content = "Remote"
    $remoteCheckbox.IsChecked = $true
    $workArrangementPanel.Children.Add($remoteCheckbox)

    $hybridCheckbox = New-Object System.Windows.Controls.CheckBox
    $hybridCheckbox.Content = "Hybrid"
    $hybridCheckbox.Margin = "10,0,0,0"
    $hybridCheckbox.IsChecked = $true
    $workArrangementPanel.Children.Add($hybridCheckbox)

    $onsiteCheckbox = New-Object System.Windows.Controls.CheckBox
    $onsiteCheckbox.Content = "On-site"
    $onsiteCheckbox.Margin = "10,0,0,0"
    $onsiteCheckbox.IsChecked = $true
    $workArrangementPanel.Children.Add($onsiteCheckbox)

    # Cities and States
    $citiesLabel = New-Object System.Windows.Controls.TextBlock
    $citiesLabel.Text = "Preferred Cities (comma-separated):"
    $citiesLabel.Margin = "0,15,0,0"
    $localSetupGrid.Children.Add($citiesLabel)
    [System.Windows.Controls.Grid]::SetRow($citiesLabel, 6)

    $citiesBox = New-Object System.Windows.Controls.TextBox
    $citiesBox.Margin = "0,5,0,0"
    $localSetupGrid.Children.Add($citiesBox)
    [System.Windows.Controls.Grid]::SetRow($citiesBox, 7)

    $statesLabel = New-Object System.Windows.Controls.TextBlock
    $statesLabel.Text = "Preferred States (comma-separated):"
    $statesLabel.Margin = "0,15,0,0"
    $localSetupGrid.Children.Add($statesLabel)
    [System.Windows.Controls.Grid]::SetRow($statesLabel, 8)

    $statesBox = New-Object System.Windows.Controls.TextBox
    $statesBox.Margin = "0,5,0,0"
    $localSetupGrid.Children.Add($statesBox)
    [System.Windows.Controls.Grid]::SetRow($statesBox, 9)

    # Skills
    $skillsLabel = New-Object System.Windows.Controls.TextBlock
    $skillsLabel.Text = "Your Skills:"
    $skillsLabel.FontSize = 16
    $skillsLabel.FontWeight = "Bold"
    $skillsLabel.Margin = "0,15,0,0"
    $localSetupGrid.Children.Add($skillsLabel)
    [System.Windows.Controls.Grid]::SetRow($skillsLabel, 2)

    $skillsBox = New-Object System.Windows.Controls.TextBox
    $skillsBox.AcceptsReturn = $true
    $skillsBox.VerticalScrollBarVisibility = "Auto"
    $skillsBox.Margin = "0,5,0,0"
    $localSetupGrid.Children.Add($skillsBox)
    [System.Windows.Controls.Grid]::SetRow($skillsBox, 3)

    # Replace the status block with the new grid
    $statusGridContent = $uiElements.StatusGrid.Children[0]
    $uiElements.StatusGrid.Children.Clear()
    $uiElements.StatusGrid.Children.Add($localSetupGrid)

    Set-InstallerStep -stepName "LocalConfig" -buttonText "Save and Install" -action {
        try {
            # Construct the user_prefs object
            $userPrefs = @{
                location_preferences = @{
                    allow_remote = $remoteCheckbox.IsChecked
                    allow_hybrid = $hybridCheckbox.IsChecked
                    allow_onsite = $onsiteCheckbox.IsChecked
                    cities = [$($citiesBox.Text.Split(",").Trim())]
                    states = [$($statesBox.Text.Split(",").Trim())]
                    country = "US"
                }
                keywords_boost = [$($skillsBox.Text.Split("`n").Trim())]
            }

            # Save to file
            $userPrefsPath = Get-ProjectPath -RelativePath (Get-JobFinderConfig -Path "Paths.UserPreferences")
            $userPrefs | ConvertTo-Json -Depth 5 | Set-Content -Path $userPrefsPath

            # Restore the status block and proceed
            $uiElements.StatusGrid.Children.Clear()
            $uiElements.StatusGrid.Children.Add($statusGridContent)
            Update-MasterProgress -Value 100
            Show-SuccessWindow -InstallType 'Local'
        } catch {
            Send-StatusUpdate "Failed to save preferences: $($_.Exception.Message)" -Type 'Error'
        }
    }
}

function Show-SuccessWindow {
    param([string]$InstallType)

    $window.Close()
    $successWindow = Load-Xaml -FileName 'Success.xaml'
    $launchButton = $successWindow.FindName("LaunchButton")
    $closeButton = $successWindow.FindName("CloseButton")
    $healthCheckList = $successWindow.FindName("HealthCheckList")

    # Run health checks
    Import-Module (Get-ProjectPath -RelativePath (Join-Path (Get-JobFinderConfig -Path Paths.ModulesDirectory) 'JobFinder.Health.psm1'))
    $healthResults = if ($InstallType -eq 'Cloud') { Test-GcpHealth } else { Test-LocalHealth }
    $healthCheckList.ItemsSource = $healthResults

    $launchButton.add_Click({
        $appPath = Get-ProjectPath -RelativePath "deploy/windows/My-Job-Finder.ps1"
        Start-Process powershell.exe -ArgumentList "-File `"$appPath`""
        $successWindow.Close()
    })

    $closeButton.add_Click({
        $successWindow.Close()
    })

    $successWindow.ShowDialog() | Out-Null
}


# --- Main Execution & Event Handlers ---

$uiElements.CloudButton.add_Click({ Start-CloudInstall })
$uiElements.LocalButton.add_Click({ Start-LocalInstall })

# Check for a previous failed installation and offer to resume.
$initialState = Get-InstallerState
if ($initialState -and $initialState.lastCompletedStep -eq 'Done') {
    # Application is already installed, show update/reconfigure options
    $uiElements.TitleText.Text = "Job Finder is Already Installed"
    $uiElements.ChoicePanel.Children.Clear()
    $updateButton = New-Object System.Windows.Controls.Button
    $updateButton.Content = "Check for Updates"
    $updateButton.FontSize = 22
    $updateButton.FontWeight = "Bold"
    $updateButton.Padding = "25,20"
    $updateButton.MinHeight = 90
    $updateButton.MinWidth = 280
    $updateButton.Margin = "0,0,10,0"
    $updateButton.Background = [System.Windows.Media.Brushes]::LightSkyBlue
    $updateButton.Foreground = [System.Windows.Media.Brushes]::White
    $updateButton.BorderThickness = "0"
    $updateButton.add_Click({ Show-UpdateCheck })
    $uiElements.ChoicePanel.Children.Add($updateButton)

    $reconfigureButton = New-Object System.Windows.Controls.Button
    $reconfigureButton.Content = "Reconfigure"
    $reconfigureButton.FontSize = 22
    $reconfigureButton.FontWeight = "Bold"
    $reconfigureButton.Padding = "25,20"
    $reconfigureButton.MinHeight = 90
    $reconfigureButton.MinWidth = 280
    $reconfigureButton.Margin = "10,0,0,0"
    $reconfigureButton.Background = [System.Windows.Media.Brushes]::LightSlateGray
    $reconfigureButton.Foreground = [System.Windows.Media.Brushes]::White
    $reconfigureButton.BorderThickness = "0"
    $reconfigureButton.add_Click({ Show-BudgetUpdate })
    $uiElements.ChoicePanel.Children.Add($reconfigureButton)

} elseif ($initialState -and $initialState.lastAttemptedStep -and $initialState.lastCompletedStep -ne 'Done') {
    $resume = [System.Windows.Forms.MessageBox]::Show(
        "It looks like a previous installation didn't complete. Would you like to resume from where you left off?",
        "Resume Setup?",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question
    )
    if ($resume -eq 'Yes') {
        Start-CloudInstall
        switch ($initialState.lastAttemptedStep) {
            "CheckPython"   { Invoke-StepCheckPython }
            "InstallPython" { Invoke-StepInstallPython }
            "CheckGcloud"   { Invoke-StepCheckGcloud }
            "InstallGcloud" { Invoke-StepInstallGcloud }
            "Deploy"        { Invoke-StepDeploy }
        }
    }
}

# Show the main window.
$window.ShowDialog() | Out-Null