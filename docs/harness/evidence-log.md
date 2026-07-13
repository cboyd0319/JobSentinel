# Evidence Log

A compact, current ledger of verification runs. It exists so completion claims
survive session restarts without rereading long plans or chat history.

Source framework: WalkingLabs learn-harness-engineering, Lecture 09 (agents
declare victory too early). The lesson: code being written is not proof it
works. Bind every completion claim to recorded, runnable evidence.

## Rules

- Record one row per meaningful verification run, newest at the top.
- Store command, scope, result, exit code, and date only.
- Never paste raw command output, logs, secrets, tokens, or machine-specific
  local paths here. Summarize the result in plain words.
- A `pass` row means the command finished with exit code `0`. A `fail` row must
  name the follow-up in Notes.
- Keep this file short. Move rows older than the current work phase into the
  matching dated harness review or the plan archive, not into chat.
- This ledger is evidence, not a gate. The required checks for a change still
  live in `verification-matrix.md` and `completion-gate.md`.

## What Counts As Evidence

A claim of completion needs at least one row that covers the changed surface.
Use `completion-gate.md` to pick which layers a change must prove. Reference the
exact command from `verification-matrix.md`, not a paraphrase.

## Ledger

| Date | Command | Scope | Result | Exit | Notes |
| ---- | ------- | ----- | ------ | ---- | ----- |
| 2026-07-13 | `npm run test:e2e -- tests/e2e/playwright/app.spec.ts` | Milestone 2 Hiring Trends route cutover | pass | 0 | All 14 Chromium app-shell, navigation, keyboard, and responsive checks passed, including the Hiring Trends route. |
| 2026-07-13 | `npm run test:run`, `npm run test:scripts`, and `npm run build` | Milestone 2 Market vertical slice and policy sensor ownership | pass | 0 | All 3,141 frontend tests, 758 script tests, TypeScript checks, and the 751-module production build passed after the feature move, data contract consolidation, and 679-line page split. |
| 2026-07-13 | `npm run lint`, `npm run lint:architecture`, and `npm run lint:bloat` | Milestone 2 Market code quality, import boundaries, repository layout, and file caps | pass | 0 | ESLint and the enforced frontend, repository, and maintained-file structural gates passed with the new feature owners. |
| 2026-07-13 | `npm run test:e2e -- tests/e2e/playwright/app.spec.ts` | Milestone 2 app shell and first salary feature route | pass | 0 | 14 Chromium app-shell, navigation, keyboard, and responsive checks passed, including the Pay Protection route. |
| 2026-07-13 | `npm run test:run`, `npm run test:scripts`, and `npm run build` | Milestone 2 salary vertical slice and sensor ownership | pass | 0 | All 3,141 frontend tests, 758 script tests, TypeScript checks, and the 746-module production build passed after the feature move and file split. |
| 2026-07-13 | `npm run test:run`, `npm run lint`, and `npm run build` | Milestone 2 app bootstrap, route composition, and navigation ownership slice | pass | 0 | All 3,141 frontend tests, TypeScript and ESLint checks, and the 741-module production build passed after the app-shell move. |
| 2026-07-13 | `cargo clippy -- -D warnings` | Milestone 1 Rust consumers and full current backend | pass | 0 | The full backend passed Clippy with warnings denied. |
| 2026-07-13 | `cargo test --lib` | Full Rust regression gate after Milestone 1 resource ownership changes | pass | 0 | 2,958 tests passed, 11 intentionally ignored, and no tests failed. |
| 2026-07-13 | `npm run test:run` | Milestone 1 frontend resource moves, dead-code deletion, and deterministic application review model | pass | 0 | 3,141 tests passed across 184 files after the time-sensitive model test received an explicit reference time. |
| 2026-07-13 | `npm run test:scripts` | Milestone 1 example paths plus repository architecture sensors | pass | 0 | 758 tests passed, including resource, example, bloat, boundary, and harness-planning fixtures. |
| 2026-07-13 | `cargo test --lib core::config` and `cargo test --lib taxonomy` | Milestone 1 Rust consumers of moved examples and cross-runtime taxonomies | pass | 0 | 157 configuration tests and 3 taxonomy-filtered tests passed. |
| 2026-07-13 | `npm run lint:architecture`, `npm run lint:bloat`, `npm run lint:security`, and `npm run harness:check` | Milestone 1 ownership, artifact, privacy, security, and harness gates | pass | 0 | All focused structural and policy gates passed after generated frontend build output was removed. |
| 2026-07-13 | `npm run harness:check` | Milestone 0 harness, active-state, manifest, and security contracts | pass | 0 | Harness score and required privacy, design, plan, workflow, and ownership sensors pass after the refactor plan became active. |
| 2026-07-13 | `npm run test:scripts` | Milestone 0 architecture, bloat, security, release, and utility sensors | pass | 0 | 757 tests passed, including new workspace, frontend feature, file-cap, test-quality, and harness-plan fixtures. |
| 2026-07-13 | `npm run lint:architecture`, `npm run lint:tests`, and `npm run lint:bloat` | Focused Milestone 0 structural gate | pass | 0 | Frontend ownership, repository architecture, test quality, and tracked-file policy pass on the current migration state. |
| 2026-06-24 | `npm run release:check-deps` | npm, Cargo, and Actions latest-pin gate | pass | 0 | All direct deps, transitives, the Node 24.18.0 baseline, and Actions are at latest stable. Five Cargo pins are held behind latest by documented SQLx and upstream constraints. |
| 2026-06-24 | `npm run build` and `npm run test:run` | Frontend build and Vitest suite | pass | 0 | Proves vite 8.1.0, recharts 3.9.0, and @vitejs/plugin-react 6.0.3 work after the dependency bump. |
| 2026-06-24 | `cargo test --lib` | Rust core after chacha20 0.10.1 | pass | 0 | 2958 passed, 0 failed. |
| 2026-06-24 | `npm run harness:check` | Harness docs, manifest, five-tuple score | pass | 0 | Validates new harness docs after the Lecture 07-12 improvement pass. |
| 2026-06-24 | `npm run lint:md` | All Markdown | pass | 0 | Style gate for the new and edited harness docs. |
| 2026-06-24 | `npm run lint:prose` | `docs/` prose | pass | 0 | Vale error-level gate for the new harness docs. |
| 2026-06-24 | `npm run harness:score` | Five-tuple harness evidence | pass | 0 | Confirms the score stays 100/100 after adding docs. |
| 2026-06-24 | `npm run test:scripts` | Harness and security script tests | pass | 0 | Confirms sensor scripts still pass after manifest changes. |

## When Checks Cannot Run

If a required command cannot run in the current environment, record a row with
result `blocked`, exit `n/a`, and a Note naming the missing tool or environment
and the risk from the missing evidence. Mirror the same detail in the plan or
handoff so the next session knows what is unproven.
