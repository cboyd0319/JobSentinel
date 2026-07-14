# Current Product And Quality Work

Last updated: 2026-07-13.

## Purpose

Keep one compact active plan for the current product and quality line. History
belongs in completed plans, archives, and git.

## Problem

`v2.9.1` is published history. The `v2.9.5` source candidate now contains the
full repository ownership refactor, cleanup, and documentation alignment. The
remaining work is the final verification matrix and platform evidence before
release authorization can be requested.

## Scope

In scope:

- Stale active-plan, docs-index, roadmap, manifest, release-state, and README
  cleanup after `v2.9.1` publication.
- Release pipeline and process fixes that reduce unnecessary hosted runner time
  while keeping verification explicit.
- Repo bloat, generated-artifact, machine-specific path, duplicate-source, and
  docs drift cleanup.
- Harness, script, test, dependency-pin, and release metadata fixes when they
  keep current behavior verifiable.
- Small confirmed bug fixes with focused tests.

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
| Active plan state | Current | Keep `status.md`, this file, the full-repository refactor plan, `docs/plans/index.json`, and harness manifest aligned. |
| v2.9.1 release history | Complete | Keep the moved completed plan as history; do not use it as active release routing. |
| Full repository refactor | Active | Complete v2.9.5 readiness evidence and close the refactor plan without weakening privacy. |
| Release pipeline | Deferred | Re-evaluate prior optimization decisions against the final workspace during v2.9.5 readiness. |
| v3 planning | Deferred | Leave v3 docs available for later major-release work; do not implement during post-release closeout. |
| Scraper/source verification | Maintenance watch | Keep existing source-boundary evidence and restricted-source rules intact; update only for cleanup or regressions. |
| Locked redesign: Quiet Shield | Maintenance watch | `DESIGN.md`, `docs/design/README.md`, and `docs/design/design-spec.md` remain the active UI contract. |
| macOS and Windows readiness | External gaps visible | Keep no-account language accurate; do not claim signed or Gatekeeper-ready distribution without credentials and proof. |

## Completion Bar

- Active plan directory contains exactly the compact restart docs needed for
  current post-release work.
- `v2.9.1` is treated as published, verified history.
- Every product or security-sensitive change preserves Rule 0: local-first
  storage, credential safety, explicit user review, privacy-preserving
  defaults, and optional external AI.
- Every claim of completion has fresh verification evidence.
- Docs and public wiki impact are reviewed when behavior, setup, commands,
  architecture, security, release flow, capabilities, screenshots, design, or
  user-facing copy changes.

## Next Work

1. Run the complete v2.9.5 frontend, Rust, E2E, security, dependency, package,
   SQLx, docs, and harness matrix.
2. Record macOS 26 live evidence and Windows 11 and Linux live or isolated
   contract evidence without overclaiming unavailable hosts.
3. Close the refactor plan only after a clean worktree and evidence log prove
   every completion condition.
4. Stop before tagging, uploading, publishing, or dispatching a release.
5. Confirm major route screenshots, Computer Use clicks, keyboard flow, and
   affected route, action, and state checks after any UI change.

## Sensors

Use focused docs, workflow, release, and harness checks for this closeout:

```bash
npm run harness:check
npm run release:readiness -- --version 2.9.5
npm run lint:actions
npm run lint:security
npm run lint:docs
npm run lint:bloat
git diff --check
```

Broaden only if edits touch product code, privacy/security sensors, packaging,
or macOS deployment behavior.

## Risks

- Source-candidate docs can incorrectly imply that `v2.9.5` is already a
  public release.
- Release docs can imply automatic public verification when a workflow-token
  publication requires explicit verification.
- Local macOS release guidance can overclaim hosted SLSA provenance for a local
  artifact unless the docs separate checksum/SBOM evidence from hosted
  attestations.
- macOS public-readiness language can drift if no-account completion and
  Apple-account-only release work are not kept separate.
- Secret-storage UX can regress if passive Settings or status checks call
  secure storage. Saved-secret verification must stay lazy and action-driven.
- Harness-controlled redesign lock: keep required design files, change
  contracts, and screenshot or Computer Use evidence for broad UI changes.

## Handoff

When resuming, read:

1. [Status](status.md)
2. [Full repository refactor and v2.9.5 readiness](repository-architecture-reorganization.md)
3. [Verification matrix](../../harness/verification-matrix.md)
4. Completed or archived plans only for old decisions

Archived and completed history stays out of active restart context.
