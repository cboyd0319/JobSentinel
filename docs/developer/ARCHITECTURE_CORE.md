# Rust Architecture

This document explains the Rust ownership model. The root
[architecture](../architecture/repository.md) and
`scripts/harness/contracts/architecture.json` own the complete graph.

## Workspace Boundary

The workspace is a virtual Cargo workspace with explicit members. There is no
catch-all core crate. Each library owns one cohesive dependency or security
boundary and exposes a bounded facade from `src/lib.rs`.

The desktop crate depends only on `jobsentinel-application` for product
behavior. Application composes the other libraries and exposes the selected
desktop API through `jobsentinel_application::desktop`. Lower crates never
depend on the desktop or application crates.

## Owners

| Owner | Responsibility |
| --- | --- |
| `jobsentinel-security` | redaction, sensitive values, and pure URL policy |
| `jobsentinel-domain` | serialized job values, hashes, normalization, and shared value contracts |
| `jobsentinel-network` | DNS-safe requests, redirect policy, retries, and bounded bodies |
| `jobsentinel-platform` | OS paths, permissions, local authentication, and device-key storage |
| `jobsentinel-storage` | SQLCipher, migrations, integrity, backups, transactions, and repositories |
| `jobsentinel-credentials` | credential validation, encrypted vault, and passphrase lifecycle |
| `jobsentinel-sources` | source adapters, job-page parsing, location lookup, and rate limits |
| `jobsentinel-documents` | resume parsing, ATS analysis, templates, and export |
| `jobsentinel-intelligence` | pure scoring and posting-quality analysis |
| `jobsentinel-local-ai` | optional governed local model runtime |
| `jobsentinel-assistance` | visible browser preparation, bookmarklet, and deep links |
| `jobsentinel-ai` | reviewed external-AI validation and provider-neutral transport |
| `jobsentinel-notifications` | approved email and webhook delivery |
| `jobsentinel-application` | configuration, use cases, scheduling, health, and composition |

Technology ownership is exclusive unless the architecture contract explicitly
lists multiple owners. SQLx belongs to storage, reqwest to network, keyring to
platform, Chromium to assistance, model dependencies to local AI, and Tauri to
the desktop.

## Persistence And Migrations

Migrations live in `crates/jobsentinel-storage/migrations/` and are embedded by
storage. SQLx offline metadata remains at the repository root in `.sqlx/`.
Callers use bounded `Database` factories and repository methods; the raw pool is
crate-private.

Database startup preserves the existing path, key bytes, SQLCipher settings,
migration identifiers, verified snapshots, integrity checks, and restore
behavior. Tauri commands contain no SQL.

## External Requests

`jobsentinel-network` is the only reqwest owner. It validates public targets,
pins resolved addresses, disables redirects, limits response bodies, and
applies bounded retry policy. Billable or otherwise non-idempotent external-AI
requests explicitly disable retries.

Source, notification, local-AI, and external-AI owners call the network facade.
Provider-specific response types do not escape their owner crates.

## Platform And Desktop

`jobsentinel-platform` contains `cfg`-selected Windows, macOS, and Linux
implementation modules behind one public facade. Windows 11 and macOS 26+ are
the required native validation targets.

The Tauri crate owns process startup, command registration, tray and window
wiring, dialogs, clipboard access, and Tauri permissions. Commands validate IPC
input, call the application facade, and return minimized typed responses or
sanitized errors.

## Tests

Owner-local tests live beside their modules. Cross-owner application contracts
live under `crates/jobsentinel-application/tests/`; storage integration tests
live under `crates/jobsentinel-storage/tests/`. Default tests must not contact
remote providers or prompt for operating-system credentials.

```bash
cargo metadata --no-deps --format-version 1
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-features
npm run lint:architecture
```

Add a crate only for a real dependency, runtime, release, or security boundary.
Update the architecture contract, public entrypoint inventory, path-sensitive
sensors, tests, and documentation in the same change.
