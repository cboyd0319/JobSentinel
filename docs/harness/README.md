# Harness Engineering

JobSentinel uses harness engineering to make agent-assisted development more
reliable. The model is only one part of the system. The repo, docs, scripts,
tests, permissions, plans, and feedback loops are the harness.

## Goal

Make each coding session easy to ground, easy to verify, and hard to drift.
Agents should find the right context, make scoped changes, run the right
checks, and leave durable evidence for the next run.

## Current Standard

Use this structure:

| Layer | JobSentinel artifact | Purpose |
| ----- | -------------------- | ------- |
| Entry guide | `AGENTS.md` | Short map and hard repo rules |
| Knowledge base | `docs/` | Versioned source of truth |
| Change contract | `docs/harness/change-contract.md` | Acceptance criteria before edits |
| Plans | `docs/plans/` | Multi-step work, progress, decisions |
| Sensors | `docs/harness/verification-matrix.md` | Checks by change type |
| Drift control | `docs/harness/entropy-control.md` | Cleanup cadence and debt tracking |
| Source notes | `docs/harness/sources.md` | Research basis and adoption decisions |

## Operating Loop

1. Start from `AGENTS.md`.
2. Read relevant docs and code paths.
3. Write or update a change contract for non-trivial work.
4. Implement the smallest coherent slice.
5. Run sensors from `verification-matrix.md`.
6. Update docs and plan state.
7. Record remaining gaps in `docs/plans/tech-debt-tracker.md`.

## Guide And Sensor Model

Guides constrain the agent before it acts. Sensors inspect work after it acts.
JobSentinel needs both.

Guides:

- `AGENTS.md`
- `docs/developer/ARCHITECTURE.md`
- `docs/features/*.md`
- `docs/security/*.md`
- `docs/harness/change-contract.md`
- plan templates in `docs/plans/templates/`

Sensors:

- TypeScript checks and ESLint.
- Frontend architecture boundary checks.
- Security sensor coverage checks.
- Vitest unit and integration tests.
- Playwright E2E tests.
- Rust formatting, clippy, and tests.
- `npm run harness:check`.
- PR review checklist.
- Human review for product, security, and irreversible behavior.

## Agent-Legible Repo Rules

- Prefer short, indexed docs over one large instruction file.
- Make contracts explicit: problem, scope, acceptance, files, risks, sensors.
- Prefer deterministic checks before inferential review.
- Promote repeated review comments into docs, scripts, or tests.
- Keep current behavior discoverable from repo files, not chat history.
- Treat prompt files, plans, and scripts as maintained software.

## Minimum Viable Harness For Each Change

- Clear task scope.
- Relevant files inspected.
- Acceptance criteria listed for non-trivial work.
- Smallest relevant verification run.
- Docs updated when behavior or workflow changes.
- Known gaps captured instead of buried in chat.

## Related Docs

- [Sources](sources.md)
- [Agent operating model](agent-operating-model.md)
- [Change contract](change-contract.md)
- [Verification matrix](verification-matrix.md)
- [Entropy control](entropy-control.md)
- [Exec plans](../exec-plans.md)
