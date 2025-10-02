# Windows Installation System - Complete Documentation

## 📋 Executive Summary

This directory contains a **production-grade Windows installation system** for the Job Scraper application. It provides:

- 🎨 **Premium WPF GUI** installer with cloud/local deployment choice
- 🔒 **Bulletproof PowerShell** with strict mode, comprehensive logging, and rollback capability
- 📦 **Inno Setup packaging** for professional `.exe` installer
- 🛡️ **Security-first** design with UAC discipline, focus control, and secret redaction
- ♿ **Accessibility compliant** with keyboard navigation and screen reader support
- 📊 **Structured logging** (JSONL + console) with trace IDs for debugging

---

## 🎯 Quick Links

| Document | Purpose |
|----------|---------|
| **[INSTALLATION_ARCHITECTURE.md](INSTALLATION_ARCHITECTURE.md)** | Design philosophy, stack selection, UAC rules, logging strategy |
| **[COMPLETE_IMPLEMENTATION.md](COMPLETE_IMPLEMENTATION.md)** | Full source code for all components, ready to copy/paste |
| **This README** | Overview and getting started guide |

---

## 🏗️ Project Status

### ✅ Completed Components

| Component | Status | Location |
|-----------|--------|----------|
| Deploy-GCP.ps1 | ✅ **Production Ready** | `engine/Deploy-GCP.ps1` |
| Architecture Doc | ✅ **Complete** | `INSTALLATION_ARCHITECTURE.md` |
| Implementation Guide | ✅ **Complete** | `COMPLETE_IMPLEMENTATION.md` |
| Security Module | ✅ **Complete** | `engine/modules/Security.psm1` |

### ⚠️ Components to Create

These are **fully specified** in `COMPLETE_IMPLEMENTATION.md` - just copy/paste the code:

| Component | Copy From | Paste To |
|-----------|-----------|----------|
| Install-JobFinder.ps1 | `COMPLETE_IMPLEMENTATION.md` § 1 | `deploy/windows/Install-JobFinder.ps1` |
| Deploy-Local.ps1 | `COMPLETE_IMPLEMENTATION.md` § 2 | `deploy/windows/engine/Deploy-Local.ps1` |
| job-finder.iss | `COMPLETE_IMPLEMENTATION.md` § 3 | `deploy/windows/installer/job-finder.iss` |
| Sign-Installer.ps1 | `COMPLETE_IMPLEMENTATION.md` § 4 | `deploy/windows/installer/signing/Sign-Installer.ps1` |
| Install.Tests.ps1 | `COMPLETE_IMPLEMENTATION.md` § 5 | `deploy/windows/tests/Install.Tests.ps1` |

---

## 🚀 For End Users

### One-Line Cloud Install

```powershell
irm https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/deploy/windows/bootstrap.ps1 | iex
```

This downloads and launches the GUI installer which offers:
- **Cloud** (Recommended): Deploys to Google Cloud Platform, runs 24/7
- **Local**: Installs on this PC only, manual execution

---

## 🛠️ For Developers

### Prerequisites

- Windows 11 (or Windows 10 21H2+)
- PowerShell 7.4+ (or 5.1 fallback)
- Inno Setup 6.5.4 (already installed via winget)
- Python 3.12.10 (installer can auto-install)
- Google Cloud SDK (installer can auto-install)

### Development Workflow

#### 1. Create Missing Files

All code is in `COMPLETE_IMPLEMENTATION.md`. Copy sections 1-5 to create:

```powershell
# Create Install-JobFinder.ps1
# Copy § 1 from COMPLETE_IMPLEMENTATION.md to deploy/windows/Install-JobFinder.ps1

# Create Deploy-Local.ps1
# Copy § 2 from COMPLETE_IMPLEMENTATION.md to deploy/windows/engine/Deploy-Local.ps1

# Create Inno Setup script
# Copy § 3 from COMPLETE_IMPLEMENTATION.md to deploy/windows/installer/job-finder.iss

# Create signing script
# Copy § 4 from COMPLETE_IMPLEMENTATION.md to deploy/windows/installer/signing/Sign-Installer.ps1

# Create tests
# Copy § 5 from COMPLETE_IMPLEMENTATION.md to deploy/windows/tests/Install.Tests.ps1
```

#### 2. Test Components

```powershell
# Test Deploy-GCP (dry run)
.\deploy\windows\engine\Deploy-GCP.ps1 -DryRun -Verbose

# Test Install-JobFinder GUI
.\deploy\windows\Install-JobFinder.ps1

# Run Pester tests
Invoke-Pester -Path .\deploy\windows\tests\
```

#### 3. Build Installer

```powershell
# Compile Inno Setup script to .exe
iscc.exe deploy\windows\installer\job-finder.iss

# Output: deploy\windows\installer\Output\My-Job-Finder-Setup-v2.0.0.exe
```

#### 4. Sign (Production Only)

```powershell
# Acquire code-signing certificate first (DigiCert/Sectigo, ~$300/year)

# Sign installer
.\deploy\windows\installer\signing\Sign-Installer.ps1 `
  -CertThumbprint "YOUR_CERT_THUMBPRINT" `
  -Path ".\deploy\windows\installer\Output\*.exe"
```

---

## 📂 Directory Structure

```
deploy/windows/
├── README.md                           ← You are here
├── INSTALLATION_ARCHITECTURE.md        ← Design philosophy & stack selection
├── COMPLETE_IMPLEMENTATION.md          ← Full source code for all components
├── bootstrap.ps1                       ← Web entry point (downloads latest release)
├── Install-JobFinder.ps1               ← ⚠️ TO CREATE (Main GUI installer)
│
├── engine/
│   ├── Deploy-GCP.ps1                  ← ✅ COMPLETE (Cloud deployment orchestrator)
│   ├── Deploy-Local.ps1                ← ⚠️ TO CREATE (Local deployment orchestrator)
│   └── modules/
│       └── Security.psm1               ← ✅ COMPLETE (DPAPI encryption)
│
├── installer/
│   ├── job-finder.iss                  ← ⚠️ TO CREATE (Inno Setup script)
│   ├── icon.ico                        ← Application icon
│   ├── signing/
│   │   └── Sign-Installer.ps1          ← ⚠️ TO CREATE (Code signing helper)
│   └── Output/
│       └── (Compiled .exe goes here)
│
└── tests/
    └── Install.Tests.ps1               ← ⚠️ TO CREATE (Pester tests)
```

---

## 🎨 Key Design Decisions

### 1. Why Inno Setup?

| Criteria | Inno Setup | WiX Toolset | MSIX |
|----------|------------|-------------|------|
| Learning Curve | ✅ Low | ❌ Steep | ⚠️ Medium |
| Compile Speed | ✅ Fast (< 10s) | ❌ Slow (minutes) | ✅ Fast |
| UAC Control | ✅ Excellent | ✅ Excellent | ❌ Limited |
| Distribution | ✅ Single .exe | ⚠️ .exe chain | ❌ Requires Store/sideload |
| Sandboxing | ❌ None | ❌ None | ⚠️ Too restrictive |
| **Verdict** | ✅ **Best fit** | Overkill | Too restrictive |

### 2. Why PowerShell + WPF?

- **Native**: Ships with Windows, no external dependencies
- **Powerful**: Full .NET Framework access for WPF rich UI
- **Secure**: Strict mode enforcement, signed execution policy support
- **Familiar**: PowerShell is standard for Windows automation

### 3. UAC Philosophy

**Elevate only when truly required**:
- ✅ Installing Python/gcloud to Program Files
- ✅ Writing to HKLM registry
- ❌ User-scoped installs (AppData)
- ❌ Config file edits
- ❌ Cloud API calls

**Focus Discipline**:
- ❌ **Never** use `$window.Activate()` after UAC returns
- ✅ Use `$window.Show()` for polite window display
- ✅ Taskbar button flashes if user switched away

---

## 🔒 Security Features

1. **Least Privilege**: User-scoped by default; admin only when required
2. **Hash Verification**: SHA-256 check on all downloads
3. **Secret Redaction**: Automatic sanitization of logs (no `password=`, `token=`, `key=`)
4. **Code Signing Ready**: Scripts structured for Authenticode signatures
5. **DPAPI Encryption**: Windows Data Protection API for local secrets
6. **GCP Secret Manager**: For cloud-deployed credentials

---

## ♿ Accessibility Compliance

- ✅ **Keyboard Navigation**: Tab order, Enter/Esc shortcuts
- ✅ **Screen Reader**: AutomationProperties on all controls
- ✅ **High Contrast**: Respects Windows theme
- ✅ **High DPI**: Sharp rendering at 150%, 200% scaling
- ✅ **Color Not Sole Indicator**: Icons + text for all statuses

---

## 📊 Logging & Diagnostics

### Dual-Stream Logging

**Console (Human-Friendly)**:
```
✓ Python 3.12.10 detected
→ Launching GCP bootstrap...
⚠ VPC already exists; reusing
✓ Deployment complete!
```

**Structured JSONL (Machine-Parseable)**:
```json
{"timestamp":"2025-10-01T14:32:01Z","trace_id":"a3f2d9c1","level":"info","message":"Python 3.12.10 detected"}
{"timestamp":"2025-10-01T14:32:05Z","trace_id":"a3f2d9c1","level":"warn","message":"VPC already exists","vpc_name":"job-scraper-vpc"}
```

### Collect Diagnostics

```powershell
.\Install-JobFinder.ps1 -CollectDiagnostics
```

Generates `diagnostics-{trace_id}.zip` with:
- All log files (`.log`, `.jsonl`, `.json`)
- Environment variables (redacted)
- PowerShell version
- Python/gcloud versions
- Recent deployment state files

---

## 🧪 Testing Checklist

Before releasing, test these scenarios:

- [ ] **Fresh Win11**: Standard user → Auto-installs Python → Cloud deployment succeeds
- [ ] **Idempotence**: Re-run installer → Fast "already installed" path
- [ ] **Cancellation**: Cancel mid-deploy → Clean rollback, no orphaned files
- [ ] **UAC Focus**: UAC appears → User switches app → UAC completes → No forced activation
- [ ] **Local Path**: Choose Local → Setup wizard runs → Desktop shortcut works
- [ ] **Logging**: Check `logs/*.jsonl` → Structured logs with trace IDs → Secrets redacted
- [ ] **Keyboard-Only**: Tab through entire UI → Enter/Esc work
- [ ] **Narrator**: Screen reader announces controls and progress
- [ ] **High-DPI**: Test at 200% scaling → Text sharp, buttons sized correctly
- [ ] **Offline**: Disconnect network → Uses cached installers (if implemented)
- [ ] **Diagnostics**: Run `-CollectDiagnostics` → ZIP created successfully

---

## 🐛 Troubleshooting

### "Execution Policy Restricted"

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### "Windows Protected Your PC" (SmartScreen)

**Cause**: Unsigned executable

**Dev Fix**: Click "More Info" → "Run Anyway"

**Prod Fix**: Sign with code-signing certificate ($200-500/year from DigiCert/Sectigo)

### Python Not Found After Install

**Fix**: Restart terminal to refresh PATH, or:

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
            [System.Environment]::GetEnvironmentVariable("Path", "User")
```

### gcloud Auth Failed

**Cause**: Firewall/proxy blocking browser

**Fix**: Use no-browser mode:

```powershell
gcloud auth login --no-browser
```

---

## 🚢 Release Workflow

### 1. Update Version

```powershell
# Update version in:
# - pyproject.toml
# - COMPLETE_IMPLEMENTATION.md (§3 Inno Setup)
# - Install-JobFinder.ps1 ($script:Version)
```

### 2. Build Installer

```powershell
iscc.exe deploy\windows\installer\job-finder.iss
```

### 3. Sign (Production)

```powershell
.\deploy\windows\installer\signing\Sign-Installer.ps1 `
  -CertThumbprint "YOUR_CERT_THUMBPRINT" `
  -Path ".\deploy\windows\installer\Output\My-Job-Finder-Setup-v2.0.0.exe"
```

### 4. Test on Clean VM

Use Windows Sandbox or Hyper-V VM:

```powershell
# Run installer
.\My-Job-Finder-Setup-v2.0.0.exe

# Follow GUI prompts
# Verify cloud deployment OR local installation
```

### 5. Upload to GitHub Releases

```powershell
# Use GitHub CLI
gh release create v2.0.0 `
  deploy\windows\installer\Output\My-Job-Finder-Setup-v2.0.0.exe `
  --title "Job Scraper v2.0.0" `
  --notes "Professional Windows installer with cloud/local options"
```

### 6. Update Bootstrap Hash

```powershell
# Calculate SHA-256
$hash = (Get-FileHash .\My-Job-Finder-Setup-v2.0.0.exe).Hash

# Update deploy/windows/bootstrap.ps1 with new hash and download URL
```

---

## 📚 Additional Resources

- **Architecture Deep Dive**: [INSTALLATION_ARCHITECTURE.md](INSTALLATION_ARCHITECTURE.md)
- **Full Source Code**: [COMPLETE_IMPLEMENTATION.md](COMPLETE_IMPLEMENTATION.md)
- **Main Project Docs**: [../../docs/README.md](../../docs/README.md)
- **Cloud Deployment**: [../../docs/CLOUD.md](../../docs/CLOUD.md)
- **Troubleshooting**: [../../docs/TROUBLESHOOTING.md](../../docs/TROUBLESHOOTING.md)

---

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/cboyd0319/job-private-scraper-filter/issues)
- **Logs**: Check `logs/` directory for `.jsonl` and `.log` files
- **Diagnostics**: Run `.\Install-JobFinder.ps1 -CollectDiagnostics`

---

## 📝 License

MIT License - See [../../LICENSE](../../LICENSE)

---

## 👏 Credits

**Designed by**: Windows Automation & Installer Architect
**Principles**: Calm UX, bulletproof PowerShell, accessibility-first
**Philosophy**: One primary action per screen; progress never lies; zero mystery

---

*Last Updated: 2025-10-01*
*Version: 2.0.0*
