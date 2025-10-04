# Syntax Validation Script
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$files = @(
    'deploy\windows\My-Job-Finder.ps1',
    'deploy\windows\install.ps1',
    'deploy\windows\bootstrap.ps1',
    'scripts\secure-update.ps1',
    'deploy\windows\engine\Deploy-GCP.ps1',
    'deploy\windows\engine\modules\Security.psm1'
)

$totalErrors = 0

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "`nValidating: $file" -ForegroundColor Cyan
        try {
            $errors = $null
            $content = Get-Content $file -Raw -Encoding UTF8
            [void][System.Management.Automation.PSParser]::Tokenize($content, [ref]$errors)

            if ($errors -and $errors.Count -gt 0) {
                Write-Host "  SYNTAX ERRORS: $($errors.Count)" -ForegroundColor Red
                foreach ($err in $errors) {
                    Write-Host "    Line $($err.Token.StartLine): $($err.Message)" -ForegroundColor Yellow
                }
                $totalErrors += $errors.Count
            } else {
                Write-Host "  Syntax OK" -ForegroundColor Green
            }
        } catch {
            Write-Host "  FAILED TO PARSE: $($_.Exception.Message)" -ForegroundColor Red
            $totalErrors++
        }
    } else {
        Write-Host "`nFile not found: $file" -ForegroundColor Red
        $totalErrors++
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
if ($totalErrors -eq 0) {
    Write-Host "All scripts validated successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Total errors: $totalErrors" -ForegroundColor Red
    exit 1
}
