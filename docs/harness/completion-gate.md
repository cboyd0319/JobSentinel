# Completion Gate

Use this checklist before a feature transitions to `passing` or a broad session
claims completion.

## Behavior And Verification

- [ ] Observable acceptance behavior is proven.
- [ ] Static, focused, boundary, integration, and runtime levels required by the
      claim passed with fresh results.
- [ ] `npm run harness:plan -- --since <valid-ref>` accounts for committed,
      staged, unstaged, deleted, and untracked nonignored paths.
- [ ] `npm run harness:check`, `npm run lint:file-size`, and `git diff --check`
      pass.
- [ ] The implementation did not weaken its own tests, budgets, or evaluator.

## State And Evidence

- [ ] `PROGRESS.md` and `feature_list.json` name the same single active feature,
      status, and update date.
- [ ] A `passing` transition points to fresh evidence under
      `docs/harness/evidence/` and retains the original evidence permanently.
- [ ] A blocked item names its blocker, risk, and next trigger.
- [ ] Evidence identifies revision, command, exit status, relevant result,
      platform, timestamp, and caveat without secrets or local paths.

## Clean State

- [ ] Required build and tests pass.
- [ ] Temporary, generated, and stale artifacts are removed.
- [ ] The dirty working tree is understood and unrelated user changes are
      preserved.
- [ ] The standard init command and `npm run tauri:dev` remain discoverable and
      runnable.
- [ ] Windows, macOS, and Linux evidence is live, fixture-based with a named live
      gap, or explicitly incomplete.

If any required item is unchecked, the feature is not `passing`. Repair the
state, roll back to a consistent checkpoint, or leave it explicitly blocked.
