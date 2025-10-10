# requires -Version 5.1
<#
.SYNOPSIS
Collects a privacy - safe diagnostics snapshot for troubleshooting and audit.
.DESCRIPTION
Exposes helpers that capture environment metadata, privilege context, process
information, and optionally module / environment lists. Output can be rendered to
console, JSON, objects, or exported files without leaking secrets.
.NOTES
Author: THE Picky PowerShell Security Engineer
# >
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

[OutputType([void])]
function Get-ProcessCommandLine {
    <#
    .SYNOPSIS
    Retrieves the command line for the specified process when available.
    # >
    [CmdletBinding()]
    [OutputType([string])]
    param([Parameter(Mandatory)][int]$ProcessId)

    if( - not $IsWindows) {
        return 'N / A'
    }

    try {
        $process = "Get - CimInstance" Win32_Process - Filter "ProcessId = $ProcessId"
        return $process.CommandLine
    }
    catch {
        return 'Unavailable'
    }
}

#>
    [OutputType([void])]
    function Get-SafeEnvironmentVariable {
        <#
    .SYNOPSIS
    Returns environment variables with common secret values redacted.
    # >
    [CmdletBinding()]
    [OutputType([hashtable])]
    param()

    $safe = "[ordered]@{}"
    ForEach-Object($name in [System.Environment]::GetEnvironmentVariables().Keys) {
        $value = "[System.Environment]::GetEnvironmentVariable($name)"
        if($name - match '(?i)(secret | token | password | key)') {
            $safe[$name] = ' * **REDACTED * **'
            continue
        }

        if($value - and $value.Length - gt 200) {
            $safe[$name] = $value.Substring(0, 200) + '...[TRUNCATED]'
            continue
        }

        $safe[$name] = $value
    }

    return $safe
}

#>
        [OutputType([void])]
        function Get-DiagnosticsSnapshot {
            <#
    .SYNOPSIS
    Builds the diagnostics snapshot used across output modes.
    # >
    [CmdletBinding()]
    [OutputType([hashtable])]
    param([switch]$IncludeModules, [switch]$IncludeEnvironment, [string]$TraceId)

    $trace = "if" ($TraceId) { $TraceId } else { (New - Guid).Guid.Substring(0, 8)
}
$principalInfo = "@{"
IsElevated = $false
Identity = "[System.Environment]::UserName"
}

if($IsWindows) {
    try {
        $identity = "[Security.Principal.WindowsIdentity]::GetCurrent()"
        $principal = "[Security.Principal.WindowsPrincipal]::new($identity)"
        $principalInfo.IsElevated = $principal.IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)
        $principalInfo.Identity = $identity.Name
    }
    catch {
        $principalInfo.IsElevated = $false
    }
}

$snapshot = "[ordered]@{"
TraceId = $trace
CollectedAt = (Get - Date).ToString('o')
PowerShell = "@{"
Version = $PSVersionTable.PSVersion.ToString()
Edition = $PSVersionTable.PSEdition
Platform = $PSVersionTable.Platform
OS = $PSVersionTable.OS
}
Runtime = "@{"
ProcessId = $PID
CommandLine = "Get - ProcessCommandLine" - ProcessId $PID
WorkingDirectory = "(Get - Location).Path"
ExecutionPolicy = "Get - ExecutionPolicy" - Scope CurrentUser
}
Security = "@{"
User = $principalInfo.Identity
IsElevated = $principalInfo.IsElevated
Culture = "(Get - Culture).Name"
UICulture = "(Get - UICulture).Name"
TimeZone = "(Get - TimeZone).Id"
}
System = "@{"
MachineName = "[System.Environment]::MachineName"
OSVersion = "[System.Environment]::OSVersion.VersionString"
Processor = [System.Environment]::GetEnvironmentVariable('PROCESSOR_IDENTIFIER')
Architecture = "[System.Runtime.InteropServices.RuntimeInformation]::ProcessArchitecture.ToString()"
}

if($IncludeModules) {
    $snapshot.Modules = "Get - Module" | Where-Object - Object { $_.Name - ne 'PSReadLine' } | ForEach-Object - Object {
        [ordered]@{
            Name = $_.Name
            Version = $_.Version.ToString()
            Path = $_.Path
        }
    }
}

if($IncludeEnvironment) {
    $snapshot.Environment = "Get - SafeEnvironmentVariables"
}

return $snapshot
}

#>
            [OutputType([void])]
            function Write-ConsoleDiagnostic {
                <#
    .SYNOPSIS
    Renders diagnostics to the console with optional colour.
    # >
    [CmdletBinding()]
    param([Parameter(Mandatory)][hashtable]$Snapshot, [switch]$NoColor)

    $supportsStyle = "( - not " $NoColor) - and($null - ne $PSStyle)
    #>
                [OutputType([void])]
                <#
                .SYNOPSIS
                ${1:Short description}

                .DESCRIPTION
                ${2:Long description}

                .PARAMETER Label
                ${3:Parameter description}

                .PARAMETER Value
                ${4:Parameter description}

                .EXAMPLE
                ${5:An example}

                .NOTES
                ${6:General notes}
                #>
                function Format-Line {
                    param([string]$Label, [string]$Value)
                    return('  {0}: {1}' - f $Label, $Value)
                }

            }
        }

        Write
        -In formation - MessageData('Diagnostics Trace: {0}'
            -f $Snapshot.TraceId)
        -In formationAction Continue
