# Slack Notifications

Send job alerts to Slack via incoming webhooks (5 minute setup).

## Quick Setup

### 1. Create Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. App name: `Job Scraper`
4. Choose workspace (or create new one at https://slack.com/create)
5. Click **"Create App"**

### 2. Enable Incoming Webhooks

1. Left sidebar: **"Incoming Webhooks"**
2. Toggle **"Activate Incoming Webhooks"** → ON
3. Click **"Add New Webhook to Workspace"**
4. Select channel: `#general` (or create `#job-alerts`)
5. Click **"Allow"**

### 3. Copy Webhook URL

Copy the generated URL:
```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

### 4. Add to Configuration

**Local deployment:**
```bash
# .env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

**Cloud deployment:**
Paste when prompted during `python -m cloud.bootstrap --yes`

---

## Testing

**Bash (macOS/Linux):**
```bash
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test from terminal"}'
```

**PowerShell (Windows):**
```powershell
$webhook = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
$body = @{text="Test message"} | ConvertTo-Json
Invoke-RestMethod -Uri $webhook -Method Post -Body $body -ContentType "application/json"
```

**Python:**
```python
python -m src.agent --mode test
```

---

## Message Format

Job alerts include:
- **Job title** (bolded, clickable link)
- **Company name**
- **Location** (Remote/Hybrid/On-site)
- **Match score** (0.0-1.0)
- **Matched keywords** (bullet list)
- **Apply link**

Example:
```
🎯 New Job Match (Score: 0.87)

Senior Security Engineer at Stripe
📍 Remote (US)

Matched keywords:
• Zero Trust
• Kubernetes
• AWS

Apply: https://jobs.lever.co/stripe/...
```

---

## Customization

### Change Notification Threshold

Edit `config/user_prefs.json`:
```json
{
  "immediate_alert_threshold": 0.85
}
```

Jobs scoring ≥ 0.85 trigger instant Slack alerts. Lower scores saved for daily digest.

### Add Custom Messages

Edit message template in `notify/slack_notifier.py`:
```python
def format_job_message(job):
    return {
        "text": f"New job: {job.title}",
        "attachments": [...]
    }
```

### Multiple Channels

Create multiple webhooks for different alert types:
```bash
# .env
SLACK_WEBHOOK_HIGH_PRIORITY=https://hooks.slack.com/services/.../high-priority
SLACK_WEBHOOK_DAILY_DIGEST=https://hooks.slack.com/services/.../digest
```

---

## Troubleshooting

### Invalid webhook URL

**Symptom:** `400 Bad Request` or `invalid_token`

**Fix:**
- Ensure URL starts with `https://hooks.slack.com/services/`
- Check for trailing spaces
- Regenerate webhook if URL is old

### No messages received

**Symptom:** Script runs successfully but no Slack messages

**Checklist:**
1. Verify webhook URL in `.env` (local) or Secret Manager (cloud)
2. Check channel still exists
3. Confirm app not removed from workspace
4. Test with curl/PowerShell command above

### Rate limiting

**Symptom:** `429 Too Many Requests`

**Cause:** Slack limits to 1 message/second per webhook

**Fix:** Batch alerts (already implemented in `notify/slack_notifier.py`)

### App removed from workspace

**Symptom:** `This app has been deactivated`

**Fix:** Reinstall app:
1. Go to https://api.slack.com/apps
2. Select app
3. Left sidebar: **"Install App"**
4. Click **"Reinstall to Workspace"**

---

## Advanced: Slack App Manifest

For teams deploying multiple times, use app manifest for consistent setup:

**Create app from manifest:**
1. https://api.slack.com/apps → **"Create New App"** → **"From an app manifest"**
2. Paste manifest from `config/slack_app_manifest.json`
3. Review permissions
4. Click **"Create"**

**Manifest template:**
```json
{
  "display_information": {
    "name": "Job Scraper",
    "description": "Automated job board alerts",
    "background_color": "#4C8BF5"
  },
  "features": {
    "bot_user": {
      "display_name": "Job Bot",
      "always_online": true
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": ["incoming-webhook"]
    }
  },
  "settings": {
    "org_deploy_enabled": false,
    "socket_mode_enabled": false
  }
}
```

---

## Security

- **Webhook URLs are secrets** - Never commit to git
- Stored in `.env` (local, gitignored)
- Stored in Google Secret Manager (cloud, encrypted at rest)
- Rotatable: Regenerate webhook in Slack app settings
- Least privilege: Webhooks can only post messages (no read access)

---

## Cost

**Free tier:** Unlimited webhooks, unlimited messages
**Paid workspaces:** Same (webhooks exempt from message limits)

---

## Next Steps

- [Configure job filters](../config/user_prefs.example.json)
- [Deploy to cloud](CLOUD.md)
- [View architecture](JOB_SCRAPER_ARCHITECTURE.md)
