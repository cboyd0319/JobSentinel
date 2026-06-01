# Five-Tuple Harness Scorecard

Date: 2026-06-01.

Sources:

- [WalkingLabs Lecture 02: What a Harness Actually Is](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-02-what-a-harness-actually-is/)
- [WalkingLabs harness-creator scripts](https://github.com/walkinglabs/learn-harness-engineering/tree/main/skills/harness-creator/scripts)
- [WalkingLabs harness-creator README](https://github.com/walkinglabs/learn-harness-engineering/tree/main/skills/harness-creator)

This scorecard reconciles two related five-tuple frameworks:

- Lecture tuple: instructions, tools, environment, state, feedback.
- Harness-creator tuple: instructions, state, verification, scope, lifecycle.

The score is repo-managed harness evidence. It does not claim product
perfection, complete platform coverage, or external agent permission control.

## Before Current Slice

| Framework | Subsystem | Score | Bottleneck |
| --------- | --------- | ----- | ---------- |
| Lecture tuple | Environment | 4/5 | Local runtime targets were documented but not pinned with `.nvmrc` or `rust-toolchain.toml`. |
| Lecture tuple | State | 4/5 | Active state existed, but no machine-readable active-plan index supported scoring. |
| Harness-creator tuple | State | 4/5 | Restart state lived in prose-heavy active plans and handoff docs. |
| Harness-creator tuple | Lifecycle | 4/5 | `npm run harness:session` existed, but score feedback was not part of session startup. |

Lowest practical subsystem: environment for the lecture tuple, state/lifecycle
for the harness-creator tuple.

## Improvement Slice

Implemented:

- `.nvmrc` pins local Node guidance to CI's Node 20 baseline.
- `rust-toolchain.toml` pins stable Rust with `clippy` and `rustfmt`.
- `scripts/doctor.mjs` now checks those pin files.
- `docs/plans/index.json` gives active workstreams a machine-readable restart
  surface.
- `scripts/harness-score.mjs` scores both WalkingLabs five-tuples.
- `npm run harness:score` exposes the score directly.
- `npm run harness:session` now reports indexed active workstreams and the
  five-tuple score.
- `npm run harness:benchmark` exposes portable before/after score, session
  metrics, next work, and recommendation output.
- `npm run harness:check` now fails if the repo-managed five-tuple score drops
  below 100/100 or any subsystem drops below 5/5.

## After Current Slice

Target command:

```bash
npm run harness:score
```

Expected result after this slice:

```text
Overall: 100/100
Status: all subsystems 5/5
WalkingLabs Lecture Tuple: 100/100
WalkingLabs Harness Creator Tuple: 100/100
```

| Framework | Subsystem | Score | Evidence |
| --------- | --------- | ----- | -------- |
| Lecture tuple | Instructions | 5/5 | `AGENTS.md`, `docs/harness/README.md`, `docs/harness/change-contract.md`, and `docs/harness/agent-operating-model.md`. |
| Lecture tuple | Tools | 5/5 | `package.json`, `scripts/check-harness.mjs`, `scripts/harness-session.mjs`, `scripts/harness-score.mjs`, and `scripts/harness-benchmark.mjs`. |
| Lecture tuple | Environment | 5/5 | `.nvmrc`, `rust-toolchain.toml`, lockfiles, `scripts/doctor.mjs`, and SQLx offline config. |
| Lecture tuple | State | 5/5 | `docs/plans/index.json`, `docs/plans/active/status.md`, active plans, and tech-debt tracker. |
| Lecture tuple | Feedback | 5/5 | `docs/harness/verification-matrix.md`, `npm run harness:check`, focused sensors, and script tests. |
| Harness-creator tuple | Instructions | 5/5 | `AGENTS.md`, harness guide, architecture docs, verification docs, privacy docs. |
| Harness-creator tuple | State | 5/5 | Active status, active plan index, handoff, and tech-debt tracker. |
| Harness-creator tuple | Verification | 5/5 | `harness:check`, `harness:score`, `harness:benchmark`, `test:scripts`, verification matrix, focused tests. |
| Harness-creator tuple | Scope | 5/5 | Change contract, plan template, Rule 0, external-AI and bloat sensors. |
| Harness-creator tuple | Lifecycle | 5/5 | Session snapshot, score and benchmark commands, operating loop, and scorecard. |

## Observed Performance Change

Before this slice, an agent had to read Markdown tables and infer whether the
five-tuple audit was current. The prior `harness:session` output showed the
audit path, but did not expose score or active-workstream index state.

After this slice:

- `npm run harness:score` gives a direct 100/100 gate for repo-managed harness
  evidence.
- `npm run harness:session` includes the score and indexed active workstreams,
  reducing restart ambiguity.
- `npm run harness:benchmark` captures before/after harness evidence in one
  portable report without generating tracked artifacts by default.
- `npm run harness:check` turns harness score drift into a local failure, so
  future sessions cannot silently degrade instructions, environment, state,
  feedback, verification, scope, or lifecycle evidence.

## Guardrail Against Overclaiming

This score is intentionally structural. A 100/100 harness score means the repo
has complete, discoverable, mechanically checked harness evidence for the
defined criteria. It does not mean:

- every product bug is fixed
- every OS build has just run
- every E2E path is currently proven
- external agent permission policy is fully controlled by repo files
- human review is unnecessary for privacy, security, UX, or release decisions
