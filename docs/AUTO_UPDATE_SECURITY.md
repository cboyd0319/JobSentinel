# Auto-Update Security Guide

JobSentinel includes automatic security updates for Windows (no admin rights required).

## TL;DR

```bash
# Check for security updates
python -m jsa.cli update --security-only --check-only

# Auto-install security updates (recommended for scheduled tasks)
python -m jsa.cli update --security-only --auto

# Interactive update with prompts
python -m jsa.cli update
```

---

## Features

### Security Update Detection
Scans release notes for vulnerability indicators:
- CVE identifiers
- "security", "vulnerability", "exploit" keywords
- "critical update", "patch" terminology
- "malicious" content warnings

### Automatic Backup
Every update creates a backup before proceeding:
- Location: `backups/before_vX.Y.Z_update.tar.gz`
- Contents: Database, configuration, code
- SHA-256 checksums for integrity
- Restore command: `python -m jsa.cli backup restore`

### Health Verification
After update, runs comprehensive checks:
- Module imports work
- CLI responds
- Database accessible
- Configuration valid

### Auto-Rollback
If update fails health check:
1. Detects failure automatically
2. Restores backup
3. Reports status
4. No data loss

### SHA-256 Validation
When available in release notes:
- Extracts checksum from release body
- Validates downloaded package
- Rejects corrupted downloads

---

## Usage

### Interactive Mode (Default)
```bash
python -m jsa.cli update
```

**Prompts for:**
- Update confirmation
- Release notes review
- Security warnings (if applicable)

**Security updates:**
- Red banner highlighting security nature
- Confirmation required to skip
- Recommendation to install ASAP

### Automated Mode
```bash
# Auto-install all updates
python -m jsa.cli update --auto

# Auto-install security updates only
python -m jsa.cli update --security-only --auto
```

**Scheduled task example (Windows):**
```powershell
# Check for security updates daily at 9 AM
# Task Scheduler → Create Basic Task → Daily → 09:00
# Program: python
# Arguments: -m jsa.cli update --security-only --auto --check-only
```

### Check-Only Mode
```bash
# Check without installing
python -m jsa.cli update --check-only

# Check security updates only
python -m jsa.cli update --security-only --check-only
```

---

## Security Model

### What Gets Updated
- Python package from GitHub release tag
- Installed via pip from trusted source
- No arbitrary code execution
- No network requests except GitHub API

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Update corrupts installation | Low | High | Auto-backup + rollback |
| Malicious release | Very Low | Critical | GitHub OAuth, official repo only |
| Network MITM | Low | High | HTTPS only, pip verification |
| Backup failure | Very Low | Medium | Multiple backup strategies |

**Overall risk:** Low (extensive safeguards in place)

### Trust Boundaries
- **Trusted:** GitHub API, official releases, pip
- **Untrusted:** Network transport (HTTPS validated)
- **Verified:** Package signatures (when available)

### Data Protection
- No user data transmitted during update
- Backup includes all critical data
- Original files preserved until verification
- Rollback restores exact previous state

---

## CI/CD Integration

### Dependabot
Auto-merges security updates:
- Immediate approval for security advisories
- Separate PR for each security update
- Auto-merge for patch/minor security fixes
- Manual review for major version security fixes

### GitHub Actions
Security scanning on every PR:
- `pip-audit` checks for known CVEs
- Fails CI on high/critical vulnerabilities
- PyGuard comprehensive security analysis
- SARIF reports to GitHub Security tab

### Release Process
When security update released:
1. Tag created with semantic version
2. Release notes include security keywords
3. Dependabot creates PR immediately
4. CI validates security
5. Auto-merge after CI passes
6. Users get update notification

---

## Troubleshooting

### Update check fails
```
Could not check for updates: 404 Not Found
```

**Cause:** No official releases yet or network issue

**Fix:** Wait for first release or check network

### Backup creation fails
```
✗ Backup creation failed: Permission denied
```

**Cause:** Insufficient permissions in backup directory

**Fix:** 
```bash
# Ensure backups directory is writable
mkdir -p backups
chmod 755 backups

# Or specify different location
python -m jsa.cli backup create --path /path/to/writable/location
```

### Health check fails after update
```
✗ Health check failed after update
```

**Auto-rollback:** System automatically restores backup

**Manual restore:**
```bash
python -m jsa.cli backup list
python -m jsa.cli backup restore before_vX.Y.Z_update.tar.gz
```

### Rollback fails
```
✗ Rollback failed: [error message]
```

**Manual recovery:**
```bash
# List available backups
python -m jsa.cli backup list

# Restore manually
cd /path/to/jobsentinel
tar -xzf backups/before_vX.Y.Z_update.tar.gz
```

---

## Best Practices

### For Users
1. **Enable auto-update for security patches:**
   ```bash
   python -m jsa.cli update --security-only --auto
   ```

2. **Test updates in non-production first:**
   ```bash
   # Dry-run equivalent: check without installing
   python -m jsa.cli update --check-only
   ```

3. **Keep backups:**
   ```bash
   # Manual backup before major changes
   python -m jsa.cli backup create
   ```

4. **Review release notes:**
   - Check for breaking changes
   - Verify security fixes apply to you
   - Read upgrade instructions

### For Scheduled Tasks
1. **Use security-only mode:**
   - Reduces unexpected breaking changes
   - Focuses on critical updates
   - Lower risk of disruption

2. **Log output:**
   ```powershell
   python -m jsa.cli update --security-only --auto > update_log.txt 2>&1
   ```

3. **Monitor failures:**
   - Check exit codes
   - Alert on failed updates
   - Review logs regularly

4. **Stagger updates:**
   - Don't update all instances simultaneously
   - Test on one system first
   - Roll out gradually

### For Developers
1. **Semantic versioning:**
   - Patch: Bug fixes, security updates
   - Minor: New features, backward compatible
   - Major: Breaking changes

2. **Release notes:**
   - Include "security" keyword for security updates
   - List CVE identifiers if applicable
   - Provide upgrade instructions
   - Include SHA-256 checksum

3. **Testing:**
   - Test update path before release
   - Verify rollback works
   - Test on clean install
   - Test upgrade from previous version

---

## Architecture

### Update Flow
```
Check GitHub → Parse Release → Create Backup → Install via pip →
Health Check → Success → Done
             ↓ Fail
          Rollback → Restore Backup → Report Error
```

### Components

**AutoUpdater class** (`src/jsa/auto_update.py`)
- Check for updates via GitHub API
- Parse release information
- Detect security updates
- Manage update process
- Handle rollback

**CLI integration** (`src/jsa/cli.py`)
- `update` command with flags
- User prompts and confirmations
- Progress reporting
- Error handling

**Backup system** (`src/jsa/backup_restore.py`)
- Pre-update backup creation
- Post-update restoration
- Checksum verification
- Compression support

---

## FAQ

### Q: How often should I check for updates?
**A:** Daily for security updates, weekly for all updates.

### Q: Will updates break my configuration?
**A:** No. Configuration is backward compatible. If issues occur, auto-rollback restores previous state.

### Q: Can I disable auto-update?
**A:** Yes. Auto-update is opt-in via `--auto` flag. Default is interactive prompts.

### Q: Are beta releases included?
**A:** No by default. Use `--include-prereleases` to check beta/alpha releases.

### Q: What if I'm behind a corporate firewall?
**A:** Updates require HTTPS access to github.com. If blocked, download releases manually.

### Q: How do I know an update is legitimate?
**A:** Updates come from official GitHub releases at https://github.com/cboyd0319/JobSentinel/releases. Verify URL before installing.

### Q: Can I rollback after a successful update?
**A:** Yes, backups are retained. Use `python -m jsa.cli backup restore` to revert to any previous backup.

---

## References

- [SECURITY.md](../SECURITY.md) — Security policy and vulnerability reporting
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) — Production deployment guide
- [WINDOWS_TROUBLESHOOTING.md](WINDOWS_TROUBLESHOOTING.md) — Windows-specific issues

**Related commands:**
- `python -m jsa.cli health` — System health check
- `python -m jsa.cli backup` — Backup management
- `python -m jsa.cli diagnostic` — Troubleshooting diagnostics

---

**Last Updated:** October 2025  
**Version:** 0.6.1+  
**Author:** @cboyd0319
