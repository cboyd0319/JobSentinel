# Secure Credential Storage

JobSentinel keeps notification secrets, API keys, and passwords in the
operating system credential store. Secrets do not belong
in `config.json`, localStorage, docs, logs, or screenshots.

## Why It Matters

Plaintext credentials in a config file can be exposed by local file access,
accidental commits, backup tools, or diagnostic bundles. OS-native credential
stores reduce that risk by encrypting secrets at rest and enforcing local user
access controls.

Supported stores:

| Platform | Credential store |
| -------- | ---------------- |
| macOS | Keychain |
| Windows | Credential Manager |
| Linux | Secret Service API through GNOME Keyring, KWallet, or compatible providers |

## What Is Stored Securely

| Credential | Storage key | Used for |
| ---------- | ----------- | -------- |
| Slack webhook URL | `jobsentinel_slack_webhook` | Slack notifications |
| Discord webhook URL | `jobsentinel_discord_webhook` | Discord notifications |
| Microsoft Teams webhook URL | `jobsentinel_teams_webhook` | Teams notifications |
| Email SMTP password | `jobsentinel_smtp_password` | Email alerts |
| Telegram bot token | `jobsentinel_telegram_bot_token` | Telegram notifications |
| USAJobs access code | `jobsentinel_usajobs_api_key` | USAJobs connection |

Non-secret app settings, such as enabled sources, search filters, thresholds,
locations, and notification preferences, remain in local app config or SQLite.

Legacy LinkedIn credential keys may exist on older installations. They are kept
only so JobSentinel can delete or redact old values. New LinkedIn session
credential storage is disabled by source policy.

## How It Works

1. User enters a credential in Settings or setup.
2. React invokes a Tauri credential command such as `store_credential`.
3. Rust parses the key into `CredentialKey`.
4. `CredentialStore` writes the value under service name `JobSentinel`.
5. Later notification or scraper code retrieves the value from the OS keyring
   only when needed.

Credential values are not returned in status calls. Settings checks presence
with `has_credential` and `get_credential_status`.

## Platform Notes

### macOS

Credentials appear in Keychain Access under service name `JobSentinel` with
account names such as `jobsentinel_slack_webhook`. If macOS asks whether to
allow access, allow JobSentinel access to the item.

### Windows

Credentials appear in Windows Credential Manager under Windows Credentials.
Search for `JobSentinel` entries and remove individual entries when a reset is
needed.

### Linux

Linux requires a Secret Service provider. GNOME Keyring and KWallet are the
common providers.

If saved connection details stop working, restart your computer or sign out and
back in, then re-enter the details in JobSentinel Settings. Advanced Linux users
can inspect the desktop keyring from the command line in the developer
reference below.

## Migration

On startup, JobSentinel attempts one-time migration from legacy plaintext config
fields to the OS keyring. Migration is marked complete only when no plaintext
credentials are found or every extracted credential is stored and plaintext
fields are cleared from config.

If any keyring write fails, or if config cleanup fails, migration remains
incomplete and startup retries later. This prevents plaintext credentials from
being stranded in config after a partial migration.

## Developer Reference

### `CredentialKey`

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

### Storage Names

```rust
Self::SmtpPassword => "jobsentinel_smtp_password",
Self::TelegramBotToken => "jobsentinel_telegram_bot_token",
Self::SlackWebhook => "jobsentinel_slack_webhook",
Self::DiscordWebhook => "jobsentinel_discord_webhook",
Self::TeamsWebhook => "jobsentinel_teams_webhook",
Self::UsaJobsApiKey => "jobsentinel_usajobs_api_key",
```

### Frontend Integration

React uses snake-case keys with Tauri credential commands:

```typescript
await invoke("store_credential", {
  key: "slack_webhook",
  value: webhookUrl,
});

const stored = await invoke<boolean>("has_credential", {
  key: "slack_webhook",
});

await invoke("delete_credential", {
  key: "slack_webhook",
});
```

The renderer can store, delete, and check credential presence, but it cannot
retrieve stored credential values. Backend-only paths use `CredentialStore`
directly when they must test or consume a saved secret.

Backend parsing also accepts prefixed forms such as
`jobsentinel_slack_webhook` for compatibility and diagnostics.

### Advanced Linux Keyring Check

```bash
secret-tool search application JobSentinel
```

If the Secret Service provider is not running, restart the user session or start
the provider used by the desktop environment.

## Error Handling

| Error class | Common cause | User action |
| ----------- | ------------ | ----------- |
| Permission denied | OS credential prompt was denied | Re-allow JobSentinel in OS credential settings |
| Not found | Credential was deleted or never configured | Re-enter and save credential in Settings |
| Service unavailable | Linux Secret Service provider is stopped | Start or restart the provider |
| Invalid key | Frontend or command sent an unknown key | Fix caller to use a supported snake-case key |

## User Guarantees

- Credential values stay local unless the user configures an external channel
  that uses them.
- Status views show whether a credential exists, not the credential value.
- Plaintext config credential fields are compatibility inputs only.
- Logs and safe support reports must redact credentials, webhook URLs, cookies, API
  keys, tokens, and sensitive URL parts.
- Credential command logs use parsed allowlisted key names only. Invalid key
  errors stay generic and do not echo frontend input.
- Slack, Discord, and Teams connection links are validated against provider
  hosts and paths before keyring storage.
- Config export recursively clears supported credential field names, including
  legacy plaintext fields, before writing JSON.
