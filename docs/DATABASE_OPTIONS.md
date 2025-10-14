# Database Architecture & Configuration

**Version:** 0.7.0+  
**Last Updated:** October 14, 2025 - Session 11  
**Purpose:** SQLite-only database strategy for privacy and zero-admin deployments

---

## Executive Summary

JobSentinel uses **SQLite as the ONLY database** for maximum privacy, zero setup, and no admin rights requirements. This is a deliberate architectural decision prioritizing personal use, privacy, and simplicity.

---

## Why SQLite Only?

### Perfect for Personal Job Search

JobSentinel is designed for **individual job seekers** managing their own job search. SQLite is perfect for this use case:

- ✅ **ZERO SETUP** - No installation or configuration required
- ✅ **NO ADMIN RIGHTS** - Works for all users on Windows/Mac/Linux
- ✅ **100% PRIVATE** - Single file, no network service, no exposure
- ✅ **PORTABLE** - Copy database file anywhere, instant backup
- ✅ **FAST** - Excellent performance for single-user (<1M jobs)
- ✅ **CROSS-PLATFORM** - Identical behavior on all platforms
- ✅ **LIGHTWEIGHT** - ~2-10 MB disk space (scales with job count)
- ✅ **ZERO DEPENDENCIES** - Built into Python, always available
- ✅ **PRIVACY-FIRST** - No service to secure, no ports to configure
- ✅ **MAINTAINABLE** - One database system = simpler codebase

### SQLite Capabilities

**Performance Characteristics:**
- Read: ~50K operations/sec (on SSD)
- Write: ~10K operations/sec (single-writer)
- Storage: ~1-5 MB per 1,000 jobs
- Scalability: Excellent up to 1M jobs (tested)
- Concurrent readers: Unlimited
- Concurrent writers: 1 (perfect for personal use)

**Features:**
- Full ACID compliance (Atomicity, Consistency, Isolation, Durability)
- Transactions with rollback support
- Indexes for fast queries
- Foreign keys and constraints
- Triggers and views
- JSON support (via json1 extension)
- Full-text search (via FTS5 extension)
- Built-in encryption (via SEE or SQLCipher if needed)

---

## Configuration

### Installation

SQLite support is included in Python - no separate installation needed!

```bash
# Standard installation includes everything
pip install -e .

# This includes:
# - aiosqlite (async SQLite driver for performance)
# - SQLite is built into Python
# - No database server installation required
```

### Connection String

**In .env file (default):**
```bash
DATABASE_URL="sqlite+aiosqlite:///data/jobs.sqlite"

# Absolute path (recommended for production)
DATABASE_URL="sqlite+aiosqlite:////absolute/path/to/jobs.sqlite"

# In-memory (testing only, data lost on restart)
DATABASE_URL="sqlite+aiosqlite://"
```

**Database File Location:**
- Default: `data/jobs.sqlite` (relative to project root)
- Creates `data/` directory automatically if missing
- Backup: Simply copy the `jobs.sqlite` file
- Migration: Move file to new location, update DATABASE_URL

**No Setup Required:**
- ✅ No installation needed
- ✅ No service to start
- ✅ No admin rights required
- ✅ Works immediately on all platforms

---

## Quick Start

### Installation

```bash
# 1. Install JobSentinel (SQLite included automatically)
pip install -e .

# 2. Run setup wizard (database configured automatically)
python -m jsa.cli setup

# 3. Start using JobSentinel
python -m jsa.cli run-once
```

### Manual Configuration

If you prefer manual setup:

```bash
# 1. Copy example environment file
cp .env.example .env

# 2. Edit .env (DATABASE_URL already set to SQLite)
# DATABASE_URL=sqlite+aiosqlite:///data/jobs.sqlite

# 3. Copy example config
cp config/user_prefs.example.json config/user_prefs.json

# 4. Edit config/user_prefs.json with your preferences

# 5. Run application
python -m jsa.cli run-once
```

---

## Performance Tuning

### For Optimal SQLite Performance

**1. Use WAL Mode (Write-Ahead Logging):**
```python
# Automatically enabled in JobSentinel
# Allows concurrent reads during writes
```

**2. Optimize Disk I/O:**
```bash
# Use SSD for database file
# Avoid network drives (SMB, NFS)
# Keep database file on local disk
```

**3. Database Maintenance:**
```bash
# Periodically vacuum to reclaim space
sqlite3 data/jobs.sqlite "VACUUM;"

# Analyze for query optimization
sqlite3 data/jobs.sqlite "ANALYZE;"
```

**4. Backup Strategy:**
```bash
# Simple file copy (database must be idle)
cp data/jobs.sqlite data/backup/jobs-$(date +%Y%m%d).sqlite

# Or use SQLite backup API (safer during use)
sqlite3 data/jobs.sqlite ".backup 'backup/jobs.sqlite'"
```

---

## Production Recommendations

### For Personal Use (Recommended)

1. **Backup Regularly:**
   - Copy `data/jobs.sqlite` to backup location daily
   - Keep 7 days of backups
   - Test restore procedure

2. **Monitor Disk Space:**
   - Database grows ~1-5 MB per 1,000 jobs
   - Run VACUUM monthly to reclaim space

3. **Security:**
   - Restrict file permissions (chmod 600 on Linux/Mac)
   - Keep database file in user directory
   - Never commit database file to git

### For Advanced Users

If you need multi-user or cloud deployments:

1. **Multiple Instances:** Each user runs their own JobSentinel instance
2. **Shared Storage:** Use file sync (Dropbox, Google Drive) to share data
3. **Consider Alternatives:** Enterprise job search tools designed for teams

---

## Database Schema

The SQLite database uses the following main tables:

### Job Table
- `id` - Primary key
- `hash` - Unique job identifier
- `title` - Job title
- `company` - Company name
- `location` - Job location
- `url` - Job posting URL
- `description` - Job description
- `score` - Match score (0.0-1.0)
- `source` - Job board source
- `remote` - Remote work flag
- `salary_min`, `salary_max`, `currency` - Salary information
- `created_at`, `updated_at`, `last_seen` - Timestamps
- `times_seen` - Number of times seen
- `included_in_digest`, `immediate_alert_sent` - Notification flags

### TrackedJob Table (CRM features)
- Kanban-style job tracking
- Custom stages and statuses
- Notes and follow-up dates
- Links to original job record

See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for complete schema details.

---

## Security Considerations

### Data Protection

**File Permissions:**
```bash
# Linux/Mac: Restrict to owner only
chmod 600 data/jobs.sqlite

# Windows: Use NTFS permissions
# Right-click → Properties → Security → Edit
```

**Encryption (Optional):**
```bash
# Use SQLCipher for encryption at rest
pip install sqlcipher3

# Configure encrypted database
DATABASE_URL="sqlite+pysqlcipher:///data/jobs.sqlite?cipher=aes-256-cbc&key=your-secret-key"
```

**Backup Security:**
- Encrypt backups before cloud storage
- Use encrypted file systems
- Never commit database to git

---

## Troubleshooting

### Database Locked

**Symptom:** "database is locked" error

**Solution:**
```bash
# Check for other processes accessing the database
lsof data/jobs.sqlite  # Linux/Mac
tasklist | findstr python  # Windows

# Close all JobSentinel instances
# Try again
```

### Database Corruption

**Symptom:** "database disk image is malformed"

**Solution:**
```bash
# Attempt recovery
sqlite3 data/jobs.sqlite ".recover" | sqlite3 recovered.sqlite

# If recovery fails, restore from backup
cp backup/jobs-backup.sqlite data/jobs.sqlite
```

### Slow Performance

**Symptom:** Queries taking >1 second

**Solution:**
```bash
# Analyze database
sqlite3 data/jobs.sqlite "ANALYZE;"

# Vacuum to optimize
sqlite3 data/jobs.sqlite "VACUUM;"

# Check indexes
sqlite3 data/jobs.sqlite ".indexes"
```

---

## Frequently Asked Questions

### Q: Can I use PostgreSQL instead?

**A:** No, PostgreSQL has been completely removed from JobSentinel as of v0.7.0. SQLite is the only supported database. This decision prioritizes:
- Simplicity (one database = less code)
- Privacy (no network service)
- Zero-admin deployment (no installation)

### Q: What about multi-user scenarios?

**A:** JobSentinel is designed for personal use (single user). For multi-user scenarios:
- Run separate instances per user
- Use shared file storage for collaboration
- Consider enterprise job search tools

### Q: Is SQLite fast enough?

**A:** Yes! SQLite handles 50K reads/sec and 10K writes/sec - far more than needed for personal job search. Tested with 1M+ jobs without issues.

### Q: How do I back up my data?

**A:** Simply copy the `data/jobs.sqlite` file:
```bash
cp data/jobs.sqlite backup/jobs-$(date +%Y%m%d).sqlite
```

### Q: Can I move my database to another computer?

**A:** Yes! SQLite is portable:
1. Copy `data/jobs.sqlite` to new computer
2. Update DATABASE_URL in .env if path changed
3. Database works identically on all platforms

---

## Migration from PostgreSQL (v0.6.0 → v0.7.0)

If you were using PostgreSQL in v0.6.0, here's how to migrate:

### Export Data from PostgreSQL

```bash
# Export job data to JSON
pg_dump -U jobsentinel -d jobsentinel --table=job --data-only --inserts > jobs.sql

# Convert to SQLite-compatible format (manual process)
# Or use pgloader tool
```

### Import to SQLite

```python
# Use Python script to import data
import json
import sqlite3
from pathlib import Path

# Connect to new SQLite database
conn = sqlite3.connect('data/jobs.sqlite')
cursor = conn.cursor()

# Import your data here
# (specific script depends on your data format)

conn.commit()
conn.close()
```

**Note:** Most users should start fresh with SQLite rather than migrating PostgreSQL data.

---

## Additional Resources

- [Database Schema Documentation](DATABASE_SCHEMA.md)
- [SQLite Official Documentation](https://www.sqlite.org/docs.html)
- [Python SQLite Tutorial](https://docs.python.org/3/library/sqlite3.html)
- [aiosqlite Documentation](https://aiosqlite.omnilib.dev/)

---

**Last Updated:** October 14, 2025 - Session 11  
**Questions?** Open an issue on GitHub
