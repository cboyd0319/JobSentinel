#!/bin/bash
# Cloud Deployment Orchestrator
# Wrapper script for cloud.bootstrap Python module
#
# This script provides a bash interface to the Python-based cloud deployment system.
# For direct access to all features, use: python3 -m cloud.bootstrap

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default values
CLOUD_PROVIDER="gcp"
DRY_RUN=false
NO_PROMPT=false
LOG_LEVEL="info"

# Help function
show_help() {
    cat << EOF
${CYAN}Cloud Deployment Orchestrator${NC}

${BLUE}USAGE:${NC}
    $0 [OPTIONS] [PROVIDER]

${BLUE}PROVIDERS:${NC}
    gcp     Deploy to Google Cloud Platform (Cloud Run) - ${GREEN}READY${NC}
    aws     Deploy to Amazon Web Services (Lambda) - ${YELLOW}COMING SOON${NC}
    azure   Deploy to Microsoft Azure (Functions) - ${YELLOW}COMING SOON${NC}

${BLUE}OPTIONS:${NC}
    --dry-run           Show what would be deployed (not fully implemented)
    --no-prompt         Run in non-interactive mode
    --log-level LEVEL   Set logging level (debug, info, warning, error)
    --help, -h          Show this help message

${BLUE}EXAMPLES:${NC}
    # Interactive GCP deployment
    $0 gcp

    # Non-interactive deployment
    $0 --no-prompt gcp

    # Debug mode
    $0 --log-level debug gcp

${BLUE}PREREQUISITES:${NC}
    1. Python 3.8+ installed
    2. Git installed
    3. Active Google Cloud account (for GCP)

${BLUE}ADVANCED USAGE:${NC}
    For more control, use the Python module directly:
        python3 -m cloud.bootstrap [--provider gcp] [--no-prompt] [--log-level debug]

${BLUE}DOCUMENTATION:${NC}
    • GCP Guide: terraform/gcp/README.md
    • Refactoring Summary: REFACTORING_SUMMARY.md
    • Future Roadmap: TODO.md

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --no-prompt)
            NO_PROMPT=true
            shift
            ;;
        --log-level)
            LOG_LEVEL="$2"
            shift 2
            ;;
        --help|-h)
            show_help
            exit 0
            ;;
        gcp|aws|azure)
            CLOUD_PROVIDER="$1"
            shift
            ;;
        *)
            echo -e "${RED}Error: Unknown option: $1${NC}" >&2
            show_help
            exit 1
            ;;
    esac
done

# Print banner
echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════╗"
echo "║     Job Scraper Cloud Deployment v2.0.0      ║"
echo "║         Terraform-First Architecture         ║"
echo "╚══════════════════════════════════════════════╝"
echo -e "${NC}"
echo

# Validate provider
if [[ "$CLOUD_PROVIDER" == "aws" ]] || [[ "$CLOUD_PROVIDER" == "azure" ]]; then
    echo -e "${YELLOW}⚠️  $CLOUD_PROVIDER deployment is not yet implemented${NC}"
    echo -e "${BLUE}ℹ️  See TODO.md for AWS/Azure roadmap${NC}"
    echo
    exit 1
fi

# Build Python command
PYTHON_CMD="python3 -m cloud.bootstrap"
PYTHON_CMD="$PYTHON_CMD --provider $CLOUD_PROVIDER"
PYTHON_CMD="$PYTHON_CMD --log-level $LOG_LEVEL"

if [[ "$NO_PROMPT" == "true" ]]; then
    PYTHON_CMD="$PYTHON_CMD --no-prompt"
fi

# Show what we're about to run
echo -e "${BLUE}ℹ️  Deploying to: ${CYAN}$CLOUD_PROVIDER${NC}"
if [[ "$NO_PROMPT" == "true" ]]; then
    echo -e "${BLUE}ℹ️  Mode: ${CYAN}Non-interactive${NC}"
else
    echo -e "${BLUE}ℹ️  Mode: ${CYAN}Interactive${NC}"
fi
echo -e "${BLUE}ℹ️  Log level: ${CYAN}$LOG_LEVEL${NC}"
echo

if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}⚠️  DRY RUN: Would execute:${NC}"
    echo -e "${CYAN}$PYTHON_CMD${NC}"
    echo
    exit 0
fi

# Execute Python bootstrap
echo -e "${GREEN}▶ Starting deployment...${NC}"
echo

# Change to project root
cd "$PROJECT_ROOT"

# Execute the Python module
exec $PYTHON_CMD
