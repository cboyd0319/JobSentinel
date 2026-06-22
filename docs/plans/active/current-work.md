# Current Product And Quality Work

Last updated: 2026-06-22.

## Purpose

Keep one compact active plan for the current product and quality line. History
belongs in completed plans, archives, and git.

## Problem

`v2.9.0` is published, but the active restart surface still pointed agents at
release-publication work and an active v3 implementation slice. For `v2.9.1`,
the user has narrowed scope to maintenance and repo cleanup. The repo needs
current state, a short cleanup checklist, and verification that does not invite
new feature work.

## Scope

In scope:

- Stale active-plan, docs-index, roadmap, manifest, and release-state cleanup.
- Repo bloat, generated-artifact, machine-specific path, duplicate-source, and
  docs drift cleanup.
- Harness, script, test, dependency-pin, and release metadata fixes when they
  keep current behavior verifiable.
- Small confirmed bug fixes with focused tests.
- Final `v2.9.1` changelog, release notes, public asset checks, and release
  gates when the maintenance checklist is closed.

Out of scope:

- New product features.
- v3 implementation.
- New job-source adapters or browser automation behavior.
- New external AI features, provider paths, or private-data sends.
- Broad redesign work beyond fixing a confirmed regression or stale claim.
- New dependencies unless existing repo tooling is broken and there is no
  smaller native or installed-dependency path.

## Current Priorities

| Area | State | Next useful slice |
| ---- | ----- | ----------------- |
| Active plan state | Current | Keep `status.md`, this file, the v2.9.1 plan, `docs/plans/index.json`, and harness manifest aligned. |
| v2.9.0 completion history | Complete | Keep the moved completed roadmap as history; do not use it as active release routing. |
| v3 planning | Deferred | Leave v3 docs available for later major-release work; do not implement during v2.9.1 maintenance. |
| Scraper/source verification | Maintenance watch | Keep existing source-boundary evidence and restricted-source rules intact; update only for cleanup or regressions. |
| Locked redesign: Quiet Shield | Maintenance watch | `DESIGN.md`, `docs/design/README.md`, and `docs/design/design-spec.md` remain the active UI contract. |
| Cleanup and harness | Local release prep | Prefer deletion, consolidation, and focused sensor fixes over new machinery. |
| macOS and Windows readiness | External gaps visible | Keep no-account language accurate; do not claim signed or Gatekeeper-ready distribution without credentials and proof. |

## Completion Bar

- Active plan directory contains exactly the compact restart docs needed for
  the current patch line.
- `v2.9.1` work is maintenance-only unless the user explicitly changes scope.
- Every product or security-sensitive change preserves Rule 0: local-first
  storage, credential safety, explicit user review, privacy-preserving
  defaults, and optional external AI.
- Every claim of completion has fresh verification evidence.
- Docs and public wiki impact are reviewed when behavior, setup, commands,
  architecture, security, release flow, capabilities, screenshots, design, or
  user-facing copy changes.

## Next Work

1. Publish the local public-wiki draft only with the `v2.9.1` release.
2. Cut, tag, push, and verify the `v2.9.1` release only when the user approves
   moving from local prep to publication.
3. Confirm major route screenshots, Computer Use clicks, keyboard flow, and
   affected route/action/state checks after any UI change.
4. Keep public asset checks pending until `v2.9.1` assets exist.

## Sensors

Use focused docs and harness checks for plan-only edits:

```bash
npm run harness:session -- --json
npm run harness:score
npm run harness:check
npm run lint:docs
npm run lint:bloat
git diff --check
```

Broaden only if edits touch product code, privacy/security sensors, release
workflow, packaging, or macOS deployment behavior.

## Risks

- Active docs can drift back into old v2.9.0 publication instructions.
- v3 plans can pull patch work out of maintenance scope.
- macOS public-readiness language can drift if no-account completion and
  Apple-account-only release work are not kept separate.
- Secret-storage UX can regress if passive Settings or status checks call
  secure storage. Saved-secret verification must stay lazy and action-driven.
- Harness-controlled redesign lock: keep required design files, change
  contracts, and screenshot or Computer Use evidence for broad UI changes.

## Handoff

When resuming, read:

1. [Status](status.md)
2. [v2.9.1 maintenance plan](v2.9.1-maintenance-and-repo-cleanup.md)
3. [Verification matrix](../../harness/verification-matrix.md)
4. Completed or archived plans only for old decisions

Archived and completed history stays out of active restart context.
