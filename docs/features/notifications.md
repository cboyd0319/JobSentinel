# Notifications

**Get notified when a role that fits your search needs review.**

JobSentinel can alert you when it finds a job that fits your criteria.
Notifications stay optional and user-controlled so you can review jobs on your
schedule.

![Notification Settings](../images/settings.png)

---

## What is a connection link?

Desktop alerts do not need a connection link. Email alerts use your email
service's app password or sending settings.

Slack, Discord, and Teams give you a connection link for chat alerts. Treat it
like a password; paste it only into JobSentinel.

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
| **Telegram**        | Optional phone chat alerts       |

You can enable multiple channels at once. JobSentinel only sends alerts to
channels you configure.

## Source Boundaries

Notifications only cover sources JobSentinel monitors locally. LinkedIn is a
user-opened search-link destination, not a background notification source.

## Alert Privacy

Desktop alerts keep job details inside JobSentinel. Optional email and chat
alerts may include job title, company, location, salary, remote status, fit
label, source, and job link because those services deliver the
alert outside the app. Local fit reasons, saved search strategy, salary-floor details,
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
- **Linux:** Desktop alerts

Desktop alerts use privacy-preserving wording by default. They tell you that a
fit review or reminder is ready in JobSentinel without showing job titles, company
names, salary notes, or reminder text on the operating system notification
surface.

---

### Email

1. In JobSentinel, open Settings, choose Sources & Alerts, then turn on Email
   Alerts
2. Choose Gmail, Outlook, Yahoo, or Other
3. Enter the email address that should send alerts
4. Enter an app password if your email service requires one
5. Add recipient email addresses
6. If your email service gives you manual email details, open **Only if your
   email service gave you these details**

**Gmail and Yahoo users:** Use an app password from your account security page.
JobSentinel links to those pages from the Email settings panel.

**What you'll get:** Email messages with job details.

---

## Optional Chat Alerts

### Slack Chat Alerts

Use this only if you already use Slack and want chat alerts. Desktop alerts and
email alerts are easier to set up.

1. Open Slack's alert-connection page from JobSentinel Settings
2. Follow Slack's steps to create a channel connection link
3. Pick the workspace and channel you want to receive alerts
4. Use "JobSentinel" as the name if Slack asks
5. Copy the connection link
6. In JobSentinel, open Settings, choose Sources & Alerts, then paste the link in
   Slack Notifications
7. Turn on Enable Slack alerts after you review the connection

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

**What you'll get:** Alert cards that make roles with stronger fit easier to
spot.

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

Use desktop or email alerts unless Telegram is already part of your alert
routine. Telegram alerts are an optional chat-alert path because they require
two details from Telegram before JobSentinel can send alerts there.

<details>
<summary><strong>Optional Telegram alert setup</strong></summary>
<br>

1. Complete Telegram's own alert setup first
2. Copy the setup code Telegram gives you
3. Copy the destination shown by Telegram for where alerts should go
4. In JobSentinel, open Settings, choose Sources & Alerts, then paste the setup
   code and destination in Telegram Notifications

**Note:** Use the exact details shown by Telegram.

**What you'll get:** Formatted messages right on your phone.

</details>

---

## When Do Notifications Send?

Each job site starts with a moderate alert filter. Raise it if alerts feel
noisy. Lower it if too few arrive.

You can adjust this in Settings, under Sources & Alerts, with How picky alerts
are.

**Tip:** Raise the filter when alerts feel noisy. Lower it when alerts feel too
quiet.

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

## When Something Does Not Work

### Alerts Do Not Arrive

1. Make sure that alert channel is turned on in Settings
2. Check that your connection link is correct
3. Make sure jobs meet your alert setting
4. Click "Test" to check it

### Slack Says The Link Is Invalid

Your connection link was deleted or expired. Create a new one in Slack.

### Gmail Email Does Not Send

Use an app password from Google Account Security, then paste that app password
into JobSentinel.

### Discord Alert Looks Wrong

Copy a fresh Discord channel connection link, paste it into JobSentinel, then
click Test.

### Telegram says the alert destination cannot be found?

1. Make sure Telegram's alert setup is connected to your group or channel
2. Check that the Telegram details match what Telegram showed you
3. If it is a channel, allow the Telegram alert setup to post there
