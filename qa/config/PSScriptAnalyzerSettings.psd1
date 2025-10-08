# PowerShell QA System - Master Configuration
# This is the authoritative PSScriptAnalyzer configuration for the job-search-automation project

@{
    # Include all default rules as baseline
    IncludeDefaultRules = $true
    
    # Severity levels to enforce
    Severity = @('Error', 'Warning', 'Information')
    
    # Rules to exclude (with reasoning)
    ExcludeRules = @(
        'PSUseCompatibleCommands',    # Requires complex TargetProfiles configuration
        'PSUseCompatibleCmdlets',     # May cause issues with profile dependencies  
        'PSUseCompatibleTypes'        # May require TargetProfiles configuration
    )
    
    # Custom rule configuration
    Rules = @{
        # === FORMATTING RULES ===
        PSUseConsistentIndentation = @{
            Enable              = $true
            IndentationSize     = 4
            PipelineIndentation = 'IncreaseIndentationForFirstPipeline'
            Kind                = 'space'
        }
        
        PSUseConsistentWhitespace = @{
            Enable                          = $true
            CheckInnerBrace                 = $true
            CheckOpenBrace                  = $true
            CheckOpenParen                  = $true
            CheckOperator                   = $true
            CheckPipe                       = $true
            CheckPipeForRedundantWhitespace = $true
            CheckSeparator                  = $true
            CheckParameter                  = $false
        }
        
        PSPlaceOpenBrace = @{
            Enable             = $true
            OnSameLine         = $true
            NewLineAfter       = $true
            IgnoreOneLineBlock = $true
        }
        
        PSPlaceCloseBrace = @{
            Enable             = $true
            NewLineAfter       = $false
            IgnoreOneLineBlock = $true
            NoEmptyLineBefore  = $false
        }
        
        PSAvoidTrailingWhitespace = @{
            Enable = $true
        }
        
        # === SECURITY RULES ===
        PSAvoidUsingPlainTextForPassword = @{
            Enable = $true
        }
        
        PSAvoidUsingConvertToSecureStringWithPlainText = @{
            Enable = $true
        }
        
        # === BEST PRACTICES ===
        PSUseApprovedVerbs = @{
            Enable = $true
        }
        
        PSUseSingularNouns = @{
            Enable = $true
        }
        
        PSAvoidUsingCmdletAliases = @{
            Enable = $true
        }
        
        PSAvoidUsingPositionalParameters = @{
            Enable = $true
        }
        
        PSUseCmdletCorrectly = @{
            Enable = $true
        }
        
        PSAvoidGlobalVars = @{
            Enable = $true
        }
        
        PSAvoidUsingEmptyCatchBlock = @{
            Enable = $true
        }
        
        PSUseDeclaredVarsMoreThanAssignments = @{
            Enable = $true
        }
        
        PSAvoidUnusedVariable = @{
            Enable = $true
        }
        
        # === DOCUMENTATION RULES ===
        PSProvideCommentHelp = @{
            Enable                    = $true
            ExportedOnly             = $true
            BlockComment             = $true
            VSCodeSnippetCorrection  = $true
            Placement                = 'before'
        }
        
        # === RELIABILITY RULES ===
        PSUseShouldProcessForStateChangingFunctions = @{
            Enable = $true
        }
        
        PSUseOutputTypeCorrectly = @{
            Enable = $true
        }
        
        PSUseBOMForUnicodeEncodedFile = @{
            Enable = $true
        }
    }
}