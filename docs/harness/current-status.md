# Current Status

Last updated: 2026-07-16

## Done

- The full repository refactor plan and ownership blueprint are locked in
  `docs/plans/active/current-work.md` and
  `docs/plans/active/repository-refactor-blueprint.md`.
- The earlier local harness checkpoint remains preserved at
  `docs/harness/evidence/harness-standard-contract-2026-07-14.md`.
- The corrective harness implementation and full local gate passed.
- The target Rust ownership graph is implemented across security, domain,
  network, platform, storage, intelligence, sources, application, assistance,
  local AI, documents, credentials, notifications, and external AI crates.
  `jobsentinel-core` is deleted, storage no longer exposes a raw SQLx pool, and
  the Tauri crate delegates product behavior through `jobsentinel-application`.
- Desktop composition, frontend platform routing, development-runtime
  ownership, root-script placement, script-test ownership, release workflow
  ownership, and maintained-file boundaries match the executable contracts.
- The final structural batch eliminated 17 temporary exceptions through focused
  suite splits, fixture extraction, taxonomy compaction, and reusable release
  workflows. The sole retained exception is the unchanged initial SQLx migration,
  protected by an exact checksum-compatible no-growth contract.
- Release workflow policy sensors now aggregate the focused reusable owners
  while retaining root-level dispatch, publication, and permission checks.
- The final repository audit passed the full local gate, all 286 browser
  journeys, and the Rust workspace all-features lane. The feature is `passing`
  with fresh structured evidence in the canonical ledger.
- Repository-root ownership was committed at `880fca80` and passed its complete
  post-commit gate. Canonical state, contracts, plans, documents, examples, and
  generated-output boundaries now live at their recorded owners.
- Crate DRY remediation is complete. Maintained crate production duplication
  fell from 693 lines across 35 regions to zero, and crate test duplication fell
  from 2,184 lines across 79 regions to zero. The baselines are ratcheted to
  zero and the full local gate passed with structured completion evidence.

## In Progress

- Active feature: `frontend-dry-remediation`
- Status: `active`
- Objective: Give every confirmed actionable duplication under `src/` and
  `src-tauri/src/` one canonical owner, remove obsolete copies, and prevent
  recurrence in maintained frontend production code.
- Branch: `refactor/full-repo-v2.9.5`
- Current slice: Planning and characterization. The maintained detector reports
  778 duplicated significant lines across 38 regions. Crate production and test
  scopes remain guarded at zero.
- Next action: classify every listed frontend region by semantic owner before
  changing shared behavior.

## Deferred

- Hosted CI remains intentionally absent under the named
  `pre-alpha-private-no-ci` user override. It was not part of the repository
  cleanup slice.

Keep this current; put command history and long evidence under `docs/harness/evidence/`.
