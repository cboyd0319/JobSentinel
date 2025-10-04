# Slack Setup Guide

This guide walks you through setting up Slack notifications for your job alerts. **No technical knowledge required!**

## Quick Setup (5-10 minutes)

The easiest way to set up Slack is to run the interactive setup wizard:

```bash
python scripts/slack_bootstrap.py
```

The wizard will guide you through every step. Just follow the prompts!

---

## Manual Setup Guide

If you prefer to set up Slack manually, follow these detailed steps:

### Step 1: Create a Slack Workspace (Free)

If you don't already have a Slack workspace:

1. Go to [https://slack.com/get-started#/createnew](https://slack.com/get-started#/createnew)
2. Enter your **email address** and click **Continue**
3. Check your email for a 6-digit confirmation code
4. Enter the code in Slack
5. Name your workspace (example: "My Job Search" or "Career Tools")
6. Click **Skip for now** when asked to add teammates
7. Your workspace is ready!

**Cost:** $0 (Free plan is perfect for this use case)

---

### Step 2: Create a Slack App

1. Open [https://api.slack.com/apps?new_app=1](https://api.slack.com/apps?new_app=1) in your browser
2. Click the **"From an app manifest"** tab
3. Select your workspace from the dropdown menu
4. Open the file `config/slack_app_manifest.yml` in this project
5. **Copy the entire contents** of that file
6. **Paste** it into the text box on the Slack page
7. Click **Next**
8. Review the app summary (you'll see it's called "Job Scraper Alerts")
9. Click **Create**
10. You'll see a success message!

---

### Step 3: Enable Incoming Webhooks

1. You should still be on the app settings page
2. Look for **"Incoming Webhooks"** in the left sidebar (under "Features")
3. Click it
4. Toggle the switch to **ON** (if it's not already)
5. Scroll down and click **"Add New Webhook to Workspace"**
6. Select the channel where you want job alerts to go
   - **Tip:** Create a new channel called `#job-alerts` first!
   - To create a channel: In Slack, click the + next to "Channels" and name it
7. Click **Allow**
8. You'll see a webhook URL appear. It looks like:
   ```
   https://hooks.slack.com/services/YOUR_WORKSPACE_ID/YOUR_CHANNEL_ID/YOUR_SECRET_TOKEN
   ```
9. **Copy this entire URL** (click the "Copy" button next to it)

---

### Step 4: Add the Webhook to Your Configuration

1. Open the file `.env` in the project directory (if it doesn't exist, copy `.env.example` to `.env`)
2. Find the line that says `SLACK_WEBHOOK_URL=`
3. Paste your webhook URL after the `=` sign:
   ```bash
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR_WORKSPACE_ID/YOUR_CHANNEL_ID/YOUR_SECRET_TOKEN
   ```
4. Save the file

---

### Step 5: Test Your Setup

Run the setup wizard to test your webhook:

```bash
python scripts/slack_bootstrap.py
```

When prompted, choose to test your existing webhook. You should see a test message appear in your Slack channel within seconds!

Alternatively, you can send a test notification manually:

```bash
python -c "from notify.slack import send_slack_message; send_slack_message('Test from job scraper!')"
```

---

## Troubleshooting

### "Webhook test failed"

**Problem:** The webhook URL isn't working.

**Fix:**
1. Go back to your Slack app settings
2. Navigate to **Incoming Webhooks**
3. Check if the webhook is still listed and active
4. If not, create a new one (Step 3 above)
5. Update your `.env` file with the new URL

### "No module named 'requests'"

**Problem:** Missing Python dependency.

**Fix:**
```bash
pip install requests
```

### "I don't see the test message in Slack"

**Checklist:**
1. ✓ Did you copy the complete webhook URL (including `https://`)?
2. ✓ Is there a space or newline character at the end of the URL in `.env`? Remove it.
3. ✓ Did you select the correct channel when creating the webhook?
4. ✓ Is the Slack app still installed in your workspace? (Check Apps in Slack sidebar)

### "Permission denied when accessing .env file"

**Problem:** File permissions issue.

**Fix:**
```bash
chmod 600 .env
```

---

## Understanding Slack Costs

### Free Plan (Recommended for Personal Use)

- **Cost:** $0/month
- **Message limit:** 90 days of message history
- **Perfect for:** Personal job search (you'll see job alerts as they arrive)

### What This Means for You

- Job alerts arrive instantly when posted
- You can see the last 90 days of alerts (plenty for job searching!)
- No cost, no credit card required

---

## Security & Privacy

### What Information Goes to Slack?

The job scraper sends:
- Job title
- Company name
- Location
- Job URL
- Match score

**It does NOT send:**
- Your resume
- Your personal information
- Your search history
- Any data about you

### Keeping Your Webhook Secure

⚠️ **Important:** Your webhook URL is like a password. Anyone with it can post to your Slack channel.

**Best practices:**
1. ✓ Never commit your `.env` file to git (it's already in `.gitignore`)
2. ✓ Don't share your webhook URL publicly
3. ✓ If you accidentally expose it, delete the old webhook and create a new one

---

## Advanced Configuration

### Customizing Notification Format

Edit `notify/slack.py` to customize how job alerts look in Slack.

### Multiple Channels

You can create multiple webhooks for different channels (e.g., `#high-priority-jobs`, `#all-jobs`) and configure different score thresholds.

### Slack App Permissions

The app manifest (`config/slack_app_manifest.yml`) only requests the minimum permission needed: `incoming-webhook`. This means the app can ONLY send messages, nothing else.

---

## Need Help?

1. Run the interactive wizard: `python scripts/slack_bootstrap.py`
2. Check the troubleshooting section above
3. Review Slack's webhook documentation: [https://api.slack.com/messaging/webhooks](https://api.slack.com/messaging/webhooks)
4. Open an issue on GitHub

---

## Quick Reference

| Task | Command |
|------|---------|
| Run setup wizard | `python scripts/slack_bootstrap.py` |
| Test webhook | `python -c "from notify.slack import send_slack_message; send_slack_message('Test')"` |
| View webhook URL | `cat .env \| grep SLACK_WEBHOOK` |
| Delete webhook | Revoke it in Slack app settings → Incoming Webhooks |
