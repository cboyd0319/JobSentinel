# Repository Architecture

## Scale Contract

Treat JobSentinel as capable of growing to 2,000,000 lines and 50,000 files.
Create a unit only when real code has a cohesive product or domain owner. Do not
create empty layers, but do not let new code spread outside the approved roots.

`scripts/harness/contracts/architecture.json` owns the Rust workspace
graph, technology ownership, and retired paths. `scripts/harness/contracts/repository-structure.json`
owns approved source roots, public entrypoints, TypeScript projects, generated
isolation, and source-size ratchets. This document is their human projection.
`npm run lint:architecture` and `npm run lint:file-size` enforce both locally.
Hosted CI is absent
under the named `pre-alpha-private-no-ci` user exception in
`scripts/harness/contracts/harness.json`; the canonical skill does not define that exception.

## Repository Shape

```text
src/                         React application unit
src-tauri/                   Tauri desktop adapter and deployable Rust unit
crates/jobsentinel-application/ application use cases and orchestration
crates/jobsentinel-ai/       reviewed external-AI policy and transport
crates/jobsentinel-assistance/ visible browser assistance and deep links
crates/jobsentinel-credentials/ credential lifecycle and encrypted vault
crates/jobsentinel-documents/ canonical resume model, parsing, analysis, and rendering
crates/jobsentinel-domain/   serialized business values and normalization
crates/jobsentinel-intelligence/ pure scoring and posting-quality analysis
crates/jobsentinel-local-ai/ optional governed local model runtime and model lock
crates/jobsentinel-network/  outbound target and bounded-body policy
crates/jobsentinel-notifications/ explicit alert-channel delivery
crates/jobsentinel-platform/ OS paths, file permissions, and device keys
crates/jobsentinel-security/ redaction, untrusted-input, and prompt-injection policy
crates/jobsentinel-sources/  job-page parsing and explicit-user lookups
crates/jobsentinel-storage/  SQLCipher, migrations, backup, and repositories
scripts/                     repository-owned tooling
tests/                       cross-unit and runtime journeys
docs/                        detailed product and engineering documentation
skills/                      independently distributable JobSentinel skills
resources/                   owned application data
public/                      static application assets
```

Generated dependency, cache, and build roots are isolated and declared in the
policy. Root files are limited to workspace manifests, lockfiles, public project
contracts, launchers, and unavoidable tool configuration.

## Unit Owners And Public Entrypoints

| Unit | Manifest | Public entrypoint | Responsibility |
| --- | --- | --- | --- |
| Web application | `package.json` | `src/main.tsx` | React composition and feature UI |
| Desktop application | `src-tauri/Cargo.toml` | `src-tauri/src/main.rs` | Tauri wiring and native adapters |
| Application | `crates/jobsentinel-application/Cargo.toml` | `crates/jobsentinel-application/src/lib.rs` | user-reviewed import and application orchestration |
| External AI | `crates/jobsentinel-ai/Cargo.toml` | `crates/jobsentinel-ai/src/lib.rs` | reviewed provider-neutral requests and bounded transport |
| Assistance | `crates/jobsentinel-assistance/Cargo.toml` | `crates/jobsentinel-assistance/src/lib.rs` | visible browser preparation, bookmarklet, and deep links |
| Credentials | `crates/jobsentinel-credentials/Cargo.toml` | `crates/jobsentinel-credentials/src/lib.rs` | validation, encrypted vault, and secret lifecycle |
| Documents | `crates/jobsentinel-documents/Cargo.toml` | `crates/jobsentinel-documents/src/lib.rs` | canonical structured resume, parsing, analysis, templates, and export |
| Domain | `crates/jobsentinel-domain/Cargo.toml` | `crates/jobsentinel-domain/src/lib.rs` | job values, hashes, and normalization |
| Intelligence | `crates/jobsentinel-intelligence/Cargo.toml` | `crates/jobsentinel-intelligence/src/lib.rs` | pure posting-quality rules |
| Local AI | `crates/jobsentinel-local-ai/Cargo.toml` | `crates/jobsentinel-local-ai/src/lib.rs` | optional governed model loading and inference |
| Network | `crates/jobsentinel-network/Cargo.toml` | `crates/jobsentinel-network/src/lib.rs` | DNS-safe outbound targets and bounded response bodies |
| Notifications | `crates/jobsentinel-notifications/Cargo.toml` | `crates/jobsentinel-notifications/src/lib.rs` | approved email and webhook delivery |
| Platform | `crates/jobsentinel-platform/Cargo.toml` | `crates/jobsentinel-platform/src/lib.rs` | native paths, private file policy, and database-key retrieval |
| Security | `crates/jobsentinel-security/Cargo.toml` | `crates/jobsentinel-security/src/lib.rs` | redaction, external URL, and untrusted prompt-injection policy |
| Sources | `crates/jobsentinel-sources/Cargo.toml` | `crates/jobsentinel-sources/src/lib.rs` | Schema.org parsing and explicit-user external lookups |
| Storage | `crates/jobsentinel-storage/Cargo.toml` | `crates/jobsentinel-storage/src/lib.rs` | SQLCipher connection, migrations, integrity, backup, and job repositories |
| Repository tooling | `package.json` | named `package.json` scripts | checks, setup, release, and verification |

Frontend implementation uses `app`, `features`, `platform`, `shared`, and `ui`
boundaries. Feature units do not import other feature internals; composition
belongs in `app`. Shared and UI code cannot depend on product features.

The Rust workspace is virtual, explicit, and acyclic. The desktop depends only
on `jobsentinel-application` for product behavior. Application composes the
bounded owner crates. SQLx belongs only to storage, reqwest only to network,
keyring only to platform, browser automation only to assistance, and Tauri only
to the desktop. Consumers use public crate APIs, never another unit's private
source paths. The exhaustive graph and technology owners are enforced from
`scripts/harness/contracts/architecture.json`.

## Hard Source Limits

Every hand-authored source or configuration file enters modularization review
above 300 physical lines or 32,768 bytes. It fails above 500 physical lines or
65,536 bytes unless `scripts/harness/contracts/repository-structure.json` contains an exact,
temporary ratchet with the affected rule, owner, reason, measured ceiling,
approval date, and retirement condition. Blank and comment lines count.

Generated, vendored, and lock exclusions must be exact files or directories
with a category, owner, and reason. Migrations, fixtures, snapshots, workflows,
scripts, and tests remain governed unless proven generated.

Split files by cohesive responsibility and public contract. Numbered fragments,
continuation files, and unbounded `utils`, `helpers`, or `common` buckets are not
modularization.

## Verification

- Fast structure gate: `npm run lint:architecture && npm run lint:file-size`
- Focused contract fixtures: `npm run test:scripts`
- Full graph and behavior gate: `npm run verify:full`
- Runtime journey: `npm run test:e2e:smoke`
- Native portability evidence: run the shared local cores on Windows 11 and
  macOS 26+ and record the actual host and result

There is no authoritative shared-history gate while the named exception is
active. Local hooks provide bypassable feedback, not proof that a push is safe.
Windows and macOS wrappers remain thin adapters over the same Node semantic
implementations.

## Change Rules

- Update this owner and its executable policy in the same change.
- Keep generated output, dependencies, and build artifacts outside source roots.
- Add a unit only for a measured ownership or dependency seam.
- Remove a temporary exception in the same change that removes its cause.
- Record command, exit status, relevant result, platform, and caveat as evidence.
