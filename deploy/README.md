# JobSentinel Deployment Scripts

This directory contains all deployment scripts and configurations for JobSentinel, organized by deployment type and platform.

## Directory Structure

```
deploy/
├── local/          # Local machine deployments
│   ├── windows/    # Windows-specific scripts
│   ├── macos/      # macOS-specific scripts
│   └── linux/      # Linux-specific scripts
├── cloud/          # Cloud provider deployments
│   ├── common/     # Shared cloud deployment scripts
│   ├── docker/     # Docker containerization
│   ├── aws/        # Amazon Web Services
│   ├── azure/      # Microsoft Azure
│   └── gcp/        # Google Cloud Platform
└── common/         # Shared resources across all deployments
```

## Quick Start

### Local Deployment

**Windows:**
```powershell
cd deploy/local/windows
.\setup.ps1
```

**macOS:**
```bash
cd deploy/local/macos
chmod +x setup.sh
./setup.sh
```

**Linux:**
```bash
cd deploy/local/linux
chmod +x setup.sh
./setup.sh
```

### Cloud Deployment

See specific cloud provider directories for detailed instructions:
- [AWS](cloud/aws/README.md) - Amazon Web Services
- [Azure](cloud/azure/README.md) - Microsoft Azure
- [GCP](cloud/gcp/README.md) - Google Cloud Platform
- [Docker](cloud/docker/README.md) - Container deployments

## Architecture

JobSentinel follows the **12-Factor App** methodology:
- Single codebase (in `src/`)
- Platform-specific deployment scripts (this directory)
- Build once, deploy anywhere

## Documentation

For detailed deployment guides, see:
- [Windows Deployment Guide](../docs/WINDOWS_QUICK_START.md)
- [macOS Deployment Guide](../docs/MACOS_QUICK_START.md)
- [Cloud Deployment Guide](../docs/DEPLOYMENT_GUIDE.md)
- [Docker Guide](cloud/docker/README.md)

## Support

For deployment issues:
1. Check platform-specific README in the relevant directory
2. Review [Troubleshooting Guide](../docs/troubleshooting.md)
3. Open an issue: https://github.com/cboyd0319/JobSentinel/issues

---

**Last Updated:** October 14, 2025  
**Version:** 0.9.0
