# Active Plan Status

Last updated: 2026-06-22. Read this file first; load archived or completed
history only when old decision context is needed.

## Goal State

The repo-wide goal remains open: zero known errors, privacy leaks, stale docs,
brittle tests, user-facing technical assumptions, engineer-only defaults, and
unverified claims.

The current priority is the `v2.9.1` patch line. Scope is maintenance and repo
cleanup only: no new product features, no new source adapters, no new external
AI behavior, and no v3 implementation unless a release-critical regression
requires it.

Observed release state on 2026-06-22:

- Public `v2.9.0` release exists at
  `https://github.com/cboyd0319/JobSentinel/releases/tag/v2.9.0`.
- GitHub CLI reports `JobSentinel 2.9.0` as latest, published
  `2026-06-20T22:01:56Z`, non-draft, and non-prerelease.
- Remote tag `v2.9.0` points at `2131beb5`.
- Local package, Tauri, and Cargo metadata now target `2.9.1`. Public latest
  remains `v2.9.0` until the `v2.9.1` release is cut and published.

Rule 0 still controls the work: user data stays local unless the user
explicitly configures an external channel, external AI stays optional and
disabled by default, and users stay in control before anything leaves the
device.

Quiet Shield redesign is now part of the active repo-wide goal and the repo
harness. It remains a harness-controlled active-goal acceptance gate;
`DESIGN.md`, `docs/design/README.md`, and `docs/design/design-spec.md` remain
UI/UX contracts.

## Active Workstreams

| Workstream | State | Current focus | Source |
| ---------- | ----- | ------------- | ------ |
| Current product and quality work | Active | Maintenance-only v2.9.1 cleanup, docs accuracy, harness health, and regression fixes | [Plan](current-work.md) |
| v2.9.1 maintenance and repo cleanup | Active | Remaining stale-release doc cleanup, optional confirmed maintenance bugs, and final release-cut review | [Plan](v2.9.1-maintenance-and-repo-cleanup.md) |

## Current Posture

- `v2.9.0` release operations are complete. Do not route new work through old
  tag movement, hosted publication, or asset-upload instructions.
- v3 planning remains useful background, but implementation is deferred during
  the `v2.9.1` maintenance line unless the user explicitly changes scope.
- Cleanup is allowed when it fixes stale docs, broken harness state, bloat,
  test brittleness, security or privacy drift, portability issues, or release
  metadata inaccuracies.
- Small bug fixes are allowed only when they preserve `v2.9.0` behavior except
  for the confirmed regression.
- macOS and Windows signing gaps remain external. Do not claim Gatekeeper-ready
  macOS or signed Windows distribution before credential-backed proof exists.
- all configured source adapters and user-gated restricted-source paths must
  retain focused parser/import/gate coverage before any release-ready claim.
- 2026-06-22 maintenance kickoff moved the v2.9.0 roadmap to completed
  history, added the v2.9.1 maintenance plan, deferred v3 implementation,
  split the near-cap root changelog into release-band archives, and passed
  focused docs, bloat, harness, score, and script-test checks.
- 2026-06-22 local cleanup also bumped metadata to `2.9.1`, refreshed stable
  package/crate pins, replaced custom lazy statics with standard lazy
  initialization, split near-budget tests and mocks, moved production source
  health checks out of `smoke_tests.rs`, narrowed safe Clippy allowances, split
  core architecture docs, and passed full frontend, script, build, docs,
  release-readiness, Clippy, and Rust library checks.
- 2026-06-22 stale current-doc release claims were narrowed to the v2.9.1
  maintenance line or preserved as historical v2.9.0 evidence. The regression
  validation ledger now records local browser, frontend, backend, build, docs,
  bloat, harness, and isolated macOS native startup evidence in
  [`docs/harness/full-manual-validation-v2.9.1.md`](../../harness/full-manual-validation-v2.9.1.md).

## Next Best Work

1. Run final local `v2.9.1` release-readiness gates after changelog and release
   notes are staged.
2. Review public wiki sync impact locally; publish wiki only with the release.
3. Keep public asset checks pending until `v2.9.1` assets exist.

## Completion Bar

- Active plan directory contains only current restart docs.
- `status.md` answers current state, recent evidence, macOS posture, and next
  best work without old plan reads.
- Plan indexes, docs hubs, roadmap links, README, release notes, and harness
  expectations match the `v2.9.1` maintenance-only scope.
- No known repo bloat, stale docs, generated artifacts, or duplicate sources of
  truth block product, privacy, security, or verification work.
- No known privacy leak remains in logs, command errors, renderer messages,
  safe support reports, source adapters, external AI calls, or notification
  payloads.
- No known user-facing flow assumes terminal, GitHub, debugging, engineering
  knowledge, or only technical job searches.
- Cleanup-release regression validation has current local evidence and explicit
  unclaimed gaps in the validation ledger.
- Final docs, bloat, security, architecture, frontend, build, Rust, and chosen
  E2E or manual gates pass before any production-ready or release-ready claim.
