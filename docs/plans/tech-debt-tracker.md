# Technical Debt Tracker

Use this file for durable debt that affects agent reliability, architecture,
security, or developer workflow.

## Open Items

| ID | Area | Evidence | Risk | Next step | Status |
| -- | ---- | -------- | ---- | --------- | ------ |

## Closed Items

| ID | Area | Evidence | Outcome | Closed |
| -- | ---- | -------- | ------- | ------ |
| QA-003 | Test quality sensors | `scripts/check-test-quality.mjs` rejects no-op `expect(true)`, always-true fallbacks, and focused `.only` tests through `npm run harness:check`. | Repeated weak assertion drift now has a mechanical guard. | 2026-05-19 |
| HE-003 | Security sensors | `scripts/check-security-sensors.mjs` verifies required security docs, security matrix coverage, and CI audit/advisory gate visibility through `npm run harness:check`. | Local harness now summarizes security-specific gates so agents get a deterministic threat-surface reminder. | 2026-05-19 |
| HE-001 | Harness docs | `scripts/check-harness.mjs` rejects hardcoded current test-count claims in front-door and testing docs. | Maintained docs now reference fresh command output for current test counts instead of stale numeric claims. | 2026-05-19 |
| HE-002 | Architecture sensors | `scripts/check-frontend-boundaries.mjs` enforces production frontend import boundaries and runs through `npm run harness:check`. | Shared frontend layers now have a mechanical drift sensor. | 2026-05-19 |
| QA-002 | E2E assertion quality | Search for always-true expressions such as `expect(true)` and `\|\| true` no longer finds matches under `tests/e2e/playwright`. | Replaced no-op assertions with real UI assertions or explicit `test.skip()` branches across the affected Playwright suites. | 2026-05-19 |
| QA-001 | Rust test linting | All-target clippy with warnings-as-errors currently reports test-target lint debt, while production clippy passes. | Added explicit policy: production clippy is the hard gate, test-target clippy warnings are advisory until test lint policy tightens. | 2026-05-19 |
