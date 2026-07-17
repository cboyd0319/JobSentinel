# Repository Post-Cleanup Corrections

Status: Complete.

## Problem

The post-cleanup review found two product correctness defects and a bounded set
of repository-integrity issues that existing checks do not detect. They should
be corrected before another major feature stream begins.

## Scope

1. Apply connection-scoped SQLite settings to every pooled connection and prove
   the behavior with a multi-connection regression test.
2. Make saved job-alert preferences govern real desktop alerts, with fail-first
   tests at the notification call path.
3. Repair six broken maintained-document links and add a local-link existence
   check to the existing documentation lane.
4. Replace stale duplicate webhook-validation examples with concise
   documentation of the shared security owner.
5. Remove four confirmed unused member-level Cargo dependency declarations.
6. Remove the disposable source-tree artifact and break the development mock
   type-ownership cycle.
7. Classify definition-only Rust APIs. Wire only behavior required by current
   product contracts, and delete the rest.
8. Make modularization review output actionable without launching a broad file
   splitting campaign.

New product features, dependency upgrades, release work, speculative
abstractions, and indiscriminate coverage or file-size targets are out of scope.

## Success Criteria

- Every pooled production database connection receives the required settings.
- Saved alert rules suppress or allow real alerts as described by the settings
  interface.
- Maintained local Markdown links resolve and regressions fail the docs lane.
- Security documentation points to the current shared webhook validator without
  copied provider implementations.
- Member manifests contain no confirmed unused direct declarations.
- The development mock graph is acyclic and definition-only APIs are explicitly
  retained, wired, or deleted.
- The bloat, architecture, dependency, documentation, and standard full gates
  pass with generated outputs removed.

## Execution Order

1. Database connection initialization and regression test.
2. Notification preference integration and regression tests.
3. Documentation, manifest, artifact, and mock-graph corrections.
4. Definition-only API classification and targeted deletion or wiring.
5. Review-sensor adjustment, full verification, and structured evidence.

## Verification

```bash
npm run lint:bloat
npm run lint:docs
npm run lint:deps
npm run lint:architecture
npm run lint:file-size
npm run lint
npm run typecheck
npm run test:run
npm run test:scripts
cargo fmt --all -- --check
cargo clippy --workspace -- -D warnings
cargo test --workspace
npm run verify:full
git diff --check
```

Focused fail-first tests for pooled connection settings and alert preference
enforcement are required before their implementations change.

## Handoff

- Every retained review finding is corrected.
- Full-gate evidence:
  `docs/harness/evidence/repository-post-cleanup-corrections-2026-07-17.json`.
- Generated outputs were removed after verification.
- The repository is ready for selection of the next major workstream.
