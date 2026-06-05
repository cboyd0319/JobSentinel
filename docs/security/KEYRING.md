# Keyring Integration

JobSentinel stores sensitive credentials in the operating system credential
store, not in plaintext app config. This applies to notification secrets, API
keys, and passwords.

## Supported Credential Stores

| Platform | Credential manager | Implementation |
| -------- | ------------------ | -------------- |
| Windows | Windows Credential Manager | `keyring` native store |
| macOS | macOS Keychain | `keyring` native store |
| Linux | Secret Service API | `keyring` native store |

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
| `jobsentinel_usajobs_api_key` | `UsaJobsApiKey` | USAJobs API access |

The Tauri credential commands accept either the prefixed storage key or the
unprefixed snake-case key, such as `slack_webhook`.

## Architecture

```text
React settings and setup UI
  invoke("store_credential", { key, value })
  invoke("delete_credential", { key })
  invoke("has_credential", { key }) for one user-requested lazy check
  invoke("get_credential_status") for diagnostics
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

Legacy LinkedIn credential keys may exist on older installations. They are
supported only for cleanup and redaction. JobSentinel does not collect new
LinkedIn session credentials or use LinkedIn as a background source.

`tauri-plugin-secure-storage` remains registered with the app, but the current
React credential flow uses Tauri commands backed by `CredentialStore`.
`CredentialStore` initializes the `keyring` native store once at startup, then
uses `keyring-core` entries for OS credential access.

## Code Modules

### `src-tauri/src/core/credentials/mod.rs`

```rust
pub enum CredentialKey {
    SmtpPassword,
    TelegramBotToken,
    SlackWebhook,
    DiscordWebhook,
    TeamsWebhook,
    UsaJobsApiKey,
}

pub struct CredentialStore;

impl CredentialStore {
    pub fn store(key: CredentialKey, value: &str) -> Result<(), String>;
    pub fn retrieve(key: CredentialKey) -> Result<Option<String>, String>;
    pub fn delete(key: CredentialKey) -> Result<(), String>;
    pub fn exists(key: CredentialKey) -> Result<bool, String>;
    pub fn list_status() -> Vec<(CredentialKey, bool)>;
}
```

### `src-tauri/src/commands/credentials.rs`

```rust
#[tauri::command]
pub async fn store_credential(key: String, value: String) -> Result<(), String>;

#[tauri::command]
pub async fn delete_credential(key: String) -> Result<(), String>;

#[tauri::command]
pub async fn has_credential(key: String) -> Result<bool, String>;

#[tauri::command]
pub async fn get_credential_status() -> Result<Vec<CredentialStatus>, String>;
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

Settings avoids checking every credential when the Settings window opens. On
macOS, existence checks can still require Keychain access, so Settings derives
initial status from non-secret saved config and only checks one credential when
the user asks for an action that needs it.

Settings displays credential status without returning credential values:

- `Saved securely on this computer`: credential exists in the OS keyring.
- `Will be saved securely on this computer`: a newly entered credential will be
  saved there.
- Empty credential fields mean no new credential value was entered.
- After a successful credential save, the renderer clears that secret input and
  does not rewrite the same credential on later Settings saves.

## Security Considerations

- Credentials are encrypted at rest by the OS credential manager.
- JobSentinel stores credentials under service name `JobSentinel`.
- Plaintext config fields are ignored after migration and should stay empty.
- Local app logs must not include credential values, webhook tokens, cookies, or
  API keys.
- Renderer commands do not return stored credential values. Test actions for
  stored Slack and SMTP credentials resolve the saved secret inside backend
  commands and return only success or failure.
- Notification provider error bodies are omitted from app errors; only status
  and body length are kept because provider failures can echo job payload data.
- Credential command logs use parsed allowlisted key names only. Invalid key
  errors stay generic and do not echo caller input.
- Legacy LinkedIn session values are not accepted for new storage. Existing
  legacy entries can be deleted and are redacted from logs and debug reports.

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
    },
    "discord": {
      "enabled": true,
      "webhook_url": ""
    },
    "telegram": {
      "enabled": true,
      "bot_token": ""
    },
    "teams": {
      "enabled": true,
      "webhook_url": ""
    }
  },
  "linkedin": {
    "enabled": false,
    "session_cookie": ""
  },
  "usajobs": {
    "enabled": true,
    "api_key": "",
    "email": "user@example.com"
  }
}
```

## Troubleshooting

### Credentials Not Working

1. Check credential status in Settings.
2. Re-enter credentials that are missing or need rotation.
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
tauri-plugin-secure-storage = "1.5"
keyring = "4"
keyring-core = "1"
```

## Related Documentation

- [Credentials Security](../features/credentials-security.md)
- [Notifications Setup](../features/notifications.md)
- [Architecture](../developer/ARCHITECTURE.md)
- [Security Documentation](./README.md)
