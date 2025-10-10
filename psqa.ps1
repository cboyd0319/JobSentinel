#!/usr/bin/env pwsh
<#
.SYNOPSIS
    PowerShell QA (PSQA) - Entry Point Script
    Simple wrapper for the comprehensive QA engine system

.DESCRIPTION
    This is the main entry point for the PowerShell Quality Assurance system.
    It provides a simple interface to the comprehensive QA engine for code analysis,
    auto-fixing, reporting, and health checks.

.PARAMETER Mode
    Operation mode: health, analyze, fix, report, test, ci, or all

.PARAMETER Path
    Path to analyze (default: current directory)

.PARAMETER DryRun
    Preview changes without applying them

.PARAMETER Severity
    Minimum severity level to report (Error, Warning, Information)

.PARAMETER OutputFormat
    Output format: Console, JSON, HTML, All

.PARAMETER ConfigPath
    Path to configuration directory (default: ./qa/config)

.PARAMETER Verbose
    Enable verbose output

.EXAMPLE
    ./psqa.ps1 -Mode health
    Check QA system health and dependencies

.EXAMPLE
    ./psqa.ps1 -Mode analyze
    Analyze all PowerShell files for quality issues

.EXAMPLE
    ./psqa.ps1 -Mode fix -DryRun
    Preview auto-fixes without applying them

.EXAMPLE
    ./psqa.ps1 -Mode fix -Path ./deploy/windows/
    Auto-fix issues in specific directory

.EXAMPLE
    ./psqa.ps1 -Mode report -OutputFormat HTML
    Generate HTML quality report

.NOTES
    Author: PowerShell QA Engine v3.0.0
    This script delegates to qa/tools/Invoke-PSQAEngine.ps1
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('health', 'analyze', 'fix', 'report', 'test', 'ci', 'all')]
    [string]$Mode,

    [Parameter()]
    [string]$Path = '.',

    [Parameter()]
    [switch]$DryRun,

    [Parameter()]
    [ValidateSet('Error', 'Warning', 'Information')]
    [string]$Severity,

    [Parameter()]
    [ValidateSet('Console', 'JSON', 'HTML', 'All')]
    [string]$OutputFormat = 'Console',

    [Parameter()]
    [string]$ConfigPath = './qa/config',

    [Parameter()]
    [string]$TraceId = (New-Guid).ToString()
)

# Script metadata
$script:PSQAVersion = "3.0.0"
$script:QAEngine = "./qa/tools/Invoke-PSQAEngine.ps1"

# Colors for output
function Write-ColorOutput {
    param($Message, $Color = 'White')

    $colorMap = @{
        'Red' = "`e[31m"
        'Green' = "`e[32m"
        'Yellow' = "`e[33m"
        'Blue' = "`e[34m"
        'Magenta' = "`e[35m"
        'Cyan' = "`e[36m"
        'White' = "`e[37m"
        'Reset' = "`e[0m"
    }

    Write-Output "$($colorMap[$Color])$Message$($colorMap['Reset'])"
}

function Test-QASystemHealth {
    Write-ColorOutput "PowerShell QA System Health Check" -Color 'Cyan'
    Write-ColorOutput "=================================" -Color 'Cyan'
    Write-Output ""

    $issues = @()

    # Check PowerShell version
    Write-ColorOutput "System Information:" -Color 'Blue'
    Write-Output "  PowerShell Version: $($PSVersionTable.PSVersion)"
    Write-Output "  OS: $($PSVersionTable.OS)"
    Write-Output "  Platform: $($PSVersionTable.Platform)"
    Write-Output ""

    # Check QA Engine
    Write-ColorOutput "QA Engine Check:" -Color 'Blue'
    if (Test-Path $script:QAEngine) {
        Write-ColorOutput "  ✅ QA Engine found: $script:QAEngine" -Color 'Green'
    } else {
        Write-ColorOutput "  ❌ QA Engine missing: $script:QAEngine" -Color 'Red'
        $issues += "QA Engine script not found"
    }

    # Check configuration
    Write-ColorOutput "Configuration Check:" -Color 'Blue'
    if (Test-Path $ConfigPath) {
        Write-ColorOutput "  ✅ Config directory found: $ConfigPath" -Color 'Green'

        $configFiles = @(
            'PSScriptAnalyzerSettings.psd1',
            'QASettings.psd1',
            'SecurityRules.psd1'
        )

        foreach ($configFile in $configFiles) {
            $fullPath = Join-Path $ConfigPath $configFile
            if (Test-Path $fullPath) {
                Write-ColorOutput "  ✅ $configFile" -Color 'Green'
            } else {
                Write-ColorOutput "  WARNING: $configFile (missing)" -Color 'Yellow'
            }
        }
    } else {
        Write-ColorOutput "  ERROR: Config directory missing: $ConfigPath" -Color 'Red'
        $issues += "Configuration directory not found"
    }

    # Check PSScriptAnalyzer
    Write-ColorOutput "PSScriptAnalyzer Check:" -Color 'Blue'
    try {
        $psaModule = Get-Module -ListAvailable -Name PSScriptAnalyzer
        if ($psaModule) {
            Write-ColorOutput "  ✅ PSScriptAnalyzer installed: v$($psaModule.Version)" -Color 'Green'
        } else {
            Write-ColorOutput "  ERROR: PSScriptAnalyzer not installed" -Color 'Red'
            $issues += "PSScriptAnalyzer module not installed"
        }
    } catch {
        Write-ColorOutput "  ERROR: Error checking PSScriptAnalyzer: $_" -Color 'Red'
        $issues += "Error checking PSScriptAnalyzer module"
    }

    # Check reports directory
    Write-ColorOutput "Reports Directory:" -Color 'Blue'
    $reportsDir = "./qa/reports"
    if (Test-Path $reportsDir) {
        Write-ColorOutput "  ✅ Reports directory exists: $reportsDir" -Color 'Green'
    } else {
        Write-ColorOutput "  WARNING: Reports directory missing: $reportsDir (will create)" -Color 'Yellow'
    }

    Write-Output ""

    # Summary
    if ($issues.Count -eq 0) {
        Write-ColorOutput "QA System Status: HEALTHY" -Color 'Green'
        Write-ColorOutput "All components are working correctly" -Color 'Green'
        return 0
    } else {
        Write-ColorOutput "QA System Status: ISSUES DETECTED" -Color 'Yellow'
        Write-ColorOutput "Issues found:" -Color 'Red'
        foreach ($issue in $issues) {
            Write-Output "  - $issue"
        }
        Write-Output ""
        Write-ColorOutput "TIP: Run setup to fix issues: make -C qa setup" -Color 'Yellow'
        return 1
    }
}

# Main execution
try {
    Write-ColorOutput "PowerShell QA (PSQA) v$script:PSQAVersion" -Color 'Magenta'
    Write-Output ""

    # Handle special modes
    if ($Mode -eq 'health') {
        exit (Test-QASystemHealth)
    }

    # Check if QA engine exists
    if (-not (Test-Path $script:QAEngine)) {
        Write-ColorOutput "ERROR: PowerShell QA script not found: $script:QAEngine" -Color 'Red'
        Write-ColorOutput "TIP: Run: ./psqa.ps1 -Mode health to check QA system status" -Color 'Yellow'
        exit 1
    }

    # Build parameters for QA engine
    $qaParams = @{
        Path = $Path
        Mode = $Mode
        ConfigPath = $ConfigPath
        OutputFormat = $OutputFormat
        TraceId = $TraceId
    }

    if ($DryRun) { $qaParams['DryRun'] = $true }
    if ($Verbose) { $qaParams['Verbose'] = $true }

    # Map severity filter if provided
    if ($Severity) {
        # Note: The QA engine handles severity filtering internally
        Write-ColorOutput "Filtering by severity: $Severity" -Color 'Blue'
    }

    Write-ColorOutput "Delegating to QA Engine..." -Color 'Blue'
    Write-Output ""

    # Execute QA engine
    & $script:QAEngine @qaParams

    $exitCode = $LASTEXITCODE
    if ($exitCode -eq 0) {
        Write-Output ""
        Write-ColorOutput "QA operation completed successfully" -Color 'Green'
    }

    exit $exitCode

} catch {
    Write-ColorOutput "ERROR: PSQA Error: $_" -Color 'Red'
    Write-ColorOutput "TIP: Run: ./psqa.ps1 -Mode health for diagnostics" -Color 'Yellow'
    exit 1
}
