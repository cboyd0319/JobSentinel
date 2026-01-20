# Notifications

**Get pinged when your dream job appears.**

JobSentinel can alert you the moment it finds a job that matches your criteria.
No more checking job boards manually - let the jobs come to you.

![Notification Settings](../images/settings.png)

---

## What's a Webhook?

A webhook is just a special URL that lets JobSentinel send messages to apps like Slack,
Discord, or Teams. Think of it like giving JobSentinel your "address" so it knows where
to send job alerts. You create this URL in Slack/Discord/Teams, then paste it into JobSentinel.

---

## Available Notification Channels

Pick whichever channels work best for you:

| Channel | Best For |
|---------|----------|
| **Slack** | Already live in Slack for work |
| **Discord** | Have a personal Discord server |
| **Microsoft Teams** | Your company uses Teams |
| **Email** | Want a record in your inbox |
| **Telegram** | Prefer mobile notifications |
| **Desktop** | Want instant on-screen alerts |

You can enable multiple channels at once - they all fire simultaneously.

---

## Setting Up Notifications

### Slack

1. Go to [Slack Webhooks](https://api.slack.com/messaging/webhooks)
2. Click "Create New App" → "From Scratch"
3. Name it "JobSentinel" and pick your workspace
4. Enable "Incoming Webhooks"
5. Click "Add New Webhook to Workspace"
6. Pick a channel (like #job-alerts)
7. Copy the webhook URL
8. In JobSentinel: Settings → Notifications → Slack → Paste URL

**What you'll get:** Rich formatted messages with job details and a "View Job" button.

---

### Discord

1. Open your Discord server
2. Go to Server Settings → Integrations → Webhooks
3. Click "New Webhook"
4. Name it "JobSentinel"
5. Pick a channel
6. Copy the webhook URL
7. In JobSentinel: Settings → Notifications → Discord → Paste URL

**What you'll get:** Color-coded embeds (green for high scores, yellow for medium).

**Bonus:** Add your Discord user ID to get @mentioned on alerts.

---

### Microsoft Teams

1. Open Teams and go to your target channel
2. Click ⋯ → Connectors
3. Find "Incoming Webhook" and click Configure
4. Name it "JobSentinel"
5. Copy the webhook URL
6. In JobSentinel: Settings → Notifications → Teams → Paste URL

**What you'll get:** Cards with job details and action buttons.

---

### Email

1. In JobSentinel: Settings → Notifications → Email
2. Enter your SMTP server details:
   - **Gmail:** `smtp.gmail.com`, port `587`
   - **Outlook:** `smtp-mail.outlook.com`, port `587`
3. Enter your email and password
4. Add recipient email addresses

**Gmail users:** You need an App Password, not your regular password:

1. Enable 2-factor authentication on your Google account
2. Go to Security → App Passwords
3. Generate a password for "Mail"
4. Use that password in JobSentinel

**What you'll get:** Beautiful HTML emails with all job details.

---

### Telegram

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token (looks like `123456789:ABCdef...`)
4. Add your bot to a group or channel
5. Get your chat ID:
   - For groups: Use [@userinfobot](https://t.me/userinfobot)
   - For channels: Forward a message to [@getmyid_bot](https://t.me/getmyid_bot)
6. In JobSentinel: Settings → Notifications → Telegram → Enter token and chat ID

**Note:** Chat IDs for groups start with `-` (it's a negative number).

**What you'll get:** Formatted messages right on your phone.

---

### Desktop Notifications

1. In JobSentinel: Settings → Notifications → Desktop → Enable

That's it! No webhook setup needed.

**What you'll get:** Native OS notifications:

- **Windows:** Toast notifications in Action Center
- **macOS:** Notification Center alerts
- **Linux:** System notification daemon alerts

---

## When Do Notifications Fire?

By default, JobSentinel sends notifications for jobs scoring **90% or higher**.

You can adjust this threshold in Settings → Notifications → Alert Threshold.

**Tip:** Start at 90% to avoid notification spam. Lower it to 80% if you want more alerts.

---

## Security Note

**Your credentials are safe.** All webhook URLs, API tokens, and passwords are stored in
your operating system's secure credential manager:

- **macOS:** Keychain
- **Windows:** Credential Manager
- **Linux:** Secret Service

Credentials are never stored in plain text configuration files.

---

## Testing Your Setup

After configuring a channel, click **"Send Test"** to verify it works.

You should receive a test notification within a few seconds.

If it doesn't work:

1. Double-check the webhook URL or credentials
2. Make sure the channel is enabled
3. Check if your firewall blocks the connection
4. Try regenerating the webhook

---

## Troubleshooting

### No notifications received?

1. Verify the channel is **enabled** in Settings
2. Check that your webhook URL is correct
3. Make sure jobs are scoring above your threshold
4. Click "Send Test" to verify the connection

### Slack says "invalid_token"?

Your webhook was deleted or expired. Create a new one in Slack.

### Gmail email not working?

You need an App Password. Regular passwords don't work with SMTP.

### Discord embed looks broken?

Make sure your webhook URL starts with `https://discord.com/api/webhooks/`.

### Telegram says "chat not found"?

1. Make sure the bot is added to your group/channel
2. Verify the chat ID is correct (negative number for groups)
3. If it's a channel, make the bot an admin

---

## Technical Details

<details>
<summary><strong>For developers and the curious</strong></summary>

### Parallel Sending

All enabled channels send simultaneously, not one after another. Total notification time
equals the slowest channel, not the sum of all channels.

### Error Handling

If one channel fails, others still send. You only get an error if ALL channels fail.

### URL Validation

Webhooks are validated before sending:

- **Slack:** Must start with `https://hooks.slack.com/services/`
- **Discord:** Must start with `https://discord.com/api/webhooks/`
- **Teams:** Must start with `https://outlook.office.com/webhook/`

### Module Structure

```text
src-tauri/src/core/notify/
├── mod.rs       # Main router
├── slack.rs     # Slack webhooks
├── discord.rs   # Discord webhooks
├── teams.rs     # Teams webhooks
├── email.rs     # SMTP email
├── telegram.rs  # Telegram Bot API
└── desktop.rs   # Native OS notifications
```

### SMTP Settings

| Provider | Server | Port |
|----------|--------|------|
| Gmail | smtp.gmail.com | 587 |
| Outlook | smtp-mail.outlook.com | 587 |
| Yahoo | smtp.mail.yahoo.com | 587 |
| SendGrid | smtp.sendgrid.net | 587 |

All connections use TLS/STARTTLS encryption.

</details>

---

**Version:** 2.0.0 | **Last Updated:** January 17, 2026
