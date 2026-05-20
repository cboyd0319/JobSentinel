# Technical Debt Tracker

Use this file for durable debt that affects agent reliability, architecture,
security, or developer workflow.

## Open Items

| ID | Area | Evidence | Risk | Next step | Status |
| -- | ---- | -------- | ---- | --------- | ------ |
| BLOAT-001 | Removing bloat and junk | Root contained disposable ignored artifacts (`.claude/`, `dist/`, `test-results/`) plus needed local caches (`node_modules/`, `src-tauri/target/`) and generated Husky hook shims (`.husky/_`). Tracked-file audits have already found stale generated outputs outside root. | Junk hides meaningful changes, slows searches and verification, and makes agents more likely to inspect or preserve files that should not shape product behavior. | Keep deleting disposable ignored artifacts after build/test runs. Keep `node_modules/` and `src-tauri/target/` only as local verification caches, and keep `.husky/_` while `core.hooksPath` points there. Continue tracked-file audits for stale generated files. | Open |
| QA-004 | E2E skip sprawl | Playwright suites contain many runtime `test.skip()` branches that allow stale page objects and removed UI flows to pass without exercising behavior. Current completed cleanup slices cover job interactions, job filtering, application tracking, settings save/load, resume matching, market intelligence, and one-click apply settings. | E2E runs report green while core keyboard and resume-builder coverage may be absent or obsolete. | Replace broad runtime skips with current mock-backed behavior checks suite by suite, and preserve explicit skips only for product capabilities that are intentionally unavailable. | Open |

## Closed Items

| ID | Area | Evidence | Outcome | Closed |
| -- | ---- | -------- | ------- | ------ |
| SCRAPE-001 | Scraper retry coverage | Several source adapters called `reqwest` directly for custom headers, query parameters, JSON bodies, or API auth clients instead of shared retry helpers. | Added shared custom-request retry helpers, routed source adapters through them, and preserved source-specific response handling for anti-bot, auth, and schema fallback cases. | 2026-05-19 |
| BLOAT-002 | Duplicate docs screenshot artifacts | `tests/e2e/docs/images/` contained tracked copies of documentation screenshots while `README.md` and screenshot tooling use canonical `docs/images/`. | Removed the stale tracked screenshot bundle and ignored `/tests/e2e/docs/` so future Playwright artifacts do not re-enter the repo. | 2026-05-19 |
| SCRAPE-002 | Rate limiter contention | `RateLimiter::wait` held the shared bucket mutex while sleeping for token refill. | Released the lock before sleeping and added regression coverage so one exhausted bucket cannot block unrelated scrapers. | 2026-05-19 |
| HE-004 | Tauri invoke map | `scripts/check-tauri-invokes.mjs` verifies production frontend `invoke()` command names against `src-tauri/src/main.rs` registrations through `npm run harness:check`. | Frontend/backend IPC drift now fails locally before broken workflows ship. | 2026-05-19 |
| HE-005 | Tracked generated output | `src-tauri/coverage/` was committed despite generated coverage output being ignored. | Removed tracked coverage artifacts from repo history tip; future coverage output remains ignored by `.gitignore`. | 2026-05-19 |
| HE-006 | Stale migration docs | Unlinked migration and summary docs duplicated authoritative references and contained hardcoded implementation/test claims. | Removed stale docs, narrowed root-only generated-doc ignore rules, and replaced the undo note with a compact completed plan. | 2026-05-19 |
| QA-003 | Test quality sensors | `scripts/check-test-quality.mjs` rejects no-op `expect(true)`, always-true fallbacks, focused `.only` tests, and skipped unit tests through `npm run harness:check`. | Repeated weak assertion drift and hidden skipped component tests now have a mechanical guard. | 2026-05-19 |
| HE-003 | Security sensors | `scripts/check-security-sensors.mjs` verifies required security docs, security matrix coverage, and CI audit/advisory gate visibility through `npm run harness:check`. | Local harness now summarizes security-specific gates so agents get a deterministic threat-surface reminder. | 2026-05-19 |
| HE-001 | Harness docs | `scripts/check-harness.mjs` rejects hardcoded current test-count claims in front-door and testing docs. | Maintained docs now reference fresh command output for current test counts instead of stale numeric claims. | 2026-05-19 |
| HE-002 | Architecture sensors | `scripts/check-frontend-boundaries.mjs` enforces production frontend import boundaries and runs through `npm run harness:check`. | Shared frontend layers now have a mechanical drift sensor. | 2026-05-19 |
| QA-002 | E2E assertion quality | Search for always-true expressions such as `expect(true)` and `\|\| true` no longer finds matches under `tests/e2e/playwright`. | Replaced no-op assertions with real UI assertions or explicit `test.skip()` branches across the affected Playwright suites. | 2026-05-19 |
| QA-001 | Rust test linting | All-target clippy with warnings-as-errors currently reports test-target lint debt, while production clippy passes. | Added explicit policy: production clippy is the hard gate, test-target clippy warnings are advisory until test lint policy tightens. | 2026-05-19 |
