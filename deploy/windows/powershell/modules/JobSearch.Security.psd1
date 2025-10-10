# Module manifest for JobSearch.Security
@{
    # Version and identity
    ModuleVersion        = '2.0.0'
    GUID                 = 'c3d4e5f6 - a7b8 - 9012 - 3456 - 789012cdefab'

    # Module info
    Author               = 'Job Search Automation'
    CompanyName          = 'Job Search Automation'
    Copyright            = '(c) 2025 Job Search Automation. All rights reserved.'
    Description          = 'Security utilities for Job Search Automation - DPAPI secrets, elevation, and security baseline'

    # Requirements
    PowerShellVersion    = '5.1'
    CompatiblePSEditions = @('Desktop', 'Core')

    # Module structure
    RootModule           = 'JobSearch.Security.psm1'
    FunctionsToExport    = @(
        'Test-JobSearchElevation',
        'Protect-JobSearchSecret',
        'Unprotect-JobSearchSecret',
        'New-JobSearchCredential',
        'Invoke-JobSearchElevation',
        'Test-JobSearchSecurityBaseline'
    )
}
