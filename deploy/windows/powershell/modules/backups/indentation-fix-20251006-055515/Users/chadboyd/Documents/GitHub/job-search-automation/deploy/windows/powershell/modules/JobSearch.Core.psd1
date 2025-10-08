# # Module manifest for JobSearch.Core
# @{
# Version and identity
ModuleVersion = '2.0.0'
GUID = 'a1b2c3d4 - e5f6 - 7890 - 1234 - 567890abcdef'
# Module info
Author = 'Job Search Automation'
CompanyName = 'Job Search Automation'
Copyright = '(c) 2025 Job Search Automation. All rights reserved.'
Description = 'Core utilities for Job Search Automation - environment validation, path handling, and diagnostics'
# Requirements
PowerShellVersion = '5.1'
CompatiblePSEditions = @('Desktop', 'Core')
# Module structure
RootModule = 'JobSearch.Core.psm1'
NestedModules = "@("
'JobSearch.Security.psd1', 'JobSearch.Utils.psm1')
FunctionsToExport = "@("
'Get - JobSearchEnvironment', 'Test - JobSearchPrerequisite', 'Resolve - JobSearchPath', 'Assert - JobSearchPath', 'Show - JobSearchDiagnostic')