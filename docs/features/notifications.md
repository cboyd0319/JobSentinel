# Notifications

**Get notified when a strong match needs review.**

JobSentinel can alert you the moment it finds a job that matches your criteria.
Notifications stay optional and user-controlled so you can review jobs on your
schedule.

![Notification Settings](../images/settings.png)

---

## What is a connection link?

Desktop alerts do not need a connection link. Email alerts use your email
provider's app password or sending settings.

Slack, Discord, and Teams give you a private connection link for chat alerts.
They may call it an "incoming webhook" in their settings. Copy that link, then
paste it into JobSentinel.

---

## Available Notification Channels

Pick whichever channels work best for you:

| Channel             | Best For                         |
| ------------------- | -------------------------------- |
| **Desktop**         | Easiest instant on-screen alerts |
| **Email**           | Want a record in your inbox      |
| **Slack**           | Already live in Slack for work   |
| **Discord**         | Have a personal Discord server   |
| **Microsoft Teams** | Your company uses Teams          |
| **Telegram**        | Advanced setup for Telegram bot users |

You can enable multiple channels at once. JobSentinel only sends alerts to
channels you configure.

## Source Boundaries

Notifications only cover sources JobSentinel monitors locally. LinkedIn is a
user-opened search-link destination, not a background notification source.

---

## Setting Up Notifications

Start with desktop alerts if you want the simplest setup. Use email if you want
an inbox copy. Use chat alerts only if Slack, Discord, Teams, or Telegram are
already part of your routine.

### Desktop Notifications

1. In JobSentinel, open Settings, choose More Settings, then turn on Desktop
   Notifications

That's it. No connection link needed.

**What you'll get:** Native OS notifications:

- **Windows:** Toast notifications in Action Center
- **macOS:** Notification Center alerts
- **Linux:** System notification daemon alerts

Desktop alerts use privacy-preserving wording by default. They tell you that a
match or reminder is ready in JobSentinel without showing job titles, company
names, salary notes, or reminder text on the operating system notification
surface.

---

### Email

1. In JobSentinel, open Settings, choose More Settings, then turn on Email
   Alerts
2. Choose Gmail, Outlook, Yahoo, or Other
3. Enter the email address that should send alerts
4. Enter an app password if your email provider requires one
5. Add recipient email addresses
6. Use Email provider details only if your provider gives you manual email
   details

**Gmail and Yahoo users:** Use an app password from your account security page.
JobSentinel links to those pages from the Email settings panel.

**What you'll get:** Email messages with job details.

---

## Optional Chat Alerts

### Slack Advanced Chat Setup

Use this only if you already use Slack and want chat alerts. Desktop alerts and
email alerts are easier to set up.

1. Go to [Slack's connection-link page](https://api.slack.com/messaging/webhooks)
2. Click "Create New App" > "From Scratch"
3. Name it "JobSentinel" and pick your workspace
4. Turn on channel connection links
5. Click "Add New Webhook to Workspace"
6. Pick a channel (like #job-alerts)
7. Copy the connection link
8. In JobSentinel, open Settings, choose More Settings, then paste the link in
   Slack Notifications

**What you'll get:** Formatted messages with job details and a "View Job" button.

---

### Discord

1. Open your Discord server
2. Go to Server Settings > Integrations
3. Create a channel connection link
4. Name it "JobSentinel"
5. Pick a channel
6. Copy the connection link
7. In JobSentinel, open Settings, choose More Settings, then paste the link in
   Discord Notifications

**What you'll get:** Alert cards that make stronger matches easy to spot.

**Bonus:** Add your Discord user ID to get @mentioned on alerts.

---

### Microsoft Teams

1. Open Teams and go to your target channel
2. Click More options > Connectors
3. Find the connector that creates a channel connection link
4. Name it "JobSentinel"
5. Copy the connection link
6. In JobSentinel, open Settings, choose More Settings, then paste the link in
   Microsoft Teams Notifications

**What you'll get:** Cards with job details and action buttons.

---

### Telegram

Use desktop or email alerts unless you already use Telegram bots. Telegram
alerts are an advanced chat-alert path because Telegram requires an alert code
and destination number.

<details>
<summary><strong>Advanced Telegram setup</strong></summary>
<br>

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the alert code it gives you
4. Add your Telegram alert bot to a group or channel
5. Find the Telegram destination number for that group or channel:
   - For groups: Use [@userinfobot](https://t.me/userinfobot)
   - For channels: Forward a message to [@getmyid_bot](https://t.me/getmyid_bot)
6. In JobSentinel, open Settings, choose More Settings, then paste the alert
   code and destination number in Telegram Notifications

**Note:** Group destination numbers usually start with `-`.

**What you'll get:** Formatted messages right on your phone.

</details>

---

## When Do Notifications Send?

By default, JobSentinel sends notifications for jobs with a **90% or higher**
match-strength setting.

You can adjust this in Settings, under More Settings, with Match strength.

**Tip:** Start at 90% to avoid too many alerts. Lower it to 80% if you want
more alerts.

---

## Security Note

**Your saved details are safe.** Notification links, app passwords, and alert
codes are stored in your operating system's secure credential manager:

- **macOS:** Keychain
- **Windows:** Credential Manager
- **Linux:** Secret Service

Saved details are never stored in plain text configuration files.

---

## Testing Your Setup

After configuring a channel, click **"Test"** to verify it works.

You should receive a test notification within a few seconds.

If it doesn't work:

1. Double-check the connection link or password
2. Make sure the channel is enabled
3. Check if your firewall blocks the connection
4. Create a fresh connection link

---

## Troubleshooting

### No notifications received?

1. Verify the channel is **enabled** in Settings
2. Check that your connection link is correct
3. Make sure jobs meet your match-strength setting
4. Click "Test" to verify the connection

### Slack says the link is invalid?

Your connection link was deleted or expired. Create a new one in Slack.

### Gmail email not working?

Use an app password from Google Account Security, then paste that app password
into JobSentinel.

### Discord alert looks broken?

Make sure your connection link starts with `https://discord.com/api/webhooks/`.

### Telegram says "chat not found"?

1. Make sure the bot is added to your group/channel
2. Verify the destination number is correct (negative number for groups)
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

- **Slack:** `https://hooks.slack.com/services/...`
- **Discord:** `https://discord.com/api/webhooks/...` or
  `https://discordapp.com/api/webhooks/...`
- **Teams:** `https://outlook.office.com/webhook/...` or
  `https://outlook.office365.com/webhook/...`

### Module Structure

```text
src-tauri/src/core/notify/
- mod.rs       # Main router
- slack.rs     # Slack webhooks
- discord.rs   # Discord webhooks
- teams.rs     # Teams webhooks
- email.rs     # Email sending
- telegram.rs  # Telegram Bot API
- desktop.rs   # Native OS notifications
```

### Advanced Sending Server Reference

Only needed for manual provider setup.

| Provider | Server                | Port |
| -------- | --------------------- | ---- |
| Gmail    | smtp.gmail.com        | 587  |
| Outlook  | smtp-mail.outlook.com | 587  |
| Yahoo    | smtp.mail.yahoo.com   | 587  |
| SendGrid | smtp.sendgrid.net     | 587  |

All connections use TLS/STARTTLS encryption.

</details>
