# Cross-Platform Compatibility Guide

**Version:** 0.6.0  
**Last Updated:** October 13, 2025  
**Purpose:** Ensure consistent JobSentinel experience across Windows 11, macOS 15+, and Ubuntu 22.04+

---

## Executive Summary

JobSentinel is designed to work identically across all major platforms. This guide documents platform-specific considerations, installation variations, and common issues.

### Platform Support Matrix

| Platform | Python | Node.js | Status | Notes |
|----------|--------|---------|--------|-------|
| **Windows 11** | ✅ 3.11+ | ✅ 20+ | Fully Supported | WSL2 recommended for best experience |
| **macOS 15+** | ✅ 3.11+ | ✅ 20+ | Fully Supported | Native ARM64 support |
| **Ubuntu 22.04+** | ✅ 3.11+ | ✅ 20+ | Fully Supported | Primary development platform |
| **Ubuntu 20.04** | ⚠️  3.11+ | ✅ 20+ | Supported | Requires Python 3.11 from deadsnakes PPA |
| **macOS 13-14** | ✅ 3.11+ | ✅ 20+ | Supported | Intel and ARM64 |
| **Windows 10** | ⚠️  3.11+ | ✅ 20+ | Limited Support | WSL2 strongly recommended |

---

## Platform-Specific Installation

### Windows 11

#### Option 1: Native Windows (PowerShell)

**Prerequisites:**
```powershell
# Install Python 3.11+ from python.org or Microsoft Store
winget install Python.Python.3.11

# Install Node.js
winget install OpenJS.NodeJS.LTS

# Verify installations
python --version  # Should be 3.11+
node --version    # Should be 20+
```

**Installation:**
```powershell
# Clone repository
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel

# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -e .[dev,resume,ml,llm]
playwright install chromium

# Install frontend
cd frontend
npm install
cd ..

# Copy config
copy config\user_prefs.example.json config\user_prefs.json

# Edit config with your preferences
notepad config\user_prefs.json
```

**Common Issues:**
- **Long Path Issues:** Enable long paths in Windows:
  ```powershell
  New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
    -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
  ```
- **SSL Errors:** Install certificates:
  ```powershell
  pip install --upgrade certifi
  ```
- **Playwright Errors:** Run as administrator:
  ```powershell
  playwright install --with-deps chromium
  ```

#### Option 2: WSL2 (Recommended)

**Setup:**
```bash
# Install WSL2 (PowerShell as admin)
wsl --install

# Restart computer, then open Ubuntu
wsl

# Follow Ubuntu installation instructions below
```

**Advantages:**
- ✅ Better performance for Python/Node.js
- ✅ Identical to production Linux environment
- ✅ No path length limitations
- ✅ Better file permissions handling

**Accessing Files:**
- Windows to WSL: `\\wsl$\Ubuntu\home\username\JobSentinel`
- WSL to Windows: `/mnt/c/Users/username/`

---

### macOS 15+ (Sequoia)

**Prerequisites:**
```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Python 3.11+
brew install python@3.11

# Install Node.js
brew install node@20

# Verify installations
python3 --version  # Should be 3.11+
node --version     # Should be 20+
```

**Installation:**
```bash
# Clone repository
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e .[dev,resume,ml,llm]
playwright install chromium

# Install frontend
cd frontend
npm install
cd ..

# Copy config
cp config/user_prefs.example.json config/user_prefs.json

# Edit config
nano config/user_prefs.json  # or use your preferred editor
```

**macOS-Specific Considerations:**
- **ARM64 (M1/M2/M3):** All dependencies support ARM64 natively
- **Intel:** Fully supported, may be slightly slower than ARM64
- **Certificates:** Run certificate installer:
  ```bash
  /Applications/Python\ 3.11/Install\ Certificates.command
  ```
- **Rosetta 2:** Not required (all packages have native ARM64 builds)

**Common Issues:**
- **Command Line Tools:** Install Xcode Command Line Tools:
  ```bash
  xcode-select --install
  ```
- **SSL Certificate Verify Failed:**
  ```bash
  pip install --upgrade certifi
  /Applications/Python\ 3.11/Install\ Certificates.command
  ```

---

### Ubuntu 22.04+

**Prerequisites:**
```bash
# Update package lists
sudo apt update

# Install Python 3.11+ (included in 22.04+)
sudo apt install python3.11 python3.11-venv python3-pip

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs

# Install build essentials
sudo apt install build-essential git

# Verify installations
python3.11 --version  # Should be 3.11+
node --version        # Should be 20+
```

**Installation:**
```bash
# Clone repository
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel

# Create virtual environment
python3.11 -m venv .venv
source .venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -e .[dev,resume,ml,llm]

# Install Playwright dependencies (requires sudo)
playwright install --with-deps chromium

# Install frontend
cd frontend
npm install
cd ..

# Copy config
cp config/user_prefs.example.json config/user_prefs.json

# Edit config
nano config/user_prefs.json
```

**Ubuntu 20.04 Users:**
```bash
# Add deadsnakes PPA for Python 3.11
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install python3.11 python3.11-venv python3.11-distutils

# Then follow normal installation
```

---

## Common Platform Differences

### File Paths

| Platform | Path Style | Example |
|----------|-----------|---------|
| Windows | Backslash `\` | `C:\Users\username\JobSentinel` |
| macOS | Forward slash `/` | `/Users/username/JobSentinel` |
| Linux | Forward slash `/` | `/home/username/JobSentinel` |

**JobSentinel handles this automatically** via `pathlib.Path` for cross-platform compatibility.

### Environment Variables

**Windows (PowerShell):**
```powershell
$env:DATABASE_URL = "sqlite+aiosqlite:///data/jobs.sqlite"
$env:LOG_LEVEL = "INFO"
```

**macOS/Linux (Bash/Zsh):**
```bash
export DATABASE_URL="sqlite+aiosqlite:///data/jobs.sqlite"
export LOG_LEVEL="INFO"
```

**All Platforms (.env file):**
```bash
# Create .env file (recommended)
echo "DATABASE_URL=sqlite+aiosqlite:///data/jobs.sqlite" >> .env
echo "LOG_LEVEL=INFO" >> .env
```

### Python Command

| Platform | Command | Virtual Environment |
|----------|---------|---------------------|
| Windows | `python` or `py` | `.venv\Scripts\activate` |
| macOS | `python3` | `source .venv/bin/activate` |
| Linux | `python3` | `source .venv/bin/activate` |

### Default Shell

| Platform | Default Shell | Alternative |
|----------|--------------|-------------|
| Windows 11 | PowerShell 7+ | CMD, WSL2 Bash |
| macOS 15+ | Zsh | Bash |
| Ubuntu 22.04+ | Bash | Zsh, Fish |

---

## Database Compatibility

### SQLite (Default)

**All Platforms:** ✅ Identical behavior
- File location: `data/jobs.sqlite` (relative to project root)
- No platform-specific configuration needed
- Performance: Similar across all platforms (SSD-dependent)

### PostgreSQL (Optional)

**All Platforms:** ✅ Identical behavior
- Use connection string in .env file
- No platform-specific differences
- Recommended for cloud deployments only

---

## Performance Considerations

### Python Performance

| Platform | Relative Performance | Notes |
|----------|---------------------|-------|
| **macOS ARM64 (M1/M2/M3)** | 100% | Fastest Python performance |
| **Linux x86_64** | 95% | Excellent performance |
| **macOS Intel** | 90% | Good performance |
| **Windows Native** | 85% | Good performance |
| **WSL2** | 90% | Better than native Windows |

### Node.js/Frontend Build

| Platform | Build Time | Notes |
|----------|-----------|-------|
| **macOS ARM64** | 100% | Fastest (native ARM64) |
| **Linux** | 95% | Very fast |
| **macOS Intel** | 90% | Fast |
| **Windows** | 85% | Slightly slower |
| **WSL2** | 95% | Faster than native Windows |

---

## Testing Across Platforms

### Automated Testing

**Run full test suite on each platform:**
```bash
# Activate virtual environment first
make test      # Run all tests
make lint      # Check code style
make type      # Type checking
make cov       # Coverage report
```

**Expected Results (All Platforms):**
- ✅ All tests pass
- ✅ 85%+ code coverage
- ✅ No linting errors
- ✅ No type errors

### Manual Testing Checklist

- [ ] Installation completes without errors
- [ ] Virtual environment activates correctly
- [ ] Dependencies install successfully
- [ ] Playwright browser installs
- [ ] Config file copied and editable
- [ ] CLI runs: `python -m jsa.cli health`
- [ ] Web UI starts: `python -m jsa.cli web`
- [ ] Frontend builds: `cd frontend && npm run build`
- [ ] Tests pass: `make test`
- [ ] Database created in `data/` directory

---

## CI/CD Matrix

JobSentinel is tested on GitHub Actions across:

```yaml
# .github/workflows/python-qa.yml
os: [ubuntu-latest, windows-latest, macos-latest]
python-version: ['3.11', '3.12', '3.13']
```

**Current Status:** ✅ All platforms passing

---

## Platform-Specific Optimizations

### Windows

**Use PowerShell 7:**
```powershell
winget install Microsoft.PowerShell
```

**Enable Developer Mode:**
- Settings → Privacy & Security → For developers → Developer Mode

### macOS

**Disable Gatekeeper for Playwright:**
```bash
xattr -cr ~/.cache/ms-playwright
```

**Optimize Python Performance:**
```bash
# Use Homebrew Python (faster than system Python)
brew install python@3.11
export PATH="/opt/homebrew/opt/python@3.11/bin:$PATH"
```

### Linux

**Increase inotify limits (for file watching):**
```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

**Install system dependencies (required for some Python packages):**
```bash
sudo apt install -y python3-dev build-essential libpq-dev
```

---

## Troubleshooting by Platform

### Windows-Specific Issues

**Issue:** "python: command not found"
**Solution:**
```powershell
# Add Python to PATH or use full path
$env:Path += ";C:\Users\USERNAME\AppData\Local\Programs\Python\Python311"
```

**Issue:** "Access denied" when installing Playwright
**Solution:**
```powershell
# Run PowerShell as Administrator
playwright install --with-deps chromium
```

### macOS-Specific Issues

**Issue:** "xcrun: error: invalid active developer path"
**Solution:**
```bash
xcode-select --install
```

**Issue:** "SSL: CERTIFICATE_VERIFY_FAILED"
**Solution:**
```bash
pip install --upgrade certifi
/Applications/Python\ 3.11/Install\ Certificates.command
```

### Linux-Specific Issues

**Issue:** Playwright browser won't launch
**Solution:**
```bash
# Install missing dependencies
playwright install-deps chromium
```

**Issue:** Permission denied on `data/` directory
**Solution:**
```bash
chmod -R 755 data/
chown -R $USER:$USER data/
```

---

## Conclusion

JobSentinel is designed for seamless cross-platform operation. Key takeaways:

1. **Python 3.11+** and **Node.js 20+** are the only hard requirements
2. **SQLite** works identically on all platforms
3. **WSL2** is recommended for Windows users
4. **ARM64 macOS** provides best performance
5. **All platforms pass CI/CD tests**

For platform-specific issues not covered here, please file a GitHub issue with:
- Platform and version
- Python version (`python --version`)
- Node.js version (`node --version`)
- Full error message
- Output of `python -m jsa.cli health`
