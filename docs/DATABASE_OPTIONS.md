# Database Options & Architecture

**Version:** 0.6.0  
**Last Updated:** October 13, 2025  
**Purpose:** Comprehensive database strategy for local-first and cloud deployments

---

## Executive Summary

JobSentinel uses SQLite by default for its local-first philosophy, but supports PostgreSQL for cloud/multi-user deployments. This document covers when to use each option and how to configure them.

---

## Database Comparison

### SQLite (Default) ✅ RECOMMENDED for Local

**Use Cases:**
- Personal use (single user)
- Local development
- Docker deployments (single instance)
- Privacy-first deployments
- No external dependencies

**Pros:**
- ✅ Zero configuration required
- ✅ No server to manage
- ✅ Perfect for local-first philosophy
- ✅ Fast for read-heavy workloads
- ✅ Built into Python standard library
- ✅ Portable (single file)
- ✅ ACID compliant
- ✅ Good performance up to 1M+ jobs

**Cons:**
- ⚠️  Single-writer limitation
- ⚠️  Not ideal for high-concurrency writes
- ⚠️  Limited horizontal scaling

**Performance Characteristics:**
- Read: ~100K ops/sec
- Write: ~10K ops/sec (single writer)
- Storage: ~1-5 MB per 1,000 jobs
- Maximum DB size: 281 TB (practical limit: 100s of GB)

### PostgreSQL (Optional) 🚀 RECOMMENDED for Cloud

**Use Cases:**
- Cloud deployments (AWS, GCP, Azure)
- Multi-user/team deployments
- High-concurrency write scenarios
- Need for horizontal scaling
- Backup/replication requirements

**Pros:**
- ✅ Excellent concurrency handling
- ✅ Advanced indexing and query optimization
- ✅ Built-in replication
- ✅ JSON support for flexible schemas
- ✅ Full-text search capabilities
- ✅ Industry standard (PostgreSQL 15+)

**Cons:**
- ⚠️  Requires external service/management
- ⚠️  Additional operational complexity
- ⚠️  Cost ($15-50/month for managed services)
- ⚠️  Network latency considerations

**Performance Characteristics:**
- Read: ~50K ops/sec (single instance)
- Write: ~20K ops/sec (MVCC)
- Storage: Similar to SQLite (~1-5 MB per 1,000 jobs)
- Scalability: Horizontal via replication/sharding

---

## Configuration

### SQLite Configuration (Default)

**Connection String:**
```python
# Local file (default)
DATABASE_URL = "sqlite+aiosqlite:///data/jobs.sqlite"

# In-memory (testing only)
DATABASE_URL = "sqlite+aiosqlite:///:memory:"
```

**Optimization Settings:**
```python
# Enable WAL mode for better concurrency
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA cache_size=-64000;  # 64MB cache
PRAGMA temp_store=MEMORY;
```

**Backup Strategy:**
```bash
# Automatic backup
sqlite3 data/jobs.sqlite ".backup data/jobs.backup.sqlite"

# Export to SQL
sqlite3 data/jobs.sqlite .dump > backup.sql
```

### PostgreSQL Configuration

**Connection String:**
```python
# Local PostgreSQL
DATABASE_URL = "postgresql+asyncpg://user:pass@localhost:5432/jobsentinel"

# Cloud managed (RDS, Cloud SQL, etc.)
DATABASE_URL = "postgresql+asyncpg://user:pass@host.region.rds.amazonaws.com:5432/jobsentinel"
```

**Required Setup:**
```sql
-- Create database
CREATE DATABASE jobsentinel;

-- Create user
CREATE USER jobsentinel_app WITH PASSWORD 'secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE jobsentinel TO jobsentinel_app;

-- Enable extensions (optional)
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For fuzzy text search
CREATE EXTENSION IF NOT EXISTS btree_gin;  -- For better indexing
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

## Migration Path

### SQLite → PostgreSQL Migration

**Step 1: Export from SQLite**
```bash
# Install pgloader
brew install pgloader  # macOS
apt install pgloader   # Ubuntu

# Export SQLite to PostgreSQL
pgloader sqlite://data/jobs.sqlite postgresql://user:pass@host/jobsentinel
```

**Step 2: Verify Migration**
```bash
# Check row counts
psql -h host -U user jobsentinel -c "SELECT COUNT(*) FROM jobs;"
sqlite3 data/jobs.sqlite "SELECT COUNT(*) FROM jobs;"
```

**Step 3: Update Configuration**
```bash
# Update .env
echo "DATABASE_URL=postgresql+asyncpg://user:pass@host/jobsentinel" >> .env

# Restart application
python -m jsa.cli run-once
```

---

## Performance Tuning

### SQLite Optimization

**1. Enable WAL Mode**
```sql
PRAGMA journal_mode=WAL;
```
- Better concurrency (readers don't block writers)
- Faster transactions
- Atomic commits

**2. Optimize Cache**
```sql
PRAGMA cache_size=-64000;  -- 64MB cache
```

**3. Batch Inserts**
```python
# Instead of:
for job in jobs:
    session.add(job)
    session.commit()

# Use:
session.add_all(jobs)
session.commit()
```

### PostgreSQL Optimization

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

### Local Deployments
**Use SQLite** with these settings:
- WAL mode enabled
- Regular backups (daily)
- 64MB cache size
- File-based storage on SSD

### Cloud Deployments (Single User)
**Use SQLite** with:
- Persistent volume (EBS, Persistent Disk)
- Automated backups to S3/GCS
- Consider PostgreSQL if scaling beyond 100K jobs

### Cloud Deployments (Multi-User/Team)
**Use PostgreSQL** with:
- Managed service (RDS, Cloud SQL)
- Connection pooling
- Read replicas for scaling
- Point-in-time recovery enabled

---

## Decision Matrix

| Scenario | SQLite | PostgreSQL |
|----------|--------|------------|
| Personal use | ✅ Yes | ❌ No |
| Team (2-5 users) | ⚠️  Maybe | ✅ Yes |
| Team (5+ users) | ❌ No | ✅ Yes |
| Cloud deployment (single user) | ✅ Yes | ⚠️  Optional |
| Cloud deployment (multi-user) | ❌ No | ✅ Yes |
| < 100K jobs | ✅ Yes | ⚠️  Optional |
| 100K-1M jobs | ✅ Yes | ⚠️  Recommended |
| 1M+ jobs | ⚠️  Maybe | ✅ Yes |
| Privacy-first | ✅ Yes | ⚠️  Depends |
| Zero-config | ✅ Yes | ❌ No |

---

## Cost Analysis

### SQLite
- **Infrastructure:** $0 (local) or $5-15/month (cloud storage)
- **Management:** $0 (no server)
- **Backup:** $0-2/month (S3/GCS)
- **Total:** $0-17/month

### PostgreSQL Managed Services
- **AWS RDS (db.t4g.micro):** $15-20/month
- **GCP Cloud SQL (db-f1-micro):** $10-15/month
- **Azure Database (B1ms):** $15-20/month
- **Backup:** Included in managed services
- **Total:** $10-20/month

---

## Security Considerations

### SQLite
- File permissions: `chmod 600 data/jobs.sqlite`
- Encryption at rest: Use filesystem encryption (LUKS, BitLocker, FileVault)
- Encryption in transit: N/A (local file)

### PostgreSQL
- SSL/TLS required for all connections
- Strong passwords (16+ characters)
- Network firewall (allow only application IPs)
- Encryption at rest (managed service default)
- Regular security patches

---

## Monitoring & Health Checks

### SQLite
```python
# Check database size
os.path.getsize("data/jobs.sqlite") / (1024 * 1024)  # MB

# Check integrity
sqlite3 data/jobs.sqlite "PRAGMA integrity_check;"

# Vacuum (reclaim space)
sqlite3 data/jobs.sqlite "VACUUM;"
```

### PostgreSQL
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

**For most users:** Stick with SQLite. It's fast, reliable, and aligns with the local-first philosophy.

**When to switch to PostgreSQL:**
1. Team deployments (5+ concurrent users)
2. High write concurrency requirements
3. Need for replication/high availability
4. Regulatory requirements for managed databases
5. Scaling beyond 1M jobs

**Remember:** JobSentinel's architecture supports both seamlessly via SQLAlchemy. You can always migrate later if needs change.
