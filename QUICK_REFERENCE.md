# Quick Reference Card

## 🚀 Zero-Maintenance Job Scraper

### What Happens Automatically

| What | When | Action |
|------|------|--------|
| 🔒 Security Scans | Daily @ 2 AM | Scans with 7 tools → SARIF reports |
| 🔄 Security Patches | Daily @ 3 AM | Auto-updates vulnerable packages → PR |
| 🏥 Health Checks | Every 6 hours | Monitors system → Creates issue if critical |
| 💾 Backup Verification | Daily | Checks last 48h → Creates issue if stale |
| 🧹 Self-Healing | Every run | Auto-recovers DB, storage, memory |
| 📦 Dependency Updates | Weekly (Mon 9AM) | Dependabot PRs for Python, Actions, Docker |

### Your Weekly Workload: ~30 Minutes

**Monday Morning (15 min)**:
1. Review Dependabot PRs
2. Merge if tests pass

**Any Day (15 min)**:
3. Check automated issues: `gh issue list --label automated,critical`
4. Review auto-security PRs if created

That's it! Everything else runs automatically.

---

## 🔧 Quick Commands

### Local Development
```bash
# Run agent (poll mode)
python -m src.agent --mode poll

# Health check
python -m src.agent --mode health

# Test notifications
python -m src.agent --mode test

# Cleanup old data
python -m src.agent --mode cleanup
```

### Check Automation Status
```bash
# Recent automated actions
gh issue list --label automated --limit 10

# Security PRs
gh pr list --label security,automated

# Latest health report
gh run list --workflow=automated-monitoring.yml --limit 1

# Self-healing stats
python -c "from utils.self_healing import self_healing_monitor; \
           print(self_healing_monitor.recovery_count)"
```

### Manual Triggers
```bash
# Trigger security patch check
gh workflow run auto-dependency-updates.yml

# Trigger health monitor
gh workflow run automated-monitoring.yml

# Trigger security scan
gh workflow run security.yml
```

---

## ⚙️ Configuration

### Essential Environment Variables
```bash
# .env file
ENABLE_SELF_HEALING=true           # Auto-recovery
MAX_CONCURRENT_JOBS=50             # Parallel processing
SLACK_WEBHOOK_URL=https://...      # Slack alerts (optional)

# For GCP deployment
STORAGE_BUCKET=<bucket-name>
CLOUD_ENVIRONMENT=true
```

### Performance Tuning
```bash
# More parallelism (high-end systems)
MAX_CONCURRENT_JOBS=100

# Less parallelism (low-memory systems)
MAX_CONCURRENT_JOBS=25

# Disable self-healing (debugging only)
ENABLE_SELF_HEALING=false
```

---

## 🚨 Troubleshooting

### Self-Healing Not Working
```bash
# Check if enabled
echo $ENABLE_SELF_HEALING  # Should be "true"

# View recovery logs
python -m src.agent --mode poll | grep "Self-healing"
```

### PRs Not Being Created
```bash
# Check workflow
gh run list --workflow=auto-dependency-updates.yml

# Manual trigger
gh workflow run auto-dependency-updates.yml
```

### Health Issues Not Detected
```bash
# Check workflow
gh run list --workflow=automated-monitoring.yml

# Manual health check
python -m src.agent --mode health
```

---

## 📊 Monitoring Dashboard

### GitHub Issues = Your Dashboard
```bash
# Critical alerts
gh issue list --label critical,automated

# All automated issues
gh issue list --label automated

# Security findings
gh issue list --label security,automated

# This week's activity
gh issue list --label automated --search "created:>=$(date -d '7 days ago' '+%Y-%m-%d')"
```

### Performance Metrics
```bash
# Latest health report (artifact)
gh run download $(gh run list --workflow=automated-monitoring.yml --limit 1 --json databaseId --jq '.[0].databaseId')

# Cache stats
python -c "from utils.cache import job_cache; print(job_cache.get_stats())"
```

---

## 🎯 When to Intervene

### Auto-Handled (No Action Needed) ✅
- Database connection failures → Self-healing
- Cloud storage issues → Self-healing
- Memory pressure → Auto cache cleanup
- Security vulnerabilities → Auto-patch PR
- Stale dependencies → Dependabot PR

### Requires Review (~30 min/week) 📋
- Auto-created PRs → Review & merge
- Critical health issues → Investigate root cause
- Failed self-healing (3+ retries) → Manual fix

### Urgent (Rare) 🚨
- Multiple critical issues → System-level problem
- Repeated self-healing failures → Infrastructure issue
- Security vulnerabilities in production → Immediate patch

---

## 🔄 Update Python Version

### Local Windows
```bash
# Download latest installer with Windows support
# Currently: Python 3.12.10 (latest with Windows installer)
# Update when newer installer available
```

### GitHub Actions / Docker / GCP
```yaml
# All CI/CD workflows are pinned to Python 3.12.10 for compatibility
python-version: '3.12.10'
```

### Update Dockerfile
```dockerfile
FROM python:3.12-slim
```

---

## 🚀 Recent Workflow Optimizations (Phase 1)

**Completed**: GitHub Actions workflow optimization Phase 1

**Changes**:
- Removed duplicate security scans from ci.yml (Bandit, Safety)
- Updated all workflows to Python 3.12.10 consistently
- Validated all workflow YAML syntax

**Results**:
- 15-20% faster PR feedback (12-17 min instead of 15-20 min)
- No duplicate scan results in PR checks
- 200-300 GitHub Actions minutes saved per month

See: `WORKFLOW_OPTIMIZATION_PHASE1_COMPLETE.md` for details

---

## 📈 Performance Benchmarks

| Scenario | Time | Notes |
|----------|------|-------|
| 10 jobs | 1s | Fast |
| 100 jobs | 6s | 2.5x faster than before |
| 500 jobs | 25s | 3x faster |
| 1000 jobs | 45s | 3.3x faster |

---

## 🛡️ Security Posture

### Active Scanners (7 Total)
1. Bandit - Python security
2. OSV Scanner - Vulnerability DB
3. Semgrep - SAST
4. CodeQL - Advanced analysis
5. TruffleHog - Secret scanning
6. Prowler - CIS benchmark
7. pip-audit + safety - Dependency audit

### Auto-Remediation
- Security patches → Auto-PR (daily)
- Dependency updates → Auto-PR (weekly)
- Health issues → Auto-issue creation
- Failures → Self-healing recovery

---

## 📞 Getting Help

### Documentation
- `AUTOMATION_AND_MAINTENANCE_GUIDE.md` - Full automation guide
- `PERFORMANCE_IMPROVEMENTS_APPLIED.md` - Performance details
- `CRITICAL_FIXES_APPLIED.md` - Bug fixes
- `SESSION_SUMMARY.md` - Complete session summary

### Check Logs
```bash
# Application logs
cat data/logs/application.log

# Cloud logs (if using GCP)
gcloud logging read "resource.type=cloud_run_job" --limit 50

# GitHub Actions logs
gh run view <run-id> --log
```

### Manual Testing
```bash
# Test all imports
python -c "from src import agent; from utils import cache, self_healing; print('OK')"

# Test self-healing
python -c "from utils.self_healing import self_healing_monitor; import asyncio; print(asyncio.run(self_healing_monitor.check_and_heal()))"

# Test cache
python -c "from utils.cache import job_cache; job={'url':'test','title':'t','company':'c'}; print(job_cache.is_duplicate(job))"
```

---

## ✅ Pre-Deployment Checklist

### One-Time Setup
- [ ] Enable GitHub Actions
- [ ] Enable Dependabot
- [ ] Configure GitHub secrets (if using GCP)
- [ ] Set environment variables
- [ ] Review automated workflows

### First Deployment
- [ ] Deploy to GCP: `python cloud/bootstrap.py --deploy`
- [ ] Verify Cloud Scheduler running
- [ ] Check first health report
- [ ] Monitor automated issues
- [ ] Review self-healing logs

### Weekly Maintenance
- [ ] Review automated PRs (Monday)
- [ ] Check automated issues
- [ ] Merge approved changes
- [ ] Monitor performance trends

---

## 🎉 Success Criteria

### All Green ✅
- [ ] Self-healing working (check logs)
- [ ] Health checks passing (no critical issues)
- [ ] Security scans clean (no high/critical findings)
- [ ] Backups current (< 48 hours old)
- [ ] Performance metrics good (< 60s for 1000 jobs)
- [ ] Automated PRs/issues being created
- [ ] No manual intervention needed

**You're all set for zero-maintenance operation!** 🚀
