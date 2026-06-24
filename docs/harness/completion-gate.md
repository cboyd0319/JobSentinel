# Completion Gate And Clean State

This file names two things that were previously implicit across the harness: the
layered gate a change must clear before it can be called done, and the clean
state a session must leave behind.

Source frameworks: WalkingLabs learn-harness-engineering, Lecture 09 (three-layer
termination validation) and Lecture 12 (leave a clean state). See
<https://walkinglabs.github.io/learn-harness-engineering/>.

## Three-Layer Completion Gate

A change is not done until the layers relevant to its surface pass. Pick the
exact commands from `verification-matrix.md`; the lists below are the model, not
a replacement for the matrix. Record the runs in `evidence-log.md`.

### Layer 1: Static And Syntax

Code shape, types, style, and harness integrity.

- `npm run lint`
- `npm run lint:md` for docs
- `npm run harness:check`
- `cd src-tauri && cargo fmt --all -- --check`
- `cd src-tauri && cargo clippy -- -D warnings`

### Layer 2: Runtime Behavior

The changed behavior runs and is proven by execution.

- `npm run test:run` for frontend logic
- `cd src-tauri && cargo test --lib` for core logic
- Focused Tauri command or migration tests for IPC and storage changes

### Layer 3: System And Journey

The behavior works end to end as a user would reach it.

- `npm run test:e2e` or `npm run test:e2e:all` for cross-component flows
- Manual UI validation from `full-manual-validation-v2.9.1.md` for exposed
  surfaces
- Computer Use or Playwright screenshot proof for redesign and major visual
  changes

A change scoped to one layer still states which layers it did and did not prove.
Do not claim system health from a single static run.

## Clean State Exit Checklist

Before ending a session, leave the repo in a state the next session can resume
without repair. All five dimensions must hold:

- [ ] Build passes for the changed surface (`npm run build`, and a Rust build
      when Rust changed).
- [ ] Relevant tests pass, including pre-existing tests near the change.
- [ ] State is current: `docs/plans/active/status.md`, `docs/plans/index.json`,
      and `evidence-log.md` reflect what is actually verified.
- [ ] No stale artifacts: `npm run lint:bloat` is clean, `git diff --check`
      passes, and no debug, scratch, or machine-specific local paths remain.
- [ ] The standard startup path still works (`npm run doctor`, documented run
      command).

## Relationship To Other Gates

- `verification-matrix.md` is the source of truth for which command proves which
  change. This file groups those commands into named layers.
- `evidence-log.md` records that the gate actually ran.
- `reliability.md` defines the restart and journey expectations Layer 3 leans on.
- For release, `verification-matrix.md` "Full Local Gates" and the release
  preflight remain the binding lists.

## Related Harness Docs

- [Verification matrix](verification-matrix.md)
- [Evidence log](evidence-log.md)
- [Reliability](reliability.md)
- [Entropy control](entropy-control.md)
