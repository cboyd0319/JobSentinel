# Repository Architecture Milestones 0 Through 6

This archive preserves the completed checklists, acceptance commands, and
rollback boundaries from the
[active repository architecture plan](../active/repository-architecture-reorganization.md).
The active plan retains the remaining cleanup and release-readiness work.

## Completed Milestones

### 0. Install structural sensors before moving code

- [x] Extend `validation/file_size_contract.json` to cover `crates/**/*.rs`,
  root workspace policy, `resources/**/*.json`, and the future migration path.
- [x] Document the final 500-line production/script, 800-line test, and
  700-line active-doc caps as staged targets. Existing over-cap files must
  shrink during their owning milestone; no exception survives final cleanup.
- [x] Add fail-first script fixtures proving an oversized Rust file under
  `crates/` is rejected.
- [x] Add a repository-layout check that rejects wildcard Cargo members,
  missing explicit members, unlisted tracked member manifests, duplicate
  workspace policy, and Tauri dependencies in core.
- [x] Add a frontend feature-boundary fixture model before moving the first
  feature.
- [x] Add thin-shell contracts for `src-tauri/src/main.rs`, command routing,
  and public module facades.
- [x] Teach change classification, test-quality checks, harness planning, and
  CODEOWNERS about both the current and target roots during transition.
- [x] Keep `npm run lint:architecture` as the focused structural harness and
  make it run every architecture sensor through stable entrypoints.

Acceptance:

```bash
npm run lint:architecture
npm run lint:bloat
npm run test:scripts
npm run harness:check
```

Rollback: remove only the new sensors and fixtures. No production path has
changed.

### 1. Remove dead cargo and assign neutral data ownership

- [x] Confirm the four unused frontend component candidates have no dynamic or
  story consumers, then delete their source and tests instead of moving them.
- [x] Move Rust-consumed JSON taxonomies from `src/shared/` to
  `resources/taxonomies/` and update TypeScript imports and Rust `include_str!`
  paths in one taxonomy family at a time.
- [x] Move `config/config.example.json` to `examples/config/`, profile JSON and
  its README to `examples/profiles/`, and the sample resume to
  `examples/resumes/`.
- [x] Update the Rust configuration fixture, broad-audience checks, docs, and
  contributor commands for each example move.
- [x] Keep `models.lock.toml` at the root as governed lock data unless a
  separate model-resource owner is proven.

Acceptance:

```bash
npm run lint:bloat
npm run lint:architecture
npm run test:run
npm run test:scripts
cargo test -p jobsentinel-core --lib core::config
cargo test -p jobsentinel-core --lib taxonomy
npm run harness:check
```

Rollback: restore one resource or example family and its callers. No user data
or installed configuration path changes.

### 2. Migrate frontend ownership one feature at a time

- [x] Create `src/app/`, `src/features/`, `src/ui/`, and the reduced
  `src/shared/` only as the first files move.
- [x] Move root app startup, providers, router, navigation, and route
  composition into `src/app/` without changing rendered behavior.
- [x] Choose a low-coupling feature as the first vertical slice. Move its page,
  components, hooks, service, types, mocks, and tests together.
- [x] Repeat by feature, using import evidence rather than filename prefixes.
- [x] Move proven multi-feature visual primitives into `src/ui/`.
- [x] Reduce and delete `src/pages/`, `src/hooks/`, `src/contexts/`, and `src/utils/`.
- [x] Move the external-AI boundary and delete `src/services/`.
- [x] Reduce `src/components/` to zero and delete it.
- [x] Split the large mock dispatcher into feature-owned handlers and retain a
  thin deterministic registration layer.

Per-slice acceptance:

```bash
npm run lint:architecture
npm run lint
npm run test:run -- --related <moved-files>
npm run build
npm run harness:check
```

Run the relevant Playwright route test when composition, navigation, focus,
loading, error, empty, or narrow-width behavior could change.

Rollback: revert the current feature move only. Do not start another feature
with a failing slice.

### 3. Repair backend modules before extraction

- [x] Introduce owner-neutral job record and normalization modules, then remove
  the `job_hash` to scraper and scraper to database model cycles.
- [x] Break the `db` and `credentials` cycle without changing vault, keyring,
  migration, or local database behavior.
- [x] Group command-independent logic behind bounded-context facades while it
  still lives under `crates/jobsentinel-core/src/core/`.
- [x] Make leaf modules private and move tests beside their owning facade.
- [x] Replace integration-test imports of implementation paths with public
  behavior APIs.
- [x] Update `ARCHITECTURE_CORE.md` to describe observed dependency direction,
  including OS-aware adapters.

Per-slice acceptance:

```bash
cargo fmt --all -- --check
cargo clippy --workspace -- -D warnings
cargo test -p <owning-package> --lib <owning-module>
npm run lint:tauri-invokes
npm run lint:security
npm run harness:check
```

Credential or database slices also require fresh isolated database and
credential contract tests. Live keyring checks remain explicit opt-in tests.

Rollback: revert one module seam while retaining the preexisting database and
credential formats.

### 4. Create the explicit workspace and extract core

- [x] Add the root virtual `Cargo.toml` with the two literal members.
- [x] Move shared Cargo metadata, dependency versions, lint policy, release
  profile, lockfile, Cargo config, Clippy config, and cargo-deny config to root.
- [x] Add `crates/jobsentinel-core/Cargo.toml` using workspace inheritance.
- [x] Move the curated Tauri-free core modules and their integration tests to
  `crates/jobsentinel-core/`.
- [x] Move SQLx migrations to the core owner, update compile-time migration
  paths, and place offline metadata at the workspace-owned path selected by a
  clean `cargo sqlx prepare` run.
- [x] Keep platform-specific core dependencies target-gated and preserve
  Windows, macOS, and Linux compilation contracts.
- [x] Update `src-tauri/Cargo.toml` to depend on `jobsentinel-core` by path and
  retain only Tauri app dependencies.
- [x] Update CI change classification, Cargo cache roots, dependency checks,
  SBOM input, doctor checks, security sensors, and docs.
- [x] Use the standard root `target/` directory unless release dry runs prove a
  Tauri incompatibility. Update every package path atomically if selected.

Acceptance:

```bash
cargo metadata --no-deps --format-version 1
cargo fmt --all -- --check
cargo clippy --workspace -- -D warnings
cargo test -p jobsentinel-core
cargo test -p jobsentinel --lib
cargo deny check advisories bans licenses sources
npm run lint:architecture
npm run lint:deps
npm run lint:security
npm run test:scripts
npm run harness:check
```

Also build one clean isolated database from the moved migrations and run the
release path fixture tests for Windows, macOS, and Linux artifact locations.

Rollback: restore the single package manifest, lockfile, migration owner, and
old target-path contract together. Do not leave split Cargo policy behind.

### 5. Thin the Tauri application shell and IPC router

- [x] Move startup orchestration from `main.rs` into private app modules behind
  `pub fn run()` in `src-tauri/src/lib.rs`.
- [x] Reduce `main.rs` to platform attributes plus the app entrypoint call.
- [x] Keep `commands/` and command registration private to the app crate.
- [x] Group command implementation files by bounded context while preserving
  every IPC command name and serialized contract.
- [x] Move business rules out of command files into core APIs; commands retain
  argument validation, state access, error translation, and response mapping.
- [x] Keep one explicit command registry and update the invoke contract sensor
  to read it without requiring public command modules.

Acceptance:

```bash
cargo fmt --all -- --check
cargo clippy -p jobsentinel -- -D warnings
cargo test -p jobsentinel --lib
cargo test -p jobsentinel-core
npm run lint:tauri-invokes
npm run lint:architecture
npm run lint:security
npm run test:run
npm run harness:check
```

Rollback: restore the prior startup or command group without changing the IPC
name registry.

### 6. Rebuild script and harness ownership

- [x] Split `check-harness.mjs`, `check-security-sensors.mjs`,
  `check-dependency-pins.mjs`, `check-tauri-invokes.mjs`, and
  `check-repo-bloat.mjs` by existing policy families.
- [x] Move platform build implementations under `scripts/platform/` and
  release assembly or verification under `scripts/release/`.
- [x] Keep temporary-repository fixture setup local because no second consumer
  with the same contract exists.
- [x] Make `test:scripts` recursively and deterministically discover all script
  tests if tests move out of the current two globs.
- [x] Update package.json, workflows, docs, hooks, and all maintained callers
  directly to the final commands and paths.
- [x] Delete root compatibility entrypoints and old test globs in this
  milestone.

Acceptance:

```bash
npm run test:scripts
npm run harness:check
npm run lint:bloat
npm run lint:deps
npm run lint:security
npm run lint:tauri-invokes
npm run doctor
```

Rollback: revert the script ownership milestone as a unit. Do not keep dual
entrypoints.
