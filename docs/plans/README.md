# Plans

This folder contains durable plans for release, feature, refactor, security, and
harness work.

## Structure

- `active/` - Work in progress.
- `archive/` - Preserved historical plan state that should not slow restarts.
- `completed/` - Finished plans with outcomes.
- `index.json` - Machine-readable active workstream index used by the harness
  score and session snapshot.
- `templates/` - Reusable plan and change-contract templates.
- `tech-debt-tracker.md` - Durable debt and harness drift.

See [Exec Plans](../exec-plans.md) for required format.

## Current Active Plans

| Workstream | Document |
| ---------- | -------- |
| Current active status | [Compact status](active/status.md) |
| Current product and quality work | [Active plan](active/current-work.md) |

## Plan Requirements

Each release plan includes:

1. **Executive Summary** - What and why
2. **Pre-Sprint Audit** - What exists vs what's needed
3. **Detailed Tasks** - Implementation specs with code examples
4. **Execution Plan** - Parallelization strategy with time estimates
5. **Success Criteria** - How we know it's done
6. **Risks & Mitigations** - What could go wrong
7. **Rollback Plan** - How to recover if needed
8. **Verification** - Exact sensors required before completion
9. **Outcomes** - Final result and open items

## Archived Plans

| Version | Status | Document |
| ------- | ------ | -------- |
| Feedback workflow | Complete on main | [Beta feedback system](completed/beta-feedback-system.md) |
| v2.6.x | Complete on main | [Undo and redo wiring](completed/undo-redo-wiring.md) |
| v2.6.0 | Complete | [v2.6.0 UX improvements](completed/v2.6.0-ux-improvements.md) |
| Superseded active history | Archived | [Guided intake](archive/guided-job-search-intake-superseded-2026-06-04.md), [cleanup sweep](archive/repo-cleanup-and-quality-sweep-superseded-2026-06-04.md), [cleanup handoff](archive/repo-cleanup-handoff-superseded-2026-06-04.md), [research-backed improvements](archive/research-backed-product-improvements-superseded-2026-06-04.md) |
| v2.5.0 | Complete | No formal plan. |
| v2.0.0 | Complete | No formal plan. |
| v1.0.0 | Complete | No formal plan. |

Starting with the harness alignment work, broad changes should use
`docs/plans/active/` and move completed plans to `docs/plans/completed/`.
Historical progress rows can move to `docs/plans/archive/` when they are useful
for provenance but too noisy for active restart context.
