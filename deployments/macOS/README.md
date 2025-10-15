# macOS Deployment

macOS-specific deployment files and configurations.

## Local Development (`local/`)

Scripts for setting up and running JobSentinel on macOS:

### Setup Scripts
- **`setup-macos.sh`** - Automated setup script for macOS 15+ (Sequoia or later)

### GUI Launchers
- **`launch-gui.sh`** - Shell script to launch the JobSentinel GUI

### Usage

**First-time setup:**
```bash
cd /path/to/JobSentinel
chmod +x deployments/macOS/local/setup-macos.sh
./deployments/macOS/local/setup-macos.sh
```

**Launch GUI:**
```bash
./deployments/macOS/local/launch-gui.sh
```

Or double-click the script in Finder (may need to right-click → Open to bypass Gatekeeper).

### Requirements
- macOS 15+ (Sequoia or later)
- Python 3.12+
- Bash 3.2+ or Zsh 5.0+ (default on modern macOS)
- No admin rights needed

## Cloud Deployment (`cloud/`)

macOS-specific cloud deployment configurations (if needed in the future).

## Documentation

For detailed macOS deployment guides, see:
- `/docs/MACOS_QUICK_START.md`
- `/docs/MACOS_DEPLOYMENT_CHECKLIST.md`
- `/docs/MACOS_TROUBLESHOOTING.md`
