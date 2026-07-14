# Active Plan Status

Last updated: 2026-07-14. Read this first; load archived history only when
needed.

## Goal State

Complete a clean-cutover reorganization and refactor of the entire JobSentinel
repository. Establish durable ownership across Rust crates, Tauri IPC, frontend
features, tests, fixtures, scripts, CI, packaging, documentation, and harnesses.
Then clean the final tree and reach verified v2.9.5 source readiness. Release
execution is not authorized.

Rule 0 controls every milestone. User data stays local unless the user
explicitly configures an external channel. External AI stays optional and
disabled by default. Saved-secret access stays action-driven. Existing user data
requires safe migration with no silent loss.

The clean cutover has no internal backward-compatibility requirement. Obsolete
module paths, crate APIs, IPC commands, wrappers, tests, scripts, and docs are
deleted instead of retained as transition layers.

Quiet Shield redesign is now part of the active repo-wide goal and the repo harness.
It remains a harness-controlled active-goal acceptance gate;
`DESIGN.md`, `docs/design/README.md`, and `docs/design/design-spec.md` remain the
UI and UX contracts.

## Observed Baseline

- Branch: `refactor/full-repo-v2.9.5`.
- Baseline commit: `c644995d` (`chore(repo): complete v2.9.5 readiness`).
- The root Cargo workspace has explicit members and centralized metadata and
  lint policy, but reusable Rust ownership is concentrated in one
  `jobsentinel-core` crate.
- Tauri still has direct SQL and provider transport responsibilities, and the
  core database pool is exposed broadly.
- Registered and production-consumed IPC commands are not symmetric.
- Architecture and file-cap sensors exist, but not every architecture and
  all-feature gate blocks the focused harness and CI.
- Windows 11 and Linux are not live hosts. Cross-target compilation, workflow,
  packaging, and isolated contracts must cover those platforms and name the
  remaining live gap.

## Active Workstreams

| Workstream | State | Current focus | Source |
| ---------- | ----- | ------------- | ------ |
| Full repository refactor | Active | Make architecture enforcement blocking before storage extraction | [Plan](current-work.md) |

## Current Posture

- The earlier refactor completion claim is superseded by the live repository
  evidence and the 2026-07-14 clean-cutover decision.
- v2.9.5 release readiness is blocked. Do not tag, sign, notarize, upload,
  publish, or dispatch a release.
- The final Rust architecture uses explicit domain, security, platform,
  storage, source, document, assistance, intelligence, local-AI, external-AI,
  notification, and application owners. Tauri is a thin adapter.
- The old `jobsentinel-core` crate will be removed, not kept as a forwarding
  facade.
- Frontend, test, fixture, script, workflow, packaging, and documentation
  layouts are part of the refactor, not follow-up cleanup.
- Scraper evidence must cover all configured source adapters and user-gated restricted-source paths.

## Next Best Work

1. Build a workspace-metadata architecture sensor for crate edges and technology
   owners, then make it blocking in the focused harness and CI.
2. Extract security, domain, network, and platform foundations.
3. Cut storage over with existing database-key, encryption, migration, backup,
   integrity, and restore behavior proven before raw pool removal.

## Completion Bar

- Explicit workspace members and acyclic crate dependencies match the ownership
  graph in the active plan.
- Tauri is a thin IPC and desktop adapter with a bidirectionally verified
  command surface.
- Frontend features, Rust owners, tests, fixtures, scripts, workflows,
  packaging, docs, and harness checks have deliberate homes.
- Privacy, credential, migration, external-send consent, accessibility, and
  platform contracts pass.
- File caps and architecture boundaries scan every maintained path and block
  locally and in CI.
- Focused and full verification evidence is recorded before cleanup and the
  final source-readiness claim.

## Handoff

Continue the first unchecked milestone in [current-work.md](current-work.md).
Completed plans are history, not current-state instructions.
