# Standard Harness Contract Evidence

- Feature: `harness-standard-contract`
- Working-tree checkpoint: changes since starting revision `099f90a7`
- Timestamp: `2026-07-15T00:46:28Z`
- Host: macOS, with Node.js 26.5.0, npm 11.17.0, and Rust 1.97.0
- Result: passing

## Acceptance Behavior

A fresh session can initialize the repository, read one canonical active
feature, route every changed path through a fail-closed verification plan, and
run blocking local checks for harness semantics, repository topology, workflow
disablement, and exhaustive file-size coverage.

Hosted GitHub workflows are manual-only projections. Every job has an exact
job-level `if: ${{ false }}` guard, so no hosted workload can run.

## Verification

| Command | Result |
| ------- | ------ |
| `./init.sh --skip-install` | Exit 0; read-only initialization and baseline checks passed. |
| `pwsh -File ./init.ps1 --skip-install` | Exit 0 on the macOS host; argument and npm routing contracts also passed. |
| `npm run harness:plan -- --since 099f90a7` | Exit 0; all 81 changed, deleted, and untracked paths were classified with no unknown path. |
| `npm run verify:full` | Exit 0; the complete local completion gate passed and removed generated artifacts. |
| `npm audit --audit-level=moderate` | Exit 0; no vulnerabilities found. |

The complete gate included:

- harness state, topology, disabled workflow, file-size, security, dependency,
  SQLx, duplication, documentation, terminology, type, and lint checks;
- 779 script and contract tests;
- 2,933 frontend tests across 213 files;
- production and Storybook builds;
- 10 Chromium smoke tests within the 30-second and 25-test budgets; and
- Rust formatting, Clippy with warnings denied, 2,922 passing Rust tests, and
  33 explicitly ignored Rust or documentation tests.

The completion gate cleaned `dist/`, `storybook-static/`, and `test-results/`
after verification. A regression test proves that cleanup can remove only the
bounded generated-artifact allowlist.

## Caveats

- The host uses Node.js 26.5.0 instead of the repository baseline 24.18.0 and
  npm 11.17.0 instead of the pinned npm 12.0.1. The doctor reported both as
  warnings. Local setup intentionally refuses persistent global npm mutation.
- Windows 11 and Linux were not available for live execution. Windows launcher,
  path, command, and workspace behavior is covered by isolated contracts. The
  PowerShell launcher ran under macOS, not Windows.
- Hosted workflows were not run because the repository contract intentionally
  disables every hosted job. They are not completion evidence.
- The checkpoint remains an intentional dirty working tree. No commit, push,
  release, public-wiki update, or other external mutation was performed.
