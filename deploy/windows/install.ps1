# --- SCRIPT METADATA AND SECURITY ---
<#
.SYNOPSIS
    A simple, user-friendly installer for the Job Finder application.
.DESCRIPTION
    Provides a graphical interface for a non-technical user to choose between
    a local or cloud-based installation, with resilient dependency checking.
#>

# --- INITIAL SETUP ---
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# This top-level try/catch is the final safety net to log any terminating errors.
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
                <ScrollViewer VerticalScrollBarVisibility="Auto">
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
    $stateFile = Join-Path $PSScriptRoot "installer-state.json"

    function Get-InstallerState {
        if (Test-Path $stateFile) {
            try { return Get-Content $stateFile | ConvertFrom-Json } catch { return $null }
        }
        return $null
    }

    function Update-State ($stepName, $error = $null) {
        $currentState = Get-InstallerState
        if ($null -eq $currentState) {
            $currentState = @{ lastCompletedStep = "Start"; errorCount = 0 }
        }
        if ($error) {
            $currentState.errorCount = ($currentState.errorCount | Get-OrElse 0) + 1
            $currentState.lastErrorMessage = $error
        } else {
            $currentState.lastCompletedStep = $script:State.CurrentStep
            $currentState.errorCount = 0
        }
        $currentState.lastAttemptedStep = $stepName
        $currentState | ConvertTo-Json | Set-Content -Path $stateFile
        $script:State.CurrentStep = $stepName
    }
    
    function Update-Status ($message, $type = 'Info') {
        $window.Dispatcher.Invoke([Action]{
            $statusBlock.Text += "`n→ $message"
        })
    }

    function Show-StatusView {
        $choicePanel.Visibility = 'Collapsed'
        $statusGrid.Visibility = 'Visible'
    }

    function Set-Step ($stepName, $buttonText, $action) {
        Update-State -stepName $stepName
        $window.Dispatcher.Invoke([Action]{
            $actionButton.Content = $buttonText
            $Event = $actionButton.GetType().GetEvent('Click')
            $OldHandlers = $Event.GetInvocationList()
            if ($OldHandlers) { foreach ($Handler in $OldHandlers) { $Event.RemoveEventHandler($actionButton, $Handler) } }
            $actionButton.add_Click($action)
            $actionButton.IsEnabled = $true
        })
    }

    # --- Step Definitions for Cloud Install ---
    function Run-Step-CheckPython {
        Update-Status "Checking for Python..."
        if (Get-Command python -ErrorAction SilentlyContinue) {
            Update-Status "✓ Python is installed!" -Type Success
            Set-Step -stepName "CheckGcloud" -buttonText "Next: Check Google Cloud Tools" -action $function:Run-Step-CheckGcloud
            $actionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
        } else {
            Update-Status "It looks like Python is not installed. It’s a required tool." -Type Warn
            Set-Step -stepName "InstallPython" -buttonText "Install Python For Me" -action $function:Run-Step-InstallPython
        }
    }

    function Run-Step-InstallPython {
    $actionButton.IsEnabled = $false
    Update-Status "Downloading Python installer from python.org..."
    
    $job = Start-Job -ScriptBlock {
        param($UpdateCallback)
        $pythonVersion = "3.12.10"
        $pythonUrl = "https://www.python.org/ftp/python/$pythonVersion/python-$pythonVersion-amd64.exe"
        $installerPath = Join-Path $env:TEMP "python-installer.exe"
        # Official SHA256 from https://www.python.org/downloads/release/python-31210/
        $expectedSHA256 = "c3a526c6a84353c8633f01add54abe584535048303455150591e3e9ad884b424"

        try {
            Invoke-WebRequest -Uri $pythonUrl -OutFile $installerPath -UseBasicParsing
            Invoke-Command -ScriptBlock $UpdateCallback -ArgumentList "Verifying download..."
            $actualHash = (Get-FileHash $installerPath -Algorithm SHA256).Hash
            if ($actualHash -ne $expectedSHA256) {
                throw "Python installer checksum failed! File may be corrupt."
            }
            Invoke-Command -ScriptBlock $UpdateCallback -ArgumentList "✓ Download verified. Installing Python..."
            Start-Process -FilePath $installerPath -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1 Include_test=0" -Wait

            # Refresh PATH for the current session
            $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
            $env:Path = $env:Path + ";" + $userPath
            return $true
        } catch {
            Invoke-Command -ScriptBlock $UpdateCallback -ArgumentList "Error installing Python: $($_.Exception.Message)" -Type Error
            return $false
        }
    } -ArgumentList ([scriptblock]::Create("Update-Status"))

    while ($job.State -eq 'Running') { Start-Sleep -Milliseconds 200 }
    $success = Receive-Job $job

    if ($success) {
        Update-Status "✓ Python has been installed!" -Type Success
        Set-Step -stepName "CheckGcloud" -buttonText "Next: Check Google Cloud Tools" -action $function:Run-Step-CheckGcloud
        $actionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
    } else {
        Update-Status "Python installation failed. Please check the logs." -Type Error
        $actionButton.IsEnabled = $true
    }
}

    function Run-Step-CheckGcloud {
        Update-Status "Checking for Google Cloud tools..."
        if (Get-Command gcloud -ErrorAction SilentlyContinue) {
            Update-Status "✓ Google Cloud tools are installed!" -Type Success
            Set-Step -stepName "Deploy" -buttonText "Begin Cloud Setup" -action $function:Run-Step-Deploy
            $actionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
        } else {
            Update-Status "Google Cloud tools are needed to create your secure cloud space." -Type Warn
            Set-Step -stepName "InstallGcloud" -buttonText "Install Google Cloud Tools" -action $function:Run-Step-InstallGcloud
        }
    }

    function Run-Step-InstallGcloud {
    $actionButton.IsEnabled = $false
    Update-Status "Downloading Google Cloud SDK... (this may take a moment)"

    $job = Start-Job -ScriptBlock {
        param($UpdateCallback)
        $installerUrl = "https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe"
        $installerPath = Join-Path $env:TEMP "gcloud-installer.exe"

        try {
            Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath -UseBasicParsing
            Invoke-Command -ScriptBlock $UpdateCallback -ArgumentList "Installing Google Cloud tools..."
            
            # Run the installer silently
            Start-Process -FilePath $installerPath -ArgumentList "/S /allusers /noreporting" -Wait

            # Refresh PATH. gcloud adds its path to the Machine scope.
            $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
            $env:Path = $env:Path + ";" + $machinePath
            return $true
        } catch {
            Invoke-Command -ScriptBlock $UpdateCallback -ArgumentList "Error installing Google Cloud SDK: $($_.Exception.Message)" -Type Error
            return $false
        }
    } -ArgumentList ([scriptblock]::Create("Update-Status"))

    while ($job.State -eq 'Running') { Start-Sleep -Milliseconds 200 }
    $success = Receive-Job $job

    if ($success) {
        Update-Status "✓ Google Cloud tools installed!" -Type Success
        Set-Step -stepName "Deploy" -buttonText "Begin Cloud Setup" -action $function:Run-Step-Deploy
        $actionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
    } else {
        Update-Status "Google Cloud SDK installation failed. Please check the logs." -Type Error
        $actionButton.IsEnabled = $true
    }
}

    function Run-Step-Deploy {
    $actionButton.IsEnabled = $false
    Update-Status "Starting the main cloud setup. This is the longest step (5-10 minutes)..."

    $job = Start-Job -ScriptBlock {
        param($UpdateCallback)
        $enginePath = Join-Path $PSScriptRoot "engine\Deploy-GCP.ps1"
        try {
            # This calls the robust engine script for GCP deployment
            $process = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$enginePath`" deploy" -PassThru -RedirectStandardOutput "$PSScriptRoot\logs\deploy_cloud.log" -RedirectStandardError "$PSScriptRoot\logs\error_cloud.log" -Wait -WindowStyle Hidden
            
            if ($process.ExitCode -ne 0) { 
                throw (Get-Content "$PSScriptRoot\logs\error_cloud.log" -Raw)
            }
            
            Invoke-Command -ScriptBlock $UpdateCallback -ArgumentList "✓ Your secure Job Finder is ready!" -Type Success
            return $true
        } catch {
            Invoke-Command -ScriptBlock $UpdateCallback -ArgumentList "`nOh dear, we hit a snag during the cloud setup." -Type Error
            Invoke-Command -ScriptBlock $UpdateCallback -ArgumentList "Please email me the file at $(Get-Location)\logs\error_cloud.log so I can help."
            return $false
        }
    } -ArgumentList ([scriptblock]::Create("Update-Status"))

    while ($job.State -eq 'Running') { Start-Sleep -Milliseconds 200 }
    $success = Receive-Job $job

    if ($success) {
        Set-Step -stepName "Done" -buttonText "Finish" -action { $window.Close() }
    } else {
        $actionButton.Content = "Finished with Errors"
        $actionButton.Background = [System.Windows.Media.Brushes]::Red
        $actionButton.IsEnabled = $true
    }
}

    # --- Main Button Handlers ---
    $cloudButton.add_Click({
        Show-StatusView
        Set-Step -stepName "CheckPython" -buttonText "Start Cloud Setup" -action $function:Run-Step-CheckPython
        $actionButton.RaiseEvent((New-Object System.Windows.RoutedEventArgs([System.Windows.Controls.Button]::ClickEvent)))
    })

    $localButton.add_Click({
        Show-StatusView
        Update-Status "Starting Local PC Setup..."
        Update-Status "A new window will open. Please answer the questions there."
        try {
            $wizardPath = Join-Path $PSScriptRoot "..\..\scripts\setup_wizard.py"
            Start-Process powershell.exe -ArgumentList "-NoExit -Command `"cd '$PSScriptRoot'; python `"$wizardPath`"`""
            Update-Status "✓ Local setup wizard has started!" -Type Success
            Set-Step -stepName "Done" -buttonText "Finish" -action { $window.Close() }
        } catch {
            Update-Status "Could not start the local setup. Is Python installed?" -Type Error
            Set-Step -stepName "Done" -buttonText "Finish" -action { $window.Close() }
        }
    })

    # --- Initial State Check & Window Launch ---
    $initialState = Get-InstallerState
    if ($initialState -and $initialState.lastAttemptedStep) {
        Show-StatusView
        Update-Status "Welcome back! Resuming previous cloud setup..."
        switch ($initialState.lastAttemptedStep) {
            "InstallPython" { Set-Step -stepName "InstallPython" -buttonText "Install Python For Me" -action $function:Run-Step-InstallPython }
            "CheckGcloud"   { Set-Step -stepName "CheckGcloud" -buttonText "Next: Check Google Cloud Tools" -action $function:Run-Step-CheckGcloud }
            "InstallGcloud" { Set-Step -stepName "InstallGcloud" -buttonText "Install Google Cloud Tools" -action $function:Run-Step-InstallGcloud }
            "Deploy"        { Set-Step -stepName "Deploy" -buttonText "Begin Cloud Setup" -action $function:Run-Step-Deploy }
            default         { Set-Step -stepName "CheckPython" -buttonText "Start Cloud Setup" -action $function:Run-Step-CheckPython }
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
    Set-Content -Path $errorLogPath -Value $errorDetails
    
    # Also try to show a message box, which might work even if the main window failed.
    try { Add-Type -AssemblyName System.Windows.Forms } catch {}
    [System.Windows.Forms.MessageBox]::Show("A critical error occurred during setup. A file named 'installer-crash.log' has been created with the details. Please send this file to the developer for help.", "Setup Failed", 0, [System.Windows.Forms.MessageBoxIcon]::Error)
}