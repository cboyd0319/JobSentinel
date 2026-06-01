# Walking Labs Harness Creator Skill Evaluation

Research date: 2026-05-31.

Last updated: 2026-06-01.

Sources:

- [Walking Labs skills directory](https://github.com/walkinglabs/learn-harness-engineering/tree/main/skills)
- [Harness creator skill](https://github.com/walkinglabs/learn-harness-engineering/tree/main/skills/harness-creator)

## What The Skill Adds

The `harness-creator` skill packages a generic harness around five structural
areas: instructions, state, verification, scope, and lifecycle. Its bundled
validator looks for root-level compatibility files:

- `AGENTS.md` or `CLAUDE.md`
- `feature_list.json` or `feature-list.json`
- `progress.md`
- `session-handoff.md`
- `init.sh`

Its own README says the score is structural and does not replace real
before/after agent-session testing.

## Direct Validator Result

I inspected the bundled validator and support library before running it. The
scripts use Node.js built-in modules and read a small fixed set of root files.
I then ran the validator from a temporary directory against JobSentinel without
writing files into the repo.

Observed structural score:

| Area | Score | Reason |
| ---- | ----- | ------ |
| Instructions | 2/5 | `AGENTS.md` exists and exposes verification commands, but does not use the validator's exact startup and done phrasing. |
| State | 1/5 | JobSentinel keeps state under `docs/plans/`, not root `feature_list.json` or `progress.md`. |
| Verification | 3/5 | Test, lint, build, and evidence language exist, but no root `init.sh` is present. |
| Scope | 1/5 | JobSentinel has scoped plans and change contracts, but not the validator's root feature tracker and exact one-feature wording. |
| Lifecycle | 1/5 | JobSentinel has active handoff docs, but not root `session-handoff.md` or `init.sh`. |

Overall score: 32/100. Bottleneck: state.

This score is useful as an interoperability signal, not as a quality score.
JobSentinel already has richer harness state in `docs/plans/active/`,
`docs/plans/completed/`, `docs/plans/tech-debt-tracker.md`, and
`docs/harness/verification-matrix.md`.

## Adoption Decision

Adopt:

- Keep root `AGENTS.md` short and route deeper context into `docs/`.
- Keep deterministic checks as the real harness score:
  `npm run harness:score`, `npm run harness:check`, `npm run doctor`, lint,
  tests, Rust checks, and E2E checks by risk.
- Keep explicit session state in versioned plans and handoffs.
- Consider a structural compatibility adapter if outside harness tools become
  important.

Do not adopt yet:

- Do not add root `feature_list.json`, `progress.md`, `session-handoff.md`, or
  `init.sh` only to satisfy a generic validator. That would create duplicate
  state unless the files are generated from current `docs/plans/` and
  `docs/harness/` sources.
- Do not move `docs/harness/verification-matrix.md` to root. Root stays clean;
  `AGENTS.md` already routes agents to the matrix.

## Follow-Up Option

If compatibility with generic harness validators becomes valuable, build a
repo-native adapter that generates temporary compatibility files from current
source-of-truth docs, then runs the external validator against those generated
files. The generated files should stay out of source control unless they become
owned front-door artifacts.

## Repo-Native Score

JobSentinel now has a repo-native structural scorer instead of duplicating
root `feature_list.json`, `progress.md`, `session-handoff.md`, or `init.sh`.

```bash
npm run harness:score
```

The command scores both:

- Lecture tuple: instructions, tools, environment, state, feedback.
- Harness-creator tuple: instructions, state, verification, scope, lifecycle.

Current target: 100/100 with every repo-managed subsystem at 5/5. This is a
structural harness score only; it does not replace real product verification,
platform checks, or before/after agent-session testing.
