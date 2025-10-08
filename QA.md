# PowerShell QA System

**TL;DR:** `./psqa.ps1 -Mode analyze` to check quality. `./psqa.ps1 -Mode fix` to auto-fix issues.

## Quick Commands

```bash
# Health check
./psqa.ps1 -Mode health

# Analyze all PowerShell files  
./psqa.ps1 -Mode analyze

# Fix issues (with preview)
./psqa.ps1 -Mode fix -DryRun
./psqa.ps1 -Mode fix

# Generate report
./psqa.ps1 -Mode report
```

## What It Does

I built this because PowerShell quality was inconsistent across the project. This consolidates 20+ scattered QA tools into one clean system.

**Features:**
- PSScriptAnalyzer integration with enterprise rules
- Automatic indentation and whitespace fixes  
- Security and best practice enforcement
- Consolidated reporting
- No more configuration conflicts

## Configuration

Master config: `qa/config/PSScriptAnalyzerSettings.psd1`

**Key rules enabled:**
- Consistent indentation (4 spaces)
- Security checks (no plaintext passwords, empty catch blocks)
- Style enforcement (approved verbs, consistent whitespace)  
- Performance rules (no aliases in scripts)

**Disabled rules:**
- PSUseCompatibleCommands (causes profile issues)
- PSAvoidUsingWriteHost (needed for user interaction)

## Usage Examples

**Check single file:**
```bash
./psqa.ps1 -Mode analyze -Path ./deploy/windows/install.ps1
```

**Fix specific directory:**
```bash  
./psqa.ps1 -Mode fix -Path ./deploy/windows/ -DryRun
./psqa.ps1 -Mode fix -Path ./deploy/windows/
```

**Get detailed report:**
```bash
./psqa.ps1 -Mode report -Path . -Severity Error
```

## System Structure

```
qa/
├── config/
│   └── PSScriptAnalyzerSettings.psd1    # Master config
├── tools/  
│   └── Invoke-PSQAEngine.ps1            # Main QA engine
└── reports/                             # Generated reports

psqa.ps1                                 # Entry point script
```

## Common Issues

**"PSScriptAnalyzer not found":**
```bash
Install-Module PSScriptAnalyzer -Scope CurrentUser
```

**"Configuration file not found":**
- Check `qa/config/PSScriptAnalyzerSettings.psd1` exists
- Run health check: `./psqa.ps1 -Mode health`

**"Access denied":**
```bash
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Before/After Cleanup

**Before:** 21+ scattered PowerShell QA tools with names like:
- Invoke-PSFixitElite.ps1
- Invoke-PSQAUltimateAutofix.ps1  
- Invoke-PSFixitEnhanced.ps1
- Multiple conflicting config files

**After:** One clean system:
- Single entry point: `psqa.ps1`
- One config file  
- Consolidated tooling in `qa/`
- No more "Ultimate Elite Enhanced" naming chaos

## Integration

**Pre-commit hook:**
```bash
# Add to .git/hooks/pre-commit
#!/bin/bash
pwsh ./psqa.ps1 -Mode analyze -Path . -Severity Error
```

**CI/CD pipeline:**
```yaml
- name: PowerShell Quality Check
  run: pwsh ./psqa.ps1 -Mode analyze -Path . -Severity Warning
```

---

**Problems?** Check `qa/tools/Invoke-PSQAEngine.ps1` logs or run health check.