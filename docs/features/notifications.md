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
Copy that link, then paste it into JobSentinel.

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
| **Telegram**        | Optional phone chat alerts            |

You can enable multiple channels at once. JobSentinel only sends alerts to
channels you configure.

## Source Boundaries

Notifications only cover sources JobSentinel monitors locally. LinkedIn is a
user-opened search-link destination, not a background notification source.

## Alert Privacy

Desktop alerts keep job details inside JobSentinel. Optional email and chat
alerts may include job title, company, location, salary, remote status, match
score, source, and job link because those services deliver the alert outside
the app. Local match reasons, saved search strategy, salary-floor details,
private notes, and application history stay inside JobSentinel; open the app to
review those details.

---

## Setting Up Notifications

Start with desktop alerts if you want the simplest setup. Use email if you want
an inbox copy. Use chat alerts only if Slack, Discord, Teams, or Telegram are
already part of your routine.

### Desktop Notifications

1. In JobSentinel, open Settings, choose Sources & Alerts, then turn on Desktop
   Notifications

That's it. No connection link needed.

**What you'll get:** Desktop alerts:

- **Windows:** Toast notifications in Action Center
- **macOS:** Notification Center alerts
- **Linux:** System notification daemon alerts

Desktop alerts use privacy-preserving wording by default. They tell you that a
match or reminder is ready in JobSentinel without showing job titles, company
names, salary notes, or reminder text on the operating system notification
surface.

---

### Email

1. In JobSentinel, open Settings, choose Sources & Alerts, then turn on Email
   Alerts
2. Choose Gmail, Outlook, Yahoo, or Other
3. Enter the email address that should send alerts
4. Enter an app password if your email provider requires one
5. Add recipient email addresses
6. Use **Manual email setup** only if your email service gives you manual email
   details

**Gmail and Yahoo users:** Use an app password from your account security page.
JobSentinel links to those pages from the Email settings panel.

**What you'll get:** Email messages with job details.

---

## Optional Chat Alerts

### Slack Chat Alerts

Use this only if you already use Slack and want chat alerts. Desktop alerts and
email alerts are easier to set up.

1. Go to [Slack's channel connection page](https://api.slack.com/messaging/webhooks)
2. Follow Slack's steps to create a channel connection link
3. Pick the workspace and channel you want to receive alerts
4. Use "JobSentinel" as the name if Slack asks
5. Copy the connection link
6. In JobSentinel, open Settings, choose Sources & Alerts, then paste the link in
   Slack Notifications

**What you'll get:** Formatted messages with job details and a "View Job" button.

---

### Discord

1. Open your Discord server
2. Skip this channel if you do not already use Discord alerts
3. Create or open a channel connection link
4. Name it "JobSentinel" if Discord asks
5. Pick a channel
6. Copy the connection link
7. In JobSentinel, open Settings, choose Sources & Alerts, then paste the link in
   Discord Notifications

**What you'll get:** Alert cards that make stronger matches easy to spot.

**Optional:** Add a Discord mention only if you want alerts to tag you.

---

### Microsoft Teams

1. Open Teams and go to your target channel
2. Click More options > Connectors
3. Find the connector that creates a channel connection link
4. Name it "JobSentinel"
5. Copy the connection link
6. In JobSentinel, open Settings, choose Sources & Alerts, then paste the link in
   Microsoft Teams Notifications

**What you'll get:** Cards with job details and action buttons.

---

### Telegram

Use desktop or email alerts unless you already use Telegram for automatic
alerts. Telegram alerts are an optional chat-alert path because Telegram
requires setup details shown in the app.

<details>
<summary><strong>Optional Telegram alert setup</strong></summary>
<br>

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the setup code it gives you
4. Add your Telegram alert bot to a group or channel
5. Find the Telegram chat number for that group or channel:
   - For groups: Use [@userinfobot](https://t.me/userinfobot)
   - For channels: Forward a message to [@getmyid_bot](https://t.me/getmyid_bot)
6. In JobSentinel, open Settings, choose Sources & Alerts, then paste the setup
   code and chat number in Telegram Notifications

**Note:** Group chat numbers usually start with `-`.

**What you'll get:** Formatted messages right on your phone.

</details>

---

## When Do Notifications Send?

By default, alert match strength is source-specific: large job boards start
around 70%, Greenhouse and Lever around 80%, and connected job sources around
75%.

You can adjust this in Settings, under Sources & Alerts, with Match strength.

**Tip:** Raise match strength when alerts feel noisy. Lower it when alerts feel
too quiet.

---

## Security Note

Notification links, app passwords, and alert codes use your operating system's
password store:

- **macOS:** Keychain
- **Windows:** Credential Manager
- **Linux:** Secret Service

Older saved details are moved into that password store and cleared when
possible.

---

## Testing Your Setup

After configuring a channel, click **"Test"** to verify it works.

You should receive a test notification within a few seconds.

If it doesn't work:

1. Double-check the connection link or password
2. Make sure the channel is enabled
3. Check whether your computer or network is blocking alerts
4. Create a fresh connection link

---

## Troubleshooting

### No notifications received?

1. Make sure that alert channel is turned on in Settings
2. Check that your connection link is correct
3. Make sure jobs meet your match-strength setting
4. Click "Test" to check it

### Slack says the link is invalid?

Your connection link was deleted or expired. Create a new one in Slack.

### Gmail email not working?

Use an app password from Google Account Security, then paste that app password
into JobSentinel.

### Discord alert looks broken?

Copy a fresh Discord channel connection link, paste it into JobSentinel, then
click Test.

### Telegram says "chat not found"?

1. Make sure the bot is added to your group/channel
2. Check that the chat number is correct (negative number for groups)
3. If it's a channel, give the bot permission to post there

---

## Maintainer Notes

<details>
<summary><strong>Alert delivery details</strong></summary>

### Parallel Sending

All enabled channels send simultaneously, not one after another. Total notification time
equals the slowest channel, not the sum of all channels.

### Error Handling

If one channel fails, others still send. You only get an error if ALL channels fail.

### Connection Link Checks

Connection links are checked before alerts send:

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
- desktop.rs   # Desktop alerts
```

### Manual Email Details

Use manual email details only if your email service gives them to you.

| Provider | Server                | Port |
| -------- | --------------------- | ---- |
| Gmail    | smtp.gmail.com        | 587  |
| Outlook  | smtp-mail.outlook.com | 587  |
| Yahoo    | smtp.mail.yahoo.com   | 587  |
| SendGrid | smtp.sendgrid.net     | 587  |

All connections use TLS/STARTTLS encryption.

</details>
