#!/bin/bash
# Cloud Deployment Configuration Validator
# Validates cloud deployment setup before going live

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global validation status
VALIDATION_PASSED=true
WARNINGS=0
ERRORS=0

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNINGS++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((ERRORS++))
    VALIDATION_PASSED=false
}

# Check if required commands are available
check_prerequisites() {
    log_info "Checking prerequisites..."

    local required_tools=()

    case ${CLOUD_PROVIDER:-gcp} in
        gcp)
            required_tools=("gcloud" "docker")
            ;;
        aws)
            required_tools=("aws" "sam" "docker")
            ;;
        azure)
            required_tools=("az" "func" "docker")
            ;;
    esac

    for tool in "${required_tools[@]}"; do
        if command -v "$tool" >/dev/null 2>&1; then
            log_success "$tool is installed"
        else
            log_error "$tool is required but not installed"
        fi
    done
}

# Validate cloud credentials
check_cloud_auth() {
    log_info "Checking cloud authentication..."

    case ${CLOUD_PROVIDER:-gcp} in
        gcp)
            if gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1 >/dev/null 2>&1; then
                local account=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1)
                log_success "Authenticated with GCP as: $account"

                # Check project is set
                local project=$(gcloud config get-value project 2>/dev/null || echo "")
                if [[ -n "$project" ]]; then
                    log_success "GCP project set: $project"
                else
                    log_error "No GCP project configured. Run: gcloud config set project PROJECT_ID"
                fi
            else
                log_error "Not authenticated with GCP. Run: gcloud auth login"
            fi
            ;;
        aws)
            if aws sts get-caller-identity >/dev/null 2>&1; then
                local account=$(aws sts get-caller-identity --query Account --output text)
                log_success "Authenticated with AWS account: $account"
            else
                log_error "Not authenticated with AWS. Run: aws configure"
            fi
            ;;
        azure)
            if az account show >/dev/null 2>&1; then
                local account=$(az account show --query name --output tsv)
                log_success "Authenticated with Azure: $account"
            else
                log_error "Not authenticated with Azure. Run: az login"
            fi
            ;;
    esac
}

# Check billing setup
check_billing_protections() {
    log_info "Checking billing protections..."

    case ${CLOUD_PROVIDER:-gcp} in
        gcp)
            # Check if billing account is configured
            local billing_account=$(gcloud config get-value billing/account 2>/dev/null || echo "")
            if [[ -n "$billing_account" ]]; then
                log_success "Billing account configured: $billing_account"

                # Check for budgets (this would require more complex API calls)
                log_warning "Manual verification required: Ensure billing alerts are configured at \$5 threshold"
            else
                log_warning "No billing account configured. This may be required for some services."
            fi
            ;;
        aws)
            log_warning "Manual verification required: Ensure AWS Budgets are configured with spending alerts"
            ;;
        azure)
            log_warning "Manual verification required: Ensure Azure spending limits are configured"
            ;;
    esac
}

# Validate environment configuration
check_environment_config() {
    log_info "Checking environment configuration..."

    # Check if .env.example exists
    if [[ -f ".env.example" ]]; then
        log_success ".env.example found"

        # Check if .env exists
        if [[ -f ".env" ]]; then
            log_success ".env configuration file exists"

            # Check for critical environment variables
            source .env 2>/dev/null || true

            if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
                log_success "Slack webhook configured for notifications"
            else
                log_warning "No Slack webhook configured - alerts will not be sent"
            fi

            if [[ -n "${LLM_ENABLED:-}" && "${LLM_ENABLED}" == "true" ]]; then
                if [[ -n "${OPENAI_API_KEY:-}" ]] || [[ -n "${ANTHROPIC_API_KEY:-}" ]] || [[ -n "${GEMINI_API_KEY:-}" ]]; then
                    log_success "AI integration configured"
                else
                    log_warning "LLM_ENABLED=true but no API key found"
                fi
            fi
        else
            log_error ".env file not found. Copy from .env.example and configure"
        fi
    else
        log_error ".env.example not found - repository may be corrupted"
    fi

    # Check user preferences
    if [[ -f "user_prefs.json" ]]; then
        log_success "user_prefs.json configuration exists"

        # Validate JSON syntax
        if python3 -m json.tool user_prefs.json >/dev/null 2>&1; then
            log_success "user_prefs.json has valid JSON syntax"
        else
            log_error "user_prefs.json has invalid JSON syntax"
        fi
    else
        log_error "user_prefs.json not found. Copy from user_prefs.example.json and configure"
    fi
}

# Check Docker configuration for containerized deployments
check_docker_config() {
    log_info "Checking Docker configuration..."

    if command -v docker >/dev/null 2>&1; then
        if docker info >/dev/null 2>&1; then
            log_success "Docker is running and accessible"

            # Check if we can build images
            if docker run --rm hello-world >/dev/null 2>&1; then
                log_success "Docker can run containers"
            else
                log_warning "Docker may have permission issues"
            fi
        else
            log_error "Docker is installed but not running or accessible"
        fi
    else
        log_error "Docker is required for cloud deployments"
    fi
}

# Validate cloud-specific configuration
validate_cloud_config() {
    log_info "Validating cloud-specific configuration..."

    case ${CLOUD_PROVIDER:-gcp} in
        gcp)
            # Check if Cloud Run API is enabled
            if gcloud services list --enabled --filter="name:run.googleapis.com" --format="value(name)" | grep -q "run.googleapis.com"; then
                log_success "Cloud Run API is enabled"
            else
                log_error "Cloud Run API not enabled. Run: gcloud services enable run.googleapis.com"
            fi

            # Check for artifact registry or container registry
            if gcloud services list --enabled --filter="name:artifactregistry.googleapis.com OR name:containerregistry.googleapis.com" --format="value(name)" | grep -q -E "(artifactregistry|containerregistry)"; then
                log_success "Container registry service is enabled"
            else
                log_warning "Consider enabling Artifact Registry: gcloud services enable artifactregistry.googleapis.com"
            fi
            ;;
        aws)
            # Check Lambda service availability
            if aws lambda list-functions >/dev/null 2>&1; then
                log_success "AWS Lambda service is accessible"
            else
                log_error "AWS Lambda service not accessible - check permissions"
            fi

            # Check ECR access if using containers
            if aws ecr describe-repositories >/dev/null 2>&1; then
                log_success "Amazon ECR is accessible"
            else
                log_warning "Amazon ECR may not be accessible - container deployments may fail"
            fi
            ;;
        azure)
            # Check Azure Functions availability
            if az functionapp list >/dev/null 2>&1; then
                log_success "Azure Functions service is accessible"
            else
                log_error "Azure Functions service not accessible - check permissions"
            fi
            ;;
    esac
}

# Test basic functionality
test_application() {
    log_info "Testing application functionality..."

    # Test Python syntax
    if python3 -m py_compile src/agent.py >/dev/null 2>&1; then
        log_success "Main application syntax is valid"
    else
        log_error "Main application has Python syntax errors"
    fi

    # Test health check
    if python3 src/agent.py --mode health >/dev/null 2>&1; then
        log_success "Application health check passes"
    else
        log_warning "Application health check failed - may need configuration"
    fi

    # Test database initialization
    if python3 -c "from src.database import init_db; init_db()" >/dev/null 2>&1; then
        log_success "Database initialization successful"
    else
        log_error "Database initialization failed"
    fi
}

# Generate deployment readiness report
generate_report() {
    echo
    echo "=========================================="
    echo "  CLOUD DEPLOYMENT READINESS REPORT"
    echo "=========================================="
    echo
    echo "Cloud Provider: ${CLOUD_PROVIDER:-gcp}"
    echo "Warnings: $WARNINGS"
    echo "Errors: $ERRORS"
    echo

    if [[ "$VALIDATION_PASSED" == "true" ]]; then
        if [[ $WARNINGS -eq 0 ]]; then
            log_success "🎉 All checks passed! Ready for cloud deployment."
        else
            log_warning "⚠️  Validation passed with $WARNINGS warnings. Review warnings before deploying."
        fi
        echo
        echo "Next steps:"
        echo "1. Run the deployment script: ./cloud/deploy.sh"
        echo "2. Monitor initial deployment for cost and functionality"
        echo "3. Set up monitoring dashboards"
        echo
        return 0
    else
        log_error "❌ Validation failed with $ERRORS errors. Fix errors before deploying."
        echo
        echo "Required actions:"
        echo "1. Address all error messages above"
        echo "2. Re-run this validation script"
        echo "3. Only deploy after all errors are resolved"
        echo
        return 1
    fi
}

# Main execution
main() {
    echo "🔍 Cloud Deployment Configuration Validator"
    echo "==========================================="
    echo

    # Set cloud provider from argument or environment
    CLOUD_PROVIDER=${1:-${CLOUD_PROVIDER:-gcp}}
    echo "Validating for: $CLOUD_PROVIDER"
    echo

    check_prerequisites
    echo
    check_cloud_auth
    echo
    check_billing_protections
    echo
    check_environment_config
    echo
    check_docker_config
    echo
    validate_cloud_config
    echo
    test_application
    echo

    generate_report
}

# Run main function with arguments
main "$@"