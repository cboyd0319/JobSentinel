# Full Repository Refactor And v2.9.5 Readiness

## Problem

JobSentinel needs a full repository refactor before the next release. It has
outgrown several early directory boundaries. The problem is
not repository size by itself. Code with one owner is spread across generic
folders, shared data is stored under the frontend even though Rust compiles it,
the Rust package exposes implementation modules because the app and core share
one crate, and repository sensors encode the current layout with path-specific
rules.

Observed on 2026-07-13:

| Surface | Files | Text lines | Main structural issue |
| ------- | ----: | ---------: | --------------------- |
| `src/` | 533 | 135,275 | Feature-private pages, components, services, and utilities are mixed in broad technical folders. |
| `src-tauri/` | 513 | 138,149 | One package owns Tauri, business logic, storage, source adapters, platform code, and integration tests. |
| `docs/` | 171 | 44,623 | Routing is generally sound, but architecture and command references assume the current layout. |
| `scripts/` | 157 | 51,193 | Stable entrypoints also contain large implementations, fixtures, and hardcoded Rust paths. |
| `tests/` | 24 | 4,657 | Browser E2E ownership is clear and should remain stable. |
| `skills/` | 35 | 2,052 | This is a separate release artifact with clear ownership and should remain stable. |

Specific evidence:

- `src/components/` contains 177 files and `src/pages/` contains 155 files.
  Many components and helpers have only one feature importer.
- `src/pages/` has more than 200 page-to-page imports. The current frontend
  boundary check prevents only broad layer violations; it does not enforce
  feature ownership.
- Nine JSON taxonomies under `src/shared/` are compiled into Rust with
  `include_str!`. Their current path incorrectly assigns cross-runtime product
  data to the frontend.
- `src-tauri/src/core/` contains 342 files and more than 109,000 lines.
  `src-tauri/src/lib.rs` publicly exposes `commands`, `core`, and `platforms`,
  while `src-tauri/src/main.rs` contains about 500 lines of startup logic.
- The backend has real dependency cycles that must be repaired as modules
  before crate extraction. `db` and `credentials` depend on one another.
  `job_hash` imports scraper normalization helpers while many scrapers call
  `calculate_job_hash`.
- SQLx migrations are compiled with `sqlx::migrate!("./migrations")`, relative
  to the current package. The migrations and `.sqlx` metadata need an explicit
  owner during a workspace migration.
- `validation/file_size_contract.json` covers `src-tauri/src/**/*.rs` but would
  not cover a new root `crates/` directory.
- CI, release packaging, dependency checks, SBOM generation, the doctor, and
  security sensors contain dozens of `src-tauri/Cargo.toml`,
  `src-tauri/Cargo.lock`, `src-tauri/.sqlx`, and `src-tauri/target` assumptions.
- Four production components, `AsyncButton.tsx`, `Icons.tsx`,
  `SkillCategoryFilter.tsx`, and `VirtualJobList.tsx`, currently have no
  production consumers. They have tests but should be deletion candidates,
  not migration cargo.

Tamworth and persona provide useful patterns for explicit Cargo members,
workspace-inherited policy, private module facades, thin dispatch, dependency
direction tests, and file-cap tests. Their crate counts are not a target for
JobSentinel. JobSentinel should use two Rust crates because it currently
has two proven ownership boundaries: the Tauri application and its Tauri-free
core.

This is a clean cutover. Internal source paths, Rust and TypeScript module APIs,
Cargo working directories, script locations, package commands, and contributor
workflows do not require backward compatibility. The finished tree must not
retain deprecated directories, forwarding modules, compatibility wrappers, or
duplicate policy merely to support the previous repository layout.

Privacy guarantees are immutable. Architecture, product behavior, UI, app and
developer APIs, commands, schemas, storage layout, module boundaries, tests,
docs, and release tooling may change when that produces the correct final
system. Data-format and storage changes require an explicit safe migration and
must not silently lose user data. Security, credential safety, local-first
defaults, source consent, user review, and external-AI privacy gates must not be
weakened.

## Scope

In scope:

- Define and enforce a target repository ownership map.
- Reorganize the frontend by product feature while retaining a small shared UI
  and cross-feature contract surface.
- Move cross-runtime taxonomies to a neutral `resources/` home.
- Consolidate advanced configuration samples under `examples/`.
- Repair Rust module boundaries before extracting crates.
- Introduce a root explicit-member virtual Cargo workspace with inherited
  package metadata, dependencies, lint policy, and release profile.
- Extract one `jobsentinel-core` crate and keep `src-tauri` as the Tauri app.
- Make Tauri startup and command routing thin, explicit, and private.
- Organize script implementations by responsibility while preserving stable
  package commands only where they remain the best final interface.
- Update tests, harness sensors, CI, release packaging, SBOM generation,
  documentation, and public wiki content for the new paths.
- Remove all obsolete source roots, path fallbacks, temporary transition code,
  deprecated commands, dead tests, duplicate fixtures, generated residue, and
  stale documentation after the new structure is proven.
- Complete v2.9.5 release readiness only after the refactor and cleanup are
  complete.
- Preserve or strengthen local-first privacy, user review gates, credential
  handling, source restrictions, and external-AI privacy boundaries. Their
  implementation and user flow may change.

Out of scope:

- Unrelated feature expansion or new job sources. Behavior, UI, schemas, and
  storage may change when required by the refactor or final correctness.
- A frontend package workspace or multiple npm packages.
- A crate per feature, technical layer, or directory.
- An edition upgrade, dependency refresh, or new build system as part of the
  reorganization.
- Code generation for module registries, taxonomies, or Cargo members unless a
  later milestone proves manual ownership is unsafe.
- Moving Tauri-owned `capabilities/`, `gen/`, `icons/`, `build.rs`, or
  `tauri.conf.json` out of `src-tauri/`.
- Moving `docs/`, `tests/e2e/`, `skills/`, `public/`, or root policy documents
  solely for visual symmetry.
- Publishing, tagging, or otherwise cutting v2.9.5. Release execution requires
  a separate explicit instruction after readiness is proven.
- Backward-compatible internal repository paths or developer command aliases.

## Success Criteria

- Observable result: the repository follows the target map below and every
  maintained file has one clear owner.
- Observable result: the root `Cargo.toml` is a virtual workspace with literal,
  explicit members `crates/jobsentinel-core` and `src-tauri`; no wildcard
  member discovery is permitted.
- Observable result: member manifests inherit package metadata and lint policy,
  shared dependency versions have one workspace source, and the root owns
  `Cargo.lock`, `.cargo/config.toml`, `clippy.toml`, and `deny.toml`.
- Observable result: `src-tauri/src/main.rs` only calls the app entrypoint;
  Tauri command and implementation modules are private to the app crate.
- Observable result: `jobsentinel-core` contains no Tauri dependency or Tauri
  imports and exposes bounded-context APIs rather than leaf modules.
- Observable result: frontend features cannot import `app/` or another feature
  implementation. Cross-feature composition happens in `app/`, and reusable
  UI has no product-feature dependency.
- Observable result: Rust, frontend, script, resource, migration, test, and docs
  file caps cover every maintained source root and have fail-first fixture
  tests.
- Observable result: old source buckets, old Cargo roots, old script paths,
  transitional forwarding modules, and obsolete compatibility checks are gone.
- Observable result: a final tracked-file audit finds no dead code, stale path,
  duplicate source of truth, unowned generated output, or unjustified root
  singleton.
- User-ease result: any changed behavior, setup, accessibility, storage,
  migration, source-consent, or recovery flow is intentional, documented,
  tested, understandable without technical knowledge, and never weakens
  privacy.
- Verification result: focused architecture checks, subsystem tests, workspace
  checks, release path tests, a clean-tree audit, and the full v2.9.5 readiness
  gate pass on the new structure.

## Audience And Ease

- Primary user: job seekers using the installed desktop app. They may see
  intentional product changes, but must not be exposed to repository mechanics
  or weaker privacy.
- Technical knowledge assumed: none for product behavior; contributor docs may
  assume normal npm, Cargo, Tauri, and SQLx knowledge.
- Broad job-seeker fit: career profiles, examples, fixtures, and user-facing
  copy must retain non-technical and non-software role coverage.
- Support or recovery path: every data or settings change has an explicit,
  tested migration and recovery contract. Internal paths and APIs need not be
  preserved.

## Risks

| Risk | Mitigation |
| ---- | ---------- |
| Large rename diffs hide unintended behavior changes. | Move one ownership slice at a time, isolate intentional behavior changes with explicit tests and docs, and run focused checks after each slice. |
| Frontend feature boundaries become a different set of generic buckets. | A feature must have a product owner and route or workflow. Code used by one feature stays with it; shared code requires at least two real consumers. |
| Premature crate splits preserve cycles through large public APIs. | Repair module dependencies first and extract only the app/core boundary in this plan. |
| SQLx migrations or offline metadata stop resolving. | Assign them to `jobsentinel-core`, update `sqlx::migrate!`, regenerate metadata in offline mode, and test a fresh isolated database before removing old paths. |
| Root workspace changes Cargo output paths and release packaging. | Standardize on root `target/`, update packaging and fixture tests atomically, and run platform-specific dry-run checks before deleting old path logic. |
| Security sensors silently stop checking moved code. | Add target-path fixture tests before moves and require old-path references to reach zero in maintained sensors after each milestone. |
| Windows or macOS behavior regresses unintentionally. | Change platform adapters only with an explicit contract and use live checks, contract tests, or isolated roots when both hosts cannot be checked directly. |
| Docs and examples become duplicate sources of truth. | Keep runtime data in `resources/`, contributor samples in `examples/`, and behavior docs in `docs/`; link instead of copying. |
| A clean cutover creates a long failing interval. | Keep milestones independently green, but update all maintained callers in the same milestone instead of carrying compatibility shims forward. |
| Cleanup is treated as cosmetic and misses obsolete behavior. | Run a separate post-refactor cleanup milestone with dead-code, duplicate, path, generated-artifact, docs, fixture, and dependency audits. |
| Release pressure truncates verification. | v2.9.5 readiness starts only after the refactor and cleanup completion gates are recorded. |

## Orchestration

Use one tightly scoped implementation owner per milestone. Parallel work is
appropriate only for disjoint documentation, fixture, or verification slices
and only when explicitly authorized. Each accepted slice must follow
`AGENTS.md`, Rule 0, the change contract, and the verification matrix.

Do not combine frontend, Rust, script, and release-path moves in one change.
The coordinator for a milestone owns path decisions, final diff review, and the
evidence-log entry.

Temporary transition code may exist only inside an unfinished milestone. It
must be removed before that milestone is accepted.

## Target Structure

```text
<repo-root>/
├── .cargo/
│   └── config.toml
├── Cargo.toml
├── Cargo.lock
├── clippy.toml
├── deny.toml
├── crates/
│   └── jobsentinel-core/
│       ├── Cargo.toml
│       ├── migrations/
│       ├── src/
│       └── tests/
├── src-tauri/
│   ├── Cargo.toml
│   ├── build.rs
│   ├── capabilities/
│   ├── gen/
│   ├── icons/
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs
│   │   ├── commands/
│   │   └── platform/
│   └── tauri.conf.json
├── src/
│   ├── app/
│   ├── features/
│   ├── shared/
│   ├── test/
│   └── ui/
├── resources/
│   └── taxonomies/
├── examples/
│   ├── config/
│   ├── profiles/
│   └── resumes/
├── scripts/
│   ├── checks/
│   ├── dependency/
│   ├── harness/
│   ├── lib/
│   ├── platform/
│   ├── release/
│   ├── security/
│   └── tests/
├── tests/
│   └── e2e/
├── docs/
├── skills/
├── public/
└── validation/
```

The tree is an ownership map, not a requirement to add empty directories.
Directories appear only when a migrated file needs them.

### Design for growth

Growth readiness means future changes remain local and governed. It does not
mean predicting every future feature or creating empty layers, packages, or
crates now.

- Every production file has one product or platform owner and one permitted
  dependency direction.
- New features begin as private modules inside the closest real owner. They
  become top-level feature modules only when they own a user workflow, and
  become crates only when the crate extraction gates are met.
- Generic `common`, `helpers`, `misc`, and catch-all `shared` buckets are
  forbidden. Shared code must name its contract and have at least two current
  consumers.
- Facades are small and explicit. Leaf modules stay private so internal growth
  does not widen the change surface.
- Registries, Cargo members, test discovery, release inputs, and generated
  sources are deterministic and checked. Directory globs do not define
  ownership.
- Final production source and script files have a default 500-line hard cap;
  tests have an 800-line hard cap; active docs have a 700-line hard cap.
  Structured canonical data may use a separately justified data cap. There are
  no grandfathered exceptions after cleanup.
- Entrypoints have tighter contracts: Tauri `main.rs` at most 20 lines, crate
  facades at most 100 lines, script routers at most 80 lines, and routing or
  command registries at most 300 lines.
- A file that reaches its cap is split by ownership before more behavior is
  added. The goal is not to eliminate all future refactoring, which is not
  possible; it is to make future refactoring small, obvious, and local.
- Architecture sensors run in the focused harness and fail with the exact owner
  or dependency rule that was violated.

### Frontend ownership

Dependency direction:

```text
app -> features -> ui/shared
app -> ui/shared
ui -> shared
shared -> browser and standard-library APIs only
```

- `app/` owns startup, providers, routing, navigation, and cross-feature page
  composition.
- `features/<feature>/` owns its pages, components, hooks, services, models,
  mocks, and tests. Initial slices should follow existing user workflows such
  as job search, applications, resume, hiring trends, pay, setup, settings,
  notifications, external AI, deep links, and support.
- `ui/` contains only product-neutral components with multiple consumers.
- `shared/` contains only cross-feature contracts and small general utilities.
  It is not the default destination for code that does not yet have an owner.
- Feature-to-feature implementation imports are denied. If two features need a
  contract, move the smallest contract to `shared/`; if one feature merely
  renders another, compose them in `app/`.
- Tests remain beside their owning source. Mock handlers move with features;
  `src/test/` retains only global test setup and cross-feature fixtures.

### Rust ownership

The initial workspace has exactly two members:

1. `crates/jobsentinel-core`: Tauri-free domain, application, storage, network,
   security, source, notification, and platform-adapter logic.
2. `src-tauri`: Tauri lifecycle, plugins, managed state, commands, IPC mapping,
   tray behavior, and application startup.

The core may remain OS-aware during the first extraction. Calling it
"platform-neutral" is inaccurate while it owns keyring, filesystem, and native
authentication adapters. The enforceable initial boundary is Tauri-free.

Within `jobsentinel-core`, bounded-context modules may be public facades, but
leaf implementation modules stay private. Likely contexts are search and
sources, applications and assist, resumes and matching, market and pay,
notifications, and local foundation. These names must be validated by actual
callers during the module milestone; they are not a mandate to merge unrelated
code.

Before extraction:

- Move title, location, and URL normalization out of `scrapers` so `job_hash`
  does not depend on a source-adapter module.
- Separate domain job records from `db` so scrapers and scoring do not import a
  storage-owned `Job` type.
- Break the `db` and `credentials` cycle with an explicit storage or credential
  interface owned by the caller.
- Replace broad `pub mod` and `pub use` surfaces with the minimum API required
  by commands and tests.

No additional crate is approved by this plan. A later extraction requires all
of the following evidence:

- one accountable owner and one stable reason to release or compile separately;
- an acyclic dependency edge visible in `cargo metadata`;
- a small public API that does not re-export implementation modules;
- focused tests that run without the Tauri app;
- measurable isolation benefit such as optional heavy dependencies, security
  review scope, or independent platform behavior.

Potential later candidates include storage/security, source adapters,
automation, or embedded ML. Project size and file count are not evidence.

### Cargo policy

The root virtual workspace must use `resolver = "2"` while members remain Rust
2021. Its literal member list is:

```toml
[workspace]
members = ["crates/jobsentinel-core", "src-tauri"]
resolver = "2"
```

The root owns:

- `[workspace.package]` version, edition, authors, license, repository,
  keywords, and categories;
- `[workspace.dependencies]` versions and shared feature baselines;
- `[workspace.lints.rust]` and `[workspace.lints.clippy]`;
- `[profile.release]`;
- root `Cargo.lock`, `.cargo/config.toml`, `clippy.toml`, and `deny.toml`.

Member manifests use `*.workspace = true` and `[lints] workspace = true`.
Member-specific dependency features, Tauri build dependencies, and optional
feature wiring remain local where ownership differs.

### Scripts, harness, and release tooling

- Redesign package.json commands and script paths as part of the cutover. Keep
  a command only when it remains the clearest final contributor interface.
- Move shared filesystem, process, fixture, and Cargo-metadata helpers to
  `scripts/lib/` only after two real consumers exist.
- Split large checks by policy family under `scripts/checks/`, not by arbitrary
  line count.
- Preserve `scripts/harness/`, `scripts/security/`, and `scripts/dependency/`
  as real ownership boundaries.
- Put platform packaging under `scripts/platform/` and release assembly or
  public-asset verification under `scripts/release/`.
- Organize script tests with their policy family or in a deliberate central
  test tree, then make `test:scripts` recurse deterministically. A moved test is
  not accepted until the package command proves it ran.
- Do not retain root forwarding scripts after maintained callers, docs, and
  workflows use the final path.

## Milestones

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
(cd src-tauri && cargo test --lib core::config)
(cd src-tauri && cargo test --lib taxonomy)
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
- [ ] Repeat by feature, using import evidence rather than filename prefixes.
- [ ] Move only multi-consumer, product-neutral components into `src/ui/`.
- [x] Reduce and delete `src/pages/`, `src/hooks/`, `src/contexts/`, and `src/utils/`.
- [ ] Reduce `src/components/` and `src/services/` to zero before deleting them.
- [ ] Split the large mock dispatcher into feature-owned handlers and retain a
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

### 3. Repair backend modules inside the existing crate

- [ ] Introduce owner-neutral job record and normalization modules, then remove
  the `job_hash` to scraper and scraper to database model cycles.
- [ ] Break the `db` and `credentials` cycle without changing vault, keyring,
  migration, or local database behavior.
- [ ] Group command-independent logic behind bounded-context facades while it
  still lives under `src-tauri/src/core/`.
- [ ] Make leaf modules private and move tests beside their owning facade.
- [ ] Replace integration-test imports of implementation paths with public
  behavior APIs.
- [ ] Update `ARCHITECTURE_CORE.md` to describe observed dependency direction,
  including OS-aware adapters.

Per-slice acceptance:

```bash
(cd src-tauri && cargo fmt --all -- --check)
(cd src-tauri && cargo clippy -- -D warnings)
(cd src-tauri && cargo test --lib <owning-module>)
npm run lint:tauri-invokes
npm run lint:security
npm run harness:check
```

Credential or database slices also require fresh isolated database and
credential contract tests. Live keyring checks remain explicit opt-in tests.

Rollback: revert one module seam while retaining the preexisting database and
credential formats.

### 4. Create the explicit workspace and extract core

- [ ] Add the root virtual `Cargo.toml` with the two literal members.
- [ ] Move shared Cargo metadata, dependency versions, lint policy, release
  profile, lockfile, Cargo config, Clippy config, and cargo-deny config to root.
- [ ] Add `crates/jobsentinel-core/Cargo.toml` using workspace inheritance.
- [ ] Move the curated Tauri-free core modules and their integration tests to
  `crates/jobsentinel-core/`.
- [ ] Move SQLx migrations to the core owner, update compile-time migration
  paths, and place offline metadata at the workspace-owned path selected by a
  clean `cargo sqlx prepare` run.
- [ ] Keep platform-specific core dependencies target-gated and preserve
  Windows, macOS, and Linux compilation contracts.
- [ ] Update `src-tauri/Cargo.toml` to depend on `jobsentinel-core` by path and
  retain only Tauri app dependencies.
- [ ] Update CI change classification, Cargo cache roots, dependency checks,
  SBOM input, doctor checks, security sensors, and docs.
- [ ] Use the standard root `target/` directory unless release dry runs prove a
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

- [ ] Move startup orchestration from `main.rs` into private app modules behind
  `pub fn run()` in `src-tauri/src/lib.rs`.
- [ ] Reduce `main.rs` to platform attributes plus the app entrypoint call.
- [ ] Keep `commands/` and command registration private to the app crate.
- [ ] Group command implementation files by bounded context while preserving
  every IPC command name and serialized contract.
- [ ] Move business rules out of command files into core APIs; commands retain
  argument validation, state access, error translation, and response mapping.
- [ ] Keep one explicit command registry and update the invoke contract sensor
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

- [ ] Split `check-harness.mjs`, `check-security-sensors.mjs`,
  `check-dependency-pins.mjs`, `check-tauri-invokes.mjs`, and
  `check-repo-bloat.mjs` by existing policy families.
- [ ] Move platform build implementations under `scripts/platform/` and
  release assembly or verification under `scripts/release/`.
- [ ] Consolidate repeated temporary-repository fixture setup only after the
  second consumer is identified.
- [ ] Make `test:scripts` recursively and deterministically discover all script
  tests if tests move out of the current two globs.
- [ ] Update package.json, workflows, docs, hooks, and all maintained callers
  directly to the final commands and paths.
- [ ] Delete root compatibility entrypoints and old test globs in this
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

### 7. Complete the full post-refactor repository cleanup

- [ ] Remove obsolete directories only after `rg` finds no maintained caller.
- [ ] Run tracked-file dead-code and orphan-test audits across TypeScript, Rust,
  JavaScript, fixtures, examples, generated outputs, and assets.
- [ ] Delete unused dependencies, features, lint allowances, configuration,
  scripts, fixtures, screenshots, icons, and tests. Do not keep tests whose only
  subject was deleted.
- [ ] Resolve duplicate product concepts and sources of truth. Runtime data,
  examples, docs, tests, and release artifacts must each have distinct owners.
- [ ] Remove temporary re-exports, path aliases, migration shims, duplicate
  Cargo settings, and old target-directory handling.
- [ ] Review every root file and directory. Keep root singletons only when they
  are true repository-wide entrypoints, lockfiles, or policies.
- [ ] Run formatter and lint autofixes only after structural moves settle, then
  manually review the resulting diff.
- [ ] Update architecture, getting-started, testing, SQLx, release, platform,
  security, and contributor docs.
- [ ] Update the public GitHub wiki pages affected by setup, architecture,
  testing, or release command changes.
- [ ] Update `AGENTS.md`, the verification matrix, harness map, plan index,
  CODEOWNERS, and evidence log to the final paths.
- [ ] Replace the transitional 700-line source, 1,200-line test, and 900-line
  script/doc contract limits with the final caps after every owner is below its
  target. Until then, each completed ownership slice records its target-cap
  evidence separately.
- [ ] Search maintained files for stale old-root references and explicitly
  classify necessary historical references.
- [ ] Record Windows 11 and macOS 26 evidence or clearly name any host gap and
  the isolated contract evidence used instead.

Cleanup acceptance:

```bash
git status --short
npm run lint:architecture
npm run lint:bloat
npm run lint:dup
npm run lint:tests
npm run lint:deps:why
npm run lint:security
npm run test:scripts
npm run harness:check
git diff --check
```

The worktree need not be empty during implementation, but every tracked change
must belong to this plan and no build output or one-off report may be added.

### 8. Prove v2.9.5 release readiness

- [ ] Confirm all refactor and cleanup milestones are complete with evidence.
- [ ] Update package, Tauri, Cargo workspace, changelog, docs, and release
  metadata to v2.9.5 in one version contract change.
- [ ] Refresh SQLx offline metadata, dependency rationale, SBOM inputs, and
  release-path fixtures from the final workspace.
- [ ] Run the full frontend, Rust workspace, security, harness, docs, E2E, and
  platform package gates required by the verification matrix.
- [ ] Verify a clean Windows 11 package path and a clean macOS 26 package path,
  plus Linux contract or live evidence required by the release process.
- [ ] Update the public GitHub wiki from the final commands and architecture.
- [ ] Record all readiness evidence in `docs/harness/evidence-log.md`.
- [ ] Move this plan to `docs/plans/completed/` only when readiness passes and
  no required work remains.
- [ ] Stop before tagging, publishing, uploading, or dispatching a release. Ask
  for explicit release authorization.

## Verification

Current assessment baseline on 2026-07-13:

```text
npm run lint:bloat         passed
npm run lint:architecture  passed
npm run harness:check      passed
```

Focused checks are listed under each milestone. Final completion requires:

```bash
npm run harness:check
npm run harness:score
npm run lint:architecture
npm run lint:bloat
npm run lint:security
npm run lint:tauri-invokes
npm run lint
npm run test:scripts
npm run test:run
npm run build
cargo metadata --no-deps --format-version 1
cargo fmt --all -- --check
cargo clippy --workspace -- -D warnings
cargo test --workspace
cargo deny check advisories bans licenses sources
git diff --check
```

Platform packaging needs the smallest live checks supported by each touched
milestone plus release-script fixture coverage for all three targets. The
v2.9.5 readiness milestone requires the full current release verification
matrix, not only focused checks. No release-ready claim is allowed without an
evidence-log entry.

## Progress

| Date | Status | Notes |
| ---- | ------ | ----- |
| 2026-07-13 | Milestone 2 in progress | Deleted the root `src/utils/` bucket after splitting its last mixed module. Safe browser downloads are shared; Dashboard owns spreadsheet-safe CSV; Settings owns recursively redacted backup files and selection. The latest cut passed 64 focused frontend tests, 37 privacy and copy-policy tests, 2,931 frontend tests across 191 files, 766 script tests, the 811-module build, and 35 Dashboard, Resume Builder, and Settings E2E flows. Credential redaction, formula neutralization, filename safety, user review, and local-only behavior are unchanged. |
| 2026-07-13 | Milestone 2 in progress | Split Error Reporting by dependency direction: `src/app/providers/ErrorReportingProvider.tsx` owns initialization and composition, while `src/shared/errorReporting/` owns the typed context, hook, local reporter, validation, and sanitization contract used across app recovery, Dashboard, Settings, utilities, and feedback. Deleted four helpers with no production consumers, removed the transitional contexts barrel, and deleted the empty root `contexts` and `hooks` buckets. The reporter is 470 lines, below the final production cap. All 189 focused frontend tests, 64 focused policy tests, 3,052 frontend tests across 184 files, 766 script tests, the 804-module build, repository gates, and 31 app-shell and Settings E2E flows pass. No user-facing behavior or public wiki page changed. |
| 2026-07-13 | Milestone 2 in progress | Split Undo ownership by dependency direction: `src/app/providers/UndoProvider.tsx` owns stacks, keyboard handling, and Toast composition, while `src/shared/undo/` owns the typed action context and hook consumed by Dashboard and Applications. Updated path-sensitive policy fixtures and the completed wiring plan, then removed Undo exports from the transitional contexts barrel. All 111 focused frontend tests, 45 focused policy tests, 3,054 frontend tests across 184 files, 766 script tests, the 805-module build, repository gates, and 33 Dashboard and Applications E2E flows pass. |
| 2026-07-13 | Milestone 2 in progress | Split Toast ownership by dependency direction: `src/app/providers/ToastProvider.tsx` owns timers, portal rendering, and visible notifications, while `src/shared/toast/` owns the typed cross-feature context and hook. Updated 66 direct production and test references and removed Toast exports from the transitional contexts barrel. All 152 focused frontend tests, 13 focused boundary and source-structure tests, 3,054 frontend tests across 184 files, 766 script tests, the 805-module build, repository gates, and 15 app-shell E2E flows pass. |
| 2026-07-13 | Milestone 2 in progress | Split Theme ownership by dependency direction: `src/app/providers/ThemeProvider.tsx` owns persistence and document effects, while `src/shared/theme/` owns the cross-feature context and hook consumed by UI. Removed Theme exports from the transitional contexts barrel. All 24 focused frontend tests, 13 focused boundary and source-structure tests, 3,054 frontend tests across 184 files, 766 script tests, the 805-module build, repository gates, and 15 app-shell E2E flows pass. |
| 2026-07-13 | Milestone 2 in progress | Moved the failure-tolerant browser-storage contract and tests from the root utility bucket to `src/shared/browserStorage.ts`. Current app, feature, service, and company-research consumers import the named contract directly, and the privacy fixture follows the shared owner. All 105 focused frontend tests, 25 focused security-sensor tests, 3,054 frontend tests across 184 files, 766 script tests, the 805-module build, and repository gates pass. |
| 2026-07-13 | Milestone 2 in progress | Deleted the mounted but inert announcer provider, context, hook, and self-only tests after proving no production code called `useAnnouncer` or `announce`. App startup now has one fewer empty provider layer. All 17 focused frontend tests, 27 focused source-structure tests, 3,054 remaining frontend tests across 184 files, 766 script tests, the reduced 805-module build, repository gates, and 15 app-shell E2E flows pass. |
| 2026-07-13 | Milestone 2 in progress | Moved the onboarding provider, overlay, tour action, and hook into `src/app/onboarding/`. Dashboard now accepts an optional tour action in its header instead of importing app-shell state through the root components bucket. All 54 focused frontend tests, 27 focused source-structure tests, 3,062 frontend tests across 185 files, 766 script tests, the 807-module build, repository gates, and 35 app-shell and keyboard E2E flows pass. |
| 2026-07-13 | Milestone 2 in progress | Consolidated the app-only keyboard provider, context, hook, shortcut contract, and formatter under `src/app/keyboard/`. App composition and Command Palette imports are direct, the redundant root type and utility files are gone, and product-copy sensors follow the owner. All 84 focused frontend tests, 17 focused sensor tests, 3,062 frontend tests across 185 files, 766 script tests, the 807-module build, repository gates, and 35 app-shell and keyboard E2E flows pass. |
| 2026-07-13 | Milestone 2 in progress | Moved the app bootstrap's web-vitals implementation and tests into `src/app/`. Moved the modal primitive's body-scroll lock into `src/ui/`, with direct imports from its implementation and tests. Path-sensitive product-copy and source-quality sensors follow the new owner. All 67 focused frontend tests, 48 focused sensor tests, 3,062 frontend tests across 185 files, 766 script tests, the 807-module build, and repository gates pass. |
| 2026-07-13 | Milestone 2 in progress | Moved the sole Dashboard consumer's debounce hook into `src/features/dashboard/hooks/` with a direct import, then deleted the unused root hooks barrel. All 4 focused filter tests, 27 focused source-structure tests, 3,062 frontend tests, the 807-module build, repository gates, and 22 Dashboard filtering E2E flows pass. |
| 2026-07-13 | Milestone 2 in progress | Deleted the unreferenced `errorHelpers` source and its two self-only test files, removing 1,286 lines and 84 tests without removing shipped coverage. Replaced its obsolete path-specific privacy sensor with a source-wide TypeScript detector for raw error-detail logging, missing sanitizers, and raw `error.message` user copy. All 52 focused sensor tests, 3,062 remaining frontend tests across 185 files, 766 script tests, the 808-module build, and repository gates pass. |
| 2026-07-13 | Milestone 2 in progress | Renamed the root cover-letter helper to `src/features/applications/coverLetterTemplate.ts`, its actual 33-line owner and role. All 58 focused template tests, 3,146 frontend tests, the 808-module build, lint, architecture, bloat, and 22 Application Tracking E2E flows pass. |
| 2026-07-13 | Milestone 2 in progress | Moved the root resume-analysis score utility and its tests into `src/features/resumes/shared/resumeScore.ts`. Builder, library, and matching consumers now use one Resume-owned scoring contract, and product-copy sensors follow that owner. All 101 focused tests, 3,146 frontend tests, 766 script tests, the 808-module build, repository gates, and 31 Resume E2E flows pass. |
| 2026-07-13 | Milestone 2 in progress | Moved Dashboard-only keyboard navigation, privacy-preserving desktop notifications, posting-risk interpretation, and external job URL validation from root technical buckets into `src/features/dashboard/`. Renamed the job URL and keyboard modules to state their actual scope, removed the stale root hook export, and corrected the developer hook example to match the live object-based API. All 126 focused tests, 3,146 frontend tests, 766 script tests, the 808-module build, repository gates, and 48 Dashboard E2E flows pass. |
| 2026-07-13 | Milestone 2 in progress | Moved the Settings-only feedback hook, semantic-matching diagnostics client, and company-suggestion data from the root `hooks`, `services`, and `utils` buckets into their notification, matching, and support owners. All 57 focused tests, 3,146 frontend tests, 766 script tests, the 808-module build, repository gates, and 16 Settings E2E flows pass. |
| 2026-07-13 | Milestone 2 in progress | Assigned app-only command, keyboard-help, recovery, and tour-configuration modules to private subdirectories under `src/app/`. Assigned Dashboard-only component and modal recovery boundaries to `src/features/dashboard/errors/`. Privacy-logging and plain-language recovery sensors now follow the owners. The mixed App and Dashboard onboarding tour remains unchanged until composition evidence supports a clean split. Focused and full frontend tests, all 766 script tests, the 808-module build, lint, architecture, security, bloat, and 35 focused app-shell and keyboard E2E flows pass. |
| 2026-07-13 | Milestone 2 in progress | Established `src/features/settings/` as the owner for Settings, search preferences, source setup, notifications, secure credentials, external AI, matching controls, backup, support, and Browser Import UI. App composition supplies the Settings page as a component without a Dashboard-to-Settings implementation import. Production Settings files are 494 lines or fewer. Existing local company preferences survive the terminology and serialized-field cutover through read-only aliases, while new data uses precise preferred, blocked, included, and excluded names. The complete Google developer documentation style guide now has a maintained 70-page source map and review matrix; Apple-specific language remains governed by the complete Apple Style Guide. A repository language sensor enforces deterministic prohibited terms in prose and code, and release preparation now includes Google's inclusive open-source check. Playwright and Browser Import now recover from occupied default ports with operating-system-selected loopback ports; Browser Import persists its actual port and requires a fresh copied browser button. Full frontend, script, Rust, docs, lint, architecture, security, bloat, duplication, build, and focused Settings E2E gates pass. |
| 2026-07-13 | Milestone 2 in progress | Moved the app composition root and navigation into `src/app/`, then completed vertical feature slices under `src/features/salary/`, `src/features/market/`, `src/features/application-assist/`, `src/features/applications/`, `src/features/onboarding/`, `src/features/dashboard/`, and `src/features/resumes/`. Pages, models, private components, tests, and development mocks now follow feature ownership. Resume library, builder, and matching remain one domain owner with three public pages and private workflow modules. The former 696-line Salary page, 679-line Market page, 693-line Dashboard page, 691-line Dashboard job-operations hook, and 682-line Job Card were split at real behavior boundaries. Application Assist controllers are 488 lines or fewer, Applications production modules are 467 lines or fewer, Onboarding production modules are 461 lines or fewer, Dashboard production modules are 496 lines or fewer, and Resume production modules are 495 lines or fewer with tests at 796 lines or fewer. The app composition root imports only public feature facades. Feature copy, schema, broad-audience, IPC minimization, source-quality, source-structure, privacy logging, security, and file-cap sensors follow the new owners. Focused and full frontend tests, all 759 script tests, lint, architecture, the 787-module production build, focused E2E, security sensors, and harness checks pass. |
| 2026-07-13 | Milestone 1 complete | Deleted four verified production-orphan component families, moved nine cross-runtime taxonomies to `resources/taxonomies/`, consolidated contributor samples under `examples/`, and updated every live consumer and harness path. Full frontend and script suites plus focused Rust consumers pass. |
| 2026-07-13 | Milestone 0 complete | Added fail-first feature, workspace, thin-shell, file-cap, test-quality, harness-planning, CI classification, and ownership sensors. `test:scripts` passed 757 tests; focused architecture, bloat, test-quality, Markdown, and harness checks passed. No production paths moved. |
| 2026-07-13 | Planned | Completed repo-wide inventory, boundary analysis, sibling-pattern comparison, and baseline harness checks. No production paths moved. |

## Discoveries

- The baseline file-size policy passed even though its Rust scope would have
  silently missed a new root `crates/` directory; Milestone 0 closed that gap.
- Final 500-line production/script, 800-line test, and 700-line active-doc caps
  are milestone targets, not yet the global contract. The live contract retains
  transitional 700/1,200/900 limits until remaining owners shrink, so every
  completed slice must prove the tighter target separately.
- Frontend organization is the largest ownership problem by file distribution;
  a Cargo workspace alone would leave most structural debt untouched.
- The current `src/shared/` directory is not frontend-only because Rust embeds
  nine of its JSON files.
- The existing Rust core is Tauri-free but not platform-neutral.
- The present command registry is explicit and reasonably small. It should be
  retained as a routing contract, not replaced by discovery or generation.
- `docs/`, `tests/e2e/`, and `skills/` already have clear ownership. A major
  reorganization should preserve good boundaries instead of moving everything.
- Advanced profile JSON files and the in-app career profile taxonomy serve
  different schemas, but their current root placement obscures that the JSON
  files are contributor examples rather than runtime product data.

## Decisions

- Use modules before crates.
- Start with two Rust workspace members, not a crate count copied from another
  repository.
- Keep `src-tauri` as the Tauri package directory because Tauri-owned generated
  and packaging surfaces already belong there.
- Keep one npm package and organize the frontend with enforced feature modules.
- Use root `resources/` only for canonical cross-runtime product data.
- Make one clean cutover to final package commands and script paths. Do not
  preserve internal repository compatibility wrappers.
- Prefer deletion over relocation for verified unused files.
- Use Rust 2021 workspace resolver 2. An edition change is a separate decision.
- Use the standard root Cargo target directory and update platform packaging in
  the same milestone.
- Treat full cleanup as a required phase after structural refactoring, not as
  optional polish.
- Keep icons cross-platform and local to the owning UI. Do not add an SF
  Symbols integration or platform adapter solely for icons.
- Treat v2.9.5 as a readiness target only until release execution is explicitly
  authorized.

## Outcomes

- Milestone 0 is complete. Structural rules now fail before an invalid feature
  import, wildcard or incomplete workspace, duplicated member policy, Tauri
  dependency in core, oversized workspace source file, public command module,
  or oversized Tauri entrypoint can enter the target layout.
- Milestone 1 is complete. Canonical cross-runtime taxonomies now have neutral
  ownership under `resources/`, contributor samples have one `examples/`
  owner, and four unused component families have been deleted.
- Milestone 2 is in progress. App composition is owned by `src/app/`; Salary,
  Hiring Trends, Application Assist, Applications tracking, first-run
  Onboarding, Dashboard job discovery, Resume library, builder and matching,
  Settings, and Search Links are complete feature slices with public facades
  and private implementation modules under `src/features/`. The shared Search
  Links IPC model and client have one neutral multi-consumer owner. Seventeen
  proven multi-feature visual primitives now have direct module ownership under
  `src/ui/`, without an aggregate barrel. Settings-private notification,
  source-health, problem-report, and feedback UI modules have moved out of the
  transitional components bucket into explicit Settings subdomains. App-only
  command, keyboard-help, recovery, and tour-configuration modules now live in
  private `src/app/` subdirectories. Dashboard-only recovery boundaries live
  under their feature owner. Settings-only feedback state, matching diagnostics,
  and company suggestions no longer leak into the root technical buckets.
  Dashboard-only keyboard navigation, desktop notifications, posting-risk
  interpretation, and job URL validation also live under their feature owner.
  Resume analysis scoring is shared only within the Resume domain. Cover-letter
  template processing is private to Applications. The unused root error-helper
  family is deleted, while its privacy checks now apply to any frontend
  TypeScript owner instead of one hardcoded file. Dashboard owns its debounce
  hook directly, and the unused root hooks barrel is gone. App bootstrap owns
  its web-vitals implementation, and the modal primitive owns its body-scroll
  locking implementation under `src/ui/`. The app-only keyboard provider,
  context, hook, shortcut model, and formatter share one private owner under
  `src/app/keyboard/`. App onboarding owns the tour state and overlay, while
  Dashboard receives the app-composed tour action through an optional visual
  slot instead of importing app internals. The unused announcer provider family
  and its permanently empty live regions are deleted rather than relocated.
  Failure-tolerant browser storage is a named cross-feature contract under
  `src/shared/` instead of a root utility. Theme persistence and document
  effects belong to the app provider, while the theme context and hook form a
  small shared UI contract. Toast timers and rendering belong to the app
  provider, while features consume a small typed notification contract under
  `src/shared/toast/`. Undo stacks and global keyboard handling belong to the
  app provider, while Dashboard and Applications consume the typed shared Undo
  contract directly. Error Reporting initialization belongs to the app
  provider, while the typed context, hook, validated local reporter, and
  sanitization contract belong to `src/shared/errorReporting/`. The legacy root
  `contexts` and `hooks` buckets are deleted. Cross-feature error messages,
  sanitized development logging, and safe toast copy also live under the same
  shared Error Reporting owner instead of the root utilities bucket.
- Shared contact-field validation now lives under `src/shared/validation/`.
  Application Assist owns its required-field rules, and Settings credentials
  own notification connection-link validation. Six test-only compatibility
  validators were deleted with the mixed root form-validation utility.
- Shared date, currency, source guidance, and safe browser downloads have named
  `src/shared/` owners. Dashboard owns job display and CSV export; Settings owns
  private backups. The root `src/utils/` bucket is deleted.
- Settings company-preference field names changed. Read-only deserialize aliases
  preserve existing local values, and all newly saved data uses the new names.
  No privacy, credential, consent, or external-side-effect boundary changed.

## Handoff

- Current state: repo-wide structure audited; target ownership and migration
  order documented; privacy is the immutable product boundary; Milestones 0
  and 1 are complete; Milestone 2 has app, Salary, Hiring Trends, Application
  Assist, Applications tracking, first-run Onboarding, Dashboard job discovery,
  Resume library, builder and matching, Settings, and Search Links ownership
  established with passing focused, full frontend, build, repository, and E2E
  checks. The reusable UI boundary is established with passing focused, full
  frontend, build, repository, and E2E checks. The latest Settings-private
  component move has passing focused, full frontend, build, repository, and E2E
  checks. App-shell and Dashboard-private recovery ownership has the same
  passing evidence. The latest Settings hook, service, and utility move has
  passing focused, full frontend, build, repository, and E2E checks. The latest
  Dashboard-private hook and utility move has the same passing evidence.
  Error Reporting ownership, root contexts and hooks deletion, shared Tauri,
  location, source-recommendation, source-guidance, contact-field, date, and
  currency, and browser-download contracts; feature-private form, job display,
  CSV, and backup-file behavior; and root utility deletion all have passing
  focused, full frontend, build, repository, and E2E evidence.
- Evidence: live manifests, imports, file counts, module graph, SQLx migration
  paths, CI, release scripts, harness sensors, Tamworth, and persona were
  inspected on 2026-07-13.
- Next step: audit the remaining domain `components`, `services`, and `utils`
  buckets for proven private feature ownership or real multi-consumer
  contracts. Reduce `shared` ownership only from that evidence.
- Open risks: final SQLx offline metadata location and root Cargo target paths
  must be proven in isolated workspace and release fixtures before old paths are
  removed.
