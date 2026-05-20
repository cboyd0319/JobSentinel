# Technical Debt Tracker

Use this file for durable debt that affects agent reliability, architecture,
security, or developer workflow.

## Open Items

| ID | Area | Evidence | Risk | Next step | Status |
| -- | ---- | -------- | ---- | --------- | ------ |
| HE-002 | Architecture sensors | Frontend module boundaries are not mechanically enforced. | Agents may create imports that blur feature, service, and UI layers. | Evaluate dependency-cruiser or ESLint boundary rules. | Open |
| HE-003 | Security sensors | Local harness check does not summarize security-specific gates. | Agents may skip threat-surface checks for sensitive changes. | Add security sensor summary after harness check stabilizes. | Open |
| QA-001 | Rust test linting | `cargo clippy --all-targets -- -D warnings` reports existing test-target lint debt; CI currently runs `cargo clippy -- -D warnings`. | Test-only warnings can hide real regression risk if all-targets becomes required later. | Either clean test lints incrementally or add an explicit test-target lint policy. | Open |

## Closed Items

| ID | Area | Evidence | Outcome | Closed |
| -- | ---- | -------- | ------- | ------ |
| HE-001 | Harness docs | `scripts/check-harness.mjs` rejects hardcoded current test-count claims in front-door and testing docs. | Maintained docs now reference fresh command output for current test counts instead of stale numeric claims. | 2026-05-19 |
| QA-002 | E2E assertion quality | Search for always-true expressions such as `expect(true)` and `\|\| true` no longer finds matches under `tests/e2e/playwright`. | Replaced no-op assertions with real UI assertions or explicit `test.skip()` branches across the affected Playwright suites. | 2026-05-19 |
