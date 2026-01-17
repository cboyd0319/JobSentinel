# Multi-Channel Notifications System

## Complete Implementation Guide for JobSentinel

> **Status:** ✅ Fully Implemented
> **Version:** 2.0.0
> **Last Updated:** 2026-01-17
> **Estimated Effort:** 2-3 weeks ✅ **COMPLETE**

---

## 🔐 Security Note (v2.0)

**All notification credentials are now stored in OS-native keyring storage**, not in the config file:

- **Webhook URLs**: Slack, Discord, Teams
- **API Tokens**: Telegram bot token
- **Passwords**: SMTP password

Configure credentials via the **Settings UI** in JobSentinel.
See [Keyring Documentation](../security/KEYRING.md) for full details.

---

## 🎯 Overview

JobSentinel now supports **5 notification channels** with rich formatting and comprehensive testing:

1. **📧 Email** - HTML emails via SMTP (Gmail, Outlook, custom servers)
2. **💬 Slack** - Rich blocks with buttons and fields
3. **💜 Discord** - Colorful embeds with automatic theming
4. **📱 Telegram** - MarkdownV2 formatted messages via Bot API
5. **💼 Microsoft Teams** - MessageCard format with action buttons
6. **🖥️ Desktop** - Native OS notifications (Windows, macOS, Linux)

---

## ✨ Key Features

### Multi-Channel Broadcasting

- **Graceful degradation** - If one channel fails, others still send
- **Parallel delivery** - All channels send simultaneously
- **Comprehensive logging** - Track success/failure per channel
- **Unified interface** - Single call sends to all enabled channels

### Rich Formatting

- **Email**: Beautiful HTML with gradients, tables, and buttons
- **Slack**: Interactive blocks with fields and actions
- **Discord**: Color-coded embeds (green/yellow/blue by score)
- **Telegram**: Markdown formatting with proper escaping
- **Teams**: MessageCard format with facts and actions

### Security & Validation (v2.0 Enhanced)

- **OS-native keyring** - All credentials stored in secure OS credential managers
- **URL validation** - Webhook URLs validated before sending
- **Credential protection** - Passwords never stored in config files
- **Domain verification** - Only official webhook domains allowed
- **Runtime validation** - Credentials validated when fetched from keyring
- **Test endpoints** - Validate configuration before use

---

## 📋 Configuration Reference

### Email Configuration

```json
{
  "alerts": {
    "email": {
      "enabled": true,
      "smtp_server": "smtp.gmail.com",
      "smtp_port": 587,
      "smtp_username": "your.email@gmail.com",
      "smtp_password": "your-app-specific-password",
      "from_email": "jobsentinel@yourdomain.com",
      "to_emails": ["recipient@example.com"],
      "use_starttls": true
    }
  }
}
```

**Popular SMTP Servers:**

- **Gmail**: `smtp.gmail.com:587` (requires App Password)
- **Outlook**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **SendGrid**: `smtp.sendgrid.net:587`

**Security Note**: Use app-specific passwords, not your main password!

---

### Slack Configuration

```json
{
  "alerts": {
    "slack": {
      "enabled": true,
      "webhook_url": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX"
    }
  }
}
```

**Setup Instructions:**

1. Go to <https://api.slack.com/apps>
2. Create a new app or select existing
3. Enable "Incoming Webhooks"
4. Add webhook to workspace
5. Copy webhook URL

---

### Discord Configuration

```json
{
  "alerts": {
    "discord": {
      "enabled": true,
      "webhook_url": "https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz",
      "user_id_to_mention": "123456789012345678"  // Optional
    }
  }
}
```

**Setup Instructions:**

1. Open Discord server settings
2. Go to Integrations → Webhooks
3. Click "New Webhook"
4. Name it "JobSentinel"
5. Select channel (e.g., #job-alerts)
6. Copy webhook URL

**Optional**: Add `user_id_to_mention` to ping yourself on alerts.

---

### Telegram Configuration

```json
{
  "alerts": {
    "telegram": {
      "enabled": true,
      "bot_token": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
      "chat_id": "-1001234567890"
    }
  }
}
```

**Setup Instructions:**

1. Message [@BotFather](https://t.me/BotFather) on Telegram
2. Send `/newbot` and follow prompts
3. Copy bot token (format: `123456789:ABCdef...`)
4. Add bot to your channel/group
5. Get chat ID:
   - For groups: Use [@userinfobot](https://t.me/userinfobot)
   - For channels: Forward message to [@getmyid_bot](https://t.me/getmyid_bot)

**Note**: Chat IDs for groups/channels start with `-` (negative number).

---

### Microsoft Teams Configuration

```json
{
  "alerts": {
    "teams": {
      "enabled": true,
      "webhook_url": "https://outlook.office.com/webhook/..."
    }
  }
}
```

**Setup Instructions:**

1. Open Teams and go to target channel
2. Click "..." → Connectors
3. Find "Incoming Webhook" → Configure
4. Name it "JobSentinel"
5. Upload icon (optional)
6. Copy webhook URL

---

### Desktop Notifications Configuration

```json
{
  "alerts": {
    "desktop": {
      "enabled": true
    }
  }
}
```

**Setup Instructions:**

Desktop notifications use native OS notification systems:

1. **Windows 11+**: Uses Windows Toast notifications (no configuration needed)
   - Notifications appear in Action Center
   - Sound plays automatically (respects system settings)

2. **macOS**: Uses native macOS notifications (no configuration needed)
   - Notifications appear in Notification Center
   - Sound plays automatically (respects system settings)

3. **Linux**: Uses D-Bus notification daemon (no configuration needed)
   - Requires notification daemon (e.g., dunst, notify-osd)
   - Desktop integration varies by distribution

**Features:**

- Instant notification delivery (no network dependency)
- Job title and match score displayed
- Click notification to open JobSentinel
- Works offline (local system notifications only)

---

## 🏗️ Architecture

### Module Structure

```text
src-tauri/src/core/notify/
├── mod.rs           # NotificationService (router)
├── slack.rs         # Slack webhook implementation
├── email.rs         # SMTP email implementation
├── discord.rs       # Discord webhook implementation
├── telegram.rs      # Telegram Bot API implementation
├── teams.rs         # Microsoft Teams webhook implementation
└── desktop.rs       # Native OS notification implementation
```

### Core Components

#### 1. NotificationService (src-tauri/src/core/notify/mod.rs)

The main router that sends notifications to all enabled channels:

```rust
pub struct NotificationService {
    config: Arc<Config>,
}

impl NotificationService {
    pub async fn send_immediate_alert(&self, notification: &Notification) -> Result<()> {
        // Sends to all enabled channels in parallel
        // Returns error only if ALL channels fail
    }
}
```

#### 2. Channel Modules

Each channel module implements:

- `send_X_notification()` - Main sending function
- `validate_X()` - Test/validate configuration
- URL/config validation with security checks
- Rich formatting specific to that channel

---

## 🎨 Message Formatting Examples

### Email (HTML)

```html
<!DOCTYPE html>
<html>
<body style="font-family: system-ui; max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px;">
        <h1 style="color: white;">🎯 High Match Job Alert</h1>
    </div>

    <div style="background: white; padding: 24px;">
        <h2>Senior Rust Engineer</h2>
        <span style="background: #3b82f6; color: white; padding: 6px 12px;">95% Match</span>

        <table>
            <tr><td><strong>Company:</strong></td><td>Awesome Corp</td></tr>
            <tr><td><strong>Location:</strong></td><td>Remote</td></tr>
            <tr><td><strong>Salary:</strong></td><td>$180,000 - $220,000</td></tr>
        </table>

        <h3>Why this matches:</h3>
        <ul>
            <li>✓ Title matches: Senior Rust Engineer</li>
            <li>✓ Has keyword: Rust</li>
            <li>✓ Salary >= $150,000</li>
            <li>✓ Remote job (matches preference)</li>
        </ul>

        <a href="https://..." style="background: #3b82f6; color: white; padding: 12px 32px;">
            View Full Job Posting →
        </a>
    </div>
</body>
</html>
```

### Slack (Blocks)

```json
{
  "blocks": [
    {
      "type": "header",
      "text": {"type": "plain_text", "text": "🎯 High Match: Senior Rust Engineer"}
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Company:*\nAwesome Corp"},
        {"type": "mrkdwn", "text": "*Location:*\nRemote"},
        {"type": "mrkdwn", "text": "*Score:*\n95%"},
        {"type": "mrkdwn", "text": "*Source:*\ngreenhouse"}
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Why this matches:*\n✓ Title matches: Senior Rust Engineer\n✓ Has keyword: Rust\n✓ Salary >= $150,000\n✓ Remote job (matches preference)"
      }
    },
    {
      "type": "actions",
      "elements": [{
        "type": "button",
        "text": {"type": "plain_text", "text": "View Job"},
        "url": "https://...",
        "style": "primary"
      }]
    }
  ]
}
```

### Discord (Embed)

```json
{
  "embeds": [{
    "title": "🎯 Senior Rust Engineer - Awesome Corp",
    "description": "**95% Match** • greenhouse",
    "url": "https://...",
    "color": 1095041,  // Green for high scores (90%+)
    "fields": [
      {"name": "📍 Location", "value": "Remote", "inline": true},
      {"name": "💰 Salary", "value": "$180,000 - $220,000", "inline": true},
      {"name": "🏢 Remote", "value": "✅ Yes", "inline": true},
      {"name": "✨ Why this matches", "value": "✓ Title matches: Senior Rust Engineer\n✓ Has keyword: Rust\n✓ Salary >= $150,000\n✓ Remote job", "inline": false}
    ],
    "footer": {"text": "JobSentinel • Job Search Automation"},
    "timestamp": "2025-11-15T10:30:00Z"
  }]
}
```

### Telegram (MarkdownV2)

```text
🎯 *High Match Job Alert*

*Senior Rust Engineer*
Awesome Corp • 95% Match

*Company:* Awesome Corp
*Location:* Remote
*Salary:* $180,000 - $220,000
*Source:* greenhouse
*Remote:* ✅ Yes

*Why this matches:*
  ✓ Title matches: Senior Rust Engineer
  ✓ Has keyword: Rust
  ✓ Salary >= $150,000
  ✓ Remote job (matches preference)

[View Full Job Posting](https://...)

_Sent by JobSentinel • Job Search Automation_
```

### Microsoft Teams (MessageCard)

```json
{
  "@type": "MessageCard",
  "@context": "https://schema.org/extensions",
  "summary": "New job alert: Senior Rust Engineer at Awesome Corp",
  "themeColor": "00FF00",  // Green for high scores
  "title": "🎯 High Match Job Alert (95% Match)",
  "sections": [{
    "activityTitle": "**Senior Rust Engineer**",
    "activitySubtitle": "Awesome Corp • greenhouse",
    "facts": [
      {"name": "Location:", "value": "Remote"},
      {"name": "Salary:", "value": "$180,000 - $220,000"},
      {"name": "Remote:", "value": "✅ Yes"},
      {"name": "Match Score:", "value": "95%"}
    ],
    "text": "**Why this matches:**\n\n✓ Title matches: Senior Rust Engineer\n\n✓ Has keyword: Rust\n\n✓ Salary >= $150,000\n\n✓ Remote job"
  }],
  "potentialAction": [{
    "@type": "OpenUri",
    "name": "View Full Job Posting",
    "targets": [{"os": "default", "uri": "https://..."}]
  }]
}
```

---

## 🧪 Testing & Validation

### Test Each Channel

All channels implement validation endpoints:

```rust
// Email
email::validate_email_config(&config).await?;
// Sends test email to verify SMTP settings

// Slack
slack::validate_webhook(&webhook_url).await?;
// Sends "Webhook validation successful ✅" message

// Discord
discord::validate_webhook(&webhook_url).await?;
// Sends test embed

// Telegram
telegram::validate_telegram_config(&config).await?;
// Sends test message via Bot API

// Teams
teams::validate_webhook(&webhook_url).await?;
// Sends test MessageCard
```

### Unit Tests

Each module has comprehensive unit tests:

```bash
# Run all notification tests
cargo test --lib notify

# Run specific channel tests
cargo test --lib email::tests
cargo test --lib discord::tests
cargo test --lib telegram::tests
cargo test --lib teams::tests
cargo test --lib slack::tests
```

**Test Coverage:**

- ✅ URL validation (valid/invalid formats)
- ✅ Message formatting (HTML, Markdown, JSON)
- ✅ Special character escaping (Telegram MarkdownV2)
- ✅ Missing field handling (salary, location)
- ✅ Score-based theming (colors based on match percentage)
- ✅ Security validation (domain checks, HTTPS enforcement)

---

## 🔒 Security Considerations

### Credential Storage (v2.0)

All sensitive credentials are stored in OS-native keyring:

| Credential | Storage Location |
|------------|-----------------|
| Slack webhook URL | OS Keyring |
| Discord webhook URL | OS Keyring |
| Teams webhook URL | OS Keyring |
| Telegram bot token | OS Keyring |
| SMTP password | OS Keyring |

**Migration:** Existing plaintext credentials are automatically migrated to keyring on first v2.0 launch.

See [Keyring Documentation](../security/KEYRING.md) for full details.

### URL Validation

All webhook URLs are validated before sending:

**Slack:**

- ✅ Must start with `https://hooks.slack.com/services/`
- ✅ HTTPS only
- ✅ Correct domain verification

**Discord:**

- ✅ Must start with `https://discord.com/api/webhooks/` or `https://discordapp.com/api/webhooks/`
- ✅ HTTPS only
- ✅ Path validation

**Telegram:**

- ✅ Uses official Bot API (`https://api.telegram.org/bot...`)
- ✅ Token format validation
- ✅ Chat ID format validation

**Teams:**

- ✅ Must start with `https://outlook.office.com/webhook/` or `https://outlook.office365.com/webhook/`
- ✅ HTTPS only
- ✅ Domain verification

### Credential Protection (v2.0 Enhanced)

**All Credentials (v2.0):**

- ✅ **OS-native keyring storage** - Not in config files
- ✅ macOS Keychain / Windows Credential Manager / Linux Secret Service
- ✅ Encrypted at rest by OS
- ✅ Access control per-application
- ✅ Never logs credentials
- ✅ Runtime validation from keyring

**Email (SMTP):**

- ✅ Password stored in OS keyring
- ✅ Support for app-specific passwords
- ✅ TLS/STARTTLS encryption enforced

**Telegram:**

- ✅ Bot token stored in OS keyring
- ✅ Validation before use

**Webhooks (Slack, Discord, Teams):**

- ✅ URLs stored in OS keyring
- ✅ Domain verification before sending

### Data Privacy

- ✅ All notifications sent over HTTPS/TLS
- ✅ No job data stored in third-party services (direct sends only)
- ✅ Webhooks can be disabled per channel
- ✅ Test endpoints don't expose sensitive job data

---

## 📊 Performance Characteristics

### Latency

| Channel | Average Latency | Timeout |
|---------|----------------|---------|
| Email | 500-2000ms | 10s |
| Slack | 100-300ms | 10s |
| Discord | 100-400ms | 10s |
| Telegram | 200-500ms | 10s |
| Teams | 200-600ms | 10s |

### Concurrent Sending

All channels send **in parallel**, not sequentially:

```rust
// ✅ All channels send simultaneously
if slack.enabled { tokio::spawn(send_slack(...)); }
if email.enabled { tokio::spawn(send_email(...)); }
if discord.enabled { tokio::spawn(send_discord(...)); }
// etc.
```

**Total notification time** = slowest channel time, not sum of all channels.

### Error Handling

- **Partial failure OK**: If 1 channel fails but others succeed, notification still succeeds
- **Total failure**: Error returned only if ALL enabled channels fail
- **Detailed logging**: Each channel's success/failure logged individually

---

## 🚀 Usage Examples

### Example 1: Send Alert to All Channels

```rust
use crate::core::{
    notify::{NotificationService, Notification},
    config::Config,
    db::Job,
    scoring::JobScore,
};

// Load config
let config = Arc::new(Config::load(&config_path)?);

// Create notification service
let notify = NotificationService::new(config.clone());

// Create notification
let notification = Notification {
    job: high_scoring_job,
    score: job_score,
};

// Send to all enabled channels
notify.send_immediate_alert(&notification).await?;

// Logs:
// ✓ Sent Slack notification for: Senior Rust Engineer
// ✓ Sent email notification for: Senior Rust Engineer
// ✓ Sent Discord notification for: Senior Rust Engineer
// ✓ Sent Telegram notification for: Senior Rust Engineer
// ✓ Sent Teams notification for: Senior Rust Engineer
// ✓ Sent desktop notification for: Senior Rust Engineer
```

### Example 2: Validate Configuration

```rust
use crate::core::config::{EmailConfig, DiscordConfig};
use crate::core::notify::{email, discord};

// Validate email settings
let email_config = EmailConfig {
    enabled: true,
    smtp_server: "smtp.gmail.com".to_string(),
    smtp_port: 587,
    smtp_username: "test@example.com".to_string(),
    smtp_password: "app-specific-password".to_string(),
    from_email: "jobsentinel@example.com".to_string(),
    to_emails: vec!["recipient@example.com".to_string()],
    use_starttls: true,
};

match email::validate_email_config(&email_config).await {
    Ok(_) => println!("✅ Email configuration valid!"),
    Err(e) => println!("❌ Email configuration invalid: {}", e),
}

// Validate Discord webhook
let webhook_url = "https://discord.com/api/webhooks/123/abc";
match discord::validate_webhook(webhook_url).await {
    Ok(_) => println!("✅ Discord webhook valid!"),
    Err(e) => println!("❌ Discord webhook invalid: {}", e),
}
```

### Example 3: Enable/Disable Channels

```json
{
  "alerts": {
    "slack": {"enabled": false},       // Disabled
    "email": {"enabled": true, ...},   // Enabled
    "discord": {"enabled": true, ...}, // Enabled
    "telegram": {"enabled": false},    // Disabled
    "teams": {"enabled": false},       // Disabled
    "desktop": {"enabled": true}       // Enabled
  }
}
```

Only enabled channels will send notifications.

---

## 🛠️ Troubleshooting

### Email Issues

**Problem:** "Failed to send email via SMTP"

**Solutions:**

1. **Gmail users**: Enable 2-factor auth and create App Password
   - Go to Google Account → Security → 2-Step Verification → App Passwords
   - Generate password for "Mail" app
   - Use this instead of your regular password
2. **Outlook users**: Use `smtp-mail.outlook.com:587` with STARTTLS
3. **Firewall**: Ensure port 587 (STARTTLS) or 465 (SSL) is not blocked
4. **Test connection**: Use `telnet smtp.gmail.com 587` to verify connectivity

**Problem:** "Invalid from email format"

**Solution:** Ensure email contains `@` and is properly formatted (e.g., `jobsentinel@example.com`)

---

### Slack Issues

**Problem:** "Invalid Slack webhook URL format"

**Solution:** Webhook URL must start with `https://hooks.slack.com/services/`

**Problem:** "Slack webhook failed: 404"

**Solution:** Webhook may have been deleted. Regenerate in Slack app settings.

---

### Discord Issues

**Problem:** "Invalid Discord webhook URL format"

**Solution:** URL must start with `https://discord.com/api/webhooks/` or `https://discordapp.com/api/webhooks/`

**Problem:** "Discord webhook failed: 404"

**Solution:** Webhook deleted or channel removed. Create new webhook.

**Problem:** "User mention not working"

**Solution:**

1. Get your Discord user ID: Right-click username → Copy ID (enable Developer Mode in Settings)
2. Add to config: `"user_id_to_mention": "123456789012345678"`

---

### Telegram Issues

**Problem:** "Telegram API error: Unauthorized"

**Solution:** Bot token is invalid. Get new token from @BotFather.

**Problem:** "Telegram API error: Bad Request: chat not found"

**Solution:**

1. Ensure bot is added to the group/channel
2. Verify chat ID is correct (should start with `-` for groups)
3. Make bot admin if using channels

**Problem:** "Markdown parsing error"

**Solution:** Special characters are automatically escaped. If issues persist, check for unmatched formatting.

---

### Microsoft Teams Issues

**Problem:** "Invalid Teams webhook URL format"

**Solution:** URL must start with `https://outlook.office.com/webhook/` or `https://outlook.office365.com/webhook/`

**Problem:** "Teams webhook failed: 400 Bad Request"

**Solution:**

1. Webhook may have been removed. Regenerate in Teams Connectors.
2. Check if MessageCard format is valid (our implementation handles this automatically).

---

## 📈 Future Enhancements

### Planned Features

- [ ] **SMS notifications** (via Twilio)
- [ ] **Notification batching** (digest mode: daily summary)
- [ ] **Rate limiting** (prevent spam for high-volume days)
- [ ] **Custom templates** (user-defined message formats)
- [ ] **Notification history** (log all sent notifications)
- [ ] **Channel-specific filters** (different thresholds per channel)
- [ ] **Rich media attachments** (job logos, company images)
- [ ] **A/B testing** (test different message formats)
- [ ] **Analytics dashboard** (track open rates, click rates)

### Experimental Ideas

- **Adaptive Cards** (for Teams - richer than MessageCard)
- **Email threading** (group related jobs in single email thread)
- **Push notifications** (mobile app integration)
- **Webhook retry logic** (exponential backoff on failures)
- **Channel health monitoring** (alert if channel consistently fails)

---

## 📚 API Reference

### NotificationService

```rust
pub struct NotificationService {
    config: Arc<Config>,
}

impl NotificationService {
    /// Create new notification service
    pub fn new(config: Arc<Config>) -> Self;

    /// Send immediate alert to all enabled channels
    pub async fn send_immediate_alert(&self, notification: &Notification) -> Result<()>;
}
```

### Notification

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub job: Job,
    pub score: JobScore,
}
```

### Channel Functions

```rust
// Email
pub async fn send_email_notification(config: &EmailConfig, notification: &Notification) -> Result<()>;
pub async fn validate_email_config(config: &EmailConfig) -> Result<bool>;

// Slack
pub async fn send_slack_notification(webhook_url: &str, notification: &Notification) -> Result<()>;
pub async fn validate_webhook(webhook_url: &str) -> Result<bool>;

// Discord
pub async fn send_discord_notification(config: &DiscordConfig, notification: &Notification) -> Result<()>;
pub async fn validate_webhook(webhook_url: &str) -> Result<bool>;

// Telegram
pub async fn send_telegram_notification(config: &TelegramConfig, notification: &Notification) -> Result<()>;
pub async fn validate_telegram_config(config: &TelegramConfig) -> Result<bool>;

// Teams
pub async fn send_teams_notification(webhook_url: &str, notification: &Notification) -> Result<()>;
pub async fn validate_webhook(webhook_url: &str) -> Result<bool>;

// Desktop
pub async fn send_desktop_notification(notification: &Notification) -> Result<()>;
pub fn validate_desktop() -> Result<bool>;
```

---

## ✅ Deployment Checklist

Before enabling multi-channel notifications in production:

- [ ] Configure at least one notification channel
- [ ] Test configuration using validation endpoints
- [ ] Verify webhook URLs are correct (for webhook-based channels)
- [ ] Test with actual job notification
- [ ] Check logs for successful delivery
- [ ] Confirm message formatting looks good
- [ ] Set up monitoring for failed notifications
- [ ] Document channel configurations for team
- [ ] Back up configuration (especially SMTP passwords)
- [ ] Test failure scenarios (invalid webhook, network issues)
- [ ] Verify desktop notifications work on target platforms (Windows, macOS, Linux)

---

## 📝 Changelog

### v1.5.0 (2026-01-17)

**Documentation Update:**

- ✅ Updated all version references to 1.5.0
- ✅ Added Desktop notifications to channel list
- ✅ Updated Last Updated date

### v1.0.0 (2025-11-15)

**Initial Release:**

- ✅ Email notifications via SMTP (HTML + plain text)
- ✅ Slack notifications (rich blocks)
- ✅ Discord notifications (color-coded embeds)
- ✅ Telegram notifications (MarkdownV2)
- ✅ Microsoft Teams notifications (MessageCard)
- ✅ Configuration validation
- ✅ Comprehensive unit tests (95%+ coverage)
- ✅ Security validation (webhook URLs, domains)
- ✅ Graceful error handling
- ✅ Parallel channel sending
- ✅ Test/validation endpoints for all channels

---

**Last Updated:** 2026-01-17
**Maintained By:** JobSentinel Core Team
**Documentation Version:** 2.0.0
**Implementation Status:** ✅ Production Ready (with secure credential storage)
