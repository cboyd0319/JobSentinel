## Job Scraper v{VERSION}

<!-- Short note about what's in this release -->

### ✨ What's ---

**Full changelog:** <https://github.com/cboyd0319/job-search-automation/compare/v{PREVIOUS_VERSION}...v{VERSION}>

<!-- Highlight major new features -->
-

### 🔧 Improvements

<!-- List enhancements and optimizations -->
-

### 🐛 Bug Fixes

<!-- List fixed issues -->
-

### Security

<!-- List security-related changes -->
-

### ⚠️ Breaking Changes

<!-- List any breaking changes (for major versions) -->
-

## Install

### Windows (Recommended)

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; irm "https://raw.githubusercontent.com/cboyd0319/job-search-automation/main/setup_windows.ps1" | iex
```

### macOS/Linux (Future Enhancement)

```bash
# Not supported yet - Windows only for now
# Manual Python setup required
git clone https://github.com/cboyd0319/job-search-automation.git
cd job-search-automation
python scripts/zero_knowledge_startup.py
```

### Manual
Download the source code archive below and follow the [installation guide](docs/INSTALLATION.md).

## 🔄 Upgrade Instructions

### From Previous Versions
```bash
cd job-search-automation
git fetch origin
git checkout v{VERSION}
pip install -r requirements.txt --upgrade
python -m playwright install chromium
```

### Configuration Changes
<!-- List any configuration file changes needed -->
-

## Testing

Tested on:
- Python 3.11–3.12
- Windows 11/10 (full support)
- macOS/Ubuntu (manual setup only - future enhancement)

## Notes

<!-- Optional: brief notes, caveats, or follow-ups -->

## Thanks

Thanks to everyone who tried things out and sent fixes or ideas.

## 📚 Documentation

- 📖 [Installation Guide](docs/INSTALLATION.md)
- 🛡️ [Security Policy](SECURITY.md)
- 🤝 [Contributing Guidelines](CONTRIBUTING.md)
- 🚀 [Future Enhancements](docs/FUTURE_ENHANCEMENTS.md)
- 🔄 [Release Process](docs/RELEASE_PROCESS.md)

## 🆘 Support

- 🐛 [Report Issues](https://github.com/cboyd0319/job-search-automation/issues)
- 💬 [Discussions](https://github.com/cboyd0319/job-search-automation/discussions)
- 📧 [Security Reports](SECURITY.md#reporting-a-vulnerability)

---

**Full Changelog**: https://github.com/cboyd0319/job-search-automation/compare/v{PREVIOUS_VERSION}...v{VERSION}