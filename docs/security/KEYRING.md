# Keyring Integration - Secure Credential Storage

> JobSentinel v2.0 Security Feature

---

## Overview

JobSentinel v2.0 introduces **OS-native keyring integration** for secure credential storage.
All sensitive credentials (API keys, passwords, webhook URLs, session cookies) are now stored
in the operating system's secure credential manager instead of plain text configuration files.

This is a **major security improvement** that protects your credentials with:
- **OS-level encryption** - Credentials encrypted at rest
- **Access control** - Only JobSentinel can access its stored credentials
- **No plaintext storage** - Secrets never written to disk unencrypted

---

## Supported Credential Stores

| Platform | Credential Manager | Implementation |
|----------|-------------------|----------------|
| **Windows** | Windows Credential Manager | `keyring` crate with `windows-native` feature |
| **macOS** | macOS Keychain | `keyring` crate with `apple-native` feature |
| **Linux** | Secret Service (GNOME Keyring, KWallet) | `keyring` crate with `sync-secret-service` feature |

---

## Credentials Stored in Keyring

The following credentials are stored securely in the OS keyring:

| Credential Key | Description | Used By |
|---------------|-------------|---------|
| `smtp_password` | Email SMTP password | Email notifications |
| `telegram_bot_token` | Telegram Bot API token | Telegram notifications |
| `slack_webhook_url` | Slack incoming webhook URL | Slack notifications |
| `discord_webhook_url` | Discord webhook URL | Discord notifications |
| `teams_webhook_url` | Microsoft Teams webhook URL | Teams notifications |
| `linkedin_session_cookie` | LinkedIn `li_at` session cookie | LinkedIn job scraper |

---

## Architecture

### Dual-Access Pattern

JobSentinel uses a dual-access pattern for credentials:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│                                                                 │
│   Settings.tsx uses Tauri commands:                            │
│   - invoke("store_credential", { key, value })                 │
│   - invoke("retrieve_credential", { key })                     │
│   - invoke("delete_credential", { key })                       │
│   - invoke("has_credential", { key })                          │
│   - invoke("get_credential_status")                            │
│                                                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                    Tauri IPC (Commands)
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                     Backend (Rust/Tauri)                        │
│                                                                 │
│   ┌───────────────────────────────────────────────────────┐    │
│   │          Tauri Secure Storage Plugin (Frontend)       │    │
│   │              tauri-plugin-secure-storage              │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                 │
│   ┌───────────────────────────────────────────────────────┐    │
│   │            Keyring Crate (Backend Direct)             │    │
│   │     Used by: notify/mod.rs, scheduler/scrapers.rs     │    │
│   └───────────────────────────────────────────────────────┘    │
│                              │                                  │
│                              v                                  │
│   ┌───────────────────────────────────────────────────────┐    │
│   │              OS Credential Manager                     │    │
│   │    macOS: Keychain | Windows: Cred Manager | Linux: SS│    │
│   └───────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Why Two Access Methods?

1. **Frontend (`tauri-plugin-secure-storage`)**: Used by Settings.tsx to save/retrieve credentials with a JavaScript API.

2. **Backend (`keyring` crate)**: Used by Rust code that needs direct access (notification senders, LinkedIn scraper) without going through Tauri commands.

Both use the same underlying OS credential store, so credentials stored via either method are accessible by both.

---

## Code Modules

### `src-tauri/src/core/credentials/mod.rs`

Core credentials module with:

```rust
/// Credential keys for secure storage
pub enum CredentialKey {
    SmtpPassword,
    TelegramBotToken,
    SlackWebhookUrl,
    DiscordWebhookUrl,
    TeamsWebhookUrl,
    LinkedInSessionCookie,
}

/// Credential store for OS keyring access
pub struct CredentialStore {
    service_name: String,
}

impl CredentialStore {
    pub fn new() -> Self { ... }
    pub fn store(&self, key: CredentialKey, value: &str) -> Result<()> { ... }
    pub fn retrieve(&self, key: CredentialKey) -> Result<Option<String>> { ... }
    pub fn delete(&self, key: CredentialKey) -> Result<()> { ... }
    pub fn has(&self, key: CredentialKey) -> bool { ... }
}
```

### `src-tauri/src/commands/credentials.rs`

Tauri commands for frontend access:

```rust
#[tauri::command]
pub async fn store_credential(key: String, value: String) -> Result<(), String>

#[tauri::command]
pub async fn retrieve_credential(key: String) -> Result<Option<String>, String>

#[tauri::command]
pub async fn delete_credential(key: String) -> Result<(), String>

#[tauri::command]
pub async fn has_credential(key: String) -> Result<bool, String>

#[tauri::command]
pub async fn get_credential_status() -> Result<HashMap<String, bool>, String>
```

---

## Migration from Plaintext Config

### Automatic Migration

When JobSentinel v2.0 starts for the first time, it automatically migrates any plaintext credentials from your config file to the secure keyring:

1. Checks if migration has already been performed
2. Reads credentials from `config.json`
3. Stores each credential in the OS keyring
4. Marks migration as complete
5. **Does NOT delete plaintext values** (for rollback safety)

After successful migration, you should manually remove the plaintext credentials from your config file.

### Manual Migration

If automatic migration fails or you prefer manual control:

1. **Open Settings** in JobSentinel
2. **Re-enter each credential** in the appropriate field
3. **Save** - credentials are stored in keyring
4. **Edit config.json** - remove the plaintext values

### Migration Status Check

You can verify migration status via the Settings page - each credential field shows a status indicator:
- ✅ **Stored** - Credential exists in keyring
- ⚠️ **Not set** - Credential not configured

---

## Security Considerations

### Encryption at Rest

- **macOS**: Keychain encrypts credentials with user password
- **Windows**: DPAPI encrypts with user credentials
- **Linux**: Secret Service uses session keyring or user password

### Access Control

Credentials stored by JobSentinel:
- Are scoped to the `com.jobsentinel.app` service name
- Can only be accessed by the JobSentinel application
- Require user authentication on locked devices

### What's NOT in the Keyring

The following data is still stored in `config.json` (non-sensitive):
- Job title allowlists/blocklists
- Keywords (boost/exclude)
- Location preferences
- Scraping interval
- Alert thresholds
- Company URLs (Greenhouse, Lever)
- LinkedIn search queries (not cookies)

### Config File Changes

In v2.0, credential fields in `config.json` are ignored:

```json
{
  "alerts": {
    "email": {
      "enabled": true,
      "smtp_server": "smtp.gmail.com",
      "smtp_port": 587,
      "smtp_username": "user@example.com",
      "smtp_password": ""  // ← Ignored, use keyring
    },
    "slack": {
      "enabled": true,
      "webhook_url": ""    // ← Ignored, use keyring
    }
  }
}
```

---

## Troubleshooting

### Credentials Not Working

1. **Check keyring status** in Settings page
2. **Re-enter credentials** if status shows "Not set"
3. **Verify OS keyring** is unlocked (especially on Linux)

### Linux Secret Service Issues

On Linux, ensure D-Bus and a secret service are running:

```bash
# GNOME Keyring
gnome-keyring-daemon --start --components=secrets

# KWallet
kwalletd5
```

### macOS Keychain Permissions

If prompted to allow keychain access:
1. Click "Allow" to grant JobSentinel access
2. If denied, go to Keychain Access → JobSentinel → Always Allow

### Windows Credential Manager

View stored credentials:
1. Open Control Panel → Credential Manager
2. Look for "Windows Credentials"
3. Find entries with `com.jobsentinel.app` prefix

---

## Developer Notes

### Adding New Credentials

To add a new credential type:

1. **Add to `CredentialKey` enum** in `src/core/credentials/mod.rs`:
   ```rust
   pub enum CredentialKey {
       // ... existing keys
       NewCredential,
   }
   ```

2. **Implement `as_str()` and `TryFrom`** for the new key

3. **Update migration** in `src/core/credentials/migration.rs`

4. **Add UI field** in `src/pages/Settings.tsx`

### Testing

Credential tests are in `src-tauri/src/core/credentials/tests.rs`:

```bash
cargo test core::credentials
```

Note: Tests use a mock keyring to avoid polluting the real OS keyring.

---

## Dependencies

```toml
[dependencies]
# Tauri plugin for frontend JS API
tauri-plugin-secure-storage = "1.4"

# Direct Rust keyring access for backend
keyring = { version = "3", features = [
    "apple-native",      # macOS Keychain
    "windows-native",    # Windows Credential Manager
    "sync-secret-service" # Linux Secret Service
]}
```

---

## Related Documentation

- [Notifications Setup](../features/notifications.md) - Configure notification channels
- [Architecture](../developer/ARCHITECTURE.md) - System architecture overview
- [Quick Start](../user/QUICK_START.md) - Getting started guide
- [Security Audit Report](../reports/security-audit.md) - Full security assessment

---

**Last Updated**: January 17, 2026
**Version**: 2.0.0
**Security Level**: Production Ready
