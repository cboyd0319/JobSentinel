# P0: Keyring Integration Plan

## Summary

Use **`tauri-plugin-secure-storage`** v1.4.0 to move 6 sensitive credentials from plaintext `config.json` to OS-native secure storage:
- **macOS**: Keychain
- **Windows**: Credential Manager
- **Linux**: Secret Service API (libsecret)

## Plugin Choice

Using existing plugin instead of building from scratch:
- **Crate**: `tauri-plugin-secure-storage = "1.4"`
- **NPM**: Check for corresponding JS API package
- **Why**: Mature (5 releases), actively maintained, wraps `keyring` v3, Tauri 2.6 compatible

## Credentials to Migrate

| Credential | Config Path | Storage Key |
|------------|-------------|-------------|
| SMTP Password | `alerts.email.smtp_password` | `smtp_password` |
| Telegram Token | `alerts.telegram.bot_token` | `telegram_bot_token` |
| Slack Webhook | `alerts.slack.webhook_url` | `slack_webhook` |
| Discord Webhook | `alerts.discord.webhook_url` | `discord_webhook` |
| Teams Webhook | `alerts.teams.webhook_url` | `teams_webhook` |
| LinkedIn Cookie | `linkedin.session_cookie` | `linkedin_cookie` |

## Implementation

### Phase 1: Add Plugin

1. **Cargo.toml** - Add dependency:
   ```toml
   tauri-plugin-secure-storage = "1.4"
   ```

2. **main.rs** - Register plugin:
   ```rust
   .plugin(tauri_plugin_secure_storage::init())
   ```

3. **capabilities** - Add permissions if required by plugin

### Phase 2: Create Wrapper Module

**New file: `src-tauri/src/core/credentials.rs`**
- Thin wrapper around plugin API
- Define credential keys as enum
- Provide typed access: `store_credential(key, value)`, `get_credential(key)`

### Phase 3: Modify Config

**File: `src-tauri/src/core/config/types.rs`**
- Add `#[serde(skip)]` to credential fields (keeps struct API, removes from JSON)

### Phase 4: Update Consumers

**Files to modify:**
- `src-tauri/src/core/notify/mod.rs` - Retrieve credentials before sending
- `src-tauri/src/core/scheduler/workers/scrapers.rs` - Get LinkedIn cookie
- `src/pages/Settings.tsx` - Use plugin's JS API for credential fields

### Phase 5: Migration

**New file: `src-tauri/src/core/credentials/migration.rs`**
- On first run, detect plaintext creds in config.json
- Move to secure storage
- Remove from config file
- Create flag file to prevent re-migration

## Files to Modify

| File | Change |
|------|--------|
| `src-tauri/Cargo.toml` | Add `tauri-plugin-secure-storage` |
| `src-tauri/src/main.rs` | Register plugin + migration |
| `src-tauri/src/core/mod.rs` | Export credentials module |
| `src-tauri/src/core/config/types.rs` | `#[serde(skip)]` on 6 fields |
| `src-tauri/src/core/notify/mod.rs` | Retrieve from secure storage |
| `src-tauri/src/core/scheduler/workers/scrapers.rs` | Get LinkedIn cookie |
| `src/pages/Settings.tsx` | Use JS API for credentials |

## Verification

1. `cargo build --release` - Compiles on all platforms
2. `cargo test` - All tests pass
3. Manual test:
   - Fresh install → credentials save to keyring
   - Existing install → plaintext migrated
   - Notifications work (Slack, Email, Telegram)
   - LinkedIn scraper works
   - Export excludes credentials

## Documentation

- `CHANGELOG.md` - Add security note
- `docs/ROADMAP.md` - Mark P0 complete
- `CLAUDE.md` - Note keyring integration
