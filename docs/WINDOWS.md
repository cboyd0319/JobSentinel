# Windows Setup Guide

Complete guide for setting up the job scraper on Windows (Python 3.12.10 + Google Cloud).

## Quick Start (One Command)

**Automated install** - Open PowerShell as Administrator:

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; `
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; `
iex ((New-Object System.Net.WebClient).DownloadString('https://raw.githubusercontent.com/cboyd0319/job-private-scraper-filter/main/setup_windows.ps1'))
```

This installs Python 3.12, gcloud SDK, clones the repo to `%USERPROFILE%\job-scraper`, and walks through GCP setup.

---

## Manual Setup

### 1. Install Python 3.12.10

1. Download from [python.org](https://www.python.org/downloads/windows/)
2. **Check "Add Python 3.12 to PATH"** during installation
3. Verify:
   ```powershell
   python --version  # Should show: Python 3.12.10
   ```

### 2. Clone Repository

```powershell
cd %USERPROFILE%
git clone https://github.com/cboyd0319/job-private-scraper-filter.git job-scraper
cd job-scraper
```

### 3. Virtual Environment

```powershell
python -m venv .venv
.venv\Scripts\activate  # Prompt shows (.venv)
python -m pip install --upgrade pip
pip install -r requirements.txt
python -m playwright install chromium
```

### 4. Install Google Cloud CLI

Download installer: https://cloud.google.com/sdk/docs/install#windows

Or use PowerShell:
```powershell
(New-Object Net.WebClient).DownloadFile("https://dl.google.com/dl/cloudsdk/channels/rapid/GoogleCloudSDKInstaller.exe", "$env:Temp\GoogleCloudSDKInstaller.exe")
& $env:Temp\GoogleCloudSDKInstaller.exe
```

Verify:
```powershell
gcloud --version
```

### 5. Configure

```powershell
cp .env.example .env
cp config\user_prefs.example.json config\user_prefs.json
notepad .env  # Add Slack webhook
notepad config\user_prefs.json  # Add job filters
```

---

## Cloud Deployment

### Setup (5 minutes)

1. **Google Cloud account**: https://cloud.google.com (free $300 credit)
2. **Enable billing**: Console → Billing
3. **Authenticate**:
   ```powershell
   gcloud auth login
   gcloud auth application-default login
   ```

### Deploy (10 minutes)

```powershell
python -m cloud.bootstrap --yes
```

Creates:
- GCP project: `job-scraper-YYYYMMDD-HHMMSS`
- Cloud Run Job (serverless, autoscaling)
- Cloud Scheduler (hourly, Mon-Fri 6am-6pm)
- Budget alerts ($5 limit, auto-shutdown at 90%)

### Teardown

```powershell
.\scripts\teardown-cloud.ps1
```

---

## Common Commands

**Run locally**:
```powershell
.\.venv\Scripts\Activate.ps1
python -m src.agent --mode poll
```

**Update code**:
```powershell
git pull origin main
pip install -r requirements.txt
```

**View logs**:
```powershell
gcloud logging read --limit 50 --format json
```

**Trigger cloud job**:
```powershell
gcloud run jobs execute job-scraper --region us-central1
```

---

## Troubleshooting

### Python not in PATH

**Symptom**: `python: command not found`

**Fix**:
1. Find Python: `C:\Users\YourName\AppData\Local\Programs\Python\Python312`
2. Add to PATH:
   ```powershell
   $env:PATH += ";C:\Users\YourName\AppData\Local\Programs\Python\Python312"
   ```
3. Restart PowerShell

### Execution policy error

**Symptom**: `cannot be loaded because running scripts is disabled`

**Fix**:
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### gcloud not found

**Symptom**: `gcloud: command not found`

**Fix**: Restart PowerShell or manually add to PATH:
```powershell
$env:PATH += ";C:\Users\YourName\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin"
```

### Playwright browser issues

**Symptom**: `Executable doesn't exist`

**Fix**:
```powershell
python -m playwright install chromium --force
```

### Cloud deployment quota error

**Symptom**: "exceeded your allotted project quota"

**Fix**: Delete old projects at https://console.cloud.google.com/cloud-resource-manager

### Permission denied errors

**Solution**: Run PowerShell as Administrator (Start → Right-click → Run as administrator)

---

## Security Notes

- Never commit `.env` (contains webhook URL)
- Local database `data/jobs.sqlite` is unencrypted (enable BitLocker for disk encryption)
- Cloud secrets stored in Google Secret Manager (encrypted at rest)
- Least-privilege IAM roles applied automatically

---

## Cost Guardrails

**Budget**: $5/month max (typical: $0-2)
- Budget alert at $4
- Auto-shutdown at $4.50 (90%)
- Manual override required to exceed

**Resource limits**:
- 1 Cloud Run Job (max 4 concurrent executions)
- 1 Cloud Scheduler job
- 1GB Cloud Storage (logs + artifacts)

---

## Next Steps

- [Configure job filters](../config/user_prefs.example.json)
- [Set up Slack notifications](SLACK.md)
- [View architecture](JOB_SCRAPER_ARCHITECTURE.md)
- [Troubleshooting guide](TROUBLESHOOTING.md)
