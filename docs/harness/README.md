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
research workflow may set aside local-first storage, credential safety, source
boundaries, explicit user review, or privacy-preserving defaults. If Rule 0
conflicts with convenience, automation, speed, analytics, or research value,
Rule 0 wins.

Machine-specific absolute local paths are private data and portability breaks.
Docs and code must use repo-relative paths, file names, or `<repo-root>` and
`<home>` placeholders instead. Synthetic local paths are allowed only in tests
that prove redaction or sanitizer behavior.

## Current Standard

Use this structure:

| Layer | JobSentinel artifact | Purpose |
| ----- | -------------------- | ------- |
| Entry guide | `AGENTS.md` | Short map and hard repo rules |
| Knowledge base | `docs/` | Versioned source of truth |
| Active status | `docs/plans/active/status.md` | Current restart surface for goal state, next work, completion bar, and latest evidence |
| Change contract | `docs/harness/change-contract.md` | Acceptance criteria before edits |
| Multi-agent orchestration | `docs/harness/multi-agent-orchestration.md` | Architect/coordinator and sub-agent contract for larger multi-step work |
| Policy manifest | `docs/harness/manifest.json` | Required harness files, policy snippets, and README reference-source coverage |
| Feature privacy labels | `docs/harness/feature-privacy-labels.json` | Machine-readable feature labels for local-only, external-AI, sensitive, and public-data boundaries |
| Plans | `docs/plans/` | Multi-step work, progress, decisions |
| Active plan index | `docs/plans/index.json` | Machine-readable active workstream map for restart and scoring |
| Design contract | `DESIGN.md`, `docs/design/README.md`, `docs/design/design-spec.md` | Locked Quiet Shield redesign, screen contracts, privacy UX, responsive rules, and visual verification expectations |
| Session snapshot | `npm run harness:session` | One-command restart surface for branch state, active plan count, indexed workstreams, harness score, harness module/test counts, bloat-runner size, and next work. Use `npm run harness:session -- --json` when a machine-readable snapshot is needed, and `npm run harness:session -- --limit 2` to cap next-work items |
| Harness score | `npm run harness:score` | Repo-native five-tuple evidence score for the WalkingLabs lecture and harness-creator tuples |
| Harness benchmark | `npm run harness:benchmark` | Portable before/after benchmark output for score, session metrics, next work, and recommendation |
| Verification plan | `npm run harness:plan -- --since origin/main` | Diff-aware command plan for changed files, focused tests, and required harness sensors |
| Sensors | `docs/harness/verification-matrix.md` | Checks by change type |
| Environment doctor | `npm run doctor`, `npm run doctor:e2e` | Local readiness check for Node, npm, Rust, Tauri, SQLx offline setup, Linux Tauri packages, and Playwright browser launch |
| Experience contract | `docs/style-guide/` | Plain-language, broad-audience, zero-technical-skill review |
| Support path | `docs/user/QUICK_START.md`, issue templates | Recovery and support report flow users can operate |
| Public wiki | `https://github.com/cboyd0319/JobSentinel/wiki` | External public docs that must stay current with behavior, setup, architecture, security, releases, capabilities, and user-facing copy |
| Privacy/AI boundary | `PRIVACY.md`, `RESPONSIBLE_AI.md`, `docs/architecture/privacy-first-ai-gateway.md` | Local-first defaults, external AI opt-in, payload preview, and responsible-use guardrails |
| Drift control | `docs/harness/entropy-control.md` | Cleanup cadence and debt tracking |
| Source notes | `docs/harness/sources.md` | Research basis and adoption decisions |

## Session Start Checklist

For non-trivial work, capture this before edits:

- Goal, user, and success condition.
- Relevant source-of-truth docs and code paths inspected.
- Audience and ease risk, especially any zero-technical-skill assumption.
- Design contract impact: whether the work touches Quiet Shield redesign,
  Protective Navy migration, screen contracts, empty states, toasts, forms,
  settings, navigation, or saved-secret UX.
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
7. For larger multi-step work, use
   `docs/harness/multi-agent-orchestration.md` to split safe parallel slices
   while keeping the coordinator accountable for review and integration.
8. Write or update a change contract for non-trivial work.
9. Choose user, privacy, and verification sensors before edits.
10. Implement the smallest coherent slice.
11. Run sensors from `verification-matrix.md`.
12. Remove disposable artifacts and inspect the diff.
13. Update docs and plan state.
14. Record remaining gaps in `docs/plans/tech-debt-tracker.md`.

## Guide And Sensor Model

Guides constrain the agent before it acts. Sensors inspect work after it acts.
JobSentinel needs both.

Guides:

- `AGENTS.md`
- `docs/developer/ARCHITECTURE.md`
- `DESIGN.md`
- `docs/design/README.md`
- `docs/design/design-spec.md`
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
- Tracked maintainable file-size checks: frontend/Rust source files and tests
  should stay at or below 1,200 lines, harness scripts at or below 900 lines,
  and non-archive docs at or below 900 lines. Current oversized files are
  explicit legacy debt and may shrink, but may not grow.
- User experience checks against zero-technical-skill and broad-audience rules.
- Design checks against Quiet Shield, Protective Navy, stable layout, wrapping,
  keyboard, accessibility, empty-state, toast, modal, and saved-secret UX
  contracts.
- Vitest unit and integration tests.
- Playwright E2E tests.
- Rust formatting, clippy, and tests.
- External public docs freshness check for the GitHub wiki.
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
- Treat the redesign as a harness-controlled active-goal acceptance gate. UI
  and UX changes must preserve or move toward `DESIGN.md` and
  `docs/design/design-spec.md`; do not introduce new green-heavy, cramped,
  horizontal-scroll, nested-card, or passive secure-storage-prompt patterns.
  Broad visual changes must record Computer Use or Playwright screenshot
  evidence in the active plan or status docs before release work resumes.
- Treat prompt files, plans, and scripts as maintained software.
- Put repeated failures into a sensor when the rule is cheap to check.
- Never commit machine-specific absolute local paths. Use repo-relative paths,
  file names, or `<repo-root>` and `<home>` placeholders.
- Keep the whole public GitHub wiki current when behavior, setup, commands,
  architecture, security, release flow, capabilities, or user-facing copy
  changes. The wiki is external public documentation, so stale claims there
  are product drift.
- For larger multi-step work, use the architect/coordinator model and delegate
  disjoint slices when it reduces elapsed time without weakening harness
  compliance.
- Sub-agents must follow the same harness as the coordinator. No exceptions.
- Keep support report paths one-click where a normal user can find
  them.
- Keep external AI optional, disabled by default, and routed through the AI
  gateway with payload preview, approval, minimization, and local metadata
  logging.
- Treat Rule 0 as a release blocker. Do not land a feature that weakens user
  privacy or security without redesigning it first.

## Minimum Viable Harness For Each Change

- Clear task scope.
- Relevant files inspected.
- Design contract impact recorded, or reason the change does not touch UI or
  UX.
- Acceptance criteria listed for non-trivial work.
- Smallest relevant verification run.
- Repo docs and the public GitHub wiki updated when behavior or workflow
  changes.
- Known gaps captured instead of buried in chat.

## External Public Docs

The public GitHub wiki at `https://github.com/cboyd0319/JobSentinel/wiki` is
part of the docs surface, even though it is stored in a separate Git
repository. Treat every wiki page as public product documentation.
The current page inventory lives in `docs/harness/manifest.json` under
`publicWiki.requiredPages`; update that inventory when wiki pages are added,
renamed, or retired.

Update the wiki when a change affects:

- Current or planned capabilities.
- Setup, install, troubleshooting, or platform support.
- Architecture, privacy, security, external AI, or data boundaries.
- Release status, version claims, packaging, or verification flow.
- User-facing behavior, copy, support paths, or screenshots.

To update it from Git:

```bash
git clone https://github.com/cboyd0319/JobSentinel.wiki.git <wiki-worktree>
cd <wiki-worktree>
git pull --ff-only
# edit the affected *.md pages
git add <wiki-pages>.md
git commit -m "Update wiki docs"
git push origin HEAD
```

The wiki remote currently exposes `master` as its default branch. Use
`git push origin HEAD` so the checked-out branch controls the destination.

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
- [Multi-agent orchestration contract](multi-agent-orchestration.md)
- [Change contract](change-contract.md)
- [Verification matrix](verification-matrix.md)
- [Entropy control](entropy-control.md)
- [Exec plans](../exec-plans.md)
