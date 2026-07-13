# Harness Map And Sensor Registry

This file is the discoverability hub for the JobSentinel harness. It names every
moving part, which command owns which rule, and where the deeper contracts live.
Read it when you need to find the right sensor, not run a full audit.

Source frameworks: WalkingLabs learn-harness-engineering, Lecture 10 (executable
architecture rules need discoverable ownership) and Lecture 11 (observability and
process artifacts belong inside the harness).
See <https://walkinglabs.github.io/learn-harness-engineering/>.

## Harness Topology

| Layer | What it is | Where it lives |
| ----- | ---------- | -------------- |
| Guides | Constrain the agent before it acts | `AGENTS.md`, `docs/harness/README.md`, `agent-operating-model.md`, `engineering-principles.md`, `change-contract.md`, `product-sense.md`, design and feature docs |
| Sensors | Inspect work after it acts | `npm run` checks in the Sensor Registry below |
| State | Durable restart and evidence surface | `docs/plans/active/status.md`, `docs/plans/index.json`, `evidence-log.md`, `tech-debt-tracker.md` |
| Gates | Named conditions before done or release | `completion-gate.md`, `verification-matrix.md`, `full-manual-validation-v2.9.1.md` |
| Quality | Health over time | `quality-grades.md`, `reliability.md`, `harness:score`, `harness:benchmark` |
| CI and release | Hosted enforcement | `.github/workflows/ci.yml`, `.github/workflows/release.yml` |

## Sensor Registry

Each sensor names why it exists and when it can retire. Owner is the repo
maintainer unless a sensor is delegated. Retire a sensor only when its rule is
enforced elsewhere or the risk no longer exists.

| ID | Command | Area | Why it exists | Source | Retire when |
| -- | ------- | ---- | ------------- | ------ | ----------- |
| harness-check | `npm run harness:check` | Harness integrity | Required files, snippets, context budgets, version and command claims, link integrity, local-path safety, and the five-tuple score gate | Harness baseline | Never; this is the harness keystone |
| harness-score | `npm run harness:score` | Harness evidence | Scores both WalkingLabs five-tuples and fails below 100/100 | Five-tuple audit 2026-06-01 | Replaced by a richer scored model |
| harness-session | `npm run harness:session` | Lifecycle | One-command restart snapshot of branch, plans, score, and next work | Five-tuple audit 2026-06-01 | Lifecycle state moves to another single source |
| harness-plan | `npm run harness:plan -- --since origin/main` | Verification routing | Maps changed files to focused tests and matrix sensors | Deep audit 2026-05-31 | Diff-aware routing is built into CI for local use |
| harness-benchmark | `npm run harness:benchmark` | Quality over time | Portable before/after harness evidence | Five-tuple scorecard 2026-06-01 | Benchmarks move into `quality-grades.md` tooling |
| lint | `npm run lint` | Frontend static | TypeScript and ESLint correctness | Baseline | Never |
| lint-md | `npm run lint:md` | Docs style | Markdown consistency for readers and agents | Baseline | Never |
| lint-prose | `npm run lint:prose` | Docs prose | Vale error-level plain-language gate for non-technical audience | Baseline | Never |
| lint-architecture | `npm run lint:architecture` | Frontend boundaries | Frontend layer rules including tsconfig path aliases | Deep audit 2026-05-31 | Boundaries enforced by build tooling |
| lint-security | `npm run lint:security` | Security policy | Security sensor policy plus secret scanning | Baseline | Never |
| lint-secrets | `npm run lint:secrets` | Secret exposure | Blocks committed secret-shaped material | Baseline | Never |
| lint-external-ai | `npm run lint:external-ai` | Rule 0 / AI gateway | Detects external AI providers outside the privacy-first gateway | Deep audit 2026-05-31 | All external AI is structurally gateway-only |
| lint-bloat | `npm run lint:bloat` | Entropy | Repo bloat and the maintainable file-size contract | Deep audit 2026-05-31 | File-size contract enforced by other tooling |
| lint-dup | `npm run lint:dup` | DRY | Duplicated-line ratchet over product source; fails when new code exceeds the baseline in `validation/duplication_contract.json` | Engineering principles enforcement | Duplication is enforced by another clone tool |
| lint-deps-why | `npm run lint:deps:why` | YAGNI | Requires a one-line rationale in `validation/dependency_rationale.json` for every direct npm and Cargo dependency | Engineering principles enforcement | Dependency justification enforced elsewhere |
| lint-deps | `npm run lint:deps` | Supply chain | Exact-pin policy for npm, Cargo, and runners | Deep audit 2026-05-31 | Pinning enforced by lockfile policy alone |
| lint-actions | `npm run lint:actions` | Supply chain | GitHub Actions pin policy | Deep audit 2026-05-31 | Actions pinned by org policy |
| lint-skills | `npm run lint:skills` | Agent skills | Downloadable Agent Skills packaging integrity | Skills release work | Skills packaging is removed |
| lint-tauri-invokes | `npm run lint:tauri-invokes` | IPC boundary | Frontend invoke map and command-count drift | Baseline | IPC map generated and verified elsewhere |
| lint-tests | `npm run lint:tests` | Test quality | Catches skipped, empty, and no-op tests | Deep audit 2026-05-31 | Test-quality enforced by coverage policy |
| doctor | `npm run doctor` | Environment | Toolchain pins, platform deps, and setup readiness | Deep audit 2026-05-31 | Environment is fully reproducible by container |
| doctor-e2e | `npm run doctor:e2e` | Environment | Playwright browser readiness as a gate | Deep audit 2026-05-31 | E2E setup cannot drift |
| test-run | `npm run test:run` | Frontend behavior | Vitest unit and component proof | Baseline | Never |
| test-scripts | `npm run test:scripts` | Harness tooling | Tests for the harness and security scripts | Baseline | Never |
| test-e2e | `npm run test:e2e` / `test:e2e:all` | System behavior | Playwright end-to-end journeys | Baseline | Never |
| cargo-fmt | `cargo fmt --all -- --check` | Rust style | Rust formatting gate | Baseline | Never |
| cargo-clippy | `cargo clippy --workspace -- -D warnings` | Rust static | Production workspace Clippy is the hard Rust lint gate | Baseline | Never |
| cargo-test | `cargo test --workspace` | Rust behavior | App, core, and integration behavior proof | Baseline | Never |
| release-readiness | `npm run release:readiness` | Release | Release metadata, packages, SBOM, and attestation evidence | Release hardening | Release proof is fully hosted |
| release-verify-public | `npm run release:verify:public` | Release | Verifies published assets and checksums | Release hardening | Public verification is automated post-publish |

## Named Check Modules

`npm run harness:check` and `npm run lint:bloat` run focused modules under
`scripts/harness/checks/`. Group them here so reviewers can find the owning rule.

| Module | Area | Rule it owns |
| ------ | ---- | ------------ |
| `privacy-logging.mjs` (+ submodules) | Rule 0 | No sensitive data in logs across commands, frontend, credentials, and notifications |
| `security-docs.mjs` | Security | Security-sensitive docs and policy presence |
| `source-boundaries.mjs` | Sources | Restricted-source and authenticated-session boundaries |
| `source-quality.mjs` | Sources | Source adapter quality and realism contracts |
| `source-structure.mjs` | Sources | Source taxonomy and domain-record structure |
| `ipc-minimization.mjs` | IPC | Least-privilege Tauri command surface |
| `frontend-contracts.mjs` | Frontend | Frontend contract and state expectations |
| `product-copy.mjs` (+ submodules) | Experience | Plain-language, non-technical-first copy |
| `product-framing.mjs` | Experience | Broad-audience product framing |
| `broad-audience-fixtures.mjs` | Experience | Fixtures cover non-technical job searches |
| `docs-drift.mjs` (+ constants, feature-docs) | Docs | Docs stay aligned with code and constants |
| `release-promises.mjs` | Release | Release claims match shipped evidence |
| `repo-artifacts.mjs` | Entropy | Allowed root entries and no stray generated artifacts |
| `repo-integrity.mjs` | Entropy | Repo structure integrity |
| `dependency-ownership.mjs` | Supply chain | Dependency ownership and review boundaries |

## Adding Or Retiring A Sensor

- Add a sensor only when a failure repeated or a hidden step can become a
  command. See `README.md` "When To Add Harness".
- Register the command and its rule here in the same change.
- When a rule is promoted from a repeated review comment, record the promotion
  in `entropy-control.md` and add the row here.
- Retire a sensor by deleting its row and naming where the rule now lives.

## Related Harness Docs

- [Completion gate](completion-gate.md)
- [Evidence log](evidence-log.md)
- [Reliability](reliability.md)
- [Quality grades](quality-grades.md)
- [Product sense](product-sense.md)
- [Verification matrix](verification-matrix.md)
- [Entropy control](entropy-control.md)
