-- Per-row encrypted secret vault for local credential values.
-- Stores only AEAD envelopes; plaintext values stay outside SQLite.

CREATE TABLE IF NOT EXISTS secret_vault (
    key TEXT PRIMARY KEY NOT NULL,
    algorithm TEXT NOT NULL,
    key_version INTEGER NOT NULL CHECK(key_version >= 1),
    nonce BLOB NOT NULL CHECK(length(nonce) = 24),
    ciphertext BLOB NOT NULL CHECK(length(ciphertext) > 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_secret_vault_updated_at
    ON secret_vault(updated_at DESC);
