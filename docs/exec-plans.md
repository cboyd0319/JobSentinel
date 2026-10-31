<!-- Defines durable plan structure and canonical execution-state routing. -->

# Exec Plans

Exec plans are durable plans for multi-step work. They make long-running agent
sessions resumable and reviewable.

## Location

- Active plan owners: `docs/plans/index.json`; the v3 master remains under `docs/plans/v3/`.
- Other active plans: `docs/plans/active/`
- Completed plans: `docs/plans/completed/`
- Templates: `docs/plans/templates/`
- Debt tracker: `docs/plans/tech-debt-tracker.md`

## Required Shape

Use these headings:

```text
# Title

## Problem

## Scope

## Success Criteria

## Audience And Ease

## Risks

## Orchestration

## Milestones

## Verification

## Progress

## Discoveries

## Decisions

## Outcomes

## Handoff
```

## Rules

- Add an exec plan for broad features, migrations, security work, repo cleanup,
  release work, or multi-session changes.
- Keep tasks bite-sized and check them off as they complete.
- Record decisions when the plan changes.
- Record verification commands with outcomes and distinguish development from release acceptance.
- Release plans must end with separate full Stability, Performance and Security phases,
  in order, as defined by the [Release Contract](developer/RELEASING.md#mandatory-final-release-phases).
- Move completed plans to `docs/plans/completed/`.

## Template

Use [exec-plan-template.md](plans/templates/exec-plan-template.md).
