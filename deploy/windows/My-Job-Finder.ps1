# My Job Finder - Control Panel
<#
.SYNOPSIS
    A simple, graphical control panel for the user to run the job scraper,
    view results, and change settings.
#>

# --- INITIAL SETUP ---
Set-StrictMode -Version Latest
$ErrorActionPreference = 'SilentlyContinue' # Use SilentlyContinue for a friendlier UX

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
        Title="My Job Finder" Height="600" Width="800"
        WindowStartupLocation="CenterScreen" Background="$($brand.BG)">
    <Grid Margin="20">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="Auto"/>
        </Grid.RowDefinitions>

        <StackPanel Grid.Row="0">
            <TextBlock Text="Your Personal Job Finder" FontSize="28" FontWeight="Bold" Foreground="$($brand.Text)"/>
            <TextBlock x:Name="StatusText" Text="Last checked: Never" Margin="0,5,0,0" FontSize="16" Foreground="$($brand.Muted)"/>
        </StackPanel>

        <ListView x:Name="JobsList" Grid.Row="1" Margin="0,20,0,0" BorderThickness="0">
            <ListView.View>
                <GridView>
                    <GridViewColumn Header="Job Title" DisplayMemberBinding="{Binding Title}" Width="300"/>
                    <GridViewColumn Header="Company" DisplayMemberBinding="{Binding Company}" Width="150"/>
                    <GridViewColumn Header="Match Score" DisplayMemberBinding="{Binding Score}" Width="100"/>
                </GridView>
            </ListView.View>
        </ListView>

        <StackPanel Grid.Row="2" Orientation="Horizontal" Margin="0,20,0,0">
            <Button x:Name="RunButton" Content="Check for New Jobs Now" FontSize="18" FontWeight="Bold" Padding="10,15" Background="$($brand.Primary)" Foreground="$($brand.BtnText)" BorderThickness="0"/>
            <Button x:Name="SettingsButton" Content="Settings" FontSize="18" Margin="10,0,0,0" Padding="10,15" Background="$($brand.Muted)" Foreground="$($brand.BtnText)" BorderThickness="0"/>
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
    $queryScriptPath = Join-Path $PSScriptRoot "..\..\scripts\query_db.py"
    try {
        $jsonOutput = python $queryScriptPath
        return $jsonOutput | ConvertFrom-Json
    } catch {
        Write-Warning "Error: Could not retrieve job data from the database. Is Python installed and in your PATH?"
        return @()
    }
}

function Update-JobsList {
    [CmdletBinding(SupportsShouldProcess=$true)]
    param()

    if ($PSCmdlet.ShouldProcess("Jobs List", "Update")) {
        $jobsList.ItemsSource = Get-JobData
        $statusText.Text = "Last checked: $(Get-Date -Format g)"
    }
}

# --- Button Click Handlers ---
$runButton.add_Click({
    $runButton.IsEnabled = $false
    $runButton.Content = "Checking..."
    $statusText.Text = "Checking for new jobs right now... This may take a minute."

    $job = Start-Job -ScriptBlock {
        $agentPath = Join-Path $PSScriptRoot "..\..\src\agent.py"
        python $agentPath --mode poll
    }

    # Wait for the job and then update the UI
    Register-ObjectEvent -InputObject $job -EventName StateChanged -Action {
        if ($job.State -eq 'Completed') {
            $window.Dispatcher.Invoke([Action]{
                Update-JobsList
                $runButton.IsEnabled = $true
                $runButton.Content = "Check for New Jobs Now"
                $statusText.Text = "Finished checking at $(Get-Date -Format g)"
            })
        }
    } | Out-Null
})

$settingsButton.add_Click({
    # --- Settings Window Definition ---
    [xml]$settingsXaml = @"
    <Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
            xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
            Title="Settings" Height="500" Width="700"
            WindowStartupLocation="CenterScreen" ResizeMode="NoResize" Background="$($brand.BG)">
        <Grid Margin="20">
            <Grid.RowDefinitions>
                <RowDefinition Height="Auto"/>
                <RowDefinition Height="*"/>
                <RowDefinition Height="Auto"/>
            </Grid.RowDefinitions>

            <TextBlock Grid.Row="0" Text="Your Job Preferences" FontSize="24" FontWeight="Bold" Foreground="$($brand.Text)"/>

            <StackPanel Grid.Row="1" Margin="0,20,0,0">
                <TextBlock Text="Job Titles to Look For" FontSize="16" FontWeight="SemiBold"/>
                <TextBlock Text="(Enter each job title on a new line)" FontSize="12" Foreground="$($brand.Muted)"/>
                <TextBox x:Name="TitlesBox" Margin="0,5,0,20" Height="100" AcceptsReturn="True" VerticalScrollBarVisibility="Auto"/>

                <TextBlock Text="Company Career Page Links" FontSize="16" FontWeight="SemiBold"/>
                <TextBlock Text="(Enter each website link on a new line)" FontSize="12" Foreground="$($brand.Muted)"/>
                <TextBox x:Name="UrlsBox" Margin="0,5,0,0" Height="100" AcceptsReturn="True" VerticalScrollBarVisibility="Auto"/>
            </StackPanel>

            <StackPanel Grid.Row="2" Orientation="Horizontal" HorizontalAlignment="Right">
                <Button x:Name="SaveButton" Content="Save Settings" FontSize="16" FontWeight="Bold" Padding="10,15" Background="$($brand.Accent)" Foreground="$($brand.BtnText)" BorderThickness="0"/>
                <Button x:Name="CancelButton" Content="Cancel" FontSize="16" Margin="10,0,0,0" Padding="10,15"/>
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
    $configPath = ".\config\user_prefs.json"
    if (Test-Path $configPath) {
        $config = Get-Content $configPath | ConvertFrom-Json
        $titlesBox.Text = $config.title_allowlist -join "`n"
        $urls = $config.companies | ForEach-Object { $_.url }
        $urlsBox.Text = $urls -join "`n"
    }

    # --- Settings window button logic ---
    $saveButton.add_Click({
        try {
            $newTitles = $titlesBox.Text.Split("`n") | ForEach-Object { $_.Trim() } | Where-Object { $_ }
            $newUrls = $urlsBox.Text.Split("`n") | ForEach-Object { $_.Trim() } | Where-Object { $_ }

            # Rebuild the companies array
            $newCompanies = @()
            foreach ($url in $newUrls) {
                $companyId = ([System.Uri]$url).Host.Split('.')[-2] # Simple ID from domain
                $newCompanies += @{ id = $companyId; board_type = "generic_js"; url = $url }
            }

            $config.title_allowlist = $newTitles
            $config.companies = $newCompanies

            $config | ConvertTo-Json -Depth 5 | Set-Content $configPath
            [System.Windows.Forms.MessageBox]::Show("Your settings have been saved!", "Success")
            $settingsWindow.Close()
        } catch {
            [System.Windows.Forms.MessageBox]::Show("Could not save settings. Please check the format of your links.", "Error")
        }
    })

    $cancelButton.add_Click({
        $settingsWindow.Close()
    })

    $settingsWindow.ShowDialog() | Out-Null
})

# --- Initial Load ---
Update-JobsList

# --- Show the Window ---
$window.ShowDialog() | Out-Null
