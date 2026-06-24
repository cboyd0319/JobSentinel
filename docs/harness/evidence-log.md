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
