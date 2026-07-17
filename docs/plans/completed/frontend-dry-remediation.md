# Frontend DRY Remediation

Status: Completed

## Problem

The maintained `frontendProduction` duplication scope reports 778 significant
lines across 38 clone regions in `src/` and `src-tauri/src/`. The ratchet blocks
growth but does not give confirmed shared behavior one canonical owner.

## Scope

- Inspect every region reported by `npm run lint:dup -- --list`.
- Consolidate confirmed shared UI models, render primitives, error boundaries,
  resume analysis adapters, and desktop command adapters.
- Preserve distinct accessibility, interaction, persistence, IPC, and visual
  semantics where similar code does not share one behavior owner.
- Delete obsolete copies, wrappers, imports, tests, and baseline entries.

This plan does not change product behavior or add dependencies. Rust workspace
code under `crates/` is complete and guarded by its zero baselines.

## Success Criteria

- Every reported region is classified with live-file evidence.
- Every actionable clone has one existing canonical owner.
- No unexplained maintained clone region remains.
- The frontend duplication baseline is lowered to the final measured result,
  with zero as the target and no new exclusion for changed code.
- Focused behavior tests and the complete local gate pass.

## Milestones

### Milestone 1: Characterize The 38 Regions

- [x] Group the detector output by semantic owner and behavior contract.
- [x] Add focused characterization where consolidation could alter behavior.
- [x] Record intentional protocol or layout repetition before editing.

### Milestone 2: Consolidate Resume And Score Models

- [x] Unify confirmed resume score, match, and analysis model clones.
- [x] Preserve serialized command payloads and user-visible score semantics.

### Milestone 3: Consolidate Shared UI Rendering

- [x] Extract confirmed shared dashboard, market, feedback, and resume visuals.
- [x] Keep accessibility names, focus behavior, responsive layout, and distinct
  interactions local where they differ.

### Milestone 4: Consolidate Boundaries And Error Handling

- [x] Remove confirmed desktop command-adapter and error-boundary clones.
- [x] Preserve command validation, error recovery, and data-loss handling.

### Milestone 5: Sweep, Ratchet, And Close

- [x] Run detector, symbol, literal, and forwarding-wrapper sweeps.
- [x] Lower the frontend baseline to the final measurement.
- [x] Run the complete verification lane and save structured evidence.
- [x] Mark the feature passing and move this plan to `completed/` only after all
  required commands pass.

## Verification

```bash
npm run harness:plan -- --since <milestone-base>
npm run harness:check
npm run lint:file-size
npm run lint:dup -- --list
npm run typecheck
npm run lint
npm run test:run
npm run test:scripts
npm run test:e2e:smoke
npm run verify:full
git diff --check
```

## Handoff

- Current state: completed and verified.
- Result: frontend production duplication fell from 778 significant lines across
  38 regions to zero, with the baseline ratcheted to zero.
- Evidence: `docs/harness/evidence/frontend-dry-completion-2026-07-17.json`.
- Next workstream: repository residual cleanup.
