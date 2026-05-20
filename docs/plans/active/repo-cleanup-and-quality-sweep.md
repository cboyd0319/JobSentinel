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

## Cleanup Track: Removing Bloat And Junk

This track stays open until root clutter and nested repo junk have been
inventoried, classified, and either removed, moved, merged, or explicitly kept.

Candidate classes:

- Root clutter: one-off scripts, loose docs or reports, stale configs,
  generated assets, duplicate instructions, and unowned support directories.
- Nested junk: stale reports, caches, test artifacts, obsolete examples,
  unreferenced fixtures, duplicate docs, and generated output that slipped into
  source paths.
- Keep by default: repo front-door files, required root tool config, policy
  files, active fixtures, and compatibility wrappers with current references.

Required process:

- Prove whether each candidate is referenced by scripts, docs, CI, tests,
  package manifests, or Tauri build config.
- Remove disposable files, move durable docs under `docs/`, and merge duplicate
  content instead of leaving parallel sources of truth.
- Update `.gitignore`, bloat sensors, docs, and references after each cleanup
  slice.

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
- [ ] Remove root and nested bloat/junk after classifying each candidate as
  keep, move, merge, or delete.
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
| 2026-05-20 | Active | Expanded removing bloat and junk into a dedicated cleanup track covering root clutter, nested stale content, candidate classification, and reference-safe deletion or relocation. |
| 2026-05-20 | Active | Added removing bloat and junk as an explicit cleanup track. Current bloat sensor passes, so next pass must classify root clutter and nested stale content beyond disposable artifacts. |
| 2026-05-20 | In progress | Classified current root entries in the bloat sensor allowlist, removed an unreferenced one-off cache test shell script, and added a guard against future nested `test_*.sh` helper drift outside `scripts/`. |
| 2026-05-20 | In progress | Fixed resume matcher education lookup error handling so database failures no longer score as missing education. |
| 2026-05-20 | In progress | Moved ignored embedded-ML tests off repo-relative `test_cache` and `test_ml_cache` directories, taught the bloat sensor to reject those cache dirs, and restored embedded-ML feature compilation. |
| 2026-05-20 | In progress | Restored full Rust test-suite health by updating stale screening-answer integration fixtures and normalizing legacy answer types at the profile manager boundary. |
| 2026-05-20 | In progress | Fixed scheduler shutdown so an in-flight scraping cycle cannot block full-suite integration tests or app shutdown. |
| 2026-05-20 | In progress | Stabilized Chromium and WebKit E2E flows without serializing suites: fixed skip-link focusability, gave the email-alerts switch an accessible visible target, and removed shared page-object state from job interaction tests. |
| 2026-05-20 | In progress | Removed the unreferenced development Dockerfile, pruned its stale Dependabot entry, and tightened the root bloat allowlist so `docker/` must be reintroduced intentionally. |
| 2026-05-20 | In progress | Linked the JSON Resume sample fixture from feature docs and corrected roadmap status from planned to implemented. |
| 2026-05-20 | In progress | Corrected stale E2E documentation that still referenced WebdriverIO, removed a deleted `tests/e2e/docs/` tree entry, and updated Playwright examples/layout notes. |
| 2026-05-20 | In progress | Hardened the LinkedIn login result channel so a poisoned mutex cannot panic the auth flow, and added a regression test for poisoned sender recovery. |

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
- Resume-job matching was silently treating education lookup database failures
  as absent education because the query used `.ok()??`; the matcher now
  propagates lookup failures when a job declares an education requirement.
- Ignored embedded-ML tests used repo-relative cache directories when run
  manually; those tests now use temporary directories, and the bloat sensor
  rejects leftover `test_cache/` and `test_ml_cache/` directories.
- The optional `embedded-ml` feature had drifted out of compile health due to
  SQLx offline macro cache misses, a denied unsafe safetensors mmap, stale
  fields/imports, and a Candle tensor API mismatch.
- The full Rust test suite caught a stale raw database fixture still using the
  old `boolean` screening-answer type after migrations moved the active schema
  to `yes_no`; the profile manager now normalizes legacy type names before
  writing.
- Scheduler startup previously awaited the first scraping cycle before
  observing shutdown; any slow external scraper could make shutdown wait until
  that cycle returned.
- WebKit does not reliably tab to an `sr-only` skip link unless it has an
  explicit tab stop, so the skip link now declares `tabIndex={0}`.
- The Email Alerts switch was visually clickable but the hidden checkbox lacked
  a stable accessible E2E target in WebKit; the visible switch label is now the
  Playwright target and the checkbox has an accessible name.
- `job-interactions.spec.ts` used file-scoped page objects under Playwright
  `fullyParallel`; those shared mutable locators could cross test contexts.
  The spec now builds page objects per test and keeps project-level parallelism.
- `docker/Dockerfile.dev` had no docs, scripts, or workflow consumers and used
  an external `rust-dev:latest` base image that the repo does not define.
- `examples/sample-json-resume.json` is a useful fixture, not junk, but it was
  not linked from the JSON Resume feature docs.
- `docs/ROADMAP.md` still listed JSON Resume Import as planned even though the
  Tauri command, UI entrypoint, mock handler, and feature docs already exist.
- E2E docs had drift from the current Playwright suite: `docs/README.md`
  still described WebdriverIO + Tauri tests, and frontend testing docs showed
  non-existent `fixtures/` and `utils/` directories under
  `tests/e2e/playwright`.
- `linkedin_login` treated a poisoned result mutex as an unrecoverable panic in
  both cookie extraction and cancellation paths. The sender is now recovered
  when possible so the command can resolve instead of crashing the app.

## Decisions

- Treat removing bloat and junk as active repo work even though the earlier
  disposable-artifact sensor is closed.
- Do not delete root front-door or policy files just to reduce visible clutter.
- Prefer small verified cleanup commits over a large repo-wide churn commit.
- Guard the root with an explicit allowlist so new root files must be classified
  instead of silently becoming clutter.
- Keep reusable shell automation under `scripts/`; nested `test_*.sh` helpers
  should be promoted into canonical scripts or deleted.
- Preserve E2E parallelism where possible; fix shared test state directly rather
  than serializing whole suites.
- Remove unused root support directories when no command, doc, or workflow owns
  them; pair the deletion with bloat allowlist updates.

## Outcomes

- Pending.
