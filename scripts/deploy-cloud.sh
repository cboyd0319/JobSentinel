#!/bin/bash
# Enhanced Cloud Deployment Orchestrator
# Provides guided, safe cloud deployment with comprehensive validation

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CLOUD_DIR="$PROJECT_ROOT/cloud"
LOG_FILE="$PROJECT_ROOT/deployment.log"

# Default values
CLOUD_PROVIDER=""
DRY_RUN=false
SKIP_VALIDATION=false
FORCE_DEPLOY=false
DEPLOYMENT_ENV="production"

# Logging function
log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"

    case $level in
        ERROR)
            echo -e "${RED}❌ $message${NC}" >&2
            ;;
        WARN)
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        INFO)
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
        SUCCESS)
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        DEBUG)
            echo -e "${PURPLE}🔍 $message${NC}"
            ;;
    esac
}

# Help function
show_help() {
    cat << EOF
Enhanced Cloud Deployment Orchestrator

USAGE:
    $0 [OPTIONS] PROVIDER

PROVIDERS:
    gcp     Deploy to Google Cloud Platform (Cloud Run)
    aws     Deploy to Amazon Web Services (Lambda)
    azure   Deploy to Microsoft Azure (Functions)

OPTIONS:
    --dry-run                 Show what would be deployed without making changes
    --skip-validation        Skip pre-deployment validation checks
    --force                  Force deployment even if validation fails
    --env ENVIRONMENT        Deployment environment (dev/staging/production)
    --help, -h               Show this help message

EXAMPLES:
    # Interactive deployment to GCP
    $0 gcp

    # Dry run to see what would be deployed
    $0 --dry-run aws

    # Force deployment to development environment
    $0 --force --env dev azure

PREREQUISITES:
    1. Cloud provider CLI tools installed and authenticated
    2. Docker installed and running
    3. Configuration files (.env, user_prefs.json) set up
    4. Billing alerts and cost protections configured

For detailed setup instructions, see: docs/CLOUD_COSTS.md
EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --skip-validation)
                SKIP_VALIDATION=true
                shift
                ;;
            --force)
                FORCE_DEPLOY=true
                shift
                ;;
            --env)
                DEPLOYMENT_ENV="$2"
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
                log ERROR "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    if [[ -z "$CLOUD_PROVIDER" ]]; then
        log ERROR "Cloud provider is required"
        show_help
        exit 1
    fi
}

# Pre-deployment validation
run_validation() {
    if [[ "$SKIP_VALIDATION" == "true" ]]; then
        log WARN "Skipping pre-deployment validation"
        return 0
    fi

    log INFO "Running pre-deployment validation..."

    # Run the validation script
    if [[ -f "$SCRIPT_DIR/validate-cloud-config.sh" ]]; then
        if "$SCRIPT_DIR/validate-cloud-config.sh" "$CLOUD_PROVIDER"; then
            log SUCCESS "Pre-deployment validation passed"
            return 0
        else
            log ERROR "Pre-deployment validation failed"
            if [[ "$FORCE_DEPLOY" == "true" ]]; then
                log WARN "Continuing with deployment due to --force flag"
                return 0
            else
                log ERROR "Use --force to deploy anyway (not recommended)"
                exit 1
            fi
        fi
    else
        log WARN "Validation script not found, proceeding without validation"
    fi
}

# Interactive cost protection confirmation
confirm_cost_protections() {
    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "Dry run mode: skipping cost protection confirmation"
        return 0
    fi

    echo
    echo -e "${RED}🚨 CRITICAL: COST PROTECTION VERIFICATION 🚨${NC}"
    echo -e "${YELLOW}Before deploying to the cloud, you MUST have cost protections in place:${NC}"
    echo
    echo "1. ✅ Billing alerts configured (recommended: \$5 threshold)"
    echo "2. ✅ Spending limits set on your cloud account"
    echo "3. ✅ Resource quotas and limits configured"
    echo "4. ✅ Monitoring and alerting set up"
    echo

    while true; do
        read -p "Have you configured ALL of the above cost protections? [y/N]: " -n 1 -r
        echo
        case $REPLY in
            [Yy])
                log SUCCESS "Cost protections confirmed"
                break
                ;;
            [Nn]|"")
                echo
                log ERROR "Cost protections are REQUIRED before cloud deployment"
                echo "Please set up cost protections and run this script again."
                echo "See docs/CLOUD_COSTS.md for detailed instructions."
                exit 1
                ;;
            *)
                echo "Please answer yes (y) or no (n)."
                ;;
        esac
    done
}

# Generate cloud configuration
generate_config() {
    log INFO "Generating $CLOUD_PROVIDER configuration..."

    mkdir -p "$CLOUD_DIR"

    case $CLOUD_PROVIDER in
        gcp)
            generate_gcp_config
            ;;
        aws)
            generate_aws_config
            ;;
        azure)
            generate_azure_config
            ;;
    esac

    log SUCCESS "Configuration generated in $CLOUD_DIR"
}

# GCP-specific configuration
generate_gcp_config() {
    # Get current project info
    local project_id
    project_id=$(gcloud config get-value project 2>/dev/null || echo "")

    if [[ -z "$project_id" ]]; then
        log ERROR "No GCP project configured. Run: gcloud config set project PROJECT_ID"
        exit 1
    fi

    local region=${GCP_REGION:-us-central1}
    local service_name="job-scraper-${DEPLOYMENT_ENV}"

    cat > "$CLOUD_DIR/gcp-deploy.sh" << EOF
#!/bin/bash
# GCP Cloud Run Deployment Script
# Generated by deploy-cloud.sh

set -euo pipefail

PROJECT_ID="$project_id"
REGION="$region"
SERVICE_NAME="$service_name"

echo "🚀 Deploying to Google Cloud Run..."
echo "Project: \$PROJECT_ID"
echo "Region: \$REGION"
echo "Service: \$SERVICE_NAME"

# Enable required APIs
echo "📋 Enabling required APIs..."
gcloud services enable run.googleapis.com --project=\$PROJECT_ID
gcloud services enable cloudbuild.googleapis.com --project=\$PROJECT_ID

# Deploy to Cloud Run
echo "🔨 Building and deploying..."
gcloud run deploy \$SERVICE_NAME \\
    --source . \\
    --platform managed \\
    --region \$REGION \\
    --project \$PROJECT_ID \\
    --allow-unauthenticated \\
    --memory 512Mi \\
    --cpu 1 \\
    --max-instances 1 \\
    --timeout 900s \\
    --concurrency 1 \\
    --cpu-throttling \\
    --set-env-vars "DEPLOYMENT_ENV=$DEPLOYMENT_ENV,CLOUD_PROVIDER=gcp"

# Get service URL
SERVICE_URL=\$(gcloud run services describe \$SERVICE_NAME --region=\$REGION --format="value(status.url)")

echo "✅ Deployment complete!"
echo "Service URL: \$SERVICE_URL"
echo "Logs: gcloud logs tail \$SERVICE_NAME --region=\$REGION"
EOF

    # Create Cloud Build configuration
    cat > "$CLOUD_DIR/cloudbuild.yaml" << EOF
steps:
  # Install dependencies
  - name: 'python:3.12-slim'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        pip install -r requirements.txt
        python -m py_compile src/agent.py

  # Build and deploy
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - '$service_name'
      - '--source=.'
      - '--platform=managed'
      - '--region=$region'
      - '--allow-unauthenticated'
      - '--memory=512Mi'
      - '--cpu=1'
      - '--max-instances=1'
      - '--timeout=900s'

timeout: '1200s'
EOF

    chmod +x "$CLOUD_DIR/gcp-deploy.sh"
}

# AWS-specific configuration
generate_aws_config() {
    local function_name="job-scraper-${DEPLOYMENT_ENV}"
    local region=${AWS_REGION:-us-east-1}

    cat > "$CLOUD_DIR/aws-deploy.sh" << EOF
#!/bin/bash
# AWS Lambda Deployment Script
# Generated by deploy-cloud.sh

set -euo pipefail

FUNCTION_NAME="$function_name"
REGION="$region"

echo "🚀 Deploying to AWS Lambda..."
echo "Function: \$FUNCTION_NAME"
echo "Region: \$REGION"

# Create deployment package
echo "📦 Creating deployment package..."
zip -r function.zip . -x "*.git*" "*.venv*" "cloud/*" "*.log"

# Create or update Lambda function
if aws lambda get-function --function-name \$FUNCTION_NAME --region \$REGION >/dev/null 2>&1; then
    echo "📝 Updating existing function..."
    aws lambda update-function-code \\
        --function-name \$FUNCTION_NAME \\
        --zip-file fileb://function.zip \\
        --region \$REGION
else
    echo "🆕 Creating new function..."
    aws lambda create-function \\
        --function-name \$FUNCTION_NAME \\
        --runtime python3.12 \\
        --role arn:aws:iam::\$(aws sts get-caller-identity --query Account --output text):role/lambda-execution-role \\
        --handler lambda_handler.lambda_handler \\
        --zip-file fileb://function.zip \\
        --timeout 900 \\
        --memory-size 512 \\
        --region \$REGION \\
        --environment Variables="{DEPLOYMENT_ENV=$DEPLOYMENT_ENV,CLOUD_PROVIDER=aws}"
fi

# Set up CloudWatch Events rule for scheduling
aws events put-rule \\
    --name "\$FUNCTION_NAME-schedule" \\
    --schedule-expression "rate(15 minutes)" \\
    --region \$REGION

# Add permission for CloudWatch Events to invoke Lambda
aws lambda add-permission \\
    --function-name \$FUNCTION_NAME \\
    --statement-id "allow-cloudwatch-events" \\
    --action "lambda:InvokeFunction" \\
    --principal events.amazonaws.com \\
    --source-arn "arn:aws:events:\$REGION:\$(aws sts get-caller-identity --query Account --output text):rule/\$FUNCTION_NAME-schedule" \\
    --region \$REGION || true

# Create target for the rule
aws events put-targets \\
    --rule "\$FUNCTION_NAME-schedule" \\
    --targets "Id"="1","Arn"="arn:aws:lambda:\$REGION:\$(aws sts get-caller-identity --query Account --output text):function:\$FUNCTION_NAME" \\
    --region \$REGION

echo "✅ Deployment complete!"
echo "Function ARN: arn:aws:lambda:\$REGION:\$(aws sts get-caller-identity --query Account --output text):function:\$FUNCTION_NAME"
echo "Logs: aws logs tail /aws/lambda/\$FUNCTION_NAME --region=\$REGION"

# Clean up
rm -f function.zip
EOF

    chmod +x "$CLOUD_DIR/aws-deploy.sh"
}

# Azure-specific configuration
generate_azure_config() {
    local function_app="job-scraper-${DEPLOYMENT_ENV}"
    local resource_group="job-scraper-rg"
    local storage_account="jobscraper${DEPLOYMENT_ENV}$(date +%s | tail -c 6)"

    cat > "$CLOUD_DIR/azure-deploy.sh" << EOF
#!/bin/bash
# Azure Functions Deployment Script
# Generated by deploy-cloud.sh

set -euo pipefail

FUNCTION_APP="$function_app"
RESOURCE_GROUP="$resource_group"
STORAGE_ACCOUNT="$storage_account"
LOCATION="\${AZURE_LOCATION:-eastus}"

echo "🚀 Deploying to Azure Functions..."
echo "Function App: \$FUNCTION_APP"
echo "Resource Group: \$RESOURCE_GROUP"
echo "Location: \$LOCATION"

# Create resource group
echo "📋 Creating resource group..."
az group create --name \$RESOURCE_GROUP --location \$LOCATION

# Create storage account
echo "💾 Creating storage account..."
az storage account create \\
    --name \$STORAGE_ACCOUNT \\
    --resource-group \$RESOURCE_GROUP \\
    --location \$LOCATION \\
    --sku Standard_LRS

# Create function app
echo "🔧 Creating function app..."
az functionapp create \\
    --name \$FUNCTION_APP \\
    --resource-group \$RESOURCE_GROUP \\
    --storage-account \$STORAGE_ACCOUNT \\
    --consumption-plan-location \$LOCATION \\
    --runtime python \\
    --runtime-version 3.12 \\
    --functions-version 4

# Deploy code
echo "📤 Deploying code..."
func azure functionapp publish \$FUNCTION_APP --python

# Set app settings
echo "⚙️  Configuring app settings..."
az functionapp config appsettings set \\
    --name \$FUNCTION_APP \\
    --resource-group \$RESOURCE_GROUP \\
    --settings "DEPLOYMENT_ENV=$DEPLOYMENT_ENV" "CLOUD_PROVIDER=azure"

echo "✅ Deployment complete!"
echo "Function App URL: https://\$FUNCTION_APP.azurewebsites.net"
echo "Logs: az webapp log tail --name \$FUNCTION_APP --resource-group \$RESOURCE_GROUP"
EOF

    chmod +x "$CLOUD_DIR/azure-deploy.sh"
}

# Execute deployment
execute_deployment() {
    local deploy_script="$CLOUD_DIR/${CLOUD_PROVIDER}-deploy.sh"

    if [[ ! -f "$deploy_script" ]]; then
        log ERROR "Deployment script not found: $deploy_script"
        exit 1
    fi

    if [[ "$DRY_RUN" == "true" ]]; then
        log INFO "DRY RUN: Would execute deployment script: $deploy_script"
        log INFO "DRY RUN: Review generated configuration in: $CLOUD_DIR"
        return 0
    fi

    log INFO "Executing deployment to $CLOUD_PROVIDER..."
    log INFO "Deployment script: $deploy_script"

    # Change to project root for deployment
    cd "$PROJECT_ROOT"

    # Execute the deployment script
    if bash "$deploy_script"; then
        log SUCCESS "Deployment to $CLOUD_PROVIDER completed successfully!"

        # Set up cost monitoring
        setup_cost_monitoring

        # Final instructions
        show_post_deployment_info
    else
        log ERROR "Deployment failed. Check logs for details."
        exit 1
    fi
}

# Set up cost monitoring
setup_cost_monitoring() {
    log INFO "Setting up cost monitoring..."

    # Create cost monitoring cron job
    local cron_script="$SCRIPT_DIR/enhanced-cost-monitor.py"

    if [[ -f "$cron_script" ]]; then
        # Add to crontab (run every hour)
        local cron_entry="0 * * * * cd '$PROJECT_ROOT' && '$cron_script' --provider '$CLOUD_PROVIDER' --check"

        if [[ "$DRY_RUN" == "false" ]]; then
            (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
            log SUCCESS "Cost monitoring cron job added"
        else
            log INFO "DRY RUN: Would add cron job: $cron_entry"
        fi
    else
        log WARN "Cost monitoring script not found: $cron_script"
    fi
}

# Show post-deployment information
show_post_deployment_info() {
    echo
    echo -e "${GREEN}🎉 DEPLOYMENT SUCCESSFUL! 🎉${NC}"
    echo
    echo -e "${CYAN}Next Steps:${NC}"
    echo "1. 📊 Monitor costs in your cloud provider console"
    echo "2. 🔍 Check application logs for any issues"
    echo "3. 📧 Verify notification alerts are working"
    echo "4. ⚙️  Adjust scheduling if needed (currently every 15 minutes)"
    echo
    echo -e "${CYAN}Monitoring Commands:${NC}"

    case $CLOUD_PROVIDER in
        gcp)
            echo "• View logs: gcloud logs tail job-scraper-${DEPLOYMENT_ENV}"
            echo "• Check costs: gcloud billing budgets list"
            ;;
        aws)
            echo "• View logs: aws logs tail /aws/lambda/job-scraper-${DEPLOYMENT_ENV}"
            echo "• Check costs: aws ce get-cost-and-usage"
            ;;
        azure)
            echo "• View logs: az webapp log tail --name job-scraper-${DEPLOYMENT_ENV}"
            echo "• Check costs: az consumption usage list"
            ;;
    esac

    echo
    echo "• Monitor costs locally: $SCRIPT_DIR/enhanced-cost-monitor.py --provider $CLOUD_PROVIDER --report"
    echo
    echo -e "${YELLOW}Important:${NC} Keep monitoring costs closely for the first few days!"
}

# Main execution
main() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════╗"
    echo "║        Enhanced Cloud Deployment             ║"
    echo "║              Orchestrator                    ║"
    echo "╚══════════════════════════════════════════════╝"
    echo -e "${NC}"

    # Initialize log file
    echo "Deployment started at $(date)" > "$LOG_FILE"

    parse_args "$@"

    log INFO "Starting deployment to $CLOUD_PROVIDER (env: $DEPLOYMENT_ENV)"
    log DEBUG "Dry run: $DRY_RUN, Skip validation: $SKIP_VALIDATION, Force: $FORCE_DEPLOY"

    run_validation
    confirm_cost_protections
    generate_config
    execute_deployment

    log SUCCESS "Deployment orchestration completed!"
}

# Execute main function with all arguments
main "$@"