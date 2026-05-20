# Verification Matrix

Use the smallest command set that proves the change. Broaden when shared
behavior, security, storage, or release flow changes.

## Always

| Change | Required sensor |
| ------ | --------------- |
| Agent docs, plans, or harness files | `npm run harness:check` |
| Markdown docs | `npm run lint:md` |
| Package scripts | `npm run harness:check` and affected script command |
| Frontend architecture boundary rules | `npm run lint:architecture` and `npm run harness:check` |
| Tauri invoke command map | `npm run lint:tauri-invokes` and `npm run harness:check` |
| Security sensor policy | `npm run lint:security` and `npm run harness:check` |
| Test quality policy | `npm run lint:tests` and `npm run harness:check` |
| Any claim of completion | Name exact checks run |

## Frontend

| Change | Required sensor | Add when risk increases |
| ------ | --------------- | ----------------------- |
| Component logic | `npm run test:run -- <test file>` | `npm run lint`, `npm run test:run` |
| Shared hook | Relevant hook test | Full `npm run test:run` |
| Page workflow | Relevant page test | `npm run test:e2e` for major flows |
| Styling or layout | Component test if present | Browser screenshot or Playwright flow |
| Build config | `npm run build` | CI dry run when possible |

## Rust And Tauri

| Change | Required sensor | Add when risk increases |
| ------ | --------------- | ----------------------- |
| Rust formatting | `cd src-tauri && cargo fmt --all -- --check` | None |
| Core logic | Targeted `cargo test` | `cargo test --lib` |
| Warnings or traits | `cargo clippy -- -D warnings` | Full Rust test suite |
| Tauri command | Command test or compile check | Frontend invoke path test |
| Migration | Migration test or SQLx prepare | Manual upgrade/downgrade review |

Production clippy is the hard Rust lint gate. Test-target clippy warnings are
advisory until the test lint policy is tightened; do not use all-target clippy
with warnings-as-errors as a required local or CI gate.

## Security And Privacy

| Change | Required sensor |
| ------ | --------------- |
| URL, file path, command, or HTML input | Unit tests for malicious input |
| Credential handling | Keyring behavior check and no plaintext path |
| External network destination | Privacy docs update and explicit user configuration |
| Browser automation | Human-in-the-loop submit behavior preserved |
| Scraper behavior | Rate limit and error handling tests |

## Docs And Harness

| Change | Required sensor |
| ------ | --------------- |
| `AGENTS.md` | `npm run harness:check` |
| `docs/harness/*` | `npm run harness:check` and `npm run lint:md` |
| `docs/plans/*` | `npm run harness:check` |
| README developer links | `npm run harness:check` |
| PR template or CI docs | Manual link check plus `npm run harness:check` |

## Full Local Gates

Use after broad shared changes:

```bash
npm run harness:check
npm run lint
npm run test:run
npm run build
cd src-tauri && cargo fmt --all -- --check
cd src-tauri && cargo clippy -- -D warnings
cd src-tauri && cargo test --lib
```

Use before release:

```bash
npm run harness:check
npm run lint:docs
npm run lint
npm run test:run
npm run test:e2e:all
npm run build
cd src-tauri && cargo fmt --all -- --check
cd src-tauri && cargo clippy -- -D warnings
cd src-tauri && cargo test
```

## When Checks Cannot Run

Record:

- Command attempted.
- Failure reason.
- Risk from missing evidence.
- Next command or environment needed.
