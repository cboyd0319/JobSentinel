CREATE TABLE IF NOT EXISTS credential_key_wrapping (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    mode TEXT NOT NULL CHECK (mode = 'passphrase'),
    kdf TEXT NOT NULL CHECK (kdf = 'argon2id'),
    kdf_version INTEGER NOT NULL DEFAULT 1 CHECK (kdf_version = 1),
    memory_kib INTEGER NOT NULL CHECK (memory_kib > 0),
    iterations INTEGER NOT NULL CHECK (iterations > 0),
    parallelism INTEGER NOT NULL CHECK (parallelism > 0),
    salt BLOB NOT NULL CHECK (length(salt) = 16),
    algorithm TEXT NOT NULL CHECK (algorithm = 'xchacha20poly1305'),
    nonce BLOB NOT NULL CHECK (length(nonce) = 24),
    ciphertext BLOB NOT NULL CHECK (length(ciphertext) > 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
