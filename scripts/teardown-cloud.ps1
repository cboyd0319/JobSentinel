#!/usr/bin/env powershell
<#
.SYNOPSIS
    Windows PowerShell teardown script for Job Scraper cloud infrastructure

.DESCRIPTION
    Safely destroys all GCP cloud resources created by the Job Scraper deployment.
    Requires Terraform and gcloud CLI to be installed.

.PARAMETER Provider
    Cloud provider to tear down (currently only 'gcp' is supported)

.PARAMETER Force
    Skip confirmation prompt (dangerous!)

.EXAMPLE
    .\teardown-cloud.ps1 gcp
    Interactively tears down GCP infrastructure

.EXAMPLE
    .\teardown-cloud.ps1 gcp -Force
    Tears down GCP infrastructure without confirmation (use with caution!)
#>

param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet('gcp', 'aws', 'azure')]
    [string]$Provider,

    [switch]$Force
)

# Enable strict error handling
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Colors for output (Windows Terminal and PowerShell 7+)
$Red = if ($PSVersionTable.PSVersion.Major -ge 7) { "`e[31m" } else { "" }
$Green = if ($PSVersionTable.PSVersion.Major -ge 7) { "`e[32m" } else { "" }
$Yellow = if ($PSVersionTable.PSVersion.Major -ge 7) { "`e[33m" } else { "" }
$Cyan = if ($PSVersionTable.PSVersion.Major -ge 7) { "`e[36m" } else { "" }
$Reset = if ($PSVersionTable.PSVersion.Major -ge 7) { "`e[0m" } else { "" }

function Write-ColoredMessage {
    param($Message, $Color = "")
    if ($Color -and $PSVersionTable.PSVersion.Major -ge 7) {
        Write-Host "$Color$Message$Reset"
    } else {
        Write-Host $Message
    }
}

# Check prerequisites
function Test-Prerequisites {
    Write-ColoredMessage "`nChecking prerequisites..." $Cyan

    # Check Terraform
    if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
        Write-ColoredMessage "❌ ERROR: Terraform is not installed!" $Red
        Write-Host ""
        Write-Host "Install Terraform:"
        Write-Host "  1. Download from: https://www.terraform.io/downloads"
        Write-Host "  2. Or use Chocolatey: choco install terraform"
        Write-Host ""
        exit 1
    }
    Write-ColoredMessage "✅ Terraform found" $Green

    # Check gcloud
    if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        Write-ColoredMessage "❌ ERROR: gcloud CLI is not installed!" $Red
        Write-Host ""
        Write-Host "Install gcloud:"
        Write-Host "  1. Download from: https://cloud.google.com/sdk/docs/install"
        Write-Host "  2. Run the installer"
        Write-Host "  3. Restart PowerShell"
        Write-Host ""
        exit 1
    }
    Write-ColoredMessage "✅ gcloud CLI found" $Green

    # Check if authenticated
    $activeAccount = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if (-not $activeAccount) {
        Write-ColoredMessage "❌ ERROR: Not authenticated with Google Cloud!" $Red
        Write-Host ""
        Write-Host "Please run: gcloud auth login"
        Write-Host ""
        exit 1
    }
    Write-ColoredMessage "✅ Authenticated as: $activeAccount" $Green

    # Get current project
    $currentProject = gcloud config get-value project 2>$null
    if (-not $currentProject) {
        Write-ColoredMessage "⚠️  WARNING: No active GCP project set!" $Yellow
        Write-Host ""
        Write-Host "Please run: gcloud config set project PROJECT_ID"
        Write-Host ""
        exit 1
    }
    Write-ColoredMessage "✅ Active project: $currentProject" $Green

    return $currentProject
}

# Main teardown logic
switch ($Provider) {
    'gcp' {
        Write-Host ""
        Write-ColoredMessage "⚠️  WARNING: This will DELETE all cloud resources!" $Yellow
        Write-Host ""
        Write-Host "The following will be PERMANENTLY DELETED:"
        Write-Host "  • Cloud Run Job (job-scraper)"
        Write-Host "  • Storage bucket (all job data)"
        Write-Host "  • Secrets (Slack webhook, user preferences)"
        Write-Host "  • VPC network and connector"
        Write-Host "  • Service accounts"
        Write-Host "  • Budget alerts"
        Write-Host "  • Cloud Scheduler jobs"
        Write-Host ""
        Write-Host "💡 NOTE: The GCP project itself will remain (just empty)."
        Write-Host "   To delete the project too, run after this:"
        Write-Host "   gcloud projects delete PROJECT_ID"
        Write-Host ""

        # Run prerequisite checks
        $currentProject = Test-Prerequisites

        Write-Host ""
        Write-ColoredMessage "📋 Current project: $currentProject" $Cyan
        Write-Host ""

        # Confirmation prompt (unless -Force)
        if (-not $Force) {
            $confirmation = Read-Host "Type 'yes delete everything' to confirm"
            Write-Host ""

            if ($confirmation -ne "yes delete everything") {
                Write-ColoredMessage "❌ Cancelled. Nothing was deleted." $Red
                Write-ColoredMessage "✅ Your cloud resources are safe!" $Green
                exit 0
            }
        } else {
            Write-ColoredMessage "⚠️  FORCE MODE: Skipping confirmation!" $Yellow
            Start-Sleep -Seconds 2
        }

        # Navigate to Terraform directory
        $scriptDir = Split-Path -Parent $PSCommandPath
        $projectRoot = Split-Path -Parent $scriptDir
        $terraformDir = Join-Path $projectRoot "terraform" | Join-Path -ChildPath "gcp"

        if (-not (Test-Path $terraformDir)) {
            Write-ColoredMessage "❌ ERROR: Terraform directory not found!" $Red
            Write-Host "Expected: $terraformDir"
            exit 1
        }

        Write-ColoredMessage "🗑️  Destroying infrastructure..." $Cyan
        Write-Host ""

        Push-Location $terraformDir
        try {
            # Run Terraform destroy
            terraform destroy -auto-approve

            if ($LASTEXITCODE -ne 0) {
                throw "Terraform destroy failed with exit code: $LASTEXITCODE"
            }

            Write-Host ""
            Write-ColoredMessage "✅ Teardown complete!" $Green
            Write-Host ""
            Write-Host "📋 NEXT STEPS:"
            Write-Host "1. Deleted resources will stop incurring costs immediately"
            Write-Host "2. To fully delete the GCP project:"
            Write-Host "   gcloud projects delete $currentProject"
            Write-Host "3. Check remaining projects: gcloud projects list"
            Write-Host ""

        } catch {
            Write-ColoredMessage "❌ ERROR during teardown: $($_.Exception.Message)" $Red
            Write-Host ""
            Write-Host "🔧 TROUBLESHOOTING:"
            Write-Host "1. Check if Terraform state is corrupted:"
            Write-Host "   terraform state list"
            Write-Host ""
            Write-Host "2. Try initializing Terraform again:"
            Write-Host "   terraform init -upgrade"
            Write-Host ""
            Write-Host "3. Manually delete resources in GCP Console:"
            Write-Host "   https://console.cloud.google.com"
            Write-Host ""
            exit 1
        } finally {
            Pop-Location
        }
    }

    'aws' {
        Write-ColoredMessage "❌ ERROR: AWS teardown is not yet implemented!" $Red
        Write-Host ""
        Write-Host "Coming soon! For now, delete resources manually in AWS Console:"
        Write-Host "https://console.aws.amazon.com/"
        exit 1
    }

    'azure' {
        Write-ColoredMessage "❌ ERROR: Azure teardown is not yet implemented!" $Red
        Write-Host ""
        Write-Host "Coming soon! For now, delete resources manually in Azure Portal:"
        Write-Host "https://portal.azure.com/"
        exit 1
    }

    default {
        Write-ColoredMessage "❌ ERROR: Unsupported provider: $Provider" $Red
        exit 1
    }
}
