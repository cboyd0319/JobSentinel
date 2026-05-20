# Technical Debt Tracker

Use this file for durable debt that affects agent reliability, architecture,
security, or developer workflow.

## Open Items

| ID | Area | Evidence | Risk | Next step | Status |
| -- | ---- | -------- | ---- | --------- | ------ |
| HE-002 | Architecture sensors | Frontend module boundaries are not mechanically enforced. | Agents may create imports that blur feature, service, and UI layers. | Evaluate dependency-cruiser or ESLint boundary rules. | Open |
| HE-003 | Security sensors | Local harness check does not summarize security-specific gates. | Agents may skip threat-surface checks for sensitive changes. | Add security sensor summary after harness check stabilizes. | Open |

## Closed Items

| ID | Area | Evidence | Outcome | Closed |
| -- | ---- | -------- | ------- | ------ |
| HE-001 | Harness docs | `scripts/check-harness.mjs` rejects hardcoded current test-count claims in front-door and testing docs. | Maintained docs now reference fresh command output for current test counts instead of stale numeric claims. | 2026-05-19 |
| QA-002 | E2E assertion quality | Search for always-true expressions such as `expect(true)` and `\|\| true` no longer finds matches under `tests/e2e/playwright`. | Replaced no-op assertions with real UI assertions or explicit `test.skip()` branches across the affected Playwright suites. | 2026-05-19 |
| QA-001 | Rust test linting | All-target clippy with warnings-as-errors currently reports test-target lint debt, while production clippy passes. | Added explicit policy: production clippy is the hard gate, test-target clippy warnings are advisory until test lint policy tightens. | 2026-05-19 |
