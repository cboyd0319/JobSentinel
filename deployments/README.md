# Deployments Directory

This directory contains all deployment-related files and infrastructure organized by platform and deployment type.

## Structure

```
deployments/
├── windows/        # Windows-specific deployment files
│   ├── local/      # Local Windows setup and launch scripts
│   └── cloud/      # Windows cloud deployment configurations
├── macOS/          # macOS-specific deployment files
│   ├── local/      # Local macOS setup and launch scripts
│   └── cloud/      # macOS cloud deployment configurations
├── linux/          # Linux-specific deployment files
│   ├── local/      # Local Linux setup and launch scripts
│   └── cloud/      # Linux cloud deployment configurations
└── common/         # Platform-agnostic deployment infrastructure
    ├── cloud/      # Cloud provider abstractions (GCP, AWS, Azure)
    ├── docker/     # Container images and compose files
    └── terraform/  # Infrastructure as Code (IaC)
```

## Platform-Specific Directories

### Windows (`windows/`)
- **local/**: Windows setup scripts, GUI launchers, bootstrap files
  - `setup-windows.bat` - Windows setup launcher
  - `setup-windows.ps1` - Windows setup script
  - `bootstrap.ps1` - Windows bootstrap script
  - `launch-gui.bat` - GUI launcher (batch version)
  - `launch-gui.ps1` - GUI launcher (PowerShell version)
  - `run.ps1` - Windows run script

### macOS (`macOS/`)
- **local/**: macOS setup and launcher scripts
  - `setup-macos.sh` - macOS setup script
  - `launch-gui.sh` - GUI launcher for macOS/Unix

### Linux (`linux/`)
- **local/**: Linux setup and configuration
- **cloud/**: Linux-specific cloud deployments

## Common Infrastructure (`common/`)

### Cloud (`common/cloud/`)
Python package for cloud provider abstractions and utilities:
- `providers/` - Cloud provider implementations (GCP, AWS, Azure)
- `functions/` - Cloud functions (budget alerter, etc.)
- Bootstrap, teardown, and update utilities

**Import Path**: `from deployments.common.cloud.<module>`

### Docker (`common/docker/`)
Container deployment files:
- `Dockerfile` - Production container image
- `docker-compose.mcp.yml` - MCP development environment
- `mcp-sandbox.dockerfile` - MCP testing sandbox
- `README.md` - Docker deployment guide

### Terraform (`common/terraform/`)
Infrastructure as Code:
- `gcp/` - Google Cloud Platform configurations
- `gcp_backend/` - GCP backend state management

## Usage

### Local Development Setup

**Windows:**
```powershell
# From repository root
.\deployments\windows\local\setup-windows.bat
```

**macOS:**
```bash
# From repository root
./deployments/macOS/local/setup-macos.sh
```

### Cloud Deployment

```bash
# Import cloud utilities
from deployments.common.cloud.bootstrap import bootstrap_gcp

# Use Docker
docker build -f deployments/common/docker/Dockerfile -t jobsentinel:latest .

# Use Terraform
cd deployments/common/terraform/gcp
terraform init
terraform apply
```

## Migration Notes

This structure was reorganized from the root-level deployment files to improve organization and maintainability. The previous structure had platform-specific scripts scattered at the root level, making it harder to navigate and maintain.

**Previous locations:**
- Root-level: `setup-windows.bat`, `setup-macos.sh`, `launch-gui.*`, etc.
- Root-level: `cloud/`, `docker/`, `terraform/`

**Current locations:**
- Platform-specific scripts: `deployments/{platform}/local/`
- Common infrastructure: `deployments/common/{cloud,docker,terraform}/`

## Contributing

When adding new deployment configurations:
1. Place platform-specific files in the appropriate `{platform}/local/` or `{platform}/cloud/` directory
2. Place platform-agnostic infrastructure in `common/`
3. Update this README with any new files or usage patterns
4. Update relevant documentation in `/docs/`
