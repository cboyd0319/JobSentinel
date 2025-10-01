# Slack Webhook Setup

## Overview

Job scraper sends notifications via Slack incoming webhooks. Takes 5 minutes to set up.

## Prerequisites

- Slack account (free tier works)
- Admin access to create apps

## Option 1: New workspace (recommended for testing)

### Create workspace

1. Go to https://slack.com/create
2. Enter email
3. Check email for code
4. Enter code
5. Name workspace (e.g., "Job Alerts")
6. Add team members (optional, skip for solo use)
7. Create first channel (default: #general)

### Create webhook app

1. Go to https://api.slack.com/apps
2. Click "Create New App"
3. Choose "From scratch"
4. App name: "Job Scraper"
5. Pick workspace: Select your new workspace
6. Click "Create App"

### Enable incoming webhooks

1. In left sidebar: "Incoming Webhooks"
2. Toggle "Activate Incoming Webhooks" → ON
3. Scroll down, click "Add New Webhook to Workspace"
4. Select channel: #general (or create #job-alerts)
5. Click "Allow"

### Copy webhook URL

You'll see:
```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

Copy this entire URL. You'll need it during deployment.

## Option 2: Existing workspace

### Request app install permission

If you're not workspace admin:
1. Ask admin to approve app installation
2. Share app manifest (see below)

### Use admin access

If you're admin:
1. Follow steps in Option 1 starting from "Create webhook app"
2. Choose existing workspace
3. Select appropriate channel for job alerts

## Testing webhook

### PowerShell (Windows)
```powershell
$webhook = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
$body = @{text="Test from Windows"} | ConvertTo-Json
Invoke-RestMethod -Uri $webhook -Method Post -Body $body -ContentType "application/json"
```

### Bash (macOS/Linux)
```bash
curl -X POST https://hooks.slack.com/services/YOUR/WEBHOOK/URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test from terminal"}'
```

### Python
```python
import requests
webhook = "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
requests.post(webhook, json={"text": "Test from Python"})
```

If test succeeds, you'll see message appear in selected channel.

## Security

### Webhook URL is sensitive

- Never commit to Git
- Never share publicly
- Treat like password

Webhook URL lets anyone post to your Slack. If leaked:
1. Go to https://api.slack.com/apps
2. Select your app
3. Incoming Webhooks → Regenerate URL
4. Update deployment with new URL

### Scoped permissions

Incoming webhooks can only:
- Post messages to assigned channel
- Use app name/icon

Cannot:
- Read messages
- Access other channels
- Manage workspace
- Access files

Safe for personal use.

## Deployment integration

### Setup wizard (interactive)

```bash
python -m cloud.bootstrap --provider gcp
```

Wizard prompts for webhook URL. Paste entire URL.

### Manual config

Edit `.env`:
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

Or `config/user_prefs.json`:
```json
{
  "notifications": {
    "slack_webhook": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
  }
}
```

### Update existing deployment

```bash
python -m cloud.update --provider gcp --project-id PROJECT_ID
```

Re-enter webhook URL when prompted.

## Message format

### Default format

```
🎯 New Job Match (Score: 85/100)

Title: Senior Python Engineer
Company: Example Corp
Location: Remote
Salary: $150k-180k

https://example.com/jobs/12345

Match reasons:
• Python, Docker, AWS
• 5+ years experience
```

### Customize format

Edit `notify/slack.py`:
```python
def format_job_message(job):
    return {
        "text": f"New job: {job.title}",
        "blocks": [...]  # Rich formatting
    }
```

See Slack Block Kit: https://api.slack.com/block-kit

## Troubleshooting

### "invalid_token" error

Webhook URL incorrect or regenerated. Get new URL from https://api.slack.com/apps.

### "channel_not_found" error

Selected channel deleted. Recreate webhook, choose active channel.

### No messages appearing

Check:
1. Webhook URL correct (starts with `https://hooks.slack.com/services/`)
2. Channel exists and you have access
3. Test webhook with curl (see above)
4. Check Cloud Run logs: `gcloud logging read`

### Rate limits

Slack rate limits:
- 1 message per second per webhook
- Burst: 10 messages

Job scraper sends max 1 message per job match, well under limit.

### Webhook revoked

If workspace admin removes app:
1. Reinstall app (follow Option 1 or 2)
2. Get new webhook URL
3. Update deployment

## Alternative: Email notifications

If Slack not available, use email instead:

1. Set up SendGrid or AWS SES
2. Edit `notify/email.py`
3. Configure SMTP settings in `.env`

See `docs/API_KEY_MANAGEMENT.md` for email setup.

## Mobile notifications

### Slack mobile app

Install Slack app on iOS/Android for push notifications:
1. Download from App Store / Google Play
2. Sign in to workspace
3. Enable notifications in app settings
4. Get instant job alerts on phone

### Do Not Disturb

Configure quiet hours:
1. Slack app → Profile → Notifications
2. Set DND schedule (e.g., 10pm-8am)
3. Job alerts queue until morning

## Multi-channel routing

Send different job types to different channels:

```python
# notify/slack.py
def get_webhook_for_job(job):
    if job.remote:
        return REMOTE_JOBS_WEBHOOK
    elif job.salary > 150000:
        return HIGH_PAY_WEBHOOK
    else:
        return DEFAULT_WEBHOOK
```

Create multiple webhooks, one per channel.

## References

- Slack API docs: https://api.slack.com/messaging/webhooks
- Block Kit builder: https://app.slack.com/block-kit-builder
- Rate limits: https://api.slack.com/docs/rate-limits
