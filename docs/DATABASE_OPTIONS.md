# Database Architecture & Configuration

**Version:** 0.6.0+  
**Last Updated:** October 14, 2025  
**Purpose:** SQLite-first database strategy for privacy and zero-admin deployments

---

## Executive Summary

JobSentinel uses **SQLite as the default database** for maximum privacy, zero setup, and no admin rights requirements. PostgreSQL is available as an optional enhancement for advanced use cases (teams, cloud, multi-user).

---

## Database Options

### SQLite (Default) 🚀 RECOMMENDED for Personal Use

**Use Cases:**
- Personal use (primary use case - 99% of users)
- Single-user local deployments
- Privacy-first applications
- Portable installations
- Zero-admin Windows deployments

**Pros:**
- ✅ **ZERO SETUP** - No installation or configuration required
- ✅ **NO ADMIN RIGHTS** - Works for all users on Windows/Mac/Linux
- ✅ **100% PRIVATE** - Single file, no network service, no exposure
- ✅ **PORTABLE** - Copy database file anywhere, instant backup
- ✅ **FAST** - Excellent performance for single-user (<1M jobs)
- ✅ **CROSS-PLATFORM** - Identical behavior on all platforms
- ✅ **LIGHTWEIGHT** - ~2-10 MB disk space (scales with job count)
- ✅ **ZERO DEPENDENCIES** - Built into Python, always available
- ✅ **PRIVACY-FIRST** - No service to secure, no ports to configure

**Cons:**
- ⚠️  Single-writer limitation (fine for personal use)
- ⚠️  Limited advanced features vs PostgreSQL (no full-text search indexes)
- ⚠️  Less suitable for multi-user scenarios

**Performance Characteristics:**
- Read: ~50K ops/sec (on SSD)
- Write: ~10K ops/sec (single-writer)
- Storage: ~1-5 MB per 1,000 jobs
- Scalability: Excellent up to 1M jobs (tested)

### PostgreSQL (Optional) 🔧 For Advanced Use Cases

**Use Cases:**
- Multi-user/team deployments
- Cloud deployments (AWS, GCP, Azure)
- High-concurrency scenarios
- Advanced database features (full-text search, JSON operations)
- Horizontal scaling needs

**Pros:**
- ✅ Multi-user concurrent access
- ✅ Advanced indexing and query optimization
- ✅ Built-in replication capabilities
- ✅ JSON support for flexible schemas
- ✅ Full-text search capabilities
- ✅ Industry standard with excellent tooling
- ✅ Excellent for teams and cloud

**Cons:**
- ⚠️  Requires installation (one-time setup)
- ⚠️  May require admin rights on Windows
- ⚠️  ~50-100MB disk space for server
- ⚠️  More memory usage (~100-200MB) vs SQLite
- ⚠️  Network service to secure and configure

**Performance Characteristics:**
- Read: ~50K ops/sec (single instance)
- Write: ~20K ops/sec (MVCC)
- Storage: ~1-5 MB per 1,000 jobs
- Scalability: Horizontal via replication/sharding

---

## Configuration

### SQLite Configuration (Default)

**Installation:**

SQLite support is included in the core installation:

```bash
# Standard installation includes SQLite (default)
pip install -e .

# This includes:
# - aiosqlite (async SQLite driver)
# - SQLite is built into Python, no separate installation needed
```

**Connection String:**
```bash
# In .env file (default)
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

### PostgreSQL Configuration (Optional)

**Installation:**

PostgreSQL requires optional dependencies:

```bash
# Install with PostgreSQL support
pip install -e '.[postgres]'

# This includes:
# - asyncpg (async PostgreSQL driver)
# - psycopg2-binary (sync PostgreSQL driver)
```

**PostgreSQL Server Installation:**

See [POSTGRESQL_SETUP.md](POSTGRESQL_SETUP.md) for detailed installation instructions for:
- macOS (Homebrew or Postgres.app)
- Linux (apt, dnf, or source)
- Windows (official installer or Chocolatey)

**Connection String:**
```bash
# In .env file
DATABASE_URL="postgresql+asyncpg://user:password@localhost:5432/jobsentinel"

# For cloud managed services (RDS, Cloud SQL, etc.)
DATABASE_URL="postgresql+asyncpg://user:password@host.region.rds.amazonaws.com:5432/jobsentinel"
```

**PostgreSQL Server Setup:**

**Option 1: Local Installation**
```bash
# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-17

# Windows
# Download from: https://www.postgresql.org/download/windows/
```

**Option 2: Docker**
```bash
docker run -d \
  --name jobsentinel-db \
  -e POSTGRES_DB=jobsentinel \
  -e POSTGRES_USER=jobsentinel_app \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 \
  postgres:15

# Connection string:
# DATABASE_URL=postgresql+asyncpg://jobsentinel_app:your_secure_password@localhost:5432/jobsentinel
```

**Option 3: Managed Services**
- **AWS RDS:** [Setup Guide](https://aws.amazon.com/rds/postgresql/)
- **GCP Cloud SQL:** [Setup Guide](https://cloud.google.com/sql/docs/postgres)
- **Azure Database:** [Setup Guide](https://azure.microsoft.com/en-us/products/postgresql/)

**Database Setup (SQL):**
```sql
-- Connect to PostgreSQL as admin
psql -U postgres

-- Create database
CREATE DATABASE jobsentinel;

-- Create application user
CREATE USER jobsentinel_app WITH PASSWORD 'your_secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE jobsentinel TO jobsentinel_app;

-- Connect to the new database
\c jobsentinel

-- Grant schema permissions (PostgreSQL 17+)
GRANT ALL ON SCHEMA public TO jobsentinel_app;
GRANT ALL ON ALL TABLES IN SCHEMA public TO jobsentinel_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO jobsentinel_app;

-- Optional: Enable extensions for better performance
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- Fuzzy text search
CREATE EXTENSION IF NOT EXISTS btree_gin;   -- Better indexing
```

**Using Setup Wizard:**
```bash
# Run interactive setup wizard
python -m jsa.cli setup

# When prompted:
# 1. Choose "sqlite" (default) for instant zero-setup start
# 2. Or choose "postgresql" for advanced features
# Wizard guides you through configuration
# Automatically creates .env file with DATABASE_URL
```

**Optimization Settings:**
```sql
-- Connection pooling (recommended)
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 16MB

-- Performance tuning
random_page_cost = 1.1  # SSD optimization
effective_io_concurrency = 200
```

---

## Quick Start

### New Installation (Recommended: SQLite)

```bash
# 1. Install JobSentinel (no database setup needed!)
pip install -e .

# 2. Run setup wizard
python -m jsa.cli setup

# When asked about database:
# - Choose "sqlite" (default) - Ready instantly!
# - Or choose "postgresql" for advanced features

# 3. Start using JobSentinel
python -m jsa.cli run-once
```

### Advanced Installation (PostgreSQL)

```bash
# 1. Install PostgreSQL (see POSTGRESQL_SETUP.md)
# macOS: brew install postgresql@17
# Ubuntu: sudo apt install postgresql-17
# Windows: Download from postgresql.org

# 2. Install PostgreSQL drivers
pip install -e '.[postgres]'

# 3. Run setup wizard
python -m jsa.cli setup

# Choose "postgresql" when prompted
# Wizard will guide you through:
# - PostgreSQL installation check
# - Database and user creation
# - Connection testing
# - Configuration save
```

### Manual Configuration

If you prefer manual setup or have an existing PostgreSQL installation:

```bash
# 1. Create database and user
psql -U postgres
CREATE DATABASE jobsentinel;
CREATE USER jobsentinel WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE jobsentinel TO jobsentinel;

# 2. Update .env file
echo "DATABASE_URL=postgresql+asyncpg://jobsentinel:your_password@localhost:5432/jobsentinel" >> .env

# 3. Test connection
python -m jsa.cli health
```

---

## Performance Tuning

### PostgreSQL Optimization (Local Single-User)

**1. Proper Indexing**
```sql
-- Indexes for common queries
CREATE INDEX idx_jobs_score ON jobs(score DESC);
CREATE INDEX idx_jobs_created_at ON jobs(created_at DESC);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_location ON jobs(location);

-- Full-text search index
CREATE INDEX idx_jobs_description_fts ON jobs USING GIN(to_tsvector('english', description));
```

**2. Connection Pooling**
```python
from sqlalchemy.pool import NullPool, QueuePool

# Development (no pooling)
engine = create_async_engine(DATABASE_URL, poolclass=NullPool)

# Production (pooling)
engine = create_async_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,  # Verify connections before use
)
```

**3. Query Optimization**
```python
# Use indexes
session.query(Job).filter(Job.score > 0.8).order_by(Job.score.desc())

# Avoid N+1 queries
session.query(Job).options(joinedload(Job.activities)).all()
```

---

## Production Recommendations

### Local Deployments (Primary Use Case)
**Use PostgreSQL** with these settings:
- Local installation (not cloud/managed)
- Connection pooling (10 connections, 5 overflow)
- Regular backups with `pg_dump`
- SSD storage for best performance

### Cloud Deployments (Single User)
**Use PostgreSQL** with:
- Persistent volume (EBS, Persistent Disk)
- Automated backups to S3/GCS
- Same connection pooling as local

### Cloud Deployments (Multi-User/Team)
**Use PostgreSQL** with:
- Managed service (RDS, Cloud SQL) optional
- Increased connection pooling (20+ connections)
- Read replicas for scaling (optional)
- Point-in-time recovery enabled

---

## Deployment Matrix

| Scenario | SQLite | PostgreSQL | Recommendation |
|----------|--------|------------|----------------|
| Personal use | ✅ Perfect | ✅ Good | **SQLite** - Zero setup |
| Team (2-5 users) | ❌ No | ✅ Yes | PostgreSQL - Multi-user support |
| Team (5+ users) | ❌ No | ✅ Yes | PostgreSQL - Managed service |
| Cloud deployment (single user) | ✅ Good | ✅ Good | **SQLite** - Simpler |
| Cloud deployment (multi-user) | ❌ No | ✅ Yes | PostgreSQL - Managed service |
| < 100K jobs | ✅ Excellent | ✅ Excellent | **SQLite** - Simpler |
| 100K-1M jobs | ✅ Good | ✅ Excellent | Either works well |
| 1M+ jobs | ⚠️ Slower | ✅ Excellent | PostgreSQL - Better scaling |
| Privacy-first | ✅ Perfect | ✅ Good | **SQLite** - Single file |
| Zero-admin Windows | ✅ Perfect | ❌ Needs admin | **SQLite** - No admin rights |
| Cross-platform | ✅ Perfect | ✅ Good | Both work identically |

---

## Cost Analysis

### SQLite (Default)
- **Infrastructure:** $0 (single file on your disk)
- **Management:** $0 (zero setup)
- **Backup:** $0 (copy file)
- **Admin Rights:** NONE required
- **Total:** **$0/month, $0 setup**

### PostgreSQL Local Installation
- **Infrastructure:** $0 (runs on your machine)
- **Management:** $0 (one-time setup)
- **Backup:** $0 (local backup scripts)
- **Admin Rights:** May be required (Windows)
- **Total:** **$0/month**

### PostgreSQL Managed Services (Optional)
Only needed for team/cloud deployments:
- **AWS RDS (db.t4g.micro):** $15-20/month
- **GCP Cloud SQL (db-f1-micro):** $10-15/month
- **Azure Database (B1ms):** $15-20/month
- **Backup:** Included in managed services
- **Total:** $10-20/month

**Recommendation:** Use SQLite for personal use (instant, zero cost, zero admin)

---

## Security Considerations

### PostgreSQL Local Installation
- User permissions: Dedicated `jobsentinel` user with limited privileges
- Local-only connections: PostgreSQL bound to localhost (127.0.0.1)
- Strong passwords: Use password manager or generate secure passwords
- Encryption at rest: Use filesystem encryption (LUKS, BitLocker, FileVault)
- Encryption in transit: N/A (local connections use Unix sockets)

### PostgreSQL Cloud/Managed Service
- SSL/TLS required for all connections
- Strong passwords (16+ characters)
- Network firewall (allow only application IPs)
- Encryption at rest (managed service default)
- Regular security patches

---

## Monitoring & Health Checks

### JobSentinel Health Check
```bash
# Check database connection and status
python -m jsa.cli health

# Should output:
# ✓ Database: Connected (PostgreSQL 17.x)
# ✓ Connection pool: Active
# ✓ Jobs in database: 1,234
```

### PostgreSQL Status
```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('jobsentinel'));

-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'jobsentinel';

-- Check slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Conclusion

**For personal use (99% of users):** SQLite is the recommended default. It provides:
- ✅ **ZERO SETUP** - Instant start, no installation
- ✅ **NO ADMIN RIGHTS** - Works for all users on all platforms
- ✅ **100% PRIVATE** - Single file, no network service
- ✅ **PORTABLE** - Copy file anywhere, instant backup
- ✅ **FAST** - Excellent performance for personal use

**For teams and advanced use:** PostgreSQL is available as an optional enhancement:
- ✅ Multi-user support
- ✅ Advanced database features
- ✅ Better scalability (1M+ jobs)
- ✅ Cloud deployment ready

**Getting Started:**
1. Install JobSentinel: `pip install -e .`
2. Run setup wizard: `python -m jsa.cli setup`
3. Choose SQLite (default) for instant zero-setup start
4. Start using JobSentinel!

**Remember:** SQLite is 100% local and private. All data stays on your computer in a single file.
