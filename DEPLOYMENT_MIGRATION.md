# Deployment Folder Migration Guide

## Overview

The deployment files have been reorganized from a flat structure at the repository root into a hierarchical, platform-organized structure under the `deployments/` directory.

## What Changed

### Old Structure
```
JobSentinel/
├── setup-windows.bat
├── setup-windows.ps1
├── bootstrap.ps1
├── setup-macos.sh
├── launch-gui.bat
├── launch-gui.ps1
├── launch-gui.sh
├── run.ps1
├── cloud/
├── docker/
└── terraform/
```

### New Structure
```
JobSentinel/
└── deployments/
    ├── windows/
    │   ├── local/
    │   │   ├── setup-windows.bat
    │   │   ├── setup-windows.ps1
    │   │   ├── bootstrap.ps1
    │   │   ├── launch-gui.bat
    │   │   ├── launch-gui.ps1
    │   │   └── run.ps1
    │   └── cloud/
    ├── macOS/
    │   ├── local/
    │   │   ├── setup-macos.sh
    │   │   └── launch-gui.sh
    │   └── cloud/
    ├── linux/
    │   ├── local/
    │   └── cloud/
    └── common/
        ├── cloud/         (was: cloud/)
        ├── docker/        (was: docker/)
        └── terraform/     (was: terraform/)
```

## File Mappings

| Old Location | New Location |
|--------------|--------------|
| `setup-windows.bat` | `deployments/windows/local/setup-windows.bat` |
| `setup-windows.ps1` | `deployments/windows/local/setup-windows.ps1` |
| `bootstrap.ps1` | `deployments/windows/local/bootstrap.ps1` |
| `launch-gui.bat` | `deployments/windows/local/launch-gui.bat` |
| `launch-gui.ps1` | `deployments/windows/local/launch-gui.ps1` |
| `run.ps1` | `deployments/windows/local/run.ps1` |
| `setup-macos.sh` | `deployments/macOS/local/setup-macos.sh` |
| `launch-gui.sh` | `deployments/macOS/local/launch-gui.sh` |
| `cloud/` | `deployments/common/cloud/` |
| `docker/` | `deployments/common/docker/` |
| `terraform/` | `deployments/common/terraform/` |

## Python Import Changes

The `cloud/` package has been moved to `deployments/common/cloud/` and all imports have been updated:

### Old Import Paths
```python
from cloud.providers.gcp.cloud_database import init_cloud_db
from cloud.providers.gcp.gcp import GCPBootstrap
```

### New Import Paths
```python
from deployments.common.cloud.providers.gcp.cloud_database import init_cloud_db
from deployments.common.cloud.providers.gcp.gcp import GCPBootstrap
```

## Updated Files

### Python Code
- `src/agent.py` - Updated cloud database import
- `src/unified_database.py` - Updated cloud database import
- All files in `deployments/common/cloud/` - Updated internal imports

### Documentation
- `README.md` - Updated setup script paths
- `WINDOWS_GUI_README.txt` - Updated launcher paths
- `docs/DEPLOYMENT_GUIDE.md` - Updated Docker and cloud paths
- `docs/BEST_PRACTICES.md` - Updated Docker path
- `docs/WINDOWS_QUICK_START.md` - Updated Windows script paths
- `docs/WINDOWS_TROUBLESHOOTING.md` - Updated Windows script paths
- `docs/WINDOWS_DEPLOYMENT_CHECKLIST.md` - Updated Windows script paths
- `docs/WINDOWS_SECURITY.md` - Updated Windows script paths
- `docs/MACOS_QUICK_START.md` - Updated macOS script paths
- `docs/MACOS_DEPLOYMENT_CHECKLIST.md` - Updated macOS script paths
- `docs/MACOS_TROUBLESHOOTING.md` - Updated macOS script paths
- `docs/macos_local.md` - Updated macOS script paths
- `docs/troubleshooting.md` - Updated script paths
- `docs/UI_IMPROVEMENTS_SUMMARY.md` - Updated launcher paths
- `docs/UI_QUICK_REFERENCE.md` - Updated launcher paths

### New Documentation
- `deployments/README.md` - Main deployment directory overview
- `deployments/windows/README.md` - Windows deployment guide
- `deployments/macOS/README.md` - macOS deployment guide
- `deployments/linux/README.md` - Linux deployment guide

## Migration Checklist

If you're updating an existing clone:

- [ ] Pull the latest changes: `git pull origin main`
- [ ] Update any custom scripts that reference old paths
- [ ] Update any custom documentation that references old paths
- [ ] If you have shortcuts, update them to new script locations
- [ ] If you use CI/CD, update deployment paths

## Testing

All changes have been tested:
- ✅ Python imports work correctly
- ✅ 90 unit tests pass
- ✅ No new linting errors introduced
- ✅ Documentation references updated

## Benefits of New Structure

1. **Better Organization**: Platform-specific files are clearly separated
2. **Scalability**: Easy to add platform-specific cloud deployments
3. **Clarity**: Local vs cloud deployments are distinguished
4. **Maintainability**: Common infrastructure is centralized
5. **Discoverability**: Easier to find relevant deployment files

## Backward Compatibility

⚠️ **Breaking Change**: This is a breaking change for:
- Scripts or tools that hardcode old file paths
- CI/CD pipelines that reference old paths
- Documentation or guides not in this repository

The changes are tracked in git, so you can always reference old file locations through git history.

## Future Enhancements

The new structure supports future additions:
- Platform-specific cloud deployments (e.g., `windows/cloud/`, `macOS/cloud/`)
- Linux-specific setup scripts in `linux/local/`
- Additional common infrastructure in `common/`

## Questions?

If you encounter issues with the new structure:
1. Check this migration guide
2. Check `deployments/README.md` for structure overview
3. Check platform-specific READMEs (`deployments/{platform}/README.md`)
4. Open an issue: https://github.com/cboyd0319/JobSentinel/issues

---

**Migration completed**: 2025-10-15  
**Affects version**: 0.9.0+
