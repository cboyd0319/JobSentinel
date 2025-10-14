# Backup & Restore Guide

**NEW in v0.6.1** - One-click data portability and disaster recovery

## Overview

JobSentinel's backup system provides enterprise-grade data protection with consumer-friendly one-click operation. Create complete backups of your job search data, move between machines, or recover from disasters - all in seconds.

## Why It Matters

### Industry Problem
Most job search tools:
- Lock your data in cloud platforms
- No export functionality
- Charge for data migration
- Lose data on account deletion
- No disaster recovery options

### JobSentinel Solution
- **One-click backup** - Complete data backup in seconds
- **Checksum verification** - Integrity guaranteed
- **Compressed storage** - Efficient space usage
- **Cross-platform** - Move Windows → Mac → Linux
- **Free forever** - No charges for your own data

## Features

### 1. Full Backup
Complete snapshot of all JobSentinel data:
- ✅ SQLite database (all jobs, applications, scores)
- ✅ Configuration files (preferences, settings)
- ✅ Environment file (API keys, webhooks)
- ✅ Optional: Log files

### 2. Compression
Automatic gzip compression:
- ~70-80% size reduction
- Fast compression (seconds)
- Standard tar.gz format
- Cross-platform compatible

### 3. Integrity Verification
SHA-256 checksums for every file:
- Detect corruption
- Verify restore accuracy
- Security audit trail
- Tamper detection

### 4. Metadata Tracking
Each backup includes:
- Creation timestamp
- Hostname (machine name)
- JobSentinel version
- File list with sizes
- Compression info
- Checksums for all files

## Usage

### Create Backup

#### Basic Backup
```bash
python -m jsa.cli backup create
```

**Output**:
```
╭─────────────────────────────────────────╮
│ 📦 Creating Backup                      │
│ jobsentinel_backup_20251014_145632.tar.gz │
╰─────────────────────────────────────────╯

Creating backup... ━━━━━━━━━━━━━━━━━━━━━━━ 100%

✓ Backup created successfully

Backup File        backups/jobsentinel_backup_20251014_145632.tar.gz
Files Included     12
Total Size         45.32 MB
Compressed Size    9.84 MB
Compression        Yes
Checksum           f4a5b8c9d2e1f3a6...
```

#### Custom Name
```bash
python -m jsa.cli backup create --name "before_upgrade"
```

Creates: `jobsentinel_backup_before_upgrade.tar.gz`

#### Include Logs
```bash
python -m jsa.cli backup create --include-logs
```

Adds all `.log` files from `logs/` directory.

#### Uncompressed Backup
```bash
python -m jsa.cli backup create --no-compress
```

Faster but larger (use for local backups).

### List Backups

```bash
python -m jsa.cli backup list
```

**Output**:
```
╭──────────────────────╮
│ 📦 Available Backups │
╰──────────────────────╯

┌────────────────────────────────────────────┬──────────────────────┬─────────┐
│ Backup Name                                │ Created              │ Size    │
├────────────────────────────────────────────┼──────────────────────┼─────────┤
│ jobsentinel_backup_20251014_145632.tar.gz  │ 2025-10-14 14:56:32  │ 9.84 MB │
│ jobsentinel_backup_20251013_091245.tar.gz  │ 2025-10-13 09:12:45  │ 8.21 MB │
│ jobsentinel_backup_before_upgrade.tar.gz   │ 2025-10-12 16:30:00  │ 7.95 MB │
└────────────────────────────────────────────┴──────────────────────┴─────────┘
```

### Restore Backup

#### With Verification (Recommended)
```bash
python -m jsa.cli backup restore backups/jobsentinel_backup_20251014_145632.tar.gz
```

**Output**:
```
╭─────────────────────────────────────────╮
│ 📦 Restoring Backup                     │
│ jobsentinel_backup_20251014_145632.tar.gz │
╰─────────────────────────────────────────╯

Extracting backup... ━━━━━━━━━━━━━━━━━━━━ 100%

Verifying file integrity...

✓ Restore completed successfully
```

#### Skip Verification (Faster)
```bash
python -m jsa.cli backup restore <backup-file> --no-verify
```

Use only for trusted backups.

## Backup Storage Locations

### Local Backups (Default)
```
JobSentinel/
├── backups/
│   ├── jobsentinel_backup_20251014_145632.tar.gz
│   ├── jobsentinel_backup_20251013_091245.tar.gz
│   └── metadata.json (temporary)
```

### External Storage (Manual)
Move backups to external drives:

```bash
# Windows
copy backups\*.tar.gz E:\JobSentinelBackups\

# macOS/Linux
cp backups/*.tar.gz /Volumes/Backup/JobSentinel/
```

### Cloud Storage (Optional)
Upload to cloud storage:

```bash
# Google Drive (via rclone)
rclone copy backups/ gdrive:JobSentinel/backups/

# Dropbox
cp backups/*.tar.gz ~/Dropbox/JobSentinel/

# OneDrive
cp backups/*.tar.gz ~/OneDrive/JobSentinel/
```

**Important**: Cloud upload is manual - no automatic sync.

## Backup Contents

### Included Files

```
jobsentinel_backup_YYYYMMDD_HHMMSS.tar.gz
├── data/
│   ├── jobs.sqlite                  # Main database
│   └── jobs.sqlite-wal              # Write-ahead log
├── config/
│   └── user_prefs.json              # Configuration
├── .env                             # API keys & secrets
├── logs/                            # Optional
│   ├── jobsentinel.log
│   └── errors.log
└── metadata.json                    # Backup metadata
```

### Metadata Format

```json
{
  "version": "1.0.0",
  "created_at": "2025-10-14T14:56:32",
  "hostname": "DESKTOP-ABC123",
  "jobsentinel_version": "0.6.1",
  "backup_type": "full",
  "compressed": true,
  "encrypted": false,
  "files": [
    {
      "path": "data/jobs.sqlite",
      "size": 44138496,
      "modified": "2025-10-14T14:45:00"
    }
  ],
  "checksums": {
    "data/jobs.sqlite": "f4a5b8c9d2e1f3a6...",
    "config/user_prefs.json": "a1b2c3d4e5f6g7h8..."
  }
}
```

## Use Cases

### 1. Regular Backups
Schedule weekly backups:

**Windows (Task Scheduler)**:
```powershell
# Create task.xml with:
cd C:\Users\You\JobSentinel
.venv\Scripts\python.exe -m jsa.cli backup create
```

**macOS/Linux (cron)**:
```bash
# Add to crontab:
0 2 * * 0 cd /path/to/JobSentinel && .venv/bin/python -m jsa.cli backup create
```

### 2. Machine Migration
Move JobSentinel to new computer:

```bash
# Old machine
python -m jsa.cli backup create --name "migration"
# Copy backup file to USB drive

# New machine
# 1. Install JobSentinel
# 2. Copy backup from USB
python -m jsa.cli backup restore backups/jobsentinel_backup_migration.tar.gz
```

### 3. Disaster Recovery
Recover from data loss:

```bash
# Find most recent backup
python -m jsa.cli backup list

# Restore it
python -m jsa.cli backup restore backups/jobsentinel_backup_20251014_145632.tar.gz
```

### 4. Testing/Development
Safe environment for testing:

```bash
# Backup production data
python -m jsa.cli backup create --name "production"

# Make changes, test features...

# Restore if needed
python -m jsa.cli backup restore backups/jobsentinel_backup_production.tar.gz
```

### 5. Version Upgrade
Backup before upgrading:

```bash
# Before upgrade
python -m jsa.cli backup create --name "before_v0.7.0"

# Upgrade JobSentinel
pip install --upgrade jobsentinel

# If problems, restore
python -m jsa.cli backup restore backups/jobsentinel_backup_before_v0.7.0.tar.gz
```

## Best Practices

### Backup Frequency
- **Active job search**: Daily backups
- **Passive monitoring**: Weekly backups
- **Before changes**: Always backup before upgrades
- **After milestones**: Backup after major accomplishments

### Retention Policy
```bash
# Keep:
# - Daily backups for 1 week
# - Weekly backups for 1 month
# - Monthly backups for 1 year

# Cleanup script (manual):
find backups/ -name "*.tar.gz" -mtime +7 -delete  # Remove >7 days
```

### Storage Management
- Backups folder grows ~10MB per backup
- With compression: ~2MB per backup
- 100 backups ≈ 200MB (compressed)
- Clean old backups regularly

### Security
- Backups include `.env` with API keys
- Treat backup files as sensitive
- Don't upload to public storage
- Use encrypted drives for external storage

## Troubleshooting

### "Permission denied" during backup
- Check write permissions on `backups/` folder
- Run from project root directory
- Ensure database is not locked

### "Checksum mismatch" during restore
- Backup file may be corrupted
- Try different backup
- Re-download if from cloud storage

### "No backups found"
- Run `python -m jsa.cli backup create` first
- Check `backups/` directory exists
- Verify working directory is project root

### Backup file too large
- Don't include logs: `--no-include-logs`
- Clean old jobs from database first
- Verify compression is enabled

## Advanced Features

### Incremental Backups (Planned)
Future feature:
```bash
# Initial full backup
python -m jsa.cli backup create --type full

# Subsequent incremental backups (only changes)
python -m jsa.cli backup create --type incremental
```

### Encrypted Backups (Planned)
Future feature:
```bash
# Create encrypted backup
python -m jsa.cli backup create --encrypt --password "your-password"

# Restore with password
python -m jsa.cli backup restore <file> --password "your-password"
```

### Automated Cleanup (Planned)
Future feature:
```bash
# Keep only last 30 days
python -m jsa.cli backup cleanup --days 30
```

## Backup Verification

Verify backup integrity without restoring:

```bash
# Extract metadata only
tar -xzf backups/jobsentinel_backup_20251014_145632.tar.gz metadata.json

# View metadata
cat metadata.json

# Check file list
jq '.files[] | .path' metadata.json
```

## Competitive Advantages

### vs AIHawk
- AIHawk: No backup system
- JobSentinel: **One-click backup/restore** ✅

### vs Teal/Huntr
- Teal/Huntr: Cloud backup (proprietary format, requires account)
- JobSentinel: **Standard tar.gz format, no account needed** ✅

### vs Manual Backup
- Manual: Copy files, hope for best
- JobSentinel: **Checksums, metadata, automation** ✅

## Integration with Privacy Dashboard

Backup and privacy features work together:

```bash
# See what will be backed up
python -m jsa.cli privacy

# Create backup
python -m jsa.cli backup create

# Both show same file inventory
```

## API Access

Backup operations also available via REST API:

```bash
# Create backup
POST /api/v1/backup/create

# List backups
GET /api/v1/backup/list

# Restore backup
POST /api/v1/backup/restore
```

See [API_SPECIFICATION.md](API_SPECIFICATION.md) for details.

## Related Documentation

- [Privacy Dashboard Guide](PRIVACY_DASHBOARD_GUIDE.md) - Data transparency
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production setup
- [SRE Runbook](SRE_RUNBOOK.md) - Operations guide
- [Architecture](ARCHITECTURE.md) - System design

## Support

Questions about backups?
- GitHub Issues: https://github.com/cboyd0319/JobSentinel/issues
- Documentation: [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)

---

**Remember**: Regular backups are your insurance policy. Make them part of your JobSentinel routine.
