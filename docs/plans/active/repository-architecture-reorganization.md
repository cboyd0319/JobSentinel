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
- `crates/jobsentinel-core/src/core/` contains 342 files and more than 109,000 lines.
  `src-tauri/src/lib.rs` publicly exposes `commands`, `core`, and `platforms`,
  while `src-tauri/src/main.rs` contains about 500 lines of startup logic.
- The backend had dependency cycles that required module repair before crate
  extraction. Milestone 3 removed the `db` to `credentials` edge and the
  `job_hash` to scraper-normalization edge without changing persisted data.
- SQLx migrations are compiled with `sqlx::migrate!("./migrations")`, relative
  to the current package. The migrations and `.sqlx` metadata need an explicit
  owner during a workspace migration.
- `validation/file_size_contract.json` covers `src-tauri/src/**/*.rs` but would
  not cover a new root `crates/` directory.
- CI, release packaging, dependency checks, SBOM generation, the doctor, and
  security sensors contain dozens of `src-tauri/Cargo.toml`,
  `Cargo.lock`, `.sqlx`, and `target` assumptions.
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

- `app/` owns startup, providers, routing, navigation, and cross-feature page composition.
- `features/<feature>/` owns its pages, components, hooks, services, models,
  mocks, and tests. Initial slices should follow existing user workflows such
  as job search, applications, resume, hiring trends, pay, setup, settings,
  notifications, external AI, deep links, and support.
- `ui/` contains stable visual primitives with multiple feature consumers.
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

### 0-6. Completed structural milestones

Milestones 0 through 6 are complete:

- Structural sensors and final cap contracts are installed.
- Neutral resource and data ownership is established.
- Frontend feature ownership is migrated.
- Backend ownership cycles are repaired.
- The explicit two-member Cargo workspace and core crate are live.
- The Tauri shell and IPC router are thin and private.
- Script, platform, release, and harness ownership is assigned.

The detailed checklists, acceptance commands, and rollback boundaries live in
[Repository Architecture Milestones 0 Through 6](../archive/repository-architecture-milestones-0-6.md).

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
- [x] Enforce the final 500-line production and script, 800-line test, and
  700-line maintained-document caps after splitting every tracked violation by
  ownership. Keep the larger taxonomy and configuration limits explicit.
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
| 2026-07-13 | Milestone 7 job-import ownership complete | Moved job-link preview, fetching, parsing, pending review state, and database insertion behind the private core import owner. Confirmation now uses a capped, expiring, memory-only identifier and saves the exact reviewed job without refetching; atomic insert preserves an existing saved job if a concurrent save wins. The Tauri adapter is 161 lines with no SQL, fetch, parser, or hashing ownership. Dashboard cache invalidation now makes successful imports visible immediately. The focused import, database, Tauri command, frontend, and 23-flow Dashboard E2E suites pass, as do 2,933 frontend tests, 776 script tests, the full default workspace, all-feature Clippy and test-target compilation, the production build, and repository gates with live keyring access disabled. |
| 2026-07-13 | Milestone 7 notification ownership complete | Made all five notification provider modules private behind the typed service facade and retained only the Slack and email validators used by Tauri commands. Deleted unused Discord, Teams, and Telegram network test-message APIs while preserving provider send-path URL checks, pinned resolution, sanitized failures, credential isolation, and local match-detail copy. The full default workspace, 440 focused notification tests, 12 Tauri configuration tests, all-feature Clippy, all-feature test-target compilation, all 775 script tests, and repository gates pass with live keyring access disabled. |
| 2026-07-13 | Milestone 7 resume ownership complete | Made all ten resume implementation leaves private behind the typed resume facade and removed the unused internal JSON parser export. Deleted the unused parser status and section-extraction paths, then routed PDF extension and path-safety tests through the real parser entrypoint. The full default workspace, 393 focused resume tests, 11 Tauri resume-command tests, all-feature Clippy, all-feature test-target compilation, all 775 script tests, and the architecture gate pass with live keyring access disabled. |
| 2026-07-13 | Milestone 7 scraper ownership complete | Made the scraper owner and all implementation leaves private, replaced cross-owner leaf imports with one flat internal facade, and moved scraper construction and opt-in live checks under their source owner. Deleted the unused response cache, cached HTTP wrappers, compatibility constructor, parallel helper, stale error surface, and obsolete cache guide. The full default workspace passed with live keyring access disabled; all-feature Clippy and test-target compilation, 775 script tests, documentation lint, language, architecture, and harness gates also passed. |
| 2026-07-13 | Milestone 7 sensitive Rust leaf facades complete | Made credential and application-assistance implementation modules private behind flat facades, split plaintext credential migration into its own owner, made the legacy OS credential adapter private, and deleted its duplicate status path plus two test-only vault methods from production. The full workspace, all-feature targets, both Clippy modes, 774 script tests, security sensors, and focused noninteractive credential checks pass without a Keychain prompt. |
| 2026-07-13 | Milestone 7 Rust facade and target cleanup complete | Replaced the wildcard core facade and 67 root compatibility re-exports with an explicit crate boundary, moved the database edge-case tests under their real integration target, removed the unused direct `dotenvy` dependency, and replaced an all-feature local-path reach-through with a path-private model diagnostic API. The default workspace suite, default and all-feature Clippy, every all-feature test target build, 773 script tests, and all focused repository gates pass. |
| 2026-07-13 | Milestone 7 Rust lint ownership complete | Moved active Clippy exceptions into the inherited root workspace policy, removed four redundant crate-level exceptions, and added a regression sensor that rejects member-owned crate-root policy. The full 772-test script harness, 184 Tauri tests, workspace Clippy, formatting, architecture, language, duplication, bloat, and harness gates pass. |
| 2026-07-13 | Milestone 7 file-cap cutover complete | Split every remaining oversized production, test, script, and maintained-document owner. Policy sensors now follow private Rust modules and documentation sidecars. The final cap gate, 771 script tests, 2,769 core tests, 184 Tauri tests, 280 focused frontend tests, production build, workspace Clippy, docs, architecture, language, and 100/100 harness score all pass. |
| 2026-07-13 | Milestones 3, 4, and 5 complete | Broke the database, credential, job-record, and normalization cycles, then created the two-member virtual Cargo workspace and extracted the Tauri-free core owner. Root Cargo policy, migrations, SQLx metadata, integration tests, CI, packaging paths, dependency checks, and security sensors now follow the new owner. The Tauri executable is a 5-line entrypoint, command modules are private, and one explicit registry retains all IPC names. The 769-test script harness, Cargo metadata, formatting, workspace Clippy, cargo-deny, fresh migration and SQLx checks, 184 app tests, 2,769 core unit tests, and every moved integration suite pass. |
| 2026-07-13 | Milestone 6 complete | Moved platform and release implementations to owned directories, split all five oversized policy entrypoints under `scripts/checks/`, deleted root compatibility files, and replaced fixed test globs with recursive sorted discovery. All 770 script tests plus focused harness, bloat, dependency, security, and IPC gates pass. |
| 2026-07-13 | Milestone 2 complete | Completed frontend ownership with a 32-line development command facade, 183-line explicit registry, 202-line state adapter layer, 244-line persisted-state owner, and feature-owned command behavior. Split the 1,127-line root test by owner and updated privacy, IPC, source, and command-completeness sensors to follow the new boundaries. All 2,931 frontend tests across 209 files, 766 script tests, the production build, and TypeScript, ESLint, architecture, bloat, security, language, duplication, and test-quality gates pass. |
| 2026-07-13 | Milestone 2 in progress | Split the mixed user-data development mock into Applications-owned cover-letter templates, Dashboard-owned saved searches and search history, and Settings-owned notification preferences. Moved normalization and direct command tests with each owner, retained backend command names and persisted development state, and deleted the 389-line mixed handler plus 303-line mixed normalizer. All 16 focused tests, 2,920 frontend tests across 200 files, the 820-module build, TypeScript, ESLint, architecture, bloat, duplication, and test-quality gates pass. |
| 2026-07-13 | Milestone 2 in progress | Moved the four-consumer Score Display visual, tests, and stories into `src/ui/score-display/`. Extracted validated score-reason parsing into a private 111-line module and reduced the visual to 416 lines. Copy, thresholds, keyboard behavior, and renderer-safe parsing are unchanged; policy sensors follow both owners. All 162 focused frontend tests, 54 focused sensor tests, 2,933 frontend tests across 194 files, 766 script tests, the 816-module build, repository gates, and 19 Dashboard and Resume E2E flows pass. Only the company research family remains in the root components bucket. |
| 2026-07-13 | Milestone 2 in progress | Deleted the root `src/utils/` bucket after assigning safe browser downloads, Dashboard CSV, and Settings backups to real owners. Then established `src/features/linkedin-workbench/` with a public visual facade and private consent, transport, and learning modules. App composition supplies the workbench to Dashboard and Settings without feature-to-feature imports. The LinkedIn cut passed 62 focused frontend tests, 2,933 frontend tests across 192 files, 766 script tests, the production build, repository gates, and all 16 Settings E2E flows. Credential redaction, formula neutralization, URL sanitization, explicit review, and local-only behavior are unchanged. |
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
| 2026-07-13 | Milestone 2 in progress | Deleted the root services bucket. Sanitized support-report generation is shared by app, Dashboard, and Settings recovery; feedback commands and readable previews are private to Settings. The external-AI privacy boundary now exposes only its cross-feature types, payload policy, backend transport, and bounded local request log from `src/shared/externalAi/`; gateway, prompt inspection, and validation modules are private. Removed the unused Google Drive command, reducing the backend surface to 207 commands. All 157 focused support tests, 28 focused external-AI tests, 40 feedback policy tests, 54 Rust feedback tests, 2,933 frontend tests across 194 files, 766 script tests, the production build, repository gates, and 31 app-shell and Settings E2E flows pass. |
| 2026-07-13 | Milestone 2 in progress | Assigned app-only command, keyboard-help, recovery, and tour-configuration modules to private subdirectories under `src/app/`. Assigned Dashboard-only component and modal recovery boundaries to `src/features/dashboard/errors/`. Privacy-logging and plain-language recovery sensors now follow the owners. The mixed App and Dashboard onboarding tour remains unchanged until composition evidence supports a clean split. Focused and full frontend tests, all 766 script tests, the 808-module build, lint, architecture, security, bloat, and 35 focused app-shell and keyboard E2E flows pass. |
| 2026-07-13 | Milestone 2 in progress | Established `src/features/settings/` as the owner for Settings, search preferences, source setup, notifications, secure credentials, external AI, matching controls, backup, support, and Browser Import UI. App composition supplies the Settings page as a component without a Dashboard-to-Settings implementation import. Production Settings files are 494 lines or fewer. Existing local company preferences survive the terminology and serialized-field cutover through read-only aliases, while new data uses precise preferred, blocked, included, and excluded names. The complete Google developer documentation style guide now has a maintained 70-page source map and review matrix; Apple-specific language remains governed by the complete Apple Style Guide. A repository language sensor enforces deterministic prohibited terms in prose and code, and release preparation now includes Google's inclusive open-source check. Playwright and Browser Import now recover from occupied default ports with operating-system-selected loopback ports; Browser Import persists its actual port and requires a fresh copied browser button. Full frontend, script, Rust, docs, lint, architecture, security, bloat, duplication, build, and focused Settings E2E gates pass. |
| 2026-07-13 | Milestone 2 in progress | Moved the app composition root and navigation into `src/app/`, then completed vertical feature slices under `src/features/salary/`, `src/features/market/`, `src/features/application-assist/`, `src/features/applications/`, `src/features/onboarding/`, `src/features/dashboard/`, and `src/features/resumes/`. Pages, models, private components, tests, and development mocks now follow feature ownership. Resume library, builder, and matching remain one domain owner with three public pages and private workflow modules. The former 696-line Salary page, 679-line Market page, 693-line Dashboard page, 691-line Dashboard job-operations hook, and 682-line Job Card were split at real behavior boundaries. Application Assist controllers are 488 lines or fewer, Applications production modules are 467 lines or fewer, Onboarding production modules are 461 lines or fewer, Dashboard production modules are 496 lines or fewer, and Resume production modules are 495 lines or fewer with tests at 796 lines or fewer. The app composition root imports only public feature facades. Feature copy, schema, broad-audience, IPC minimization, source-quality, source-structure, privacy logging, security, and file-cap sensors follow the new owners. Focused and full frontend tests, all 759 script tests, lint, architecture, the 787-module production build, focused E2E, security sensors, and harness checks pass. |
| 2026-07-13 | Milestone 1 complete | Deleted four verified production-orphan component families, moved nine cross-runtime taxonomies to `resources/taxonomies/`, consolidated contributor samples under `examples/`, and updated every live consumer and harness path. Full frontend and script suites plus focused Rust consumers pass. |
| 2026-07-13 | Milestone 0 complete | Added fail-first feature, workspace, thin-shell, file-cap, test-quality, harness-planning, CI classification, and ownership sensors. `test:scripts` passed 757 tests; focused architecture, bloat, test-quality, Markdown, and harness checks passed. No production paths moved. |
| 2026-07-13 | Planned | Completed repo-wide inventory, boundary analysis, sibling-pattern comparison, and baseline harness checks. No production paths moved. |

## Discoveries

- The baseline file-size policy passed even though its Rust scope would have
  silently missed a new root `crates/` directory; Milestone 0 closed that gap.
- Final 500-line production and script, 800-line test, and 700-line
  maintained-document caps are the live repository contract. Taxonomy and
  configuration resources retain their explicit larger limits.
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
- App-crate unit tests compile `jobsentinel-core` as a normal dependency, so
  core-only `cfg(test)` credential isolation does not protect an app test that
  calls a production database connector. Setup command tests now inject the
  in-memory database connector explicitly, and live keyring tests remain gated
  by `JOBSENTINEL_LIVE_KEYRING_TESTS=1`.

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
- Sequence remaining cleanup by cross-cutting risk, dependency impact, and
  difficulty. Do not take easy documentation or formatting work ahead of a
  harder structural owner that blocks it.
- Keep icons cross-platform and local to the owning UI. Do not add an SF
  Symbols integration or platform adapter solely for icons.
- Compose Company Research at the app boundary through one shared render
  contract. Keep its local directory and lookup model feature-private, remove
  no-I/O loading and cache machinery, and retain legacy local-cache cleanup.
- Treat v2.9.5 as a readiness target only until release execution is explicitly
  authorized.
- Keep the default workspace test path free of operating-system credential
  prompts. Credential-store round trips remain explicit live tests.

## Outcomes

- Milestones 0 through 6 are complete. Detailed structural outcomes and
  acceptance evidence are preserved in
  [Repository Architecture Milestones 0 Through 6](../archive/repository-architecture-milestones-0-6.md).
- The final file-cap slice of Milestone 7 is complete. The live contract now
  enforces 500 lines for production and scripts, 800 lines for tests, and 700
  lines for maintained documents. Every tracked violation was split by an
  observed owner, and policy sensors follow the resulting private modules and
  documentation sidecars.
- Rust lint policy is owned once by the root workspace. Member crate roots
  cannot shadow inherited Clippy or `unsafe_code` policy, and four obsolete
  crate-wide exceptions are gone.
- The core crate now has an explicit bounded facade instead of wildcard and
  compatibility exports. Its database edge-case tests belong to one intended
  integration target, its unused direct `dotenvy` edge is gone, and embedded
  model diagnostics no longer require access to private cache paths.
- Credential and application-assistance implementation modules are private
  behind flat facades. Plaintext credential migration has one file owner, and
  the legacy OS credential adapter can no longer be called across the crate
  boundary. Noninteractive vault and migration tests preserve the privacy and
  data-cleanup contract without prompting for Keychain access.
- Notification provider implementations are private behind their typed service
  owner. Tauri commands use the two required flat validation APIs, and three
  unused network test-message paths are gone without weakening outbound URL,
  DNS, redaction, credential, or local-detail protections.
- The cap slice passes the complete 771-test script harness, 2,769 core tests,
  184 Tauri tests, 280 focused frontend tests, the production frontend build,
  workspace Clippy, docs, architecture, language, bloat, and 100/100 harness
  score gates. Default tests did not access the operating-system credential
  store.
- Milestone 7 remains open for the orphan, dependency, root-file, stale-path,
  documentation, wiki, and cross-platform cleanup audits. Milestone 8 remains
  blocked on completion of that cleanup and explicit release readiness work.

## Handoff

- Current state: Milestones 0 through 6 plus the Milestone 7 file-cap, Rust
  lint-policy, facade, target, sensitive leaf-module, scraper, resume, and
  notification slices are complete with passing evidence. The core-owned
  job-import slice is also complete. Privacy remains immutable.
- Next step: continue the Rust owner visibility, dead-code, feature, and
  dependency audit before moving to easier cleanup surfaces.
- Open risks: Windows and Linux platform builds still require their final live
  release-readiness hosts. Current cross-platform evidence is contract and
  release-fixture coverage plus target-gated manifests; macOS is live-checked.
