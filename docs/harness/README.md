# Harness Engineering

JobSentinel uses harness engineering to make agent-assisted development more
reliable. The model is only one part of the system. The repo, docs, scripts,
tests, permissions, plans, and feedback loops are the harness.

## Goal

Make each coding session easy to ground, easy to verify, and hard to drift.
Agents should find the right context, make scoped changes, run the right
checks, and leave durable evidence for the next run. For user-facing work,
the harness also protects product ease: JobSentinel is for any job seeker, not
only engineers, and it must not assume terminal, debugging, or GitHub skill.

JobSentinel is free, will always stay free, and will always remain MIT
licensed. Contributions are welcome, but reuse is also welcome: if someone can
fork this code, adapt it, and help more job seekers, that fits the project
mission.

## Rule 0

User privacy and security are non-negotiable. No code change, documentation
change, test shortcut, external AI feature, source adapter, support flow, or
research workflow may bypass local-first storage, credential safety, source
boundaries, explicit user review, or privacy-preserving defaults. If Rule 0
conflicts with convenience, automation, speed, analytics, or research value,
Rule 0 wins.

## Current Standard

Use this structure:

| Layer | JobSentinel artifact | Purpose |
| ----- | -------------------- | ------- |
| Entry guide | `AGENTS.md` | Short map and hard repo rules |
| Knowledge base | `docs/` | Versioned source of truth |
| Active status | `docs/plans/active/status.md` | Compact restart surface for current goal state, next work, and completion bar |
| Change contract | `docs/harness/change-contract.md` | Acceptance criteria before edits |
| Policy manifest | `docs/harness/manifest.json` | Required harness files, policy snippets, and README reference-source coverage |
| Plans | `docs/plans/` | Multi-step work, progress, decisions |
| Active plan index | `docs/plans/index.json` | Machine-readable active workstream map for restart and scoring |
| Session snapshot | `npm run harness:session` | One-command restart surface for branch state, active plan count, indexed workstreams, harness score, harness module/test counts, bloat-runner size, and next work |
| Harness score | `npm run harness:score` | Repo-native five-tuple evidence score for the WalkingLabs lecture and harness-creator tuples |
| Harness benchmark | `npm run harness:benchmark` | Portable before/after benchmark output for score, session metrics, next work, and recommendation |
| Verification plan | `npm run harness:plan -- --since origin/main` | Diff-aware command plan for changed files, focused tests, and required harness sensors |
| Sensors | `docs/harness/verification-matrix.md` | Checks by change type |
| Environment doctor | `npm run doctor`, `npm run doctor:e2e` | Local readiness check for Node, npm, Rust, Tauri, SQLx offline setup, Linux Tauri packages, and Playwright browser launch |
| Experience contract | `docs/style-guide/` | Plain-language, broad-audience, zero-technical-skill review |
| Support path | `docs/user/QUICK_START.md`, issue templates | Recovery and debug-report flow users can operate |
| Privacy/AI boundary | `PRIVACY.md`, `RESPONSIBLE_AI.md`, `docs/architecture/privacy-first-ai-gateway.md` | Local-first defaults, external AI opt-in, payload preview, and responsible-use guardrails |
| Drift control | `docs/harness/entropy-control.md` | Cleanup cadence and debt tracking |
| Source notes | `docs/harness/sources.md` | Research basis and adoption decisions |

## Session Start Checklist

For non-trivial work, capture this before edits:

- Goal, user, and success condition.
- Relevant source-of-truth docs and code paths inspected.
- Audience and ease risk, especially any zero-technical-skill assumption.
- Privacy, local-data, and external-side-effect boundary.
- Rule 0 impact: user privacy, credential safety, source boundary, and review
  gate.
- Exact verification path and rollback path.
- Plan or handoff file to update if the work spans context limits.

## Operating Loop

1. Start from `AGENTS.md`.
2. Read relevant docs and code paths.
3. Run `npm run harness:session` when resuming a broad goal or handing off a
   long session.
4. Run `npm run harness:score` after harness changes that affect
   instructions, tools, environment, state, feedback, verification, scope, or
   lifecycle.
5. Run `npm run harness:benchmark` before or after harness-tuning sessions
   where before/after evidence matters.
6. Run `npm run harness:plan -- --since origin/main` when changed files need a
   focused verification set.
7. Write or update a change contract for non-trivial work.
8. Choose user, privacy, and verification sensors before edits.
9. Implement the smallest coherent slice.
10. Run sensors from `verification-matrix.md`.
11. Remove disposable artifacts and inspect the diff.
12. Update docs and plan state.
13. Record remaining gaps in `docs/plans/tech-debt-tracker.md`.

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
- External AI gateway checks across code and config files.
- Security sensor coverage checks.
- Test quality checks for no-op, focused, and skipped unit tests.
- Repo bloat checks for disposable artifacts and tracked generated output.
- User experience checks against zero-technical-skill and broad-audience rules.
- Vitest unit and integration tests.
- Playwright E2E tests.
- Rust formatting, clippy, and tests.
- `npm run doctor`.
- `npm run doctor:e2e` when Playwright or browser-flow readiness matters.
- `npm run harness:check`.
- `npm run harness:score`.
- `npm run harness:benchmark`.
- PR review checklist.
- Human review for product, security, and irreversible behavior.

## Agent-Legible Repo Rules

- Prefer short, indexed docs over one large instruction file.
- Make contracts explicit: problem, scope, acceptance, files, risks, sensors.
- Prefer deterministic checks before inferential review.
- Promote repeated review comments into docs, scripts, or tests.
- Keep current behavior discoverable from repo files, not chat history.
- Treat prompt files, plans, and scripts as maintained software.
- Put repeated failures into a sensor when the rule is cheap to check.
- Keep support and debug-report paths one-click where a normal user can find
  them.
- Keep external AI optional, disabled by default, and routed through the AI
  gateway with payload preview, approval, minimization, and local metadata
  logging.
- Treat Rule 0 as a release blocker. Do not land a feature that weakens user
  privacy or security without redesigning it first.

## Minimum Viable Harness For Each Change

- Clear task scope.
- Relevant files inspected.
- Acceptance criteria listed for non-trivial work.
- Smallest relevant verification run.
- Docs updated when behavior or workflow changes.
- Known gaps captured instead of buried in chat.

## When To Add Harness

Add docs, scripts, tests, or templates when at least one condition is true:

- A failure repeated or is likely to repeat.
- A hidden setup, recovery, or verification step can become a command.
- Context loss would make the next session redo investigation.
- A product rule affects user trust, privacy, or ease.
- A reviewer needs evidence that a claim matches current code.

Do not add harness for style preference alone. Prefer the smallest check or doc
that prevents the observed failure.

## Related Docs

- [Sources](sources.md)
- [Five-tuple harness audit](five-tuple-audit-2026-06-01.md)
- [Five-tuple scorecard](five-tuple-scorecard-2026-06-01.md)
- [Deep harness audit](deep-harness-audit-2026-05-31.md)
- [Walking Labs Lecture 02 evaluation](walkinglabs-lecture-02-evaluation.md)
- [Walking Labs harness creator skill evaluation](walkinglabs-harness-creator-skill-evaluation.md)
- [README information design](readme-information-design.md)
- [Agent operating model](agent-operating-model.md)
- [Change contract](change-contract.md)
- [Verification matrix](verification-matrix.md)
- [Entropy control](entropy-control.md)
- [Exec plans](../exec-plans.md)
