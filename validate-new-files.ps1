# Validate syntax of all newly created files
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$files = @(
    'deploy\windows\uninstall.ps1',
    'deploy\windows\Config.ps1',
    'deploy\windows\modules\JobFinder.Credentials.psm1',
    'deploy\windows\modules\JobFinder.Validation.psm1',
    'deploy\windows\modules\JobFinder.Logging.psm1',
    'deploy\windows\modules\JobFinder.Prerequisites.psm1',
    'deploy\windows\modules\JobFinder.Telemetry.psm1',
    'deploy\windows\modules\JobFinder.Helpers.psm1',
    'tests\Prerequisites.Tests.ps1',
    'tests\Validation.Tests.ps1'
)

$totalErrors = 0

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Validating: $file" -ForegroundColor Cyan
        try {
            $errors = $null
            $content = Get-Content $file -Raw -Encoding UTF8
            [void][System.Management.Automation.PSParser]::Tokenize($content, [ref]$errors)

            if ($errors -and $errors.Count -gt 0) {
                Write-Host "  ERRORS: $($errors.Count)" -ForegroundColor Red
                $totalErrors += $errors.Count
            } else {
                Write-Host "  OK" -ForegroundColor Green
            }
        } catch {
            Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
            $totalErrors++
        }
    } else {
        Write-Host "File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
if ($totalErrors -eq 0) {
    Write-Host "All new files validated successfully!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Total errors: $totalErrors" -ForegroundColor Red
    exit 1
}
