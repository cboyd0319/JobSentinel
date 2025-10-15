# Cloud Deployment Guide

Deploy JobSentinel to production with AWS, GCP, or Azure.

**Version:** 0.9.0  
**Last Updated:** October 14, 2025  
**Audience:** DevOps engineers, SREs

---

## TL;DR

**Local setup?** → [QUICKSTART.md](QUICKSTART.md)  
**Need cloud?** → Read below for AWS ($5/mo), GCP ($8/mo), or Azure ($10/mo)

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Docker Images](#docker-images)
3. [AWS Lambda + EventBridge](#aws-lambda--eventbridge)
4. [Google Cloud Run](#google-cloud-run)
5. [Azure Container Instances](#azure-container-instances)
6. [Monitoring & Observability](#monitoring--observability)
7. [Backup & Disaster Recovery](#backup--disaster-recovery)
8. [Scaling Strategies](#scaling-strategies)
9. [Security Hardening](#security-hardening)
10. [Troubleshooting](#troubleshooting)
11. [Cost Optimization](#cost-optimization)

---

## Cloud Options

| Provider | Service | Cost/month | Setup Time | Best For |
|----------|---------|------------|------------|----------|
| AWS | Lambda + EventBridge | $5-10 | 30 min | AWS shops, serverless |
| GCP | Cloud Run | $8-15 | 20 min | Container-first, simple |
| Azure | Container Instances | $10-20 | 30 min | Microsoft shops |
| Any | Kubernetes | $50+ | 4+ hours | Enterprise, multi-tenant |

**Recommendation:** Start with GCP Cloud Run (easiest) or AWS Lambda (cheapest).

---

## ✅ Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing (`make test`)
  ```bash
  make test
  # Expected: All tests pass, coverage ≥85%
  ```

- [ ] Linters clean (`make lint`)
  ```bash
  make lint
  # Expected: No errors from ruff
  ```

- [ ] Type checking passing (`make type`)
  ```bash
  make type
  # Expected: No mypy errors in src/jsa
  ```

- [ ] Security scan clean (`make security`)
  ```bash
  make security
  # Expected: No critical/high vulnerabilities from bandit
  ```

### Configuration

- [ ] Secrets in environment variables (not code)
  ```bash
  # Check .env file exists and has required secrets
  grep -q "SLACK_WEBHOOK_URL" .env
  grep -q "DATABASE_URL" .env
  ```

- [ ] Configuration validated
  ```bash
  python -m jsa.cli config-validate --path config/user_prefs.json
  ```

- [ ] API keys tested
  ```bash
  # Test Slack webhook
  curl -X POST \
    -H 'Content-type: application/json' \
    --data '{"text":"JobSentinel deployment test"}' \
    $SLACK_WEBHOOK_URL
  ```

### Infrastructure

- [ ] Database initialized
  ```bash
  python -m jsa.cli db-init
  ```

- [ ] Storage provisioned (5-10GB for SQLite data)
  ```bash
  df -h data/
  ```

- [ ] Network connectivity verified
  ```bash
  # Test job board access
  curl -I https://jobs.github.com
  curl -I https://reed.co.uk
  ```

### Monitoring

- [ ] Log aggregation configured
- [ ] Error tracking enabled (Sentry, Rollbar)
- [ ] Uptime monitoring configured (UptimeRobot, Pingdom)
- [ ] Alert channels tested

### Documentation

- [ ] Runbook created (see template below)
- [ ] Incident response plan documented
- [ ] Rollback procedures tested
- [ ] On-call rotation defined (if team deployment)

---

## 🐳 Docker Deployment

### Production Dockerfile

```dockerfile
# docker/Dockerfile (production-ready)
FROM python:3.11-slim AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 -s /bin/bash jobsentinel

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (if needed)
RUN playwright install chromium && playwright install-deps

# Copy application code
COPY --chown=jobsentinel:jobsentinel . .

# Install package in editable mode
RUN pip install -e .

# Switch to non-root user
USER jobsentinel

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -m jsa.cli health-check || exit 1

# Default command
CMD ["python", "-m", "jsa.cli", "run-daemon", "--interval", "7200"]
```

### Docker Compose Production Setup

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  jobsentinel:
    build:
      context: .
      dockerfile: docker/Dockerfile
    container_name: jobsentinel
    restart: unless-stopped
    
    environment:
      # Load from .env file
      - DATABASE_URL=${DATABASE_URL}
      - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}
      - LOG_LEVEL=${LOG_LEVEL:-INFO}
      - ENABLE_METRICS=${ENABLE_METRICS:-true}
      - SENTRY_DSN=${SENTRY_DSN}
    
    volumes:
      # Read-only config
      - ./config:/app/config:ro
      # Persistent data
      - jobsentinel-data:/app/data
      # Logs (optional, if not using centralized logging)
      - jobsentinel-logs:/app/logs
    
    # Resource limits
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
    
    # Logging configuration
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    
    # Health check
    healthcheck:
      test: ["CMD", "python", "-m", "jsa.cli", "health-check"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  jobsentinel-data:
    driver: local
  jobsentinel-logs:
    driver: local
```

### Deployment Commands

```bash
# Build production image
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check health
docker-compose -f docker-compose.prod.yml ps

# Stop services
docker-compose -f docker-compose.prod.yml down

# Update and restart
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

---

## ☁️ Cloud Deployment

### AWS Lambda + EventBridge

**Architecture:**
```
EventBridge (Cron) → Lambda Function → DynamoDB (or RDS)
                              ↓
                         Slack Alerts
```

**Setup Steps:**

1. **Package application:**
   ```bash
   # Install dependencies to package directory
   pip install -r requirements.txt -t package/
   cp -r src package/
   cd package && zip -r ../jobsentinel.zip . && cd ..
   ```

2. **Create Lambda function:**
   ```bash
   aws lambda create-function \
     --function-name jobsentinel \
     --runtime python311 \
     --handler jsa.cli.lambda_handler \
     --zip-file fileb://jobsentinel.zip \
     --role arn:aws:iam::ACCOUNT_ID:role/lambda-execution-role \
     --timeout 900 \
     --memory-size 1024 \
     --environment Variables="{
       SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL},
       DATABASE_URL=${DATABASE_URL},
       LOG_LEVEL=INFO
     }"
   ```

3. **Configure EventBridge schedule:**
   ```bash
   # Create rule for every 2 hours
   aws events put-rule \
     --name jobsentinel-schedule \
     --schedule-expression "rate(2 hours)"
   
   # Add Lambda as target
   aws events put-targets \
     --rule jobsentinel-schedule \
     --targets "Id"="1","Arn"="arn:aws:lambda:REGION:ACCOUNT:function:jobsentinel"
   ```

**Cost Estimate:**
- Lambda: $0.20 per 1M requests + compute time
- DynamoDB: $1.25 per million read/write requests
- **Total: ~$5-10/month**

### Google Cloud Run

**Architecture:**
```
Cloud Scheduler → Cloud Run Service → Cloud SQL (or Firestore)
                            ↓
                      Slack Alerts
```

**Setup Steps:**

1. **Build and push container:**
   ```bash
   # Authenticate with GCP
   gcloud auth configure-docker
   
   # Build container
   docker build -f docker/Dockerfile -t gcr.io/PROJECT_ID/jobsentinel:latest .
   
   # Push to GCR
   docker push gcr.io/PROJECT_ID/jobsentinel:latest
   ```

2. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy jobsentinel \
     --image gcr.io/PROJECT_ID/jobsentinel:latest \
     --platform managed \
     --region us-central1 \
     --memory 1Gi \
     --timeout 900s \
     --set-env-vars "SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL}" \
     --set-env-vars "DATABASE_URL=${DATABASE_URL}" \
     --set-env-vars "LOG_LEVEL=INFO" \
     --no-allow-unauthenticated
   ```

3. **Configure Cloud Scheduler:**
   ```bash
   gcloud scheduler jobs create http jobsentinel-cron \
     --schedule "0 */2 * * *" \
     --uri "https://jobsentinel-XXX-uc.a.run.app/run" \
     --http-method POST \
     --oidc-service-account-email ACCOUNT@PROJECT.iam.gserviceaccount.com
   ```

**Cost Estimate:**
- Cloud Run: $0.024 per GB-hour
- Cloud Scheduler: $0.10 per job per month
- **Total: ~$8-15/month**

### Azure Container Instances

**Setup Steps:**

1. **Create resource group:**
   ```bash
   az group create --name jobsentinel-rg --location eastus
   ```

2. **Deploy container:**
   ```bash
   az container create \
     --resource-group jobsentinel-rg \
     --name jobsentinel \
     --image jobsentinel:latest \
     --cpu 1 \
     --memory 1 \
     --restart-policy OnFailure \
     --environment-variables \
       SLACK_WEBHOOK_URL=$SLACK_WEBHOOK_URL \
       DATABASE_URL=$DATABASE_URL
   ```

3. **Configure Logic Apps for scheduling:**
   ```bash
   # Create Logic App with recurrence trigger (every 2 hours)
   # → HTTP action to restart container
   ```

**Cost Estimate:**
- Container Instances: $0.013 per vCPU per hour
- **Total: ~$10-20/month**

---

## 📊 Monitoring & Observability

### Application Metrics

**Key Metrics to Track:**

| Metric | Type | Threshold | Action |
|--------|------|-----------|--------|
| `jobs.scraped.count` | Counter | > 0 | Alert if 0 for 6 hours |
| `scraper.error.rate` | Gauge | < 5% | Alert if > 10% |
| `scraper.latency.p95` | Histogram | < 10s | Alert if > 30s |
| `alerts.sent.count` | Counter | - | Track delivery |
| `database.size.mb` | Gauge | < 1000MB | Alert if > 5000MB |

### Structured Logging

**Log Format:**
```json
{
  "timestamp": "2025-10-12T10:30:00.000Z",
  "level": "INFO",
  "logger": "sources.jobswithgpt_scraper",
  "message": "Scrape completed",
  "extra": {
    "source": "jobswithgpt",
    "job_count": 42,
    "duration_ms": 1234,
    "user_id": "anonymous"
  }
}
```

**Log Aggregation Setup:**

```bash
# CloudWatch (AWS)
aws logs create-log-group --log-group-name /jobsentinel/app
aws logs put-retention-policy \
  --log-group-name /jobsentinel/app \
  --retention-in-days 7

# Stackdriver (GCP)
gcloud logging write jobsentinel-log "Test log" --severity=INFO

# Azure Monitor (Azure)
az monitor log-analytics workspace create \
  --resource-group jobsentinel-rg \
  --workspace-name jobsentinel-logs
```

### Error Tracking with Sentry

```python
# Initialize Sentry in production
import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration

if os.getenv("SENTRY_DSN"):
    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        environment=os.getenv("ENV", "production"),
        release=f"jobsentinel@{__version__}",
        integrations=[
            LoggingIntegration(
                level=logging.INFO,
                event_level=logging.ERROR
            )
        ],
        traces_sample_rate=0.1,  # 10% of transactions
        profiles_sample_rate=0.1  # 10% of transactions
    )
```

### Health Check Endpoint

```python
# src/jsa/cli.py
@click.command()
def health_check():
    """Check system health for load balancers."""
    checks = {
        "database": check_database(),
        "slack": check_slack_webhook(),
        "scrapers": check_scraper_availability()
    }
    
    all_healthy = all(checks.values())
    
    result = {
        "status": "healthy" if all_healthy else "unhealthy",
        "version": __version__,
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    print(json.dumps(result, indent=2))
    sys.exit(0 if all_healthy else 1)

def check_database():
    """Check database connectivity."""
    try:
        from src.database import get_engine
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False

def check_slack_webhook():
    """Check Slack webhook is reachable."""
    try:
        import httpx
        webhook_url = os.getenv("SLACK_WEBHOOK_URL")
        if not webhook_url:
            return False
        
        # Just check URL is reachable (don't send test message)
        response = httpx.head(webhook_url, timeout=5.0)
        return response.status_code in [200, 405]  # 405 = Method Not Allowed is OK
    except Exception as e:
        logger.error(f"Slack health check failed: {e}")
        return False
```

### Uptime Monitoring

**UptimeRobot Setup:**

1. Add HTTP(s) monitor
2. URL: `https://your-deployment.com/health`
3. Interval: 5 minutes
4. Alert contacts: email, SMS
5. Expected status code: 200

**Alternative:** Pingdom, StatusCake, AWS CloudWatch Synthetics

---

## 💾 Backup & Disaster Recovery

### Database Backups

**SQLite Backup (Local/Docker):**

```bash
# Automated backup script
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups"
DB_NAME="jobsentinel"
DB_USER="jobsentinel"
DB_HOST="localhost"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/jobs_$TIMESTAMP.sql"

# Create backup using pg_dump
pg_dump -h "$DB_HOST" -U "$DB_USER" -F c -f "$BACKUP_FILE" "$DB_NAME"

# Compress (pg_dump custom format is already compressed, but can add gzip for extra compression)
gzip "$BACKUP_FILE"

# Keep only last 7 days
find "$BACKUP_DIR" -name "jobs_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

**Add to crontab:**
```bash
# Daily backup at 2 AM
0 2 * * * /app/scripts/backup.sh >> /var/log/backup.log 2>&1
```

**Cloud Database Backup (RDS, Cloud SQL):**

```bash
# AWS RDS automatic backups (configured at creation)
aws rds modify-db-instance \
  --db-instance-identifier jobsentinel-db \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00"

# GCP Cloud SQL automatic backups
gcloud sql instances patch jobsentinel-db \
  --backup-start-time 03:00 \
  --backup-location us \
  --backup-configuration-enabled
```

### Configuration Backups

```bash
# Backup configuration files
tar -czf config_backup_$(date +%Y%m%d).tar.gz \
  config/ \
  .env \
  docker-compose.prod.yml

# Upload to cloud storage
aws s3 cp config_backup_*.tar.gz s3://jobsentinel-backups/
# or
gsutil cp config_backup_*.tar.gz gs://jobsentinel-backups/
```

### Disaster Recovery Plan

**RTO (Recovery Time Objective):** 4 hours  
**RPO (Recovery Point Objective):** 24 hours

**Recovery Steps:**

1. **Database corruption:**
   ```bash
   # Restore from latest backup
   cp backups/jobs_latest.db.gz data/
   gunzip data/jobs_latest.db.gz
   mv data/jobs_latest.db data/jobs.db
   ```

2. **Container failure:**
   ```bash
   # Restart container
   docker-compose -f docker-compose.prod.yml restart jobsentinel
   
   # If persistent, rebuild
   docker-compose -f docker-compose.prod.yml up -d --force-recreate
   ```

3. **Complete infrastructure loss:**
   ```bash
   # 1. Provision new infrastructure (cloud or local)
   # 2. Deploy application
   git clone https://github.com/cboyd0319/JobSentinel
   cd JobSentinel
   
   # 3. Restore configuration
   aws s3 cp s3://jobsentinel-backups/config_latest.tar.gz .
   tar -xzf config_latest.tar.gz
   
   # 4. Restore database
   aws s3 cp s3://jobsentinel-backups/jobs_latest.db.gz data/
   gunzip data/jobs_latest.db.gz
   
   # 5. Start application
   docker-compose -f docker-compose.prod.yml up -d
   
   # 6. Verify
   python -m jsa.cli health-check
   ```

---

## 📈 Scaling Strategies

### Vertical Scaling

**When to scale up:**
- Scraping > 10,000 jobs per run
- Database > 5GB
- CPU consistently > 80%
- Memory consistently > 85%

**Docker resource limits:**
```yaml
deploy:
  resources:
    limits:
      cpus: '2.0'      # Increase from 1.0
      memory: 2G       # Increase from 1G
```

### Horizontal Scaling

**Multi-instance deployment:**

```yaml
# docker-compose.scale.yml
services:
  jobsentinel:
    # ... (same as before)
    deploy:
      replicas: 3  # Run 3 instances
```

**Load distribution strategies:**

1. **Round-robin by job board:**
   - Instance 1: JobsWithGPT, Reed
   - Instance 2: Greenhouse, Lever
   - Instance 3: Indeed, LinkedIn

2. **Geographic distribution:**
   - Instance 1: US job boards
   - Instance 2: EU job boards
   - Instance 3: APAC job boards

### Database Scaling

**Read replicas:**
```python
# Use read replica for analytics queries
from sqlalchemy import create_engine

# Write to primary
primary_engine = create_engine(os.getenv("DATABASE_URL"))

# Read from replica
replica_engine = create_engine(os.getenv("DATABASE_REPLICA_URL"))

# Query optimization
def get_job_stats():
    with replica_engine.connect() as conn:
        result = conn.execute(text("SELECT COUNT(*) FROM jobs"))
        return result.scalar()
```

---

## 🔒 Security Hardening

### Network Security

**Docker network isolation:**
```yaml
services:
  jobsentinel:
    networks:
      - jobsentinel-net
  
  database:
    networks:
      - jobsentinel-net

networks:
  jobsentinel-net:
    driver: bridge
    internal: true  # No external access
```

**Firewall rules:**
```bash
# Only allow HTTPS outbound for job boards
iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 80 -j ACCEPT

# Block all other outbound
iptables -P OUTPUT DROP
```

### Secrets Management

**AWS Secrets Manager:**
```python
import boto3

def get_secret(secret_name):
    """Fetch secret from AWS Secrets Manager."""
    client = boto3.client('secretsmanager', region_name='us-east-1')
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

# Usage
secrets = get_secret('jobsentinel/production')
SLACK_WEBHOOK = secrets['SLACK_WEBHOOK_URL']
```

**GCP Secret Manager:**
```python
from google.cloud import secretmanager

def get_secret(project_id, secret_id):
    """Fetch secret from GCP Secret Manager."""
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{project_id}/secrets/{secret_id}/versions/latest"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode('UTF-8')
```

### Container Security

**Scan for vulnerabilities:**
```bash
# Trivy scan
trivy image jobsentinel:latest

# Expected output: No CRITICAL or HIGH vulnerabilities
```

**Run as non-root:**
```dockerfile
# Already implemented in Dockerfile
USER jobsentinel
```

**Read-only filesystem:**
```yaml
services:
  jobsentinel:
    read_only: true
    tmpfs:
      - /tmp
      - /app/data  # Writable for database
```

---

## 🐛 Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "No jobs found" | API keys invalid | Check `.env` and re-validate |
| "Rate limit exceeded" | Too many requests | Increase `rate_limiter.time_window` |
| "Database locked" | Concurrent writes | Use connection pooling |
| "Out of memory" | Large result sets | Add pagination, increase container memory |
| "Container keeps restarting" | Health check failing | Check logs: `docker logs jobsentinel` |

### Debug Mode

```bash
# Enable verbose logging
LOG_LEVEL=DEBUG docker-compose -f docker-compose.prod.yml up

# View detailed logs
docker-compose -f docker-compose.prod.yml logs -f --tail=100
```

### Performance Profiling

```bash
# Profile application
python -m cProfile -o profile.stats -m jsa.cli run-once

# Analyze profile
python -c "
import pstats
p = pstats.Stats('profile.stats')
p.sort_stats('cumulative')
p.print_stats(20)
"
```

---

## 💰 Cost Optimization

### Cloud Cost Breakdown

**AWS Lambda:**
- Free tier: 1M requests/month, 400,000 GB-seconds
- Cost beyond: $0.20 per 1M requests + $0.00001667 per GB-second
- **Estimate:** $5-10/month (personal use)

**GCP Cloud Run:**
- Free tier: 2M requests/month, 360,000 GB-seconds
- Cost beyond: $0.40 per 1M requests + $0.00002400 per GB-second
- **Estimate:** $8-15/month (personal use)

### Cost Reduction Strategies

1. **Optimize scraping schedule:**
   ```bash
   # Instead of every hour (24 runs/day)
   # Run every 4 hours (6 runs/day) = 75% cost reduction
   ```

2. **Use spot instances:**
   ```bash
   # AWS Fargate Spot (70% discount)
   aws ecs create-service --launch-type FARGATE_SPOT ...
   ```

3. **Cache aggressively:**
   ```python
   # Cache job listings for 2 hours
   from utils.cache import TTLCache
   
   cache = TTLCache(maxsize=10000, ttl=7200)
   
   @cache.memoize
   def fetch_jobs(source):
       return scrape_jobs(source)
   ```

4. **Use read replicas:**
   - Primary database: Write operations only
   - Read replica: All read operations (analytics, searches)
   - **Cost:** +30% database, -50% primary load

---

## 📚 Runbook Template

```markdown
# JobSentinel Production Runbook

## Service Overview
- **Service:** JobSentinel Job Search Automation
- **Deployment:** GCP Cloud Run (us-central1)
- **Owner:** DevOps Team
- **On-Call:** Rotation schedule

## Quick Links
- Dashboard: https://console.cloud.google.com/run
- Logs: https://console.cloud.google.com/logs
- Alerts: https://app.pagerduty.com/services/XXX
- Runbook: https://wiki.company.com/jobsentinel

## Common Operations

### Check Service Status
```bash
gcloud run services describe jobsentinel --region us-central1
```

### View Recent Logs
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=jobsentinel" --limit 50
```

### Restart Service
```bash
gcloud run services update jobsentinel --region us-central1 --update-env-vars RESTART=$(date +%s)
```

### Rollback Deployment
```bash
# List revisions
gcloud run revisions list --service jobsentinel

# Rollback to previous
gcloud run services update-traffic jobsentinel --to-revisions=jobsentinel-00001-abc=100
```

## Incident Response

### High Error Rate (>10%)
1. Check logs for error patterns
2. Verify API keys are valid
3. Check job board status pages
4. If persistent, rollback deployment

### No Jobs Scraped
1. Verify API connectivity
2. Check rate limits
3. Review scraper logs
4. Test manual scrape

### Database Full
1. Check database size: `du -sh data/jobs.db`
2. Archive old jobs: `python -m jsa.cli db-archive --older-than 90`
3. Vacuum database: `python -m jsa.cli db-vacuum`

## Contact Information
- Primary On-Call: [Name] <email>
- Secondary On-Call: [Name] <email>
- Manager: [Name] <email>
```

---

## 📞 Support

For deployment issues:
1. Check [Troubleshooting Guide](troubleshooting.md)
2. Search [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues)
3. Open new issue with `deployment` label

---

**Version History:**
- 1.0.0 (Oct 12, 2025): Initial release

**Maintainers:** @cboyd0319

**License:** MIT
