# Repository Residual Cleanup

Status: Complete.

## Problem

Production duplication is closed at the maintained threshold, but repeated test
setup, script clones and dead bindings, stale plan and harness history, duplicate
policy projections, an unused renderer dependency, and generated output still
make the repository larger and harder to maintain than necessary.

## Scope

- Consolidate repeated frontend test setup and add maintained test duplication
  coverage.
- Remove dead script bindings, consolidate script clones, and add script lint
  and duplication coverage.
- Move completed plans and dated harness evidence out of live directories,
  delete redundant pointers and superseded archives, and update direct links.
- Derive file-size projections from one owner and remove the unused renderer
  dependency.
- Review a smaller duplication window, resolve actionable clones, and ratchet
  the maintained contract without adding exclusions.
- Remove generated output through the bounded cleanup command.

Product behavior, persistent data, external publication, and new features are
out of scope.

## Success Criteria

- Frontend tests and scripts have maintained duplication scopes with zero
  unexplained clones at the selected threshold.
- Script lint reports no dead bindings.
- Active plan and current-status surfaces contain only current work.
- Redundant pointers, superseded large archives, and dated live harness files
  are removed or archived.
- File-size policy has one canonical threshold owner.
- Unused renderer dependencies and generated output are removed.
- The complete local gate passes and structured evidence records the result.

## Verification

```bash
npm run harness:check
npm run lint:dup -- --list
npm run lint:file-size
npm run lint
npm run test:scripts
npm run test:run
npm run verify:full
git diff --check
```

## Handoff

- Current state: implementation and complete local verification passed.
- Generated outputs were removed after verification.
- All maintained production and test duplication scopes are guarded at zero
  under the 14-significant-line contract.
- The post-cleanup adversarial review owns any newly discovered work.
