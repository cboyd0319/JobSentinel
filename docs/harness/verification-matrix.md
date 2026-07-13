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
| Always-read harness or active-state docs | `npm run harness:check` verifies context budgets |
| Multi-agent orchestration or delegated implementation | `npm run harness:check`, focused checks for each accepted slice, and coordinator diff review evidence |
| Markdown docs | `npm run lint:md` |
| Language, terminology, identifiers, comments, fixtures, or user-interface copy | `npm run lint:language`; review changed language against the complete Google and Apple guides in `docs/style-guide/README.md` |
| Release language, comments, examples, and artifacts | `npm run lint:language`; apply the complete language policy and Google's inclusive open-source release preparation check linked from `docs/style-guide/google-developer-documentation-style-guide.md` |
| Package scripts | `npm run harness:check` and affected script command |
| Dependency manifests, lockfiles, package-manager pins, workflow runners, workflow apt packages, workflow actions, or Dependabot config | `npm run lint:deps`; for workflow action changes also run `npm run lint:actions`; for Dependabot or workflow security changes also run `npm run lint:security`; before release run `npm run release:check-deps`. The npm package manager, all repo-declared direct npm packages, npm overrides, Cargo crates, workflow OS runners, direct workflow apt packages, and GitHub Actions must be exact-pinned to latest stable; resolved transitives must stay exact lockfile-pinned and latest-compatible. Any behind-latest direct exception must be exact, test-covered, and upstream-constrained. Do not force transitive updates outside upstream-supported ranges with overrides or patches. |
| Environment readiness or setup commands | `npm run doctor`, `npm run doctor:e2e` when E2E readiness matters, and `npm run harness:check` |
| Frontend architecture boundary rules | `npm run lint:architecture` and `npm run harness:check` |
| Tauri invoke command map | `npm run lint:tauri-invokes` and `npm run harness:check` |
| Security sensor policy or secret-scanning rules | `npm run lint:security` and `npm run harness:check` |
| CODEOWNERS review boundary | `npm run lint:security` and `npm run harness:check`; workflow, dependency, release, agent-instruction, AI gateway, and Tauri security files must keep owner review coverage |
| Persistent agent instruction or AI rule files | `npm run lint:security` and `npm run harness:check`; unexpected new `AGENTS.md`, `CLAUDE.md`, `CODEX.md`, `GEMINI.md`, Cursor, Windsurf, or Copilot instruction paths must be reviewed and added to the harness allowlist |
| External AI provider detection | `npm run lint:external-ai` and `npm run harness:check` |
| Test quality policy | `npm run lint:tests` and `npm run harness:check` |
| Repo bloat policy | `npm run lint:bloat` and `npm run harness:check` |
| New or changed source code (DRY) | `npm run lint:dup` ratchet; duplicated-line volume must not exceed the baseline in `validation/duplication_contract.json`. Extract a shared helper or run `npm run lint:dup -- --list` to locate it |
| New direct dependency (YAGNI) | `npm run lint:deps:why`; add a one-line reason in `validation/dependency_rationale.json` justifying why stdlib, a native feature, or a few lines cannot replace it |
| Maintainable file-size policy | `validation/file_size_contract.json`, `npm run lint:bloat`, and `npm run harness:check` |
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
| Renderer CSP, renderer asset, or frontend network boundary | `npm run lint:security` and focused CSP or asset sensor test |
| Credential handling | Keyring behavior check and no plaintext path, focused storage tests, and `cargo clippy -- -D warnings` when Rust code changes |
| Local database encryption | Focused storage tests, plaintext-upgrade cleanup proof, and no raw `sqlite3` inspection guidance |
| External network destination | Privacy docs update and explicit user configuration |
| External AI provider path | `npm run lint:external-ai`, AI gateway test, privacy label update, payload preview gate, and no direct provider call outside `src/shared/externalAi/` |
| Browser automation | Human-in-the-loop submit behavior preserved |
| JobSentinel browser sessions | Visible privacy reminder for long manual sessions, user-controlled close/continue behavior, and no hard expiry unless JobSentinel reads, automates, or submits restricted content |
| Browser extension manifest | `npm run lint:security`, least-privilege manifest review, and no broad host permissions |
| Scraper behavior | Rate limit and error handling tests; before release, all configured source adapters and user-gated restricted-source paths must have focused parser/import/gate coverage |
| Job source technical access | Shared taxonomy distinguishes reviewed public unauthenticated, restricted public unauthenticated, local API-key, authenticated user-session, and unknown review-required sources; reviewed public APIs, feeds, ATS postings, and official employer postings stay low-friction with no restricted acknowledgement or authenticated-session time caps |
| Informed-consent source risk | Account, terms, or source-policy risk uses plain-language warning, local acknowledgement, rate limits, and a secure user-controlled path; direct privacy/security risk, credential/session capture, hidden background access, unsafe URLs, platform-control bypass, unbounded access, or unchosen external side effects remain hard stops |
| Restricted-source job sites | Prominent terms/account/legal/privacy warning docs and UI, acknowledgement gate tests, no credential or session-cookie capture, no hidden background access, no platform-control bypass, and manual UI validation for exposed search-link, pasted-link, Browser Import, scheduled source, and manual-entry paths |
| Restricted source domain taxonomy | `RESTRICTED_JOB_SOURCE_DOMAIN_RECORDS` requires a specific reason, category, and source reference for each domain, and tests must prove the exported `RESTRICTED_JOB_SOURCE_DOMAINS` list is derived from those records |
| Restricted authenticated source sessions | Warning before sign-in, fresh user-initiated sign-in for each use, no auth token, session cookie, browser storage, or authorization-header persistence, no background or offline collection, visible privacy reminder for long manual sessions, no hard time cap unless JobSentinel inspects or automates restricted content, and manual UI validation for each exposed source |
| Authenticated activity ledger | User action required for every logged event, local-only storage, Browser Import or selected/pasted text prefill only, no DOM/network/storage inspection outside a user-clicked visible-page import, no hidden browser-state inference, no silent restricted-site refresh, and ghost-job analysis limited to local user-confirmed records, pasted details, prior user snapshots, or public employer/ATS follow-through |
| Source and release risk register | Keep `docs/harness/release-risk-register-v2.9.0.md` current before changing restricted-source behavior, authenticated browser flows, scraper transport, or release-publication claims |

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
| `docs/harness/*` | `npm run harness:check` and `npm run lint:md`; keep always-read files within the context budgets in `docs/harness/README.md` |
| `DESIGN.md` or `docs/design/*` | `npm run harness:check`, `npm run lint:md`, and `npm run lint:bloat` |
| `docs/plans/*` | `npm run harness:check`; keep active restart files bounded and archive detailed slice history |
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
npm run release:readiness -- --version <version>
npm run release:check-deps
npm run release:sbom -- --platform macos --out-dir <staged-assets> --checksums-out <staged-assets>/attestation-subjects.sha256 --require-artifacts
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
