# JobSentinel macOS Local Deployment

Welcome! This directory contains everything you need to deploy JobSentinel on macOS.

## 🚀 Quick Start

### For Non-Technical Users

1. **Double-click** `setup.command` to start the automated setup wizard
2. When macOS asks if you're sure, choose **Open**
3. Follow the prompts - the wizard will guide you through everything
4. After setup completes, **double-click** `launch-gui.command` to start JobSentinel

That's it! No technical knowledge needed.

### For Technical Users

Run the setup script directly:

```bash
chmod +x setup.sh
./setup.sh
```

Or install from the repository root:

```bash
cd /path/to/JobSentinel
./deploy/local/macos/setup.sh
```

## 📁 Files in This Directory

- **`setup.command`** - Double-click friendly setup launcher (recommended)
- **`setup.sh`** - Main setup script (bash)
- **`launch-gui.command`** - Double-click friendly GUI launcher
- **`launch-gui.sh`** - GUI launcher script (bash)
- **`check-python.command`** - Verify Python installation

## ✅ Requirements

- **macOS**: 12+ (Monterey or later)
  - macOS 14+ (Sonoma) recommended for best compatibility
- **Python**: 3.11+ (3.12+ recommended)
  - Install via [Homebrew](https://brew.sh/): `brew install python@3.12`
  - Or download from [python.org](https://www.python.org/downloads/)
- **Disk Space**: At least 1 GB free
- **Internet**: Required for initial setup (to download dependencies)

## 🛠️ What the Setup Does

The automated setup wizard will:

1. ✅ Check your macOS version and system compatibility
2. ✅ Verify Python 3.11+ is installed
3. ✅ Check disk space and internet connectivity
4. ✅ Create an isolated Python virtual environment (`.venv`)
5. ✅ Install all required dependencies
6. ✅ Install Playwright browser (Chromium) for web scraping
7. ✅ Guide you through JobSentinel configuration (keywords, alerts, etc.)
8. ✅ Create desktop shortcuts for easy access
9. ✅ Run a health check to verify everything works

**No admin rights needed!** Everything stays in your user directory.

## 🎮 After Installation

Once setup completes, you'll have desktop shortcuts:

- **Run JobSentinel.command** - Start a job search
- **JobSentinel Dashboard.command** - View jobs in browser
- **Configure JobSentinel.command** - Change settings
- **JobSentinel Launcher.command** - Open the visual control panel
- **JobSentinel Health Check.command** - Verify system status

Or use the command line:

```bash
# Activate the virtual environment
source .venv/bin/activate

# Run a job search
python -m jsa.cli run-once

# Start the web dashboard
python -m jsa.cli web

# Check system health
python -m jsa.cli health

# Update configuration
python -m jsa.cli setup
```

## 🐛 Troubleshooting

### Gatekeeper Blocking `.command` Files

If macOS says the file "cannot be opened because it is from an unidentified developer":

1. **Right-click** (or Control-click) the `.command` file
2. Choose **Open**
3. Click **Open** in the confirmation dialog
4. macOS will remember this for future launches

### Python Not Found

Install Python 3.12 via Homebrew:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install python@3.12
```

Or download the installer from [python.org](https://www.python.org/downloads/).

### Setup Fails Mid-Way

Simply run `setup.command` again - it's safe to rerun and will pick up where it left off.

### Need More Help?

Check the comprehensive troubleshooting guides:

- [`docs/MACOS_QUICK_START.md`](../../../docs/MACOS_QUICK_START.md) - Detailed quick start guide
- [`docs/MACOS_TROUBLESHOOTING.md`](../../../docs/MACOS_TROUBLESHOOTING.md) - Complete troubleshooting guide
- [`docs/MACOS_DEPLOYMENT_CHECKLIST.md`](../../../docs/MACOS_DEPLOYMENT_CHECKLIST.md) - Validation checklist

## 🔒 Security & Privacy

- **100% Local** - All data stays on your Mac
- **100% Private** - No telemetry, tracking, or data sent to third parties
- **No Admin Rights** - Everything runs in your user directory
- **Open Source** - Review the code yourself

## 📚 Additional Documentation

- **Main README**: [`../../../README.md`](../../../README.md)
- **Quick Start**: [`docs/MACOS_QUICK_START.md`](../../../docs/MACOS_QUICK_START.md)
- **Troubleshooting**: [`docs/MACOS_TROUBLESHOOTING.md`](../../../docs/MACOS_TROUBLESHOOTING.md)
- **Deployment Checklist**: [`docs/MACOS_DEPLOYMENT_CHECKLIST.md`](../../../docs/MACOS_DEPLOYMENT_CHECKLIST.md)

## 💡 Tips

- **First Time?** Use the desktop shortcuts - they're the easiest way to get started
- **Power User?** The CLI provides more control and options
- **Team Deployment?** See the deployment checklist for best practices
- **Automation?** Set up Calendar alerts or `launchd` for scheduled runs

## ❓ Support

Need help? Open an issue on GitHub:
https://github.com/cboyd0319/JobSentinel/issues

Happy job hunting! 🎉
