# Core Architecture

This document describes the ownership boundaries inside `jobsentinel-core`.
See [Architecture](ARCHITECTURE.md) for the complete frontend, Tauri, core, and
platform data flow.

## Crate Boundary

`crates/jobsentinel-core` is the Tauri-free application core. It owns local
data, domain behavior, source access, and target-gated platform adapters. The
`src-tauri` crate depends on it; the core crate never depends on Tauri or the
renderer.

The crate root exposes an explicit facade from `src/lib.rs`. `core/mod.rs`
assigns domain owners, and each owner keeps implementation leaves private or
crate-visible unless another crate needs a stable contract.

Use modules before crates. Add another workspace member only when code gains a
separate runtime, dependency policy, release unit, or independently testable
ownership boundary. Repository size and file count are not reasons to add a
crate.

The root workspace owns release optimization. JobSentinel binaries are
symbol-stripped; third-party release dependencies remain unstripped so Apple
linker toolchains can load host proc macros during universal package builds.

## Ownership Map

| Owner | Responsibility | Important boundary |
| ----- | -------------- | ------------------ |
| `config` | Typed settings, defaults, validation, atomic file I/O, and external-AI approval state | Runtime consumers receive validated `Config`; UI code does not read config files directly |
| `db` | SQLCipher connection, migrations, verified pre-migration snapshots, integrity checks, jobs, interactions, and analytics | Callers use `Database`; connection and integrity leaves stay private |
| `credentials` and `secure_storage` | Encrypted local vault, vault-key protection, optional passphrase wrapping, validation, and legacy cleanup | Saved secret values do not cross renderer IPC |
| `job`, `job_hash`, and `normalization` | Canonical job record, identity, title/location normalization, and stored URL normalization | Job identity does not depend on persistence or a specific source adapter |
| `scrapers`, `source_urls`, and `http_body` | Source adapters, bounded HTTP clients, rate limits, response limits, and structured source errors | Adapter leaves are private; callers use the scraper facade and validated fetch boundary |
| `scheduler` | Source, scoring, persistence, and alert workflow coordination | Workers depend on owner facades, not private leaves |
| `scoring` and `ghost` | Local fit estimates, cache, configuration, remote preference handling, and posting-risk evidence | Scores are advisory and privacy-preserving; UI labels do not claim employer intent |
| `resume` | Managed resume files, parsing, skills, matching, format review, builder drafts, templates, and export | Renderer DTOs omit local paths and full stored resume text unless a reviewed workflow needs bounded text |
| `ats` and `user_data` | Applications, interviews, reminders, saved searches, templates, history, and notification preferences | SQLite is authoritative for durable job-search records |
| `automation` | Application profile, screening answers, answer learning, ATS detection, and visible form preparation | The user reviews and submits; JobSentinel does not click final Submit |
| `import` and `bookmarklet` | Reviewed URL import, staged pending jobs, loopback Browser Import, and single-use import tokens | Preview and confirmation use the exact staged job without a second fetch |
| `linkedin_workbench` and `deeplinks` | User-started source links and local work ledger | No stored LinkedIn sessions, hidden monitoring, or automatic result-list reading |
| `notify` | Email, Slack, Discord, Teams, and Telegram delivery | Providers receive only the approved alert payload and resolve saved credentials inside Rust |
| `salary` and `market_intelligence` | Pay guidance, offer comparison, market snapshots, trend queries, and alerts | Evidence is advisory and does not become a compensation or hiring claim |
| `health` | Source checks, retry state, safe diagnostics, credential status, and minimized request history | User-facing failures are sanitized and do not expose endpoints or private details |
| `url_security` | Canonicalization, public-network validation, DNS resolution, and logging-safe URL rendering | External fetches reject credentials, local/private targets, unsafe redirects, and unapproved schemes |
| `ml` | Optional embedded model governance, embeddings, reranking, hybrid matching, and diagnostics | Compiled only with `embedded-ml`; model files remain governed by `models.lock.toml` |
| `logging` | Structured logging initialization and privacy-safe fields | Logs omit secrets, resume text, search text, notes, paths, and raw provider responses |

## Database And Migration Ownership

Migrations live in `crates/jobsentinel-core/migrations/` and are embedded by the
core crate. SQLx offline metadata remains at the repository root in `.sqlx/` so
both workspace members and CI use one cache.

`Database::migrate` owns the complete startup sequence:

1. Create and verify an encrypted snapshot before changing an existing schema.
2. Apply embedded SQLx migrations.
3. Run quick and foreign-key checks.
4. Run the scheduled full integrity check when due.
5. Stop initialization when required backup or integrity proof fails.

Callers must not reproduce this sequence. See
[SQLite Configuration](sqlite-configuration.md) for the enforced PRAGMAs and
verification commands.

## Source And Network Ownership

Source adapters are selected through the scraper facade. The scheduler and
health owners do not import adapter implementation files directly. All remote
body reads use bounded helpers, and fetches use public-network validation with
redirect and DNS protections.

Restricted or sign-in-backed sources remain user-started. Search Links,
Browser Import, and the local Workbench are separate from scheduled public
source checks. JobsWithGPT remains disabled until the user approves the exact
endpoint and minimized request payload.

## Platform Adapters

`crates/jobsentinel-core/src/platforms/` contains the Windows, macOS, and Linux
implementations selected with `cfg` attributes. Its public facade owns data,
configuration, cache, and log directory resolution plus platform
initialization. Target-specific modules remain crate-private.

The packaging minimum for macOS is declared in `src-tauri/tauri.conf.json`.
The release target is macOS 26+; evidence records the exact live host. Windows
11 is the Windows validation target. Linux packaging uses the pinned workflow
and helper contracts under `scripts/platform/`.

## Tauri Interaction

The core crate exposes typed application contracts. The Tauri crate translates
them into minimized command DTOs under `src-tauri/src/commands/`. Commands are
private to the desktop crate and are registered once in
`src-tauri/src/command_handlers.rs`.

Business logic, SQL, HTTP fetching, credential resolution, and file ownership
belong in the core crate. A Tauri command should validate IPC input, call one
core owner, map the result, and return a typed response or sanitized error.

## Tests

- Owner-local Rust tests live beside their modules in `tests.rs`, named test
  files, or private test directories.
- Cross-owner core contracts live in `crates/jobsentinel-core/tests/`.
- Tauri command and router tests live under `src-tauri/src/commands/`.
- Live source and OS credential tests are ignored or opt-in. Default tests must
  not contact remote sources or prompt for Keychain access.

Use these baseline checks from the repository root:

```bash
cargo metadata --no-deps --format-version 1
cargo fmt --all -- --check
cargo clippy --workspace -- -D warnings
env -u JOBSENTINEL_LIVE_KEYRING_TESTS cargo test --workspace
npm run lint:architecture
npm run lint:tauri-invokes
```

For feature-gated ownership, also compile the full target set:

```bash
cargo clippy --workspace --all-features -- -D warnings
cargo test --workspace --all-features --no-run
```

## Adding Or Splitting An Owner

1. Repair dependency direction inside the existing module first.
2. Keep one facade and make implementation leaves private.
3. Move tests with the owner and keep cross-owner contracts in integration
   targets.
4. Update path-sensitive harness sensors and documentation in the same change.
5. Add a crate only when the new boundary needs independent dependencies,
   runtime, release, or external API stability.

The architecture gate rejects wildcard workspace membership, root package
metadata, backend source outside workspace members, Tauri dependencies in the
core crate, member-owned package metadata or lint policy, uncompiled Rust
source, and frontend ownership violations.
