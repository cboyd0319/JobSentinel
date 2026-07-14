# Repository Refactor Blueprint

Last updated: 2026-07-14. Locked by the planning milestone. Later changes require
measured evidence and an entry in the active plan's decision log.

## Baseline Evidence

The baseline is commit `c644995d` on `refactor/full-repo-v2.9.5`.

| Surface | Observed shape |
| ------- | -------------- |
| Rust workspace | Two explicit members: `jobsentinel-core` and Tauri |
| Core | 412 tracked files and 45 direct dependencies in one crate |
| Desktop adapter | 64 tracked files, direct SQL, provider HTTP, startup, tray, and scheduling |
| Frontend | 644 tracked files across app, features, shared, UI, mocks, test, and types |
| Tooling | 210 tracked scripts, including 22 files directly under `scripts/` |
| Documentation | 178 tracked files with architecture split across `architecture/` and `developer/` |
| IPC | 207 default and 4 feature-gated registrations; production consumption and registration are not symmetric |
| Storage leakage | Public pool access and direct pool consumers outside the database owner |
| Runtime dependencies | SQLx, HTTP, browser automation, keyring, SMTP, document, and model stacks share one crate |

These counts describe the starting point. They are not permanent acceptance
numbers and must not be copied into lasting architecture documentation.

## Final Top-Level Layout

```text
crates/             Rust libraries with explicit workspace membership
src-tauri/          desktop entrypoint, IPC adapters, tray, and Tauri policy
src/                React application, product features, shared code, and UI
tests/e2e/          user-journey desktop-renderer contract tests
scripts/            checks, harness, development, platform, release, and tests
docs/               product, engineering, security, plans, research, and releases
skills/             distributable JobSentinel agent skills
examples/           reviewed, non-sensitive example inputs
resources/          runtime-owned static data
validation/         machine-readable repository policy contracts
public/             renderer assets copied by Vite
.github/             ownership, dependency automation, and blocking workflows
.storybook/          UI component development and accessibility configuration
.sqlx/               checked-in SQLx offline metadata
```

Root files remain only when they are ecosystem entrypoints, repository policy,
or public project contracts. Generated build outputs remain ignored. Required
Tauri schemas and bundle icons stay under `src-tauri/`; no new icon abstraction
or platform-specific icon framework is introduced.

## Rust Dependency Direction

Allowed internal dependencies are exhaustive. Standard-library and external
dependencies are selected per owner. A crate may omit an allowed edge.

| Crate | Owns | Allowed internal dependencies |
| ----- | ---- | ----------------------------- |
| `jobsentinel-security` | Redaction, sensitive values, privacy categories, pure URL and data validation | None |
| `jobsentinel-domain` | Serialized business models, identifiers, job normalization, hashes, settings value types | `security` |
| `jobsentinel-network` | DNS-safe outbound requests, HTTP limits, redirect policy, shared transport | `security` |
| `jobsentinel-platform` | OS paths, database-key retrieval and creation, keyring adapters, local authentication, target-gated behavior | `security` |
| `jobsentinel-storage` | SQLCipher connection, migrations, backup, integrity, transactions, repositories | `domain`, `security` |
| `jobsentinel-credentials` | Credential service, passphrase lifecycle, encrypted vault orchestration | `security`, `platform`, `storage` |
| `jobsentinel-sources` | Job-source adapters, imports, rate limits, source health, network location lookup | `domain`, `security`, `network` |
| `jobsentinel-documents` | Resume and cover-letter parse, analyze, build, render, and export | `domain`, `security` |
| `jobsentinel-intelligence` | Job scoring, salary, market, ghost detection, and ranking rules | `domain` |
| `jobsentinel-local-ai` | Optional local model manifests, approved download, loading, inference, and evaluation | `domain`, `security`, `network` |
| `jobsentinel-assistance` | ATS detection, browser assistance, answer learning, bookmarklet, deep links, workbench | `domain`, `security`, `network`, `documents` |
| `jobsentinel-ai` | Reviewed external-AI requests, provider selection, payload policy, transport | `domain`, `security`, `network` |
| `jobsentinel-notifications` | Explicit email and webhook sends plus channel validation | `domain`, `security`, `network` |
| `jobsentinel-application` | Configuration, use cases, scheduling, health aggregation, startup, and composition | All crates above |

The desktop crate depends on `jobsentinel-application` only for product behavior.
Tauri libraries and desktop-only platform APIs remain direct desktop
dependencies. It does not depend on SQLx, reqwest, keyring, Chromium, model,
document, or notification provider crates.

The desktop does not initialize a second secure-storage plugin. Credential and
database-key operations use the platform and credential owners through the
application facade.

`jobsentinel-application` is a composition boundary, not a replacement monolith.
It contains feature-oriented use cases and exposes narrow typed request and
response APIs. It owns no SQL, provider transport, file parser, browser driver,
keyring implementation, model runtime, or Tauri type.

## Rust Move Map

| Current owner | Final owner and split |
| ------------- | --------------------- |
| `job`, `job_hash`, `normalization`, pure config values | `domain` |
| `url_security`, logging sanitizers, secret-safe values | pure policy to `security`; DNS and body reads to `network` |
| `platforms` | `platform` |
| `db`, migrations, SQL from all feature modules | `storage` repositories grouped by business aggregate |
| `credentials`, secret-vault SQL, credential keyring calls | `credentials`, using `storage` and `platform` facades |
| `scrapers`, source URLs, source imports, source smoke checks, `geo` HTTP | `sources` |
| Resume parsing, ATS analysis, templates, rendering, export | `documents`; persistence moves to `storage` |
| ATS tracking, reminders, interviews | models to `domain`, persistence to `storage`, use cases to `application` |
| Browser automation, answer learning, workbench, bookmarklet, deep links | `assistance`; persistence moves to `storage` |
| Scoring, salary, market, and ghost logic | `intelligence`; queries and snapshots move to `storage` |
| `ml` | `local-ai`, with heavy dependencies behind its embedded feature and downloads through `network` |
| Tauri external-AI provider and policy | `ai`; credential retrieval is composed by `application` |
| `notify` | `notifications`; preferences persist through `storage` |
| Config file I/O, scheduler, cross-owner import, aggregate health | `application` |
| Logging initialization, tray, dialogs, clipboard, window lifecycle | Tauri desktop adapter |

Database-key retrieval and first-run creation belong to `platform`.
`application` obtains the zeroizing key during bootstrap and passes it to
`storage::open`; storage never calls a keyring. Credential-driven database rekey
is orchestrated through a bounded storage operation that owns `sqlcipher_export`
and rollback. The key is never logged, serialized, or exposed through IPC.

All crate roots use private modules and explicit facade exports. Public APIs may
not expose `SqlitePool`, SQLx row types, reqwest types, keyring types, Tauri
types, Chromium types, or provider-specific response types.

## Storage Cutover

Storage is the first source milestone because it controls the highest-risk
coupling and user data.

1. Snapshot the current schema, migrations, SQLx metadata, encryption setup,
   backup behavior, integrity checks, and every pool consumer.
2. Introduce security, domain, platform, and storage without changing the
   database path, key bytes, SQLCipher settings, migration identifiers, or
   schema. Application bootstrap retrieves the existing platform key before
   storage opens the database.
3. Move migrations unchanged first. Verify an existing encrypted database copy
   opens unchanged across the cutover, plus new databases, key permission errors,
   interrupted recovery, backup creation, foreign keys, FTS, and integrity.
4. Move SQL by aggregate into private repositories. Prefer concrete repository
   methods; add a trait only at a real adapter or test boundary.
5. Replace every raw pool consumer with an application use case. Keep
   transactions inside storage and return domain or application types.
6. Remove `Database::pool`, direct SQLx dependencies outside storage, and stale
   SQLx path assumptions only after the boundary tests pass.

No milestone may rename the live database or silently start a new one. Schema
changes require additive forward migrations and verified restore behavior.

Before the first source move, replace path-specific architecture checks with a
workspace-metadata sensor for allowed crate edges and technology owners. Wire it
into `harness:check` and CI. Legacy checks must fail with a missing-owner error,
not pass because `jobsentinel-core` disappeared. Every milestone updates the
allowed graph and path rules atomically with the move.

Milestone 2 records Linux CI, macOS-host, and Windows-runner compile evidence for
default and all-feature configurations. Platform code cannot move on Linux-only
evidence. Later milestones rerun the affected platform matrix.

## Desktop And IPC Layout

```text
src-tauri/src/
  main.rs             process entrypoint only
  lib.rs              desktop library entrypoint
  bootstrap/          Tauri builder, managed state, startup, shutdown
  ipc/                typed command adapters grouped by product feature
  desktop/            tray, windows, dialogs, clipboard, notifications
  policy/             Tauri permissions, CSP-facing and path-safe adapters
```

IPC adapters validate transport inputs, call one application use case, translate
typed errors, and return typed responses. They contain no SQL, HTTP provider,
credential, scheduler, parser, scoring, or browser workflow logic.

One registration surface remains authoritative. The IPC sensor parses that
surface plus literal and generated frontend invokes, fails in both directions,
understands feature-gated registrations, and supports a small reviewed list of
desktop-only commands. Disabled LinkedIn
credential commands and other unconsumed registrations are deleted. `#[path]`
module redirections are removed.

Startup construction, config loading, credential migration, database opening,
scheduler creation, and service wiring move behind the application bootstrap.
Tray and window callbacks remain desktop-owned.

## Frontend Layout

```text
src/
  app/                bootstrap, routing, providers, navigation, composition
  features/           product behavior, public feature entrypoints, local tests
  shared/             proven multi-feature pure contracts and utilities
  ui/                 feature-neutral accessible components and design tokens
  platform/           typed Tauri client, browser storage, downloads, environment
  dev-runtime/        environment-gated browser IPC simulator for E2E and previews
  test-support/       Vitest setup, shared mocks, factories, and render helpers
  main.tsx
  index.css
```

`dev-runtime` is dynamically imported only in development and owns the mock IPC
registry and state used by `dev:mock`, Playwright, and screenshot generation.
Feature-owned mock behavior moves under matching dev-runtime modules. It is
excluded from production bundles by an enforced environment gate. Test support
may import it, but production features may not.

Current feature directories remain only when they represent a user-facing
owner. Shared taxonomies, scoring, company, source, and assistance logic move to
their feature unless at least two independent features consume the same
contract. `src/types`, `src/mocks`, and `src/test` are removed after their files
move. `src/ui` remains a distinct dependency layer and cannot import product
features. Feature-to-feature imports are forbidden; `app` composes features.

`App.tsx` becomes a thin router and shell. Routes own lazy loading and route
state. Direct `invoke` calls are replaced by the typed platform client. Tests
remain beside the behavior they prove; reusable test-only code lives in
`test-support`, never a production import path.

## Tests And Fixtures

- Rust unit tests stay beside private modules. Integration and public contract
  tests live in each crate's `tests/` directory and use behavior names.
- Nested `tests/tests`, cap-driven `more.rs`, and broad catch-all test files are
  replaced with aggregate or behavior owners.
- Storage tests use isolated encrypted databases and the real migration chain.
  Default tests never touch a live user database, system keyring, network, or
  external provider.
- Frontend unit and component tests stay colocated. E2E tests under `tests/e2e`
  are organized by user journey with shared page objects and privacy-safe data.
- Fixtures have one canonical owner. Copies are generated only during a test and
  are never committed as alternate sources of truth.
- UI stories stay beside `src/ui` components. Root `.storybook/` remains the
  Storybook tool entrypoint, and its build plus accessibility checks stay gated.

## Scripts, Workflows, And Development Ports

```text
scripts/
  checks/             architecture, dependencies, content, repository, security
  harness/            plan, session, score, composition, and evidence helpers
  dev/                doctor, E2E launcher, screenshot, and local setup tools
  platform/           platform build and package helpers
  release/            release-only validation, SBOM, and public verification
  tests/              directories mirroring the script owners above
  lib/                helpers with at least two real consumers
```

Root-level scripts move to an owner. The overlapping `dependency`, `security`,
and `checks` helpers consolidate without forwarding files. `package.json`, CI,
release workflows, docs, and tests call the final paths directly.

One cross-platform development launcher owns port selection for Vite, Tauri,
Playwright, and screenshot tooling. It selects an available loopback port,
passes the same URL to every child, verifies process identity before reuse, and
never accepts a different app because a common port responds. An explicit
environment override remains for automation. Ephemeral port/config state stays
outside tracked files and is cleaned on exit.

CI calls the same checked-in commands used locally. The focused harness blocks
on repository architecture, bidirectional IPC, all-path file caps, generated
artifacts, language, privacy, security, and feature-matrix checks. Release CI
adds packaging and public-asset gates rather than replacing normal CI.

Local model downloads are explicit user actions, send no user content, use the
shared outbound policy, accept only locked HTTPS model sources and revisions,
and verify pinned checksums before activation. The local-AI crate cannot use a
second unmanaged HTTP client.

Browser navigation and SMTP are intentional non-HTTP transports owned only by
`assistance` and `notifications`. URLs and endpoints pass shared security policy
before those owners act, and neither transport may send private data without the
existing user-directed review or configuration gate.

The bookmarklet listener remains in `assistance` as the only inbound server. It
binds only loopback, validates the exact host, port, origin, token, route, size,
and job URL, keeps pending data memory-only, and requires explicit review before
storage. Those controls receive contract tests before the move.

## Documentation And Repository Support

- `docs/developer/` becomes the single engineering home; the separate
  `docs/architecture/` content merges there by topic.
- `docs/features/` documents shipped behavior and privacy boundaries;
  `docs/user/` contains user tasks; `docs/design/` contains the locked visual
  system; `docs/security/` contains threat and control contracts.
- `docs/harness/` owns current sensors and durable evidence. Date-bound audits
  and superseded evidence move to its archive or are deleted when redundant.
- `docs/plans/` retains compact active state, useful completed decisions, and
  pruned archives. Historical size does not justify keeping duplicate guidance.
- `docs/releases/` retains release history and one current readiness document.
  It never describes an uncut version as published.
- Root README, design, privacy, security, responsible-AI, conduct, changelog,
  roadmap, license, and agent entrypoints remain concise maps to canonical docs.
- `examples`, `resources`, `skills`, and `validation` keep explicit owners,
  schema or contract checks, and privacy-safe content. Unused examples or data
  are deleted.
- CODEOWNERS, agent wrappers, SQLx paths, package scripts, workflow filters,
  release packaging, docs links, and harness path literals change in the same
  milestone as their owner.

## File And Dependency Policy

The final all-path sensor enforces 500 lines for production and scripts, 800 for
tests, and 700 for maintained documents, with lower byte caps where generated
or data files need separate treatment. Archive and generated exceptions are
explicit, path-scoped, and tested. A file is split by responsibility, never by
numbered parts or names such as `more`.

Workspace dependency versions and package metadata remain centralized. Each
crate declares only used dependencies and inherits workspace lints. Architecture
tests reject undeclared workspace members, wildcard members, forbidden internal
edges, Tauri dependencies outside the desktop crate, SQLx outside storage, and
provider dependencies outside their owners.

## Completion And Change Control

The blueprint is complete only when the final tree matches it, all seven
milestones are committed, evidence is current, the worktree is clean, and the
completion gate passes. macOS, Windows, and Linux gaps remain explicit.

If implementation evidence proves an ownership rule wrong, stop at a passing
milestone. Update this blueprint and the active plan's decision log with the
measured conflict, rejected alternatives, privacy and migration impact, and new
verification. Do not drift the architecture through an incidental code commit.
