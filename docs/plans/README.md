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
| v2.9.0 completion and full-feature roadmap | [Release and roadmap plan](active/v2.9.0-completion-and-full-feature-roadmap.md) |

## Plan Requirements

Each broad plan follows [the exec-plan template](templates/exec-plan-template.md):

1. **Problem** - What needs to change and why.
2. **Scope** - What is in and out.
3. **Success Criteria** - Observable result, user-ease result, and verification
   result.
4. **Audience And Ease** - Primary user, assumed technical knowledge, broad
   job-seeker fit, and support or recovery path.
5. **Risks** - Risks and mitigations.
6. **Orchestration** - Whether the work stays local or uses coordinated agents.
7. **Milestones** - Small checkable steps.
8. **Verification** - Exact commands and evidence required before completion.
9. **Progress, Discoveries, Decisions, Outcomes, and Handoff** - Durable state
   for review and restart.

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
