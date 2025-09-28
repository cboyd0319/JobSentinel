#!/usr/bin/env powershell
# Secure Update Script for Job Scraper
# This script runs updates without bypassing execution policy

param(
    [string]$InstallPath = (Join-Path $env:USERPROFILE "job-scraper"),
    [switch]$Quiet
)

# Enable strict error handling
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-SecureLog {
    param($Message, $Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "$timestamp [$Level] $Message"
    
    if (!$Quiet) {
        Write-Host $logEntry
    }
    
    # Log to file
    $logDir = Join-Path $InstallPath "data" | Join-Path -ChildPath "logs"
    if (!(Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    $logFile = Join-Path $logDir "secure-updates.log"
    Add-Content $logFile $logEntry
}

function Test-GitRepositorySecurity {
    param($RepoPath)
    
    Write-SecureLog "Validating repository security..." "SECURITY"
    
    # Check if it's actually a Git repository
    if (!(Test-Path "$RepoPath\\.git")) {
        throw "Invalid Git repository structure"
    }
    
    # Validate remote origin
    Push-Location $RepoPath
    try {
        $remoteUrl = git config --get remote.origin.url
        if ($remoteUrl -notmatch "github\\.com[:/]cboyd0319/job-private-scraper-filter") {
            throw "Invalid repository origin: $remoteUrl"
        }
        Write-SecureLog "Repository origin validated: $remoteUrl" "SECURITY"
    } finally {
        Pop-Location
    }
}

function Update-JobScraperSecure {
    Write-SecureLog "Starting secure update process..." "INFO"
    
    try {
        Push-Location $InstallPath
        
        # Backup user configuration files
        $configBackup = "$env:TEMP\\job-scraper-secure-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
        New-Item -ItemType Directory -Path $configBackup -Force | Out-Null
        
        $configFiles = @(".env", "user_prefs.json")
        foreach ($file in $configFiles) {
            if (Test-Path $file) {
                Copy-Item $file "$configBackup\\$file" -Force
                Write-SecureLog "Backed up $file" "SECURITY"
            }
        }
        
        $updateAvailable = $false
        
        # Check if we have Git repository
        if (Test-Path ".git") {
            Test-GitRepositorySecurity -RepoPath $InstallPath
            
            Write-SecureLog "Pulling latest updates from GitHub..." "INFO"
            $gitResult = git pull origin main 2>&1
            if ($LASTEXITCODE -eq 0) {
                if ($gitResult -match "Already up to date") {
                    Write-SecureLog "Already up to date" "INFO"
                    $updateAvailable = $false
                } else {
                    Write-SecureLog "Successfully pulled latest code" "INFO"
                    $updateAvailable = $true
                }
            } else {
                throw "Git pull failed: $gitResult"
            }
        } else {
            Write-SecureLog "No Git repository - using secure download method..." "INFO"
            
            # Secure download method
            $tempDir = "$env:TEMP\\job-scraper-secure-update-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
            
            # Use git clone with specific security parameters
            $cloneResult = git clone --depth 1 --single-branch --branch main https://github.com/cboyd0319/job-private-scraper-filter.git $tempDir 2>&1
            if ($LASTEXITCODE -ne 0) {
                throw "Secure Git clone failed: $cloneResult"
            }
            
            # Validate the downloaded repository
            Test-GitRepositorySecurity -RepoPath $tempDir
            
            # Check version difference
            $currentVersion = ""
            $newVersion = ""
            
            if (Test-Path "VERSION") {
                $currentVersion = Get-Content "VERSION" -Raw -ErrorAction SilentlyContinue
            }
            
            if (Test-Path "$tempDir\\VERSION") {
                $newVersion = Get-Content "$tempDir\\VERSION" -Raw -ErrorAction SilentlyContinue
            }
            
            if ($currentVersion -ne $newVersion -or $Force) {
                Write-SecureLog "Updating from version '$currentVersion' to '$newVersion'..." "INFO"
                
                # Secure file copy with validation
                $excludePatterns = @(".env", "user_prefs.json", "data\\*", ".venv\\*", ".git\\*")
                
                Get-ChildItem $tempDir -Recurse | ForEach-Object {
                    $relativePath = $_.FullName.Substring($tempDir.Length + 1)
                    
                    # Security: Prevent directory traversal
                    if ($relativePath -match "\\.\\.|\\\\\\.\\.") {
                        Write-SecureLog "Blocked potential directory traversal: $relativePath" "SECURITY"
                        return
                    }
                    
                    $shouldExclude = $false
                    foreach ($pattern in $excludePatterns) {
                        if ($relativePath -like $pattern) {
                            $shouldExclude = $true
                            break
                        }
                    }
                    
                    if (!$shouldExclude -and !$_.PSIsContainer) {
                        $targetPath = Join-Path $InstallPath $relativePath
                        $targetDir = Split-Path $targetPath -Parent
                        
                        # Security: Validate target path is within installation directory
                        if (!$targetPath.StartsWith($InstallPath)) {
                            Write-SecureLog "Blocked file outside install directory: $targetPath" "SECURITY"
                            return
                        }
                        
                        if (!(Test-Path $targetDir)) {
                            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
                        }
                        
                        Copy-Item $_.FullName $targetPath -Force
                    }
                }
                
                # Cleanup temp directory
                Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
                $updateAvailable = $true
            } else {
                Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
                $updateAvailable = $false
                Write-SecureLog "Already up to date (version: $currentVersion)" "INFO"
            }
        }
        
        if ($updateAvailable) {
            # Update Python dependencies securely
            Write-SecureLog "Updating Python dependencies..." "INFO"
            
            $pythonPath = ".\.venv\Scripts\python.exe"
            if (!(Test-Path $pythonPath)) {
                throw "Virtual environment not found"
            }
            
            & $pythonPath -m pip install --upgrade pip --quiet
            & $pythonPath -m pip install -r requirements.txt --upgrade --quiet
            
            # Restore user configuration files
            foreach ($file in $configFiles) {
                if (Test-Path "$configBackup\\$file") {
                    Copy-Item "$configBackup\\$file" $file -Force
                    Write-SecureLog "Restored $file" "SECURITY"
                }
            }
            
            # Validate installation
            Write-SecureLog "Validating updated installation..." "INFO"
            $testResult = & $pythonPath -c "
import sys, os
sys.path.insert(0, os.getcwd())
try:
    from src.agent import main
    from src.database import init_db
    print('SUCCESS: Update validation passed')
except Exception as e:
    print(f'ERROR: {e}')
    sys.exit(1)
"
            
            if ($LASTEXITCODE -eq 0) {
                Write-SecureLog "Update completed successfully!" "INFO"
                return $true
            } else {
                throw "Update validation failed"
            }
        }
        
        # Cleanup config backup if successful
        if (Test-Path $configBackup) {
            Remove-Item $configBackup -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        return $updateAvailable
        
    } catch {
        Write-SecureLog "Update failed: $($_.Exception.Message)" "ERROR"
        
        # Restore configuration from backup if it exists
        if (Test-Path $configBackup) {
            foreach ($file in $configFiles) {
                if (Test-Path "$configBackup\\$file") {
                    Copy-Item "$configBackup\\$file" $file -Force
                    Write-SecureLog "Restored $file from backup" "SECURITY"
                }
            }
            Remove-Item $configBackup -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        return $false
    } finally {
        Pop-Location
    }
}

# Main execution
try {
    if (!(Test-Path $InstallPath)) {
        throw "Installation path not found: $InstallPath"
    }
    
    $result = Update-JobScraperSecure
    if ($result) {
        Write-SecureLog "Secure update completed successfully" "INFO"
    } else {
        Write-SecureLog "No updates were needed" "INFO"
    }
} catch {
    Write-SecureLog "Secure update failed: $($_.Exception.Message)" "ERROR"
    exit 1
}