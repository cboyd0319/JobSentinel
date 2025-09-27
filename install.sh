#!/bin/bash

# Job Scraper Universal Installer
# Supports: macOS, Ubuntu/Debian, Windows (via WSL), and cloud deployments
# Usage: curl -fsSL https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/install.sh | bash -s -- [OPTIONS]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Default configuration
INSTALL_DIR="$HOME/job-scraper"
REPO_URL="https://github.com/cboyd0319/job-private-scraper-filter.git"
BRANCH="main"
MODE="local-only"
PLATFORM=""
SKIP_DEPS=false
AI_PROVIDER=""
CLOUD_PROVIDER=""

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}" >&2
    exit 1
}

log_step() {
    echo -e "${PURPLE}🚀 $1${NC}"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --local-only)
                MODE="local-only"
                shift
                ;;
            --ai-enhanced)
                MODE="ai-enhanced"
                AI_PROVIDER="$2"
                shift 2
                ;;
            --cloud-deploy)
                MODE="cloud-deploy"
                CLOUD_PROVIDER="$2"
                shift 2
                ;;
            --platform=*)
                PLATFORM="${1#*=}"
                shift
                ;;
            --install-dir=*)
                INSTALL_DIR="${1#*=}"
                shift
                ;;
            --branch=*)
                BRANCH="${1#*=}"
                shift
                ;;
            --skip-deps)
                SKIP_DEPS=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                ;;
        esac
    done
}

# Show help message
show_help() {
    cat << EOF
Job Scraper Universal Installer

USAGE:
    curl -fsSL https://setup.your-domain.com/install | bash -s -- [OPTIONS]

OPTIONS:
    --local-only              Pure local execution (default)
    --ai-enhanced PROVIDER    Local + AI integration (openai|gemini|anthropic)
    --cloud-deploy PROVIDER   Deploy to cloud (gcp|aws|azure)
    --platform=PLATFORM       Force platform (macos|ubuntu|windows)
    --install-dir=PATH        Installation directory (default: ~/job-scraper)
    --branch=BRANCH           Git branch to use (default: main)
    --skip-deps               Skip dependency installation
    --help, -h                Show this help message

EXAMPLES:
    # Local installation only
    curl -fsSL https://setup.your-domain.com/install | bash

    # With OpenAI integration
    curl -fsSL https://setup.your-domain.com/install | bash -s -- --ai-enhanced openai

    # Deploy to Google Cloud Run
    curl -fsSL https://setup.your-domain.com/install | bash -s -- --cloud-deploy gcp

    # Custom installation directory
    curl -fsSL https://setup.your-domain.com/install | bash -s -- --install-dir /opt/job-scraper

EOF
}

# Detect operating system
detect_platform() {
    if [[ -n "$PLATFORM" ]]; then
        log_info "Using forced platform: $PLATFORM"
        return
    fi

    case "$(uname -s)" in
        Darwin*)
            PLATFORM="macos"
            ;;
        Linux*)
            if [[ -f /etc/os-release ]]; then
                . /etc/os-release
                case "$ID" in
                    ubuntu|debian)
                        PLATFORM="ubuntu"
                        ;;
                    centos|rhel|fedora)
                        PLATFORM="centos"
                        ;;
                    *)
                        PLATFORM="ubuntu"  # Default to ubuntu for other Linux
                        ;;
                esac
            else
                PLATFORM="ubuntu"
            fi
            ;;
        MINGW*|MSYS*)
            PLATFORM="windows"
            ;;
        *)
            log_error "Unsupported operating system: $(uname -s)"
            ;;
    esac
    
    log_success "Detected platform: $PLATFORM"
}

# Check dependencies
check_dependencies() {
    local deps=()
    
    case $PLATFORM in
        macos)
            deps=("git" "python3" "curl")
            ;;
        ubuntu)
            deps=("git" "python3" "python3-pip" "python3-venv" "curl")
            ;;
        centos)
            deps=("git" "python3" "python3-pip" "curl")
            ;;
        windows)
            deps=("git" "python" "curl")
            ;;
    esac

    log_step "Checking dependencies..."
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_warning "$dep is not installed"
            if [[ "$SKIP_DEPS" == "false" ]]; then
                install_dependencies
                break
            else
                log_error "$dep is required but --skip-deps was specified"
            fi
        fi
    done
    log_success "All dependencies are available"
}

# Install dependencies
install_dependencies() {
    log_step "Installing dependencies for $PLATFORM..."
    
    case $PLATFORM in
        macos)
            if ! command -v brew &> /dev/null; then
                log_info "Installing Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            brew install python@3.12 git
            ;;
        ubuntu)
            sudo apt-get update
            sudo apt-get install -y git python3 python3-pip python3-venv curl build-essential
            ;;
        centos)
            sudo dnf install -y git python3 python3-pip curl gcc gcc-c++ make
            ;;
        windows)
            log_error "Automatic dependency installation not supported on Windows. Please install Git and Python manually."
            ;;
    esac
    
    log_success "Dependencies installed"
}

# Clone repository
clone_repository() {
    log_step "Cloning repository..."
    
    if [[ -d "$INSTALL_DIR" ]]; then
        log_warning "Directory $INSTALL_DIR already exists"
        read -p "Remove existing directory? [y/N]: " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            rm -rf "$INSTALL_DIR"
        else
            log_error "Installation aborted"
        fi
    fi
    
    git clone -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    log_success "Repository cloned to $INSTALL_DIR"
}

# Setup Python environment
setup_python_environment() {
    log_step "Setting up Python environment..."
    
    # Create virtual environment
    python3 -m venv .venv
    
    # Activate virtual environment
    source .venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install requirements
    pip install -r requirements.txt
    
    # Install Playwright browsers
    python -m playwright install chromium
    
    log_success "Python environment configured"
}

# Setup configuration files
setup_configuration() {
    log_step "Setting up configuration files..."
    
    # Copy example files
    [[ ! -f .env ]] && cp .env.example .env
    [[ ! -f user_prefs.json ]] && cp user_prefs.example.json user_prefs.json
    
    # Create data directories
    mkdir -p data/logs data/backups
    
    # Configure for different modes
    case $MODE in
        ai-enhanced)
            setup_ai_configuration
            ;;
        cloud-deploy)
            setup_cloud_configuration
            ;;
    esac
    
    log_success "Configuration files created"
}

# Setup AI configuration
setup_ai_configuration() {
    log_info "Configuring AI integration with $AI_PROVIDER..."
    
    # Enable LLM in .env
    sed -i.bak 's/LLM_ENABLED=false/LLM_ENABLED=true/' .env
    
    case $AI_PROVIDER in
        openai)
            echo "OPENAI_API_KEY=your-api-key-here" >> .env
            pip install openai tiktoken
            ;;
        gemini)
            echo "GEMINI_API_KEY=your-api-key-here" >> .env
            pip install google-generativeai
            ;;
        anthropic)
            echo "ANTHROPIC_API_KEY=your-api-key-here" >> .env
            pip install anthropic
            ;;
    esac
    
    log_warning "Please edit .env file and add your $AI_PROVIDER API key"
}

# Setup cloud configuration
setup_cloud_configuration() {
    log_info "Preparing cloud deployment for $CLOUD_PROVIDER..."
    
    # Create cloud-specific configuration
    mkdir -p cloud/
    
    case $CLOUD_PROVIDER in
        gcp)
            create_gcp_config
            ;;
        aws)
            create_aws_config
            ;;
        azure)
            create_azure_config
            ;;
    esac
}

# Create GCP deployment configuration
create_gcp_config() {
    cat > cloud/cloudbuild.yaml << 'EOF'
steps:
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  entrypoint: 'bash'
  args:
  - '-c'
  - |
    gcloud run deploy job-scraper \
      --image gcr.io/$PROJECT_ID/job-scraper \
      --platform managed \
      --region us-central1 \
      --allow-unauthenticated \
      --memory 512Mi \
      --cpu 1 \
      --max-instances 1 \
      --timeout 900s \
      --set-env-vars CI=true
EOF

    cat > cloud/Dockerfile << 'EOF'
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browser
RUN playwright install chromium --with-deps

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p data/logs

# Run the application
CMD ["python", "agent.py", "--mode", "poll"]
EOF

    log_info "Created GCP Cloud Run configuration"
    log_info "Deploy with: gcloud run deploy --source ."
}

# Create AWS deployment configuration
create_aws_config() {
    cat > cloud/lambda-deployment.yaml << 'EOF'
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  JobScraperFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ../
      Handler: lambda_handler.lambda_handler
      Runtime: python3.12
      MemorySize: 512
      Timeout: 900
      Environment:
        Variables:
          CI: 'true'
      Events:
        ScheduleEvent:
          Type: Schedule
          Properties:
            Schedule: rate(15 minutes)
EOF

    # Create Lambda handler
    cat > lambda_handler.py << 'EOF'
import json
import subprocess
import sys

def lambda_handler(event, context):
    try:
        result = subprocess.run([
            sys.executable, 'agent.py', '--mode', 'poll'
        ], capture_output=True, text=True, timeout=870)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Job scraper executed successfully',
                'output': result.stdout
            })
        }
    except subprocess.TimeoutExpired:
        return {
            'statusCode': 408,
            'body': json.dumps({'error': 'Job scraper timeout'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
EOF

    log_info "Created AWS Lambda configuration"
    log_info "Deploy with: sam deploy --guided"
}

# Create Azure deployment configuration  
create_azure_config() {
    cat > cloud/azure-functions.json << 'EOF'
{
    "version": "2.0",
    "functionAppScaleLimit": 1,
    "functions": [
        {
            "name": "job-scraper",
            "bindings": [
                {
                    "name": "timer",
                    "type": "timerTrigger",
                    "direction": "in",
                    "schedule": "0 */15 * * * *"
                }
            ]
        }
    ]
}
EOF

    log_info "Created Azure Functions configuration"
    log_info "Deploy with: func azure functionapp publish <app-name>"
}

# Setup automation
setup_automation() {
    log_step "Setting up automation..."
    
    case $MODE in
        local-only|ai-enhanced)
            setup_local_automation
            ;;
        cloud-deploy)
            log_info "Cloud automation configured in deployment"
            ;;
    esac
}

# Setup local automation (cron/systemd)
setup_local_automation() {
    local agent_path="$(pwd)"
    local python_path="$agent_path/.venv/bin/python"
    
    log_info "Setting up local automation..."
    
    # Create systemd service for Linux
    if [[ "$PLATFORM" == "ubuntu" ]] || [[ "$PLATFORM" == "centos" ]]; then
        create_systemd_service "$agent_path" "$python_path"
    fi
    
    # Show cron instructions
    echo
    log_info "To enable automatic job checking, add these lines to your crontab:"
    log_info "Run: crontab -e"
    echo
    echo "# Job Scraper - Check every 15 minutes"
    echo "*/15 * * * * cd $agent_path && $python_path agent.py --mode poll >> $agent_path/data/logs/cron.log 2>&1"
    echo "# Job Scraper - Daily digest at 9 AM"
    echo "0 9 * * * cd $agent_path && $python_path agent.py --mode digest >> $agent_path/data/logs/cron.log 2>&1"
    echo
}

# Create systemd service (Linux)
create_systemd_service() {
    local agent_path="$1"
    local python_path="$2"
    
    cat > job-scraper.service << EOF
[Unit]
Description=Job Scraper Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$agent_path
ExecStart=$python_path agent.py --mode poll
Restart=on-failure
RestartSec=300

[Install]
WantedBy=multi-user.target
EOF

    log_info "Created systemd service file: job-scraper.service"
    log_info "To install: sudo mv job-scraper.service /etc/systemd/system/"
    log_info "To enable: sudo systemctl enable job-scraper.service"
}

# Run health check
run_health_check() {
    log_step "Running health check..."
    
    source .venv/bin/activate
    export CI=true
    python agent.py --mode health
    
    log_success "Health check completed"
}

# Security recommendations
show_security_recommendations() {
    log_step "Security Recommendations"
    echo
    log_info "🔒 Security Best Practices:"
    echo "  1. Keep your .env file secure (never commit to version control)"
    echo "  2. Use strong, unique passwords for email/Slack webhooks"
    echo "  3. Regularly update dependencies: pip install -r requirements.txt --upgrade"
    echo "  4. Monitor logs for suspicious activity: tail -f data/logs/jobs.log"
    echo "  5. Enable 2FA on all connected services (email, Slack, AI providers)"
    
    if [[ "$MODE" == "cloud-deploy" ]]; then
        echo
        log_info "☁️ Cloud Security:"
        echo "  1. Enable cloud logging and monitoring"
        echo "  2. Use IAM roles instead of API keys where possible"
        echo "  3. Set up billing alerts to avoid unexpected charges"
        echo "  4. Regularly audit cloud permissions"
    fi
}

# Main installation flow
main() {
    echo -e "${CYAN}"
    cat << 'EOF'
    ╔══════════════════════════════════════════════╗
    ║          Job Scraper Universal Installer      ║
    ║                                              ║
    ║  Supports local, AI-enhanced, and cloud      ║
    ║  deployments for personal use                ║
    ╚══════════════════════════════════════════════╝
EOF
    echo -e "${NC}"

    parse_args "$@"
    detect_platform
    check_dependencies
    clone_repository
    setup_python_environment
    setup_configuration
    setup_automation
    run_health_check
    show_security_recommendations
    
    echo
    log_success "Installation completed successfully!"
    echo
    log_info "📍 Installation location: $INSTALL_DIR"
    log_info "🔧 Configuration mode: $MODE"
    log_info "💻 Platform: $PLATFORM"
    echo
    log_info "Next steps:"
    echo "  1. cd $INSTALL_DIR"
    echo "  2. Edit .env and user_prefs.json with your settings"
    echo "  3. Test: source .venv/bin/activate && python agent.py --mode test"
    echo "  4. Set up automation (cron/systemd) as shown above"
    echo
    log_info "Need help? Check the docs/ directory or open an issue on GitHub"
    log_success "Happy job hunting! 🎯"
}

# Run main function with all arguments
main "$@"