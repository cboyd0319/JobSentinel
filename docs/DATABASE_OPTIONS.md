# Database Architecture & Configuration

**Version:** 0.6.0+  
**Last Updated:** October 14, 2025  
**Purpose:** PostgreSQL-first database strategy for cross-platform deployments

---

## Executive Summary

JobSentinel uses PostgreSQL as its primary database engine for cross-platform compatibility, better performance, and industry-standard reliability. PostgreSQL runs locally on your machine, maintaining the same privacy-first philosophy.

---

## Why PostgreSQL?

### PostgreSQL (Primary) 🚀 RECOMMENDED for All Deployments

**Use Cases:**
- Local single-user deployments (primary use case)
- Cloud deployments (AWS, GCP, Azure)
- Multi-user/team deployments
- High-concurrency scenarios
- Cross-platform compatibility (macOS, Linux, Windows)

**Pros:**
- ✅ Cross-platform (macOS, Linux, Windows installers)
- ✅ Excellent concurrency handling
- ✅ Advanced indexing and query optimization
- ✅ Built-in replication capabilities
- ✅ JSON support for flexible schemas
- ✅ Full-text search capabilities
- ✅ Industry standard with excellent tooling
- ✅ 100% local and private (no cloud required)
- ✅ Better performance for complex queries

**Cons:**
- ⚠️  Requires installation (one-time setup)
- ⚠️  ~50-100MB disk space for PostgreSQL server
- ⚠️  Slightly more memory usage (~100-200MB) vs SQLite

**Performance Characteristics:**
- Read: ~50K ops/sec (single instance)
- Write: ~20K ops/sec (MVCC)
- Storage: Similar to SQLite (~1-5 MB per 1,000 jobs)
- Scalability: Horizontal via replication/sharding

---

## Configuration

### PostgreSQL Configuration (Primary)

**Installation:**

PostgreSQL drivers are now included in the core installation:

```bash
# Standard installation includes PostgreSQL drivers
pip install -e .

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

# When prompted, choose PostgreSQL
# Wizard will guide you through configuration
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

### New Installation

```bash
# 1. Install PostgreSQL (see POSTGRESQL_SETUP.md)
# macOS: brew install postgresql@17
# Ubuntu: sudo apt install postgresql-17
# Windows: Download from postgresql.org

# 2. Run setup wizard
python -m jsa.cli setup

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

| Scenario | PostgreSQL | Notes |
|----------|------------|-------|
| Personal use | ✅ Recommended | Local installation, privacy-first |
| Team (2-5 users) | ✅ Yes | Local or managed service |
| Team (5+ users) | ✅ Yes | Managed service recommended |
| Cloud deployment (single user) | ✅ Yes | Local installation in VM/container |
| Cloud deployment (multi-user) | ✅ Yes | Managed service (RDS, Cloud SQL) |
| < 100K jobs | ✅ Yes | Excellent performance |
| 100K-1M jobs | ✅ Yes | Great performance with tuning |
| 1M+ jobs | ✅ Yes | Add read replicas if needed |
| Privacy-first | ✅ Yes | 100% local, no cloud required |
| Cross-platform | ✅ Yes | Works on macOS, Linux, Windows |

---

## Cost Analysis

### PostgreSQL Local Installation
- **Infrastructure:** $0 (runs on your machine)
- **Management:** $0 (one-time setup)
- **Backup:** $0 (local backup scripts)
- **Total:** **$0/month**

### PostgreSQL Managed Services (Optional)
Only needed for team/cloud deployments:
- **AWS RDS (db.t4g.micro):** $15-20/month
- **GCP Cloud SQL (db-f1-micro):** $10-15/month
- **Azure Database (B1ms):** $15-20/month
- **Backup:** Included in managed services
- **Total:** $10-20/month

**Recommendation:** Use local PostgreSQL for personal use (free forever)

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

**For all users:** PostgreSQL is now the standard database for JobSentinel. It provides:
- ✅ Cross-platform compatibility (macOS, Linux, Windows)
- ✅ Better performance and scalability
- ✅ Industry-standard reliability
- ✅ 100% local and private by default
- ✅ Excellent tooling and community support

**Getting Started:**
1. Install PostgreSQL (see [POSTGRESQL_SETUP.md](POSTGRESQL_SETUP.md))
2. Run setup wizard: `python -m jsa.cli setup`
3. Start using JobSentinel!

**Remember:** PostgreSQL runs locally on your machine by default. All data stays private and secure on your computer.
