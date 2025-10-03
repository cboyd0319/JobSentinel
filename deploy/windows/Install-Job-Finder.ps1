<#
.SYNOPSIS
    A safe and user-friendly one-click installer for the Job Finder.
.DESCRIPTION
    This script provides a polished, graphical first-run experience. It displays a
    splash screen while downloading the main application, then seamlessly launches
    the main graphical installer.
.NOTES
    Author: Gemini (Designer Persona)
    Version: 1.2.0
#>

# --- Strict Mode & Error Handling ---
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# --- Main Execution ---
try {
    # --- Splash Screen UI Definition (WPF) ---
    Add-Type -AssemblyName PresentationFramework, System.Windows.Forms

    [xml]$xaml = @"
    <Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
            xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
            Title="Job Finder Setup" Height="250" Width="450"
            WindowStartupLocation="CenterScreen" WindowStyle="None" AllowsTransparency="True" Background="Transparent">
        <Border Background="#F9FAFB" BorderBrush="#E5E7EB" BorderThickness="1" CornerRadius="10">
            <Grid Margin="20">
                <StackPanel VerticalAlignment="Center">
                    <TextBlock Text="Getting things ready..." FontSize="20" FontWeight="Bold" Foreground="#1F2937" HorizontalAlignment="Center"/>
                    <TextBlock x:Name="StatusText" Text="Downloading installer files..." FontSize="14" Foreground="#6B7280" HorizontalAlignment="Center" Margin="0,10,0,0"/>
                    <ProgressBar x:Name="ProgressBar" Height="10" Margin="0,20,0,0" IsIndeterminate="True"/>
                </StackPanel>
            </Grid>
        </Border>
    </Window>
"@

    $reader = New-Object System.Xml.XmlNodeReader $xaml
    $splashWindow = [System.Windows.Markup.XamlReader]::Load($reader)
    $statusText = $splashWindow.FindName("StatusText")

    # Show the splash screen
    $splashWindow.Show()

    # --- Download & Extraction Logic ---
    $RepoOwner = 'cboyd0319'
    $RepoName = 'job-private-scraper-filter'
    $ZipUrl = "https://github.com/${RepoOwner}/${RepoName}/archive/refs/heads/main.zip"
    $InstallDir = Join-Path ([System.Environment]::GetFolderPath('Desktop')) "Job-Finder-Setup"
    $ZipPath = Join-Path $InstallDir "project.zip"

    if (-not (Test-Path $InstallDir)) { New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null }

    # Download with proxy detection
    $proxy = [System.Net.WebRequest]::GetSystemWebProxy()
    $proxy.Credentials = [System.Net.CredentialCache]::DefaultCredentials
    Invoke-WebRequest -Uri $ZipUrl -OutFile $ZipPath -UseBasicParsing -Proxy $proxy

    $splashWindow.Dispatcher.Invoke([Action]{
        $statusText.Text = "Unpacking files..."
    })

    Expand-Archive -Path $ZipPath -DestinationPath $InstallDir -Force

    # --- Launch Main Installer ---
    $ExtractedFolder = Get-ChildItem -Path $InstallDir -Directory | Where-Object { $_.Name -match "^${RepoName}" } | Sort-Object CreationTime -Descending | Select-Object -First 1
    $InstallerPath = Join-Path $ExtractedFolder.FullName "deploy\windows\install.ps1"

    $splashWindow.Close()

    # Launch the main installer in a new process to ensure it has its own scope
    Start-Process powershell.exe -ArgumentList "-ExecutionPolicy Bypass -File `"$InstallerPath`"" -WorkingDirectory (Split-Path $InstallerPath -Parent)

} catch {
    # Display any errors in a standard message box
    [System.Windows.Forms.MessageBox]::Show("A problem occurred during the initial setup. Please check your internet connection and try again.`n`nError: $($_.Exception.Message)", "Setup Error", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Error)
    exit 1
} finally {
    if (Test-Path -Path (Join-Path $InstallDir "project.zip")) {
        Remove-Item (Join-Path $InstallDir "project.zip") -Force -ErrorAction SilentlyContinue
    }
}