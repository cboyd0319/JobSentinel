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
- README reference index and harness source policy

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

Follow-up on 2026-06-01: this audit was reconciled against the live workflows
and harness files. Normal CI harness coverage, docs-harness script coverage,
release/manual-build preflight, local toolchain pins, the machine-readable plan
index, and the main bloat-runner split are now closed or narrowed to residual
module-ownership work below. Remaining recommendations stay tracked here and in
`docs/plans/tech-debt-tracker.md`.

## Highest-Impact Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P0 | Run harness sensors in normal CI | Closed: `.github/workflows/ci.yml` now has a dedicated `harness` job that runs `npm run harness:check` and `npm run test:scripts`. | Closed for normal CI; future risk is accidental removal of the harness job or path filters that hide code changes. | Keep the normal-CI harness job and script-test step visible in workflow reviews. |
| P0 | Make release workflows require a preflight gate | Closed: `.github/workflows/release.yml`, `build-linux.yml`, and `build-windows.yml` now validate release version metadata and run harness checks, harness script tests, markdown linting, frontend build, Rust formatting, Rust clippy, and Rust unit tests before artifact build or upload. | Closed for current release and manual build workflows; future risk is new packaging workflows skipping the preflight pattern. | Reuse this preflight shape for any new release or artifact workflow. |
| P0 | Extract hardcoded harness policy data from `check-harness.mjs` | `docs/harness/manifest.json` now owns required harness files, policy snippets, and README reference-source URLs; `scripts/check-harness.mjs` reads the manifest and remains the validator. | Closed: source and snippet policy changes are reviewable as data instead of script edits. | Keep new harness policy lists in the manifest unless logic, not policy data, changes. |
| P1 | Split `check-repo-bloat.mjs` into named sensors | Closed for the main runner: `scripts/check-repo-bloat.mjs` is now a 609-line orchestrator. Named modules live under `scripts/harness/checks/`; the largest remaining modules are `privacy-logging.mjs`, `docs-drift.mjs`, `product-copy.mjs`, and `broad-audience-fixtures.mjs`. | Residual review cost now sits in large named modules instead of one mixed runner. | Continue splitting named modules only where the ownership boundary is clear and focused tests can prove the split. |
| P1 | Strengthen security sensors beyond doc-presence checks | Partly closed: security-sensitive implementation checks now live in named modules including `privacy-logging.mjs`, `security-docs.mjs`, `source-quality.mjs`, `source-boundaries.mjs`, and `ipc-minimization.mjs`. | Remaining risk is discoverability across several security-adjacent modules rather than absence of implementation checks. | Add a sensor registry or harness architecture map that names each security-sensitive module, owner, source, and retire condition. |
| P1 | Add diff-aware verification selection | Closed: `npm run harness:plan -- --since origin/main` maps changed files to required sensors and focused test commands from the verification matrix. | Closed for current high-signal paths; future risk is new source roots or workflows not being added to the planner. | Keep planner mappings updated when new source roots, workflows, or sensor commands are added. |
| P1 | Compact active plan state | `docs/plans/active/status.md` now gives the compact restart state, while older progress rows live in `docs/plans/archive/progress-history-2026-05-28-to-2026-05-29.md`. | Closed: active state is easier to restart without losing provenance. Drift can return if future slices update long plans but skip the compact status. | Keep `docs/plans/active/status.md` current and archive old progress rows when they become history, not active state. |

## Privacy And Rule 0 Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P0 | Broaden external AI provider detection | Closed: `npm run lint:external-ai` scans code plus JSON, YAML, TOML, and env-style config for direct provider endpoints, SDK imports, hosted inference endpoints, dependency declarations, and provider API-key variables outside `src/services/aiGateway.ts`; it runs through `npm run harness:check`. | Closed for the current provider set; new providers still need explicit sensor updates and AI-gateway review. | Keep all external AI additions routed through the gateway and update the provider-pattern sensor in the same change. |
| P1 | Make feature privacy labels machine-readable | Closed: `docs/harness/feature-privacy-labels.json` records core feature privacy labels, data categories, external-AI allowance, local fallbacks, and sensitivity notes; `npm run harness:check` validates its shape and required features. | Closed for core labeled features; future risk is new features shipping without a manifest entry. | Update the feature privacy-label manifest and harness tests with every new sensitive or external-AI-capable feature. |
| P1 | Require Rule 0 evidence in PR template | Closed: `.github/PULL_REQUEST_TEMPLATE.md` now requires Rule 0, local-first workflows, external AI gateway routing, payload preview/redaction/cancel/approval/logging, safe support reports, broad-audience support, and zero-technical-knowledge review evidence. | Closed for the current template; future drift is blocked by manifest snippets in `npm run harness:check`. | Keep PR review evidence aligned with Rule 0 and responsible-use boundaries. |
| P2 | Normalize support template wording | Closed: issue templates now ask for a safe support report and point users to Copy Safe Support Report instead of old attachment wording. | Closed for current issue templates; future risk is adding new support paths with old report or scraper-first language. | Keep issue-template support wording covered by the product-copy sensor. |

## Environment And Platform Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P1 | Extend `npm run doctor` for Linux Tauri dependencies | `scripts/doctor.mjs` now checks WebKitGTK, GTK, appindicator, librsvg, and `patchelf` on Linux. | Closed: Linux contributors get an early failure with install guidance before Tauri build. | Keep package names current with Tauri Linux requirements. |
| P1 | Pin local toolchain expectations | Closed: `.nvmrc` pins Node 20, `rust-toolchain.toml` pins stable Rust with `clippy` and `rustfmt`, and `doctor` checks both files. | Closed for current local expectations; future risk is CI/runtime drift when workflows change Node or Rust baselines. | Update the pin files, doctor checks, and CI workflows together when changing runtime baselines. |
| P2 | Check Playwright browser install state | `doctor` now launches Playwright Chromium as a warning by default, and `npm run doctor:e2e` makes that launch a failure gate. | Closed: E2E setup can fail early with the browser install command before test runs. | Keep `doctor:e2e` in E2E setup and troubleshooting docs. |

## Verification Speed Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P1 | Add runtime budget tracking for E2E | Closed: `npm run test:e2e:smoke:budget` and `npm run test:e2e:all:budget` run Playwright through JSON output and fail when duration or test count exceeds maintained budgets. | Closed for explicit budget runs; normal E2E commands still prioritize familiar output and do not enforce budgets by default. | Use budget commands for performance-sensitive E2E checks and update budgets only with measured evidence. |
| P1 | Add changed-test suggestion support | Closed: `npm run harness:plan -- --since origin/main` suggests adjacent Vitest tests, changed Playwright specs, script tests, Rust gates, Tauri invoke checks, and fallback unit suites when no adjacent frontend test exists. | Closed for current repo layout; new test roots must be added with focused coverage. | Update the planner and `scripts/harness-plan.test.mjs` when test layout changes. |
| P2 | Add CI smoke E2E only when UI paths change | Normal CI does not run Playwright. | UI regressions can pass PR CI when unit tests miss a workflow issue. | Add path-filtered Chromium smoke E2E for UI/workflow paths or keep it as a manual required release gate if CI time is too high. |

## State And Interoperability Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P1 | Add a compact run-evidence ledger | Current handoffs list many historical checks, but there is no small current evidence ledger with command, scope, exit code, and date. | Completion claims require reading long plans and chat, which weakens restart reliability. | Add `docs/harness/evidence-log.md` or a JSON ledger with no raw output and no sensitive data. |
| P1 | Build a generic harness adapter | Walking Labs `harness-creator` validator scored JobSentinel low because it expects root `feature_list.json`, `progress.md`, `session-handoff.md`, and `init.sh`. | External harness tools cannot read JobSentinel's richer docs without adapters. | Generate temporary compatibility files from `docs/plans/` and `docs/harness/`, then run external validators against the generated view. |
| P2 | Add machine-readable plan index | Closed: `docs/plans/index.json` records active plan IDs, status, focus, next steps, dependencies, and verification posture. | Closed for active-plan discovery; future risk is stale index data when plan files change without updating it. | Keep the plan index updated with active-plan changes and keep `harness:session` pointed at the compact status surface. |
| P2 | Keep compatibility wrappers under harness check | `CLAUDE.md` and `.github/copilot-instructions.md` are short wrappers, but required snippets do not currently check them. | Wrapper drift could route some tools to stale rules. | Add lightweight snippet checks for wrapper files. |

## CI, Release, And Dependency Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P1 | Expand Docs Harness workflow paths | Closed: `.github/workflows/docs-harness.yml` now watches `scripts/**`, `package.json`, `package-lock.json`, harness docs, wrapper docs, and README surfaces, then runs `npm run harness:check`, `npm run test:scripts`, and `npm run lint:md`. | Closed for current docs-harness script coverage; future risk is adding harness files outside watched paths. | Keep new harness surfaces under watched paths or update the workflow path list in the same change. |
| P1 | Group Dependabot updates by ecosystem/risk | `.github/dependabot.yml` allows up to 25 open PRs across npm, cargo, and GitHub Actions. | Dependency maintenance can flood review and CI. | Use Dependabot `groups` for non-security updates while keeping security updates isolated and prompt. |
| P2 | Validate manual build inputs | Closed: `build-linux.yml` and `build-windows.yml` run `npm run release:check-version -- "${{ github.event.inputs.version }}"` before build or upload. | Closed for current manual build workflows; future risk is adding manual packaging workflows without metadata validation. | Reuse `scripts/validate-release-version.mjs` for new manual release inputs. |
| P2 | Reduce release workflow permission scope | Closed: manual build workflows now keep workflow-level permissions read-only and grant write permissions only to jobs that upload release artifacts. | Closed for current workflow scope; future risk is broad permissions returning during workflow edits. | Keep upload permissions scoped to release-upload jobs or steps. |

## Sensor Coverage Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P1 | Scan path aliases in frontend boundary checks | `tsconfig.json` defines `@/*`, while `check-frontend-boundaries.mjs` currently resolves relative imports only. | A future alias import can bypass layer-boundary checks. | Teach the boundary checker to resolve `@/` paths from `tsconfig.json`. |
| P2 | Expand test-quality smells | `check-test-quality.mjs` catches no-op true assertions, focused tests, and some skipped blocks, but not every empty test or `test.skip` pattern. | Weak tests can still enter through unrecognized shapes. | Add `test.skip`, empty test body, and avoid broad console-output checks unless scoped to tests. |
| P2 | Add external reference health check | README reference presence is checked, but HTTP health is not. | Link rot can degrade the research-project presentation without local failure. | Add a manual or scheduled `check:refs` with cache and rate limits. Do not run it in every local harness pass. |
| P2 | Add workflow pin drift check | Actions are pinned to SHAs with version comments, but no script validates that comments match current upstream tags. | Action pins can silently fall behind intended version labels. | Add a scheduled/manual action-pin review script or Dependabot-backed workflow audit. |

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
