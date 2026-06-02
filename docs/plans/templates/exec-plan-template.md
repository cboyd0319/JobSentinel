# Plan Title

## Problem

What needs to change and why.

## Scope

In scope:

- Item.

Out of scope:

- Item.

## Success Criteria

- Observable result:
- User-ease result:
- Verification result:

## Audience And Ease

- Primary user:
- Technical knowledge assumed:
- Broad job-seeker fit:
- Support or recovery path:

## Risks

- Risk and mitigation.

## Orchestration

- Use one agent when the work is small or tightly coupled.
- Use the architect/coordinator model for larger multi-step work with disjoint
  code, docs, tests, review, or verification slices.
- Sub-agents must follow `AGENTS.md`, the harness, Rule 0, and this plan. No
  exceptions.

## Milestones

- [ ] Inspect current behavior and docs.
- [ ] Update tests or sensors.
- [ ] Implement changes.
- [ ] Update docs.
- [ ] Run verification.
- [ ] Record open gaps or rollback path.

## Verification

```bash
npm run harness:check
```

Add feature-specific commands here.

## Progress

| Date | Status | Notes |
| ---- | ------ | ----- |
| YYYY-MM-DD | Planned | Initial plan. |

## Discoveries

- Discovery.

## Decisions

- Decision.

## Outcomes

- Outcome.

## Handoff

- Current state:
- Evidence:
- Next step:
- Open risks:
