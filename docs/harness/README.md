# JobSentinel Harness

The harness is the repository-owned system that makes work discoverable,
reproducible, resumable, and verifiable. It has five required subsystems:
instructions, tools, environment, state, and feedback.

## Canonical Owners

| Fact | Owner | Updated when | Enforced by |
| ---- | ----- | ------------ | ----------- |
| Startup contract | `AGENTS.md` | Commands or hard boundaries change | `npm run harness:check` |
| Environment setup | `scripts/harness-init.mjs` | Setup or baseline changes | init launcher tests |
| Current objective | `PROGRESS.md` | Objective, blocker, baseline, or next action changes | state validator |
| Work selection | `feature_list.json` | Feature status or verification changes | state validator |
| Verification routing | `scripts/harness-plan.mjs` | Path ownership or commands change | routing fixtures |
| File-size budgets | `repository-structure-policy.json` | Maintained path classes or baselines change | `npm run lint:file-size` |
| Repository roots and units | `repository-structure-policy.json` | Source root, unit, entrypoint, or target layout changes | `npm run lint:architecture` |
| Rust graph and technology ownership | `validation/repository_architecture_contract.json` | Rust member, edge, dependency owner, or retired path changes | `npm run lint:architecture` |
| Architecture projection | `ARCHITECTURE.md` | Either executable architecture owner changes | `npm run lint:architecture` |
| Evidence | `docs/harness/evidence/` | A durable transition uses fresh results | state validator |
| Sensor registry | `docs/harness/harness-map.md` | A repeated sensor is added or retired | review and harness tests |

`docs/plans/` owns detailed execution plans, not current state. Compatibility
status files may point to root state but may not copy it.

## Fixed Startup

1. Confirm the repository root.
2. Read `PROGRESS.md` and `feature_list.json`.
3. Review recent commits and the dirty working tree.
4. Run `./init.sh` on macOS or Linux, or `pwsh -File ./init.ps1` on Windows.
5. Repair a failed baseline before adding scope.
6. Work only on the single `active` feature.

The initializer first checks command discovery, runtime versions, lockfiles, and
platform prerequisites without mutation. Its only mutation is declared:
`npm ci --ignore-scripts` synchronizes locked project dependencies. It does not
install global tools or Git hooks, start background services, or load secrets.
`--offline` prohibits npm network fallback and requires a warm local cache.
`--skip-install` runs the read-only and verification phases without dependency
synchronization. `--run-start` starts `npm run tauri:dev` after the baseline
passes.

`npm run doctor` is read-only. A failure names the missing prerequisite and exact
safe next action. It never repairs the machine.

## State Transitions

The declared active status is `active`. Exactly one feature is active. Allowed
states are `not_started`, `active`, `blocked`, and `passing`.

- `passing` requires an existing evidence pointer and is irreversible.
- A later regression creates a new corrective feature.
- `blocked` requires a blocker and a next trigger.
- `PROGRESS.md` must name the same active feature, status, and update date as the
  ledger.
- Long command output, screenshots, and history stay under
  `docs/harness/evidence/`, not in startup files.

## Verification Lanes

- Fast: `npm run harness:check`, `npm run lint:file-size`, and the closest static
  or focused test.
- Targeted: run `npm run harness:plan -- --since <valid-ref>` and execute every
  selected command.
- Full: `npm run verify:full` for shared contracts, broad refactors, uncertain
  routing, and completion claims.
- Release: the full lane plus `npm run test:e2e:all`, `npm run lint:sqlx`, release
  readiness, packaging, signing, and publication checks when separately
  authorized.

The planner includes committed changes from a valid base, staged changes,
unstaged changes, deletions, and untracked nonignored files. Invalid bases fail.
Unknown paths select the full lane.

## Hosted Workflows

Hosted continuous integration is disabled under the named
`pre-alpha-private-no-ci` user exception in `harness-manifest.json`. The exception
is a deliberate nonconformance because `harness-engineering` defines no private
or pre-alpha CI waiver. The harness rejects push, pull-request, merge-group, and
scheduled workflow triggers while the exception is active.

Release and public-artifact workflows remain separate, explicitly authorized
operations. Their presence is not CI evidence and does not prove a release ran.
Restore authoritative CI and retire the exception before public alpha, external
contributor access, or reliance on protected shared history.

## Local Hook

The tracked Husky pre-commit hook runs secret scanning and staged-file checks only
when a developer explicitly installs Husky. The standard initializer uses
`npm ci --ignore-scripts`, so it does not install the hook. Recovery bypass:
`HUSKY=0 git commit ...` or `git commit --no-verify`. Because no CI backstop
exists, a bypass leaves an explicit verification gap that must be closed with
the applicable local commands before the change is relied on.

## Adding Or Retiring A Control

Add a control only for an observed failure or protected risk. Record its owner,
trigger paths, expected signal, false-positive response, platform coverage, and
retirement condition in `harness-map.md`. Use an existing parser or tool before
custom code. Delete retired entrypoints and stale references in the same change.

Budgets use a measured known-good baseline. Every exception names the exact path,
owner, reason, current baseline, and removal trigger. Raising a budget requires a
new measured reason.

## Clean Completion

Completion requires applicable build, static, unit, integration, and runtime
evidence; synchronized root state; removed temporary artifacts; an understood
working tree; and a runnable standard init path. Missing evidence remains a gap.
See `completion-gate.md` for the checklist and `verification-matrix.md` for exact
lanes.
