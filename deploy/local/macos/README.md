# macOS Local Deployment

Scripts for deploying JobSentinel on macOS machines locally.

## Prerequisites

- macOS 12 (Monterey) or later
- Python 3.11 or 3.12
- Xcode Command Line Tools
- 1GB free disk space

## Quick Start

### Setup

```bash
# Make script executable
chmod +x setup.sh

# Run setup
./setup.sh
```

This will:
1. Check Python installation
2. Create virtual environment
3. Install dependencies
4. Install Playwright browsers
5. Set up configuration
6. Run initial health check

### Launch GUI

After setup, launch the GUI:

```bash
chmod +x launch-gui.sh
./launch-gui.sh
```

## First-Time Installation

If you don't have Python or command line tools:

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew (if needed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python
brew install python@3.12

# Now run setup
./setup.sh
```

## Configuration

Edit configuration at: `../../common/config/user_prefs.json`

Example:
```json
{
  "keywords": ["python", "backend", "api"],
  "locations": ["Remote", "San Francisco"],
  "min_salary": 120000
}
```

## Scheduled Execution

To run JobSentinel automatically on a schedule using `launchd`:

### Create Launch Agent

1. Create file: `~/Library/LaunchAgents/com.jobsentinel.app.plist`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.jobsentinel.app</string>
    <key>ProgramArguments</key>
    <array>
        <string>/path/to/JobSentinel/.venv/bin/python</string>
        <string>-m</string>
        <string>jsa.cli</string>
        <string>run-once</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/path/to/JobSentinel</string>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>9</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/tmp/jobsentinel.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/jobsentinel.err</string>
</dict>
</plist>
```

2. Load the agent:
```bash
launchctl load ~/Library/LaunchAgents/com.jobsentinel.app.plist
```

### Alternative: Using Cron

Edit crontab:
```bash
crontab -e
```

Add line:
```
0 9 * * * cd /path/to/JobSentinel && .venv/bin/python -m jsa.cli run-once >> /tmp/jobsentinel.log 2>&1
```

## Troubleshooting

### "Permission denied"
```bash
chmod +x setup.sh launch-gui.sh
```

### "python3: command not found"
```bash
# Install via Homebrew
brew install python@3.12

# Or download from python.org
open https://www.python.org/downloads/
```

### "xcrun: error: invalid active developer path"
```bash
xcode-select --install
```

### GUI Won't Launch
Check that `launcher_gui.py` exists:
```bash
ls ../../deploy/common/launcher_gui.py
```

### Virtual Environment Issues
```bash
# Remove and recreate
rm -rf ../../.venv
python3 -m venv ../../.venv
source ../../.venv/bin/activate
pip install -e ../../
```

## Scripts in This Directory

| Script | Purpose |
|--------|---------|
| `setup.sh` | Main setup script |
| `launch-gui.sh` | Launch GUI application |

## Tips for macOS

### Run in Background
```bash
# Run and detach from terminal
nohup ./launch-gui.sh > /dev/null 2>&1 &
```

### Check if Running
```bash
ps aux | grep jobsentinel
```

### Stop Running Instance
```bash
pkill -f "jobsentinel"
```

## Support

- [macOS Quick Start Guide](../../../docs/MACOS_QUICK_START.md)
- [macOS Troubleshooting](../../../docs/MACOS_TROUBLESHOOTING.md)
- [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues)

---

**Platform:** macOS 12+ (Monterey, Ventura, Sonoma, Sequoia)  
**Last Updated:** October 14, 2025
