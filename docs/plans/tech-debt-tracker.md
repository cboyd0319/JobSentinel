# Technical Debt Tracker

Use this file for durable debt that affects agent reliability, architecture,
security, or developer workflow.

## Open Items

| ID | Area | Evidence | Risk | Next step | Status |
| -- | ---- | -------- | ---- | --------- | ------ |
| HE-001 | Harness docs | Front-door version claims are checked by `scripts/check-harness.mjs`; test-count claims remain manual. | Agents may trust stale test status. | Add freshness check for test-count claims. | Open |
| HE-002 | Architecture sensors | Frontend module boundaries are not mechanically enforced. | Agents may create imports that blur feature, service, and UI layers. | Evaluate dependency-cruiser or ESLint boundary rules. | Open |
| HE-003 | Security sensors | Local harness check does not summarize security-specific gates. | Agents may skip threat-surface checks for sensitive changes. | Add security sensor summary after harness check stabilizes. | Open |
| QA-001 | Rust test linting | `cargo clippy --all-targets -- -D warnings` reports existing test-target lint debt; CI currently runs `cargo clippy -- -D warnings`. | Test-only warnings can hide real regression risk if all-targets becomes required later. | Either clean test lints incrementally or add an explicit test-target lint policy. | Open |

## Closed Items

None yet.
