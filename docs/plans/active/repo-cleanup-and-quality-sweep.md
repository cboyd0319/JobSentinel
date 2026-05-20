# Repo Cleanup and Quality Sweep

## Problem

JobSentinel has accumulated repo clutter, stale surfaces, and quality risks that
make broad maintenance harder than it needs to be. Earlier work added mechanical
bloat detection, but that only catches disposable artifacts. The repo still needs
an intentional pass for root clutter, nested junk, stale docs, redundant files,
and quality gaps found during the sweep.

## Scope

In scope:

- Remove bloat and junk from root and nested repo paths.
- Classify root files as required front-door files, tool config, docs that
  should move under `docs/`, or disposable clutter.
- Keep or improve mechanical sensors for disposable artifacts, generated output,
  skipped tests, weak assertions, security docs, frontend boundaries, and Tauri
  invoke drift.
- Fix concrete security, scraper, frontend, backend, documentation, and test
  issues found during the sweep.
- Update docs when repo structure, behavior, commands, or security posture
  changes.

Out of scope:

- Deleting conventional root metadata without replacement, including
  `README.md`, `LICENSE`, `SECURITY.md`, and `CODE_OF_CONDUCT.md`.
- Removing required tool config files only to make the root look smaller.
- Rewriting product behavior without a concrete defect or product decision.
- Adding telemetry, cloud dependencies, or scraper bypass behavior.

## Risks

- Root cleanup can break tool discovery if config files move without command
  updates. Mitigation: move files only after proving tool support or leave them
  in place.
- Junk removal can delete useful release, security, or agent context.
  Mitigation: classify purpose before removal and prefer docs relocation for
  durable content.
- Broad sweeps can become too large to review. Mitigation: commit small verified
  slices to `main`.
- Heavy E2E runs can slow iteration. Mitigation: use focused tests first, then
  run broader checks when risk warrants it.

## Milestones

- [x] Add and wire `npm run lint:bloat` into `npm run harness:check`.
- [x] Remove stale tracked generated screenshot artifacts.
- [x] Stabilize skip-heavy Playwright suites and remove `test.skip()` sprawl.
- [x] Harden frontend job URL validation for loopback, mapped, and multicast
  targets.
- [x] Harden backend job import fetches against HTTP redirect trust-boundary
  changes.
- [x] Classify root files and mark each as keep, move, merge, or delete.
- [ ] Search nested paths for stale reports, generated output, logs, build
  products, duplicate docs, and obsolete examples.
- [x] Remove or relocate confirmed bloat and update references.
- [x] Add sensor coverage for any recurring junk class found during cleanup.
- [ ] Run relevant verification and push each cleanup slice.

## Verification

```bash
npm run harness:check
npm run lint:bloat
npm run lint:md
npm run lint:security
npm run lint
npm run test:run
cd src-tauri && cargo fmt --all -- --check
cd src-tauri && cargo clippy -- -D warnings
cd src-tauri && cargo test --lib
git diff --check
```

Use focused tests for narrow code changes. Reserve full E2E runs for UI flow
changes or Playwright-specific work.

## Progress

| Date | Status | Notes |
| ---- | ------ | ----- |
| 2026-05-20 | Active | Added removing bloat and junk as an explicit cleanup track. Current bloat sensor passes, so next pass must classify root clutter and nested stale content beyond disposable artifacts. |
| 2026-05-20 | In progress | Classified current root entries in the bloat sensor allowlist, removed an unreferenced one-off cache test shell script, and added a guard against future nested `test_*.sh` helper drift outside `scripts/`. |

## Discoveries

- Current filesystem bloat scan finds no disposable reports, logs, or artifact
  directories outside ignored build/cache paths.
- Current ignored local paths are `.husky/_/`, `node_modules/`, and
  `src-tauri/target/`.
- The largest local disk use is ignored Rust build output under
  `src-tauri/target/`.
- Root contains conventional repo metadata, agent wrappers, and tool configs;
  cleanup must distinguish necessary tool entrypoints from true junk.
- `src-tauri/test_cache.sh` was an unreferenced one-off test helper. Canonical
  cache coverage now runs through Cargo test commands and repo verification
  scripts, so the shell wrapper was removable bloat.
- The scraper module had a stale pointer to `docs/CLAUDE.md` for restricted
  site alternatives; the maintained docs are `docs/user/DEEP_LINKS.md` and
  `docs/BOOKMARKLET.md`.

## Decisions

- Treat removing bloat and junk as active repo work even though the earlier
  disposable-artifact sensor is closed.
- Do not delete root front-door or policy files just to reduce visible clutter.
- Prefer small verified cleanup commits over a large repo-wide churn commit.
- Guard the root with an explicit allowlist so new root files must be classified
  instead of silently becoming clutter.
- Keep reusable shell automation under `scripts/`; nested `test_*.sh` helpers
  should be promoted into canonical scripts or deleted.

## Outcomes

- Pending.
