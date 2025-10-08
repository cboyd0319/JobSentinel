#!/usr/bin/env pwsh
#requires -Version 5.1

<#
.SYNOPSIS
    PowerShell Quality Assurance Tool - The ONLY tool you need
    
.DESCRIPTION
    Single, consolidated tool for PowerShell code quality analysis and fixing.
    Replaces all the scattered "Ultimate", "Elite", "Enhanced" versions.
    
.PARAMETER Path
    Path to analyze (file or directory)
    
.PARAMETER Mode
    Operation mode: analyze, fix, report
    
.PARAMETER Severity
    Minimum severity to report: Error, Warning, Information
    
.PARAMETER DryRun
    Show what would be fixed without making changes
    
.PARAMETER ConfigFile
    Custom configuration file (defaults to qa/config/PSScriptAnalyzerSettings.psd1)
    
.EXAMPLE
    ./qa/tools/Invoke-PSQualityCheck.ps1 -Path . -Mode analyze
    
.EXAMPLE
    ./qa/tools/Invoke-PSQualityCheck.ps1 -Path ./script.ps1 -Mode fix -DryRun
#>

[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)]
    [string]$Path,
    
    [Parameter()]
    [ValidateSet('analyze', 'fix', 'report')]
    [string]$Mode = 'analyze',
    
    [Parameter()]
    [ValidateSet('Error', 'Warning', 'Information')]
    [string]$Severity = 'Warning',
    
    [Parameter()]
    [switch]$DryRun,
    
    [Parameter()]
    [string]$ConfigFile
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Initialize
$startTime = Get-Date
Write-Host "🔍 PowerShell Quality Check Started" -ForegroundColor Cyan
Write-Host "   Path: $Path" -ForegroundColor Gray
Write-Host "   Mode: $Mode" -ForegroundColor Gray
Write-Host "   Severity: $Severity" -ForegroundColor Gray

# Validate PowerShell version and modules
if ($PSVersionTable.PSVersion -lt [Version]'5.1') {
    throw "PowerShell 5.1 or higher required. Current: $($PSVersionTable.PSVersion)"
}

try {
    Import-Module PSScriptAnalyzer -ErrorAction Stop
    Write-Host "✅ PSScriptAnalyzer module loaded" -ForegroundColor Green
} catch {
    Write-Error "PSScriptAnalyzer module required. Install with: Install-Module PSScriptAnalyzer"
}

# Determine configuration file
if (-not $ConfigFile) {
    $scriptRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
    $ConfigFile = Join-Path $scriptRoot "qa/config/PSScriptAnalyzerSettings.psd1"
}

if (-not (Test-Path $ConfigFile)) {
    Write-Warning "Configuration file not found: $ConfigFile"
    Write-Host "Using default PSScriptAnalyzer settings" -ForegroundColor Yellow
    $config = $null
} else {
    Write-Host "📋 Loading configuration: $ConfigFile" -ForegroundColor Gray
    try {
        $config = Import-PowerShellDataFile -Path $ConfigFile
        Write-Host "✅ Configuration loaded successfully" -ForegroundColor Green
    } catch {
        Write-Error "Failed to load configuration: $($_.Exception.Message)"
    }
}

# Find PowerShell files
Write-Host "🔎 Discovering PowerShell files..." -ForegroundColor Cyan

if (Test-Path $Path -PathType Leaf) {
    # Single file
    $files = @(Get-Item $Path)
} else {
    # Directory - find all PowerShell files
    $patterns = @('*.ps1', '*.psm1', '*.psd1')
    $files = @()
    foreach ($pattern in $patterns) {
        $files += Get-ChildItem -Path $Path -Filter $pattern -Recurse -File | 
                  Where-Object { 
                      $_.FullName -notmatch '(backup|archive|\.git|node_modules)' 
                  }
    }
}

# Ensure $files is always treated as an array
$files = @($files)

if ($files.Count -eq 0) {
    Write-Warning "No PowerShell files found in: $Path"
    exit 0
}

Write-Host "📁 Found $($files.Count) PowerShell files" -ForegroundColor Green

# Analyze files
Write-Host "`n🔍 Starting analysis..." -ForegroundColor Cyan
$totalIssues = 0
$processedFiles = 0
$allIssues = @()

foreach ($file in $files) {
    $processedFiles++
    Write-Progress -Activity "Analyzing PowerShell Files" -Status $file.Name -PercentComplete (($processedFiles / $files.Count) * 100)
    
    try {
        $analysisParams = @{
            Path = $file.FullName
            ErrorAction = 'Continue'
        }
        
        if ($config) {
            $analysisParams['Settings'] = $config
        }
        
        $issues = Invoke-ScriptAnalyzer @analysisParams
        
        if ($issues) {
            $fileIssues = @($issues | Where-Object { $_.Severity -eq $Severity -or 
                                                     ($Severity -eq 'Warning' -and $_.Severity -eq 'Error') -or
                                                     ($Severity -eq 'Information' -and $_.Severity -in @('Error', 'Warning')) })
            if ($fileIssues.Count -gt 0) {
                $allIssues += $fileIssues
                $totalIssues += $fileIssues.Count
                Write-Host "   $($file.Name): $($fileIssues.Count) issues" -ForegroundColor Yellow
            } else {
                Write-Host "   $($file.Name): Clean ✅" -ForegroundColor Green
            }
        } else {
            Write-Host "   $($file.Name): Clean ✅" -ForegroundColor Green
        }
        
    } catch {
        Write-Warning "Failed to analyze $($file.Name): $($_.Exception.Message)"
    }
}

Write-Progress -Activity "Analyzing PowerShell Files" -Completed

# Report results
Write-Host "`n📊 Analysis Results" -ForegroundColor Cyan
Write-Host "   Files analyzed: $processedFiles" -ForegroundColor Gray
Write-Host "   Total issues: $totalIssues" -ForegroundColor $(if ($totalIssues -eq 0) { 'Green' } else { 'Yellow' })

if ($Mode -eq 'report' -and $allIssues.Count -gt 0) {
    Write-Host "`n📋 Detailed Issues:" -ForegroundColor Cyan
    $grouped = $allIssues | Group-Object RuleName | Sort-Object Count -Descending
    foreach ($group in $grouped) {
        Write-Host "   $($group.Name): $($group.Count) occurrences" -ForegroundColor Gray
    }
}

if ($Mode -eq 'fix' -and $allIssues.Count -gt 0) {
    Write-Host "`n🔧 Attempting to fix issues..." -ForegroundColor Cyan
    
    if ($DryRun) {
        Write-Host "   DRY RUN - No changes will be made" -ForegroundColor Yellow
    }
    
    $fixableIssues = @($allIssues | Where-Object { $_.SuggestedCorrections })
    Write-Host "   Fixable issues: $($fixableIssues.Count) of $($allIssues.Count)" -ForegroundColor Gray
    
    if (-not $DryRun -and $allIssues.Count -gt 0) {
        # Group by file for efficient processing
        $fileGroups = $allIssues | Group-Object ScriptPath
        foreach ($fileGroup in $fileGroups) {
            $filePath = $fileGroup.Name
            Write-Host "   Fixing: $(Split-Path $filePath -Leaf)" -ForegroundColor Yellow
            
            $content = Get-Content $filePath -Raw
            $originalContent = $content
            $fixedCount = 0
            
            # Apply custom fixes for common issues
            foreach ($issue in $fileGroup.Group) {
                switch ($issue.RuleName) {
                    'PSAvoidUsingWriteHost' {
                        # Convert Write-Host to Write-Output (remove color parameters)
                        $content = $content -replace 'Write-Host\s+([^-]+?)(?:\s+-\w+\s+\w+)*\s*$', 'Write-Output $1'
                        $content = $content -replace 'Write-Host\s+([^-]+?)(?:\s+-\w+\s+\w+)+', 'Write-Output $1'
                        $fixedCount++
                    }
                    'PSUseDeclaredVarsMoreThanAssignments' {
                        # This requires manual intervention - skip
                    }
                    default {
                        # Try PSScriptAnalyzer's built-in fixes if available
                        if ($issue.SuggestedCorrections) {
                            try {
                                $content = Invoke-Formatter -ScriptDefinition $content
                                $fixedCount++
                            } catch {
                                # Silent fail for formatter issues
                            }
                        }
                    }
                }
            }
            
            # Save if changes were made
            if ($content -ne $originalContent) {
                try {
                    Set-Content $filePath -Value $content -Encoding UTF8 -NoNewline
                    Write-Host "     ✅ Fixed $fixedCount issues" -ForegroundColor Green
                } catch {
                    Write-Warning "     Failed to save fixes: $($_.Exception.Message)"
                }
            } else {
                Write-Host "     ⚠️  No automatic fixes available" -ForegroundColor Yellow
            }
        }
    }
}

# Summary
$elapsed = (Get-Date) - $startTime
Write-Host "`n🎯 Quality Check Complete" -ForegroundColor Cyan
Write-Host "   Duration: $($elapsed.TotalSeconds.ToString('F1'))s" -ForegroundColor Gray
Write-Host "   Status: $(if ($totalIssues -eq 0) { 'CLEAN ✅' } else { "$totalIssues issues found ⚠️" })" -ForegroundColor $(if ($totalIssues -eq 0) { 'Green' } else { 'Yellow' })

exit $(if ($totalIssues -eq 0) { 0 } else { 1 })