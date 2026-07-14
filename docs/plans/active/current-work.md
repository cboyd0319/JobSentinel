# Full Repository Refactor

Last updated: 2026-07-14.

## Purpose

Replace JobSentinel's accumulated repository structure with explicit ownership
boundaries that support sustained growth. This is a clean cutover. Internal
module paths, crate APIs, IPC commands, tests, scripts, and documentation do not
need compatibility layers.

The locked ownership and dependency decisions are in the
[repository refactor blueprint](repository-refactor-blueprint.md). Changes to
that blueprint require evidence and a new decision-log entry.

## Problem

The source candidate at `c644995d` passes its prior readiness gates, but the
repository still concentrates 412 Rust files under `jobsentinel-core`, exposes
database implementation details to callers, keeps runtime behavior in Tauri
commands, and has frontend, test, script, CI, and documentation layouts shaped
by prior incremental work. Those facts invalidate the previous full-refactor
completion claim.

## Scope

In scope:

- The entire tracked repository: Rust crates, Tauri, React, tests, fixtures,
  scripts, workflows, configuration, documentation, packaging, and harnesses.
- Clean replacement of obsolete module paths, APIs, IPC commands, compatibility
  wrappers, duplicate fixtures, generated residue, and stale documentation.
- Safe migration of persistent user data when a schema or storage format must
  change.
- Milestone commits after focused verification passes.

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
- Windows 11, macOS 26+, and Linux behavior remains supported. Where a live host
  is unavailable, target compilation and isolated contract tests provide the
  evidence and the live gap stays explicit.
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
2. First make generic crate-edge and technology-ownership sensors blocking in
   the harness and CI. Then extract domain, security, network, platform, storage,
   credentials, and application ownership; remove raw pool and Tauri SQL access;
   and preserve encryption, backup, integrity, and migration behavior.
3. Extract source, document, assistance, intelligence, local-AI, external-AI,
   and notification owners. Move persistence fragments to storage and keep
   optional heavy dependencies out of the default desktop build.
4. Make Tauri a thin adapter. Delete obsolete IPC, enforce the bidirectional
   command contract, remove path redirections, and separate desktop startup,
   tray, state, and command adapters.
5. Reorganize the frontend by feature ownership. Move misplaced shared domain
   code and test support, delete orphan production files, and preserve all
   interaction and accessibility states.
6. Reorganize tests, fixtures, scripts, workflows, packaging, docs, examples,
   resources, validation policy, and tracked generated assets. Make local and CI
   commands use the same blocking architecture sensors.
7. Run the layered completion gate, clean ignored and generated residue, update
   public wiki sources, and commit a verified v2.9.5 source candidate. Release
   execution remains separate and requires explicit authorization.

## Milestone Gates

Every milestone requires:

- A scoped pre-change contract and reviewed diff.
- Focused tests for the changed owner, `git diff --check`, language checks when
  text changes, and file-cap checks for every moved path.
- No new dependency cycle, raw storage escape, unreviewed external send, secret
  probe, machine-specific path, unregistered invoke, or unused registration.
- Evidence recorded in `docs/harness/evidence-log.md` before the milestone commit.
- A clean index after the commit. Unrelated user changes remain untouched.

Milestone 2 uses separate gated commits for enforcement, foundational crates,
storage/key cutover, and pool removal. It requires database snapshots, migration
tests, SQLx metadata, integrity and restore tests, plus Linux, macOS, and Windows
compile evidence. Milestones 4 and 5 require IPC and affected UI/E2E checks.
Milestones 6 and 7 require all CI-equivalent and release-readiness checks.

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
  platform checks block through the focused harness and CI.
- No tracked or ignored build residue, machine-specific path, obsolete source,
  duplicate fixture, stale architecture claim, or release overclaim remains.

## Sensors

Use the smallest relevant checks for each milestone, then broaden:

```bash
npm run harness:check
npm run harness:score
npm run lint:language
npm run lint
npm run test:run
npm run build
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --all-features -- -D warnings
cargo test --workspace --all-features
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
- [ ] Milestone 2: storage and application boundaries committed.
- [ ] Milestone 3: remaining Rust owners committed.
- [ ] Milestone 4: thin Tauri adapter committed.
- [ ] Milestone 5: frontend ownership committed.
- [ ] Milestone 6: support surfaces committed.
- [ ] Milestone 7: full verification and cleanup committed.

## Surprises

- The earlier workspace refactor produced only one reusable Rust crate, while
  Tauri retained direct database and network responsibilities.
- Existing architecture checks are available but are not all blocking through
  the focused harness and CI.
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
- 2026-07-14: Claude Fable blocked the first draft on nine concrete gaps. The
  locked revision assigns database keys, early enforcement, platform compile
  gates, runtime mocks, model downloads, Storybook, and the inbound listener.

## Outcomes

Not complete. v2.9.5 source readiness is blocked until all milestones and gates
pass.

## Handoff

Read [status.md](status.md) and the
[blueprint](repository-refactor-blueprint.md), then continue the first unchecked
milestone. Completed plans are historical evidence, not current architecture.
