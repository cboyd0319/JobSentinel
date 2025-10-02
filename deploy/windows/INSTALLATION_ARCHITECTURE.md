# Windows Installation Architecture - Design Document

## TL;DR

**What**: Professional Windows installer for Job Scraper with GCP/Local deployment options
**How**: Inno Setup + PowerShell + WPF GUI with UAC discipline and focus control
**Why Safe**: Strict mode, signed-ready, idempotent, rollback-capable, structured logging

---

## Design Philosophy

1. **Calm & Premium**: 2-color palette (accent + neutral), minimal UI, no surprise behaviors
2. **Trust**: Clear UAC reasons, hash verification, structured logs with trace IDs
3. **Focus Discipline**: No window stealing; UAC flows return user to their active context
4. **Receipts**: Visible success + `install-receipt.md` on disk
5. **Idempotent**: Re-run = fast "already installed" path with zero side effects

---

## Stack Selection

| Component | Choice | Why |
|-----------|--------|-----|
| **Installer** | Inno Setup 6.5.4 | Fast, battle-tested, excellent UAC support, already installed via winget |
| **GUI** | PowerShell + WPF/XAML | Native to Windows, no extra dependencies, easy deployment |
| **Orchestration** | PowerShell 7.4+ (fallback 5.1) | Modern, async-capable, strict mode enforcement |
| **Cloud Backend** | Python `cloud.bootstrap` | Existing battle-tested code, Terraform orchestration |

**Alternatives Considered**:
- WiX Toolset: More complex, slower compile, overkill for this use case
- MSIX: Requires Store or sideloading trust; restrictive sandbox
- C# WPF: Adds build step; PS is sufficient and ships with Windows

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Entry Points                        │
├─────────────────────────────────────────────────────────────┤
│  1. Web: irm bootstrap.ps1 | iex                            │
│  2. Exe: My-Job-Finder-Setup.exe (Inno Setup)               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│         bootstrap.ps1 (Online Downloader)                   │
│  • Downloads latest release from GitHub                     │
│  • Verifies SHA-256 hash                                    │
│  • Extracts to ~\Desktop\Job-Finder-Setup                   │
│  • Launches Install-JobFinder.ps1                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│    Install-JobFinder.ps1 (Main Installer GUI)               │
│  • WPF window with Cloud/Local choice                       │
│  • Prerequisite checks (Python, gcloud)                     │
│  • Auto-install missing deps via winget                     │
│  • Progress tracking with live log tail                     │
│  • Calls Deploy-GCP.ps1 or Deploy-Local.ps1                 │
└──────────┬──────────────────────────┬───────────────────────┘
           │                          │
           ▼                          ▼
┌──────────────────────┐  ┌──────────────────────────────────┐
│  Deploy-GCP.ps1      │  │  Deploy-Local.ps1                │
│  • Strict mode       │  │  • Setup wizard (Python)         │
│  • JSONL logging     │  │  • Install venv + deps           │
│  • State snapshots   │  │  • Config user_prefs.json        │
│  • Calls Python:     │  │  • Create desktop shortcuts      │
│    python -m cloud.  │  │  • Receipt generation            │
│    bootstrap --no-   │  └──────────────────────────────────┘
│    prompt --yes      │
│  • Receipt gen       │
└──────────────────────┘
```

---

## File Structure

```
deploy/
└── windows/
    ├── bootstrap.ps1                   # Web entry point (download latest)
    ├── Install-JobFinder.ps1           # Main GUI installer (NEW)
    ├── engine/
    │   ├── Deploy-GCP.ps1              # GCP orchestrator (REWRITTEN)
    │   ├── Deploy-Local.ps1            # Local setup orchestrator (NEW)
    │   └── modules/
    │       ├── Security.psm1           # DPAPI encryption (EXISTS)
    │       ├── Logging.psm1            # JSONL + console logger (NEW)
    │       └── Prerequisites.psm1      # Dep checks + winget installer (NEW)
    ├── ui/
    │   ├── MainWindow.xaml             # WPF installer window (NEW)
    │   ├── ProgressWindow.xaml         # Deployment progress panel (NEW)
    │   └── FirstRunWizard.xaml         # Post-install welcome (NEW)
    ├── installer/
    │   ├── job-finder.iss              # Inno Setup script (NEW)
    │   ├── signing/
    │   │   └── Sign-Installer.ps1      # Code signing helper (NEW)
    │   └── Output/                     # Compiled .exe output
    └── tests/
        ├── Install.Tests.ps1           # Pester tests (NEW)
        └── Deploy.Tests.ps1            # Pester tests (NEW)
```

---

## UAC & Focus Rules

### Elevation Philosophy

**Only elevate when truly required**:
- Installing Python/gcloud to Program Files
- Writing to HKLM registry
- Installing Windows services (future)

**Never elevate for**:
- User-scoped installs (AppData)
- Config file writes
- Cloud API calls

### Flow

1. **Pre-Check**: Detect if admin is needed for specific step
2. **User Notice**: Show modal "UAC Required: [Reason]" overlay in main window
3. **Elevation**: `Start-Process -Verb runas` with specific task script
4. **Return**: Do NOT activate main window automatically; user may have switched apps
5. **Completion**: Update progress bar; enable "Next" button

### Focus Control

```powershell
# GOOD: Show window without stealing focus
$win.Show()

# BAD: Forces window to front even if user is in another app
$win.Activate()
```

After UAC completes:
- **If user is still in installer**: Progress updates naturally
- **If user switched away**: Taskbar button flashes; no forced activation

---

## Logging Strategy

### Dual-Stream Logging

1. **Console (Human-Friendly)**:
   ```
   ✓ Python 3.12.10 detected
   → Launching GCP bootstrap...
   ⚠ VPC already exists; reusing
   ✓ Deployment complete!
   ```

2. **Structured JSONL (Machine-Parseable)**:
   ```json
   {"timestamp":"2025-10-01T14:32:01Z","trace_id":"a3f2d9c1","level":"info","message":"Python 3.12.10 detected","component":"prerequisites"}
   {"timestamp":"2025-10-01T14:32:05Z","trace_id":"a3f2d9c1","level":"warn","message":"VPC already exists; reusing","component":"deployment","vpc_name":"job-scraper-vpc"}
   ```

### Log Locations

- `logs/install-{trace_id}.jsonl` - Structured logs
- `logs/install-{trace_id}.log` - Console logs
- `logs/deploy-state-{trace_id}.json` - State snapshots for rollback

### Secret Redaction

All logs automatically redact:
- `password=***`
- `token=***`
- `key=***`
- Webhook URLs

---

## Rollback & Idempotence

### State Snapshots

Every major step writes a state file:

```json
{
  "trace_id": "a3f2d9c1",
  "action": "deploy",
  "steps": [
    {"step": "prerequisites", "status": "completed", "timestamp": "..."},
    {"step": "python_bootstrap", "status": "in_progress", "timestamp": "..."}
  ]
}
```

### Rollback Logic

```powershell
Deploy-GCP.ps1 -Action rollback -TraceId a3f2d9c1
```

- Reads state file
- Reverses completed steps in reverse order
- Calls `python -m cloud.teardown` for cloud resources

### Idempotence

Re-running installer:
1. **Check**: Already installed?
2. **Fast Path**: Show "Already installed. Choose Repair, Update, or Uninstall"
3. **Slow Path**: Full reinstall if user selects "Repair"

---

## Code Signing Plan

### Dev Signing (Self-Signed)

```powershell
# Create self-signed cert
$cert = New-SelfSignedCertificate -Subject "CN=Job Finder Dev" `
  -Type CodeSigningCert -CertStoreLocation Cert:\CurrentUser\My

# Sign
Set-AuthenticodeSignature -FilePath .\Install-JobFinder.ps1 -Certificate $cert
```

### Production Signing

1. **Acquire**: DigiCert/Sectigo code-signing certificate ($200-500/year)
2. **Store**: In Azure Key Vault or USB token
3. **Sign**: Via `SignTool.exe` or `Set-AuthenticodeSignature`
4. **Timestamp**: Always use timestamping server (signature valid even after cert expires)

```powershell
SignTool.exe sign /f cert.pfx /p password /t http://timestamp.digicert.com /v My-Job-Finder-Setup.exe
```

---

## Testing Strategy

### Pester Tests (Unit)

```powershell
Describe "Deploy-GCP Prerequisites" {
  It "Detects missing Python" {
    Mock Get-Command { $null } -ParameterFilter { $Name -eq 'python' }
    { Assert-Prerequisites } | Should -Throw "Python"
  }
}
```

### Manual Test Matrix

| Scenario | Expected Behavior |
|----------|-------------------|
| Fresh Win11 (no Python) | Auto-installs Python 3.12.10, then proceeds |
| Already installed | Shows "Repair/Update/Uninstall" prompt |
| Cancel mid-install | Rolls back partial changes; no orphaned files |
| UAC declined | Graceful error; explains what failed and why |
| Offline mode | Uses cached payloads from `cache/` directory |
| High-DPI (200%) | All text crisp; buttons properly sized |
| Multi-monitor | Window centers on primary monitor |
| Keyboard-only | Tab order correct; Enter/Esc work as expected |
| Narrator | AutomationProperties set; controls announced properly |

---

## Accessibility Compliance

1. **Tab Order**: Logical flow through all interactive elements
2. **Access Keys**: `Alt+C` for Cloud, `Alt+L` for Local, etc.
3. **AutomationProperties**: `Name` and `HelpText` on all controls
4. **High Contrast**: Respects Windows theme; no hard-coded colors
5. **Keyboard Shortcuts**: `Enter` = Continue, `Esc` = Cancel
6. **Screen Reader**: Tested with Narrator; progress announcements

---

## Acceptance Checklist

- [ ] Clean install on Win11 (standard user) → UAC once for Python install → success receipt
- [ ] Re-run installer → Fast "already installed" path (< 5 seconds)
- [ ] Cancel mid-deployment → Clean rollback; no leftover files
- [ ] Focus test: Start install → Alt+Tab away → UAC appears → Approve → Main window does NOT steal focus
- [ ] Logs: Structured JSONL exists with trace ID; secrets redacted
- [ ] Code signing: Installer and scripts signed; no SmartScreen warnings
- [ ] Keyboard-only: Can navigate and install using only Tab, Enter, Esc
- [ ] Narrator: All controls announced; progress updates spoken
- [ ] High-DPI (150%, 200%): Text sharp; no blurry rendering
- [ ] Offline: Uses cached installers; no network failures

---

## Build & Package Commands

### Build Installer (Inno Setup)

```powershell
# Compile .iss to .exe
iscc.exe deploy\windows\installer\job-finder.iss

# Output: deploy\windows\installer\Output\My-Job-Finder-Setup.exe
```

### Sign Installer

```powershell
.\deploy\windows\installer\signing\Sign-Installer.ps1 `
  -CertThumbprint "<thumbprint>" `
  -InstallerPath ".\deploy\windows\installer\Output\My-Job-Finder-Setup.exe"
```

### Test Locally

```powershell
# Run Pester tests
Invoke-Pester -Path .\deploy\windows\tests\

# Dry-run deployment
.\deploy\windows\engine\Deploy-GCP.ps1 -DryRun

# Check deployment status
.\deploy\windows\engine\Deploy-GCP.ps1 -Action status
```

---

## Deployment Runbook

### Pre-Flight

1. Update version in `pyproject.toml`
2. Build installer: `iscc.exe job-finder.iss`
3. Sign exe (production only)
4. Test on clean Windows 11 VM
5. Upload to GitHub Releases
6. Update bootstrap.ps1 with new hash

### User Install (Cloud)

1. User runs `irm bootstrap.ps1 | iex`
2. GUI appears → Click "Install in Cloud"
3. Prerequisites auto-install (Python, gcloud)
4. Browser opens for Google auth
5. Terraform provisions GCP resources
6. Receipt displayed + saved to disk
7. User closes installer

### User Install (Local)

1. User runs `irm bootstrap.ps1 | iex`
2. GUI appears → Click "Install on This PC"
3. Setup wizard asks for job boards, keywords, etc.
4. Venv created, deps installed
5. Desktop shortcut created
6. Receipt displayed + saved to disk

---

## Troubleshooting & Diagnostics

### Collect Diagnostics

```powershell
.\deploy\windows\Install-JobFinder.ps1 -CollectDiagnostics
# Outputs: diagnostics-{trace_id}.zip
```

Contains:
- All log files
- Environment variables (redacted)
- PowerShell version
- Installed Python/gcloud versions
- Last 10 deployment state files

### Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| SmartScreen warning | Unsigned exe | Sign with production cert OR click "More Info → Run Anyway" |
| "Python not found" | PATH not updated | Restart terminal OR manually add to PATH |
| "gcloud auth failed" | Firewall/proxy | Check network; use `gcloud auth login --no-browser` |
| Window blurry on 4K | DPI awareness not set | Fixed in XAML with `UseLayoutRounding="True"` |

---

## Future Enhancements

1. **Auto-Update**: Check GitHub Releases on launch; offer one-click update
2. **Localization**: Strings in .resx files; support es-ES, fr-FR, de-DE
3. **Telemetry (Opt-In)**: Anonymous usage stats to improve installer
4. **Silent Install**: `/VERYSILENT /SUPPRESSMSGBOXES` for enterprise deployment
5. **MSI Support**: For Group Policy deployment in enterprises

---

## Security Hardening

- **Least Privilege**: User-scoped install by default; admin only when required
- **Hash Verification**: SHA-256 check on all downloads
- **HTTPS Only**: No HTTP URLs; all traffic encrypted
- **Secret Storage**: Windows DPAPI for local secrets; GCP Secret Manager for cloud
- **No Secrets in Logs**: Automated redaction of sensitive patterns
- **Code Signing**: Authenticode signature on all .ps1 and .exe files

---

**Version**: 2.0.0
**Author**: Windows Automation & Installer Architect
**Last Updated**: 2025-10-01
