# Harness Engineering

JobSentinel uses harness engineering to keep agent-assisted development
grounded and verifiable. The repo, docs, scripts, tests, permissions, state,
and feedback loops are the harness.

## Goal

Make each session easy to ground, easy to verify, and hard to drift. Agents
should load a small map first, select deeper context only when the task needs
it, make scoped changes, run the right checks, and leave durable evidence.

For user-facing work, the harness also protects product ease: JobSentinel is
for any job seeker, not only engineers, and it must not assume terminal,
debugging, or GitHub skill.

JobSentinel is free, will always stay free, and will always remain MIT licensed.
Please fork this code, adapt it, and help more job seekers if that fits your use.

## Rule 0

User privacy and security are non-negotiable. No code change, documentation
change, test shortcut, external AI feature, source adapter, support flow, or
research workflow may set aside local-first storage, credential safety, source
boundaries, explicit user review, or privacy-preserving defaults. If Rule 0
conflicts with convenience, automation, speed, analytics, or research value,
Rule 0 wins.

Restricted-source job sites stay user-directed and warning-gated. Native paths
such as search links, pasted single-job links, Browser Import, and manual entry
must not collect login details or session cookies, bypass platform controls, or
run hidden background access. Before release, all configured source adapters and
user-gated restricted-source paths need focused parser/import/gate coverage and
manual validation where the UI exposes them.

Machine-specific absolute local paths are private data and portability breaks.
Docs and code must use repo-relative paths, file names, or `<repo-root>` and
`<home>` placeholders instead. Synthetic local paths are allowed only in tests
that prove redaction or sanitizer behavior.

## Context Budget

Always-read docs are maps, not manuals.

| File | Budget | Job |
| ---- | ------ | --- |
| `AGENTS.md` | 160 lines | Startup rules and source-of-truth order |
| `docs/harness/README.md` | 160 lines | Harness map and hard invariants |
| `docs/plans/active/status.md` | 140 lines | Current state, evidence, next work |
| `docs/plans/active/current-work.md` | 220 lines | Active goal contract |

Detailed history belongs in `docs/plans/archive/`, dated harness evaluations,
or git history. Load those files only when old decision context is needed.
`npm run harness:check` enforces this budget.

## Current Standard

Use this structure:

| Layer | Artifact | Purpose |
| ----- | -------- | ------- |
| Entry guide | `AGENTS.md` | Short map and hard repo rules |
| Harness map | `docs/harness/README.md` | This file |
| Active status | `docs/plans/active/status.md` | Compact restart state and next work |
| Active plan index | `docs/plans/index.json` | Machine-readable workstream map |
| Change contract | `docs/harness/change-contract.md` | Acceptance criteria before edits |
| Verification matrix | `docs/harness/verification-matrix.md` | Checks by change type |
| Design contract | `DESIGN.md`, `docs/design/README.md`, `docs/design/design-spec.md` | Quiet Shield rules |
| Multi-agent orchestration | `docs/harness/multi-agent-orchestration.md` | Coordinator contract |
| Experience contract | `docs/style-guide/` | Plain-language review |
| Support path | `docs/user/QUICK_START.md`, issue templates | User-safe recovery |
| Privacy/AI boundary | `PRIVACY.md`, `RESPONSIBLE_AI.md`, `docs/architecture/privacy-first-ai-gateway.md` | Local-first and external-AI gate |
| Policy manifest | `docs/harness/manifest.json` | Required files, snippets, wiki inventory |

## Session Start Checklist

For non-trivial work, capture this before edits:

- Goal, user, and success condition.
- Relevant source-of-truth docs and code paths inspected.
- Audience and ease risk, especially any zero-technical-skill assumption.
- Design contract impact, or why the change does not touch UI or UX.
- Privacy, local-data, external-side-effect, and Rule 0 boundary.
- Exact verification path and rollback path.
- Plan or handoff file to update if the work spans context limits.

## Operating Loop

1. Start from `AGENTS.md`.
2. Read this file and `docs/plans/active/status.md`.
3. Read only the feature, architecture, design, or security docs needed for the
   touched surface.
4. Write or update a change contract for non-trivial work.
5. Implement the smallest coherent slice.
6. Run `npm run harness:plan -- --since origin/main` for focused verification.
7. Run sensors from `docs/harness/verification-matrix.md`.
8. Remove disposable artifacts and inspect the diff.
9. Update docs and plan state.
10. Record repeated gaps in `docs/plans/tech-debt-tracker.md`.

Use `npm run harness:session -- --limit 2` for a compact restart snapshot,
`npm run harness:session -- --json` for machine-readable state,
`npm run harness:score` after harness changes, and
`npm run harness:benchmark` when before/after evidence matters.

## Guide And Sensor Model

Guides constrain the agent before it acts. Sensors inspect work after it acts.

Guides include `AGENTS.md`, design docs, architecture docs, feature docs,
security docs, change contracts, and active plans.

Sensors include TypeScript/ESLint, Vitest, Playwright, Rust checks, security
sensors, external-AI gateway checks, repo-bloat checks, test-quality checks,
machine-specific local path checks, `npm run doctor`, `npm run harness:check`,
`npm run harness:score`, and human review for product, security, or
irreversible behavior.

Treat the redesign as a harness-controlled active-goal acceptance gate. UI and
UX changes must preserve or move toward `DESIGN.md` and
`docs/design/design-spec.md`; broad visual changes need Computer Use or
Playwright screenshot evidence before release work resumes.

## Minimum Viable Harness For Each Change

- Clear task scope.
- Relevant files inspected.
- Design impact recorded, or reason no UI/UX impact exists.
- Acceptance criteria for non-trivial work.
- Smallest relevant verification run.
- Docs and public wiki updated when behavior or workflow changes.
- Known gaps captured instead of buried in chat.

## External Public Docs

The public GitHub wiki at `https://github.com/cboyd0319/JobSentinel/wiki` is a
docs surface. Keep it current when behavior, setup, commands, architecture,
security, release flow, capabilities, screenshots, design, or copy changes.
Its inventory lives in `docs/harness/manifest.json`.

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
- [Agent operating model](agent-operating-model.md)
- [Change contract](change-contract.md)
- [Verification matrix](verification-matrix.md)
