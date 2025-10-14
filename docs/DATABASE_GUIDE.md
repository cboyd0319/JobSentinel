# Database Selection Guide

**TL;DR**: Use SQLite (default). Switch to PostgreSQL only if you need multi-user access or cloud deployment.

---

## Quick Decision Table

| Use Case | Database | Reason |
|----------|----------|--------|
| Personal job search | **SQLite** | Zero setup, file-based, private |
| Single user, local machine | **SQLite** | Simplest option, no server needed |
| Multiple users | PostgreSQL | Concurrent access support |
| Cloud deployment (AWS/GCP) | PostgreSQL | Better for networked environments |
| Docker/K8s | Either | SQLite for single replica, PostgreSQL for multi-replica |
| Shared team deployment | PostgreSQL | Multi-user access and permissions |

---

## SQLite (Default)

**When to Use**: Personal use, single user, local machine

### Benefits

- **Zero Setup** - No server installation required
- **File-Based** - All data in one file: `data/jobs.sqlite`
- **Privacy-First** - No network connections, data stays local
- **Simple Backups** - Copy one file
- **Zero Cost** - Completely free
- **No Maintenance** - No server to manage
- **Portable** - Move file between machines easily

### Limitations

- Single writer at a time (fine for personal use)
- No network access (data is local only)
- Max database size ~280TB (not a practical limit)

### Setup

Already configured! Just run JobSentinel:

```bash
# No configuration needed - works out of the box
python -m jsa.cli run-once
```

Database file created automatically at: `data/jobs.sqlite`

---

## PostgreSQL (Optional)

**When to Use**: Multi-user deployments, cloud hosting, team environments

### Benefits

- **Concurrent Access** - Multiple users simultaneously
- **Network Access** - Share database across machines
- **Advanced Features** - Full-text search, JSON queries, extensions
- **Scalability** - Handle millions of jobs efficiently
- **ACID Compliance** - Strong data consistency guarantees
- **Role-Based Access** - Fine-grained permissions

### Limitations

- Requires PostgreSQL server setup and maintenance
- Network latency on queries
- More complex backup/restore process
- Requires server resources (RAM, CPU, disk)
- Need to manage connections, backups, updates

### Setup

#### 1. Install PostgreSQL

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS (Homebrew):**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Windows:**
Download installer from https://www.postgresql.org/download/windows/

#### 2. Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE jobsentinel;
CREATE USER jobsentinel_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE jobsentinel TO jobsentinel_user;

# Exit PostgreSQL shell
\q
```

#### 3. Install Python Dependencies

```bash
pip install -e .[postgres]
```

This installs:
- `asyncpg` - Async PostgreSQL driver
- `psycopg2-binary` - Sync PostgreSQL driver

#### 4. Configure JobSentinel

Set the `DATABASE_URL` environment variable:

**Linux/macOS:**
```bash
export DATABASE_URL="postgresql+asyncpg://jobsentinel_user:your_secure_password@localhost:5432/jobsentinel"
```

**Windows (PowerShell):**
```powershell
$env:DATABASE_URL = "postgresql+asyncpg://jobsentinel_user:your_secure_password@localhost:5432/jobsentinel"
```

**Using .env file (recommended):**
```bash
# In .env file:
DATABASE_URL=postgresql+asyncpg://jobsentinel_user:your_secure_password@localhost:5432/jobsentinel
```

#### 5. Run JobSentinel

```bash
python -m jsa.cli run-once
```

JobSentinel will automatically:
- Detect PostgreSQL from DATABASE_URL
- Create tables on first run
- Use connection pooling for performance

---

## Connection String Format

### SQLite

```
sqlite+aiosqlite:///path/to/database.sqlite
```

Examples:
- `sqlite+aiosqlite:///data/jobs.sqlite` (relative path)
- `sqlite+aiosqlite:////absolute/path/jobs.sqlite` (absolute path)

### PostgreSQL

```
postgresql+asyncpg://username:password@host:port/database
```

Examples:
- `postgresql+asyncpg://user:pass@localhost:5432/jobsentinel` (local)
- `postgresql+asyncpg://user:pass@db.example.com:5432/jobs` (remote)
- `postgresql+asyncpg://user:pass@10.0.1.50:5432/jobsentinel` (IP address)

---

## Performance Comparison

### SQLite

| Metric | Value |
|--------|-------|
| Read queries | ~500/sec (local file) |
| Write queries | ~200/sec (single writer) |
| Concurrent readers | Unlimited |
| Concurrent writers | 1 |
| Latency | <1ms (local disk) |
| Setup time | 0 seconds |

### PostgreSQL

| Metric | Value |
|--------|-------|
| Read queries | ~1000+/sec (depends on hardware) |
| Write queries | ~500+/sec (concurrent) |
| Concurrent readers | Unlimited |
| Concurrent writers | Unlimited |
| Latency | 1-10ms (network + query) |
| Setup time | 15-30 minutes |

---

## Migration Between Databases

### SQLite to PostgreSQL

1. **Export SQLite data:**
```bash
sqlite3 data/jobs.sqlite .dump > backup.sql
```

2. **Edit backup.sql** - Remove SQLite-specific syntax

3. **Import to PostgreSQL:**
```bash
psql -U jobsentinel_user -d jobsentinel -f backup.sql
```

### PostgreSQL to SQLite

1. **Export PostgreSQL data:**
```bash
pg_dump -U jobsentinel_user jobsentinel > backup.sql
```

2. **Edit backup.sql** - Remove PostgreSQL-specific syntax

3. **Import to SQLite:**
```bash
sqlite3 data/jobs.sqlite < backup.sql
```

**Note**: Manual editing required for compatibility. Consider using data export/import features in JobSentinel instead.

---

## Backup Strategies

### SQLite

**Manual backup:**
```bash
cp data/jobs.sqlite data/jobs_backup_$(date +%Y%m%d).sqlite
```

**Automated backup:**
```bash
# Add to crontab for daily backups
0 2 * * * cp /path/to/data/jobs.sqlite /path/to/backups/jobs_$(date +\%Y\%m\%d).sqlite
```

### PostgreSQL

**Manual backup:**
```bash
pg_dump -U jobsentinel_user jobsentinel > backup_$(date +%Y%m%d).sql
```

**Automated backup:**
```bash
# Add to crontab for daily backups
0 2 * * * pg_dump -U jobsentinel_user jobsentinel > /path/to/backups/jobs_$(date +\%Y\%m\%d).sql
```

**Point-in-time recovery:**
Configure PostgreSQL WAL archiving for transaction-level recovery.

---

## Security Considerations

### SQLite

- **File permissions** - Restrict access to database file
- **Encryption at rest** - Use disk encryption (BitLocker, FileVault, LUKS)
- **No network exposure** - Data never leaves machine

### PostgreSQL

- **Network encryption** - Use SSL/TLS for connections
- **User authentication** - Strong passwords, consider certificate auth
- **Firewall rules** - Restrict access to PostgreSQL port (5432)
- **Regular updates** - Keep PostgreSQL server patched
- **Backup encryption** - Encrypt backup files

---

## Troubleshooting

### SQLite

**Error: "database is locked"**
- Cause: Another process using database
- Fix: Close other connections, reduce concurrent writes

**Error: "disk I/O error"**
- Cause: Disk full or permissions issue
- Fix: Check disk space, verify file permissions

### PostgreSQL

**Error: "could not connect to server"**
- Cause: PostgreSQL not running or wrong host/port
- Fix: Start PostgreSQL service, verify connection string

**Error: "password authentication failed"**
- Cause: Wrong username/password
- Fix: Verify credentials, check `pg_hba.conf`

**Error: "too many connections"**
- Cause: Connection pool exhausted
- Fix: Increase `max_connections` in `postgresql.conf`

---

## Recommendations

### For 95% of Users: Use SQLite

Unless you specifically need multi-user access, stick with SQLite:
- Simpler to use and maintain
- Faster for single-user workloads
- More private (no network access)
- Zero configuration
- Easier backups

### For Teams: Use PostgreSQL

If you're deploying for multiple users:
- Set up PostgreSQL on a server
- Use connection pooling (already configured)
- Implement regular backups
- Monitor server performance
- Consider managed PostgreSQL (AWS RDS, GCP Cloud SQL)

---

## Cost Analysis

### SQLite

- **Setup**: $0
- **Maintenance**: $0/month
- **Hosting**: $0 (local file)
- **Total**: **$0/month**

### PostgreSQL (Self-Hosted)

- **Setup**: Free (open source)
- **Maintenance**: 1-2 hours/month
- **Server**: $5-50/month (DigitalOcean, Linode)
- **Total**: **$5-50/month**

### PostgreSQL (Managed)

- **Setup**: Free
- **Maintenance**: Minimal (managed by provider)
- **Service**: $15-200/month (AWS RDS, GCP Cloud SQL)
- **Total**: **$15-200/month**

---

## Related Documentation

- [DEPLOYMENT_GUIDE.md](/docs/DEPLOYMENT_GUIDE.md) - Production deployment
- [ARCHITECTURE.md](/docs/ARCHITECTURE.md) - System design
- [SECURITY.md](/SECURITY.md) - Security best practices

---

**Last Updated**: October 14, 2025  
**Maintainer**: JobSentinel Team  
**License**: MIT
