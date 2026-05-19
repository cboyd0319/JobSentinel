# Exec Plans

Exec plans are durable plans for multi-step work. They make long-running agent
sessions resumable and reviewable.

## Location

- Active plans: `docs/plans/active/`
- Completed plans: `docs/plans/completed/`
- Templates: `docs/plans/templates/`
- Debt tracker: `docs/plans/tech-debt-tracker.md`

## Required Shape

Use these headings:

```text
# Title

## Problem

## Scope

## Risks

## Milestones

## Verification

## Progress

## Discoveries

## Decisions

## Outcomes
```

## Rules

- Add an exec plan for broad features, migrations, security work, repo cleanup,
  release work, or multi-session changes.
- Keep tasks bite-sized and check them off as they complete.
- Record decisions when the plan changes.
- Record verification commands with outcomes.
- Move completed plans to `docs/plans/completed/`.

## Template

Use [exec-plan-template.md](plans/templates/exec-plan-template.md).
