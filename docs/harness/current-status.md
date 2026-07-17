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
- The final repository audit passed the full local gate,
  all 286 browser journeys,
  and the Rust workspace all-features lane.
  The full repository refactor is recorded as `passing`
  with fresh structured evidence in
  the canonical feature ledger.

## In Progress

- Active feature: `harness-canonical-remediation`
- Status: `active`
- Objective: Close the final canonical harness remediation while preserving the
  exact user-authorized exception and all verified repository behavior.
- Branch: `refactor/full-repo-v2.9.5`
- Current slice: Repository-root ownership is complete in the working tree.
  Harness state and contracts now live under `scripts/harness`, maintained
  repository and design documents live under `docs`, and the local AI model
  manifest lives in its owning crate. Stale environment, profile, and resume
  examples are deleted; the live configuration example remains under `docs`.
  Generated Rust cleanup reclaimed 184.5 GiB, and a single-connection test
  database correction removed migration-test interference found by the full
  gate. All 817 script tests, 2,934 frontend tests, 10 smoke journeys, and Rust
  workspace checks pass. The batch is based on `dadf92c4` and remains uncommitted.
- Next action: commit the verified root ownership reorganization only with
  explicit user authorization.

## Deferred

- Hosted CI remains intentionally absent under the named
  `pre-alpha-private-no-ci` user override. It was not part of the repository
  cleanup slice.

Keep this as the current snapshot. Put command history and long evidence under
`docs/harness/evidence/`.
