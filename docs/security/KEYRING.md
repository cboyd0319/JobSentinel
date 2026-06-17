# Local Secret Vault And Keychain Integration

JobSentinel stores sensitive credentials locally and never in plaintext app
config. This applies to notification secrets, access codes, private connection
links, API keys, and passwords.

The storage model as of 2026-06-17 is:

- Encrypt the SQLite database at rest with bundled SQLCipher.
- Store secrets in a local SQLite secret-vault table as per-row AEAD envelopes.
- Protect the database key and vault master key with the operating system
  credential store by default.
- Offer an advanced user passphrase mode that wraps the vault key.
- On macOS, use native Keychain and LocalAuthentication APIs so Touch ID can
  satisfy user-presence prompts when the device and policy allow it.
- Avoid passive secure-storage probes that trigger repeated unlock prompts.

Runtime credential commands, scheduler jobs, notifications, and smoke tests now
use `CredentialService`. Active secrets are stored in the `secret_vault` table
as AEAD envelopes; the OS credential store protects one vault key item and is
used for legacy fallback only when a secret is explicitly retrieved. Status
checks read SQLite vault metadata only and do not unlock the OS credential
store. Remaining storage work is passphrase mode and native macOS
unlock/user-presence support.

## Supported Credential Stores

| Platform | Current runtime path | Remaining target |
| -------- | -------------------- | ---------------- |
| Windows | SQLCipher database, encrypted SQLite vault rows, and database/vault keys protected by Windows Credential Manager through `keyring` | Equivalent user-presence policy when available |
| macOS | SQLCipher database, encrypted SQLite vault rows, and database/vault keys protected by macOS Keychain through `keyring` | Native `Security.framework` plus `LocalAuthentication` unlock |
| Linux | SQLCipher database, encrypted SQLite vault rows, and database/vault keys protected by Secret Service through `keyring` | Passphrase mode available |

The default mode optimizes for user experience and local device security: the
user unlocks once when a secret is actually needed, then JobSentinel reuses the
unlocked vault key in memory for the current app session. Passphrase mode
optimizes for user custody and portability, but it adds recovery risk and must
be explained before use.

## Secret Vault Contract

The secret vault is the runtime storage boundary for saved credentials.

```text
SQLite database encryption at connection layer
  |
  v
secret_vault table
  key TEXT PRIMARY KEY
  nonce / iv
  ciphertext
  aad context
  created_at / updated_at
  rotation metadata
  |
  v
AEAD envelope per row
  XChaCha20-Poly1305 preferred
  AES-GCM acceptable where platform policy requires it
```

Vault requirements:

- The SQLite database is encrypted at rest with bundled SQLCipher through the
  SQLx SQLite connection layer.
- Secret values must use per-row AEAD encryption even inside the encrypted
  database.
- AEAD associated data must bind ciphertext to the secret key name and app
  context so rows cannot be silently swapped.
- The plaintext vault key must be kept only in process memory after unlock and
  cleared on app quit or explicit lock. Do not persist the plaintext key.
- Key rotation must be possible without changing public `CredentialKey` names.
- Backups must not export plaintext secret values unless a future encrypted
  backup flow explicitly asks the user and re-encrypts the payload.

Current default key mode:

1. Generate a random vault master key locally.
2. Store the raw vault key as one OS-protected credential item named
   `jobsentinel_vault_key` through the `keyring` crate.
3. Generate a separate random SQLCipher database key and store it as
   `jobsentinel_database_key` through the same OS credential service.
4. Cache the unlocked vault key in memory for the app session after successful
   retrieval.

Target default key mode:

1. Wrap or protect the vault key with the strongest practical OS credential
   policy.
2. On macOS, require user presence with Keychain access control and pass a
   reused `LAContext` through Keychain queries.
3. Cache the unlocked vault key in memory for the app session after successful
   user presence.

Advanced passphrase mode:

1. Ask the user for a passphrase only after explaining recovery tradeoffs.
2. Derive a wrapping key with a memory-hard KDF such as Argon2id.
3. Store only salt, KDF parameters, and wrapped vault key metadata.
4. Never store the passphrase.
5. Require the user to unlock after app start before secret use.

macOS implementation target:

- Use `security-framework` / `security-framework-sys` for native Keychain
  access instead of the generic `keyring` wrapper for the vault key.
- Use `objc2-local-authentication` and `block2` to create and reuse an
  `LAContext`.
- Pass the context into Keychain calls with `kSecUseAuthenticationContext`.
- Use user-presence access control by default so Touch ID works when available
  and password fallback remains possible.
- Avoid `biometryCurrentSet` as the default because enrolled biometric changes
  can orphan the key. Reserve stricter policies for a future explicit hardening
  option.

## Stored Credentials

The service name for OS-protected items is `JobSentinel`. Each credential key
is namespaced with the `jobsentinel_` prefix. In the runtime vault these names
are `secret_vault` row keys. During legacy fallback they are also OS credential
item names.

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
  no passive secret checks on Settings open
  invoke("has_credential", { key }) only for explicit diagnostics or user action
  invoke("get_credential_status") only for diagnostics
    |
    v
src-tauri/src/commands/credentials.rs
    |
    v
src-tauri/src/core/credentials/mod.rs
    |
    v
CredentialService
  encrypted SQLite secret vault rows
  legacy OS credential fallback only on explicit secret read
    |
    v
OS-protected vault key
```

Backend notification, scheduler, and smoke-test code use `CredentialService`
with the same runtime provider as frontend commands.

Legacy LinkedIn credential keys may exist on older installations. They are
supported only for cleanup and redaction. JobSentinel does not collect new
LinkedIn session credentials or use LinkedIn as a background source.

`tauri-plugin-secure-storage` remains registered with the app, but the current
React credential flow uses Tauri commands backed by `CredentialService`.
`CredentialStore` remains as a legacy fallback path and for opt-in live
keyring integration tests.

Vault migration keeps public command names stable. Renderer code should still
call command APIs and must not depend on whether the backend resolves a secret
from the encrypted local vault or the legacy OS item.

## Code Modules

### `src-tauri/src/core/credentials/vault.rs`

```rust
pub struct SecretVault;

impl SecretVault {
    pub fn generate_master_key() -> [u8; 32];
    pub async fn store(&self, key: CredentialKey, value: &str) -> Result<(), SecretVaultError>;
    pub async fn retrieve(&self, key: CredentialKey) -> Result<Option<String>, SecretVaultError>;
    pub async fn delete(&self, key: CredentialKey) -> Result<(), SecretVaultError>;
    pub async fn exists(&self, key: CredentialKey) -> Result<bool, SecretVaultError>;
}
```

The vault uses `XChaCha20Poly1305`, per-row random 24-byte nonces, and
associated data shaped as `jobsentinel.secret-vault.v1:<credential-key>`.
Disabled LinkedIn credential keys are rejected before storage.

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
```

### `src-tauri/src/core/credentials/service.rs`

```rust
pub struct CredentialService;

impl CredentialService {
    pub fn new(pool: SqlitePool) -> Self;
    pub async fn store(&self, key: CredentialKey, value: &str) -> Result<(), String>;
    pub async fn retrieve(&self, key: CredentialKey) -> Result<Option<String>, String>;
    pub async fn delete(&self, key: CredentialKey) -> Result<(), String>;
    pub async fn exists(&self, key: CredentialKey) -> Result<bool, String>;
    pub async fn list_status(&self) -> Vec<CredentialPresence>;
}
```

`CredentialService` is the runtime provider. `exists` and `list_status` read
vault row metadata only. `retrieve` migrates a legacy OS keyring item into the
vault only when a secret is explicitly needed.

### Legacy `CredentialStore`

```rust
pub struct CredentialStore;

impl CredentialStore {
    pub fn store(key: CredentialKey, value: &str) -> Result<(), String>;
    pub fn retrieve(key: CredentialKey) -> Result<Option<String>, String>;
    pub fn delete(key: CredentialKey) -> Result<(), String>;
    pub fn exists(key: CredentialKey) -> Result<bool, String>;
    pub fn list_status() -> Vec<CredentialPresence>;
}
```

`CredentialStore` is retained for legacy fallback and opt-in live keyring
integration tests. New runtime code should not call it directly.

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

`get_credential_status` returns non-secret entries shaped as
`{ key, exists, available }`. `available: false` means secure storage could not
be checked and must not be shown as either saved or missing.

## Migration From Plaintext Config

Startup migration runs when the config file exists and the secure-storage migration
flag has not been set.

1. Extract plaintext credentials from `config.json`.
2. Store each extracted credential through `CredentialService`.
3. Atomically clear plaintext credential fields from config only after every
   credential was stored successfully.
4. Atomically set the migration flag only after either no plaintext credentials
   were found or the successful store-and-clear path completed.
5. Leave the migration flag unset after partial storage failures or config clear
   failures so the next startup retries.

This avoids the unsafe state where plaintext secrets remain in config while the
app thinks migration is complete.

## Settings Status

Settings must not check saved secrets passively when the Settings window opens.
On macOS, even existence checks can require Keychain access and can produce
repeated password prompts. Settings now infers "saved or expected" status from
enabled alert/source configuration until the user takes an action that needs
the secret.

Allowed secure-storage checks:

- Save a new or changed secret.
- Test an alert channel.
- Run a source that needs a secret, such as USAJobs scheduled checks.
- Run an explicit user-requested diagnostic.
- Export or restore a future sensitive encrypted backup.

Disallowed checks:

- App startup.
- Dashboard load.
- Settings tab open.
- Passive badge render.
- Toggle render or form validation that does not need the secret value.

Settings displays credential status without returning credential values:

- `Saved securely on this computer`: credential exists in the local secret vault.
- `Will be saved securely on this computer`: a newly entered credential will be
  saved there.
- `Saved details need confirmation`: config indicates a saved detail is
  expected, but JobSentinel has not unlocked secure storage in this passive
  view. This expected state is copy-only; save, test, enable, and source-use
  gates must require a confirmed saved credential, a newly typed credential, or
  an explicit user-started verification.
- `Saved details need attention`: the user attempted an action and secure
  storage could not provide the saved detail.
- Empty credential fields mean no new credential value was entered.
- After a successful credential save, the renderer clears that secret input and
  does not rewrite the same credential on later Settings saves.

An unavailable or denied check should become user-visible only after an
attempted action fails because secure storage could not be unlocked.

## Security Considerations

- Runtime credentials are encrypted as per-row AEAD envelopes in the
  `secret_vault` table.
- Runtime credentials are encrypted twice at rest: by the SQLCipher database
  and by per-row AEAD envelopes.
- Do not store secret values as plaintext SQLite, app config, localStorage,
  logs, screenshots, support reports, or unencrypted backups.
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
locations, alert thresholds, company URLs, and search query settings.

The encrypted SQLite database protects local job-search records and durable
preferences at rest. The per-row AEAD vault adds compartmentalized protection
for secrets if a future bug or tool reads database rows after the database has
already been unlocked.

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
    "enabled": false
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

If macOS prompts for keychain access during a secret action, allow JobSentinel
access if you want that alert or source to work. Passive screens should not
trigger repeated Keychain prompts. If prompts repeat during app startup,
dashboard load, or Settings browsing, treat it as a bug.

If access was denied, open Keychain Access, search for `JobSentinel`, and
adjust access control for the relevant item. After the vault migration, search
for `jobsentinel_vault_key`.

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
cargo test --test credential_test
```

Default credential tests are non-interactive. Live OS keyring roundtrips use
test-owned key names but can prompt on macOS Keychain and equivalent stores, so
they are opt-in:

```bash
cd src-tauri
JOBSENTINEL_LIVE_KEYRING_TESTS=1 cargo test --test credential_test
```

Credential tests must not write real user secrets.

## Dependencies

Current compatibility path:

```toml
tauri-plugin-secure-storage = "=1.5.0"
keyring = "=4.1.1"
```

Target macOS vault-key path:

```toml
security-framework = "3"
security-framework-sys = "2"
objc2-local-authentication = "0.3"
block2 = "0.6"
```

Target vault cryptography should use a reviewed Rust AEAD crate such as
`chacha20poly1305` for XChaCha20-Poly1305 or `aes-gcm` where AES-GCM is
required. Passphrase mode should use a memory-hard KDF crate such as `argon2`.

## Related Documentation

- [Credentials Security](../features/credentials-security.md)
- [Notifications Setup](../features/notifications.md)
- [Architecture](../developer/ARCHITECTURE.md)
- [Security Documentation](./README.md)
