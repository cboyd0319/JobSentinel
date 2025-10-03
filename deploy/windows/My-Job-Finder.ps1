# My Job Finder - Control Panel
<#
.SYNOPSIS
    A simple, graphical control panel for the user to run the job scraper,
    view results, and change settings.
#>

# --- INITIAL SETUP ---
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop' # CRITICAL: Never silently continue on errors

# --- GUI DEFINITION (WPF) ---
Add-Type -AssemblyName PresentationFramework, System.Windows.Forms

$brand = @{
    Primary   = '#4C8BF5';
    Accent    = '#22C55E';
    Text      = '#333333';
    Muted     = '#6c757d';
    BG        = '#fdfdfd';
    BtnText   = '#ffffff';
}

[xml]$xaml = @"
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="My Job Finder" Height="650" Width="900"
        WindowStartupLocation="CenterScreen" Background="$($brand.BG)">
    <Grid Margin="25">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <StackPanel Grid.Row="0">
            <TextBlock Text="Your Personal Job Finder" FontSize="32" FontWeight="Bold" Foreground="$($brand.Text)"/>
            <TextBlock x:Name="StatusText" Text="Last checked: Never" Margin="0,8,0,0" FontSize="18" Foreground="$($brand.Muted)"/>
        </StackPanel>

        <ListView x:Name="JobsList" Grid.Row="1" Margin="0,25,0,0" BorderThickness="0" FontSize="16">
            <ListView.View>
                <GridView>
                    <GridViewColumn Header="Job Title" DisplayMemberBinding="{Binding Title}" Width="400"/>
                    <GridViewColumn Header="Company" DisplayMemberBinding="{Binding Company}" Width="200"/>
                    <GridViewColumn Header="Match Score" DisplayMemberBinding="{Binding Score}" Width="120"/>
                </GridView>
            </ListView.View>
        </ListView>

        <StackPanel Grid.Row="2" Orientation="Horizontal" Margin="0,25,0,0">
            <Button x:Name="RunButton" Content="Check for New Jobs Now" FontSize="24" FontWeight="Bold" Padding="20,15" MinHeight="65" MinWidth="300" Background="$($brand.Primary)" Foreground="$($brand.BtnText)" BorderThickness="0"/>
            <Button x:Name="SettingsButton" Content="Settings" FontSize="22" Padding="15,15" MinHeight="65" Margin="20,0,0,0" Background="$($brand.Muted)" Foreground="$($brand.BtnText)" BorderThickness="0"/>
        </StackPanel>
    </Grid>
</Window>
"@

# --- GUI CREATION AND LOGIC ---
$reader = New-Object System.Xml.XmlNodeReader $xaml
$window = [System.Windows.Markup.XamlReader]::Load($reader)

# Get UI elements
$statusText = $window.FindName("StatusText")
$jobsList = $window.FindName("JobsList")
$runButton = $window.FindName("RunButton")
$settingsButton = $window.FindName("SettingsButton")

# --- Data Functions ---
function Get-JobData {
    [CmdletBinding()]
    [OutputType([array])]
    param()

    $queryScriptPath = Join-Path $PSScriptRoot "..\..\scripts\query_db.py"

    if (-not (Test-Path $queryScriptPath)) {
        Write-Warning "Query script not found: $queryScriptPath"
        return @()
    }

    try {
        $pythonCmd = Get-Command python -ErrorAction Stop
        $jsonOutput = & $pythonCmd.Source $queryScriptPath 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Warning "Python script exited with code $LASTEXITCODE"
            return @()
        }
        return $jsonOutput | ConvertFrom-Json -ErrorAction Stop
    } catch {
        Write-Warning "Error: Could not retrieve job data. $_"
        return @()
    }
}

function Update-JobsList {
    [CmdletBinding()]
    param()

    try {
        $jobsList.ItemsSource = Get-JobData
        $statusText.Text = "Last checked: $(Get-Date -Format 'h:mm tt on M/d/yyyy')"
    } catch {
        Write-Warning "Failed to update jobs list: $_"
        $statusText.Text = "Couldn't load jobs - check that everything is set up correctly"
    }
}

# --- Button Click Handlers ---
$script:BackgroundJobs = @()
$script:RegisteredEvents = @()

$runButton.add_Click({
    $runButton.IsEnabled = $false
    $runButton.Content = "Searching..."
    $statusText.Text = "Looking for new jobs right now... This takes about a minute."

    $agentPath = Join-Path $PSScriptRoot "..\..\src\agent.py"

    if (-not (Test-Path $agentPath)) {
        $message = @"
Oops! The job checker is missing.

This means something went wrong with the installation.

What to do:
  1. Close this window
  2. Run the installer again
  3. If it still doesn't work, ask someone technical for help
"@
        [System.Windows.Forms.MessageBox]::Show($message, "Job Checker Missing", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
        $runButton.IsEnabled = $true
        $runButton.Content = "Check for New Jobs Now"
        return
    }

    $job = Start-Job -ScriptBlock {
        param($AgentPath)
        $pythonCmd = Get-Command python -ErrorAction Stop
        & $pythonCmd.Source $AgentPath --mode poll 2>&1
    } -ArgumentList $agentPath

    $script:BackgroundJobs += $job

    # Add timeout monitoring (10 minutes max for job search)
    $timeoutTimer = New-Object System.Windows.Threading.DispatcherTimer
    $timeoutTimer.Interval = [TimeSpan]::FromMinutes(10)
    $timeoutTimer.Add_Tick({
        if ($job.State -eq 'Running') {
            Stop-Job $job -ErrorAction SilentlyContinue
            Remove-Job $job -Force -ErrorAction SilentlyContinue
            $runButton.IsEnabled = $true
            $runButton.Content = "Check for New Jobs Now"
            $statusText.Text = "Job search took too long and was stopped. Try again with fewer companies."
        }
        $timeoutTimer.Stop()
    })
    $timeoutTimer.Start()

    # Wait for the job and then update the UI - PROPERLY cleanup event handlers
    $eventJob = Register-ObjectEvent -InputObject $job -EventName StateChanged -Action {
        param($sender, $eventArgs)
        if ($sender.State -eq 'Completed' -or $sender.State -eq 'Failed') {
            try {
                $window.Dispatcher.Invoke([Action]{
                    Update-JobsList
                    $runButton.IsEnabled = $true
                    $runButton.Content = "Check for New Jobs Now"
                    $statusText.Text = "Last checked: $(Get-Date -Format 'h:mm tt on M/d/yyyy')"
                })
            } finally {
                # Stop timeout timer
                if ($timeoutTimer) {
                    $timeoutTimer.Stop()
                }
                # Clean up this event registration
                Get-EventSubscriber | Where-Object { $_.SourceObject -eq $sender } | Unregister-Event -Force -ErrorAction SilentlyContinue
                Remove-Job -Job $sender -Force -ErrorAction SilentlyContinue
            }
        }
    }

    if ($eventJob) {
        $script:RegisteredEvents += $eventJob
    }
})

$settingsButton.add_Click({
    # --- Settings Window Definition ---
    [xml]$settingsXaml = @"
    <Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
            xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
            Title="Settings" Height="600" Width="650"
            WindowStartupLocation="CenterScreen" ResizeMode="NoResize" Background="$($brand.BG)">
        <Grid Margin="25">
            <Grid.RowDefinitions>
                <RowDefinition Height="Auto"/>
                <RowDefinition Height="*"/>
                <RowDefinition Height="Auto"/>
            </Grid.RowDefinitions>

            <TextBlock Grid.Row="0" Text="Your Job Preferences" FontSize="28" FontWeight="Bold" Foreground="$($brand.Text)"/>

            <StackPanel Grid.Row="1" Margin="0,25,0,0">
                <TextBlock Text="What job titles are you looking for?" FontSize="18" FontWeight="SemiBold"/>
                <TextBlock Text="(Type each job title on its own line. For example: Accountant, Sales Manager, etc.)" FontSize="14" Foreground="$($brand.Muted)" Margin="0,5,0,5"/>
                <TextBox x:Name="TitlesBox" Margin="0,5,0,25" Height="120" FontSize="16" AcceptsReturn="True" VerticalScrollBarVisibility="Auto"/>

                <TextBlock Text="Which company websites should I check?" FontSize="18" FontWeight="SemiBold"/>
                <TextBlock Text="(Type each web address on its own line. Must start with https:// - like https://company.com/careers)" FontSize="14" Foreground="$($brand.Muted)" Margin="0,5,0,5"/>
                <TextBox x:Name="UrlsBox" Margin="0,5,0,0" Height="120" FontSize="16" AcceptsReturn="True" VerticalScrollBarVisibility="Auto"/>
            </StackPanel>

            <StackPanel Grid.Row="2" Orientation="Horizontal" HorizontalAlignment="Right" Margin="0,20,0,0">
                <Button x:Name="SaveButton" Content="Save My Preferences" FontSize="20" FontWeight="Bold" Padding="15,12" MinHeight="50" Background="$($brand.Accent)" Foreground="$($brand.BtnText)" BorderThickness="0"/>
                <Button x:Name="CancelButton" Content="Cancel" FontSize="18" Margin="15,0,0,0" Padding="15,12" MinHeight="50"/>
            </StackPanel>
        </Grid>
    </Window>
"@

    $settingsReader = New-Object System.Xml.XmlNodeReader $settingsXaml
    $settingsWindow = [System.Windows.Markup.XamlReader]::Load($settingsReader)

    # Get settings window UI elements
    $titlesBox = $settingsWindow.FindName("TitlesBox")
    $urlsBox = $settingsWindow.FindName("UrlsBox")
    $saveButton = $settingsWindow.FindName("SaveButton")
    $cancelButton = $settingsWindow.FindName("CancelButton")

    # --- Load current settings into the window ---
    $configPath = Join-Path $PSScriptRoot "..\..\config\user_prefs.json"

    # SECURITY: Validate path is within expected directory
    $allowedBasePath = Resolve-Path (Join-Path $PSScriptRoot "..\..")

    if (Test-Path $configPath) {
        $resolvedConfigPath = (Resolve-Path $configPath).Path

        if (-not $resolvedConfigPath.StartsWith($allowedBasePath.Path, [StringComparison]::OrdinalIgnoreCase)) {
            [System.Windows.Forms.MessageBox]::Show("Security check failed. Please reinstall the Job Finder from the official source.", "Security Warning", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
            $settingsWindow.Close()
            return
        }

        try {
            $config = Get-Content $resolvedConfigPath | ConvertFrom-Json
            if ($config.PSObject.Properties.Match('title_allowlist').Count -gt 0) {
                $titlesBox.Text = $config.title_allowlist -join "`n"
            }
            if ($config.PSObject.Properties.Match('companies').Count -gt 0) {
                $urls = $config.companies | ForEach-Object { $_.url }
                $urlsBox.Text = $urls -join "`n"
            }
        } catch {
            Write-Warning "Failed to load config: $_"
        }
    }

    # --- Settings window button logic ---
    $saveButton.add_Click({
        try {
            $newTitles = $titlesBox.Text.Split("`n") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
            $newUrls = $urlsBox.Text.Split("`n") | ForEach-Object { $_.Trim() } | Where-Object { $_ }

            # Rebuild the companies array
            $newCompanies = @()
            foreach ($url in $newUrls) {
                # SAFETY: Validate URL before parsing
                try {
                    $uri = [System.Uri]$url

                    # SECURITY: Only allow http and https protocols
                    if ($uri.Scheme -notin @('http', 'https')) {
                        throw "URL must start with https:// (or http:// in rare cases): $url"
                    }

                    if (-not $uri.Host) {
                        throw "Invalid URL: $url"
                    }
                    $hostParts = $uri.Host.Split('.')
                    if ($hostParts.Count -lt 2) {
                        throw "Invalid domain in URL: $url"
                    }
                    $companyId = $hostParts[-2] # Simple ID from domain
                    $newCompanies += @{ id = $companyId; board_type = "generic_js"; url = $url }
                } catch {
                    $helpText = @"
That web address doesn't look quite right:
  $url

Web addresses must look like this:
  ✓ https://company.com/careers
  ✓ https://jobs.company.com

Common mistakes to fix:
  • Make sure it starts with https://
  • Check for typos in the address
  • Don't use spaces in the address

Please fix it and try saving again.
"@
                    [System.Windows.Forms.MessageBox]::Show($helpText, "Let's Fix That Web Address", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
                    return
                }
            }

            # Reload config to preserve other fields
            if (-not $config) {
                $config = @{}
            }

            $config.title_allowlist = $newTitles
            $config.companies = $newCompanies

            $config | ConvertTo-Json -Depth 5 | Set-Content $resolvedConfigPath -Encoding UTF8
            [System.Windows.Forms.MessageBox]::Show("Your job preferences have been saved!`n`nThe Job Finder will now look for these jobs at the companies you listed.", "All Set!", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information)
            $settingsWindow.Close()
        } catch {
            $errorMsg = @"
Oops! Couldn't save your preferences.

This might be because:
  • The file is being used by another program
  • You don't have permission to save in that folder

Try closing other programs and click Save again.

Technical details (for troubleshooting):
$($_.Exception.Message)
"@
            [System.Windows.Forms.MessageBox]::Show($errorMsg, "Couldn't Save Settings", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Warning)
        }
    })

    $cancelButton.add_Click({
        $settingsWindow.Close()
    })

    $settingsWindow.ShowDialog() | Out-Null
})

# --- Initial Load ---
try {
    Update-JobsList
} catch {
    Write-Warning "Failed initial job list load: $_"
}

# --- Cleanup on Window Close ---
$window.add_Closed({
    # Clean up all background jobs and event subscriptions
    foreach ($eventSub in $script:RegisteredEvents) {
        if ($eventSub) {
            Unregister-Event -SubscriptionId $eventSub.Id -Force -ErrorAction SilentlyContinue
        }
    }

    foreach ($job in $script:BackgroundJobs) {
        if ($job) {
            Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
        }
    }
})

# --- Show the Window ---
$window.ShowDialog() | Out-Null
