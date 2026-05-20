# Plans

This folder contains durable plans for release, feature, refactor, security, and
harness work.

## Structure

- `active/` - Work in progress.
- `completed/` - Finished plans with outcomes.
- `templates/` - Reusable plan and change-contract templates.
- `tech-debt-tracker.md` - Durable debt and harness drift.

See [Exec Plans](../exec-plans.md) for required format.

## Current Release Plans

| Version | Status | Document |
| ------- | ------ | -------- |
| v2.7.0 | Unreleased | [Beta feedback system](completed/beta-feedback-system.md) |

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
| v2.7.0 | Complete on main | [Beta feedback system](completed/beta-feedback-system.md) |
| v2.6.x | Complete on main | [Undo and redo wiring](completed/undo-redo-wiring.md) |
| v2.6.0 | Complete | [v2.6.0-ux-improvements.md](./v2.6.0-ux-improvements.md) |
| v2.5.0 | Complete | No formal plan. |
| v2.0.0 | Complete | No formal plan. |
| v1.0.0 | Complete | No formal plan. |

Starting with the harness alignment work, broad changes should use
`docs/plans/active/` and move completed plans to `docs/plans/completed/`.
