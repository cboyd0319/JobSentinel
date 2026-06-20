# Five-Tuple Harness Audit

Date: 2026-06-01.

Source frameworks:

- The [WalkingLabs Lecture 02](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-02-what-a-harness-actually-is/)
  model describes instructions, tools, environment, state, and feedback.
- The [WalkingLabs harness-creator skill](https://github.com/walkinglabs/learn-harness-engineering/blob/main/skills/harness-creator/README.md)
  scores instructions, state, verification, scope, and lifecycle.

Current executable scorecard:
[five-tuple-scorecard-2026-06-01.md](five-tuple-scorecard-2026-06-01.md).

## Scope

This audit covers the JobSentinel agent harness as used for local Codex work:

- `AGENTS.md`
- `docs/harness/`
- `docs/plans/active/`
- `docs/plans/tech-debt-tracker.md`
- `package.json` scripts
- `scripts/check-*.mjs`
- `scripts/harness/checks/`

## Baseline Score

| Subsystem | Score | Evidence | Gap |
| --------- | ----- | -------- | --- |
| Instructions | 4 | `AGENTS.md` is short, points to source-of-truth docs, and names Rule 0, privacy, audience, commands, and review bar. | It still relies on agents choosing when to run lifecycle checks. |
| State | 4 | `docs/plans/active/status.md`, active plans, handoff docs, and the tech-debt tracker preserve current work. | State is mostly prose, not a one-command snapshot. |
| Verification | 5 | `verification-matrix.md`, `npm run harness:check`, focused script tests, bloat checks, external-AI checks, and release gates are strong and current. | Full product verification still requires human judgment and platform-specific checks. |
| Scope | 4 | `change-contract.md`, active plans, product copy sensors, and privacy sensors constrain scope well. | Broad goals can still drift unless next-work context is summarized quickly. |
| Lifecycle | 3 | Startup and closeout guidance exist, and active status helps restarts. | There was no one-command session snapshot or five-tuple audit artifact, so agents had to rediscover branch state, current focus, and harness health manually. |

Lowest subsystem: lifecycle.

## Thirty-Minute Improvement Slice

Implemented a lifecycle snapshot command:

```bash
npm run harness:session
```

The command reports:

- branch state
- latest commit
- active plan count
- harness check-module count
- script-test file count
- `scripts/check-repo-bloat.mjs` line count
- five-tuple audit path
- current next-best work from `docs/plans/active/status.md`

Files added or updated:

- `scripts/harness-session.mjs`
- `scripts/tests/harness-session.test.mjs`
- `package.json`
- `docs/harness/README.md`
- `docs/harness/archive/five-tuple-audit-2026-06-01.md`
- `docs/plans/active/status.md`
- `docs/plans/tech-debt-tracker.md`

## Performance Observation

Baseline observation from this audit:

- No `harness:session` command existed in `package.json`.
- Agent orientation required separate reads of `AGENTS.md`, harness docs,
  verification docs, package scripts, active status, and git state.
- First local prototype output exposed lifecycle quality issues: the audit path
  was missing and wrapped next-work items were truncated.

After the improvement, the local working tree produced this single-command
snapshot before the audit commit:

```text
Harness Session Snapshot
Branch: ## main...origin/main [ahead 44]
Latest commit: 4d421146 Extract repo integrity checks
Active plan docs: 5
Harness check modules: 16
Script test files: 26
Bloat runner lines: 1176
Five-tuple audit: docs/harness/archive/five-tuple-audit-2026-06-01.md
Next best work:
1. Continue broad-audience fixture audit in less obvious fixture paths outside current sensors, while preserving tech-specific cases only when they test explicit branch behavior or source-realism parser contracts.
2. Continue splitting oversized mixed sensors and consider the next orchestration cleanup inside `scripts/check-repo-bloat.mjs`.
3. Continue zero-technical-knowledge UX review across setup, settings, recovery, feedback, empty states, and error screens.
4. Continue broad-audience review so non-technical and technical job searches both feel first-class.
5. Continue backend/scraper and frontend privacy-edge review.
6. Continue the next zero-technical-knowledge UX audit area outside support/reporting.
7. Run final broad verification only when the remaining known work has evidence.
```

Observed performance change:

- Startup context collection now has a single command instead of repeated manual
  reads for basic branch, status, plan, and harness-health facts.
- Wrapped next-work items are preserved, reducing restart ambiguity.
- The audit artifact is now discoverable by the command, so lifecycle evidence
  is durable instead of chat-only.

## Post-Improvement Score

| Subsystem | Before | After | Reason |
| --------- | ------ | ----- | ------ |
| Instructions | 4 | 4 | Instructions now mention the session command, but the main improvement was lifecycle. |
| State | 4 | 4 | State is easier to observe, but source-of-truth docs remain prose-heavy. |
| Verification | 5 | 5 | Verification already had strong command coverage. |
| Scope | 4 | 4 | Next-work visibility improved, but scope policy did not materially change. |
| Lifecycle | 3 | 4 | Session start and handoff now have a one-command, tested snapshot. |

## Remaining Work

- Keep `npm run harness:session` output compact enough for quick restarts.
- Keep `docs/plans/index.json` current when active workstreams change.
- Keep `npm run harness:score` at 100/100 for repo-managed harness evidence.
- Use this audit format after major harness changes to see whether agent
  performance improves or only documentation volume increases.
