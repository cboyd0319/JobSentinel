# Repo Cleanup Handoff

## Current State

This handoff belongs to the active
[repo cleanup and quality sweep](repo-cleanup-and-quality-sweep.md).

The cleanup goal remains open. Do not mark it complete until current evidence
proves the repo-wide objective: identify and fix all known issues across the
JobSentinel repo, then verify docs and code against that full scope.

All tracked files under `docs/plans/active/` are now part of the current goal
scope:

- `guided-job-search-intake.md`
- `repo-cleanup-and-quality-sweep.md`
- `repo-cleanup-handoff.md`
- `research-backed-product-improvements.md`

Latest pushed harness commits before this slice:

- `c6bbd4d4 Broaden external AI gateway sensor`
- `ea907c99 Refresh active plan handoff`
- `55761c07 Record deep harness audit`
- `03af1711 Document harness creator skill evaluation`
- `5b88f700 Add harness environment doctor`

Current branch note:

- `main` was clean and synced with `origin/main` before the current
  environment-doctor platform/E2E readiness slice.
- The 2026-05-31 Docs Harness and CI runs for `c6bbd4d4` passed.
- The current slice is authorized because the user requested active plan and
  handoff docs stay accurate and committed to `main` while the goal continues.
- Continue using small verified commits. Avoid later remote CI unless the user
  explicitly asks or the full-goal completion pass requires it.

Current cleanup posture:

- Bloat and junk sensors exist and run through `npm run lint:bloat`.
- Docs harness exists and runs through `npm run harness:check`.
- Environment readiness is now checked through `npm run doctor`; E2E/browser
  readiness uses `npm run doctor:e2e`.
- Test-quality guard exists and blocks focused tests, runtime skips, and weak
  E2E assertions through `npm run lint:tests`.
- Normal CI now runs `npm run harness:check` and `npm run test:scripts` in a
  dedicated harness job.
- Docs Harness now watches the whole `scripts/**` set and runs harness script
  tests, so sensor changes no longer bypass the docs workflow path filter.
- Release and manual Linux/Windows build workflows now validate release version
  metadata and run preflight checks before artifact build or upload.
- External-AI provider detection now runs through `npm run lint:external-ai`
  and through `npm run harness:check`. It scans code plus JSON, YAML, TOML, and
  env-style config for direct provider endpoints, SDKs, hosted inference
  endpoints, dependency declarations, and provider API-key variables outside
  `src/services/aiGateway.ts`.
- Walking Labs harness material has been evaluated twice: Lecture 02 mapped the
  repo against instructions, tools, environment, state, and feedback; the
  `harness-creator` skill evaluation recorded the external validator mismatch
  as an interoperability gap, not a repo quality score.
- A deep harness audit on 2026-05-31 identified harness debt. CI harness
  coverage, release preflight, external AI provider scan breadth, and doctor
  platform/E2E readiness are now closed; hardcoded harness policy data,
  oversized mixed sensors, and active-plan compaction remain tracked in
  `docs/plans/tech-debt-tracker.md`.
- Chromium and WebKit focused E2E flows were stabilized for keyboard navigation
  and job filtering in the latest slice.
- Root README now points developers to the quality gates that protect this work.
- Research-backed product improvement planning exists as an active plan across
  setup, scoring, resume, ATS, ghost detection, applications, market
  intelligence, accessibility, privacy, and security.
- Root and nested junk scans were rerun on 2026-05-28. Local `.DS_Store`
  artifacts in root/docs paths were removed. Tracked disposable pattern scan,
  untracked scan, local artifact `find` scan, and `npm run lint:bloat` passed.
- User ease is now a standalone goal requirement: assume zero technical
  knowledge for end users. Troubleshooting and issue reporting must stay
  one-click, plain-language, and privacy-preserving.
- Broad audience fit is also a standalone design requirement: JobSentinel is
  for all job seekers and technical plus non-technical roles, not just
  engineers.
- Protective job-search guidance is now a standalone design requirement:
  ghost-job protection, pay-equity safeguards, long-term-unemployment pacing,
  bias-aware application routes, practical tone, and local-first privacy are
  core goal inputs.
- Harness docs and templates now require audience/ease, support-path, rollback,
  handoff, and experience-sensor thinking for non-trivial work. The harness
  check guards those template snippets.
- Root README was rechecked against live release assets, package version,
  current command count, and product direction.
- `docs/README.md` is now a current documentation hub instead of a stale
  release log. Harness checks no longer require volatile command-count claims
  inside that docs index.
- The plans index includes all current active plans, including the
  research-backed product improvements plan.
- Backend resume parsing, rendering, export, JSON Resume, builder, and
  readability-analysis fixtures now use community-program and client-service
  examples instead of engineer-first defaults, and the readability keyword
  extractor covers common non-software role terms.
- Resume match database fixtures now cover client-support and case-management
  examples instead of relying on software-engineering and TechCorp defaults.
- Resume match degree parsing now guards against false M.A. matches inside
  words such as "management".
- Backend import/schema.org and deep-link generator examples now use
  customer-support and care-coordination examples instead of engineer and
  tech-hub defaults.
- Release notes now use Resume Match and resume-readability framing instead of
  older optimization and score-first language.
- Root README now has the product screenshot, route map, abstract, at-a-glance
  table, download path, safety model, research model, and source index in the
  maintained information-design order.

## Recent Work Landed

Recent cleanup slices on `main` include:

- Protective ghost/posting-risk wording across UI and maintained docs, replacing
  fake/real verdict language with stale, low-trust, needs-review, and
  verify-before-tailoring guidance.
- Backend resume fixture cleanup and broader role keyword extraction for
  resume readability checks.
- Resume match fixture cleanup for broad-audience scoring examples.
- Degree-detection regression coverage for case-management job descriptions.
- Backend import/deep-link fixture cleanup for broad-audience examples.
- Release-note copy cleanup for current resume framing.
- WebKit E2E shortcut delivery and dashboard count stabilization.
- Chromium E2E stabilization after full-suite failures.
- Active research-backed product planning for job-seeker behavior, ATS-aware
  preparation, ghost/stale-post research, local source collection, salary
  negotiation, and pay-equity support.
- Resume Match copy moved from ATS/keyword jargon to resume-match and
  job-word language.
- Root and nested junk scan removed local `.DS_Store` artifacts and confirmed
  no tracked or untracked disposable artifacts remain outside expected ignored
  build/dependency roots.
- Research-backed guided intake, work-to-avoid intake, and setup review summary.
- Plain-language Deep Link, Browser Import Button, problem history, and ATS
  word-match copy.
- Harness improvement from current public harness-engineering references and
  Persona/Bluepeak-AI sibling repo patterns.
- Root README release/download accuracy update and WebKit slash-shortcut E2E
  stabilization.
- Resume sub-score percentage rendering fix.
- JSDOM download navigation noise cleanup.
- Empty source-directory bloat guard.
- Frontend development logging sanitization.
- Context hook split to remove react-refresh suppressions.
- Browser memory typing and trend-chart typing cleanup.
- Malformed stored JSON validation across resume, ATS, analytics, score, and
  error-log surfaces.
- Credential, scraper, notification, import, resume, feedback, and keyring
  privacy hardening.
- Maintained docs normalization to remove stale status markers, glyph-heavy
  diagrams, stale release promises, and version drift.
- Root README was redesigned as a professional research-project front door and
  pushed to `origin/main`; the latest remote Docs Harness and CI runs passed
  before this handoff refresh.
- Setup now asks for review volume in plain language and maps the answer to
  existing local source limits and alert strength.
- Browser import copy now avoids bookmarklet, any-website, safety-token, and
  auto-import language; clipboard failures show safe copy guidance.
- Resume page copy now uses broad skill categories, plain match labels, and
  cautious skill-gap language instead of engineer-first categories or raw
  score-breakdown wording.
- Resume Builder, Resume Match, market intelligence, and company research test
  fixtures now use broader customer-support, care, education, retail,
  logistics, hospitality, finance, public-service, and community-program
  examples.
- `docs/README.md` now routes users, contributors, privacy reviewers, research
  reviewers, and coding agents to maintained docs without duplicating release
  notes.
- Dashboard hooks, dev mock handlers, Application Assist, notifications,
  location heatmap, developer testing docs, and small validation/stat fixtures
  were rebased away from engineer-first examples and covered with bloat
  sensors. Remaining scan hits are intentional technical profile support,
  career-profile coverage, and real company-location sample data.
- Added `npm run doctor` and script tests for local environment readiness.
- Recorded Walking Labs `harness-creator` skill compatibility findings without
  adding duplicate root state files.
- Recorded the deep harness audit and promoted top findings into the debt
  tracker.
- Added normal-CI harness coverage, widened Docs Harness script coverage, and
  added release/manual-build preflight gates with release metadata validation.
- Added standalone external-AI provider scanning for code and config files and
  covered it with focused script tests.
- Extended `npm run doctor` with Linux Tauri package checks, `patchelf`,
  Playwright Chromium launch readiness, and Node/Rust CI-baseline drift
  warnings; added `npm run doctor:e2e` as the strict E2E readiness gate.

The active plan progress table has detailed slice history.

## Verified Recently

Latest harness/readiness slice checks on 2026-05-31:

- `npm run doctor`
- `npm run doctor:e2e`
- `node --test scripts/doctor.test.mjs`
- `npm run release:check-version -- v2.6.4`
- `npm run lint:external-ai`
- `npm run test:scripts`
- `npm run harness:check`
- `npm run lint:md`
- `npm run lint:docs`
- `npm run lint:bloat`
- `npm run build`
- `npx --yes github-actionlint@1.7.12` against the updated workflow files.
- `ruby -e 'require "yaml"; ARGV.each { |path| YAML.load_file(path) }'`
  against the updated workflow files.
- `git diff --check`

The latest cleanup slices were verified with:

- `npm run lint`
- `npx tsc --noEmit`
- `npm run test:run`
- `npm run lint:bloat`
- `npm run lint:tauri-invokes`
- `npm run lint:tests`
- `cd src-tauri && cargo fmt --all -- --check`
- `cd src-tauri && cargo clippy -- -D warnings`
- `cd src-tauri && cargo test --lib`
- `npm run test:e2e:smoke`
- `npm audit --audit-level=moderate`
- `cd src-tauri && cargo audit`
- `cd src-tauri && cargo deny check advisories`
- `npm run test:run -- src/components/AtsLiveScorePanel.test.tsx`
- `npm run test:run -- src/components/ErrorLogPanel.test.tsx`
- `npm run test:run -- src/components/BookmarkletGenerator.test.tsx`
- `npm run test:run -- src/components/DeepLinkGenerator.test.tsx`
- `npm run test:run -- src/pages/SetupWizard.test.tsx`
- `npm run test:scripts -- scripts/check-repo-bloat.test.mjs`
- `npm run lint:bloat`
- `npm run lint:docs`
- `npm run lint -- --max-warnings=0`
- `npm run build`
- `git diff --check`
- Focused WebKit E2E for job filtering and keyboard navigation.
- Focused Chromium E2E for job filtering and keyboard navigation.
- `npm run test:scripts`
- `npm run lint:bloat`
- `npm run lint:tests`
- `npm run lint:docs`
- `npx tsc --noEmit`
- `git diff --check`
- `npm run test:run -- src/components/BookmarkletGenerator.test.tsx src/components/JobImportModal.test.tsx`
- `npm run test:run -- src/pages/Resume.test.tsx`
- `npm run lint:tauri-invokes`
- `npm run lint:security`
- `npm run lint:architecture`

For later handoff or active-plan refreshes, rerun docs and bloat checks before
committing.

## Known Remaining Work

Keep the objective broad. Do not collapse it to already-landed slices.

Next high-value passes:

1. Keep root and nested junk scans current after each later slice.
   - Latest scan removed local `.DS_Store` artifacts and found no remaining
     tracked or untracked disposable artifacts.
   - Repeat before final completion or after any build/test command that may
     create local artifacts.
2. Run a final stale-docs and reference sweep.
   - Compare README, `docs/README.md`, harness docs, developer docs, security
     docs, feature docs, and source comments against live commands and APIs.
   - Update docs or add bloat sensors for every recurring drift class.
3. Continue backend and scraper edge review.
   - Recheck command error wrappers for path, URL, query, secret, cookie, and
     provider-body leaks.
   - Recheck scraper request caps, retry handling, rate limits, and health
     result shapes.
   - Keep no-bypass and local-first product rules intact.
4. Continue frontend boundary review.
   - Recheck stored JSON parsing, URL validation, error rendering, direct
     browser-open paths, logging, and malformed input handling.
   - Prefer focused Vitest and E2E coverage for each concrete defect.
5. Continue zero-technical-skill UX review.
   - Recheck setup, settings, feedback, recovery, empty states, and error
     screens for plain-language actions and no terminal/developer assumptions.
   - Keep sanitized debug-report generation one click from Settings, Error
     Logs, and crash/error recovery surfaces.
6. Continue broad-audience UX review.
   - Recheck onboarding, examples, placeholders, filters, profile presets, docs,
     and empty states for engineer-only assumptions.
   - Make sure technical and non-technical job searches both feel first-class.
7. Keep harness evidence current.
   - Use the updated change-contract and plan templates for broad follow-up
     work.
   - Promote any repeated ease, privacy, or flaky-test failure into a guide or
     sensor instead of leaving it in chat.
   - Prioritize the remaining top harness debt: harness manifest extraction,
     sensor modularity, and active-plan compaction.
8. Continue protective job-search UX review.
   - Make ghost/stale detection central on job cards and saved jobs.
   - Make salary floor, pay transparency, salary-history guardrails, and
     under-leveling checks part of pay support.
   - Add pacing, weekly summaries, fresh-role filters, reactivation strategy,
     and gap-framing support for long-term unemployment.
   - Prefer verified company routes, referrals, recruiter contact, and
     hiring-manager signals over opaque cold-apply paths where evidence exists.
   - Keep product copy factual and protective, not generic encouragement.
9. Decide final E2E scope.
   - Use focused E2E while fixing narrow browser-flow issues.
   - Run `npm run test:e2e:all` before claiming broad cross-browser completion,
     or document why it is deferred with exact risk.
10. Run final broad verification before goal completion.
    - Docs, bloat, test-quality, security, architecture, frontend tests, build,
      Rust formatting, Rust clippy, Rust tests, and chosen E2E scope all need
      current evidence.

## Completion Bar

Completion is not a vibes call. Before marking the goal complete, produce
current evidence for each requirement:

- Repo bloat and junk inventoried, removed, moved, merged, or explicitly kept.
- Docs accurately describe current behavior, commands, security posture,
  release state, and architecture.
- No known stale docs, duplicate sources of truth, tracked disposable artifacts,
  or generated outputs remain.
- No known privacy leaks through logs, renderer responses, command errors,
  scraper errors, notifications, credential paths, stored reports, or local path
  exposure remain.
- No known frontend/runtime issue found during the sweep remains unfixed.
- No known backend/Rust issue found during the sweep remains unfixed.
- No known user-facing path assumes technical knowledge for setup, recovery,
  troubleshooting, or GitHub issue reporting.
- No known user-facing path assumes the job seeker is an engineer or searching
  only for technical work.
- Relevant mechanical sensors cover recurring drift classes.
- Final verification commands pass from the current checkout.

If any evidence is stale, narrow, indirect, or missing, keep the goal open.

## Suggested Next Command Set

Start with cheap current-state checks:

```bash
npm run lint:bloat
npm run lint:docs
npm run lint:tests
npm run lint:security
npm run lint:architecture
npm run test:scripts
git status --short --branch
git diff --check
```

Then pick the next concrete sweep target from the known remaining work list.
