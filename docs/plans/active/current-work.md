# Full Repository Refactor

Last updated: 2026-07-16.

## Purpose

Replace JobSentinel's accumulated repository structure with explicit ownership
boundaries that support sustained growth. This is a clean cutover. Internal
module paths, crate APIs, IPC commands, tests, scripts, and documentation do not
need compatibility layers.

The locked ownership and dependency decisions are in the
[repository refactor blueprint](repository-refactor-blueprint.md). The
executable phase, workspace graph, technology owners, target directories,
retiring paths, and modularization ratchets are in
[`validation/repository_architecture_contract.json`](../../../validation/repository_architecture_contract.json).
Changes to either contract require evidence and a new decision-log entry.

## Baseline Problem

At baseline commit `c644995d`, the repository concentrated 412 Rust files under
`jobsentinel-core`, exposed database implementation details to callers, and kept
runtime behavior in Tauri commands. The current tree removes that crate and the
raw dependency escapes. A fresh completion audit found that desktop composition,
frontend platform ownership, development-runtime ownership, and root-script
placement are now cut over. Script tests now mirror their script owners.
Structural debt still does not match the locked blueprint.

## Scope

In scope:

- The entire tracked repository: Rust crates, Tauri, React, tests, fixtures,
  scripts, workflows, configuration, documentation, packaging, and harnesses.
- Clean replacement of obsolete module paths, APIs, IPC commands, compatibility
  wrappers, duplicate fixtures, generated residue, and stale documentation.
- Safe migration of persistent user data when a schema or storage format must
  change.
- Milestone checkpoints after focused verification passes. Commits require
  separate user authorization.

Out of scope:

- New product features unrelated to proving the new architecture.
- Tagging, signing, notarizing, uploading, publishing, or cutting v2.9.5.
- Weakening privacy, security, accessibility, or platform behavior to simplify
  the refactor.

## Invariants

- Rule 0 does not change. User data remains local unless the user explicitly
  configures an external channel. External AI remains optional and disabled by
  default. Secret reads remain action-driven.
- Existing databases and user-owned files receive safe migrations with no
  silent loss. Internal source compatibility is not an invariant.
- Supported platform behavior remains unchanged. Platform-specific validation
  is deferred until implementation and structural cleanup are complete.
- The workspace uses explicit members, inherited package metadata and lint
  policy, deterministic features, and no wildcard member discovery.
- Crates follow independent ownership, dependency, runtime, or security
  boundaries. File size and project size alone never create a crate.
- Crate dependencies remain acyclic. Lower crates never depend on Tauri or the
  application crate.
- Modules come before crates when no independent boundary exists. Crate
  implementation modules remain private behind bounded facades.

## Lean And DRY

Nothing smaller meets the request because database, network, Tauri, frontend,
and harness ownership currently cross repository layers. Reuse Cargo workspaces,
Rust visibility, SQLx migrations, TypeScript aliases, existing dependencies,
and current harness entrypoints. Add no framework or dependency solely for the
move. Delete the old facade and duplicate policy instead of forwarding it.

## Product And Design Contract

The work changes structure, not the product mission. Job-search automation,
plain-language consent, local-first defaults, and non-technical user flows stay
intact.

Locked redesign: Quiet Shield remains the product direction in `DESIGN.md`,
`docs/design/README.md`, and `docs/design/design-spec.md`.

Harness-controlled redesign lock: structural moves must not silently change
visual behavior. Confirm major route screenshots, Computer Use clicks, keyboard
flow, and narrow-width states after frontend or desktop-shell changes.

Scraper/source verification must cover all configured source adapters and
user-gated restricted-source paths before final readiness.

## Milestones

1. Lock this plan and the blueprint, incorporate adversarial review, block
   release execution, pass focused documentation and harness checks, and commit
   only the planning milestone.
2. Keep generic crate-edge and technology-ownership sensors blocking in the
   local harness. Then extract domain,
   security, network, platform, storage, credentials, and application ownership;
   remove raw pool and Tauri SQL access; and preserve encryption, backup,
   integrity, and migration behavior.
3. Extract source, document, assistance, intelligence, local-AI, external-AI,
   and notification owners. Move persistence fragments to storage and keep
   optional heavy dependencies out of the default desktop build.
4. Make Tauri a thin adapter. Delete obsolete IPC, enforce the bidirectional
   command contract, remove path redirections, and separate desktop startup,
   tray, state, and command adapters.
5. Reorganize the frontend by feature ownership. Move misplaced shared domain
   code and test support, delete orphan production files, and preserve all
   interaction and accessibility states.
6. Reorganize tests, fixtures, scripts, release workflows, packaging, docs,
   examples, resources, validation policy, and tracked generated assets. Keep
   local commands on the same architecture sensors.
7. Run the layered completion gate, clean ignored and generated residue, update
   repository documentation, and commit a verified v2.9.5 source candidate.
   External publication and release execution remain separate and require
   explicit authorization.

## Milestone Gates

Every milestone requires:

- A scoped pre-change contract and reviewed diff.
- Focused tests for the changed owner, `git diff --check`, language checks when
  text changes, and file-cap checks for every moved path.
- No new dependency cycle, raw storage escape, unreviewed external send, secret
  probe, machine-specific path, unregistered invoke, or unused registration.
- Evidence recorded under `docs/harness/evidence/` before a milestone transitions
  to `passing`.
- A clean index after the commit. Unrelated user changes remain untouched.

Milestone 2 uses separate gated commits for enforcement, foundational crates,
storage/key cutover, and pool removal. It requires database snapshots, migration
tests, SQLx metadata, integrity and restore tests, plus the applicable platform
compile evidence. Milestones 4 and 5 require IPC and affected UI/E2E checks.
Milestones 6 and 7 require the full local and release-readiness checks.

## Acceptance Criteria

- The final tree and dependency graph match the locked blueprint.
- No `jobsentinel-core` crate, forwarding facade, raw database pool escape, SQL
  in Tauri commands, or provider transport in the desktop adapter remains.
- Cargo metadata shows only explicit workspace members and allowed dependency
  edges. Default and all-feature matrices compile and test.
- Every registered IPC command has a deliberate production consumer or a
  documented desktop-only reason, and every production invoke is registered.
- Production, test, script, and maintained-document caps scan all owned paths
  without spot-check exclusions.
- Frontend, Rust, artifact, terminology, security, privacy, migration, and
  platform checks block through the focused and full local harness lanes.
- No tracked or ignored build residue, machine-specific path, obsolete source,
  duplicate fixture, stale architecture claim, or release overclaim remains.

## Sensors

Use the smallest relevant checks for each milestone, then broaden:

```bash
npm run harness:check
npm run lint:file-size
npm run lint:architecture
npm run lint:language
npm run lint
npm run test:run
npm run build
cargo fmt --all -- --check
cargo clippy --workspace -- -D warnings
cargo test --workspace
git diff --check
```

Run SQLx offline, target-specific, E2E, packaging, release-readiness, and manual
UI checks when their owners change.

## Risks And Rollback

- Database extraction can damage encrypted local data or transaction behavior.
  Prove it against isolated copies before deleting the old path.
- Crate extraction can reproduce the monolith through cycles or broad facades.
  Reject the edge or keep the code as a private module until ownership is real.
- IPC deletion can remove a dynamic call. Verify literal, generated, test, and
  desktop-only surfaces before deletion.
- Each milestone is revertible with `git revert`. Never roll back a persistent
  data migration by deleting user data; use a forward repair or verified restore.

## Progress

- [x] Internal and external adversarial repository reviews completed.
- [x] Milestone 1: locked plan committed with passing gates.
- [x] Milestone 2: storage crate boundaries and application-owned desktop
  service construction are implemented.
- [x] Milestone 3: remaining Rust owners implemented and verified.
- [x] Milestone 4: desktop adapter directories and application composition are
  cut over.
- [x] Milestone 5: production desktop API routing and development-runtime
  ownership are cut over.
- [x] Milestone 6: root-level scripts and script-test ownership are cut over.
- [ ] Milestone 7: final whole-repository cleanup and verification remain.

Implemented ownership checkpoint:

- `jobsentinel-security` owns URL policy and path-safe logging labels.
- `jobsentinel-domain` owns `Job`, hashes, and normalization without SQLx.
- `jobsentinel-network` owns DNS-pinned targets and bounded response bodies.
- `jobsentinel-platform` owns native paths, private-file policy, and database
  key retrieval.
- `jobsentinel-storage` owns the unchanged migration chain, SQLCipher
  connection, integrity checks, backup, and job repositories.
- `jobsentinel-intelligence` owns pure posting-quality analysis.
- `jobsentinel-sources`, `jobsentinel-application`, `jobsentinel-assistance`,
  `jobsentinel-local-ai`, `jobsentinel-documents`, `jobsentinel-credentials`,
  `jobsentinel-notifications`, and `jobsentinel-ai` own the remaining target
  domains without a compatibility mega-crate.
- Tauri depends on `jobsentinel-application` for internal product behavior. The
  raw storage-pool escape and provider transport in the desktop adapter are
  removed.
- `jobsentinel-application` owns desktop configuration, storage, credential,
  scheduler, and browser-import service construction. Tauri owns only desktop
  adaptation, event bridging, tray behavior, and window behavior.
- `src/platform/tauri` owns all production renderer imports of desktop command,
  event, and notification APIs through separate thin entrypoints.
  `src/dev-runtime` owns the central mock registry and state, dev-only vitals,
  the environment-gated development loader, and all feature-specific
  simulators. Production bundles contain no development mock-state markers,
  and feature-owned mock directories are rejected by the frontend boundary.
- All executable scripts now live under the declared `checks`, `dev`, `harness`,
  `platform`, or `release` owners. Package commands, initialization launchers,
  release workflows, maintained docs, and tests call those final paths
  directly. The architecture sensor rejects root-level scripts and undeclared
  script owner directories.
- All 95 formerly flat files under `scripts/tests` now live under matching
  `checks`, `dev`, `harness`, `lib`, `platform`, or `release` owners. Recursive
  discovery remains deterministic, path-sensitive policy consumers use the new
  locations, and the architecture sensor rejects flat or undeclared script-test
  owners.
- Focused Rust test modules, frontend and development-runtime tests, script
  tests, and two taxonomy files now stay below the canonical hard ceilings
  without 80 prior no-growth exceptions. Seventeen script-test exceptions moved
  to their owner-mirrored paths without increasing their ceilings, leaving 29
  repository exceptions.
- The earlier full local gate, Chromium and WebKit E2E lane, and Rust
  all-features lane passed for the initial crate cutover. Those results do not
  prove that the full repository blueprint is complete.

## Surprises

- The earlier workspace refactor produced only one reusable Rust crate, while
  Tauri retained direct database and network responsibilities.
- Architecture, source-limit, phase, and modularization checks block through
  the shared local harness core.
- Registered and consumed IPC surfaces differ materially, so command count alone
  is not evidence of an intentional API.

## Decision Log

- 2026-07-14: The user authorized a full clean-cutover repository refactor with
  no internal backward-compatibility requirement.
- 2026-07-14: Privacy and security guarantees remain immutable. Persistent data
  receives safe migrations even though internal APIs do not.
- 2026-07-14: Work is ordered by highest coupling and risk first, beginning with
  database and application ownership.
- 2026-07-14: The plan and blueprint must be committed before source execution.
  Later boundary changes require evidence and a recorded decision.
- 2026-07-14: The user required removal of hosted CI during private pre-alpha
  development. `pre-alpha-private-no-ci` records the resulting nonconforming
  user override, the affected canonical requirements, and its restoration
  triggers.
- 2026-07-14: Adversarial review blocked the first draft on nine concrete gaps.
  The locked revision assigns database keys, early enforcement, platform
  compile gates, runtime mocks, model downloads, Storybook, and the inbound
  listener.
- 2026-07-14-executable-repository-topology: The machine-readable architecture
  contract is the blocking projection of this plan and the blueprint. The
  legacy workspace is exact, migration additions are restricted to locked
  target owners, final dependency edges and technology owners are exhaustive,
  and pre-contract `more.rs`, nested test, and retiring-layout paths are frozen
  as explicit no-growth exceptions.
- 2026-07-15-foundational-rust-owners: Extracted real security, domain,
  network, platform, storage, and intelligence crates without forwarding
  facades. `Job` no longer derives or exposes SQLx. Storage retains an explicit
  platform edge because it must apply the canonical private-file policy to
  databases, sidecars, backups, and encryption-upgrade artifacts; duplicating
  that OS behavior or weakening permissions was rejected. Deleted tracked paths
  are now excluded from live topology enumeration, with a regression test.
- 2026-07-15-complete-ownership-cutover: Completed the target 14-crate ownership
  graph, deleted `jobsentinel-core`, removed the raw storage-pool escape, reduced
  Tauri to an application adapter, and retired obsolete source and support
  paths. The exact local full gate, cross-browser E2E lane, and Rust all-features
  lane passed. Final transition remains withheld because the broader repository
  cleanup is incomplete; hosted CI remains intentionally absent and canonically
  nonconforming under `pre-alpha-private-no-ci`.
- 2026-07-16-completion-audit: Corrected the earlier completion interpretation.
  The crate graph is complete, but the repository blueprint is not. Added
  executable required-path enforcement and moved Tauri startup, IPC, tray,
  state, and plugin policy under their target desktop directories. Remaining
  work stays active and is implementation work, not final validation.
- 2026-07-16-desktop-and-runtime-cutover: Moved desktop service construction
  into `jobsentinel-application`, reduced the Tauri bootstrap to adaptation and
  event bridging, moved the renderer command client to `platform/`, and moved
  the central mock runtime and dev-only vitals to `dev-runtime/`. Added
  executable retired-path, production-import, and development-gate checks.
- 2026-07-16-platform-api-cutover: Routed every production renderer import of
  desktop command, event, and notification APIs through `src/platform/tauri`.
  Added a regression check that rejects new direct production imports.
- 2026-07-16-feature-mock-cutover: Moved all 12 feature-owned mock directories
  under `src/dev-runtime/features`, updated maintained path consumers, and
  added a recursive boundary check that rejects future feature-owned mock
  directories. The production duplication ratchet excludes the non-production
  development runtime, matching the former mock-directory treatment.
- 2026-07-16-root-script-cutover: Moved all 24 root-level scripts under explicit
  owners without forwarding files, updated every maintained caller, and added
  a topology regression that rejects root-level scripts or undeclared script
  directories. The canonical initializer and all 815 script tests passed.
- 2026-07-16-script-test-owner-cutover: Moved all 95 flat script tests and
  fixtures under directories that mirror their script owners, updated
  path-sensitive release and security checks, preserved every no-growth
  file-size ratchet, and added a topology regression that rejects flat or
  undeclared script-test owners. All 817 script tests passed.
- 2026-07-16-first-exception-reduction: Split Teams webhook-validation tests
  into their own notification test module, kept both files below canonical hard
  limits, and removed the obsolete exact-path exception. Notifications Clippy,
  all 390 notification tests, and repository contracts passed.
- 2026-07-16-structural-exception-batch: Split 14 Rust test owners, 10 frontend
  and development-runtime test owners, six script-test owners, and one taxonomy
  file below the canonical hard ceilings. The net exception count fell from 109
  to 78. The full local verification lane passed.
- 2026-07-16-structural-exception-followup: Split three Rust test owners, seven
  frontend and development-runtime test owners, and five script-test owners
  below the canonical hard ceilings. The exception count fell from 78 to 63.
  Broad verification passed after replacing one parallel storage-test deadlock
  with a successful isolated test and serial Rust workspace run.
- 2026-07-16-structural-exception-second-followup: Split three Rust test owners,
  one development-runtime test owner, and one script-test owner below the
  canonical hard ceilings. Compacted the resume-skills taxonomy without
  changing its parsed data. The exception count fell from 63 to 57. Focused
  verification and the full local repository gate passed.
- 2026-07-16-structural-exception-third-followup: Split two Rust test owners and
  three frontend test owners below the canonical hard ceilings. The exception
  count fell from 57 to 52. Focused and broad verification passed. The parallel
  storage migration test stalled, then passed in isolation and in the complete
  serial Rust workspace.
- 2026-07-16-structural-exception-fourth-followup: Split two Rust test owners,
  two frontend test owners, and one script-test owner below the canonical hard
  ceilings. The exception count fell from 52 to 47. Focused and broad
  verification passed after replacing the stalled parallel storage migration
  test with a successful isolated test and serial Rust workspace run.
- 2026-07-16-structural-exception-fifth-followup: Split five Rust test owners
  below the canonical hard ceilings. The exception count fell from 47 to 42.
  Focused verification and the full local repository gate passed.
- 2026-07-16-structural-exception-sixth-followup: Split five Rust test owners
  below the canonical hard ceilings. The exception count fell from 42 to 37,
  and focused verification and the full local repository gate passed.
- 2026-07-16-structural-exception-seventh-followup: Split five Rust test owners
  below the canonical hard ceilings. The exception count fell from 37 to 32,
  and focused verification and the full local repository gate passed.
- 2026-07-16-structural-exception-eighth-followup: Split the final three Rust
  test exceptions below the canonical hard ceilings. The exception count fell
  from 32 to 29, and focused verification and the full local repository gate
  passed.
- 2026-07-16-structural-exception-ninth-followup: Moved the root stylesheet's
  utility layer to its own loaded owner and split non-ATS discovery entries
  from the ATS platform registry. The exception count fell from 29 to 27, and
  focused verification and the full local repository gate passed.
- 2026-07-16-structural-exception-tenth-followup: Split the board and sector
  discovery registries at specialized-source boundaries and split career
  profiles into four domain-focused record owners behind the existing public
  aggregate. The exception count fell from 27 to 24, and focused verification
  and the full local repository gate passed.

## Outcomes

The Rust and desktop ownership cutovers are implemented, but the clean-cutover
repository refactor is not complete. The feature remains `active` while
structural debt and the final repository audit remain.

## Handoff

Read root `PROGRESS.md`, root `feature_list.json`, this plan, the
[blueprint](repository-refactor-blueprint.md), and the executable architecture
contract. Continue only the single active root feature. Completed plans are
historical evidence, not current architecture. The next bounded action is to
reduce the remaining 24 structural exceptions before the final repository audit.
