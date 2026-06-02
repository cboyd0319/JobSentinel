# Active Plan Status

Last updated: 2026-06-02.

Read this file before opening long active plans. It is the current restart
surface for the active goal; detailed history remains in the active plans,
handoff, tech-debt tracker, and archived progress files.

## Goal State

The repo-wide goal remains open. JobSentinel should keep moving toward zero
known errors, privacy leaks, stale docs, brittle tests, user-facing technical
assumptions, engineer-only defaults, and unverified claims.

All tracked files under `docs/plans/active/` are part of the active goal until
the work is completed, superseded, or moved out of active plans.

The user has authorized multiple sub-agents for isolated audits, research, and
implementation slices that can run without shared-state conflicts. Keep scopes
bounded, preserve user changes, close completed agents promptly, and record
actionable findings in this active-plan surface or the relevant plan.

## Workstreams

| Workstream | State | Current focus | Source |
| ---------- | ----- | ------------- | ------ |
| Repo cleanup and quality sweep | Open | Reliability, stale-doc cleanup, harness debt, privacy/security review, broad verification | [Plan](repo-cleanup-and-quality-sweep.md) |
| Repo cleanup handoff | Open | Operational restart notes and verification evidence | [Handoff](repo-cleanup-handoff.md) |
| Guided job-search intake | Active | Implemented setup slices stay accurate; future work expands guided questioning and search support | [Plan](guided-job-search-intake.md) |
| Research-backed product improvements | Active | Ghost/stale detection, pay protection, long-term unemployment support, bias-aware routes, protective tone, local-first privacy | [Plan](research-backed-product-improvements.md) |

## Current Posture

- Branch was clean and ahead of `origin/main` by 19 commits before the current
  copy and harness slice began. Use `git status --short --branch` for live
  evidence before committing, pushing, or reporting remote state.
- Latest committed frontend verification evidence: `npm run test:run` passed
  110 Vitest files and 2637 tests, `npm run build` passed in 4.13 seconds, and
  `npm run test:scripts` passed 454 script tests.
- Latest committed backend verification evidence: `cargo fmt --all -- --check`
  passed, `cargo test --lib` passed 2489 tests with 21 ignored, and
  `cargo clippy -- -D warnings` reported no issues from `src-tauri`.
- Latest committed security/dependency evidence: `npm run lint:security`,
  `npm run lint:architecture`, `npm run lint:external-ai`,
  `npm run lint:tauri-invokes`, `npm audit --audit-level=moderate`, and
  `cargo deny check advisories` passed. `cargo audit` exited 0 with the known
  allowed upstream/transitive Rust advisory warnings tracked in `SEC-002`.
- Latest committed E2E evidence: `npm run test:e2e:smoke:budget` passed in
  6.22 seconds, and `npm run test:e2e:all:budget` passed 252 Chromium and
  WebKit tests in 123.15 seconds against the 240-second budget.
- Latest local broad-audience and Rule 0 slice fixes read-only sub-agent
  findings: support-report privacy overclaims, visible scoring jargon, Telegram
  setup jargon, approved job-source feed wording, wrapper Rule 0 snippets,
  feature privacy-label freshness, and active-plan status compaction.
- Latest local verification for that slice: `npm run harness:check`,
  `npm run test:scripts`, `npm run lint:docs`, `npm run lint:bloat`,
  `npm run lint`, focused Vitest for eight affected frontend/service test
  files, and `git diff --check` passed. Focused Vitest passed 178 tests.
- No remote CI or push should run unless the user explicitly asks in the current
  turn.

## Latest Slice

Scope:

- User-facing support-report copy must say common private details are hidden and
  remind users to review before sharing.
- Visible product copy must avoid scoring/jargon where a plain label works.
- Agent wrappers and harness manifest must lock in Rule 0, optional external AI,
  zero-technical-knowledge UX, broad job-seeker support, and responsible-use
  boundaries.
- Active plan status must stay a true restart surface; detailed history belongs
  in handoff, plan, debt, or archive docs.

Verification completed for this slice:

```bash
npm run harness:check
npm run test:scripts
npm run lint:docs
npm run lint:bloat
npm run lint
npx vitest run src/components/feedback/SubmitOptions.test.tsx src/pages/Settings.test.tsx src/pages/ResumeOptimizer.test.tsx src/components/AtsLiveScorePanel.test.tsx src/services/aiGateway.test.ts src/services/feedbackService.test.ts src/utils/export.test.ts src/utils/errorMessages.test.ts
git diff --check
```

## Next Best Work

1. Continue zero-technical-knowledge UX review across setup, settings,
   recovery, feedback, empty states, and error screens.
2. Continue broad-audience review so technical and non-technical job searches
   both feel first-class.
3. Continue backend/scraper and frontend privacy-edge review, especially logs,
   reports, notifications, local paths, optional source checks, and external-AI
   boundaries.
4. Continue splitting oversized harness modules only where ownership boundaries
   are clear and verification cost improves.
5. Run final broad verification only when remaining known work has current
   evidence.

## Completion Bar

Do not mark the goal complete until current evidence proves:

- No known repo bloat, stale docs, generated artifacts, or duplicate sources of
  truth remain.
- No known privacy leak remains in logs, command errors, renderer messages,
  reports, credential paths, scraper errors, notifications, or local path
  exposure.
- No known user-facing flow assumes terminal, GitHub, debugging, or engineering
  knowledge.
- No known user-facing flow assumes the job seeker is only an engineer or only
  searching for technical work.
- Relevant sensors cover recurring drift classes.
- Final docs, bloat, security, architecture, frontend, build, Rust, and chosen
  E2E checks pass from the current checkout.
