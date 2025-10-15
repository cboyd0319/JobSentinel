# Path Fixes Summary - JobSentinel Deploy Directory

## Overview
Fixed all pathing issues in the deploy directory to align with the new deployment-centric repository structure where code lives under `deploy/common/app/src/`.

## Categories of Fixes

### 1. Launcher Scripts (3 files)
**Issue**: Scripts referenced incorrect path `deploy/common/launcher_gui.py`  
**Fix**: Changed to use module import `python -m jsa.gui_launcher`

**Files Fixed**:
- `deploy/local/windows/launch-gui.ps1`
- `deploy/local/windows/launch-gui.bat`
- `deploy/local/macos/launch-gui.sh`

### 2. Cloud Deployment Scripts (5 files)
**Issue**: Missing sys.path setup to import from utils package  
**Fix**: Added sys.path.insert() to include `deploy/common/app/src`

**Files Fixed**:
- `deploy/cloud/common/utils.py`
- `deploy/cloud/common/providers/gcp/sdk.py`
- `deploy/cloud/common/providers/gcp/teardown.py`
- `deploy/cloud/common/providers/gcp/gcp.py`
- `deploy/cloud/common/providers/gcp/cloud_database.py`

### 3. Example Scripts (12 files)
**Issue**: Incorrect sys.path additions pointing to wrong directories  
**Fix**: Updated sys.path to point to `deploy/common/app/src`

**Files Fixed**:
- `deploy/common/examples/advanced_ml_demo.py`
- `deploy/common/examples/bias_detection_demo.py`
- `deploy/common/examples/demo_advanced_scrapers.py`
- `deploy/common/examples/detection_and_autofix_demo.py`
- `deploy/common/examples/jobspy_demo.py`
- `deploy/common/examples/jobswithgpt_demo.py`
- `deploy/common/examples/ml_and_mcp_demo.py`
- `deploy/common/examples/reed_jobs_demo.py`
- `deploy/common/examples/llm_demo.py`
- `deploy/common/examples/advanced_features_demo.py`
- `deploy/common/examples/automated_workflow.py`
- `deploy/common/examples/custom_scraper.py`
- `deploy/common/examples/enhanced_detection_demo.py`
- `deploy/common/examples/plugin_demo.py`

### 4. Application Files (2 files)
**Issue**: Incorrect path navigation (used 3 or 5 levels when 6 needed)  
**Fix**: Corrected to navigate 6 levels up from jsa directory to repo root

**Files Fixed**:
- `deploy/common/app/src/jsa/setup_wizard.py`
  - Fixed .env path (repo root)
  - Fixed config directory path (deploy/common/config)
- `deploy/common/app/src/jsa/windows_shortcuts.py`
  - Fixed project root path calculation

### 5. Docker Configuration (1 file)
**Issue**: Incorrect path to agent.py in Dockerfile  
**Fix**: Updated to use full path `/app/deploy/common/app/src/agent.py`

**Files Fixed**:
- `deploy/cloud/common/providers/gcp/cloud_run.py`
  - Updated CMD in Dockerfile
  - Updated PYTHONPATH in Docker

### 6. Security & Build Scripts (1 file)
**Issue**: Scanning wrong directory (src/ instead of deploy/common/app/src/)  
**Fix**: Updated Bandit scan path

**Files Fixed**:
- `deploy/common/scripts/security_scan.py`

### 7. Test Files (3 files)
**Issue**: Outdated path assertions for old repository structure  
**Fix**: Updated to new deployment-centric paths

**Files Fixed**:
- `deploy/common/tests/test_deployment_paths.py`
  - Updated launcher path expectations
- `deploy/common/tests/test_macos_deployment.py`
  - Updated module path assertions
- `deploy/common/tests/test_windows_deployment_simulation.py`
  - Updated directory structure checks
  - Updated setup script paths

## Path Navigation Guide

For reference, here's the correct level count from common files:

### From `deploy/common/app/src/jsa/*.py` to repo root:
- File location: `deploy/common/app/src/jsa/file.py`
- Levels up needed: **6**
- Path: `Path(__file__).parent.parent.parent.parent.parent.parent`

### From `deploy/common/app/utils/*.py` to deploy/common:
- File location: `deploy/common/app/utils/file.py`
- Levels up needed: **2** (to reach `deploy/common`)
- Path: `Path(__file__).parent.parent`

### From `deploy/common/examples/*.py` to deploy/common/app/src:
- File location: `deploy/common/examples/file.py`
- Correct sys.path: `str(Path(__file__).parent.parent / "app" / "src")`

## Test Results

All tests pass:
- ✅ 12/12 deployment path tests pass
- ✅ macOS deployment tests pass
- ✅ Windows deployment simulation tests pass
- ✅ Core imports work correctly
- ✅ Example scripts run successfully

## Repository Structure (Current)

```
JobSentinel/
├── deploy/
│   ├── common/
│   │   ├── app/
│   │   │   ├── src/
│   │   │   │   ├── jsa/        # Main application package
│   │   │   │   ├── domains/    # Domain logic
│   │   │   │   ├── notify/     # Notification systems
│   │   │   │   └── matchers/   # Job matching
│   │   │   ├── sources/        # Job board scrapers
│   │   │   ├── models/         # Data models
│   │   │   └── utils/          # Utilities
│   │   ├── config/             # Configuration files
│   │   ├── scripts/            # Setup & utility scripts
│   │   ├── examples/           # Example usage scripts
│   │   ├── tests/              # Test suites
│   │   └── web/                # Web UI
│   ├── local/                  # Local deployment scripts
│   │   ├── windows/
│   │   ├── macos/
│   │   └── linux/
│   └── cloud/                  # Cloud deployment
│       ├── common/
│       ├── gcp/
│       ├── aws/
│       └── azure/
├── docs/                       # Documentation
└── data/                       # Runtime data (SQLite, logs)
```

## Key Principles Applied

1. **No code at repo root** - All code under `deploy/`
2. **Main package in deploy/common/app/src/jsa** - Installable via pip
3. **Consistent import patterns** - Always use proper sys.path setup in standalone scripts
4. **Module imports preferred** - Use `python -m jsa.cli` instead of direct file paths
5. **Path calculations** - Always count levels carefully from file location
