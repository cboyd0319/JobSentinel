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
- Package metadata remains `2.9.0` until the actual `v2.9.1` release cut.

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
| v2.9.1 maintenance and repo cleanup | Active | Inventory remaining stale release claims, repo clutter, and confirmed maintenance bugs | [Plan](v2.9.1-maintenance-and-repo-cleanup.md) |

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

## Next Best Work

1. Continue the v2.9.1 cleanup checklist by shrinking near-cap tests and mocks,
   correcting stale release claims, deleting disposable artifacts, and fixing
   only confirmed maintenance bugs.
2. Run `npm run harness:plan -- --since origin/main` before each cleanup slice
   and use the smallest matrix-backed checks for touched files.
3. Defer package version bumps, changelog entries, release notes, and public
   asset checks until the final `v2.9.1` release cut.

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
- Final docs, bloat, security, architecture, frontend, build, Rust, and chosen
  E2E or manual gates pass before any production-ready or release-ready claim.
