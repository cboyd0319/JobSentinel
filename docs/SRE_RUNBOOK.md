# JobSentinel SRE Runbook

**Version:** 0.6.0  
**Last Updated:** October 13, 2025  
**Audience:** Site Reliability Engineers, DevOps, On-call Engineers

---

## Overview

This runbook provides operational procedures for running JobSentinel in production following Google SRE principles.

**References:**
- Google SRE Book | https://sre.google/books/ | High | Production reliability patterns
- SWEBOK v4.0a | https://computer.org/swebok | High | Maintenance and operations
- MITRE SE Guide | https://mitre.org | Medium | Systems engineering lifecycle

---

## Service Level Objectives (SLOs)

### Critical User Journeys

#### 1. Job Discovery Journey
**User Story:** As a job seeker, I want to discover relevant job postings within seconds.

**SLI:** Percentage of successful job scraping operations  
**SLO:** 95% success rate over 24 hours  
**Error Budget:** 5% = ~720 failures per 10,000 requests/day

**Alert Threshold:** < 92% success rate over 1 hour  
**Page:** Yes (if < 90% over 1 hour)

#### 2. Resume Analysis Journey
**User Story:** As a job seeker, I want my resume analyzed within 10 seconds.

**SLI:** p95 latency of resume analysis operations  
**SLO:** p95 < 5 seconds over 24 hours  
**Error Budget:** 5% of requests may exceed 5s

**Alert Threshold:** p95 > 8 seconds over 15 minutes  
**Page:** Yes (if p95 > 12 seconds)

#### 3. Alert Delivery Journey
**User Story:** As a job seeker, I want to receive job alerts within 1 minute.

**SLI:** Time from job match to Slack notification  
**SLO:** p99 < 30 seconds over 1 hour  
**Error Budget:** 1% may exceed 30s

**Alert Threshold:** p99 > 60 seconds over 15 minutes  
**Page:** Yes (if p99 > 120 seconds)

#### 4. API Availability
**User Story:** As a user, I expect the service to be available when I need it.

**SLI:** Percentage of successful API health checks  
**SLO:** 99.9% availability over 7 days  
**Error Budget:** 0.1% = ~10 minutes downtime per week

**Alert Threshold:** < 99.5% over 1 hour  
**Page:** Yes (if < 99% over 30 minutes)

---

## Architecture & Components

```
┌─────────────────────────────────────────────────────┐
│                    Load Balancer                     │
│              (nginx/CloudFlare/AWS ALB)             │
└─────────────────┬───────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼──────┐   ┌────────▼───────┐
│  Web UI      │   │  API Server    │
│  (Flask)     │   │  (FastAPI)     │
└───────┬──────┘   └────────┬───────┘
        │                   │
        └─────────┬─────────┘
                  │
    ┌─────────────┴─────────────┐
    │                           │
┌───▼──────────┐    ┌───────────▼────────┐
│ Job Scrapers │    │ Resume Analyzer    │
│ (Concurrent) │    │ (ATS Engine)       │
└───┬──────────┘    └───────────┬────────┘
    │                           │
    └────────────┬──────────────┘
                 │
    ┌────────────▼──────────────┐
    │     SQLite Database       │
    │     (local file)          │
    └───────────────────────────┘
                 │
    ┌────────────▼──────────────┐
    │   External Services       │
    │  - Slack Webhooks         │
    │  - Job Board APIs         │
    └───────────────────────────┘
```

**Critical Dependencies:**
- Python 3.11+ runtime
- SQLite database (embedded)
- Playwright browser automation
- Network access to job boards
- Slack webhook endpoint (for alerts)

---

## Deployment Procedures

### Standard Deployment (Zero Downtime)

**Prerequisites:**
- [ ] Tests passing in CI
- [ ] Staging validation complete
- [ ] Database migrations tested
- [ ] Rollback plan ready
- [ ] On-call engineer available

**Steps:**

1. **Pre-deployment checks**
   ```bash
   # Check current health
   curl https://jobsentinel.example.com/api/v1/health
   
   # Verify database connectivity
   python -c "from database import check_connection; check_connection()"
   
   # Check disk space (need > 1GB free)
   df -h
   ```

2. **Deploy new version**
   ```bash
   # Pull latest code
   git fetch origin
   git checkout v0.5.0
   
   # Install dependencies
   pip install -e .
   
   # Run migrations
   python scripts/migrate.py --dry-run
   python scripts/migrate.py
   ```

3. **Rolling restart**
   ```bash
   # Restart workers one at a time
   systemctl restart jobsentinel-worker-1
   sleep 30  # Wait for health check
   
   systemctl restart jobsentinel-worker-2
   sleep 30
   
   systemctl restart jobsentinel-api
   ```

4. **Post-deployment validation**
   ```bash
   # Health check
   curl https://jobsentinel.example.com/api/v1/health
   
   # Smoke tests
   pytest tests/smoke/ -v
   
   # Check logs for errors
   tail -f /var/log/jobsentinel/app.log
   ```

5. **Monitor for 30 minutes**
   - Watch error rates in dashboard
   - Check SLO compliance
   - Verify alert delivery
   - Monitor CPU/memory usage

### Emergency Rollback

**Trigger:** Critical bugs, SLO violations, security issues

```bash
# 1. Stop traffic to new version
systemctl stop jobsentinel-api

# 2. Revert code
git checkout v0.4.0

# 3. Rollback database (if needed)
python scripts/migrate.py --rollback

# 4. Restart services
systemctl start jobsentinel-api
systemctl restart jobsentinel-worker-*

# 5. Verify health
curl https://jobsentinel.example.com/api/v1/health
```

**RTO (Recovery Time Objective):** < 5 minutes  
**RPO (Recovery Point Objective):** < 15 minutes

---

## Incident Response

### Severity Levels

**P0 - Critical (Page immediately)**
- Service completely down
- Data loss/corruption
- Security breach
- All scrapers failing
- SLO violation: < 90% success rate

**P1 - High (Page during business hours)**
- Degraded performance (p95 > 15s)
- Multiple scrapers failing
- Alert delivery delayed > 5 minutes
- SLO violation: < 95% success rate

**P2 - Medium (No page)**
- Single scraper failing
- Non-critical errors
- Minor performance degradation

**P3 - Low (No page)**
- Feature requests
- Minor bugs
- Documentation updates

### Common Incidents

#### Incident: Job Scraper Failing

**Symptoms:**
- Error rate > 10% for specific scraper
- Circuit breaker in OPEN state
- No jobs found from source

**Diagnosis:**
```bash
# Check scraper health
curl http://localhost:5000/api/v1/health

# Check logs for specific scraper
tail -f /var/log/jobsentinel/app.log | grep "greenhouse"

# Test scraper directly
python -m sources.greenhouse_scraper --test-url "https://boards.greenhouse.io/..."
```

**Resolution:**
1. Check if target site changed structure
2. Verify network connectivity to site
3. Check rate limits/IP blocking
4. Review circuit breaker state
5. Disable scraper if unfixable: `config["scrapers"]["greenhouse"]["enabled"] = false`

**Prevention:**
- Monitor scraper health continuously
- Implement automatic structure detection
- Use rotating proxies for high-volume scraping

#### Incident: Database Performance Degradation

**Symptoms:**
- Slow API responses (p95 > 10s)
- High database CPU usage
- Query timeouts

**Diagnosis:**
```bash
# Check database size
du -sh /var/lib/jobsentinel/data.db

# Check database tables
psql -U jobsentinel -d jobsentinel -c "\dt"

# Check table schemas and indexes
psql -U jobsentinel -d jobsentinel -c "\d+ job"

# Check slow queries (if pg_stat_statements enabled)
psql -U jobsentinel -d jobsentinel -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

**Resolution:**
1. Add missing indexes
2. Archive old jobs (> 90 days)
3. Vacuum database
4. Optimize SQLite configuration

**Prevention:**
- Regular vacuum operations
- Automated archival of old data
- Index optimization

#### Incident: Memory Leak

**Symptoms:**
- Increasing memory usage over time
- OOM kills by OS
- Slow performance

**Diagnosis:**
```bash
# Check memory usage
ps aux | grep python

# Memory profiling
python -m memory_profiler scripts/profile_memory.py

# Check for resource leaks
lsof -p $(pidof python) | wc -l
```

**Resolution:**
1. Restart affected services
2. Implement connection pooling
3. Fix resource leaks in code
4. Increase memory limits temporarily

**Prevention:**
- Memory profiling in CI
- Resource leak detection
- Proper cleanup in error paths

#### Incident: Slack Alerts Not Delivering

**Symptoms:**
- No alerts received
- Webhook errors in logs
- Alert queue backing up

**Diagnosis:**
```bash
# Test webhook directly
curl -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test alert"}'

# Check alert queue
python -c "from notify.slack import get_queue_size; print(get_queue_size())"

# Verify webhook URL
echo $SLACK_WEBHOOK_URL
```

**Resolution:**
1. Verify webhook URL is valid
2. Check Slack workspace settings
3. Retry failed alerts
4. Clear old alerts from queue

**Prevention:**
- Monitor alert delivery latency
- Implement webhook health checks
- Alert on alert failures (meta-alerting)

---

## Monitoring & Alerting

### Key Metrics to Track

**RED Metrics (per Google SRE):**
- **Rate:** Requests per second
- **Errors:** Error rate percentage
- **Duration:** Request latency (p50, p95, p99)

**Infrastructure Metrics:**
- CPU usage (< 80%)
- Memory usage (< 85%)
- Disk usage (< 90%)
- Network I/O
- Open file descriptors

**Application Metrics:**
- Jobs scraped per hour
- Resume analyses per hour
- Alert delivery time
- Scraper success rates
- Circuit breaker states

### Alert Rules

```yaml
# Prometheus alert rules example

groups:
  - name: jobsentinel
    interval: 30s
    rules:
      - alert: JobScrapingFailureRate
        expr: rate(jobs_scraped_errors[5m]) / rate(jobs_scraped_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High scraping failure rate"
          description: "Job scraping error rate is {{ $value | humanizePercentage }}"
      
      - alert: ResumeAnalysisLatency
        expr: histogram_quantile(0.95, rate(resume_analysis_duration_ms[5m])) > 8000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Resume analysis latency high"
          description: "p95 latency is {{ $value }}ms"
      
      - alert: ServiceDown
        expr: up{job="jobsentinel"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "JobSentinel service is down"
          description: "Service has been down for 1+ minutes"
```

### Dashboard Widgets

**Overview Dashboard:**
- Service health status
- SLO compliance for each journey
- Error budget burn rate
- Total jobs scraped (24h)
- Active scrapers count

**Performance Dashboard:**
- API latency (p50, p95, p99)
- Database query times
- Scraper latencies by source
- Memory and CPU usage

**Business Dashboard:**
- Jobs found per day
- Top companies hiring
- Salary trends
- Resume analysis completion rate

---

## Capacity Planning

### Current Limits (Single Instance)

| Resource | Limit | Usage at 80% |
|----------|-------|--------------|
| Jobs scraped/hour | 10,000 | 8,000 |
| Resume analyses/hour | 100 | 80 |
| Concurrent scrapers | 10 | 8 |
| Database size | 10GB | 8GB |
| Memory | 4GB | 3.2GB |
| CPU cores | 4 | 3.2 |

### Scaling Strategies

**Vertical Scaling (up to 10x):**
- Increase CPU cores (4 → 8)
- Increase memory (4GB → 16GB)
- Use faster disk (HDD → SSD)

**Horizontal Scaling (10x+):**
- Add worker nodes for scraping
- Separate API and worker processes
- Use file sync for shared SQLite database
- Implement job queue (RabbitMQ/Redis)

**Cost Optimization:**
- Archive old jobs after 90 days
- Use spot instances for workers
- Implement intelligent scraping schedules
- Cache frequently accessed data

---

## Backup & Disaster Recovery

### Backup Schedule

| Data | Frequency | Retention | Location |
|------|-----------|-----------|----------|
| Database | Daily | 30 days | S3/GCS |
| Config files | Weekly | 90 days | S3/GCS |
| Logs | Real-time | 7 days | CloudWatch/Stackdriver |
| User data | Daily | Indefinite | Encrypted S3 |

### Backup Procedure

```bash
# Daily automated backup
#!/bin/bash
BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Backup SQLite database
cp data/jobs.sqlite "$BACKUP_DIR/jobsentinel.sqlite"

# Backup config
cp -r /etc/jobsentinel/config "$BACKUP_DIR/"

# Upload to S3
aws s3 sync "$BACKUP_DIR" "s3://jobsentinel-backups/$(date +%Y%m%d)/"

# Clean old backups (keep 30 days)
find /backups -type d -mtime +30 -exec rm -rf {} \;
```

### Disaster Recovery

**Scenario: Complete data loss**

**RTO:** 1 hour  
**RPO:** 24 hours (last daily backup)

**Steps:**
1. Provision new infrastructure
2. Restore latest database backup
3. Restore configuration files
4. Deploy latest application code
5. Verify all services healthy
6. Resume operations

```bash
# Restore from backup
aws s3 cp s3://jobsentinel-backups/latest/jobsentinel.sql /tmp/
aws s3 cp s3://jobsentinel-backups/latest/config /etc/jobsentinel/ --recursive

# Restore database
pg_restore -U jobsentinel -d jobsentinel -c /tmp/jobsentinel.sql

# Verify connectivity
psql -U jobsentinel -d jobsentinel -c "SELECT COUNT(*) FROM job;"

# Start services
systemctl start jobsentinel-api
systemctl start jobsentinel-worker-*
```

---

## Security Operations

### Security Checklist

**Daily:**
- [ ] Review security logs for anomalies
- [ ] Check for failed authentication attempts
- [ ] Verify API rate limits functioning

**Weekly:**
- [ ] Review access logs
- [ ] Update dependencies with security patches
- [ ] Scan for CVEs in dependencies
- [ ] Backup security audit logs

**Monthly:**
- [ ] Security audit per OWASP ASVS 5.0
- [ ] Penetration testing (if applicable)
- [ ] Review and rotate API keys
- [ ] Update SSL/TLS certificates

### Incident Response (Security)

**Suspected Breach:**
1. Isolate affected systems
2. Preserve logs and evidence
3. Notify security team
4. Begin forensic investigation
5. Rotate all credentials
6. Patch vulnerabilities
7. Post-mortem and remediation

---

## On-Call Handbook

### On-Call Rotation

- **Shift:** 7 days
- **Escalation:** After 15 minutes
- **Response SLA:** 
  - P0: 5 minutes
  - P1: 30 minutes
  - P2: 4 hours

### Quick Reference

**Service URLs:**
- Production: https://jobsentinel.example.com
- Staging: https://staging.jobsentinel.example.com
- Monitoring: https://grafana.example.com
- Logs: https://logs.example.com

**Contacts:**
- Primary On-Call: Use PagerDuty
- Secondary: Escalate after 15 min
- Infrastructure Team: #infrastructure-alerts
- Security Team: https://github.com/cboyd0319/JobSentinel/issues

**Useful Commands:**
```bash
# Tail logs
tail -f /var/log/jobsentinel/app.log

# Check service status
systemctl status jobsentinel-*

# Restart service
systemctl restart jobsentinel-api

# Check database
psql -U jobsentinel -d jobsentinel -c "SELECT COUNT(*) FROM job;"

# Test API
curl http://localhost:5000/api/v1/health
```

---

## Post-Mortem Template

After major incidents, conduct a blameless post-mortem:

```markdown
# Post-Mortem: [Incident Title]

**Date:** YYYY-MM-DD
**Duration:** XX minutes
**Severity:** P0/P1/P2
**Impact:** X users, Y requests failed

## Summary
Brief description of what happened.

## Timeline (all times UTC)
- HH:MM - Incident began
- HH:MM - Alert fired
- HH:MM - Responder paged
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Incident resolved

## Root Cause
Technical explanation of what went wrong.

## Resolution
What fixed the issue.

## Action Items
- [ ] TODO 1 (Owner: @user, Due: DATE)
- [ ] TODO 2 (Owner: @user, Due: DATE)

## Lessons Learned
What we learned and how to prevent this in the future.
```

---

## Maintenance Windows

**Schedule:** First Sunday of each month, 02:00-04:00 UTC

**Activities:**
- Database maintenance (vacuum, reindex)
- Dependency updates
- Performance optimization
- Hardware checks

**Communication:**
- Notify users 7 days in advance
- Post maintenance window status
- Send completion notification

---

## Additional Resources

- [Architecture Documentation](ARCHITECTURE.md)
- [API Specification](API_SPECIFICATION.md)
- [Best Practices Guide](BEST_PRACTICES.md)
- [Security Policy](governance/SECURITY.md)
- [Contributing Guide](governance/CONTRIBUTING.md)

**Support Channels:**
- GitHub Issues: Bug reports and feature requests (https://github.com/cboyd0319/JobSentinel/issues)
- Slack: #jobsentinel-support
