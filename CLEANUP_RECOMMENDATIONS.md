# Project Cleanup Recommendations

**Generated**: 2025-10-01
**Status**: Ready for review and cleanup

---

## 🎯 Summary

Total orphaned/unnecessary files found: **3 items (~46 MB)**

**Safe to delete**: ✅ All items listed below
**Estimated space savings**: ~46 MB

---

## 📦 Files/Folders to Delete

### 1. ❌ `deploy/windows_v2/` (14 MB)

**What it is**: Experimental/draft v2 installer directory

**Why it's orphaned**:
- Superseded by the new production-ready installer system in `deploy/windows/`
- Contains an old Inno Setup script (`install.iss`) that's been replaced
- Has a compiled `.exe` that's now outdated
- The new architecture is documented in `deploy/windows/COMPLETE_IMPLEMENTATION.md`

**Contents**:
```
deploy/windows_v2/
├── assets/
├── install.iss           # Old Inno Setup script (superseded)
├── Output/
│   └── My-Job-Finder-Setup-v2.exe  (~14 MB, outdated)
└── scripts/
    ├── pre-install.ps1
    ├── Welcome.ps1
    ├── post-install.ps1
    └── HOW_TO_USE.md
```

**Delete command**:
```powershell
Remove-Item -Path "deploy\windows_v2" -Recurse -Force
```

---

### 2. ❌ `inno_temp/` (24 MB)

**What it is**: Temporary Inno Setup installation/extraction directory

**Why it's orphaned**:
- Created during Inno Setup installation
- Inno Setup is already installed system-wide via winget
- This is just extracted installer files, not the actual installation
- Contains uninstaller and temp files

**Contents**: Inno Setup binaries and installation artifacts

**Delete command**:
```powershell
Remove-Item -Path "inno_temp" -Recurse -Force
```

---

### 3. ❌ `innosetup-6.5.4.exe` (7.5 MB)

**What it is**: Inno Setup installer executable

**Why it's orphaned**:
- Already installed via winget (system-wide installation)
- No longer needed; can be re-downloaded if required
- Taking up space in project root

**Delete command**:
```powershell
Remove-Item -Path "innosetup-6.5.4.exe" -Force
```

---

## ⚠️ Files to Keep (But Review)

### `deploy/windows/My-Job-Finder.ps1`

**What it is**: User-facing control panel GUI for running jobs locally

**Status**: ⚠️ **REVIEW NEEDED**

**Recommendation**: Keep if this is a post-install control panel for local users. However, it overlaps with the new `Install-JobFinder.ps1` design.

**Questions to answer**:
1. Is this used after installation as a "run jobs now" control panel?
2. Or was it part of the old installer flow (now replaced)?

**If it's a post-install tool**: Keep it, but consider renaming to `Job-Finder-Control-Panel.ps1` for clarity

**If it's part of old installer**: Delete it

---

### `deploy/windows/install.ps1`

**What it is**: Current installer GUI (480 lines)

**Status**: ⚠️ **REVIEW NEEDED**

**Recommendation**: This is the current installer, but it's superseded by the new design in `COMPLETE_IMPLEMENTATION.md` (§1).

**Decision**:
- **If migrating to new system**: Keep for now as backup, delete after new `Install-JobFinder.ps1` is tested
- **If keeping old system**: Keep this, but document that the new design is in COMPLETE_IMPLEMENTATION.md

---

## 📊 Cleanup Summary

| Item | Type | Size | Safe to Delete? | Priority |
|------|------|------|-----------------|----------|
| `deploy/windows_v2/` | Directory | 14 MB | ✅ Yes | High |
| `inno_temp/` | Directory | 24 MB | ✅ Yes | High |
| `innosetup-6.5.4.exe` | File | 7.5 MB | ✅ Yes | Medium |
| `deploy/windows/My-Job-Finder.ps1` | File | ~5 KB | ⚠️ Review | Low |
| `deploy/windows/install.ps1` | File | ~20 KB | ⚠️ Review | Low |

---

## 🗑️ One-Command Cleanup

To delete all safe-to-delete items at once:

```powershell
# Navigate to project root
cd "C:\Users\boydc\OneDrive\Desktop\GitHub\job-private-scraper-filter"

# Delete orphaned directories and files
Remove-Item -Path "deploy\windows_v2" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "inno_temp" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "innosetup-6.5.4.exe" -Force -ErrorAction SilentlyContinue

Write-Host "Cleanup complete! Freed ~46 MB of disk space." -ForegroundColor Green
```

---

## 📁 Additional Cleanup Opportunities

### Runtime/Build Artifacts (Not in Repo)

These are already gitignored, so they won't be committed, but you may want to clean them locally:

```powershell
# Python cache
Remove-Item -Path "**\__pycache__" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "**\*.pyc" -Recurse -Force -ErrorAction SilentlyContinue

# Logs (if not needed)
Remove-Item -Path "logs\*.log" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "logs\*.jsonl" -Force -ErrorAction SilentlyContinue

# Terraform state (only if you're starting fresh)
# WARNING: This deletes your Terraform state. Only do this if intentional!
# Remove-Item -Path ".terraform" -Recurse -Force -ErrorAction SilentlyContinue
# Remove-Item -Path "*.tfstate*" -Force -ErrorAction SilentlyContinue
```

---

## 🔍 What's Already Clean

✅ **No Python build artifacts** (`.egg-info`, `dist/`, `build/`)
✅ **No test caches** (`.pytest_cache/`, `.mypy_cache/`)
✅ **No IDE cruft** (`.vscode/`, `.idea/` are gitignored)
✅ **Archive docs organized** (`docs/archive/` - these are historical and should stay)

---

## 🎨 .gitignore Updates Needed

Add these entries to ensure future cleanup items are ignored:

```gitignore
# Inno Setup temporary files and installers
inno_temp/
innosetup-*.exe

# Windows installer experiments
deploy/windows_v2/

# Installation receipts and state
install-receipt.md
installer-state.json
installer-crash.log
```

**Add to `.gitignore`**:
```bash
cat >> .gitignore << 'EOF'

# Windows installer artifacts (cleanup 2025-10-01)
inno_temp/
innosetup-*.exe
deploy/windows_v2/
install-receipt.md
installer-state.json
installer-crash.log
EOF
```

---

## ✅ Post-Cleanup Verification

After running cleanup, verify:

```powershell
# Check git status (should show deletions)
git status

# Verify files are gone
Test-Path "deploy\windows_v2"      # Should be False
Test-Path "inno_temp"               # Should be False
Test-Path "innosetup-6.5.4.exe"    # Should be False

# Check remaining untracked files
git status --short | Select-String "^\?\?"
```

Expected untracked files (these are new documentation, keep them):
```
?? deploy/windows/COMPLETE_IMPLEMENTATION.md
?? deploy/windows/INSTALLATION_ARCHITECTURE.md
?? deploy/windows/SHIP_IT.md
?? CLEANUP_RECOMMENDATIONS.md
```

---

## 🚀 Recommended Actions

### Immediate (Do Now)

1. **Run the one-command cleanup** (deletes ~46 MB):
   ```powershell
   Remove-Item -Path "deploy\windows_v2" -Recurse -Force
   Remove-Item -Path "inno_temp" -Recurse -Force
   Remove-Item -Path "innosetup-6.5.4.exe" -Force
   ```

2. **Update .gitignore** to prevent re-creation of these artifacts

3. **Commit the cleanup**:
   ```powershell
   git add .gitignore
   git commit -m "chore: cleanup orphaned installer files and temp directories

   - Remove deploy/windows_v2/ (14 MB, superseded by new installer)
   - Remove inno_temp/ (24 MB, Inno Setup temp files)
   - Remove innosetup-6.5.4.exe (7.5 MB, installer already system-wide)
   - Update .gitignore to prevent re-creation

   Total space saved: ~46 MB"
   ```

### Short-Term (Review First)

1. **Decide on `My-Job-Finder.ps1`**:
   - If it's a post-install control panel → Keep and document
   - If it's part of old installer → Delete

2. **Plan migration from `install.ps1` to new `Install-JobFinder.ps1`**:
   - Test new installer first
   - Keep old one as `install.ps1.backup` during transition
   - Delete after confirming new one works

---

## 📝 Decision Log

| File/Folder | Decision | Reason | Date |
|-------------|----------|--------|------|
| `deploy/windows_v2/` | ✅ **DELETE** | Superseded by new installer architecture | 2025-10-01 |
| `inno_temp/` | ✅ **DELETE** | Temp files from Inno Setup install | 2025-10-01 |
| `innosetup-6.5.4.exe` | ✅ **DELETE** | Already installed system-wide | 2025-10-01 |
| `My-Job-Finder.ps1` | ⚠️ **REVIEW** | Clarify purpose: installer vs control panel | 2025-10-01 |
| `install.ps1` | ⚠️ **REVIEW** | Keep during transition to new installer | 2025-10-01 |

---

**Status**: ✅ Ready to execute cleanup
**Approver**: (Your name/approval)
**Date**: _________

---

*Generated by cleanup audit on 2025-10-01*
