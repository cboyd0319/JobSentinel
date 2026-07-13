# Deep Harness Audit

Date: 2026-05-31.

Scope:

- `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md`
- `docs/harness/`
- `docs/plans/active/`, `docs/plans/README.md`, and
  `docs/plans/tech-debt-tracker.md`
- `package.json` scripts
- `scripts/check-*.mjs`, `scripts/doctor.mjs`, and Playwright wrapper
- GitHub workflows, PR template, issue templates, and Dependabot config
- README reference anchor, references doc, and harness source policy

## Current Health

The harness is already strong. It has a short root agent map, a deeper harness
system under `docs/harness/`, local-first and Rule 0 policy, source-backed
README rules, deterministic bloat/security/architecture/test-quality/Tauri
invoke sensors, script tests, docs linting, and an environment doctor.

Checks run during this audit:

```bash
npm run doctor
npm run harness:check
npm run lint:docs
npm run test:scripts
```

All passed.

Follow-up on 2026-05-31: CI harness coverage, release preflight, hardcoded
harness policy extraction, broader external-AI provider detection, environment
doctor platform/E2E readiness checks, and active-plan status compaction were
implemented after this audit and closed in `docs/plans/tech-debt-tracker.md`.

Follow-up on 2026-06-01 and 2026-06-17: this audit was reconciled against the
live workflows and harness files. Normal CI harness coverage, path-aware
docs/harness coverage inside CI, release/manual-dispatch preflight, local
toolchain pins, the machine-readable plan index, and the main bloat-runner split
are now closed or narrowed to residual module-ownership work below. Remaining
recommendations stay tracked here and in `docs/plans/tech-debt-tracker.md`.

Follow-up on 2026-06-24: a WalkingLabs Lecture 07-12 and advanced-SOP pass closed
the two remaining open recommendations above. The run-evidence ledger
(`docs/harness/evidence-log.md`, HE-017) closes the State And Interoperability P1,
and the harness architecture map plus sensor registry
(`docs/harness/harness-map.md`, HE-018) closes the Documentation P1 and P2. The
same pass added course-grounded docs not previously tracked as debt:
`docs/harness/reliability.md` (runtime observability and golden journeys),
`docs/harness/quality-grades.md` (domain and layer grading with a simplification
log), `docs/harness/completion-gate.md` (named three-layer gate and clean-state
checklist), and `docs/harness/product-sense.md`. All are registered in
`docs/harness/manifest.json` and pass `npm run harness:check`, `npm run lint:md`,
`npm run lint:prose`, and the five-tuple score gate.

## Highest-Impact Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P0 | Run harness sensors in normal CI | Closed: `.github/workflows/ci.yml` now has a dedicated `harness` job that runs `npm run harness:check` and `npm run test:scripts`. | Closed for normal CI; future risk is accidental removal of the harness job or path filters that hide code changes. | Keep the normal-CI harness job and script-test step visible in workflow reviews. |
| P0 | Make release workflows require a preflight gate | Closed: `.github/workflows/release.yml` now handles manual platform dispatch from an existing release tag. It validates release version metadata and runs harness checks, harness script tests, markdown linting, frontend build, Rust formatting, Rust clippy, and Rust unit tests before artifact build or upload. | Closed for current release and manual package paths; future risk is new packaging workflows skipping the preflight pattern. | Keep package builds in `release.yml` unless a new workflow can prove the same preflight shape. |
| P0 | Extract hardcoded harness policy data from `check-harness.mjs` | `docs/harness/manifest.json` now owns required harness files, policy snippets, and README reference-source URLs; `scripts/check-harness.mjs` reads the manifest and remains the validator. | Closed: source and snippet policy changes are reviewable as data instead of script edits. | Keep new harness policy lists in the manifest unless logic, not policy data, changes. |
| P1 | Split `check-repo-bloat.mjs` into named sensors | Closed for the main runner: `scripts/check-repo-bloat.mjs` is now a 609-line orchestrator. Named modules live under `scripts/harness/checks/`; the largest remaining modules are `privacy-logging.mjs`, `docs-drift.mjs`, `product-copy.mjs`, and `broad-audience-fixtures.mjs`. | Residual review cost now sits in large named modules instead of one mixed runner. | Continue splitting named modules only where the ownership boundary is clear and focused tests can prove the split. |
| P1 | Strengthen security sensors beyond doc-presence checks | Partly closed: security-sensitive implementation checks now live in named modules including `privacy-logging.mjs`, `security-docs.mjs`, `source-quality.mjs`, `source-boundaries.mjs`, and `ipc-minimization.mjs`. | Remaining risk is discoverability across several security-adjacent modules rather than absence of implementation checks. | Add a sensor registry or harness architecture map that names each security-sensitive module, owner, source, and retire condition. |
| P1 | Add diff-aware verification selection | Closed: `npm run harness:plan -- --since origin/main` maps changed files to required sensors and focused test commands from the verification matrix. | Closed for current high-signal paths; future risk is new source roots or workflows not being added to the planner. | Keep planner mappings updated when new source roots, workflows, or sensor commands are added. |
| P1 | Compact active plan state | `docs/plans/active/status.md` now gives the compact restart state, while older progress rows live in `docs/plans/archive/progress-history-2026-05-28-to-2026-05-29.md`. | Closed: active state is easier to restart without losing provenance. Drift can return if future slices update long plans but skip the compact status. | Keep `docs/plans/active/status.md` current and archive old progress rows when they become history, not active state. |

## Privacy And Rule 0 Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P0 | Broaden external AI provider detection | Closed: `npm run lint:external-ai` scans code plus JSON, YAML, TOML, and env-style config for direct provider endpoints, SDK imports, hosted inference endpoints, dependency declarations, and provider API-key variables outside `src/shared/externalAi/`; it runs through `npm run harness:check`. | Closed for the current provider set; new providers still need explicit sensor updates and AI-gateway review. | Keep all external AI additions routed through the gateway and update the provider-pattern sensor in the same change. |
| P1 | Make feature privacy labels machine-readable | Closed: `docs/harness/feature-privacy-labels.json` records core feature privacy labels, data categories, external-AI allowance, local fallbacks, and sensitivity notes; `npm run harness:check` validates its shape and required features. | Closed for core labeled features; future risk is new features shipping without a manifest entry. | Update the feature privacy-label manifest and harness tests with every new sensitive or external-AI-capable feature. |
| P1 | Require Rule 0 evidence in PR template | Closed: `.github/PULL_REQUEST_TEMPLATE.md` now requires Rule 0, local-first workflows, external AI gateway routing, payload preview/redaction/cancel/approval/logging, safe support reports, broad-audience support, and zero-technical-knowledge review evidence. | Closed for the current template; future drift is blocked by manifest snippets in `npm run harness:check`. | Keep PR review evidence aligned with Rule 0 and responsible-use boundaries. |
| P2 | Normalize support template wording | Closed: issue templates now ask for a safe support report and point users to Copy Safe Support Report instead of old attachment wording. | Closed for current issue templates; future risk is adding new support paths with old report or scraper-first language. | Keep issue-template support wording covered by the product-copy sensor. |

## Environment And Platform Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P1 | Extend `npm run doctor` for Linux Tauri dependencies | `scripts/doctor.mjs` now checks WebKitGTK, GTK, appindicator, librsvg, and `patchelf` on Linux. | Closed: Linux contributors get an early failure with install guidance before Tauri build. | Keep package names current with Tauri Linux requirements. |
| P1 | Pin local toolchain expectations | Closed: `.nvmrc` pins Node 24.18.0, `rust-toolchain.toml` pins Rust 1.96.0 with `clippy` and `rustfmt`, and `doctor` checks both files. | Closed for current local expectations; future risk is CI/runtime drift when workflows change Node or Rust baselines. | Update the pin files, doctor checks, and CI workflows together when changing runtime baselines. |
| P2 | Check Playwright browser install state | `doctor` now launches Playwright Chromium as a warning by default, and `npm run doctor:e2e` makes that launch a failure gate. | Closed: E2E setup can fail early with the browser install command before test runs. | Keep `doctor:e2e` in E2E setup and troubleshooting docs. |

## Verification Speed Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P1 | Add runtime budget tracking for E2E | Closed: `npm run test:e2e:smoke:budget` and `npm run test:e2e:all:budget` run Playwright through JSON output and fail when duration or test count exceeds maintained budgets. | Closed for explicit budget runs; normal E2E commands still prioritize familiar output and do not enforce budgets by default. | Use budget commands for performance-sensitive E2E checks and update budgets only with measured evidence. |
| P1 | Add changed-test suggestion support | Closed: `npm run harness:plan -- --since origin/main` suggests adjacent Vitest tests, changed Playwright specs, script tests, Rust gates, Tauri invoke checks, and fallback unit suites when no adjacent frontend test exists. | Closed for current repo layout; new test roots must be added with focused coverage. | Update the planner and `scripts/tests/harness-plan.test.mjs` when test layout changes. |
| P2 | Add CI smoke E2E only when UI paths change | Normal CI does not run Playwright. | UI regressions can pass PR CI when unit tests miss a workflow issue. | Add path-filtered Chromium smoke E2E for UI/workflow paths or keep it as a manual required release gate if CI time is too high. |

## State And Interoperability Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P1 | Add a compact run-evidence ledger | Current handoffs list many historical checks, but there is no small current evidence ledger with command, scope, exit code, and date. | Completion claims require reading long plans and chat, which weakens restart reliability. | Add `docs/harness/evidence-log.md` or a JSON ledger with no raw output and no sensitive data. |
| P1 | Build a generic harness adapter | Walking Labs `harness-creator` validator scored JobSentinel low because it expects root `feature_list.json`, `progress.md`, `session-handoff.md`, and `init.sh`. | External harness tools cannot read JobSentinel's richer docs without adapters. | Generate temporary compatibility files from `docs/plans/` and `docs/harness/`, then run external validators against the generated view. |
| P2 | Add machine-readable plan index | Closed: `docs/plans/index.json` records active plan IDs, status, focus, next steps, dependencies, and verification posture. | Closed for active-plan discovery; future risk is stale index data when plan files change without updating it. | Keep the plan index updated with active-plan changes and keep `harness:session` pointed at the compact status surface. |
| P2 | Keep compatibility wrappers under harness check | Closed: `AGENTS.md`, `CLAUDE.md`, and `.github/copilot-instructions.md` now carry Rule 0 and external-AI gateway reminders, and `docs/harness/manifest.json` plus `scripts/check-harness-policy.test.mjs` assert wrapper snippets. | Closed for current wrappers; future wrapper files must be added to the manifest. | Keep compatibility wrappers short and add snippet checks when a new agent entrypoint is introduced. |

## CI, Release, And Dependency Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P1 | Expand Docs Harness workflow paths | Closed: `.github/workflows/ci.yml` now classifies changed files and routes docs, scripts, package metadata, workflow files, harness docs, wrapper docs, and README surfaces through the CI harness job with `npm run harness:check`, `npm run test:scripts`, and `npm run lint:md` when relevant. | Closed for current docs/harness script coverage; future risk is adding harness files outside the classifier. | Update the CI classifier when new harness surfaces are added. |
| P1 | Group Dependabot updates by ecosystem/risk | `.github/dependabot.yml` allows up to 25 open PRs across npm, cargo, and GitHub Actions. | Dependency maintenance can flood review and CI. | Use Dependabot `groups` for non-security updates while keeping security updates isolated and prompt. |
| P2 | Validate manual build inputs | Closed: `release.yml` manual dispatch runs `npm run release:check-version -- "${{ inputs.version }}"` before build or upload. | Closed for current manual package path; future risk is adding manual packaging workflows without metadata validation. | Keep manual package dispatch in `release.yml` or reuse `scripts/release/validate-release-version.mjs` for any new package workflow. |
| P2 | Reduce release workflow permission scope | Closed: workflow-level permissions stay read-only, and `release.yml` grants write permissions only to release creation and asset-upload jobs. | Closed for current workflow scope; future risk is broad permissions returning during workflow edits. | Keep upload permissions scoped to release-upload jobs or steps. |

## Sensor Coverage Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P1 | Scan path aliases in frontend boundary checks | Closed: `check-frontend-boundaries.mjs` now reads `tsconfig.json` path aliases, parses commented tsconfig JSON safely, resolves `@/*` imports, and checks aliased imports against the same layer rules as relative imports. | Closed for current aliases; future risk is adding more complex alias patterns without fixture coverage. | Keep alias fixtures updated when `compilerOptions.paths` changes. |
| P2 | Expand test-quality smells | Closed: `check-test-quality.mjs` now catches `test.skip`, empty JavaScript test bodies, and empty Rust `#[test]` functions in addition to no-op assertions, focused tests, and disabled-block markers. | Closed for current targeted smells; future risk is new weak-test shapes that need parser-backed detection. | Add fixtures before expanding to broader console-output or AST-style checks. |
| P2 | Add external reference health check | README reference presence is checked, but HTTP health is not. | Link rot can degrade the research-project presentation without local failure. | Add a manual or scheduled `check:refs` with cache and rate limits. Do not run it in every local harness pass. |
| P2 | Add workflow pin drift check | Closed: `ci.yml` now has a weekly/manual security drift path that runs `npm run release:check-deps`, including the latest stable GitHub Actions pin check, and `npm run lint:security` verifies that gate stays present. | Closed for current workflows; future risk is new workflows bypassing the scheduled/manual drift path. | Keep workflow additions covered by `npm run lint:security` and `npm run lint:actions`. |

## Documentation Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P1 | Replace stale debt lists with one source of truth | `docs/harness/entropy-control.md` had a current-debt table that duplicated tracker state. | Duplicate debt lists become stale and mislead agents. | Keep `docs/plans/tech-debt-tracker.md` as the current debt source and link from entropy docs. |
| P1 | Add harness architecture map | The harness is spread across docs, scripts, workflows, plans, and templates. | New agents can run checks, but may not understand which script owns which rule. | Add a diagram or table mapping guides, sensors, state, CI gates, and release gates. |
| P2 | Add sensor ownership comments | Several scripts contain many rules with no owner or promotion history. | Future maintainers cannot tell whether a rule is current, legacy, or user-requested law. | Add a sensor registry with `id`, `area`, `reason`, `source`, `owner`, and `retire_when`. |

## Recommended Sequence

1. Continue splitting oversized named sensor modules only where the boundary is
   clear and focused tests can prove the split.
2. Keep diff-aware `harness:plan` mappings current as source and test roots evolve.
3. Keep feature privacy label manifest current as sensitive or external-AI-capable features evolve.
4. Keep E2E runtime budgets current with measured smoke and full-suite evidence.
5. Add a sensor registry or harness architecture map for discoverability.
6. Build a generic harness compatibility adapter only after the native harness
   state is compact.
