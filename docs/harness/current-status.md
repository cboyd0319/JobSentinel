# Current Status

Last updated: 2026-07-18

## Done

- Rust ownership is implemented across the declared crates. `jobsentinel-core`
  is deleted, storage hides its raw SQLx pool, and Tauri delegates product
  behavior through `jobsentinel-application`.
- Desktop, frontend, script, workflow, and maintained-file ownership match the
  executable contracts.
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
- Frontend DRY remediation is complete. Maintained production duplication fell
  from 778 lines across 38 regions to zero. Shared resume, score, dashboard,
  market, feedback, error, and desktop-adapter behavior now has canonical owners,
  and the full local gate passed.
- Residual cleanup is complete. Fixtures, file-size policy, records,
  dependencies, and Rust support have canonical owners. All maintained scopes
  are at zero duplication under the 14-line contract, the full gate passed, and
  the post-cleanup review recorded a bounded concerns verdict.
- Post-cleanup corrections and the v2.9.5 source-candidate closure are complete.
  Database settings and FTS updates are sound, saved alerts evaluate new jobs,
  maintained links and release records are current, and dependencies are fresh.
  The full gate, 286 browser journeys, all-feature Rust lane, universal package
  smoke, skills archives, and SBOM generation passed with structured evidence.
- The v2.9.5 GUI QA and release publication are complete. All 288 browser
  journeys and hosted release gates passed. The public release contains 20
  checksummed assets with SBOM and provenance validation. The no-account Mac
  package passed fresh-download installation and launch smoke verification.

## In Progress

- Active feature: `v3-workstream-selection`
- Status: `active`
- Objective: Select one user-approved, bounded v3 major workstream.
- Branch: `refactor/full-repo-v2.9.5`
- Current slice: Review and rank the existing v3 planning package.
- Next action: Present the bounded workstream options for user approval.

## Deferred

- Hosted general CI remains intentionally absent under the named
  `pre-alpha-private-no-ci` user override.

Keep this current; put command history and long evidence under `docs/harness/evidence/`.
