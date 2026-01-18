# Secure Credential Storage

**Never store passwords in plain text again.**

JobSentinel uses OS-native credential managers to keep your sensitive information safe.
Your Slack webhooks, email passwords, and API tokens are encrypted and protected by your
operating system - not stored in a config file.

---

## Why This Matters

Before v2.0, credentials were stored in plain text in `config.json`. That's a security risk:

- Anyone with file access can read your secrets
- Accidental commits to GitHub expose credentials
- Data breaches hit harder when passwords are unencrypted

OS-native credential managers solve this by using the OS's built-in encryption:

- **macOS Keychain** - Apple's encrypted credential storage
- **Windows Credential Manager** - Microsoft's secure vault
- **Linux Secret Service (libsecret)** - Freedesktop's standardized secret storage

Your credentials are encrypted at rest and only decrypted when JobSentinel asks for them.

---

## What Gets Stored Securely

These credentials are automatically stored in your OS keyring:

| Credential | Used For |
|-----------|----------|
| **Slack webhook URL** | Job notifications to Slack |
| **Discord webhook URL** | Job notifications to Discord |
| **Microsoft Teams webhook URL** | Job notifications to Teams |
| **Email SMTP password** | Sending job alerts via email |
| **LinkedIn session cookies** | Scraping LinkedIn job postings |
| **Telegram bot token** | Job notifications via Telegram |

All other configuration (job boards to scrape, salary thresholds, etc.) stays in `config.json` where it belongs.

---

## How It Works

### Setup (First Time)

1. Open JobSentinel Settings → Notifications (or any feature needing credentials)
2. Enter your credential (webhook URL, password, etc.)
3. Click **Save**
4. JobSentinel encrypts it and stores in your OS keyring
5. The credential is never written to `config.json`

### Usage (Every Time)

1. JobSentinel needs to send a notification
2. It asks your OS: "Can I have the Slack webhook?"
3. OS checks if JobSentinel can access it (usually automatic)
4. OS decrypts and returns the credential
5. JobSentinel uses it and discards it from memory

### Updating

1. Go to Settings → Edit the credential
2. Enter the new value
3. Click **Save**
4. Old credential is deleted, new one encrypted and stored

---

## Platform-Specific Details

### macOS

Your credentials are stored in **Keychain** (the same place your WiFi passwords and Apple ID credentials live).

**To view stored credentials:**

1. Open **Keychain Access** (Applications → Utilities)
2. Search for "JobSentinel"
3. You'll see entries like "JobSentinel: slack-webhook" or "JobSentinel: email-password"

**If you see a permission prompt:**

- First time JobSentinel accesses a credential, you may see: "Allow 'JobSentinel' to access your keychain?"
- Click **Always Allow** for seamless operation
- This is normal and expected

**To reset all credentials:**

1. Keychain Access → Search "JobSentinel"
2. Select all matching items
3. Delete them
4. JobSentinel will ask for fresh credentials next time

---

### Windows

Your credentials are stored in **Credential Manager** (the same place Edge saves login passwords).

**To view stored credentials:**

1. Settings → Accounts → Credential Manager
2. Click **Windows Credentials**
3. Look for entries like "JobSentinel" with your webhook URLs or passwords

**If you see a UAC prompt:**

- First-time access may show: "Allow JobSentinel to access Credential Manager?"
- Click **Yes**
- This only happens once per credential

**To reset all credentials:**

1. Settings → Accounts → Credential Manager → Windows Credentials
2. Find JobSentinel entries
3. Click "Remove"
4. JobSentinel will ask for fresh credentials next time

---

### Linux

Your credentials are stored in **Secret Service (libsecret)**, the Freedesktop standard
used by GNOME Keyring, KDE Wallet, and other managers.

**To view stored credentials (GNOME):**

1. Install Seahorse: `sudo apt install seahorse` (Debian/Ubuntu)
2. Open Passwords (Seahorse)
3. Click **Local** in the sidebar
4. Search for "JobSentinel"
5. View or delete entries

**To view stored credentials (KDE):**

1. Open KDE Wallet Manager
2. Select your wallet (usually "kdewallet")
3. Look for "JobSentinel" entries

**To reset all credentials:**

```bash
# List all JobSentinel secrets
secret-tool search application JobSentinel

# Delete a specific secret
secret-tool clear application JobSentinel type slack-webhook
```

---

## Troubleshooting

### "Permission Denied" When Saving

**On macOS:**

- You clicked "Deny" on the Keychain permission dialog
- Solution: Go to Keychain Access → Access Control → Find "JobSentinel" → Check "Always Allow"

**On Windows:**

- Your user account doesn't have Credential Manager permissions (rare)
- Solution: Run JobSentinel as Administrator once, then it should work normally

**On Linux:**

- Secret Service daemon isn't running
- Solution: Restart your session or run: `systemctl --user restart secret-service` (GNOME)

### "Credential Not Found" When Sending Notifications

The credential was deleted or lost. This can happen if:

- You manually deleted it from Keychain/Credential Manager
- Your user profile was reset
- The keyring service crashed

**Solution:** Re-enter the credential in Settings and click Save.

### Keyring Service Crashed (Linux)

If Secret Service stops responding:

```bash
# Restart the service
systemctl --user restart secret-service
```

Then restart JobSentinel.

### Migrating to a New Computer

Credentials in Keychain/Credential Manager don't transfer automatically (that's intentional - credentials stay local).

**On your new computer:**

1. Install JobSentinel v2.0+
2. Open Settings and re-enter your credentials
3. They'll be stored in your new system's keyring

**No data is lost** - your jobs, applications, and preferences are in the local SQLite database and transfer normally.

---

## For Developers

### Credential Key Format

Credentials are stored with keys like:

```text
JobSentinel:slack-webhook
JobSentinel:discord-webhook
JobSentinel:teams-webhook
JobSentinel:email-smtp-password
JobSentinel:linkedin-cookies
JobSentinel:telegram-token
```

The `JobSentinel:` prefix prevents collisions with other apps' credentials.

### CredentialKey Enum

The Rust code uses a typed enum for credential keys:

```rust
pub enum CredentialKey {
    SlackWebhook,
    DiscordWebhook,
    TeamsWebhook,
    EmailSmtpPassword,
    LinkedinCookies,
    TelegramToken,
}

impl CredentialKey {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::SlackWebhook => "JobSentinel:slack-webhook",
            Self::DiscordWebhook => "JobSentinel:discord-webhook",
            Self::TeamsWebhook => "JobSentinel:teams-webhook",
            Self::EmailSmtpPassword => "JobSentinel:email-smtp-password",
            Self::LinkedinCookies => "JobSentinel:linkedin-cookies",
            Self::TelegramToken => "JobSentinel:telegram-token",
        }
    }
}
```

### API Operations

**Store a credential:**

```rust
credential_manager.store(
    CredentialKey::SlackWebhook,
    "https://hooks.slack.com/services/..."
)?;
```

**Retrieve a credential:**

```rust
let webhook_url = credential_manager.retrieve(CredentialKey::SlackWebhook)?;
```

**Delete a credential:**

```rust
credential_manager.delete(CredentialKey::SlackWebhook)?;
```

### Backend Implementation

The Rust backend uses the `keyring` crate, which abstracts over:

- `security-framework` for macOS Keychain
- `windows-credentials` for Windows Credential Manager
- `secret-service` for Linux libsecret

All platform-specific code is in `src-tauri/src/core/credentials/mod.rs`.

### Frontend Integration

React components use Tauri commands for credential operations:

```typescript
// Store credential
await invoke('store_credential', {
  key: 'slack-webhook',
  value: webhookUrl
});

// Retrieve credential (automatically decrypted by OS)
const value = await invoke('retrieve_credential', {
  key: 'slack-webhook'
});

// Delete credential
await invoke('delete_credential', {
  key: 'slack-webhook'
});
```

### Error Handling

Common credential errors:

| Error | Cause | Fix |
|-------|-------|-----|
| `PermissionDenied` | User rejected OS access | Re-allow in system settings |
| `NotFound` | Credential was deleted | Re-enter and save |
| `ServiceUnavailable` | Keyring service crashed | Restart service (Linux) |
| `InvalidFormat` | Corrupted credential store | Delete and re-enter |

---

## Privacy Guarantees

JobSentinel's credential system has hard privacy guarantees:

✓ **Credentials never leave your computer** - Not sent to JobSentinel servers or anywhere else
✓ **Credentials never written to disk unencrypted** - Only your OS's encrypted keyring stores them
✓ **No credential sharing between users** - Each OS user has their own keyring
✓ **No network persistence** - Credentials aren't backed up to cloud or synced
✓ **No logging** - Credentials are never logged or printed to console

---

## Migration from v1.x

If you're upgrading from JobSentinel v1.x:

1. **Automatic Migration**
   - On first launch, v2.0 scans `config.json` for credentials
   - Finds: slack webhook, email password, LinkedIn cookies, etc.
   - Encrypts them and stores in OS keyring
   - Removes them from `config.json`

2. **Manual Migration (if needed)**
   - If automatic migration fails, go to Settings
   - Re-enter each credential
   - Click Save (they'll go into keyring)
   - Manually delete them from `config.json`

3. **Verify**
   - Settings should show all credentials still present
   - Test notifications to confirm they work
   - Old `config.json` should have no passwords

---

**Version:** 2.0.0 | **Last Updated:** January 17, 2026
