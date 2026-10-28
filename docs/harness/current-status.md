<!-- Owns the active work selection, verified checkpoints and immediate acceptance gaps. -->

# Current Status

Last updated: 2026-10-28

## Full-Plan Progress

- Planning estimate: **about 50% complete**, with audit and release uncertainty.
- The master plan accepts 187 idea IDs: 105 for v3.0 and 82 in M12's nine trains.
  M0–9 historically cover 104 IDs (55.6% of all accepted IDs); that count excludes
  verification, release and closure effort and does not certify audited behavior.
- Target: all accepted IDs, M10 recovery/update integration, M11 qualification and
  release, M12 enhancement trains, and M13 line closure. The old 10/14 milestone
  percentage weighted unlike milestones equally and overstated overall completion.

## Recorded Checkpoints

- The feature ledger owns historical milestone evidence and passing transitions.
- M0–M9 were recorded passing. The retrospective audit found missed behavior;
  those labels do not establish current acceptance or release readiness.
- Gate 5 is approved: one upgradable Essentials package, optional components,
  reviewed updates/compatible rollback, and milestones 0–10 as the v3.0 cut.
- The user approved a 256 MiB temporary backup-drop cap; larger backups use Settings Restore.

## In Progress

- Active feature: `v3-milestone-10-update-rollback-repair`
- Status: `active`
- Audit findings, corrections and uncovered areas:
  `docs/harness/evidence/v3-retrospective-audit-2026-10-28.json`.
- Update prerequisites include signed candidate assessment, Rust-owned inventory,
  snapshot revalidation, scheduler drain and verified same-device recovery snapshots.
- Native admission, signed review, authenticated startup, snapshot restoration and
  acknowledged installer failure pass focused checks; integrated happy-path proof remains open.
- Reviewed fixes cover database/WAL preservation, newer-data refusal, protected form
  input, native file bounds, pack lifecycle, DNS pinning, Settings/support privacy,
  model loading and inference budgets. Focused evidence is linked from the audit.
- Snapshot-bound semantic matching is wired into maintained reviews at `c3882eb3`.
  One optimized Qwen workflow passed in 5.70s with 6,668,730,368-byte peak RSS;
  this is not representative latency or an enforced 8 GiB qualification.
- Security refresh: affected branch dependencies patched; npm audit reports zero known
  vulnerabilities. Evidence: `docs/harness/evidence/v3-security-refresh-2026-10-28.json`.
- Next: prove one isolated signed native-coordinator journey, reconcile M10 acceptance,
  then run M11 qualification; recorded audit coverage and model comparison remain open.

## Remaining Qualification

- Model choice is being revalidated; no replacement or threshold change is approved.
- Cooperative inference cancellation passes focused layer/batch and UI checks;
  full-model cancellation latency, representative latency and ambiguous resume-import
  cleanup remain gaps. Explicit retained-cache quarantine and removal pass focused checks.
- M11 owns production app/Region signing, current enforced 8 GiB/native journeys,
  Windows 11/exact macOS 26/Linux qualification and release proof.
- Hosted general CI remains absent under `pre-alpha-private-no-ci`.

The master plan owns scope and development-first sequencing. Historical packages
and model runs prove only their recorded scope, not current release readiness.
