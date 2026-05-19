# Technical Debt Tracker

Use this file for durable debt that affects agent reliability, architecture,
security, or developer workflow.

## Open Items

| ID | Area | Evidence | Risk | Next step | Status |
| -- | ---- | -------- | ---- | --------- | ------ |
| HE-001 | Harness docs | Version and test-count claims appear in several docs. | Agents may trust stale status. | Add freshness check for version and test-count claims. | Open |
| HE-002 | Architecture sensors | Frontend module boundaries are not mechanically enforced. | Agents may create imports that blur feature, service, and UI layers. | Evaluate dependency-cruiser or ESLint boundary rules. | Open |
| HE-003 | Security sensors | Local harness check does not summarize security-specific gates. | Agents may skip threat-surface checks for sensitive changes. | Add security sensor summary after harness check stabilizes. | Open |

## Closed Items

None yet.
