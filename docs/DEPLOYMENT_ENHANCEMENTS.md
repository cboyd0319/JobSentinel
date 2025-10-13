# Deployment Guide for JobSentinel v0.6

## Overview

This guide covers deploying JobSentinel v0.6 with all new security and UX enhancements. The application can be deployed locally, in cloud environments, or via Docker.

## Table of Contents

- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Configuration](#configuration)
- [Security Hardening](#security-hardening)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Local Development

### Prerequisites

- Python 3.11+ (3.12 recommended)
- Node.js 20+ and npm 10+
- Git
- 2GB RAM minimum

### Quick Start

```bash
# Clone repository
git clone https://github.com/cboyd0319/JobSentinel.git
cd JobSentinel

# Backend setup
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e '.[dev,resume,ml,llm,mcp]'
playwright install chromium

# Frontend setup
cd frontend
npm install
npm run build
cd ..

# Configure
cp config/user_prefs.example.json config/user_prefs.json
# Edit config/user_prefs.json with your preferences

# Run tests
make test

# Start FastAPI backend
python -m uvicorn jsa.fastapi_app.app:app --reload --host 0.0.0.0 --port 8000

# OR Start Flask web UI
python -m jsa.cli web --port 5000
```

### Development Workflow

```bash
# Run linting
make lint

# Run formatting
make fmt

# Run type checking
make type

# Run tests with coverage
make cov

# Run security scan
make security
```

---

## Production Deployment

### Option 1: Traditional Server (Linux)

#### 1. System Preparation

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3.12 python3.12-venv git nginx

# Create application user
sudo useradd -r -s /bin/false jobsentinel
sudo mkdir -p /opt/jobsentinel
sudo chown jobsentinel:jobsentinel /opt/jobsentinel
```

#### 2. Application Setup

```bash
# Clone as application user
sudo -u jobsentinel git clone https://github.com/cboyd0319/JobSentinel.git /opt/jobsentinel
cd /opt/jobsentinel

# Setup virtual environment
sudo -u jobsentinel python3.12 -m venv .venv
sudo -u jobsentinel .venv/bin/pip install -e .
sudo -u jobsentinel .venv/bin/playwright install chromium

# Configure
sudo -u jobsentinel cp config/user_prefs.example.json config/user_prefs.json
sudo -u jobsentinel nano config/user_prefs.json

# Create data directory
sudo -u jobsentinel mkdir -p /opt/jobsentinel/data
```

#### 3. Systemd Service

Create `/etc/systemd/system/jobsentinel-api.service`:

```ini
[Unit]
Description=JobSentinel FastAPI Application
After=network.target

[Service]
Type=simple
User=jobsentinel
Group=jobsentinel
WorkingDirectory=/opt/jobsentinel
Environment="PATH=/opt/jobsentinel/.venv/bin"
Environment="RATE_LIMIT_ENABLED=true"
Environment="LOG_LEVEL=INFO"
ExecStart=/opt/jobsentinel/.venv/bin/uvicorn jsa.fastapi_app.app:app \
  --host 127.0.0.1 \
  --port 8000 \
  --workers 4

Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable jobsentinel-api
sudo systemctl start jobsentinel-api
sudo systemctl status jobsentinel-api
```

#### 4. Nginx Reverse Proxy

Create `/etc/nginx/sites-available/jobsentinel`:

```nginx
# Rate limiting
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/m;

server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers (in addition to application headers)
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # Frontend static files
    location / {
        root /opt/jobsentinel/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        limit_req zone=api_limit burst=20 nodelay;
        
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check (bypass auth)
    location /api/v1/health {
        proxy_pass http://127.0.0.1:8000;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/jobsentinel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Option 2: Docker

#### Dockerfile (Production)

```dockerfile
# Multi-stage build for minimal image size
FROM python:3.12-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml requirements.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt

# Final stage
FROM python:3.12-slim

# Create non-root user
RUN useradd -r -s /bin/false -u 1000 jobsentinel

WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /root/.local /home/jobsentinel/.local

# Copy application
COPY --chown=jobsentinel:jobsentinel . .

# Install Playwright browsers
RUN su jobsentinel -c "python -m playwright install chromium"

# Create data directory
RUN mkdir -p /app/data && chown jobsentinel:jobsentinel /app/data

USER jobsentinel

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8000/api/v1/health').raise_for_status()"

# Run application
CMD ["uvicorn", "jsa.fastapi_app.app:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  jobsentinel-api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: jobsentinel-api
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - RATE_LIMIT_ENABLED=true
      - RATE_LIMIT_PER_MINUTE=100
      - RATE_LIMIT_PER_HOUR=1000
      - LOG_LEVEL=INFO
      - DATABASE_URL=sqlite:///data/jobs.sqlite
    volumes:
      - ./data:/app/data
      - ./config:/app/config:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    networks:
      - jobsentinel-network

  nginx:
    image: nginx:alpine
    container_name: jobsentinel-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./frontend/dist:/usr/share/nginx/html:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - jobsentinel-api
    networks:
      - jobsentinel-network

networks:
  jobsentinel-network:
    driver: bridge
```

#### Deploy with Docker

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f jobsentinel-api

# Stop
docker-compose down

# Update
git pull
docker-compose build
docker-compose up -d
```

---

## Configuration

### Environment Variables

#### Required

None! All have sensible defaults.

#### Optional

```bash
# Database
DATABASE_URL=sqlite:///data/jobs.sqlite

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=100
RATE_LIMIT_PER_HOUR=1000

# CORS (for frontend)
ENABLE_CORS=true
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Logging
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR

# Security
ALLOWED_HOSTS=localhost,127.0.0.1,your-domain.com
```

### User Preferences

Edit `config/user_prefs.json`:

```json
{
  "keywords": ["python", "backend", "api"],
  "locations": ["Remote", "San Francisco"],
  "salary_min": 120000,
  "denied_companies": [],
  "job_sources": {
    "greenhouse": { "enabled": true },
    "lever": { "enabled": true },
    "jobswithgpt": { "enabled": true }
  },
  "slack": {
    "webhook_url": "YOUR_WEBHOOK_URL",
    "channel": "#job-alerts"
  }
}
```

---

## Security Hardening

### 1. File Permissions

```bash
# Application directory (read-only except data/)
sudo chown -R jobsentinel:jobsentinel /opt/jobsentinel
sudo chmod 755 /opt/jobsentinel
sudo chmod 750 /opt/jobsentinel/config
sudo chmod 640 /opt/jobsentinel/config/user_prefs.json

# Data directory (read-write)
sudo chmod 770 /opt/jobsentinel/data
```

### 2. Firewall

```bash
# Allow only HTTPS
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. SSL/TLS

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### 4. Security Updates

```bash
# Enable automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 5. Monitoring

```bash
# Install fail2ban
sudo apt install fail2ban

# Configure for nginx
sudo nano /etc/fail2ban/jail.local
```

```ini
[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 5
findtime = 600
bantime = 3600
```

---

## Monitoring

### Health Checks

```bash
# Check API health
curl http://localhost:8000/api/v1/health

# Expected response
{
  "status": "healthy",
  "version": "0.6.0",
  "timestamp": "2025-10-13T22:50:00Z",
  "total_jobs": 1234,
  "components": [
    {"name": "database", "status": "healthy"},
    {"name": "filesystem", "status": "healthy"}
  ]
}
```

### Logs

```bash
# Application logs (systemd)
sudo journalctl -u jobsentinel-api -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Docker logs
docker-compose logs -f jobsentinel-api
```

### Metrics

Integrate with monitoring tools:

- **Prometheus**: Expose `/metrics` endpoint
- **Grafana**: Visualize metrics
- **Uptime Kuma**: Simple uptime monitoring

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed

```bash
# Check database file permissions
ls -la /opt/jobsentinel/data/jobs.sqlite

# Verify database integrity
sqlite3 /opt/jobsentinel/data/jobs.sqlite "PRAGMA integrity_check;"
```

#### 2. Rate Limit Errors

```bash
# Increase rate limits
export RATE_LIMIT_PER_MINUTE=200
export RATE_LIMIT_PER_HOUR=2000

# Or disable temporarily
export RATE_LIMIT_ENABLED=false
```

#### 3. Memory Issues

```bash
# Check memory usage
free -h

# Reduce workers
# In systemd service: --workers 2
```

#### 4. Playwright Browser Not Found

```bash
# Reinstall browsers
.venv/bin/playwright install chromium
```

#### 5. CORS Errors

```bash
# Add frontend origin
export CORS_ORIGINS="http://localhost:3000,https://your-domain.com"
```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Restart service
sudo systemctl restart jobsentinel-api
```

---

## Maintenance

### Backups

```bash
# Backup script
#!/bin/bash
BACKUP_DIR="/backups/jobsentinel"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Backup database
cp /opt/jobsentinel/data/jobs.sqlite "$BACKUP_DIR/jobs_$DATE.sqlite"

# Backup config
cp /opt/jobsentinel/config/user_prefs.json "$BACKUP_DIR/user_prefs_$DATE.json"

# Keep only last 7 days
find "$BACKUP_DIR" -name "*.sqlite" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.json" -mtime +7 -delete
```

### Updates

```bash
# Pull latest code
cd /opt/jobsentinel
sudo -u jobsentinel git pull

# Install dependencies
sudo -u jobsentinel .venv/bin/pip install -e .

# Run migrations (if any)
sudo -u jobsentinel .venv/bin/python scripts/migrate.py

# Restart service
sudo systemctl restart jobsentinel-api
```

---

## Performance Tuning

### 1. Uvicorn Workers

```bash
# Formula: (2 x CPU cores) + 1
--workers 4  # For 2-core machine
--workers 8  # For 4-core machine
```

### 2. Database Optimization

```sql
-- Vacuum database (reclaim space)
VACUUM;

-- Analyze tables (update statistics)
ANALYZE;

-- Add indexes (if needed)
CREATE INDEX IF NOT EXISTS idx_jobs_score ON jobs(score);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
```

### 3. Nginx Caching

```nginx
# Cache static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## Support

### Getting Help

1. **Documentation**: Check `/docs` directory
2. **GitHub Issues**: Report bugs or request features
3. **Security Issues**: Email security@yourdomain.tld

### Health Monitoring Services

- **Uptime Robot**: Free uptime monitoring
- **Healthchecks.io**: Cron job monitoring
- **UptimeKuma**: Self-hosted monitoring

---

*Last Updated: October 13, 2025*
*Version: 0.6.0*
