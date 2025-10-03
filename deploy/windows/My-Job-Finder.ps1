<#
.SYNOPSIS
    A graphical control panel for the user to run the job scraper,
    view results, and change settings.
.DESCRIPTION
    This script provides the main user interface for interacting with the Job Finder.
    It is a WPF application written entirely in PowerShell.

    It is responsible for:
    - Displaying job results from the local database.
    - Triggering new job scraping runs.
    - Allowing the user to configure their job search preferences.
.NOTES
    Author: Gemini
    Version: 1.0.0
#>

# --- Strict Mode & Initial Setup ---
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$PSScriptRoot = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition

# --- Module Imports ---
try {
    Import-Module (Join-Path $PSScriptRoot 'Config.ps1')
    Import-Module (Get-ProjectPath -RelativePath (Join-Path (Get-JobFinderConfig -Path Paths.ModulesDirectory) 'JobFinder.Validation.psm1'))
} catch {
    [System.Windows.Forms.MessageBox]::Show("A critical module is missing or failed to load. Please reinstall the application. Error: $($_.Exception.Message)", "Initialization Error", 0, 'Error')
    exit 1
}

# --- Load UI from External XAML Files ---
Add-Type -AssemblyName PresentationFramework, System.Windows.Forms

function Load-Xaml {
    param([string]$FileName)
    $path = Join-Path $PSScriptRoot $FileName
    Assert-FileExists -Path $path -ErrorMessage "The UI file '$FileName' is missing. The application may be corrupted."
    $xml = Get-Content -Path $path -Raw
    $reader = New-Object System.Xml.XmlNodeReader $xml
    return [System.Windows.Markup.XamlReader]::Load($reader)
}

# --- Main Window UI & Logic ---
try {
    $window = Load-Xaml -FileName 'My-Job-Finder.xaml'
} catch {
    [System.Windows.Forms.MessageBox]::Show("The main window UI could not be loaded. Error: $($_.Exception.Message)", "UI Load Error", 0, 'Error')
    exit 1
}

# Get UI elements
$ui = @{
    StatusText = $window.FindName("StatusText")
    JobsList = $window.FindName("JobsList")
    RunButton = $window.FindName("RunButton")
    SettingsButton = $window.FindName("SettingsButton")
}

# --- Data & State Management ---
$script:BackgroundJobs = [System.Collections.Generic.List[System.Management.Automation.Job]]::new()

function Get-JobData {
    $queryScriptPath = Get-ProjectPath -RelativePath (Get-JobFinderConfig -Path "Paths.QueryScript")
    if (-not (Test-Path $queryScriptPath)) {
        Write-Warning "Query script not found: $queryScriptPath"
        return @()
    }
    try {
        $jsonOutput = & python $queryScriptPath 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Python script exited with code $LASTEXITCODE"
        }
        return $jsonOutput | ConvertFrom-Json
    } catch {
        Write-Warning "Could not retrieve job data. Is Python installed and the database created? Error: $($_.Exception.Message)"
        return @()
    }
}

function Update-JobsList {
    try {
        $ui.JobsList.ItemsSource = Get-JobData
        $ui.StatusText.Text = "Last checked: $(Get-Date -Format 'g')"
    } catch {
        $ui.StatusText.Text = "Couldn't load jobs. Check if the application is installed correctly."
        Write-Warning "Failed to update jobs list: $($_.Exception.Message)"
    }
}

# --- Event Handlers ---

$ui.RunButton.add_Click({ 
    $ui.RunButton.IsEnabled = $false
    $ui.RunButton.Content = "Searching..."
    $ui.StatusText.Text = "Looking for new jobs... This can take a few minutes."

    $agentPath = Get-ProjectPath -RelativePath (Get-JobFinderConfig -Path "Paths.AgentScript")
    if (-not (Test-Path $agentPath)) {
        [System.Windows.Forms.MessageBox]::Show("The core agent script is missing. Please reinstall the application.", "File Missing", 0, 'Error')
        $ui.RunButton.IsEnabled = $true
        $ui.RunButton.Content = "Check for New Jobs"
        return
    }

    $job = Start-Job -ScriptBlock {
        param($Path) 
        & python $Path --mode poll 2>&1
    } -ArgumentList $agentPath

    $script:BackgroundJobs.Add($job)

    # Register an event to handle job completion
    Register-ObjectEvent -InputObject $job -EventName StateChanged -Action {
        param($sender, $eventArgs)
        if ($sender.State -in @('Completed', 'Failed', 'Stopped')) {
            $window.Dispatcher.Invoke([Action]{
                Update-JobsList
                $ui.RunButton.IsEnabled = $true
                $ui.RunButton.Content = "Check for New Jobs"
            })
            # Clean up the event subscription and job
            Unregister-Event -SubscriptionId $eventArgs.SubscriptionId
            Remove-Job -Job $sender -Force
            $script:BackgroundJobs.Remove($sender)
        }
    } | Out-Null
})

$ui.SettingsButton.add_Click({ 
    try {
        $settingsWindow = Load-Xaml -FileName 'My-Job-Finder-Settings.xaml'
    } catch {
        [System.Windows.Forms.MessageBox]::Show("The settings window UI could not be loaded. Error: $($_.Exception.Message)", "UI Load Error", 0, 'Error')
        return
    }

    $settingsUi = @{
        TitlesBox = $settingsWindow.FindName("TitlesBox")
        UrlsBox = $settingsWindow.FindName("UrlsBox")
        SaveButton = $settingsWindow.FindName("SaveButton")
        CancelButton = $settingsWindow.FindName("CancelButton")
    }

    # Load current settings
    $configPath = Get-ProjectPath -RelativePath (Get-JobFinderConfig -Path "Paths.UserPreferences")
    $config = $null
    if (Test-Path $configPath) {
        $config = Get-Content $configPath | ConvertFrom-Json
        $settingsUi.TitlesBox.Text = $config.title_allowlist -join "`n"
        $settingsUi.UrlsBox.Text = ($config.companies | ForEach-Object { $_.url }) -join "`n"
    }

    $settingsUi.SaveButton.add_Click({
        try {
            $newTitles = $settingsUi.TitlesBox.Text.Split("`n", [System.StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object { $_.Trim() }
            $newUrls = $settingsUi.UrlsBox.Text.Split("`n", [System.StringSplitOptions]::RemoveEmptyEntries) | ForEach-Object { $_.Trim() }

            $newCompanies = @()
            foreach ($url in $newUrls) {
                if (-not (Test-ValidUrl -Url $url)) {
                    [System.Windows.Forms.MessageBox]::Show("The URL '$url' is not valid. Please ensure it starts with http:// or https://.", "Invalid URL", 0, 'Warning')
                    return
                }
                $companyId = ([System.Uri]$url).Host.Split('.')[-2] # Simple ID from domain
                $newCompanies += @{ id = $companyId; board_type = "generic_js"; url = $url }
            }

            if (-not $config) { $config = @{} }
            $config.title_allowlist = $newTitles
            $config.companies = $newCompanies

            $config | ConvertTo-Json -Depth 5 | Set-Content $configPath -Encoding UTF8
            [System.Windows.Forms.MessageBox]::Show("Your preferences have been saved.", "Settings Saved", 0, 'Information')
            $settingsWindow.Close()
        } catch {
            [System.Windows.Forms.MessageBox]::Show("Could not save your preferences. Error: $($_.Exception.Message)", "Save Error", 0, 'Error')
        }
    })

    $settingsUi.CancelButton.add_Click({ $settingsWindow.Close() })

    $settingsWindow.ShowDialog() | Out-Null
})

function OnHyperlinkRequestNavigate {
    param($sender, $e)
    try {
        Start-Process $e.Uri.AbsoluteUri
    } catch {
        Write-Warning "Could not open hyperlink. Error: $($_.Exception.Message)"
    }
    $e.Handled = $true
}

$window.Add_SourceInitialized({
    $window.AddHandler([System.Windows.Documents.Hyperlink]::RequestNavigateEvent, [System.Windows.Navigation.RequestNavigateEventHandler]{ 
        param($sender, $e)
        OnHyperlinkRequestNavigate $sender $e
    })
})

# --- Application Lifecycle ---

$window.add_Closed({
    # Clean up any running background jobs on exit
    foreach ($job in $script:BackgroundJobs) {
        Stop-Job -Job $job -ErrorAction SilentlyContinue
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    }
})

# Initial data load
Update-JobsList

# Show the main window
$window.ShowDialog() | Out-Null