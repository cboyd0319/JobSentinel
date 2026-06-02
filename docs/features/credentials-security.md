# Secure Credential Storage

JobSentinel keeps notification secrets, access codes, and passwords in the
operating system credential store. Secrets do not belong
in plain text files, screenshots, shared notes, docs, or logs.

## Why It Matters

Plain text credentials can be exposed by backups, copied files, shared reports,
or screenshots. OS-native credential stores reduce that risk by encrypting
secrets at rest and enforcing local user access controls.

Supported stores:

| Platform | Credential store |
| -------- | ---------------- |
| macOS | Keychain |
| Windows | Credential Manager |
| Linux | Linux password store, such as GNOME Keyring, KWallet, or compatible providers |

## What Is Stored Securely

| Saved detail | Where JobSentinel saves it | Used for |
| ------------ | --------------------------- | -------- |
| Slack connection link | OS password store | Slack notifications |
| Discord connection link | OS password store | Discord notifications |
| Microsoft Teams connection link | OS password store | Teams notifications |
| Email app password | OS password store | Email alerts |
| Telegram setup code | OS password store | Telegram notifications |
| USAJobs access code | OS password store | USAJobs connection |

Non-secret app settings, such as enabled sources, search filters, thresholds,
locations, and notification preferences, remain in saved app settings on this
computer.

Legacy LinkedIn credential keys may exist on older installations. They are kept
only so JobSentinel can delete or redact old values. New LinkedIn session
credential storage is disabled by source policy.

## How It Works

1. User enters a credential in Settings or setup.
2. JobSentinel saves the secret through its secure app layer.
3. The app identifies which saved detail is being stored.
4. The secure store writes the value under service name `JobSentinel`.
5. Later notification or job-source code retrieves the value from the OS keyring
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
back in, then re-enter the details in JobSentinel Settings. If this still
fails, save a safe support report.

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
| Access not allowed | Password-store prompt was declined | Allow JobSentinel in OS password-store settings |
| Not found | Saved detail is missing | Re-enter and save the detail in Settings |
| Service unavailable | Linux password store is stopped | Start or restart the password store |
| JobSentinel could not save that detail | Saved-detail name is not supported | Try again; if it repeats, save a safe support report so the problem can be fixed |

## User Guarantees

- Saved secret values stay local unless the user turns on an external channel
  that uses them.
- Status views show whether a saved secret exists, not the saved secret value.
- Older plain-text settings fields are compatibility inputs only.
- Logs and safe support reports must redact secrets, connection links, cookies,
  access codes, tokens, and sensitive URL parts.
- Internal save-command logs use allowlisted names only. Invalid save errors
  stay generic and do not echo what the user typed.
- Slack, Discord, and Teams connection links are validated against provider
  addresses before password-store storage.
- Config export recursively clears supported credential field names, including
  legacy plaintext fields, before writing JSON.
