# Repository Organization (v0.5.0)

**Date:** October 11, 2025
**Purpose:** Clean, organized repository structure following best practices

## Changes Made

### Root Directory Cleanup
Moved development and governance files to appropriate subdirectories:

**Before:** 15 files in root (cluttered)
**After:** 8 essential files in root (clean)

### Current Root Structure
```
JobSentinel/
├── .env.example              # Environment variables template
├── .gitignore                # Git ignore patterns
├── CHANGELOG.md              # Version history
├── LICENSE                   # MIT license
├── pyproject.toml            # Python project config
├── README.md                 # Main documentation
├── requirements.txt          # Production dependencies
└── requirements-mcp.txt      # MCP development dependencies
```

## Reorganization Details

### 1. Governance Documents → `docs/governance/`
Moved community and policy documents:
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `SECURITY.md`
- Added `README.md` with governance overview

**Rationale:** Centralizes project governance, reduces root clutter

### 2. Development Tools → `docs/development/`
Moved development configuration:
- `Makefile` (build automation)
- `.editorconfig` (editor settings)
- `.pre-commit-config.yaml` (quality hooks)
- Added `README.md` with tool documentation

**Rationale:** Groups development resources, maintains clean root for production files

### 3. Docker Files → `docker/`
Consolidated container deployment:
- `Dockerfile` (moved from root)
- `docker-compose.mcp.yml` (already present)
- `mcp-sandbox.dockerfile` (already present)
- Added `README.md` with deployment guides

**Rationale:** Standard Docker practice, all container configs in one place

### 4. Documentation Updates
Updated all cross-references:
- `README.md` - Updated links to new locations
- `docs/DOCUMENTATION_INDEX.md` - Complete restructure reflecting v0.5.0
- Created README files in each new subdirectory

## Benefits

### Improved Organization
1. **Clear separation of concerns**
   - Production files (root)
   - Development tools (docs/development/)
   - Governance (docs/governance/)
   - Deployment (docker/)

2. **Easier navigation**
   - New contributors find governance docs in one place
   - Developers find build tools together
   - Deployers find Docker configs consolidated

3. **Standard practices**
   - Follows Python packaging conventions
   - Aligns with Docker best practices
   - Common open-source patterns

### Maintainability
- Easier to locate and update related files
- Clearer purpose for each directory
- Better documentation structure

## Directory Structure (Final)

```
JobSentinel/
├── README.md                    # Main documentation
├── LICENSE                      # MIT license
├── CHANGELOG.md                 # Version history
├── pyproject.toml               # Python project config
├── requirements.txt             # Dependencies
├── .env.example                 # Environment template
├── .gitignore                   # Git ignore
│
├── docs/                        # Documentation
│   ├── DOCUMENTATION_INDEX.md
│   ├── quickstart.md
│   ├── troubleshooting.md
│   ├── ARCHITECTURE.md
│   ├── governance/              # NEW: Project governance
│   │   ├── CODE_OF_CONDUCT.md
│   │   ├── CONTRIBUTING.md
│   │   ├── SECURITY.md
│   │   └── README.md
│   ├── development/             # NEW: Development tools
│   │   ├── Makefile
│   │   ├── .editorconfig
│   │   ├── .pre-commit-config.yaml
│   │   └── README.md
│   └── adr/                     # Architecture decisions
│
├── docker/                      # Container deployment
│   ├── Dockerfile               # MOVED from root
│   ├── docker-compose.mcp.yml
│   ├── mcp-sandbox.dockerfile
│   └── README.md                # NEW
│
├── src/                         # Application code
├── tests/                       # Test suite
├── config/                      # Configuration
├── scripts/                     # Utility scripts
├── sources/                     # Job scrapers
├── matchers/                    # Matching algorithms
├── notify/                      # Notifications
├── utils/                       # Utilities
├── templates/                   # Web UI templates
├── cloud/                       # Cloud configs
└── terraform/                   # Infrastructure as code
```

## Migration Notes

### For Existing Users
1. **No code changes required** - Only file locations changed
2. **Update local clones:** `git pull` will handle file moves
3. **Update any custom scripts** that referenced old file locations:
   - `Dockerfile` → `docker/Dockerfile`
   - `Makefile` → Use via `make` (works from any directory)
   - `.editorconfig` → Automatically detected by editors
   - `.pre-commit-config.yaml` → Already configured in git

### For CI/CD Pipelines
1. **Docker builds:** Update Dockerfile path
   ```bash
   # Old
   docker build -t jobsentinel .
   
   # New
   docker build -f docker/Dockerfile -t jobsentinel .
   ```

2. **Make commands:** Still work from repo root
   ```bash
   make test    # Still works
   make lint    # Still works
   ```

3. **Pre-commit hooks:** No changes needed
   ```bash
   pre-commit run --all-files    # Still works
   ```

## Verification

### File Locations Verified
✅ All governance docs in `docs/governance/`
✅ All development tools in `docs/development/`
✅ All Docker files in `docker/`
✅ All documentation cross-references updated
✅ Root directory contains only essential files

### Functionality Verified
✅ Make commands work from root
✅ Docker builds work with new path
✅ Pre-commit hooks function correctly
✅ Documentation links resolve properly

## Related Documentation

- [README.md](README.md) - Main project documentation
- [docs/DOCUMENTATION_INDEX.md](docs/DOCUMENTATION_INDEX.md) - Complete doc navigation
- [docs/governance/CONTRIBUTING.md](docs/governance/CONTRIBUTING.md) - Contribution guide
- [docker/README.md](docker/README.md) - Container deployment
- [docs/development/README.md](docs/development/README.md) - Development tools

---

**Status:** ✅ Complete
**Version:** 0.5.0
**Date:** October 11, 2025
