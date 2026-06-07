# Verification Matrix

Use the smallest command set that proves the change. Broaden when shared
behavior, security, storage, or release flow changes.

For a changed-file command plan, run:

```bash
npm run harness:plan -- --since origin/main
```

The planner suggests focused tests and matrix-backed sensors. Treat it as a
starting point, then broaden when privacy, security, storage, release, or
user-facing workflow risk requires more evidence.

## Always

| Change | Required sensor |
| ------ | --------------- |
| Agent docs, plans, or harness files | `npm run harness:check` |
| Multi-agent orchestration or delegated implementation | `npm run harness:check`, focused checks for each accepted slice, and coordinator diff review evidence |
| Markdown docs | `npm run lint:md` |
| Package scripts | `npm run harness:check` and affected script command |
| Environment readiness or setup commands | `npm run doctor`, `npm run doctor:e2e` when E2E readiness matters, and `npm run harness:check` |
| Frontend architecture boundary rules | `npm run lint:architecture` and `npm run harness:check` |
| Tauri invoke command map | `npm run lint:tauri-invokes` and `npm run harness:check` |
| Security sensor policy | `npm run lint:security` and `npm run harness:check` |
| External AI provider detection | `npm run lint:external-ai` and `npm run harness:check` |
| Test quality policy | `npm run lint:tests` and `npm run harness:check` |
| Repo bloat policy | `npm run lint:bloat` and `npm run harness:check` |
| Maintainable file-size policy | `npm run lint:bloat` and `npm run harness:check` |
| Machine-specific local path policy | `npm run harness:check` |
| Any claim of completion | Name exact checks run |

## Frontend

| Change | Required sensor | Add when risk increases |
| ------ | --------------- | ----------------------- |
| Component logic | `npm run test:run -- <test file>` | `npm run lint`, `npm run test:run` |
| Shared hook | Relevant hook test | Full `npm run test:run` |
| Page workflow | Relevant page test | `npm run test:e2e` for major flows |
| Styling or layout | Component test if present | Browser screenshot or Playwright flow |
| Design-system or redesign contract | Review `DESIGN.md`, `docs/design/README.md`, and `docs/design/design-spec.md`; record the Quiet Shield impact; run `npm run harness:check`, `npm run lint:md`, and focused UI tests for touched surfaces | Computer Use or Playwright screenshot pass for major route, theme, spacing, modal, toast, settings, navigation, keyboard-flow, or responsive changes; record evidence in the active plan or status docs |
| Accessibility or interactive controls | Focused RTL test for roles, labels, focus, keyboard, and ARIA state | Playwright or Storybook a11y/narrow-width check for changed surface |
| Build config | `npm run build` | CI dry run when possible |

Use `npm run test:e2e:smoke:budget` when a frontend workflow change should
stay inside the fast smoke budget. Use `npm run test:e2e:all:budget` before
broad E2E performance claims.

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
| External AI provider path | `npm run lint:external-ai`, AI gateway test, privacy label update, payload preview gate, and no direct provider call outside `src/services/aiGateway.ts` |
| Browser automation | Human-in-the-loop submit behavior preserved |
| Scraper behavior | Rate limit and error handling tests |

## Experience And Support

| Change | Required sensor | Add when risk increases |
| ------ | --------------- | ----------------------- |
| User-facing copy or workflow | Style-guide review for plain language, zero technical assumptions, and broad job-seeker fit | Focused component or page test |
| Error, crash, feedback, or support path | Unit or integration test for recovery action plus docs or issue-template check | Playwright flow that proves user can recover or copy a safe support report |
| Setup, onboarding, or settings | Quick-start or feature-doc update plus relevant UI test | Windows/macOS readiness note or platform smoke |
| Empty, loading, disabled, or narrow-width state | Component test or manual UI review against expected state | Browser screenshot or Playwright flow |
| External side effect such as email, Slack, Discord, Teams, GitHub, or browser open | Human review gate and rollback/disable path | Security/privacy test for destination validation |

## Docs And Harness

| Change | Required sensor |
| ------ | --------------- |
| `AGENTS.md` | `npm run harness:check` |
| `docs/harness/*` | `npm run harness:check` and `npm run lint:md` |
| `DESIGN.md` or `docs/design/*` | `npm run harness:check`, `npm run lint:md`, and `npm run lint:bloat` |
| `docs/plans/*` | `npm run harness:check` |
| `docs/plans/templates/*` | `npm run harness:check` and `npm run lint:md` |
| README developer links | `npm run harness:check` |
| PR template or CI docs | Manual link check plus `npm run harness:check` |
| Local environment setup docs | `npm run doctor`, `npm run doctor:e2e` when Playwright setup is described, and `npm run harness:check` |
| Public GitHub wiki-impacting change | Review `docs/harness/manifest.json` `publicWiki.requiredPages`, update affected pages in `https://github.com/cboyd0319/JobSentinel/wiki`, or record why no wiki page changed, plus `npm run harness:check` |

## Full Local Gates

Use after broad shared changes:

```bash
npm run harness:check
npm run doctor
npm run doctor:e2e
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
npm run doctor
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
