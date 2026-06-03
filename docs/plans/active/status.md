# Active Plan Status

Last updated: 2026-06-03.

Read this file before opening long active plans. It is the current restart
surface for the active goal; detailed history remains in the active plans,
handoff, tech-debt tracker, and archived progress files.

## Goal State

The repo-wide goal remains open. JobSentinel should keep moving toward zero
known errors, privacy leaks, stale docs, brittle tests, user-facing technical
assumptions, engineer-only defaults, and unverified claims.

All tracked files under `docs/plans/active/` are part of the active goal until
the work is completed, superseded, or moved out of active plans.

If sub-agents help get the work done faster, use them. The user has authorized
multiple sub-agents for isolated audits, research, code slices, doc slices, and
verification support that can run without shared-state conflicts. Keep scopes
bounded, preserve user changes, close completed agents promptly, and record
actionable findings in this active-plan surface or the relevant plan.

Immediate primary goal as of 2026-06-02: finish critical JobSentinel
functionality before lower-priority cleanup. Current functional focus is resume
assistance, application readability, and ghost/stale job-card protection. Resume
work means local parsing, readable previews, resume/job fit review,
required-versus-preferred qualification review, hard-constraint review, and
truthful next-action guidance. It does not mean hidden keyword edits, deceptive
resume changes, screening-system manipulation, or unreviewed form sending.
No-Apple-account macOS readiness is best-possible without an Apple Developer
Account: verified universal DMG, no-account labeling, matching checksum,
metadata/signature checks, mounted and installed launch smoke, isolated
local-data smoke, and plain first-open guidance. Zero-friction Gatekeeper
acceptance still requires Developer ID signing and notarization.

## Workstreams

| Workstream | State | Current focus | Source |
| ---------- | ----- | ------------- | ------ |
| Repo cleanup and quality sweep | Open | Lower-priority cleanup unless it blocks critical functionality, privacy/security, or verification | [Plan](repo-cleanup-and-quality-sweep.md) |
| Repo cleanup handoff | Open | Operational restart notes, cleanup backlog, and verification evidence | [Handoff](repo-cleanup-handoff.md) |
| Guided job-search intake | Active | Implemented setup slices stay accurate; future work expands guided questioning, resume-assisted intent capture, and search support | [Plan](guided-job-search-intake.md) |
| Research-backed product improvements | Active | Critical functionality first: resume assistance, application readability, ghost/stale job-card protection, then pay protection, pacing, bias-aware routes, protective tone, local-first privacy | [Plan](research-backed-product-improvements.md) |

## Current Posture

- `main` was pushed through `f9447e87 Record CDL license synonym commit`
  and now has local commits after that push.
  Use `git status --short --branch` for live evidence before committing,
  pushing, or reporting remote state.
- Latest pushed critical-functionality batch extends local Resume Match
  hard-constraint and synonym handling for schedule, location, physical-demand,
  work-eligibility, education, and credential terms. Keep the no-push batch
  rule: push only after 30 more local commits unless the user changes cadence.
- Current local resume evidence-strength follow-up separates plain-text
  saved-resume requirement evidence by section, so skills-list-only terms stay
  lighter evidence while experience, summary, project, education,
  certification, or license evidence can count as direct. Focused analyzer
  verification passed: `cargo test --lib requirement_review --manifest-path
  src-tauri/Cargo.toml` and `cargo test --lib ats_analyzer --manifest-path
  src-tauri/Cargo.toml`.
- Current local active-resume preload follow-up loads the active saved resume
  when **Resume Match** opens, so a user can paste a job post and choose
  **Review Match** without knowing to click **Choose or Add Resume** first.
  The silent preload does not show a toast, while the explicit choose action
  still refreshes the active resume or opens **Resumes** when none exists.
  Private resume and profile reference directories were reviewed only as
  generalized pattern evidence. No private resume text, names, chronology, file
  paths, or profile content was added to the repo. The references confirmed
  mixed real-world resume formats such as DOCX, PDF, RTF, TXT, MD, ODT, EPUB,
  and archive exports. Current local resume import now supports PDF, DOCX,
  TXT, and Markdown; future format-import work should use synthetic fixtures
  for remaining RTF, ODT, EPUB, and archive-export patterns. Focused
  verification passed for the previous active-resume preload slice: `npx
  vitest run src/pages/ResumeOptimizer.test.tsx`, `npm run test:run`, `npm run
  lint -- --quiet`, `npm run build`, `npm run lint:docs`, `npm run
  lint:bloat`, and `git diff --check`.
- Current local resume-format import follow-up adds local parsing for DOCX,
  TXT, and Markdown resumes alongside existing PDF parsing. Upload selection
  now allows PDF, DOCX, TXT, and Markdown, managed local copies preserve the
  selected extension, and DOCX parsing extracts `word/document.xml` text from
  the local file without exposing source paths to renderer IPC. Private
  reference resume/profile material was not committed. Verification passed:
  `cargo test --lib parse_resume --manifest-path src-tauri/Cargo.toml`,
  `cargo test --lib resume_upload_extension --manifest-path
  src-tauri/Cargo.toml`, `cargo test --lib safe_resume_upload_file_name
  --manifest-path src-tauri/Cargo.toml`, `cargo test --lib resume
  --manifest-path src-tauri/Cargo.toml`, `cargo test --lib --manifest-path
  src-tauri/Cargo.toml`, `cargo fmt --all --manifest-path
  src-tauri/Cargo.toml -- --check`, `cargo clippy --manifest-path
  src-tauri/Cargo.toml -- -D warnings`, `npx vitest run
  src/pages/Resume.test.tsx src/utils/errorMessages.test.ts
  src/mocks/handlers.test.ts`, `npm run lint -- --quiet`, `npm run test:run`,
  `npm run build`, `npm run lint:docs`, `npm run lint:bloat`, and `git diff
  --check`.
- Current local 2026 resume-guidance follow-up locks
  `/Users/c/Downloads/updated_resume_formatting_ats_guidance_2026(2).md` into
  `docs/research/resume-formatting-ats-2026.md`, the ATS transparency note,
  the Resume Match feature guide, and the active research-backed plan. It adds
  local readable-text checks for top contact details, standard headings, and
  table-like extracted text. It also records future work for requirement
  inventory, knockout-question consistency, file-type/file-size checks,
  selectable-text review, ethical confidence prompts, score humility, and
  profession-specific evidence prompts. Real resume/profile reference material
  remains private and must not be committed.
- Current local resume-alignment scoring follow-up is committed in
  `3d720693 Add resume requirement review caps`. It locks
  `/Users/c/Downloads/ats_scoring_algorithm.md` into
  `docs/research/resume-alignment-scoring.md`, the ATS transparency note, the
  Resume Match feature guide, and the active research-backed plan. It adds
  local keyword-stuffing detection, requirement-review rows with
  direct/strong/partial/implied/missing states, evidence sections, and
  recognized hard-constraint caps for missing required authorization, location,
  license, certification, degree, or clearance terms. The Resume Match page now
  starts local requirement and hard-constraint review for missing required
  authorization, location, license, certification, degree, or clearance terms.
  The follow-up `3aa39952 Add resume next-action guidance` turns those results
  into plain next actions such as checking a hard requirement before tailoring,
  adding supporting evidence only if true, or keeping useful evidence visible.
  The follow-up `171bbe91 Improve resume evidence section review` starts
  section-placement review for saved-resume plain text, and `d2d1944f Add
  conservative resume synonym evidence` starts conservative acronym/equivalence
  matching for `CRM` and `customer relationship management`. The follow-up
  `a96abd63 Match customer support service terms` treats customer service,
  customer support, client service, client services, and client support as the
  same local evidence. The follow-up
  `1f82ecf4 Match data entry hyphen terms` treats data entry and data-entry as
  the same local evidence. The follow-up
  `bffa0a1f Match onsite location terms` treats onsite and on-site as the same
  local hard-constraint evidence. The follow-up
  `c8dffb14 Match spaced on site terms` adds the spaced `on site` form to that
  local hard-constraint evidence group. The follow-up
  `d4945db5 Match relocation terms` treats relocation, relocate, and willing to
  relocate as the same local hard-constraint evidence. The follow-up
  `d454fd30 Match transportation requirement terms` treats reliable
  transportation and own transportation as the same local hard-constraint
  evidence. The follow-up
  `57c8f01b Match commuting terms` treats commute and commuting as the same
  local hard-constraint evidence. The follow-up
  `4b2009d6 Match overnight shift terms` treats night shift and overnight shift
  as the same local hard-constraint evidence. The follow-up
  `131fd9b9 Match third shift terms` adds third shift and 3rd shift to that
  local hard-constraint evidence group. The follow-up
  `fec9fa3d Match weekend shift terms` treats weekend availability, weekend
  shift, and weekend shifts as the same local hard-constraint evidence. The
  follow-up
  `05b82897 Match second shift terms` treats evening shift, second shift, and
  2nd shift as the same local hard-constraint evidence. The follow-up
  `55f987a1 Match first shift terms` treats day shift, first shift, and
  1st shift as the same local hard-constraint evidence. The follow-up
  `82321e8c Match availability terms` treats availability and available as the
  same local hard-constraint evidence. The follow-up
  `5be01ab3 Match lift weight unit terms` treats lift requirements with the
  same number and `lb`, `lbs`, `pound`, or `pounds` wording as the same local
  hard-constraint evidence. The follow-up
  `ce37de4c Match standing physical terms` treats stand for long periods and
  standing for long periods as the same local hard-constraint evidence. The
  follow-up
  `06ae464c Match driver license terms` treats driver's license, drivers
  license, and driver license as the same local hard-constraint evidence. The
  follow-up
  `9ebc7be9 Match US citizenship terms` treats US citizenship, U.S.
  citizenship, US citizen, and U.S. citizen as the same local hard-constraint
  evidence without treating generic work authorization as citizenship. The
  follow-up
  `b005cdec Match work authorization terms` treats work authorization and
  authorized to work as the same local hard-constraint evidence. The follow-up
  `e94f21ac Match clearance terms` treats security clearance and clearance as
  the same local hard-constraint evidence. The follow-up
  `4f0cad81 Match RN license terms` treats RN, RN license, Registered Nurse,
  and Registered Nurse license as the same local hard-constraint evidence. The
  follow-up `683144c0 Match registered nurse license terms` preserves full
  Registered Nurse license job-post wording as specific RN-license evidence.
  The follow-up
  `66c587a8 Mark current plain text resume evidence` marks readable Experience
  bullets after a present-date role marker as current-experience evidence, then
  resets that label when a later past-role date range appears. The follow-up
  `4607b67f Strengthen metric-backed resume evidence` treats work or project
  evidence with visible metrics as stronger local evidence than a bare keyword.
  The follow-up `c109b9d3 Strengthen scope-backed resume evidence` treats work
  or project evidence with scope across teams, departments, locations, sites,
  regions, markets, or service lines as stronger local evidence than a bare
  keyword. The follow-up `f1310ad0 Strengthen responsibility-backed resume
  evidence` treats work or project evidence with ownership or management verbs
  tied to workflows, processes, programs, operations, intake, cases, systems, or
  tools as stronger local evidence than a bare keyword.
  The follow-up `a09f6c43 Recognize GED credential equivalence` treats high
  school diploma, high school degree, GED, high school equivalency, and General
  Education Development as the same local education evidence. The follow-up
  `a546653d Match high-school education terms` treats high-school diploma,
  high-school degree, and high-school equivalency as the same local education
  hard-constraint evidence. The follow-up
  `7554988c Match associate degree terms` treats associate's degree, associate
  degree, and associates degree as the same local education hard-constraint
  evidence and keeps associate degree or equivalent experience wording from
  creating an exact-degree hard cap. The follow-up
  `adda2593 Match bachelor degree terms` treats bachelor's degree, bachelor
  degree, and bachelors degree as the same local education hard-constraint
  evidence. The follow-up `52e7c80b Match bachelor degree title terms` treats
  Bachelor of Arts and Bachelor of Science as local evidence for generic
  bachelor's degree requirements without using those phrases to create generic
  job-post requirements in browser/dev mocks. The follow-up
  `0e2a0fae Match master degree terms` treats master's degree, master degree,
  and masters degree as the same local education hard-constraint evidence. The
  follow-up `60dc3981 Match doctorate degree terms` treats PhD, doctorate,
  doctorate degree, and doctoral degree as the same local education
  hard-constraint evidence and keeps doctorate degree or equivalent experience
  wording from creating an exact-degree hard cap. The follow-up
  `5883db13`
  recognizes CNA credential equivalence, treating CNA and Certified Nursing
  Assistant variants as the same local credential evidence while removing the
  duplicate generic `certification` risk when the specific credential matched.
  The follow-up `95488cf4 Match Security Plus terms` treats Security+ and
  Security Plus as the same local credential hard-constraint evidence and gives
  the long mock ATS command-name test a per-test timeout.
  The follow-up `cb7e461d Match CISSP full-name terms` treats CISSP and
  Certified Information Systems Security Professional as the same local
  credential hard-constraint evidence.
  The follow-up `d9d55406 Match CDL license terms` treats CDL, commercial
  driver's license, commercial drivers license, and commercial driver license
  as the same local credential hard-constraint evidence.
  The follow-up `692162dd Match commercial license CDL terms` preserves
  commercial driver-license job-post wording as the specific CDL requirement
  and avoids a duplicate generic driver-license gap when CDL evidence satisfies
  it.
  The follow-up `b437ffa5` recognizes LPN credential equivalence, treating LPN,
  Licensed Practical Nurse, LVN, and Licensed Vocational Nurse as the same
  local credential evidence while preserving verify-license guidance.
  The follow-up `c69a2bea` recognizes PMP credential equivalence, treating PMP,
  Project Management Professional, PMP certification, and Project Management
  Professional certification as the same local credential evidence.
  The follow-up `9f47bee9` recognizes food-safety credential equivalence,
  treating food safety, food safety certification, ServSafe, and food-handler
  certificate, permit, or card wording as the same local credential evidence.
  The follow-up `7b50460b Match food-handler credential terms` treats
  food-handler certification, certificate, permit, and card wording as the same
  local credential hard-constraint evidence.
  The follow-up `07ec097e Match food handler possessive terms` treats food
  handler's and food handlers certification, certificate, permit, and card
  wording as equivalent local credential hard-constraint evidence.
  The follow-up `c47dec16` recognizes first-aid credential equivalence,
  treating first-aid certificate, certification, and certified wording as the
  same local credential evidence.
  The follow-up `a57f5d47` recognizes forklift credential equivalence, treating
  forklift, forklift certification, forklift certified, forklift operator
  certification, and forklift license wording as the same local credential
  evidence.
  The follow-up `e8534882` recognizes OSHA 10 credential equivalence, treating
  OSHA 10, OSHA10, OSHA 10 certification, and OSHA 10-hour wording as the same
  local credential evidence without treating OSHA 30 as equivalent.
  The follow-up `972700a9` recognizes OSHA 30 credential equivalence, treating
  OSHA 30, OSHA30, OSHA 30 certification, and OSHA 30-hour wording as the same
  local credential evidence without treating OSHA 10 as equivalent.
  Future resume work still needs deeper duty-only evidence strength, seniority
  alignment, broader conservative synonyms, broader recency weighting, and
  profession-specific weighting.
- Current local macOS no-account post-commit verification rebuilt the universal
  DMG from committed resume-guidance head `12c184db` on macOS 26.5
  (build 25F71), Apple Silicon `arm64`, with SIP enabled. The build produced
  `src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_2.6.4_universal.dmg`
  plus `.sha256` sidecar. `npm run tauri:verify:macos -- --dmg
  src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_2.6.4_universal.dmg
  --expected-bundle-id com.jobsentinel.main --expected-product-name JobSentinel
  --expected-version 2.6.4 --expected-icon-file icon.icns
  --expected-minimum-system-version 13.0 --expected-architectures x86_64,arm64
  --launch-smoke --install-smoke --require-checksum` passed. It verified
  checksum `ade524d737ec75ae89aa5f2884409c0ee694002b106be982355486e49053e9c2`,
  DMG integrity, bundle metadata, universal architectures, code signature,
  mounted-app launch smoke, installed-app launch smoke, and isolated local
  `jobs.db` creation. Gatekeeper rejected the ad-hoc DMG and app as expected;
  Developer ID signing and notarization are still required for zero-friction
  public macOS distribution.
- Current local resume-assistance follow-up makes **Review Match** usable with
  the active saved resume instead of requiring copied structured resume
  details, keeps saved resume text inside the Tauri backend, adds a local
  `analyze_active_resume_for_job` command, and keeps side-by-side comparison
  hidden unless the user explicitly uses copied resume details. The same slice
  prevents unrecognized job posts or missing extracted job skills from
  producing a perfect fit score and fixes manual skill additions to use the
  migration-valid `user_input` source. Focused verification passed:
  `cargo test --lib ats_analyzer --manifest-path src-tauri/Cargo.toml`,
  `cargo test --lib test_calculate_match_no_job_skills --manifest-path
  src-tauri/Cargo.toml`, `cargo test --lib
  test_update_user_skill_clears_optional_fields_and_trims_name
  --manifest-path src-tauri/Cargo.toml`, and `npx vitest run
  src/pages/ResumeOptimizer.test.tsx src/mocks/handlers.test.ts`. Broader
  verification passed: `cargo check --manifest-path src-tauri/Cargo.toml`,
  `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`,
  `cargo test --lib resume --manifest-path src-tauri/Cargo.toml`, `cargo test
  --lib --manifest-path src-tauri/Cargo.toml`, `cargo fmt --all
  --manifest-path src-tauri/Cargo.toml -- --check`, `npm run test:run`, `npm
  run build`, `npm run lint -- --quiet`, `npm run lint:docs`, `npm run
  lint:tauri-invokes`, `npm run lint:security`, `npm run lint:architecture`,
  `npx tsc --noEmit`, `git diff --check`, and `npx playwright test
  tests/e2e/playwright/resume-upload-matching.spec.ts --project=chromium`.
- Current local no-account macOS checksum follow-up makes
  `npm run tauri:verify:macos` validate a local `.dmg.sha256` sidecar when it
  exists and fail with `--require-checksum` when it is missing or mismatched.
  The release workflow now requires that builder-created checksum before the
  macOS upload path proceeds, and the security sensor rejects release workflow
  drift that drops `--require-checksum`, while the post-publish verifier still
  checks the downloaded public checksum asset. Gatekeeper rejection remains
  expected without an Apple Developer Account. Verification passed on macOS
  26.5:
  focused macOS script tests, full `npm run test:scripts`, `npm run lint:docs`,
  `npm run lint:security`, `npx actionlint .github/workflows/release.yml
  .github/workflows/verify-release-artifacts.yml`, `git diff --check`, `npm
  run lint:bloat`, local `npm run tauri:verify:macos` with
  `--require-checksum`, and public `npm run tauri:verify:macos:latest -- --tag
  v2.6.4`.
- Current local macOS build-cleanup follow-up removes stale matching
  `_no-account_` DMG and checksum artifacts before creating a fresh local DMG,
  so wildcard verification does not accidentally see both an old public-style
  no-account artifact and a newly built universal artifact in the same target
  directory. Focused verification passed: `node --test
  scripts/build-macos-dmg.test.mjs`.
- Current local no-account macOS readiness follow-up hardens the package script
  so universal builds prefer the rustup-managed toolchain even when Homebrew
  Rust is first in `PATH`, writes a local `.dmg.sha256` checksum next to the
  generated DMG, and makes the public Mac verifier require the matching
  checksum by default. The public `v2.6.4` Mac asset was replaced with
  `JobSentinel_2.6.4_no-account_universal.dmg` plus matching checksum, and
  `npm run tauri:verify:macos:latest -- --tag v2.6.4` passed on the downloaded
  GitHub asset. Gatekeeper rejection remains expected for the no-account
  package.
- Current local no-Apple-account release follow-up makes macOS tag releases
  possible without an Apple Developer Account while keeping the limitation
  explicit. If all Apple release secrets are missing, release CI builds an
  ad-hoc macOS DMG, verifies metadata, signatures, mounted launch smoke,
  installed-app launch smoke, universal architectures, and local data creation,
  labels the public asset filename with `_no-account_`, creates a matching
  checksum after the rename, then uploads it without claiming Gatekeeper
  readiness. If only some Apple secrets are configured, CI fails before
  building. If all required Apple
  secrets are present, CI signs, notarizes, staples, validates, and requires
  Gatekeeper acceptance. The public macOS artifact verifier now defaults to the
  no-account checks and supports `--require-gatekeeper` for signed/notarized
  releases.
- Current local no-account asset-label follow-up makes release CI rename
  ad-hoc public macOS DMGs to include `_no-account_` before checksum creation
  and upload, makes the public release verifier reject unlabeled no-account
  DMGs or `_no-account_` labels on Gatekeeper-required releases, and adds
  security sensor coverage so that label gate cannot be silently dropped.
  Verification passed on macOS 26.5 (Darwin 25.5.0, build 25F71), Apple
  Silicon `arm64`, with SIP enabled: `npx actionlint
  .github/workflows/release.yml`, `npm run lint:security`, `node --test
  scripts/check-security-sensors.test.mjs`, `npm run lint:docs`, `npm run
  test:scripts`, `npm run lint:bloat`, `git diff --check`, and `npm run
  tauri:verify:macos:latest -- --tag v2.6.4`. The public verifier downloaded
  `JobSentinel_2.6.4_no-account_universal.dmg`, checked its matching checksum,
  verified app metadata, `x86_64` plus `arm64` architectures, code signature,
  mounted launch smoke, installed-app launch smoke, and isolated `jobs.db`
  creation. Optional Gatekeeper rejection remains expected for no-account
  packages.
- Current local reviewed-resume-skill sorting follow-up adds explicit Resume
  page controls to use or stop using reviewed local skills as one job-sorting
  signal. The new config commands update disk and runtime config together,
  browser/dev mocks persist the same preference, docs and privacy labels mark
  the behavior as local-only and sensitive, and no external AI or application
  automation is involved.
- Current local runtime-settings follow-up fixes current-session configuration
  staleness. `save_config` now updates the shared runtime configuration after
  the disk save succeeds; manual searches, scheduled source checks,
  dashboard preferences, posting-risk settings, source-status smoke tests, and
  safe support report summaries read the current saved settings without an app
  restart. Scheduler cycles snapshot config once per run so scraper, scoring,
  posting-risk, and notification stages agree without holding a lock during
  network or database work. Resume-enabled scoring cache keys now include the
  active resume id, preventing base keyword scores from being reused after
  resume matching is turned on. Health commands now use managed `AppState`
  instead of unmanaged database/config state, fixing real-app source-status
  smoke-test invocations. Focused verification passed: `cargo test --lib
  save_config_updates_runtime_config_after_disk_save --manifest-path
  src-tauri/Cargo.toml`, `cargo test --lib
  test_scheduler_shared_config_updates_without_restart --manifest-path
  src-tauri/Cargo.toml`, `cargo test --lib
  resume_enabled_cache_key_includes_resume_id --manifest-path
  src-tauri/Cargo.toml`, `cargo test --lib config --manifest-path
  src-tauri/Cargo.toml`, `cargo test --lib health --manifest-path
  src-tauri/Cargo.toml`, and `cargo test --lib scheduler --manifest-path
  src-tauri/Cargo.toml`. Broader verification passed: `cargo test --lib
  --manifest-path src-tauri/Cargo.toml` passed 2511 tests with 21 ignored,
  `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`, `npm run
  test:run` passed 2637 tests, `npm run test:scripts` passed 507 tests, `npm
  run lint -- --quiet`, `npm run lint:docs`, `npm run lint:tauri-invokes`,
  `npm run lint:bloat`, `npm run lint:security`, `npm run build`, `npm run
  test:e2e:smoke:budget` passed 10 expected tests in 8.23 seconds, `cargo fmt
  --all --manifest-path src-tauri/Cargo.toml -- --check`, and `git diff
  --check`.
- Current local resume preview follow-up adds explicit local readable-text
  preview and copy support on the Resume Match page. The backend returns a
  bounded `get_resume_text_preview` payload only after the user asks for it,
  normal resume summaries still omit saved file paths and parsed text, dev
  mocks implement the same minimized preview shape, and docs plus privacy-label
  manifest now describe the local-only behavior. Red tests first failed for
  missing backend DTO, missing UI action, missing mock command, and missing copy
  button. Verification then passed: `cargo test --lib resume_text_preview
  --manifest-path src-tauri/Cargo.toml` passed 2 focused tests, `cargo test
  --lib resume --manifest-path src-tauri/Cargo.toml` passed 182 resume tests,
  `npx vitest run src/pages/Resume.test.tsx src/mocks/handlers.test.ts`
  passed 25 tests, `npm run test:run` passed 2637 tests, `npm run
  test:scripts` passed 507 tests, targeted Playwright resume smoke
  `node scripts/run-playwright.mjs test
  tests/e2e/playwright/resume-upload-matching.spec.ts --project=chromium
  --grep @smoke` passed 1 test after updating stale Resume page-object labels
  and adding preview-modal coverage, `npm run test:e2e:smoke:budget` passed
  10 tests in 7.96 seconds, `npm run lint -- --quiet`, `npm run build`,
  `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`, `npm
  run lint:tauri-invokes`, `npm run lint:docs`, `npm run lint:bloat`, `npm
  run lint:security`, `cargo fmt --all --manifest-path
  src-tauri/Cargo.toml -- --check`, and `git diff --check` passed.
- Current local no-Apple-account macOS proof passed on current `main`:
  `npm run doctor` reported the environment ready with one known Node 26 local
  warning, `cargo test --lib platforms::macos` passed 22 tests with 1 ignored,
  `npm run tauri:build:macos -- --target universal-apple-darwin` produced a
  fresh `JobSentinel_2.6.4_universal.dmg`, and `npm run
  tauri:verify:macos` with expected bundle id, product name, version, icon,
  macOS 13.0 minimum metadata, `x86_64,arm64`, `--launch-smoke`, and
  `--install-smoke` passed. The mounted and copied apps stayed running for 12
  seconds with empty stderr and created isolated local `jobs.db` files.
  Gatekeeper rejected the ad-hoc package as expected because the project does
  not have an Apple Developer Account, Developer ID signing, or notarization.
- Current local resume safety-label follow-up aligns the Resume Match Helper
  and Resume Builder live review with backend suggestion categories so
  prompt-injection-like or hidden-text guidance displays as **Safety check**
  instead of a blank or internal `FormatFix` label. Verification passed:
  focused `AtsLiveScorePanel` and `ResumeOptimizer` tests passed 62 tests,
  `npm run lint -- --quiet`, `npm run test:run` passed 2634 tests,
  `npm run build`, and `npm run lint:docs` passed.
- Current local resume category-drift harness follow-up adds a frontend
  contract sensor so backend resume suggestion categories, browser/dev mocks,
  Resume Match Helper labels, and Resume Builder live review labels cannot
  silently drift again. It rejects stale `RemoveItem`, missing backend
  categories, missing mock categories, and missing plain labels for
  `FormatFix` and `ReorderContent`. Verification passed: focused frontend
  contract and bloat fixture tests passed 230 repo-bloat tests plus the
  frontend-contract fixture tests, `npm run lint:bloat`, and `npm run
  test:scripts` passed 505 tests.
- Current local resume anti-gaming guardrail adds a local readability warning
  for prompt-injection-like instructions and invisible Unicode in resume
  content. Browser/dev mocks now return the same warning and docs note this as
  resume safety review, not a user-blocking decision. Verification passed:
  `cargo test --lib ats_analyzer` passed 27 tests, `cargo test --lib resume`
  passed 180 tests, `cargo clippy -- -D warnings` passed, focused frontend
  resume/mock tests passed 73 tests, `npm run test:run` passed 2631 tests,
  `npm run lint -- --quiet`, `npm run build`, `npm run test:scripts` passed
  503 tests, `npm run lint:docs`, `npm run lint:security`, `npm run
  lint:bloat`, and `git diff --check` passed.
- Current local safe-support-report mock parity fix makes browser/dev
  `generate_feedback_report` and `sanitize_feedback_text` redact sensitive
  job-search details like salary floors, resume excerpts, private notes,
  screening answers, location preferences, names, phone numbers, raw URLs, and
  job-search narratives the same way the backend support-report sanitizer does.
  Verification passed: `npx vitest run src/mocks/handlers.test.ts` passed 13
  tests, `npm run lint -- --quiet` passed, `npx vitest run
  src/mocks/handlers.test.ts src/services/feedbackService.test.ts
  src/utils/errorReporting.test.ts` passed 39 tests, and `cargo test --lib
  feedback` passed 52 tests. Broader checks passed: `npm run test:run`
  passed 2630 tests, `npm run build`, `npm run lint:docs`, `npm run
  lint:bloat`, `npm run lint:security`, `git diff --check`, and `npm run
  test:e2e:smoke:budget` passed 10 expected tests in about 7.8 seconds.
- Current local macOS packaging work adds `npm run tauri:build:macos`, a
  maintained DMG builder that runs Tauri app bundling, verifies or ad-hoc signs
  `JobSentinel.app`, creates a drag-to-Applications DMG with `hdiutil`, and
  avoids Finder AppleScript. Verification passed on macOS 26.5 Apple Silicon:
  `node --test scripts/build-macos-dmg.test.mjs` passed 5 tests,
  `npm run tauri:build:macos` produced
  `src-tauri/target/release/bundle/macos/JobSentinel.app` and
  `src-tauri/target/release/bundle/dmg/JobSentinel_2.6.4_aarch64.dmg`,
  `hdiutil verify` reported a valid checksum, mounted-DMG inspection found
  `JobSentinel.app` and the `Applications` symlink, `codesign --verify --deep
  --strict --verbose=2` passed for the app inside the mounted DMG, and the
  packaged app stayed running for 12 seconds under an isolated temporary
  `HOME` with stderr empty before clean termination. Follow-up verification
  also passed: `npm run test:scripts` passed 477 tests, `npm run
  harness:check`, `npm run lint:docs`, `git diff --check`, and `npm run
  doctor` passed with one expected local-runtime warning because this Mac is
  running Node 26 while CI uses Node 20. Post-commit macOS platform testing
  found an env-var race in macOS tests that mutate `HOME` and
  `XDG_CONFIG_HOME`; the test module now serializes env-dependent tests with a
  shared mutex. Verification passed: `cargo test --lib platforms::macos`
  passed 22 tests with 1 ignored, and `cargo test --lib` passed 2492 tests
  with 21 ignored. Follow-up universal packaging verification also passed after
  installing rustup targets for `aarch64-apple-darwin` and
  `x86_64-apple-darwin`: `PATH="/opt/homebrew/opt/rustup/bin:$PATH" npm run
  tauri:build:macos -- --target universal-apple-darwin` produced
  `src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_2.6.4_universal.dmg`,
  `hdiutil verify` reported a valid checksum, `lipo -info` confirmed the
  mounted app binary contains `x86_64 arm64`, `codesign --verify --deep
  --strict --verbose=2` passed for the mounted app, mounted-DMG inspection found
  `JobSentinel.app` and the `Applications` symlink, and the mounted universal
  app stayed running for 12 seconds under an isolated temporary `HOME` with
  stderr empty before clean termination. Remaining distribution blocker:
  `spctl --assess` rejected the local ad-hoc signed `.app` and `.dmg`, so a
  zero-friction public macOS release still needs Developer ID signing and
  notarization credentials. Current local macOS package harness work adds
  `npm run tauri:verify:macos` to make these checks repeatable: it verifies the
  DMG checksum, reports Gatekeeper status, mounts the DMG read-only, checks the
  drag-to-Applications layout, verifies expected binary architectures, verifies
  the app signature, optionally runs a launch smoke, and can fail Developer ID
  release builds with `--require-gatekeeper`. The release workflow now runs the
  verifier with mounted and installed launch smoke before macOS upload, and adds
  `--require-gatekeeper` only when Developer ID signing and notarization secrets
  are configured.
  Verification passed: `npm run
  tauri:verify:macos -- --dmg
  src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_2.6.4_universal.dmg
  --expected-architectures x86_64,arm64 --launch-smoke` passed, strict
  `--require-gatekeeper` verification failed as expected on the ad-hoc DMG,
  `npm run test:scripts` passed 488 tests, `npm run lint:docs`, `npm run
  harness:check`, `npm run lint:bloat`, `npm run lint:security`, `actionlint
  .github/workflows/release.yml`, and `git diff --check` passed. Current local
  signing follow-up makes the custom DMG builder release-aware: when Apple
  notarization credentials are available, it signs the DMG, submits it through
  `xcrun notarytool`, staples the ticket, validates the stapled ticket, and
  fails on partial credential sets. It uses `@env:APPLE_PASSWORD` so the
  app-specific password is not placed in `notarytool` process arguments. The
  release workflow now builds an ad-hoc no-account DMG when all Apple release
  secrets are missing, fails early if only some signing/notarization secrets are
  configured, imports the Developer ID certificate into a temporary keychain
  when all secrets are present, exports the required Tauri and JobSentinel
  signing env vars, notarizes the custom DMG, and requires launch-smoke plus
  Gatekeeper pass before upload only for that Developer ID path. Verification
  passed: `node --test scripts/build-macos-dmg.test.mjs
  scripts/verify-macos-package.test.mjs` passed 16 tests, `actionlint
  .github/workflows/release.yml` passed, `git diff --check` passed, the
  universal `tauri:build:macos` command produced the universal DMG, and `npm run
  tauri:verify:macos -- --dmg
  src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_2.6.4_universal.dmg
  --expected-architectures x86_64,arm64 --launch-smoke` passed with expected
  optional Gatekeeper rejection for the local ad-hoc build. Post-commit runtime
  readiness checks also passed: `npm run test:e2e:smoke:budget` finished in
  about 6.7 seconds with 9 expected tests and no unexpected, flaky, or skipped
  results; `cargo test --lib platforms::macos` passed 22 tests with 1 ignored;
  and `npm run doctor` reported the environment ready with only the expected
  Node 26 local-runtime warning against the Node 20 CI baseline.
- Current local macOS release-gate hardening makes the custom DMG builder use
  hardened runtime and timestamp flags for Developer ID fallback app signing,
  timestamps Developer ID disk image signatures, requires `--launch-smoke`
  before release upload, labels ad-hoc no-account public DMG assets before
  checksum/upload, and adds security sensor coverage so the macOS release
  workflow cannot silently drop Gatekeeper, launch-smoke, or no-account asset
  label gates. Verification
  passed: `node --test scripts/build-macos-dmg.test.mjs
  scripts/verify-macos-package.test.mjs scripts/check-security-sensors.test.mjs`
  passed 21 tests, `npm run tauri:verify:macos -- --dmg
  src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_2.6.4_universal.dmg
  --expected-architectures x86_64,arm64 --launch-smoke` passed with expected
  optional Gatekeeper rejection for the local ad-hoc build, `npm run
  test:scripts` passed 491 tests, `npm run lint:security`, `actionlint
  .github/workflows/release.yml`, `npm run lint:docs`, `npm run lint:bloat`,
  and `git diff --check` passed.
- Current local macOS readiness follow-up adds safe support report generation
  to the fast Playwright smoke surface so the easiest nontechnical debugging
  path stays covered before release checks. Verification passed: focused
  Chromium Playwright `settings-save-load.spec.ts --grep "saves a safe support
  report"` passed 1 test, `npm run test:e2e:smoke:budget` passed 10 expected
  tests in about 8.6 seconds, `npm run lint`, `npm run lint:docs`, and `git
  diff --check` passed.
- Current local macOS package rebuild evidence: `npm run tauri:build:macos --
  --target universal-apple-darwin` produced a fresh
  `src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_2.6.4_universal.dmg`.
  `npm run tauri:verify:macos -- --dmg
  src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_2.6.4_universal.dmg
  --expected-architectures x86_64,arm64 --launch-smoke` passed: DMG checksum
  valid, mounted app has `x86_64 arm64`, app signature verifies, and launch
  smoke stayed running for 12 seconds with empty stderr. Gatekeeper still
  rejects the local ad-hoc package, as expected until Developer ID signing and
  notarization are configured.
- Current local installed-app macOS smoke follow-up adds `--install-smoke` to
  `npm run tauri:verify:macos`, copies `JobSentinel.app` out of the mounted DMG
  into a temporary install root with `ditto`, verifies the copied bundle
  signature and architectures, runs Gatekeeper assessment, and launches the
  copied app under an isolated temporary home. The macOS release workflow now
  requires `--launch-smoke --install-smoke` before upload and adds
  `--require-gatekeeper` only for the Developer ID signed/notarized path, while
  security sensors require the installed-app smoke gate. Verification
  passed: focused verifier Node tests passed 10 tests, live local universal DMG
  verification with `--launch-smoke --install-smoke` passed for both mounted and
  copied installed app launches, and both launches created isolated macOS data
  directories with `jobs.db`. `actionlint .github/workflows/release.yml
  .github/workflows/verify-release-artifacts.yml` passed, `npm run
  lint:security`, `npm run lint:bloat`, `npm run test:scripts` passed 498
  tests, and `npm run lint:docs` passed.
- Current local macOS post-commit readiness checks passed: `npm run doctor`
  reported the environment ready with one known warning because this Mac runs
  Node 26 while CI uses Node 20, `cargo test --lib platforms::macos` passed 22
  tests with 1 ignored, and `npm run test:e2e:smoke:budget` passed 10 expected
  tests in about 7.8 seconds with no unexpected, flaky, or skipped results.
- Current local macOS bundle-metadata follow-up adds verifier checks for
  expected bundle id `com.jobsentinel.main`, product name `JobSentinel`,
  release version, `icon.icns` metadata, and the actual icon resource in
  `Contents/Resources`, plus `LSMinimumSystemVersion` 13.0; wires those checks
  into the release workflow and public release verifier; and regenerates
  `src-tauri/icons/icon.icns` from the approved `public/logo.png` source. A fresh
  `npm run tauri:build:macos -- --target universal-apple-darwin` rebuilt the
  universal app and DMG, and the rebuilt DMG passed
  `npm run tauri:verify:macos` with expected metadata, macOS 13.0 minimum
  metadata, `x86_64,arm64` architectures, mounted and installed launch smoke,
  isolated `jobs.db` creation, signature verification, and expected optional
  Gatekeeper rejection for the ad-hoc local package. Verification passed:
  focused Node tests passed 17 tests, `actionlint .github/workflows/release.yml
  .github/workflows/verify-release-artifacts.yml` passed, `npm run
  test:scripts` passed 501 tests, `npm run lint:security`, `npm run
  lint:bloat`, `npm run lint:docs`, and `git diff --check` passed.
- Current published macOS release gap: the public GitHub `v2.6.4` release is
  live and includes `JobSentinel_2.6.4_universal.dmg`, but verification of the
  downloaded public DMG failed because the mounted `JobSentinel.app` is not
  signed at all. The public macOS artifact therefore still needs replacement
  through the new no-account release gate or the later Developer ID signed and
  notarized release gate. User confirmed on 2026-06-02 that the project does
  not have an Apple Developer Account. `gh secret list --repo
  cboyd0319/JobSentinel` currently shows no `APPLE_CERTIFICATE`,
  `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`,
  `APPLE_PASSWORD`, or `APPLE_TEAM_ID` secrets. Public Gatekeeper readiness is
  blocked on getting an Apple Developer Account and adding those repository
  secrets; the current achievable macOS path is locally verified ad-hoc DMG
  quality with a documented first-open Privacy & Security approval.
- Current local public macOS release harness follow-up adds
  `npm run tauri:verify:macos:latest`, which downloads the latest public
  GitHub release DMG and applies no-account public checks to the user-facing
  artifact: universal architecture, launch smoke, installed-app smoke,
  signature, bundle metadata, and local data initialization. Add
  `--require-gatekeeper` only for a Developer ID signed and notarized artifact.
  The current public DMG is expected to fail even the no-account verifier until
  it is replaced because the mounted `JobSentinel.app` is not signed at all.
  Verification
  passed: `node --test scripts/verify-latest-macos-release.test.mjs
  scripts/verify-macos-package.test.mjs` passed 9 tests, `npm run
  lint:docs`, and `git diff --check` passed. The new public verifier command
  `npm run tauri:verify:macos:latest -- --no-launch-smoke
  --no-require-gatekeeper` failed against the current `v2.6.4` public DMG as
  expected because the mounted `JobSentinel.app` is not signed at all.
- Current no-Apple-account follow-up updates the README, Quick Start, macOS
  developer guide, CI/CD docs, release docs, status, and handoff docs so the
  macOS posture is accurate: local universal DMG quality is verified, but a
  zero-friction public macOS download is blocked until the project has an Apple
  Developer Account and notarization. The release-promise harness now rejects
  README text that overstates macOS public installer readiness. Verification
  passed: focused release-promise plus repo-bloat tests passed 225 tests, `npm
  run test:scripts` passed 503 tests, `npm run lint:docs`, `npm run
  lint:bloat`, `npm run lint:security`, and `git diff --check` passed.
- Current local no-Apple-account README follow-up makes the front-door release
  row and macOS download row explicitly say the project has no Apple Developer
  Account, separates local macOS build readiness from public Gatekeeper
  friction, and adds Apple Developer ID plus notarization sources to the README
  reference index and harness manifest.
- Current no-Apple-account drift guard follow-up after the user restated there
  is no Apple Developer Account clarifies that Gatekeeper pass belongs to the
  signed and notarized public artifact gate, not the local ad-hoc package path.
  The release-promise harness now rejects front-door README claims that the
  macOS package is notarized, Gatekeeper-ready, or zero-friction unless the
  same line names the limitation. Verification passed: `node --test
  scripts/check-release-promises.test.mjs scripts/check-repo-bloat.test.mjs`
  passed 228 tests, `npm run test:scripts` passed 507 tests, `npm run
  lint:docs`, `npm run lint:bloat`, and `git diff --check` passed.
- Current local macOS runtime proof on 2026-06-02 passed from the current
  checkout after the user confirmed there is no Apple Developer Account:
  `npm run doctor` passed with the known Node 26 local-runtime warning,
  `npm run test:e2e:smoke:budget` passed 10 expected tests in about 9.2
  seconds, and `cargo test --lib platforms::macos` passed 22 tests with 1
  ignored. A fresh universal package build with
  `PATH="/opt/homebrew/opt/rustup/bin:$PATH" npm run tauri:build:macos --
  --target universal-apple-darwin` produced
  `src-tauri/target/universal-apple-darwin/release/bundle/dmg/JobSentinel_2.6.4_universal.dmg`.
  The rebuilt DMG passed `npm run tauri:verify:macos` with expected bundle id,
  product name, version, icon, macOS 13.0 minimum metadata, `x86_64,arm64`
  architectures, mounted-app launch smoke, copied installed-app launch smoke,
  isolated local `jobs.db` creation, and app signature verification. Gatekeeper
  rejected the ad-hoc local DMG and app as expected; public zero-friction
  macOS distribution still requires Developer ID signing and notarization.
- Current local post-publish macOS release follow-up adds
  `.github/workflows/verify-release-artifacts.yml`, which runs after a GitHub
  Release is published and can also be triggered manually with an optional
  `tag` input. The workflow runs on `macos-latest` and verifies the public DMG
  with `npm run tauri:verify:macos:latest`, scoped to the published tag when
  available. Security sensors now require this workflow to keep the public
  macOS artifact verifier, release-publish trigger, manual trigger, and scoped
  tag handling in place. Verification passed: focused Node tests passed 13
  tests, `actionlint .github/workflows/verify-release-artifacts.yml` passed,
  `npm run lint:docs`, `npm run lint:security`, `npm run lint:bloat`, `npm run
  test:scripts` passed 496 tests, and `git diff --check` passed.
- Current local platform-doc drift fix syncs the getting-started database paths
  with live platform code: macOS data lives under `~/Library/Application
  Support/JobSentinel`, Linux data under `~/.local/share/jobsentinel`, and the
  stale `com.jobsentinel.app` path is now blocked by docs-drift coverage.
  Verification passed: `node --test scripts/check-docs-drift.test.mjs
  scripts/check-repo-bloat.test.mjs` passed 236 tests, `npm run test:scripts`
  passed 488 tests, `npm run lint:docs` passed, `npm run lint:bloat` passed,
  and `git diff --check` passed.
- Current local Resume Match parser fix keeps required and preferred job-post
  sections separate when a posting uses ordinary single-line headings, so
  preferred words are not promoted into required review buckets. Verification
  passed: red test failed before the fix, then `cargo test --lib
  test_extract_job_keywords_stops_required_at_preferred_heading` passed,
  `cargo test --lib ats_analyzer` passed 22 tests, `cargo fmt --all --
  --check` passed, `npm run lint:docs` passed, `npm run harness:check`
  passed, `cargo clippy -- -D warnings` passed, `cargo test --lib` passed
  2492 tests with 21 ignored, `npm run test:run` passed 2655 tests, `npm run
  lint` passed, `npm run build` passed, `node --test
  scripts/check-product-copy.test.mjs` passed 43 tests, `npm run lint:bloat`
  passed, and `git diff --check` passed.
- Current local resume missing-word grouping preserves job-post importance for
  missing Resume Match words and displays required, preferred, and other review
  buckets. This improves resume assistance without adding network calls or
  weakening truthful-edit guidance. Verification passed: red tests failed
  before the fix, then `npx vitest run src/pages/ResumeOptimizer.test.tsx`
  passed 15 tests, `npm run test:run` passed 2655 tests, `npm run build`
  passed, `cargo fmt --all -- --check` passed, `cargo clippy -- -D warnings`
  passed, `cargo test --lib ats_analyzer` passed 21 tests, `cargo test --lib`
  passed 2491 tests with 21 ignored, `npm run lint:docs`, `npm run
  harness:check`, `npm run lint:bloat`, `node --test
  scripts/check-product-copy.test.mjs` passed 43 tests, `npm run lint`, and
  `git diff --check`.
- Current local Resume Match mock-contract fix keeps development and browser
  mock results aligned with the real backend fraction-score contract. The mock
  `match_resume_to_job` command now returns `0.0` to `1.0` fit fractions
  instead of `0` to `100` values, preventing mock/dev Resume Match views from
  showing inflated percentages. Verification passed: `npx vitest run
  src/mocks/handlers.test.ts` passed 12 tests, `npx vitest run
  src/pages/Resume.test.tsx src/mocks/handlers.test.ts` passed 17 tests,
  `npm run lint`, `npm run lint:bloat`, `npm run test:run` passed 2658
  tests, `npm run build`, `npm run lint:docs`, `npm run test:scripts` passed
  503 tests, and `git diff --check`.
- Current local resume surface cleanup removes the obsolete
  `ResumeMatchScoreBreakdown` component and its standalone test because no
  runtime source imported it and it still carried stale result-percentage copy.
  Live Resume Match detail rendering now stays in `src/pages/Resume.tsx`,
  `src/pages/ResumeOptimizer.tsx`, and `src/components/AtsLiveScorePanel.tsx`.
  Verification passed: `npm run lint`, `npm run test:run` passed 2626 tests,
  `npm run build`, `node --test scripts/check-product-copy.test.mjs
  scripts/check-repo-bloat.test.mjs` passed 265 tests, `npm run lint:docs`,
  `npm run lint:bloat`, `npm run lint:architecture`, `npm run test:scripts`
  passed 503 tests, and `git diff --check`.
- Current local resume recent-match contract fix returns skills, experience,
  and education sub-scores from the backend `get_recent_matches` path and makes
  the Resume page treat recent-match sub-scores as optional, so older or partial
  payloads do not render invalid `NaN%` fit details. Verification passed:
  `npx vitest run src/pages/Resume.test.tsx` passed 6 tests, `npm run lint`,
  `cargo fmt --all -- --check`,
  `cargo test --lib recent_matches_include_all_sub_scores`,
  `cargo test --lib get_match_result_with_all_scores`,
  `cargo test --lib resume` passed 171 tests, `cargo clippy -- -D warnings`,
  `npm run test:run` passed 2627 tests, `npm run build`, and `npm run
  test:scripts` passed 503 tests. Follow-up repo checks passed: `npm run
  lint:docs`, `npm run lint:bloat`, `npm run harness:check`, and
  `git diff --check`.
- Current local resume skill-edit contract fix trims skill names, rejects blank
  names and invalid years in both UI and backend paths, and adds explicit
  set/clear/unchanged handling for optional skill category, strength, and years
  fields so users can remove stale skill details without hidden renderer
  assumptions. Mock skill handling now mirrors the same trim and clear behavior.
  Verification passed: focused Rust skill-edit and serde contract tests,
  `npx vitest run src/pages/Resume.test.tsx src/mocks/handlers.test.ts`
  passed 20 tests, `npm run lint`, `npm run build`, `npm run test:run` passed
  2629 tests, `cargo test --lib resume` passed 174 tests,
  `cargo clippy -- -D warnings`, `cargo fmt --all -- --check`,
  `npm run test:scripts` passed
  503 tests, `npm run lint:bloat`, `npm run harness:check`, and `git diff
  --check`.
- Current local stale resume-action contract fix makes missing resume
  activation fail without clearing the current active resume, and makes missing
  skill edits fail instead of reporting success. Browser/dev mocks now mirror
  those stale-id failures so tests cannot depend on silent no-op behavior.
  Verification passed: focused Rust stale activation and stale skill-update
  tests, `npx vitest run src/pages/Resume.test.tsx src/mocks/handlers.test.ts`
  passed 20 tests, `npm run lint`, `npm run build`, `npm run test:run` passed
  2629 tests, `cargo test --lib resume` passed 175 tests,
  `cargo clippy -- -D warnings`, and `npm run test:scripts` passed 503 tests.
  Follow-up repo checks passed: `npm run lint:docs`, `npm run lint:bloat`,
  `npm run harness:check`, `git diff --check`, and `npm run
  test:e2e:smoke:budget` with 10 expected tests in about 7.9 seconds.
- Current local Resume Builder stale-draft contract fix makes missing
  experience and education deletes fail instead of silently updating timestamps,
  makes missing draft deletes fail, and checks `save_resume` row counts so
  concurrent missing drafts cannot report success. Browser/dev mocks now mirror
  missing draft and missing nested-entry failures. Verification passed:
  `cargo test --lib resume::builder` passed 9 tests,
  `npx vitest run src/mocks/handlers.test.ts` passed 12 tests, `npm run
  lint`, `npm run build`, `npm run test:run` passed 2629 tests,
  `cargo test --lib resume` passed 178 tests, `cargo clippy -- -D warnings`,
  and `npm run test:scripts` passed 503 tests. Follow-up repo checks passed:
  `npm run lint:docs`, `npm run lint:bloat`, `npm run lint:security`,
  `git diff --check`, and `npm run test:e2e:smoke:budget` with 10 expected
  tests in about 8.2 seconds.
- Current local resume suggestion follow-up replaces backend and mock
  suggestion impact values like `High` and `Medium` with concrete, review-first
  user guidance, changes bullet suggestions from command-style action-verb copy
  to "review whether" copy, and sorts extracted job words so suggestions are
  deterministic instead of depending on hash iteration order. Verification
  passed: `cargo test --lib ats_analyzer` passed 25 tests, `npx vitest run
  src/pages/ResumeOptimizer.test.tsx` passed 16 tests, `node --test
  scripts/check-product-copy.test.mjs scripts/check-repo-bloat.test.mjs`
  passed 264 tests, `npm run test:scripts` passed 488 tests, `npm run
  test:run` passed 2657 tests, `npm run lint` passed, `cargo fmt --all --
  --check` passed, `cargo clippy -- -D warnings` passed, `cargo test --lib`
  passed 2495 tests with 21 ignored, and `npm run build` passed.
- Current local Resume Builder live-panel cleanup carries the same
  required/preferred/other missing-word grouping into live resume review, updates
  real and mock ATS suggestions to ask users to review truthful evidence instead
  of adding words, and changes bullet draft hints away from `consider adding`
  phrasing. Verification passed: `npx vitest run
  src/components/AtsLiveScorePanel.test.tsx
  src/pages/ResumeOptimizer.test.tsx src/mocks/handlers.test.ts` passed 69
  tests, `cargo test --lib ats_analyzer` passed 23 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 43 tests, `cargo fmt --all --
  --check`, `npm run lint`, `npm run lint:docs`, `npm run harness:check`,
  `npm run build`, `cargo clippy -- -D warnings`, `npm run lint:bloat`,
  `npm run test:run` passed 2656 tests, focused Resume Builder Playwright
  smoke passed 1 test, `cargo test --lib` passed 2493 tests with 21 ignored,
  and `git diff --check` passed.
- Current local resume-priority planning update moves resume assistance,
  resume-assisted guided intake, and application readability to the top
  functional priority across the README, roadmap, active plans, and feature
  privacy-label harness. It also updates stale score-label test expectations
  from old short labels to current evidence labels. Verification passed:
  `npx vitest run src/utils/scoreUtils.test.ts` passed 16 tests, `npm run
  test:run` passed 2654 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 43 tests, `npm run
  harness:check`, `npm run lint:docs`, `npm run lint`, and `git diff --check`.
- Current local Application Tracker subtitle cleanup replaces visible
  keyboard-instruction text with plain purpose copy and adds product-copy
  coverage so the old technical subtitle cannot return. Verification passed:
  `node --test scripts/check-product-copy.test.mjs` passed 43 tests,
  `npm run lint:bloat`, `npm run lint`, and targeted stale-subtitle search
  found no production `src` matches.
- Current local Application Assist review-pace cleanup changes stats away from
  volume/rate wording (`Forms Opened`, `Submission Rate`) toward review-first
  labels, changes profile review settings to `Review Pace`, removes the normal
  `50` daily option, and keeps higher saved paces visible only as existing
  state with protective guidance. Product-copy sensors now reject old review
  pace and submission-rate drift. Verification passed: `npx vitest run
  src/components/automation/ProfileForm.test.tsx
  src/pages/ApplicationProfile.test.tsx` passed 14 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 43 tests, `node --test
  scripts/check-repo-bloat.test.mjs` passed 221 tests, focused Playwright
  `node scripts/run-playwright.mjs test
  tests/e2e/playwright/one-click-apply.spec.ts --project=chromium --grep
  "loads settings stats"` passed 1 test in 2.9s, `npm run lint`,
  `npm run lint:bloat`, `npm run lint:docs`, and `git diff --check`.
- Current local test-quality harness cleanup closes the skipped/empty-test
  smell gap from the deep harness audit. `check-test-quality.mjs` now rejects
  `test.skip`, empty JavaScript test bodies, and empty Rust `#[test]`
  functions. Verification passed: `node --test
  scripts/check-test-quality.test.mjs` passed 5 tests,
  `node scripts/check-test-quality.mjs` passed, and `node --test
  scripts/check-docs-drift.test.mjs` passed 15 tests. Broader checks also
  passed: `npm run test:scripts` passed 472 tests, `npm run lint:bloat`,
  `npm run lint:docs`, and `git diff --check`.
- Current local frontend-boundary harness cleanup closes the alias-resolution
  gap from the deep harness audit. `check-frontend-boundaries.mjs` now reads
  `tsconfig.json` path aliases, strips JSONC comments without corrupting glob
  strings, and applies layer-boundary checks to `@/*` imports. Verification
  passed: `node --test scripts/check-frontend-boundaries.test.mjs` passed 4
  tests and `node scripts/check-frontend-boundaries.mjs` passed. Broader
  checks also passed: `npm run test:scripts` passed 469 tests,
  `npm run lint:bloat`, `npm run lint:docs`, and `git diff --check`.
- Current local Browser Button recovery cleanup replaces remaining
  settings/connection-style error copy with action-first Browser Import
  recovery, adds sanitized load/toggle/number-save/copy tests, and updates the
  Browser Import Button guide from `connection settings` to `button setup
  number`. Product-copy sensors now reject old browser-import settings and
  connection wording. Verification passed: `npx vitest run
  src/components/BookmarkletGenerator.test.tsx` passed 6 tests,
  `node --test scripts/check-product-copy.test.mjs` passed 43 tests, and
  `npm run lint:docs` passed. Broader checks also passed: `npm run lint`,
  `npm run test:scripts` passed 468 tests, `npm run lint:bloat`, and
  `git diff --check`.
- Current local interview outcome cleanup changes the negative outcome button
  and chip from `Did not go well` to `Not a fit`, keeps the persisted
  `failed` value for data compatibility, and uses neutral chip colors instead
  of red failure colors. Product-copy sensors now reject the old phrase.
  Verification passed: `npx vitest run
  src/components/InterviewScheduler.test.tsx` passed 39 tests,
  `node --test scripts/check-product-copy.test.mjs` passed 43 tests, and
  `rg -n "Did not go well" src docs/plans/active README.md ROADMAP.md --glob
  '!docs/archive/**'` found no matches. Broader checks also passed:
  `npm run lint`, `npm run test:scripts` passed 468 tests,
  `npm run lint:bloat`, `npm run lint:docs`, and `git diff --check`.
- Current local pay-floor empty-state cleanup changes the no-jobs Dashboard
  helper text so empty searches suggest nearby titles, locations, work modes,
  or more sources before changing the user's lowest acceptable pay. Product
  copy sensors now include that empty-state helper and reject old recovery
  wording that nudges users to broaden or adjust their lowest pay. Verification
  passed: `npx vitest run src/pages/Dashboard.test.tsx` passed 14 tests,
  `node --test scripts/check-product-copy.test.mjs` passed 43 tests, and
  `node --test scripts/check-repo-bloat.test.mjs` passed 221 tests. Broader
  checks also passed: `npm run lint`, `npm run test:scripts` passed 468 tests,
  `npm run lint:bloat`, `npm run lint:docs`, `npm run harness:check`, and
  `git diff --check`.
- Current local Resume review evidence-label cleanup changes ResumeOptimizer
  and AtsLiveScorePanel away from format-result percentages, `Overall Match`
  wording, and row-level score percentages. The visible UI now uses
  `Resume Fit`, `Overall fit`, and evidence labels such as `Clear evidence`,
  `Some evidence`, `Mixed evidence`, and `Low evidence`; internal progress-bar
  math remains unchanged. Product-copy sensors now cover the Resume review
  surfaces and reject the old visible result/scorecard copy. Verification
  passed: `npx vitest run src/components/AtsLiveScorePanel.test.tsx
  src/pages/ResumeOptimizer.test.tsx` passed 56 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 43 tests, `npm run lint` passed,
  `npm run test:scripts` passed 468 tests, `npm run lint:bloat` passed, and
  `git diff --check` passed.
- Current local fit-factor display cleanup removes user-visible factor
  percentages from ScoreDisplay tooltips and the Fit Details modal. Tooltip
  factors now show plain priorities (`Primary`, `Important`, `Supporting`) and
  factor statuses (`Fits`, `Needs review`, `No clear signal`); modal factor
  badges now show evidence labels (`Clear evidence`, `Some evidence`,
  `Needs review`). Product-copy sensors now reject the old JSX factor-percent
  displays while leaving internal bar math intact. Verification passed: `npx
  vitest run src/components/ScoreDisplay.test.tsx
  src/components/ScoreBreakdownModal.test.tsx` passed 83 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 43 tests, `npm run lint` passed,
  `npm run test:scripts` passed 468 tests, `npm run lint:bloat` passed, and
  `npm run lint:docs` passed.
- Current local ScoreDisplay Storybook cleanup changes stale score examples
  from `Excellent`, `Average`, `Low`, and percentage-range labels to maintained
  fit labels (`Strong fit`, `Good fit`, `Possible fit`, `Needs review`).
  Product-copy sensors now reject the old story names and range labels.
  Verification passed: `npx vitest run src/components/ScoreDisplay.test.tsx`
  passed 44 tests, `node --test scripts/check-product-copy.test.mjs` passed 43
  tests, `npm run lint` passed, `npm run test:scripts` passed 468 tests,
  `npm run lint:bloat` passed, `npm run lint:docs` passed, and
  `git diff --check` passed.
- Current local alert-pickiness UI cleanup changes Notification Preferences
  alert-filter badges from raw threshold percentages to plain labels (`Very
  picky`, `Picky`, `Balanced`, `More alerts`) and gives each slider a
  source-specific accessible name. Product-copy sensors now reject raw
  `{config.minScoreThreshold}%` display. Verification passed: `npx vitest run
  src/components/NotificationPreferences.test.tsx` passed 46 tests,
  `node --test scripts/check-product-copy.test.mjs` passed 43 tests,
  `npm run lint` passed, `npm run test:scripts` passed 468 tests,
  `npm run lint:bloat` passed, `npm run lint:docs` passed, and
  `git diff --check` passed.
- Current local user-doc sidecar cleanup applies read-only agent findings
  across the docs hub, Job Sources guide, Resume Data Import, Fit Review,
  Resume Builder, Notifications, Quick Start, and Privacy. It removes
  API/rate/schema/score-range phrasing from user-facing docs, switches source
  docs to pace labels, points Resume Builder at the current Resume Match image,
  and extends product-copy sensors for those drift classes. Verification
  passed: `node --test scripts/check-product-copy.test.mjs` passed 42 tests,
  targeted stale-phrase search found no old live wording in touched docs,
  `npm run lint:bloat` passed, `npm run harness:check` passed,
  `npm run lint:docs` passed, `npm run test:scripts` passed 467 tests, and
  `git diff --check` passed.
- Current local privacy/responsible/resume fit-language cleanup changes
  `PRIVACY.md`, `RESPONSIBLE_AI.md`, and the Resume Match feature guide away
  from match-score and match-result wording toward fit-level and fit-estimate
  wording. Product-copy sensors now cover those maintained docs and reject
  stale match-score, low/strong match, and match-result headings. Focused
  verification passed: `node --test scripts/check-product-copy.test.mjs`
  passed 41 tests, `npm run lint:bloat` passed, `npm run lint:docs` passed,
  `npm run harness:check` passed, `npm run test:scripts` passed 466 tests, and
  `git diff --check` passed.
- Current local fit-estimate style-guide cleanup changes maintained writing
  guidance, glossary, Smart Scoring docs, and the active guided-intake plan away
  from match-score and match-factor wording toward fit-estimate language.
  Product-copy sensors now cover those maintained docs and reject stale
  match-score, match-percentage, Match Factors, and alert-threshold drift.
  Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs` passed 41 tests, `npm run lint:bloat`
  passed, `npm run lint:docs` passed, `npm run harness:check` passed,
  `npm run test:scripts` passed 466 tests, and `git diff --check` passed.
- Current local fit-and-recovery wording cleanup changes job relevance labels
  from match/ranking language to fit/review language across setup, dashboard
  filters, score displays, Resume evidence panels, notifications, guided tour,
  user-data docs, and smart-scoring docs. It also keeps raw problem messages
  out of the App Problem History list, renames local recovery cleanup to
  `Reset Local App Settings`, and clarifies login-required deep-link and
  email-service setup docs. Product-copy sensors now reject the old labels and
  recovery wording. Focused verification passed: `npx vitest run
  src/pages/SetupWizard.test.tsx src/pages/DashboardUI/filterLabels.test.ts
  src/components/ScoreDisplay.test.tsx
  src/components/ScoreBreakdownModal.test.tsx
  src/components/ErrorLogPanel.test.tsx
  src/components/ErrorBoundary.test.tsx
  src/components/ResumeMatchScoreBreakdown.test.tsx
  src/pages/Resume.test.tsx src/pages/Settings.test.tsx` passed 232 tests,
  `node --test scripts/check-product-copy.test.mjs` passed 41 tests, and
  `npm run lint` passed. Broader verification passed: `npm run lint:docs`,
  `npm run lint:bloat`, `npm run test:scripts` passed 466 tests,
  `npm run harness:check`, and `git diff --check`.
- Current local zero-technical setup-copy cleanup makes Slack alerts explicit
  opt-in after a connection link is pasted, changes manual email and USAJobs
  setup labels to plain user wording, masks outside job-source previews to the
  site name until the user chooses to show the full link, and changes
  feedback/resume review copy away from diagnostic and prescriptive language.
  Focused verification passed: `npx vitest run
  src/pages/Settings.test.tsx src/pages/ResumeOptimizer.test.tsx
  src/components/feedback/DebugInfoPreview.test.tsx` passed 55 tests,
  `npm run test:scripts` passed 464 tests, `npm run lint:docs` passed,
  `npm run lint` passed, `npm run lint:bloat` passed, and `git diff --check`
  passed.
- Current local alert-filter copy cleanup replaces old alert-strength wording
  with `How picky alerts are`, updates notification docs away from
  scoring internals, and adds product-copy sensors against the old label and
  interim jargon. Focused verification passed: `npx vitest run
  src/components/NotificationPreferences.test.tsx` passed 45 tests,
  `node --test scripts/check-product-copy.test.mjs` passed 36 tests, `npm run
  lint:docs` passed, and `git diff --check` passed.
- Current local Resume Match action-copy cleanup renames the old tailor-resume
  button to `Review in Resume Builder`, matching the actual action and avoiding
  optimization-style resume wording. Product-copy sensors now reject the old
  `Tailor Resume for This Job` label. Focused verification passed: `npx vitest
  run src/pages/ResumeOptimizer.test.tsx` passed 14 tests and `node --test
  scripts/check-product-copy.test.mjs` passed 36 tests.
- Current local App Problem History support-copy cleanup renames the advanced
  local log action to `Advanced: Save Private App Log`, keeps stack and screen
  traces out of safe support report text, and changes GitHub-open failures to
  online-help wording. Product-copy sensors now reject older detailed-report
  labels, raw stack/report labels, and GitHub-specific failure copy. Focused
  verification passed: `npx vitest run src/components/ErrorLogPanel.test.tsx
  src/services/feedbackService.test.ts` passed 46 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 43 tests, targeted stale-copy
  search found no production matches, `npm run lint` passed, `npm run
  lint:bloat` passed, `npm run lint:docs` passed, and `git diff --check`
  passed.
- Current local external-AI gateway hardening requires a reviewed
  `redactedPayload` whenever redaction is enabled, sends only that reviewed
  payload to provider transports, and rejects payload fields the gateway has
  not classified. Verification passed: red tests failed before the fix, then
  `npx vitest run src/services/aiGateway.test.ts` passed 12 tests, `npm run
  lint:external-ai` passed, `npm run lint:security` passed, `npm run
  lint:architecture` passed, `npm run lint:docs` passed, `npm run lint:bloat`
  passed, `npm run lint:tests` passed, `node --test
  scripts/check-product-copy.test.mjs` passed 43 tests, `npm run lint` passed,
  `npm run build` passed, and `git diff --check` passed.
- Current local application-profile IPC minimization trims the edit-profile
  response and mock response to fields the profile form needs, removing unused
  backend metadata such as ids, default template fields, and timestamps. Red
  tests failed before the fix, then `npx vitest run src/mocks/handlers.test.ts
  src/components/automation/ProfileForm.test.tsx` passed 24 tests, `cargo test
  --lib application_profile_response` passed 4 tests, `npm run
  lint:tauri-invokes` passed, `cargo fmt --all -- --check` passed, `npm run
  lint` passed, `npm run build` passed, `npm run lint:docs` passed, `npm run
  lint:bloat` passed, and `git diff --check` passed.
- Current local Settings safety-copy follow-up makes saved support reports
  review-first before sharing, changes source suggestions from recommendations
  to optional review, and clarifies chat connection links should be treated like
  passwords. Focused Settings and product-copy tests passed; lint, docs, bloat,
  and diff-check verification passed.
- Current local API cache-key privacy hardening replaces raw argument JSON in
  in-memory cache keys with an opaque deterministic hash, so cache statistics
  do not expose resume text, salary floors, or other request argument values.
  Red test failed before the fix, then focused API tests, lint, build, docs,
  bloat, and diff-check verification passed.
- Current local source-status wording cleanup replaces remaining user-facing
  `source health` wording with `source status` in README, roadmap, source
  guides, and ScraperHealthDashboard log context. Product-copy sensors now
  reject source-health drift in user-facing surfaces. Focused verification
  passed: `npx vitest run src/components/ScraperHealthDashboard.test.tsx`
  passed 56 tests, `node --test scripts/check-product-copy.test.mjs` passed 36
  tests, targeted stale-phrase search found no old live wording, `npm run
  lint:bloat` passed, and `npm run lint:docs` passed.
- Current local user-doc help-heading cleanup replaces remaining user-facing
  `Troubleshooting` headings with plain "When Something Does Not Work" or
  source-status help language across Quick Start, Deep Links, feature guides,
  and source docs. Product-copy sensors now reject those headings and table
  labels in user-facing docs. Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs` passed 36 tests, targeted stale-heading
  search found no old live headings in user-facing docs, `npm run lint:bloat`
  passed, and `npm run lint:docs` passed.
- Current local sidecar-finding cleanup replaces restricted-automation source
  policy wording, command-first profile customization guidance, resume-app
  export placeholder/error copy, and guarantee framing in saved-secret docs.
  Product-copy sensors now reject those exact drifts across README, roadmap,
  profile docs, Resume Match, and saved-secret docs. Focused verification
  passed: `npx vitest run src/pages/ResumeOptimizer.test.tsx` passed 14 tests,
  `node --test scripts/check-product-copy.test.mjs` passed 35 tests, targeted
  stale-phrase search found no old live wording in touched files, `npm run
  lint:bloat` passed, and `npm run lint:docs` passed.
- Current local README and source-guide wording cleanup replaces internal
  bounded-request, source-specific-boundary, retry-helper, and source-boundary
  flow wording with plain source-check, allowed-use, wait-between-checks, and
  local-save wording. Product-copy sensors now reject the old implementation
  phrases on the front door and source guide. Focused verification passed:
  `node --test scripts/check-product-copy.test.mjs` passed 35 tests,
  `npm run lint:docs` passed, targeted stale-phrase search found no old live
  wording in README or source docs, and `npm run lint:bloat` passed.
- Current local Deep Links browser-search cleanup changes automatic-check copy
  to browser-review and scheduled-source-check wording. Product-copy sensors
  now reject `does not check automatically` and `automatic checking` drift in
  addition to scan/automation wording. Focused verification passed: `npx vitest
  run src/components/DeepLinkGenerator.test.tsx` passed 4 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 34 tests, targeted stale-phrase
  search found no old live wording in the Deep Links component or guide, and
  `npm run lint:bloat` passed.
- Current local scheduled-check wording cleanup changes remaining USAJobs and
  Quick Start automatic-check copy to scheduled/next-step wording. Product-copy
  sensors now reject newline-hidden `automatic USAJobs checks`, Quick Start
  `watching the allowed sources`, and `Here's what happens automatically`
  drift. Focused verification passed: `npx vitest run
  src/pages/Settings.test.tsx`, `node --test
  scripts/check-product-copy.test.mjs`, targeted stale-phrase search found no
  old live wording in Settings or Quick Start, and `npm run lint:bloat`.
- Current local Telegram alert setup copy cleanup removes visible automatic-alert,
  bot-command, and chat-number wording from Settings and the Notifications
  guide. Telegram stays an optional chat-alert path, but the primary UI no
  longer teaches `@BotFather`, `/newbot`, or `@userinfobot` setup steps.
  Product-copy sensors now reject those drift phrases. Focused verification
  passed: `npx vitest run src/pages/Settings.test.tsx`, `node --test
  scripts/check-product-copy.test.mjs`, targeted stale-phrase search found no
  old live wording in Settings or the Notifications guide, `npm run lint:docs`,
  and `npm run test:scripts`. Broader verification passed: `npm run
  lint:bloat`, `npm run lint:docs`, `npm run lint`, and `git diff --check`.
- Current local telemetry-comment cleanup removes analytics-service and
  automatic-error-reporting language from web-vitals and error-boundary comments
  so comments match Rule 0 local-first behavior. Product-copy sensors now reject
  those drift phrases. Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs`, `npx vitest run
  src/components/ErrorBoundary.test.tsx
  src/components/ComponentErrorBoundary.test.tsx
  src/components/PageErrorBoundary.test.tsx
  src/components/ModalErrorBoundary.test.tsx src/utils/vitals.test.ts`,
  targeted stale-phrase search found no old wording in touched files, and
  `git diff --check`. Broader verification passed: `npm run lint:bloat`,
  `npm run lint:docs`, `npm run test:scripts`, `npm run lint`, and
  `git diff --check`.
- Current local Resume Builder doc attachment-wording follow-up changes upload
  preview and ready-to-upload phrasing to application-preview and attach
  wording. Product-copy sensors now reject the old Resume Builder doc phrases.
  Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs`, `npm run lint:docs`, targeted
  stale-phrase search found no old wording in the feature doc, and
  `git diff --check`. Broader verification passed: `npm run lint:bloat`,
  `npm run lint:docs`, `npm run test:scripts`, `npm run lint`, and
  `git diff --check`.
- Current local Smart Scoring doc resume-wording follow-up changes the remaining
  uploaded-resume phrasing to added-resume phrasing in the feature guide.
  Product-copy sensors now reject the old Smart Scoring doc wording. Focused
  verification passed: `node --test scripts/check-product-copy.test.mjs`,
  `npm run lint:docs`, targeted stale-phrase search found no old wording in the
  feature doc, and `git diff --check`. Broader verification passed:
  `npm run lint:bloat`, `npm run lint:docs`, `npm run test:scripts`,
  `npm run lint`, and `git diff --check`.
- Current local Application Profile resume-file help follow-up changes the
  tooltip from generic application-review wording to local, user-controlled
  attachment wording. Product-copy sensors now reject the old ProfileForm
  tooltip. Focused verification passed: `npx vitest run
  src/components/automation/ProfileForm.test.tsx`, `node --test
  scripts/check-product-copy.test.mjs`, targeted stale-phrase search found no
  old visible wording in ProfileForm, and `git diff --check`. Broader
  verification passed: `npm run lint:bloat`, `npm run lint:docs`,
  `npm run test:scripts`, `npm run lint`, and `git diff --check`.
- Current local Application Assist resume-file copy follow-up changes the manual
  task label from resume-upload wording to user-controlled resume-file wording.
  Product-copy sensors now reject the old Application Preview label. Focused
  verification passed: `npx vitest run
  src/components/automation/ApplicationPreview.test.tsx`, `node --test
  scripts/check-product-copy.test.mjs`, targeted stale-phrase search found no
  old visible wording in Application Preview, and `git diff --check`. Broader
  verification passed: `npm run lint:bloat`, `npm run lint:docs`,
  `npm run test:scripts`, `npm run lint`, and `git diff --check`.
- Current local Resume Builder add-copy follow-up changes import-skill recovery
  copy from upload wording to add wording so users do not infer a cloud transfer
  for local resume review. Product-copy sensors now reject the old Resume
  Builder upload phrasing. Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs`, targeted stale-phrase search found no
  old visible wording in Resume Builder, and `git diff --check`. Broader
  verification passed: `npm run lint:bloat`, `npm run lint:docs`,
  `npm run test:scripts`, `npm run lint`, and `git diff --check`.
- Current local Resume Match add-copy follow-up changes local Resume Match
  surfaces and feature docs from choose/upload wording to choose/add wording.
  Product-copy sensors now reject the old local-resume upload phrasing in
  `ResumeOptimizer`, `ResumeMatchScoreBreakdown`, and the Resume Match feature
  doc. Focused verification passed: `npx vitest run
  src/pages/ResumeOptimizer.test.tsx
  src/components/ResumeMatchScoreBreakdown.test.tsx`, `node --test
  scripts/check-product-copy.test.mjs`, and targeted stale-phrase search found
  no old visible wording in the touched surfaces. Broader verification passed:
  `npm run lint:bloat`, `npm run lint:docs`, `npm run test:scripts`,
  `npm run lint`, and `git diff --check`.
- Current local resume-add copy follow-up changes local Resume page and Settings
  resume-match copy from upload/uploaded wording to add/added wording so users
  do not infer a cloud transfer for local resume review. Product-copy sensors
  now reject the old local-resume upload labels. Focused verification passed:
  `npx vitest run src/pages/Resume.test.tsx src/pages/Settings.test.tsx`,
  `node --test scripts/check-product-copy.test.mjs`, and targeted search found
  old wording only in sensors, fixtures, or negative assertions for the touched
  paths. Broader local checks also passed: `npm run lint:bloat`,
  `npm run lint:docs`, `npm run test:scripts`, `npm run lint`, and
  `git diff --check`.
- Current local resume-error copy follow-up fixes shared error precedence so
  resume-not-found and resume-parsing failures are treated as resume-review
  problems instead of missing job pages or changed job websites. It also
  replaces upload/service wording with local-first resume-review copy. Focused
  verification passed: `npx vitest run src/utils/errorMessages.test.ts`,
  `node --test scripts/check-product-copy.test.mjs`, and targeted stale-phrase
  search found old wording only in sensor fixtures or negative assertions.
  Broader local checks also passed: `npm run lint:bloat`,
  `npm run lint:docs`, `npm run test:scripts`, `npm run lint`, and
  `git diff --check`.
- Current local Browser Import doc/code follow-up removes remaining
  user-visible `import helper` wording from `docs/BOOKMARKLET.md` and the
  generated browser-button failure alert, then adds Rust and product-copy
  coverage against drift. Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs`, `cargo test --lib bookmarklet`,
  `cargo fmt --all -- --check`, and targeted search found no user-visible
  stale helper phrases in the Browser Import doc, UI, or generated alert.
  Broader local checks also passed: `npm run lint:bloat`,
  `npm run lint:docs`, `npm run test:scripts`, `npm run lint`, and
  `git diff --check`.
- Latest committed frontend verification evidence: `npm run test:run` passed
  110 Vitest files and 2637 tests, `npm run build` passed in 4.13 seconds, and
  `npm run test:scripts` passed 454 script tests.
- Latest committed backend verification evidence: `cargo fmt --all -- --check`
  passed, `cargo test --lib` passed 2489 tests with 21 ignored, and
  `cargo clippy -- -D warnings` reported no issues from `src-tauri`.
- Latest committed security/dependency evidence: `npm run lint:security`,
  `npm run lint:architecture`, `npm run lint:external-ai`,
  `npm run lint:tauri-invokes`, `npm audit --audit-level=moderate`, and
  `cargo deny check advisories` passed. `cargo audit` exited 0 with the known
  allowed upstream/transitive Rust advisory warnings tracked in `SEC-002`.
- Latest committed E2E evidence: `npm run test:e2e:smoke:budget` passed in
  6.22 seconds, and `npm run test:e2e:all:budget` passed 252 Chromium and
  WebKit tests in 123.15 seconds against the 240-second budget.
- Latest committed broad-audience and Rule 0 slice fixes read-only sub-agent
  findings: support-report privacy overclaims, visible scoring jargon, Telegram
  setup jargon, approved job-source feed wording, wrapper Rule 0 snippets,
  feature privacy-label freshness, and active-plan status compaction.
- Latest committed verification for that slice: `npm run harness:check`,
  `npm run test:scripts`, `npm run lint:docs`, `npm run lint:bloat`,
  `npm run lint`, focused Vitest for eight affected frontend/service test
  files, and `git diff --check` passed. Focused Vitest passed 178 tests.
- Committed settings/support copy slice changes manual email setup labels,
  USAJobs jobs-to-check labels, connected-source review labels, and the detailed
  local support-report action. Verification passed: focused Vitest for Settings
  and ErrorLogPanel passed 71 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, `npm run lint:bloat`,
  `npm run harness:check`, `npm run lint:docs`, `npm run test:scripts` passed
  454 script tests, `npm run lint`, and `git diff --check` passed.
- Committed feedback/recovery tooltip slice changes the detailed local
  support report tooltip and Browser Button docs away from support-only wording
  and adds product-copy coverage. Verification passed: focused ErrorLogPanel
  Vitest passed 34 tests, `node --test scripts/check-product-copy.test.mjs`
  passed 32 tests, and `npm run lint:bloat` passed.
- Committed detailed-report privacy slice makes frontend error-report JSON
  export re-sanitize stored records before writing, adds a regression test for
  private job-search details in detailed local report output, and adds a privacy
  sensor against raw `errors: this.errors` export drift. Focused verification
  passed: `npx vitest run src/utils/errorReporting.test.ts` passed 14 tests,
  `node --test scripts/check-privacy-logging.test.mjs` passed 42 tests, `npm
  run lint:bloat`, `npm run harness:check`, `npm run lint:docs`, `npm run
  test:scripts` passed 455 script tests, `npm run lint`, and `git diff --check`
  passed.
- Committed feedback-flow copy slice changes optional GitHub sharing from
  maintainer/issue wording to online-help wording, keeps the local safe support
  report path primary, and adds product-copy guards against the old phrases.
  Focused verification passed: feedback SubmitOptions and SuccessScreen Vitest
  passed 5 tests, `node --test scripts/check-product-copy.test.mjs` passed 32
  tests, `npm run lint:bloat`, `npm run test:scripts` passed 455 script tests,
  `npm run lint:docs`, `npm run lint`, and `git diff --check` passed.
- Committed support-report label slice changes generated support-report
  section labels from support-only wording to safe app details, and adds a
  product-copy guard against those labels returning. Focused verification
  passed: `npx vitest run src/services/feedbackService.test.ts` passed 12
  tests, `node --test scripts/check-product-copy.test.mjs` passed 32 tests,
  `npm run lint:bloat`, `npm run test:scripts` passed 455 script tests, `npm
  run lint:docs`, `npm run lint`, and `git diff --check` passed.
- Committed detailed-report tooltip slice changes the detailed local report
  tooltip from maintainer wording to plain help wording and adds product-copy
  coverage against the old tooltip. Focused verification passed: `npx vitest run
  src/components/ErrorLogPanel.test.tsx` passed 34 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, `npm run lint:bloat`,
  `npm run test:scripts` passed 455 script tests, `npm run lint:docs`, `npm run
  lint`, and `git diff --check` passed.
- Committed user-help docs slice changes broken-link and invalid saved-detail
  recovery docs away from maintainer/GitHub assumptions, keeps the safe support
  report path primary, and adds product-copy coverage against the old phrases.
  Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, `npm run lint:bloat`,
  `npm run test:scripts` passed 455 script tests, `npm run lint:docs`,
  `npm run harness:check`, and `git diff --check` passed.
- Committed README/settings help-copy slice changes front-door support copy
  away from maintainer GitHub assumptions and replaces the visible Settings
  `Troubleshooting` heading with `Help and Status`. Product-copy coverage now
  rejects the old phrases. Focused verification passed: `npx vitest run
  src/pages/Settings.test.tsx` passed 38 tests, and `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests. Broader verification
  passed: `npm run lint:bloat`, `npm run test:scripts` passed 455 script tests,
  `npm run lint:docs`, `npm run lint`, `npm run harness:check`, and
  `git diff --check`.
- Committed docs sidecar copy slice applies read-only agent findings across
  README download/data-boundary wording, Quick Start install and local-file
  wording, Deep Links contributor/browser-add-on wording, Browser Button privacy
  wording, notification and credential docs, public issue templates, SECURITY,
  and CODE_OF_CONDUCT. Product-copy sensors now reject the old phrases. Focused
  verification passed: `node --test scripts/check-product-copy.test.mjs`
  passed 32 tests, `npm run lint:bloat`, `npm run test:scripts` passed 455
  script tests, `npm run lint:docs`, and `git diff --check`.
- Committed frontend sidecar copy slice applies read-only agent findings
  across feedback sharing, success-step, Settings source, setup source,
  source-status table, Resume Builder/Optimizer recovery, Browser Button, and
  error-boundary detail labels. Product-copy sensors now reject the old phrases.
  Focused verification passed: `npx vitest run
  src/components/feedback/SubmitOptions.test.tsx
  src/components/feedback/SuccessScreen.test.tsx src/pages/Settings.test.tsx
  src/pages/SetupWizard.test.tsx
  src/components/ScraperHealthDashboard.test.tsx
  src/pages/ResumeOptimizer.test.tsx
  src/components/BookmarkletGenerator.test.tsx
  src/components/ErrorBoundary.test.tsx
  src/components/PageErrorBoundary.test.tsx
  src/components/ModalErrorBoundary.test.tsx
  src/components/ComponentErrorBoundary.test.tsx` passed 214 tests,
  `node --test scripts/check-product-copy.test.mjs` passed 32 tests,
  `npm run test:scripts` passed 455 script tests, `npm run lint:bloat`,
  `npm run lint`, and `git diff --check`.
- Committed shared recovery details slice changes optional dev toast,
  component boundary, modal boundary, and certificate-error wording away from
  support-detail, generic-error, and issue labels toward app-problem and problem
  wording. Product-copy sensors now reject the old phrases. Focused
  verification passed: `npx vitest run src/utils/api.test.ts
  src/utils/errorMessages.test.ts src/components/ComponentErrorBoundary.test.tsx
  src/components/ModalErrorBoundary.test.tsx` passed 94 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, `node --test
  scripts/check-privacy-logging.test.mjs` passed 42 tests, `npm run
  lint:bloat`, `npm run test:scripts` passed 455 script tests, `npm run lint`,
  and `git diff --check`.
- Committed outcome-label copy slice changes optional source-contact result
  labels from failure-first words to `Needs attention` and `Took too long`, and
  changes the reusable async-button example/test guidance from `Failed to...`
  to `Could not...`. Product-copy sensors now reject the old phrases. Focused
  verification passed: `npx vitest run src/components/AsyncButton.test.tsx
  src/pages/Settings.test.tsx` passed 66 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, `npm run lint:bloat`,
  `npm run test:scripts` passed 455 script tests, `npm run lint`, and
  `git diff --check`.
- Committed source-name copy slice changes README source coverage, source
  feature docs, public job-source issue template, shared source labels, and
  frontend mocks from `HN Who's Hiring` wording to `Startup and tech job posts`.
  Product-copy sensors now reject the acronym-first source wording in
  user-facing source surfaces. Focused verification passed: `npx vitest run
  src/utils/sourceLabels.test.ts src/pages/Settings.test.tsx
  src/pages/SetupWizard.test.tsx` passed 60 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, no `HN Who's Hiring`,
  `Hacker News`, or `Who's Hiring thread` wording remains in user-facing issue
  template, README, feature-doc, user-doc, or source paths, `npm run
  test:scripts` passed 455 script tests, `npm run lint:bloat`, `npm run
  harness:check`, `npm run lint:docs`, `npm run lint`, and `git diff --check`
  passed.
- Committed and pushed email-service wording slice changes Settings, Quick Start, and
  notification docs away from technical-first email setup wording toward
  email-service and encrypted sending language. Product-copy sensors now reject
  the old phrases. Focused verification passed: `npx vitest run
  src/pages/Settings.test.tsx` passed 38 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, targeted search found
  no stale email setup phrases in Settings, Quick Start, or notification docs,
  `npm run lint:bloat`, `npm run harness:check`, `npm run lint:docs`, `npm run
  test:scripts` passed 455 script tests, `npm run lint`, and `git diff --check`
  passed. Remote `Docs Harness` and `CI` runs for commit `d31a48fb` passed on
  `main`.
- Committed local saved-secrets docs slice rewrites the credential feature guide as
  a plain-language saved-secrets guide, keeps developer implementation details in
  `docs/security/KEYRING.md`, updates docs index wording, and adds product-copy
  sensors for developer-reference drift in the feature doc. Focused verification
  passed: `node --test scripts/check-security-docs.test.mjs` passed 8 tests,
  `node --test scripts/check-product-copy.test.mjs` passed 32 tests, `npm run
  lint:bloat`, `npm run harness:check`, `npm run lint:docs`, `npm run
  test:scripts` passed 456 script tests, and `git diff --check`.
- Committed local notification-doc cleanup removes maintainer-only alert delivery,
  raw connection-link, and module-structure details from the user-facing
  notification guide. Product-copy sensors now reject those blocks if they drift
  back into the feature doc. Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, targeted search found no
  maintainer-detail block terms in `docs/features/notifications.md`, `npm run
  lint:bloat`, and `npm run harness:check`.
- Committed local architecture-doc accuracy slice aligns the developer credential
  and notification module summary with live Rust names, service naming, legacy
  LinkedIn cleanup, and alert privacy boundaries. Docs-drift sensors now reject
  the stale credential names and old storage-boundary wording. Focused
  verification passed: `node --test scripts/check-docs-drift.test.mjs` passed
  15 tests, targeted architecture search found no stale credential markers,
  `npm run lint:bloat`, and `npm run harness:check`.
- Committed local ghost-detection feature-doc cleanup removes developer-only
  schema and API command details from the job-seeker guide. Product-copy sensors
  now reject those implementation details if they drift back into
  `docs/features/ghost-detection.md`. Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, targeted search found no
  ghost schema/API terms in that feature doc, `npm run lint:bloat`, `npm run
  harness:check`, `npm run lint:docs`, `npm run test:scripts`, and
  `git diff --check`.
- Committed local Quick Start cleanup replaces contributor/developer setup labels
  and advanced local-file wording with plain optional source-code and file
  location copy. Product-copy sensors now reject the old current phrases in
  `docs/user/QUICK_START.md`. Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, targeted search found no
  old Quick Start phrases, `npm run lint:bloat`, `npm run harness:check`, `npm
  run lint:docs`, `npm run test:scripts`, and `git diff --check`.
- Committed local resume-import feature-doc cleanup replaces raw JSON field mapping
  and developer command-contract details with plain imported-section, privacy,
  and validation guidance. Product-copy sensors now reject those implementation
  details if they drift back into `docs/features/json-resume-import.md`.
  Focused verification passed: `node --test scripts/check-product-copy.test.mjs`
  passed 32 tests, targeted search found no removed resume-import contract
  markers, `npm run lint:bloat`, `npm run harness:check`, `npm run lint:docs`,
  `npm run test:scripts`, and `git diff --check`.
- Committed local Resume Builder feature-doc cleanup removes developer-only local
  storage, command, export, and backend-file details from the job-seeker guide.
  Product-copy sensors now reject those implementation details if they drift
  back into `docs/features/resume-builder.md`. Focused verification passed:
  `node --test scripts/check-product-copy.test.mjs` passed 32 tests, targeted
  search found no removed Resume Builder developer markers, `npm run
  lint:bloat`, `npm run harness:check`, `npm run lint:docs`, `npm run
  test:scripts`, and `git diff --check`.
- Committed local Smart Scoring feature-doc cleanup removes developer-only command,
  config, and backend scoring-model details from the match-explanation guide.
  Product-copy sensors now reject those implementation details if they drift
  back into `docs/features/smart-scoring.md`. Focused verification passed:
  `node --test scripts/check-product-copy.test.mjs` passed 32 tests, targeted
  search found no removed Smart Scoring developer markers, `npm run lint:bloat`,
  `npm run harness:check`, `npm run lint:docs`, `npm run test:scripts`, and
  `git diff --check`.
- Committed local user-data feature-doc cleanup removes implementation references,
  notification-preference code snippets, and command/test details from the local
  job-search data guide, then moves the notification-preference backend shape
  contract into developer architecture docs. Product-copy and security-doc
  sensors now reject those implementation details in
  `docs/features/user-data-management.md` while requiring the developer contract
  in `docs/developer/ARCHITECTURE.md`. Focused verification passed: `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, `node --test
  scripts/check-security-docs.test.mjs` passed 9 tests, targeted search found no
  removed user-data developer markers, `npm run lint:bloat`, `npm run
  harness:check`, `npm run lint:docs`, `npm run test:scripts`, and `git diff
  --check`.
- Committed local feature-doc implementation-leak cleanup removes remaining
  maintainer blocks, implementation references, module paths, command/test
  snippets, saved-file internals, and chat-number setup wording from
  user-facing feature guides. Resume renderer DTO privacy requirements moved to
  developer architecture docs. Product-copy and privacy sensors now keep
  feature guides plain while preserving developer contracts. Focused
  verification passed: `node --test scripts/check-product-copy.test.mjs` passed
  32 tests, `node --test scripts/check-privacy-logging.test.mjs
  scripts/check-repo-bloat.test.mjs` passed 263 tests, targeted search found no
  removed feature-doc implementation markers, and `npm run lint:bloat` passed.
- Committed local feedback copy cleanup replaces remaining GitHub-first online
  help copy in the safe support report flow with optional online-help wording.
  Product-copy sensors now reject those phrases if they drift back. Focused
  verification passed: `npx vitest run
  src/components/feedback/SubmitOptions.test.tsx
  src/components/feedback/SuccessScreen.test.tsx` passed 5 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 32 tests, targeted search found no
  removed GitHub-first feedback phrases, and `npm run lint:bloat` passed.
- Committed local question-match validation copy cleanup replaces technical
  pattern-symbol wording with plain question-word guidance. Product-copy sensors
  now reject the old validation wording if it drifts back. Focused verification
  passed: `npx vitest run src/utils/formValidation.test.ts` passed 78 tests,
  `node --test scripts/check-product-copy.test.mjs` passed 32 tests, targeted
  search found no removed validation phrases, and `npm run lint:bloat` passed.
- Committed local Application Profile stat-copy cleanup replaces send/sent
  wording with labels that make clear users submit applications themselves.
  Focused verification passed: `npx vitest run
  src/pages/ApplicationProfile.test.tsx` passed 1 test, `node --test
  scripts/check-product-copy.test.mjs` passed 33 tests, targeted component
  search found no stale labels, `npm run lint:bloat`, `npm run lint:docs`,
  `npm run test:scripts` passed 458 script tests, `npm run lint`,
  `npm run harness:check`, and `git diff --check` passed.
- Committed local Settings source-toggle copy cleanup replaces remaining
  `automatic checks` wording with scheduled-job-check wording so accessible
  source controls stay clear and non-automation-framed. Focused verification
  passed: `npx vitest run src/pages/Settings.test.tsx` passed 38 tests,
  `node --test scripts/check-product-copy.test.mjs` passed 33 tests,
  targeted Settings search found no stale phrase, `npm run lint:bloat`,
  `npm run lint:docs`, `npm run test:scripts` passed 458 script tests, and
  `npm run lint` passed.
- Committed local Browser Button copy cleanup replaces remaining helper and
  advanced-setting wording with browser-import and optional setup wording.
  Focused verification passed: `npx vitest run
  src/components/BookmarkletGenerator.test.tsx` passed 3 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 33 tests, targeted component
  search found no stale helper phrases, `npm run lint:bloat`,
  `npm run lint:docs`, `npm run test:scripts` passed 458 script tests, and
  `npm run lint` passed.
- Committed local Job Source Status copy cleanup replaces feed, page-read, and
  not-needed labels with public-job-list, reads-job-details, and official-source
  wording. Focused verification passed: `npx vitest run
  src/components/ScraperHealthDashboard.test.tsx` passed 56 tests, `node --test
  scripts/check-product-copy.test.mjs` passed 33 tests, targeted component
  search found no stale labels, `npm run lint:bloat`, `npm run lint:docs`,
  `npm run test:scripts` passed 458 script tests, and `npm run lint` passed.
- No remote CI or push should run unless the user explicitly asks in the current
  turn.

## Latest Slice

Scope:

- Primary current push is critical product functionality, not broad cleanup.
- Local resume commits are the newest committed work: `3d720693 Add resume
  requirement review caps` and `3aa39952 Add resume next-action guidance`.
  They add local requirement review, recognized hard-constraint caps, and
  plain next-action guidance for Resume Match.
- Latest pushed critical-functionality slice adds the high-risk **Open Original
  Posting** action and next-step guidance on job cards, improves
  ghost-indicator feedback accessibility and tests, makes Settings support
  reports easier to find, and locks the architect/orchestrator plus sub-agent
  contract into the harness.
- Latest local conservative synonym/acronym slice in `d2d1944f` teaches local
  requirement review that `CRM` and `customer relationship management` are
  equivalent evidence without broad fuzzy matching. Current reviewer-fix work
  prevents the acronym and expansion from double-counting on the same evidence
  line.
- Latest local structured evidence recency slice in `56d9a5ab` marks matched structured
  resume requirements from a current role as `current experience`, while older
  role matches keep the existing `experience` label. Focused analyzer tests
  passed for current-experience labeling and existing plain-text section
  classification. Verification passed: `cargo test --lib ats_analyzer
  --manifest-path src-tauri/Cargo.toml`, `cargo clippy --manifest-path
  src-tauri/Cargo.toml -- -D warnings`, `cargo fmt --all --manifest-path
  src-tauri/Cargo.toml -- --check`, `npm run lint:docs`, `npm run lint:bloat`,
  and `git diff --check`.
- Latest local Resume Match evidence-label slice in `26d306f6` translates backend
  requirement evidence sections into plain labels such as current role
  experience, work experience, and skills list. Focused frontend verification
  passed: `npx vitest run src/pages/ResumeOptimizer.test.tsx`, `npm run lint
  -- --quiet`, and `npx tsc --noEmit`.
- Latest local reviewer-fix slice in `efea47a5` also ports conservative `CRM` equivalence
  and current structured-experience labels into browser/dev mocks, and scopes
  docs so active saved-resume text is not described as current-role aware.
  Verification passed: analyzer tests, Rust clippy and formatter check,
  mock/frontend Vitest, full frontend test suite, ESLint, TypeScript, docs
  lint, bloat lint, and diff check.
- Multi-agent orchestration evidence: a read-only reviewer checked recent
  resume-analysis commits and requested the reviewer-fix slice; a read-only
  explorer scanned active plans and recommended next disjoint slices: Resume
  Import Status, Resume-Assisted Guided Intake, and Source Governance Metadata.
  Both agents were closed after their findings were integrated or recorded.
- Latest local Resume Import Status slice in `b3c07068` adds sanitized format and
  readable-text metadata to resume summaries and shows it on the active resume
  card before fit review, without exposing `file_path`, `parsed_text`, or raw
  resume content. Verification passed: `cargo test --lib resume
  --manifest-path src-tauri/Cargo.toml`, `npx vitest run src/pages/Resume.test.tsx
  src/mocks/handlers.test.ts`, `npm run lint:architecture`, `npm run
  lint:external-ai`, `npm run lint:tauri-invokes`, `cargo clippy
  --manifest-path src-tauri/Cargo.toml -- -D warnings`, `npx tsc --noEmit`,
  `npm run lint -- --quiet`, `npm run lint:docs`, `npm run lint:bloat`, and
  `git diff --check`.
- Latest local Resume-Assisted Guided Intake slice in `da84110a` loads active saved-resume
  skill names for setup, shows them as optional reviewed suggestions, and only
  adds a name to "work you want" after the user picks it. It does not expose
  `resume_id`, `confidence_score`, `file_path`, `parsed_text`, raw resume text,
  or any external AI path in the setup UI. Verification passed: `npx vitest run
  src/pages/SetupWizard.test.tsx`, `npx tsc --noEmit`, `npm run lint -- --quiet`,
  `npm run lint:architecture`, `npm run lint:external-ai`, `npm run
  lint:tauri-invokes`, `npm run lint:docs`, `npm run harness:check`, `npm run
  lint:bloat`, and `git diff --check`.
- Latest local Source Governance Metadata slice in `66924003` adds a Settings contact-history
  row naming sensitive data not sent to optional connected job sources: resume
  text, salary floor, private notes, application history, and full source link.
  Verification passed: `npx vitest run src/pages/Settings.test.tsx`, `npx tsc
  --noEmit`, `npm run lint -- --quiet`, `npm run lint:external-ai`, `npm run
  lint:docs`, `npm run harness:check`, `npm run lint:bloat`, `npm run
  lint:tauri-invokes`, `npm run lint:architecture`, and `git diff --check`.
- Latest local resume availability-constraint slice in `0d8bf479` expands local hard-constraint
  caps to required schedule and availability language, including weekend or
  shift availability, and keeps the mock analyzer and Resume Match helper label
  aligned. Verification passed: `cargo test --lib resume --manifest-path
  src-tauri/Cargo.toml`, `cargo test --lib ats_analyzer --manifest-path
  src-tauri/Cargo.toml`, `cargo clippy --manifest-path src-tauri/Cargo.toml --
  -D warnings`, `cargo fmt --all --manifest-path src-tauri/Cargo.toml --
  --check`, `npx vitest run src/pages/ResumeOptimizer.test.tsx
  src/mocks/handlers.test.ts`, `npx tsc --noEmit`, `npm run lint -- --quiet`,
  `npm run lint:external-ai`, `npm run lint:tauri-invokes`, `npm run
  lint:docs`, `npm run harness:check`, `npm run lint:bloat`, `npm run
  lint:architecture`, and `git diff --check`.
- Latest local resume experience-constraint slice in `191962e5` adds a local `Experience`
  hard-constraint category for required years-of-experience language, caps
  missing required experience at `65`, and makes the browser/dev mock extract
  those hard-constraint phrases dynamically. Verification passed: `cargo test
  --lib resume --manifest-path src-tauri/Cargo.toml`, `cargo test --lib
  ats_analyzer --manifest-path src-tauri/Cargo.toml`, `cargo clippy
  --manifest-path src-tauri/Cargo.toml -- -D warnings`, `cargo fmt --all
  --manifest-path src-tauri/Cargo.toml -- --check`, `npx vitest run
  src/pages/ResumeOptimizer.test.tsx src/mocks/handlers.test.ts`, `npx tsc
  --noEmit`, `npm run lint -- --quiet`, `npm run lint:external-ai`, `npm run
  lint:tauri-invokes`, `npm run lint:docs`, `npm run harness:check`, `npm run
  lint:bloat`, `npm run lint:architecture`, and `git diff --check`.
- Latest local resume seniority-constraint slice in `1f8d7581` recognizes
  required seniority language such as senior-level experience as a local
  experience constraint, checks visible role, leadership, or enough-years
  evidence, and caps local fit confidence at `65` when the required level is
  missing. Browser/dev mocks stay aligned with backend review. Verification
  passed: `cargo test --lib senior_level --manifest-path src-tauri/Cargo.toml`,
  `npx vitest run src/mocks/handlers.test.ts -t "analyzes resumes"`, `cargo
  test --lib ats_analyzer --manifest-path src-tauri/Cargo.toml`, `npx vitest
  run src/mocks/handlers.test.ts`, `npx tsc --noEmit`, `npm run lint --
  --quiet`, `cargo test --lib --manifest-path src-tauri/Cargo.toml`, `cargo
  fmt --all --manifest-path src-tauri/Cargo.toml -- --check`, `cargo clippy
  --manifest-path src-tauri/Cargo.toml -- -D warnings`, `npm run
  lint:external-ai`, and `git diff --check`.
- Latest local hard-requirement action slice in `6e43a675` changes backend and
  dev/mock hard-requirement risk actions from generic "verify this" copy to
  category-specific guidance for authorization, clearance, licenses,
  education, years or level, physical demands, and location, schedule,
  availability, or travel. Verification passed: `cargo test --lib
  "missing_required" --manifest-path src-tauri/Cargo.toml`, `npx vitest run
  src/mocks/handlers.test.ts -t "analyzes resumes"`, `cargo test --lib
  ats_analyzer --manifest-path src-tauri/Cargo.toml`, `npx vitest run
  src/mocks/handlers.test.ts`, `npx tsc --noEmit`, `npm run lint -- --quiet`,
  `cargo test --lib --manifest-path src-tauri/Cargo.toml`, `cargo fmt --all
  --manifest-path src-tauri/Cargo.toml -- --check`, `cargo clippy
  --manifest-path src-tauri/Cargo.toml -- -D warnings`, `npm run
  lint:external-ai`, and `git diff --check`.
- Latest local credential-equivalence slice in `c4fd8c7a` lets resume
  requirement review treat clear credential acronym or full-name pairs such as
  `BLS` and `Basic Life Support` as the same evidence without broad fuzzy
  matching. Structured resume certifications and projects now count as visible
  evidence sections, and browser/dev mocks stay aligned. Verification passed:
  `cargo test --lib credential_equivalence --manifest-path src-tauri/Cargo.toml`,
  `npx vitest run src/mocks/handlers.test.ts -t "analyzes resumes"`, `cargo
  test --lib ats_analyzer --manifest-path src-tauri/Cargo.toml`, `npx vitest
  run src/mocks/handlers.test.ts`, `npx tsc --noEmit`, `npm run lint --
  --quiet`, `cargo test --lib --manifest-path src-tauri/Cargo.toml`, `cargo
  fmt --all --manifest-path src-tauri/Cargo.toml -- --check`, `cargo clippy
  --manifest-path src-tauri/Cargo.toml -- -D warnings`, `npm run
  lint:external-ai`, and `git diff --check`.
- Latest local degree-equivalent-experience slice in `9fc9777d` treats
  explicit degree or equivalent experience wording as experience-compatible
  evidence instead of an exact-degree hard cap. Browser/dev mocks stay aligned.
  Verification passed: `cargo test --lib degree_or_equivalent --manifest-path
  src-tauri/Cargo.toml`, `npx vitest run src/mocks/handlers.test.ts -t
  "degree-or-equivalent"`, `cargo test --lib ats_analyzer --manifest-path
  src-tauri/Cargo.toml`, `npx vitest run src/mocks/handlers.test.ts`, `npx tsc
  --noEmit`, `npm run lint -- --quiet`, `cargo test --lib --manifest-path
  src-tauri/Cargo.toml`, `cargo fmt --all --manifest-path src-tauri/Cargo.toml
  -- --check`, `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D
  warnings`, `npm run lint:external-ai`, and `git diff --check`.
- Latest local training-heading credential slice in `df0bdf9a` treats
  readable-text headings such as Training, Credentials, Certificates, and
  Licenses as credential evidence instead of generic resume text. Verification
  passed: `cargo test --lib training_heading --manifest-path
  src-tauri/Cargo.toml`, `cargo test --lib ats_analyzer --manifest-path
  src-tauri/Cargo.toml`, `cargo fmt --all --manifest-path src-tauri/Cargo.toml
  -- --check`, `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D
  warnings`, `cargo test --lib --manifest-path src-tauri/Cargo.toml`, and `git
  diff --check`.
- Latest local training-heading structure slice in `1a9c6b52` also treats
  Training, Credentials, Certificates, and Professional Training headings as
  standard readable-resume structure, so credential evidence headings are not
  flagged as missing standard headings. Verification passed: `cargo test --lib
  training_heading --manifest-path src-tauri/Cargo.toml`, `cargo test --lib
  ats_analyzer --manifest-path src-tauri/Cargo.toml`, `cargo test --lib
  --manifest-path src-tauri/Cargo.toml`, `cargo fmt --all --manifest-path
  src-tauri/Cargo.toml -- --check`, `cargo clippy --manifest-path
  src-tauri/Cargo.toml -- -D warnings`, and `git diff --check`.
- Latest local keyword-list bullet slice in `0447094b` warns when experience or
  project bullets read like keyword lists instead of plain work evidence, while
  leaving normal skill-list sections alone. Browser/dev mocks stay aligned.
  Verification passed: `cargo test --lib keyword_list --manifest-path
  src-tauri/Cargo.toml`, `npx vitest run src/mocks/handlers.test.ts -t
  "analyzes resumes"`, `cargo test --lib ats_analyzer --manifest-path
  src-tauri/Cargo.toml`, `npx vitest run src/mocks/handlers.test.ts`, `npx tsc
  --noEmit`, `npm run lint -- --quiet`, `cargo test --lib --manifest-path
  src-tauri/Cargo.toml`, `cargo fmt --all --manifest-path src-tauri/Cargo.toml
  -- --check`, `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D
  warnings`, `npm run lint:external-ai`, and `git diff --check`.
- Latest local generic-filler bullet slice in `c72a574d` warns when experience
  or project bullets are packed with generic filler phrases instead of
  specific work evidence. Browser/dev mocks stay aligned. Verification passed:
  `cargo test --lib generic_filler --manifest-path src-tauri/Cargo.toml`,
  `npx vitest run src/mocks/handlers.test.ts -t "generic filler"`, `cargo test
  --lib ats_analyzer --manifest-path src-tauri/Cargo.toml`, `npx vitest run
  src/mocks/handlers.test.ts`, `npx tsc --noEmit`, `npm run lint -- --quiet`,
  `cargo test --lib --manifest-path src-tauri/Cargo.toml`, `cargo fmt --all
  --manifest-path src-tauri/Cargo.toml -- --check`, `cargo clippy
  --manifest-path src-tauri/Cargo.toml -- -D warnings`, `npm run
  lint:external-ai`, and `git diff --check`.
- Latest local capability-level warning slice in `7b546c78` warns when
  experience or project bullets mix ownership or expert wording with
  exposure-only or assisted-work signals, so users can keep resume wording at
  the true capability level. Browser/dev mocks stay aligned. Verification
  passed: `cargo test --lib capability_level --manifest-path
  src-tauri/Cargo.toml`, `npx vitest run src/mocks/handlers.test.ts -t
  "capability level"`, `cargo test --lib ats_analyzer --manifest-path
  src-tauri/Cargo.toml`, `npx vitest run src/mocks/handlers.test.ts`, `npx tsc
  --noEmit`, `npm run lint -- --quiet`, `cargo test --lib --manifest-path
  src-tauri/Cargo.toml`, `cargo fmt --all --manifest-path src-tauri/Cargo.toml
  -- --check`, `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D
  warnings`, `npm run lint:external-ai`, and `git diff --check`.
- Latest local career-break heading slice in `b149e0d1` treats Career Break,
  Career Pause, and caregiving headings as standard readable-resume structure,
  so truthful gap context is not flagged as missing standard headings.
  Verification passed: `cargo test --lib career_break --manifest-path
  src-tauri/Cargo.toml`, `cargo test --lib ats_analyzer --manifest-path
  src-tauri/Cargo.toml`, `cargo test --lib --manifest-path
  src-tauri/Cargo.toml`, `cargo fmt --all --manifest-path src-tauri/Cargo.toml
  -- --check`, `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D
  warnings`, and `git diff --check`.
- Latest local volunteer-service heading slice in `cd7d5599` treats Volunteer
  Experience, Community Involvement, and Military Service as standard
  readable-resume structure, so nontraditional experience sections are not
  flagged as missing standard headings. Verification passed: `cargo test --lib
  volunteer_and_military --manifest-path src-tauri/Cargo.toml`, `cargo test
  --lib ats_analyzer --manifest-path src-tauri/Cargo.toml`, `cargo test --lib
  --manifest-path src-tauri/Cargo.toml`, `cargo fmt --all --manifest-path
  src-tauri/Cargo.toml -- --check`, `cargo clippy --manifest-path
  src-tauri/Cargo.toml -- -D warnings`, and `git diff --check`.
- Latest local volunteer-service evidence slice in `c434afb8` also treats
  requirement matches under Volunteer Experience, Community Involvement, and
  Military Service headings as experience evidence instead of generic resume
  text. Verification passed: `cargo test --lib service_headings
  --manifest-path src-tauri/Cargo.toml`, `cargo test --lib ats_analyzer
  --manifest-path src-tauri/Cargo.toml`, `cargo test --lib --manifest-path
  src-tauri/Cargo.toml`, `cargo fmt --all --manifest-path src-tauri/Cargo.toml
  -- --check`, `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D
  warnings`, and `git diff --check`.
- Latest local interview-defense bullet slice in `fda14375` adds a reminder to
  drafted alternative bullets to check the problem, user role, action, result,
  and evidence before using stronger wording. Browser/dev mocks stay aligned.
  Verification passed: `cargo test --lib improve_bullet_with_job_context
  --manifest-path src-tauri/Cargo.toml`, `npx vitest run
  src/mocks/handlers.test.ts -t "analyzes resumes"`, `cargo test --lib
  ats_analyzer --manifest-path src-tauri/Cargo.toml`, `npx vitest run
  src/mocks/handlers.test.ts`, `npx tsc --noEmit`, `npm run lint -- --quiet`,
  `cargo test --lib --manifest-path src-tauri/Cargo.toml`, `cargo fmt --all
  --manifest-path src-tauri/Cargo.toml -- --check`, `cargo clippy
  --manifest-path src-tauri/Cargo.toml -- -D warnings`, `npm run
  lint:external-ai`, and `git diff --check`.
- Latest local broad requirement-term slice in `4dea83be` adds healthcare,
  education, service, operations, and trades terms to local resume requirement
  review so examples such as patient care, medication administration, and
  lesson planning are not ignored as software-only matching gaps. Browser/dev
  mocks stay aligned. Verification passed: `cargo test --lib
  healthcare_and_education --manifest-path src-tauri/Cargo.toml`, `npx vitest
  run src/mocks/handlers.test.ts -t "healthcare and education"`, `cargo test
  --lib ats_analyzer --manifest-path src-tauri/Cargo.toml`, `npx vitest run
  src/mocks/handlers.test.ts`, `npx tsc --noEmit`, `npm run lint -- --quiet`,
  `cargo test --lib --manifest-path src-tauri/Cargo.toml`, `cargo fmt --all
  --manifest-path src-tauri/Cargo.toml -- --check`, `cargo clippy
  --manifest-path src-tauri/Cargo.toml -- -D warnings`, `npm run
  lint:external-ai`, and `git diff --check`.
- Latest local legal, finance, and government requirement-term slice in
  `a8169b09` adds terms such as document review, records management, and
  financial reconciliation to local resume requirement review. It also treats
  trailing sentence punctuation as a requirement boundary so plainly written
  experience bullets still match. Browser/dev mocks stay aligned.
  Verification passed: `cargo test --lib legal_finance --manifest-path
  src-tauri/Cargo.toml`, `npx vitest run src/mocks/handlers.test.ts -t "legal
  finance"`, `cargo test --lib ats_analyzer --manifest-path
  src-tauri/Cargo.toml`, `npx vitest run src/mocks/handlers.test.ts`, `npx tsc
  --noEmit`, `npm run lint -- --quiet`, `cargo test --lib --manifest-path
  src-tauri/Cargo.toml`, `cargo fmt --all --manifest-path src-tauri/Cargo.toml
  -- --check`, `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D
  warnings`, `npm run lint:external-ai`, and `git diff --check`.
- Latest local resume file-guidance slice in `808aea8e` updates the no-readable-text status
  to tell users to follow employer file instructions first, then use readable
  PDF, DOCX, TXT, or Markdown when no format is named. Verification passed:
  `npx vitest run src/pages/Resume.test.tsx`, `npx tsc --noEmit`, `npm run
  lint -- --quiet`, `npm run lint:external-ai`, `npm run lint:docs`, `npm run
  harness:check`, `npm run lint:bloat`, `npm run lint:architecture`, and `git
  diff --check`.
- Latest local resume preview-guidance slice in `4a1cf389` updates the empty readable-text
  preview modal to use employer-instructions-first guidance before suggesting a
  readable PDF, DOCX, TXT, Markdown resume, or resume app export. Verification
  passed: `npx vitest run src/pages/Resume.test.tsx`, `npx tsc --noEmit`, `npm
  run lint -- --quiet`, `npm run lint:external-ai`, `npm run lint:docs`, `npm
  run harness:check`, `npm run lint:bloat`, `npm run lint:architecture`, and
  `git diff --check`.
- Latest local setup pay-not-sure slice in `b3475fdc` adds an explicit "Not
  sure yet" action beside first-run minimum yearly pay, clears the local salary
  floor to `0`, keeps missing-pay jobs visible and marked, and records the
  no-floor choice in the review summary before scanning starts. Verification
  passed: `npx vitest run src/pages/SetupWizard.test.tsx`, `npx tsc --noEmit`,
  `npm run lint -- --quiet`, `npm run lint:external-ai`, and `git diff --check`.
- Latest local open-ended-pay slice in `5981e92c` keeps min-only listed pay such
  as `$45k+` visible without showing a below-floor warning, because the listed
  minimum does not prove the role tops out below the user's floor. Verification
  passed: `npx vitest run src/components/JobCard.test.tsx`, `npx tsc
  --noEmit`, `npm run lint -- --quiet`, `npm run lint:external-ai`, and `git
  diff --check`.
- Latest local hard-requirement next-action slice in `eee933b3` adds
  category-specific next-action guidance for hard resume requirements,
  including warning users not to round up or imply extra years of experience.
  Verification passed: `npx vitest run src/pages/ResumeOptimizer.test.tsx`,
  `npx tsc --noEmit`, `npm run lint -- --quiet`, `npm run lint:external-ai`,
  and `git diff --check`.
- Latest local selected-resume readable-status slice in `13432f8a` shows the
  active saved resume format and readable-text status inside Resume Match before
  job-fit review, including unreadable-resume guidance that follows employer
  file instructions first. It does not expose saved file paths or raw resume
  text. Verification passed: `npx vitest run src/pages/ResumeOptimizer.test.tsx`,
  `npx tsc --noEmit`, `npm run lint -- --quiet`, `npm run lint:external-ai`,
  and `git diff --check`.
- Latest local citizenship hard-constraint slice in `994411ce` recognizes
  required U.S. citizenship language as a work-authorization hard requirement
  in local Resume Match review and keeps the browser/dev mock contract aligned.
  Verification passed: `cargo test --lib ats_analyzer --manifest-path
  src-tauri/Cargo.toml`, `npx vitest run src/mocks/handlers.test.ts`, `npx tsc
  --noEmit`, `npm run lint -- --quiet`, `cargo fmt --all --manifest-path
  src-tauri/Cargo.toml -- --check`, `cargo clippy --manifest-path
  src-tauri/Cargo.toml -- -D warnings`, `npm run lint:external-ai`, and `git
  diff --check`.
- Latest local transportation hard-constraint slice in `52639972` recognizes
  required reliable-transportation or commute language as a location/commute
  hard requirement in local Resume Match review and keeps the browser/dev mock
  contract aligned. Verification passed: `cargo test --lib ats_analyzer
  --manifest-path src-tauri/Cargo.toml`, `npx vitest run
  src/mocks/handlers.test.ts`, `npx tsc --noEmit`, `npm run lint -- --quiet`,
  `cargo fmt --all --manifest-path src-tauri/Cargo.toml -- --check`, `cargo
  clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`, `npm run
  lint:external-ai`, and `git diff --check`.
- Latest local physical-requirement hard-constraint slice in `56339a87`
  recognizes required lifting, prolonged standing, and physical-demand language
  as hard requirements in local Resume Match review, adds the matching
  frontend category label and next-action guidance, and keeps the browser/dev
  mock contract aligned. Verification passed: `cargo test --lib ats_analyzer
  --manifest-path src-tauri/Cargo.toml`, `npx vitest run
  src/pages/ResumeOptimizer.test.tsx src/mocks/handlers.test.ts`, `npx tsc
  --noEmit`, `npm run lint -- --quiet`, `cargo fmt --all --manifest-path
  src-tauri/Cargo.toml -- --check`, `cargo clippy --manifest-path
  src-tauri/Cargo.toml -- -D warnings`, `npm run lint:external-ai`, and `git
  diff --check`.
- Latest local Resume Fit evidence-status slice in `815a62b7` adds a visible
  status label beside the score, including check-must-haves, mixed-evidence,
  not-enough-detail, and clearer-evidence states, so users see the score as
  local evidence review instead of an employer prediction. Verification passed:
  `npx vitest run src/pages/ResumeOptimizer.test.tsx`, `npx tsc --noEmit`,
  `npm run lint -- --quiet`, `npm run lint:external-ai`, and `git diff
  --check`.
- Latest local job fit detail evidence-status slice in `b6b19caf` adds clear,
  mixed, not-enough-information, and preference-conflict labels to the Fit
  Details modal so job-card scores are not numeric-only. Verification passed:
  `npx vitest run src/components/ScoreBreakdownModal.test.tsx`, `npx tsc
  --noEmit`, `npm run lint -- --quiet`, `npm run lint:external-ai`, and `git
  diff --check`.
- Latest local setup location-not-sure slice in `90f68ff6` lets first-run
  setup keep remote, hybrid, and on-site roles visible when the user is not
  ready to choose a location constraint. Verification passed: `npx vitest run
  src/pages/SetupWizard.test.tsx`, `npx tsc --noEmit`, `npm run lint --
  --quiet`, `npm run lint:external-ai`, and `git diff --check`.
- Latest local setup work-to-avoid quick-picks slice in `438fbb61` lets users
  add common schedule or travel deal breakers to rank lower without typing
  search terms. Verification passed: `npx vitest run src/pages/SetupWizard.test.tsx`,
  `npx tsc --noEmit`, `npm run lint -- --quiet`, `npm run lint:external-ai`,
  and `git diff --check`.
- Latest local ghost warning-label slice in `b8dae4ed` changes GhostIndicator
  and compact GhostIndicator accessible labels from raw confidence percentages
  to low, medium, or high warning levels. Verification passed: `npx vitest run
  src/components/GhostIndicator.test.tsx`, `npx tsc --noEmit`, `npm run lint
  -- --quiet`, `npm run lint:external-ai`, and `git diff --check`.
- Latest local resume-sort fit-estimate wording slice in `26af1926` changes
  Settings resume-sort help from score/scoring wording to fit-estimate wording
  and extends product-copy guards against drift. Verification passed: `node
  --test scripts/check-product-copy.test.mjs`, `npm run lint:bloat`, `npx tsc
  --noEmit`, `npm run lint -- --quiet`, `npm run lint:external-ai`, and `git
  diff --check`.
- Latest local Dashboard comparison fit-label slice in `af644659` changes
  comparison rows and duplicate-source groups from numeric-only fit percentages
  to fit labels with percentages, and removes highest-scoring duplicate-copy
  wording. Verification passed: `npx vitest run src/pages/Dashboard.test.tsx`,
  `npx tsc --noEmit`, `npm run lint -- --quiet`, `node --test
  scripts/check-product-copy.test.mjs`, `npm run lint:external-ai`, and `git
  diff --check`.
- Latest local salary sample-quality slice in `3a6731e1` labels Pay Protection
  benchmark samples as thin, useful, or stronger, and tells users to treat thin
  samples as weak signals checked against written ranges, role scope, and
  current postings. Verification passed: `npx vitest run src/pages/Salary.test.tsx
  -t "thin salary samples"`, `npx vitest run src/pages/Salary.test.tsx`, `npx
  tsc --noEmit`, `npm run lint -- --quiet`, `npm run lint:external-ai`, and
  `git diff --check`.
- Latest local broad listed-pay range slice in `48314f44` adds a cautious
  job-card cue when a posted salary range is very wide, so users know the
  range may cover different levels or schedules before tailoring. Verification
  passed: `npx vitest run src/components/JobCard.test.tsx -t "salary
  formatting"`, `npx vitest run src/components/JobCard.test.tsx`, `npx tsc
  --noEmit`, `npm run lint -- --quiet`, `npm run lint:external-ai`, `npm run
  lint:bloat`, and `git diff --check`.
- Latest local past-pay guardrail slice in `4abd1cd8` makes Pay Protection show
  a distinct current-pay or past-pay redirect without making legal claims,
  helping users avoid anchoring to old compensation. Verification passed: `npx
  vitest run src/pages/Salary.test.tsx -t "past-pay guardrail"`, `npx vitest
  run src/pages/Salary.test.tsx`, `npx tsc --noEmit`, `npm run lint --
  --quiet`, `npm run lint:external-ai`, and `git diff --check`.
- Latest local pay level/scope checklist slice in `1e28c6b0` adds Pay
  Protection prompts for title, seniority, responsibilities, schedule, travel,
  expected hours, location, promotion path, review timing, benefits, and
  support before accepting a pay range at face value. Verification passed: `npx
  vitest run src/pages/Salary.test.tsx -t "level and scope"`, `npx vitest run
  src/pages/Salary.test.tsx`, `npx tsc --noEmit`, `npm run lint -- --quiet`,
  `npm run lint:external-ai`, and `git diff --check`.
- Latest local quiet setup alert slice in `d96e3934` adds a first-run quiet
  job-search mode for desktop alerts, turning sound off through existing local
  alert settings without adding email, chat, or other external channels.
  Verification passed: `npx vitest run src/pages/SetupWizard.test.tsx -t
  "quiet job-search alerts"`, `npx vitest run src/pages/SetupWizard.test.tsx`,
  `npx tsc --noEmit`, `npm run lint -- --quiet`, `npm run lint:external-ai`,
  and `git diff --check`.
- Latest local job-card scam-warning slice in `ed5d837b` adds separate
  possible-scam guidance for postings that mention money, checks, fees, or
  sensitive details early, without treating stale-posting risk as scam proof.
  Verification passed: `npx vitest run src/components/JobCard.test.tsx -t
  "scam"`, `npx vitest run src/components/JobCard.test.tsx`, `npx tsc
  --noEmit`, `npm run lint -- --quiet`, `npm run lint:external-ai`, `npm run
  lint:bloat`, and `git diff --check`.
- Latest local duplicate-source label slice in `2a2bc83c` changes job cards
  from shorthand such as `3x` to plain "Seen on 3 sources" copy and keeps a
  regression test for the label. Verification passed: `npx vitest run
  src/components/JobCard.test.tsx -t "duplicate source"`, `npx vitest run
  src/components/JobCard.test.tsx`, `npx tsc --noEmit`, `npm run lint --
  --quiet`, `npm run lint:external-ai`, and `git diff --check`.
- Latest local fit-detail source-input slice in `9fa735c4` adds plain "Uses..."
  labels to Fit Details factors so users can see which saved inputs or posting
  fields affect each local fit estimate. Verification passed: `npx vitest run
  src/components/ScoreBreakdownModal.test.tsx -t "saved inputs"`, `npx vitest
  run src/components/ScoreBreakdownModal.test.tsx`, `npx tsc --noEmit`, `npm
  run lint -- --quiet`, `npm run lint:external-ai`, and `git diff --check`.
- Latest local score-tooltip source-input slice in `2994c69c` adds the same
  saved-input summary to the compact score tooltip. Verification passed: `npx
  vitest run src/components/ScoreDisplay.test.tsx -t "plain priority wording"`,
  `npx vitest run src/components/ScoreDisplay.test.tsx`, `npx tsc --noEmit`,
  `npm run lint -- --quiet`, `npm run lint:external-ai`, and `git diff
  --check`.
- Latest local unscored fit-estimate slice in `6007d909` shows jobs without a
  saved local fit estimate as **No fit yet** with `--`, while numeric zero
  still renders as `0%`. Verification passed: `npx vitest run
  src/components/ScoreDisplay.test.tsx -t "null scores|not-enough-information"`,
  `npx vitest run src/components/JobCard.test.tsx -t "null score|NaN score"`,
  `npx vitest run src/components/ScoreDisplay.test.tsx
  src/components/JobCard.test.tsx`, `npx tsc --noEmit`, `npm run lint --
  --quiet`, `npm run lint:external-ai`, and `git diff --check`.
- No-Apple-account macOS readiness is already best-possible without an Apple
  Developer Account. Keep the limitation explicit: Gatekeeper-ready public
  distribution still needs Developer ID signing and notarization.
- Repo cleanup, harness debt, and broad copy sweeps stay active, but they are
  lower priority unless they block critical functionality, Rule 0, or
  verification.

## Next Best Work

1. Continue resume assistance only where it improves truthful local requirement
   review, hard-constraint handling, readable evidence, or next-action
   guidance.
2. Keep no-account macOS readiness accurate, but do not treat Gatekeeper pass
   as achievable without Developer ID signing and notarization.
3. Continue cleanup only when it blocks critical functionality,
   privacy/security, or verification.
4. Run final broad verification only when remaining known work has current
   evidence.

## Completion Bar

Do not mark the goal complete until current evidence proves:

- No known repo bloat, stale docs, generated artifacts, or duplicate sources of
  truth remain.
- No known privacy leak remains in logs, command errors, renderer messages,
  reports, credential paths, scraper errors, notifications, or local path
  exposure.
- No known user-facing flow assumes terminal, GitHub, debugging, or engineering
  knowledge.
- No known user-facing flow assumes the job seeker is only an engineer or only
  searching for technical work.
- Relevant sensors cover recurring drift classes.
- Final docs, bloat, security, architecture, frontend, build, Rust, and chosen
  E2E checks pass from the current checkout.
