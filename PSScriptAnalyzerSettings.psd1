# PSScriptAnalyzer Settings for Job Scraper Project
# Enforces production-grade PowerShell standards

@{
    # Enable all default rules
    IncludeDefaultRules = $true

    # Severity levels to enforce
    Severity = @('Error', 'Warning', 'Information')

    # Exclude specific rules (if needed)
    ExcludeRules = @(
        # Allow Write-Host in GUI scripts for user feedback
        'PSAvoidUsingWriteHost'
    )

    # Rule-specific configuration
    Rules = @{
        PSUseConsistentIndentation = @{
            Enable = $true
            IndentationSize = 4
            PipelineIndentation = 'IncreaseIndentationForFirstPipeline'
            Kind = 'space'
        }

        PSUseConsistentWhitespace = @{
            Enable = $true
            CheckInnerBrace = $true
            CheckOpenBrace = $true
            CheckOpenParen = $true
            CheckOperator = $true
            CheckPipe = $true
            CheckPipeForRedundantWhitespace = $false
            CheckSeparator = $true
            CheckParameter = $false
        }

        PSAlignAssignmentStatement = @{
            Enable = $true
            CheckHashtable = $true
        }

        PSUseCorrectCasing = @{
            Enable = $true
        }

        PSPlaceOpenBrace = @{
            Enable = $true
            OnSameLine = $true
            NewLineAfter = $true
            IgnoreOneLineBlock = $true
        }

        PSPlaceCloseBrace = @{
            Enable = $true
            NoEmptyLineBefore = $false
            IgnoreOneLineBlock = $true
            NewLineAfter = $false
        }

        PSProvideCommentHelp = @{
            Enable = $true
            ExportedOnly = $true
            BlockComment = $true
            VSCodeSnippetCorrection = $true
            Placement = 'before'
        }

        PSAvoidUsingCmdletAliases = @{
            Enable = $true
            allowlist = @()
        }

        PSAvoidUsingPositionalParameters = @{
            Enable = $true
            CommandAllowList = @()
        }
    }
}
