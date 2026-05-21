# Keyring Integration

JobSentinel stores sensitive credentials in the operating system credential
store, not in plaintext app config. This applies to notification secrets, API
keys, and authenticated scraper cookies.

## Supported Credential Stores

| Platform | Credential manager | Implementation |
| -------- | ------------------ | -------------- |
| Windows | Windows Credential Manager | `keyring` crate with `windows-native` |
| macOS | macOS Keychain | `keyring` crate with `apple-native` |
| Linux | Secret Service API | `keyring` crate with `sync-secret-service` |

## Stored Credentials

The service name for all entries is `JobSentinel`. Each key is namespaced with
the `jobsentinel_` prefix.

| Storage key | `CredentialKey` variant | Used by |
| ----------- | ----------------------- | ------- |
| `jobsentinel_smtp_password` | `SmtpPassword` | Email notifications |
| `jobsentinel_telegram_bot_token` | `TelegramBotToken` | Telegram notifications |
| `jobsentinel_slack_webhook` | `SlackWebhook` | Slack notifications |
| `jobsentinel_discord_webhook` | `DiscordWebhook` | Discord notifications |
| `jobsentinel_teams_webhook` | `TeamsWebhook` | Microsoft Teams notifications |
| `jobsentinel_linkedin_cookie` | `LinkedInCookie` | LinkedIn authenticated scraping |
| `jobsentinel_linkedin_cookie_expiry` | `LinkedInCookieExpiry` | LinkedIn cookie renewal checks |
| `jobsentinel_usajobs_api_key` | `UsaJobsApiKey` | USAJobs API access |

The Tauri credential commands accept either the prefixed storage key or the
unprefixed snake-case key, such as `slack_webhook`.

## Architecture

```text
React settings and setup UI
  invoke("store_credential", { key, value })
  invoke("retrieve_credential", { key })
  invoke("delete_credential", { key })
  invoke("has_credential", { key })
  invoke("get_credential_status")
    |
    v
src-tauri/src/commands/credentials.rs
    |
    v
src-tauri/src/core/credentials/mod.rs
    |
    v
OS credential store
```

Backend notification and scraper code uses `CredentialStore` directly when it
needs credentials outside the frontend command path. Both paths use the same
service name and storage keys.

`tauri-plugin-secure-storage` remains registered with the app, but the current
React credential flow uses Tauri commands backed by `CredentialStore`.

## Code Modules

### `src-tauri/src/core/credentials/mod.rs`

```rust
pub enum CredentialKey {
    SmtpPassword,
    TelegramBotToken,
    SlackWebhook,
    DiscordWebhook,
    TeamsWebhook,
    LinkedInCookie,
    LinkedInCookieExpiry,
    UsaJobsApiKey,
}

pub struct CredentialStore;

impl CredentialStore {
    pub fn store(key: CredentialKey, value: &str) -> Result<(), String>;
    pub fn retrieve(key: CredentialKey) -> Result<Option<String>, String>;
    pub fn delete(key: CredentialKey) -> Result<(), String>;
    pub fn exists(key: CredentialKey) -> Result<bool, String>;
    pub fn list_status() -> Result<HashMap<String, bool>, String>;
}
```

### `src-tauri/src/commands/credentials.rs`

```rust
#[tauri::command]
pub async fn store_credential(key: String, value: String) -> Result<(), String>;

#[tauri::command]
pub async fn retrieve_credential(key: String) -> Result<Option<String>, String>;

#[tauri::command]
pub async fn delete_credential(key: String) -> Result<(), String>;

#[tauri::command]
pub async fn has_credential(key: String) -> Result<bool, String>;

#[tauri::command]
pub async fn get_credential_status() -> Result<HashMap<String, bool>, String>;
```

## Migration From Plaintext Config

Startup migration runs when the config file exists and the keyring migration
flag has not been set.

1. Extract plaintext credentials from `config.json`.
2. Store each extracted credential in the OS keyring.
3. Clear plaintext credential fields from config only after every credential was
   stored successfully.
4. Set the migration flag only after either no plaintext credentials were found
   or the successful store-and-clear path completed.
5. Leave the migration flag unset after partial keyring failures or config clear
   failures so the next startup retries.

This avoids the unsafe state where plaintext secrets remain in config while the
app thinks migration is complete.

## Settings Status

Settings displays credential presence with status text:

- `Stored`: credential exists in the keyring.
- `Not set`: credential is not configured.

## Security Considerations

- Credentials are encrypted at rest by the OS credential manager.
- JobSentinel stores credentials under service name `JobSentinel`.
- Plaintext config fields are ignored after migration and should stay empty.
- Local app logs must not include credential values, webhook tokens, cookies, or
  API keys.

Non-sensitive config remains in `config.json`, including job titles, keywords,
locations, scraping intervals, alert thresholds, company URLs, and search query
settings.

## Config File Fields

Credential fields in `config.json` are compatibility inputs for migration and
should remain empty during normal use:

```json
{
  "alerts": {
    "email": {
      "enabled": true,
      "smtp_server": "smtp.gmail.com",
      "smtp_port": 587,
      "smtp_username": "user@example.com",
      "smtp_password": ""
    },
    "slack": {
      "enabled": true,
      "webhook_url": ""
    }
  }
}
```

## Troubleshooting

### Credentials Not Working

1. Check credential status in Settings.
2. Re-enter credentials that show `Not set`.
3. Verify the OS credential store is unlocked.
4. On Linux, confirm a Secret Service provider is running.

### Linux Secret Service

```bash
gnome-keyring-daemon --start --components=secrets
kwalletd5
```

### macOS Keychain Permissions

If macOS prompts for keychain access, allow JobSentinel access. If access was
denied, open Keychain Access, search for `JobSentinel`, and adjust access
control for the relevant item.

### Windows Credential Manager

Open Windows Credential Manager, select Windows Credentials, and search for
entries owned by `JobSentinel`.

## Adding New Credentials

1. Add a `CredentialKey` variant in `src-tauri/src/core/credentials/mod.rs`.
2. Add its `jobsentinel_*` storage key in `CredentialKey::as_str`.
3. Add parsing aliases in `FromStr`.
4. Update migration extraction and config clearing when the credential can
   appear in config.
5. Add or update UI fields and tests.
6. Update this document and `docs/features/credentials-security.md`.

## Testing

```bash
cd src-tauri
cargo test credentials --lib
```

Credential tests use test-owned key names and should avoid writing real user
secrets.

## Dependencies

```toml
tauri-plugin-secure-storage = "1.4"

keyring = { version = "3", features = [
    "apple-native",
    "windows-native",
    "sync-secret-service"
] }
```

## Related Documentation

- [Credentials Security](../features/credentials-security.md)
- [Notifications Setup](../features/notifications.md)
- [Architecture](../developer/ARCHITECTURE.md)
- [Security Documentation](./README.md)
