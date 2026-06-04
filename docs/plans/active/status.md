# Active Plan Status

Last updated: 2026-06-04.

Read this file first. It is the compact restart surface for current active
work. Detailed history from the previous open plan set moved to archive on
2026-06-04 so active planning does not slow down future sessions.

## Goal State

The repo-wide goal remains open. JobSentinel should keep moving toward zero
known errors, privacy leaks, stale docs, brittle tests, user-facing technical
assumptions, engineer-only defaults, and unverified claims.

Current priority is critical product functionality before broad cleanup:
truthful local resume assistance, readable application guidance, ghost and stale
posting protection, pay-risk protection, guided intake, and cleanup only where
it blocks privacy, security, verification, or user ease.

Rule 0 still controls the work: user data stays local unless the user explicitly
configures an external channel, external AI stays optional and disabled by
default, and users stay in control before anything leaves the device.

## Active Workstreams

| Workstream | State | Current focus | Source |
| ---------- | ----- | ------------- | ------ |
| Current product and quality work | Active | Resume assistance, application readability, job-card protection, guided intake, and blocking cleanup only | [Plan](current-work.md) |

## Archived Context

These plans are no longer active restart surfaces. Keep them as provenance only:

- [Guided job-search intake](../archive/guided-job-search-intake-superseded-2026-06-04.md)
- [Repo cleanup and quality sweep](../archive/repo-cleanup-and-quality-sweep-superseded-2026-06-04.md)
- [Repo cleanup handoff](../archive/repo-cleanup-handoff-superseded-2026-06-04.md)
- [Research-backed product improvements](../archive/research-backed-product-improvements-superseded-2026-06-04.md)

## Current Posture

- Live repo evidence before this compaction: `git status --short --branch`
  reported `## main...origin/main`.
- Latest observed commit before this compaction:
  `6a220a8c Record pushed semantic evidence batch`.
- Previous active-plan count was 5 and indexed active workstream count was 5.
  Fresh session evidence after this compaction reports 2 active docs and 2
  indexed workstreams: this status file and `current-work.md`.
- No push or remote CI action should run unless the user explicitly asks in the
  current turn.

## Latest Slice

Latest implementation slice:

- Resume Match matched-word evidence now uses the same plain **Found in**
  labels as requirement review.
- Visible rows no longer show backend section names such as `current
  experience` or `skills`; they show current role experience and skills list.
- The slice changes visible local review labels only; it adds no storage
  fields, network calls, external AI, telemetry, or resume-analysis behavior
  changes.

Previous implementation slice:

- Live Resume Builder detail review now shows **Must-Haves To Check** when
  local resume analysis returns hard-constraint risks.
- The section uses plain category labels and truth-first actions instead of
  hiding the risk behind the score or showing backend category names and score
  caps.
- The slice changes visible local review guidance only; it adds no storage
  fields, network calls, external AI, telemetry, or resume-analysis behavior
  changes.

Previous implementation slice:

- Job import preview now labels posting pay as **Listed pay** instead of
  **Salary**.
- The wording keeps imported pay framed as source evidence to review before
  tailoring, not a guaranteed salary.
- The slice changes visible preview copy only; it adds no storage fields,
  network calls, external AI, telemetry, or source-contact behavior changes.

Previous implementation slice:

- Dev mock Resume Match now mirrors Rust/docs for remote, hybrid, overtime,
  holiday, full-time, and part-time hard schedule/location constraints.
- Mocked review can show the same local evidence and risk cues for those
  visible job-post requirements instead of skipping them.
- The slice changes dev mock parity only; it adds no storage fields, network
  calls, external AI, telemetry, or submission behavior.

Previous implementation slice:

- Job import preview now shows the posting closing date when the source
  provides one, instead of dropping the existing `valid_through` preview field.
- Previewed posting and closing dates preserve the source date instead of
  shifting a day earlier in local time zones.
- Users can check time-sensitive posting evidence before saving and tailoring.
- The slice changes visible preview details only; it adds no storage fields,
  network calls, external AI, telemetry, or source-contact behavior changes.

Previous implementation slice:

- Resume suggestion category labels now say **Review job words** instead of
  **Add job words** in both live-score review and the Resume Match page.
- The label better matches the existing truth-first suggestion text and avoids
  implying users should add unsupported words.
- The slice changes visible labels only; it adds no storage fields, network
  calls, external AI, telemetry, or resume-analysis behavior changes.

Previous implementation slice:

- Resume live-score detail review now labels the third missing-word bucket as
  **Nice-to-Have or Other to Review**, matching the Resume Match page and docs.
- Optional or broad job-post words are less likely to read like hard
  requirements, preserving truthful review before edits.
- The slice changes visible labels only; it adds no storage fields, network
  calls, external AI, telemetry, or resume-analysis behavior changes.

Previous implementation slice:

- App Problem History now labels URL-like context keys as **link** or **job
  link** instead of showing raw `url` wording in visible problem details.
- Existing link sanitization still removes private query details before display.
- The slice changes visible labels only; it adds no storage fields, network
  calls, external AI, telemetry, or support-report payload changes.

Previous implementation slice:

- Application preview hard-question review now treats visible `schedule`,
  `available`, and `notice period` wording as salary-or-availability triggers.
- Matching saved schedule or availability answers can appear when postings ask
  about work timing, so users can compare them with the employer wording before
  continuing.
- The slice adds no storage fields, network calls, external AI, telemetry, form
  filling, or hidden submission behavior.

Previous implementation slice:

- App Problem History now says crash details are hidden on screen and that safe
  support reports should be copied or saved only if JobSentinel help asks.
- The copy tells users to review the report before sharing, reinforcing local
  control without exposing raw stack text or private paths.
- The slice changes visible guidance only; it adds no storage fields, network
  calls, external AI, telemetry, or support-report payload changes.

Previous implementation slice:

- Application preview hard-question review now treats visible `education`
  wording as an education-topic trigger, not only degree, diploma, bachelor,
  master, or high-school wording.
- Matching saved education answers can appear for postings such as "Education
  required: approved training program accepted," so users can compare them with
  employer wording and resume evidence before continuing.
- The slice adds no storage fields, network calls, external AI, telemetry, or
  hidden submission behavior.

Previous implementation slice:

- Job source labels now treat blank or missing source data as **Source not
  shown** instead of implying the label came from the posting.
- The guidance asks users to open the original posting before tailoring when
  source evidence is unavailable.
- The slice adds no storage fields, network calls, external AI, telemetry, or
  hidden application behavior.

Previous implementation slice:

- Dev mock resume matching now uses bounded keyword matches for short
  credentials, matching the backend's conservative term-boundary behavior.
- This prevents mock hard-constraint evidence from treating unrelated words
  such as `intern` as evidence for an `RN` requirement.
- The slice adds no storage fields, network calls, external AI, telemetry, or
  hidden application behavior.

Previous implementation slice:

- Job cards now show the low-key **Check posting evidence** cue when valid
  stale or repost reasons exist even if the aggregate posting-risk score is not
  available.
- The cue remains factual: it asks the user to open the original posting before
  tailoring and does not claim employer intent.
- The slice adds no storage fields, network calls, external AI, telemetry, or
  hidden application behavior.

Previous implementation slice:

- Replaced raw regex matching for saved screening answers with local plain-text
  matching across form fill, saved-profile lookups, answer suggestions, and
  dev mocks.
- Symbols now count as normal text: `Security+` matches a Security+
  certification question but not a general security-clearance question.
- Legacy seeded default patterns are still recognized without executing saved
  user text as regex.
- The slice adds no storage fields, network calls, external AI, telemetry, or
  hidden submission behavior.

Previous implementation slice:

- Replaced a raw `url` detail label in safe support report activity details
  with the readable **Link** label while keeping existing sanitization for the
  link value.
- The slice adds no storage fields, network calls, external AI, telemetry, or
  hidden application behavior.
- Verification passed for focused feedback service tests, full frontend ESLint,
  TypeScript, docs lint, harness check, harness session, and diff whitespace.

Previous implementation slice:

- Replaced outside-AI blocked-send copy that exposed internal payload,
  field, and classification wording.
- The gateway still blocks unreviewed details before any outside-AI request is
  sent, but the user-facing error now says the details include something
  JobSentinel has not reviewed for sharing.
- The slice adds no storage fields, network calls, external AI, telemetry, or
  hidden application behavior.
- Verification passed for focused external-AI gateway tests, full frontend
  ESLint, TypeScript, external-AI gateway sensor, docs lint, harness check,
  harness session, and diff whitespace.

Previous implementation slice:

- Added first-run preset paths for office and administration, retail and
  hospitality, and trades and field service so non-technical job seekers are
  not forced through custom setup to avoid tech-oriented presets.
- The new presets seed plain job titles, work words, salary floors, and
  location defaults only. They keep Remote OK, We Work Remotely, and startup
  tech hiring posts off by default.
- The slice adds no storage fields, network calls, external AI, telemetry, or
  hidden application behavior.
- Verification passed for focused profile utility, career-profile selector,
  and setup wizard tests, full frontend ESLint, TypeScript, docs lint, harness
  check, harness session, and diff whitespace.

Previous implementation slice:

- Accepted a read-only truthful-resume sidecar finding and fixed drafted
  alternative bullets that could upgrade vague user wording into stronger
  ownership or development claims.
- Resume bullet drafting now preserves phrases such as `was responsible for`,
  `worked on`, and `helped with`, and only asks users to choose a clearer
  action verb if it is true.
- Existing metric, keyword, role-specific evidence, and interview-defense
  prompts still apply after the preserved user claim.
- The slice adds no storage fields, network calls, external AI, telemetry, or
  hidden application behavior.
- Verification passed for focused Rust `improve_bullet` tests, Rust formatting,
  docs lint, harness check, harness session, and diff whitespace.

Previous implementation slice:

- Accepted a read-only pay-protection sidecar finding and fixed negotiation-note
  draft inputs.
- Salary negotiation notes now require a user-entered written offer and
  user-entered target range before drafting. Benchmark medians and higher-range
  points are not passed as the current offer or target salary.
- The Salary page now sends the default template fields it actually needs:
  `company`, `location`, `years_experience`, `target_min`, `target_max`, and
  `current_offer`.
- Unreplaced template placeholders stay hidden and show a safe recovery message
  instead of appearing as ready-to-use notes.
- The slice adds no storage fields, network calls, external AI, telemetry, or
  hidden submission behavior.
- Verification passed for focused `Salary`, `ScreeningAnswersForm`, and dev
  mock handler tests, full frontend ESLint, TypeScript, docs lint,
  external-AI gateway sensor, repo-bloat sensor, Tauri invoke sensor, harness
  plan, harness session, and diff whitespace.

Previous implementation slice:

- Added extra saved-answer review guidance in Application Assist for hard
  screening topics such as citizenship, work authorization, sponsorship,
  background checks, drug screens, physical requirements, age requirements,
  licenses, certifications, and clearances.
- The note appears inside the local saved-answer modal when question wording
  matches those topics. It reminds users to compare with the exact application
  question and use only what is true and backed by their resume or records.
- The slice adds no storage fields, network calls, external AI, telemetry, or
  hidden submission behavior.
- Focused verification passed for `ScreeningAnswersForm` tests and focused
  ESLint on the touched component/test.

Previous implementation slice:

- Accepted a read-only zero-technical-knowledge audit sidecar and fixed three
  high-confidence findings.
- Quick Start install copy now keeps the main path on choosing an installer,
  without making checksum, signing, release-asset, or account-label knowledge
  part of the front-door instructions.
- Browser Button setup now makes paste-link import the recommended path and
  frames bookmark setup as an optional shortcut for users who already use
  browser bookmarks or have step-by-step browser help.
- Error log copy now uses **Save Extra Problem Details** instead of
  technical/private-log wording, with a tooltip that tells users to use it only
  if JobSentinel help asks.
- Pre-commit verification passed for focused changed-surface tests, full unit
  tests, full frontend ESLint, TypeScript, docs lint, external-AI gateway
  sensor, repo-bloat sensor, harness plan, harness session, and diff whitespace.

Previous verification slice:

- Ran broader frontend checks over the current active frontend batch after unit,
  lint, and type checks were already current.
- `npm run build` passed and emitted a production Vite bundle. Build output
  included toolchain deprecation and plugin-timing warnings, but no build
  failure.
- `npm run test:e2e:smoke:budget` passed in 8.8 seconds with 10 expected smoke
  tests, 0 unexpected, 0 flaky, and 0 skipped.
- Removed generated `dist/` and `test-results/` artifacts after those checks
  and reran docs/harness verification.

Previous implementation slice:

- Cleaned the remaining frontend lint warnings from current `npm run lint`
  output.
- Application Preview hard-question loading now depends on the job description
  field it actually reads, with regression coverage for changing from a harmless
  posting to a hard-screening posting.
- Dashboard fit-label formatting moved out of the component module so Fast
  Refresh lint no longer treats `Dashboard.tsx` as mixed component/helper
  exports.
- Verification passed for focused `ApplicationPreview` and `Dashboard` tests,
  combined changed-surface frontend tests, full unit test suite, full frontend
  ESLint with no warnings, TypeScript, external-AI sensor, docs lint, harness
  check, harness plan, harness session, bloat check, and diff whitespace.

Previous implementation slice:

- Added low-detail job-card guidance for broad titles and thin descriptions.
- The cue uses **Check role details** copy, asks users to confirm role, team,
  and work details before tailoring, and does not claim employer intent,
  scam behavior, or fake-job proof.
- Stronger backend posting-risk guidance still takes priority over the
  local low-detail cue.
- Verification passed for focused and full `JobCard` tests, combined
  `JobCard` and `SetupWizard` tests, TypeScript, ESLint with no errors,
  external-AI sensor, docs lint, harness check, harness plan, bloat check,
  harness session, and diff whitespace.

Previous implementation slice:

- Added reviewed guided-intake bulk controls for saved-resume skill suggestions:
  `Add all visible` and `Skip resume suggestions`.
- Existing individual chips remain user-reviewed. The slice shows skill names
  only, does not expose raw resume text, and adds no network calls, external AI,
  telemetry, storage changes, or hidden automation.
- A guided-intake sidecar implemented the disjoint `SetupWizard` slice.
  Coordinator reviewed the diff and reran focused `SetupWizard` tests and ESLint
  before accepting it.
- Verification passed for focused `SetupWizard` tests, focused SetupWizard
  ESLint, TypeScript, external-AI sensor, docs lint, harness check, and diff
  whitespace.

Previous implementation slice:

- Added missing-pay job-card guidance when both salary fields are empty and a
  salary floor exists.
- The cue asks users to compare the role before tailoring and keeps missing pay
  framed as a review signal, not proof of scam behavior, stale posting, or
  employer intent.
- Open-ended minimum-only pay stays visible without below-floor guidance because
  a listed minimum alone does not prove the role tops out below the user's
  floor.
- Verification passed for focused and full `JobCard` salary tests, TypeScript,
  ESLint, external-AI sensor, docs lint, harness check, and diff whitespace.

Previous implementation slice:

- Changed job-card repeated-sighting copy from source-count wording to
  factual `Seen N times` wording. Tooltips now tell users to check source
  details before treating repeats as separate places.
- Verification passed for focused and full `JobCard` tests, TypeScript, ESLint,
  external-AI sensor, docs lint, harness check, and diff whitespace.

Previous implementation slice:

- Added job-card visibility for parsed stale or repost evidence even when the
  aggregate posting-risk score is below the normal badge threshold.
- The cue uses factual **Check posting evidence** copy and does not claim
  employer intent, scam proof, or employer-side prediction.
- Verification passed for focused and full `JobCard` tests, TypeScript, ESLint,
  external-AI sensor, docs lint, harness check, and diff whitespace.

Previous implementation slice:

- Added local Resume Match hard-constraint handling for required background
  checks, drug screens, and pre-employment screening.
- Backend analyzer, browser/dev mock analyzer, Resume Match UI labels, and
  feature docs now share the same cautious category:
  **Background or drug screening**.
- The slice does not add storage, network calls, external AI, telemetry, or
  hidden automation. It only adds local evidence review and truthful next-action
  guidance.
- Verification passed for focused Rust and Vitest checks, full affected
  frontend tests, TypeScript, ESLint, Rust formatter, Rust clippy, full Rust
  library tests, external-AI sensor, docs lint, harness check, and diff
  whitespace.

Previous docs-maintenance slice:

- Archive stale long active plans without deleting history.
- Keep one compact active plan for current product and quality work.
- Update docs, index, and harness score expectations so compact active planning
  is the desired state.
- Verification passed for focused script tests, harness score, harness check,
  docs lint, session snapshot, and diff whitespace.

## Next Best Work

1. Continue resume assistance only where it improves truthful local requirement
   review, hard-constraint handling, readable evidence, or next-action guidance.
2. Continue guided intake only where resume/profile suggestions stay optional,
   reviewed, local, and understandable for non-technical job seekers.
3. Continue job-card protection for stale, risky, duplicate, unclear, or
   pay-problem postings without treating local signals as employer predictions.
4. Continue cleanup only when it blocks critical functionality,
   privacy/security, verification, or user ease.
5. Run final broad verification only when remaining known work has current
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
