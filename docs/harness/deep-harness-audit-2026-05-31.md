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
harness policy extraction, broader external-AI provider detection, and
environment doctor platform/E2E readiness checks, and active-plan status
compaction were implemented after this audit and closed in
`docs/plans/tech-debt-tracker.md`. Remaining recommendations stay tracked
there.

## Highest-Impact Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P0 | Run harness sensors in normal CI | `.github/workflows/ci.yml` runs TypeScript, ESLint, unit tests, Rust tests, and advisory checks, but not `npm run harness:check` or `npm run test:scripts`. | Code-only PRs can break architecture boundaries, Tauri invoke contracts, test-quality rules, README/reference checks, or privacy drift sensors without CI failure. | Add a lightweight `harness` job or add `npm run harness:check` and `npm run test:scripts` to the frontend CI job. |
| P0 | Make release workflows require a preflight gate | `.github/workflows/release.yml`, `build-linux.yml`, and `build-windows.yml` build packages without first running the local harness, docs, unit, Rust, and version/tag checks. | A tag or manual build can ship stale docs, broken local-first claims, or version mismatch even if ordinary CI would have caught it. | Add release preflight: `npm run harness:check`, `npm run doctor` where appropriate, `npm run build`, Rust fmt/clippy/tests, and tag/package version agreement. |
| P0 | Extract hardcoded harness policy data from `check-harness.mjs` | `docs/harness/manifest.json` now owns required harness files, policy snippets, and README reference-source URLs; `scripts/check-harness.mjs` reads the manifest and remains the validator. | Closed: source and snippet policy changes are reviewable as data instead of script edits. | Keep new harness policy lists in the manifest unless logic, not policy data, changes. |
| P1 | Split `check-repo-bloat.mjs` into named sensors | Filesystem, tracked-artifact, and dependency-ownership checks now live under `scripts/harness/checks/`; `scripts/check-repo-bloat.mjs` still exceeds 5,000 lines and covers stale docs, privacy logging, product phrasing, fixtures, and source security patterns. | Large mixed-purpose sensors are hard to review, hard to extend safely, and invite accidental broad edits. | Continue the registry split under `scripts/harness/checks/` with separate modules for docs drift, privacy logging, product copy, fixture quality, and release metadata. |
| P1 | Strengthen security sensors beyond doc-presence checks | `scripts/check-security-sensors.mjs` verifies required security docs, matrix entries, and CI phrases. Many implementation privacy checks live inside the bloat sensor instead. | Security enforcement is split across script names in a way agents will not predict. Some checks prove text exists, not that unsafe patterns are blocked. | Move security-sensitive implementation pattern checks into `check-security-sensors.mjs` or a shared security registry, then keep `check-repo-bloat.mjs` focused on bloat and drift. |
| P1 | Add diff-aware verification selection | `docs/harness/verification-matrix.md` is clear but manual. There is no command that maps changed files to required sensors. | Agents may over-run slow checks or under-run required checks, especially during long sessions. | Add `npm run harness:plan -- --since origin/main` to inspect changed files and print required commands from the matrix. |
| P1 | Compact active plan state | `docs/plans/active/status.md` now gives the compact restart state, while older progress rows live in `docs/plans/archive/progress-history-2026-05-28-to-2026-05-29.md`. | Closed: active state is easier to restart without losing provenance. Drift can return if future slices update long plans but skip the compact status. | Keep `docs/plans/active/status.md` current and archive old progress rows when they become history, not active state. |

## Privacy And Rule 0 Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P0 | Broaden external AI provider detection | `check-harness.mjs` blocks obvious OpenAI call shapes outside `src/services/aiGateway.ts`, but the provider set is narrow. | A future provider path could be added under another SDK or endpoint without going through the gateway. | Expand provider patterns to Anthropic, Gemini, Azure OpenAI, Bedrock, hosted inference endpoints, and generic `/v1/chat/completions` style endpoints; scan YAML/TOML/JSON config too. |
| P1 | Make feature privacy labels machine-readable | Privacy labels exist in `src/services/aiGateway.ts` and docs, but there is no repo-wide feature-label manifest. | Feature docs can drift from code, and reviewers must infer whether a feature is local-only, sensitive, or external-AI optional. | Add `docs/harness/feature-privacy-labels.json` or frontmatter in feature docs, then validate labels through `harness:check`. |
| P1 | Require Rule 0 evidence in PR template | `.github/PULL_REQUEST_TEMPLATE.md` has a privacy checklist but does not name Rule 0, external AI gateway routing, payload preview, broad audience, or zero-technical-skill support. | Human review can miss core project law when changes happen outside normal agent sessions. | Update PR template with Rule 0, external AI, support/debug-report, and user-ease checks. |
| P2 | Normalize support template wording | Issue templates ask for an "ANONYMIZED" report while app/docs mostly use "safe" or "sanitized debug report." | Mixed support language makes the easiest user path less consistent. | Use "Copy Debug Report" and "sanitized report" consistently across issue templates and docs. |

## Environment And Platform Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P1 | Extend `npm run doctor` for Linux Tauri dependencies | `scripts/doctor.mjs` now checks WebKitGTK, GTK, appindicator, librsvg, and `patchelf` on Linux. | Closed: Linux contributors get an early failure with install guidance before Tauri build. | Keep package names current with Tauri Linux requirements. |
| P1 | Pin local toolchain expectations | `doctor` now warns when local Node major differs from CI Node 20 or Rust reports nightly/beta instead of stable. | Closed as a low-churn warning gate; exact pin files remain optional if reproducibility problems appear. | Revisit `.nvmrc` or `rust-toolchain.toml` only if warning-based guidance proves insufficient. |
| P2 | Check Playwright browser install state | `doctor` now launches Playwright Chromium as a warning by default, and `npm run doctor:e2e` makes that launch a failure gate. | Closed: E2E setup can fail early with the browser install command before test runs. | Keep `doctor:e2e` in E2E setup and troubleshooting docs. |

## Verification Speed Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P1 | Add runtime budget tracking for E2E | Playwright commands are faster than before, but timings live in plan prose and terminal output, not a maintained artifact. | Slow tests can regress until developers are back to long local loops. | Use Playwright JSON output for smoke/full runs and add a budget check for smoke gate duration and test count. |
| P1 | Add changed-test suggestion support | `test:e2e:last-failed` exists, but there is no repo command that maps changed files to focused Vitest/Playwright/Rust tests. | Agents may choose full suites too often or miss the right targeted test. | Extend the proposed `harness:plan` command to suggest focused tests from changed paths. |
| P2 | Add CI smoke E2E only when UI paths change | Normal CI does not run Playwright. | UI regressions can pass PR CI when unit tests miss a workflow issue. | Add path-filtered Chromium smoke E2E for UI/workflow paths or keep it as a manual required release gate if CI time is too high. |

## State And Interoperability Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P1 | Add a compact run-evidence ledger | Current handoffs list many historical checks, but there is no small current evidence ledger with command, scope, exit code, and date. | Completion claims require reading long plans and chat, which weakens restart reliability. | Add `docs/harness/evidence-log.md` or a JSON ledger with no raw output and no sensitive data. |
| P1 | Build a generic harness adapter | Walking Labs `harness-creator` validator scored JobSentinel low because it expects root `feature_list.json`, `progress.md`, `session-handoff.md`, and `init.sh`. | External harness tools cannot read JobSentinel's richer docs without adapters. | Generate temporary compatibility files from `docs/plans/` and `docs/harness/`, then run external validators against the generated view. |
| P2 | Add machine-readable plan index | `docs/plans/README.md` is human-readable, but active-plan status and dependencies are not machine-readable. | Agents cannot cheaply answer "what is active, blocked, or next?" without reading long docs. | Add `docs/plans/index.json` with active plan id, status, owner, next step, dependencies, and verification status. |
| P2 | Keep compatibility wrappers under harness check | `CLAUDE.md` and `.github/copilot-instructions.md` are short wrappers, but required snippets do not currently check them. | Wrapper drift could route some tools to stale rules. | Add lightweight snippet checks for wrapper files. |

## CI, Release, And Dependency Improvements

| Priority | Improvement | Evidence | Risk | Recommended fix |
| -------- | ----------- | -------- | ---- | --------------- |
| P1 | Expand Docs Harness workflow paths | `.github/workflows/docs-harness.yml` watches `scripts/check-harness.mjs` but not imported sensor scripts such as `check-repo-bloat.mjs`, `check-security-sensors.mjs`, `check-tauri-invokes.mjs`, or `doctor.mjs`. | Sensor changes may skip the docs-harness workflow path filter. | Include `scripts/*.mjs` and `scripts/*.test.mjs` in the docs-harness workflow, or use a dedicated harness workflow for scripts. |
| P1 | Group Dependabot updates by ecosystem/risk | `.github/dependabot.yml` allows up to 25 open PRs across npm, cargo, and GitHub Actions. | Dependency maintenance can flood review and CI. | Use Dependabot `groups` for non-security updates while keeping security updates isolated and prompt. |
| P2 | Validate manual build inputs | `build-linux.yml` and `build-windows.yml` take a free-form version input. | Manual artifact upload can target a version that does not match package metadata. | Check the input against `package.json`, Tauri config, and Cargo version before build/upload. |
| P2 | Reduce release workflow permission scope | Build workflows use release upload permissions where needed, but `build-windows.yml` sets `contents: write` at workflow level. | Broad permissions make workflow reviews harder. | Prefer job-level `contents: write` only for the upload step/job. |

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

1. Add CI harness coverage and script-test coverage.
2. Add release preflight and version-input validation.
3. Split `check-repo-bloat.mjs` into named sensor modules.
4. Add diff-aware `harness:plan`.
5. Add feature privacy label manifest and broader external AI provider scans.
6. Add machine-readable plan status.
7. Add E2E runtime budget tracking.
8. Build a generic harness compatibility adapter only after the native harness
    state is compact.
