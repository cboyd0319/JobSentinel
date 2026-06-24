# Quality Grades

This file tracks whether each product domain and architectural layer is getting
stronger or weaker over time. It is distinct from `npm run harness:score`, which
grades the harness itself, not the product.

Source framework: WalkingLabs learn-harness-engineering, Lecture 12 (every
session leaves a clean state) and the OpenAI advanced repo-template quality
document. See <https://walkinglabs.github.io/learn-harness-engineering/>.

## Honesty Note

The grades below are a structural baseline set on the date shown, based on
whether each area has focused tests, sensors, and clear boundaries. They are a
starting snapshot to refine with measured evidence, not a completed per-domain
audit. Update a grade only when evidence supports the change, and record the move
in Change History.

## Grading Scale

- `A`: Verification passing, clean boundaries, agent-legible, stable tests.
- `B`: Working with minor gaps in coverage or legibility.
- `C`: Partially working, known gaps, some areas hard for agents to understand.
- `D`: Not working, or major structural issues.

## Product Domains

| Domain | Grade | Verification | Agent legibility | Key gaps | Last updated |
| ------ | ----- | ------------ | ---------------- | -------- | ------------ |
| Job search and sources | B | Parser, gate, and rate-limit tests; source sensors | Clear adapter pattern | Restricted-source coverage needs manual UI proof per release | 2026-06-24 |
| Application tracking | B | Component and store tests | Clear | Restart-persistence journey needs standing E2E coverage | 2026-06-24 |
| Resume builder and matcher | B | Component and fit-logic tests | Clear | Local-first fallback paths need explicit journey evidence | 2026-06-24 |
| Ghost-job detection | B | Heuristic scoring tests | Clear | External-AI explanation path depends on gateway gates | 2026-06-24 |
| Salary and negotiation | B | Component tests | Clear | Source-claim freshness depends on `docs/references.md` | 2026-06-24 |
| External-AI gateway | A | Gateway validation, payload policy, and `lint:external-ai` | Clear single boundary | None known; keep every new provider gateway-routed | 2026-06-24 |
| Settings and onboarding | B | Component tests; product-copy sensors | Clear | Zero-technical-knowledge review is ongoing | 2026-06-24 |
| Support and feedback | B | Safe-support-report tests; issue templates | Clear | Recovery journeys need standing E2E coverage | 2026-06-24 |

## Architectural Layers

| Layer | Grade | Boundary enforcement | Agent legibility | Key gaps | Last updated |
| ----- | ----- | -------------------- | ---------------- | -------- | ------------ |
| Frontend (React) | B | `lint:architecture`, frontend contracts | Clear | Some modules near the file-size budget | 2026-06-24 |
| IPC (Tauri commands) | B | `lint:tauri-invokes`, `ipc-minimization` | Clear | Command surface must stay least-privilege | 2026-06-24 |
| Core logic (Rust) | B | Module boundaries; clippy gate | Clear | A few large modules pending split | 2026-06-24 |
| Storage (SQLite and migrations) | B | Migration tests; SQLx offline | Clear | Encryption-at-rest claims need standing proof | 2026-06-24 |
| Scrapers and sources | B | Source sensors; rate-limit tests | Clear | Restricted-source manual validation per release | 2026-06-24 |
| Platform adapters | B | Doctor checks per OS | Clear | Windows and macOS parity verified case by case | 2026-06-24 |

## Benchmark Snapshots

Capture portable before/after harness evidence with `npm run harness:benchmark`.

| Date | Harness variant | Five-tuple score | Notes |
| ---- | --------------- | ---------------- | ----- |
| 2026-06-24 | Lecture 07-12 improvement pass | 100/100 | Added evidence log, harness map and sensor registry, reliability, quality grades, completion gate, and product sense |

## Simplification Log

Periodically evaluate whether a harness component still earns its place. Disable
or remove one, run `npm run harness:check` and `npm run harness:benchmark`, and
record the outcome. Keep, restore, or replace based on results, not taste.

| Date | Component reviewed | Outcome | Decision |
| ---- | ------------------ | ------- | -------- |
| 2026-06-24 | Baseline review of new harness docs | Added without lowering the score or duplicating existing sensors | Keep |

## Change History

- 2026-06-24: Created the quality-grades baseline during the Lecture 07-12
  harness improvement pass. Grades are an initial structural snapshot to refine
  with measured evidence.

## Related Harness Docs

- [Harness map](harness-map.md)
- [Reliability](reliability.md)
- [Completion gate](completion-gate.md)
- [Tech debt tracker](../plans/tech-debt-tracker.md)
