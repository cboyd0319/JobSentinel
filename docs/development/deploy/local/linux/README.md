# Linux Local Deployment

Scripts for deploying JobSentinel on Linux machines locally.

## Prerequisites

- Ubuntu 20.04+ / Debian 11+ / Fedora 35+ / Arch Linux
- Python 3.11 or 3.12
- 1GB free disk space
- systemd (for service management)

## Quick Start

### Ubuntu/Debian Setup

```bash
# Install dependencies
sudo apt update
sudo apt install -y python3.12 python3.12-venv python3-pip git

# Run setup (when available)
chmod +x setup.sh
./setup.sh
```

### Fedora Setup

```bash
# Install dependencies
sudo dnf install -y python3.12 python3-pip git

# Run setup
chmod +x setup.sh
./setup.sh
```

### Arch Linux Setup

```bash
# Install dependencies
sudo pacman -S python python-pip git

# Run setup
chmod +x setup.sh
./setup.sh
```

## Configuration

Edit configuration at: `../../common/config/user_prefs.json`

Example:
```json
{
  "keywords": ["python", "devops", "linux"],
  "locations": ["Remote", "Berlin"],
  "min_salary": 80000
}
```

## Scheduled Execution (systemd)

### Create Service File

1. Create: `/etc/systemd/system/jobsentinel.service`

```ini
[Unit]
Description=JobSentinel Job Search Automation
After=network.target

[Service]
Type=oneshot
User=your-username
WorkingDirectory=/path/to/JobSentinel
Environment="PATH=/path/to/JobSentinel/.venv/bin"
ExecStart=/path/to/JobSentinel/.venv/bin/python -m jsa.cli run-once
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

2. Create Timer: `/etc/systemd/system/jobsentinel.timer`

```ini
[Unit]
Description=Run JobSentinel daily at 9 AM

[Timer]
OnCalendar=*-*-* 09:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

3. Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable jobsentinel.timer
sudo systemctl start jobsentinel.timer

# Check status
sudo systemctl status jobsentinel.timer
sudo systemctl list-timers
```

## Alternative: Using Cron

```bash
# Edit crontab
crontab -e

# Add line (runs daily at 9 AM)
0 9 * * * cd /path/to/JobSentinel && .venv/bin/python -m jsa.cli run-once >> /tmp/jobsentinel.log 2>&1
```

## Running as a Service (Daemon Mode)

For continuous background operation:

```ini
# /etc/systemd/system/jobsentinel-daemon.service
[Unit]
Description=JobSentinel Daemon
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/JobSentinel
Environment="PATH=/path/to/JobSentinel/.venv/bin"
ExecStart=/path/to/JobSentinel/.venv/bin/python -m jsa.cli run-daemon --interval 7200
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable jobsentinel-daemon.service
sudo systemctl start jobsentinel-daemon.service
```

## Troubleshooting

### "Permission denied"
```bash
chmod +x setup.sh
```

### "python3.12: command not found"

**Ubuntu/Debian:**
```bash
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt update
sudo apt install python3.12 python3.12-venv
```

**Fedora:**
```bash
sudo dnf install python3.12
```

**Arch:**
```bash
sudo pacman -S python
```

### Playwright Installation Issues
```bash
# Install browser dependencies
sudo apt install -y \
    libnss3 libxss1 libasound2 \
    fonts-liberation libappindicator3-1 \
    xdg-utils

# Or use Playwright's helper
python -m playwright install-deps
```

### systemd Service Not Starting
```bash
# Check logs
sudo journalctl -u jobsentinel.service -n 50

# Check service status
sudo systemctl status jobsentinel.service

# Verify permissions
ls -la /path/to/JobSentinel
```

### Virtual Environment Issues
```bash
# Remove and recreate
rm -rf ../../.venv
python3.12 -m venv ../../.venv
source ../../.venv/bin/activate
pip install -e ../../
```

## GUI Support

Linux GUI support requires additional dependencies:

```bash
# Ubuntu/Debian
sudo apt install -y python3-tk

# Fedora
sudo dnf install python3-tkinter

# Arch
sudo pacman -S tk
```

## Docker Alternative

If you prefer containerization, see: [Docker Deployment](../../cloud/docker/README.md)

## Distribution-Specific Notes

### Ubuntu 20.04
- May need to manually install Python 3.12 from deadsnakes PPA
- Default Python 3.8 is not supported

### Debian 11
- Install python3.11 or python3.12 from testing/backports

### Fedora 35+
- Python 3.11+ available in default repos
- SELinux may require additional configuration

### Arch Linux
- Always has latest Python
- Rolling release may require frequent updates

## Support

- [Deployment Guide](../../../docs/reference/DEPLOYMENT_GUIDE.md)
- [Troubleshooting Guide](../../../docs/TROUBLESHOOTING.md)
- [GitHub Issues](https://github.com/cboyd0319/JobSentinel/issues)

---

**Platforms:** Ubuntu 20.04+, Debian 11+, Fedora 35+, Arch Linux  
**Last Updated:** October 14, 2025  
**Status:** Community-maintained (setup scripts TBD)
