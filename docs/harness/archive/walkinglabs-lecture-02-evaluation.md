# Walking Labs Lecture 02 Harness Evaluation

Research date: 2026-05-31.

Last updated: 2026-06-01.

Source:
[Walking Labs, Lecture 02. What a Harness Actually Is](https://walkinglabs.github.io/learn-harness-engineering/en/lectures/lecture-02-what-a-harness-actually-is/#exercises).

This evaluates JobSentinel against the lecture's exercise model:
instructions, tools, environment, state, and feedback. Scores use a 1-5 scale
where 5 means a new agent can discover and use the subsystem from repo files
without chat history.

## Five-Tuple Audit

| Subsystem | Score | Evidence | Gap |
| --------- | ----- | -------- | --- |
| Instructions | 5 | `AGENTS.md` gives the short project map. `docs/harness/README.md`, `docs/harness/change-contract.md`, and `docs/harness/agent-operating-model.md` split deeper guidance into indexed docs. | None urgent. Keep `AGENTS.md` short and route new rules into docs. |
| Tools | 5 | `package.json` exposes harness, docs, security, architecture, bloat, unit, Playwright, and build commands. Rust checks are documented in `AGENTS.md` and `docs/harness/verification-matrix.md`. | Tool list is strong, but broad checks are still expensive. Keep improving focused sensors. |
| Environment | 5 | CI pins Node 24.17.0 and Rust 1.96.0. `.nvmrc`, `rust-toolchain.toml`, `package-lock.json`, `Cargo.lock`, `.cargo/config.toml`, and `.sqlx` make dependency and SQLx behavior reproducible. `npm run doctor` checks local readiness and pin drift. | Keep `npm run doctor` current when runtime baselines change. |
| State | 5 | `docs/plans/index.json`, `docs/plans/active/`, `docs/plans/completed/`, `docs/plans/tech-debt-tracker.md`, and active handoff docs preserve progress across long work. | Keep the machine-readable index aligned with active plans. |
| Feedback | 5 | `docs/harness/verification-matrix.md`, `npm run harness:check`, docs linting, security sensors, bloat checks, unit tests, Playwright, Rust checks, and CI provide deterministic feedback. | Feedback is broad. Continue using smallest relevant checks first to avoid 12-minute local loops. |

## Lowest Subsystem

Environment was the lowest-scoring subsystem before this pass. The repo had
good CI setup and locked dependencies, but local readiness was spread across
`AGENTS.md`, developer docs, and workflows.

The first 30-minute improvement from the exercise is implemented as:

```bash
npm run doctor
```

That command checks Node, npm, Rust, Cargo, rustfmt, clippy, npm dependencies,
the Tauri CLI, lockfiles, SQLx offline cache, and SQLx offline config. It gives
one place to start when an agent or contributor cannot tell whether the local
machine is ready.

The 2026-06-01 follow-up closed the remaining environment score gap with
`.nvmrc`, `rust-toolchain.toml`, doctor checks for those files, and the
repo-native score gate:

```bash
npm run harness:score
```

## Controlled Variable Exclusion Test

Use this ablation when testing harness value:

1. Keep the same model and task.
2. Use a security-sensitive external-AI change as the test task.
3. Run once with normal harness files.
4. Run once while ignoring `docs/harness/verification-matrix.md`.
5. Compare missed requirements, unsafe assumptions, and verification gaps.

Expected failure if feedback is removed: the agent is more likely to miss the AI
gateway test, privacy label update, payload preview gate, and direct-provider
call restriction.

This test should record failure attribution. Do not conclude that one subsystem
is weak only because ablation changed output; first classify whether the failure
came from unclear intent, missing context, local environment drift, missing
state, or missing feedback.

## Affordance Analysis

Scenario: an agent knows it should verify a change, but does not know which
checks are enough.

Classification: Gulf of Evaluation. The agent can run commands, but cannot
judge whether the result proves the change.

Bridge: `docs/harness/verification-matrix.md` maps each change type to required
sensors, and `npm run harness:check` verifies repo-level harness invariants.

Scenario: an agent knows it should work locally, but cannot tell whether the
machine has Node, Rust, Tauri, and SQLx offline setup.

Classification: Gulf of Execution. The agent cannot confidently operate the
environment.

Bridge: `npm run doctor` gives a single local readiness command with actionable
failure messages.

## Follow-Up Debt

- Consider a devcontainer only if Windows, macOS, or Linux setup drift becomes
  common enough to justify container maintenance.
- Add a small ablation fixture if future harness work needs measured
  before/after comparisons instead of qualitative review.
