# Active Plan Status

Last updated: 2026-06-05.

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

- Last pushed baseline before the current local cleanup slice:
  `c1f5dd36 Update macOS readiness and split automation module`.
- Fresh harness evidence reports 2 active docs and 2 indexed workstreams: this
  status file and `current-work.md`.
- Final broad verification passed locally after `91bd9354`: frontend tests/build,
  script tests, harness/bloat/docs/prose, Rust fmt/clippy/lib, `doctor:e2e`,
  and E2E smoke budget.
- Local commits should continue in small verified slices; push only when the
  branch reaches the user's 30-commit batch threshold or the user gives a newer
  explicit push instruction.

## Latest Slice

- Application Assist saved-answer matching now handles plain quick-add aliases
  such as authorized-to-work, able-to-lift, degree, weekend-shift, and
  reliable-vehicle wording.

- First-run setup now keeps suggested tech-heavy job sources off until the user
  checks them in review, and saves only checked sources.

- Job cards now run unsafe saved-link checks before custom dashboard open
  handlers, so visible **Check job link** guidance cannot be bypassed by a
  callback path.

- Job cards now flag top-only listed pay as weak pay evidence, telling users to
  confirm the starting pay before tailoring instead of treating an "up to"
  amount as a full range.

- Resume Builder live-score hard-constraint tests moved into a focused file,
  keeping the main ATS live-score test under the frontend test size target.

- Dashboard job-list, empty-state, and filtered-empty rendering moved into a
  focused component, bringing the main dashboard page down near 1,000 lines
  before more product work touches it.

- Resume Builder and Resume Match now label citizenship hard risks as
  citizenship in visible category/fallback text, instead of showing the shared
  work-authorization category when the requirement text is citizenship-specific.

- Resume hard-requirement actions now tell users to check citizenship for
  citizenship requirements instead of reusing work-authorization wording, and
  the dev mock matches the Rust analyzer.

- Build My Search now offers broad starter job-title buttons such as office,
  customer service, sales, warehouse, healthcare, and bookkeeping roles so
  non-technical first-run users do not start from a blank title field.

- First-run saved-resume skill suggestions now wait for an explicit
  **Check saved resume skills** action before reading local resume skills, and
  the suggestion panel moved out of the main setup page to stay under file-size
  limits.

- Resume Builder live score now shows must-have warnings from weak hard
  requirement review rows even when no separate hard-risk list is present.

- Resume Match next actions no longer duplicate partial or implied hard
  requirements as both **Check first** and supporting-evidence actions.

- Dashboard repeat-posting controls now say possible repeats and hide extras
  instead of merge duplicates, keeping the UI from implying confirmed duplicate
  jobs or separate source confirmation.

- Job cards now show visible **Check job link** guidance for unsafe saved links
  before the user clicks, so link-safety risk is not hidden behind the open
  action.

- Resume Match hard-constraint extraction no longer treats age wording such as
  "18 years of age" as a years-experience requirement, and the dev mock now
  matches the Rust analyzer behavior.

- Schema.org job import now converts known non-yearly listed pay units such as
  hourly pay into yearly stored pay fields for pay-floor comparisons, while the
  import preview keeps the original listed unit visible.

- Healthcare guided-intake defaults now keep common support roles such as
  medical assistant, patient care assistant, home health aide, and certified
  nursing assistant visible instead of blocking them through generic
  "Assistant" or "Aide" avoid terms.

- macOS readiness tests now prove that missing Apple Developer Program
  credentials are external blockers only: no-account completion stays 100% at
  the 94% public-readiness ceiling, and full-public readiness reaches 100% only
  when Developer ID and notarization inputs exist.

- README macOS readiness copy now names the 94% no-account public-readiness
  ceiling, so the top-level percentage stays honest while the known
  no-Apple-account constraint remains explicit.

- Job-card low-detail cues now flag generic remote and entry-level titles as
  role details to check before tailoring.

- First-run source defaults no longer treat generic software sales,
  implementation, or support searches as engineering searches for tech-heavy
  job boards.

- Public wiki `Home.md` and `Capabilities.md` were updated and pushed with
  current macOS readiness, no-account checksum guidance, hard must-have resume
  status, and scam-cue behavior.

- Job-card scam cues now catch sensitive-detail requests that appear after
  phrases like "before the interview" as well as before the phrase.

- Resume Fit evidence status now treats hard-requirement review rows as
  **Check must-haves first** even when no separate hard-risk item is present.

- Job-card scam cues now flag messaging-app interview requests while keeping
  ordinary team-chat wording quiet.

- Resume Match next actions now use hard-requirement review rows as check-first
  guidance when no separate hard-risk item is present.

- Mac first-open help now tells users to look for the matching `.dmg.sha256`
  checksum file before using **Open Anyway**, and product-copy checks guard
  that wording.

- The macOS DMG builder now writes `_no-account_` filenames directly when
  `JOBSENTINEL_MACOS_NO_ACCOUNT=true`, and stale cleanup removes both labeled
  and unlabeled checksum variants.

- macOS readiness now checks that no-account release workflow order stays
  verify, label, recreate checksum, then upload.

- macOS development docs now match the README readiness split: 94%
  full-public readiness, 100% no-account path completion, with a readiness
  guard against stale no-account percentage wording.

- Resume Fit evidence status now stays at mixed evidence when required
  job-post wording is missing, partial, or only implied.

- First-run search review now makes job-source choices explicit before saving
  and says resumes, private notes, saved answers, and application history are
  not sent to job sources.

- Job cards now flag minimum-only listed pay as open-ended range evidence even
  when no salary floor is saved, while avoiding duplicate open-ended pay cards
  when floor guidance already covers it.

- Application Assist now treats legally authorized, eligible-to-work,
  employment authorization, green card, and EAD wording as work-authorization
  screening topics.

- Job-card scam cues now cover crypto or payment-app transfer requests and
  passport or direct-deposit requests before interview or offer.

- Resume Match next actions now suppress positive keep-visible guidance whenever
  missing or weak required evidence already needs review.

- Source-specific alert rules now keep sound off by default and normalize older
  partial preferences to quiet source alerts.

- Resume Match next actions now fill hard-requirement checks first and suppress
  positive keep-visible guidance until hard blockers are cleared.

- Desktop alert sound is now opt-in across first-run setup, Settings fallback,
  and config deserialization, so old or partial configs stay quiet unless the
  user turns sound on.

- First-run desktop alerts now start in quiet mode with no sound, while users
  can still turn sound back on before saving setup.

- Job cards now show visible source-review cues for job boards, connected
  feeds, saved links, sample jobs, custom labels, and missing source labels,
  while employer-side hiring pages stay quieter source evidence.

- Resume Match next-action cards now use the backend hard-requirement action
  text, so seniority, screening, physical, and language constraints keep their
  precise truth-first guidance.

- Job cards now flag open-ended starting pay below the user's saved floor as a
  range-review cue, without claiming the role tops out below the floor.

- README and macOS readiness output now separate full-public readiness (94%)
  from the complete no-account path (100%), matching the known no-Apple-account
  constraint.

- Rust tests and platform examples now avoid concrete developer home paths while
  still covering sanitizer and private-detail redaction behavior.

- Frontend, mock, and script test fixtures now use neutral placeholders for
  private resume paths and emails instead of developer-specific local paths.

- Settings resume sorting copy now says it uses reviewed local resume skills,
  falling back to job titles and search words when no reviewed resume skills are
  saved.

- First-run career-path preview now shows suggested job titles and search words
  before saving, and tells users those suggestions can be edited.

- Dev mock Resume Match now treats bilingual and named-language fluency wording
  as language hard constraints, matching the Rust analyzer's score cap, action
  copy, and evidence matching for Spanish and Mandarin examples.

- Active status history was compacted from the old slice log to current restart
  facts, archived-plan provenance, and the next work list so the active plan
  stays below the file-size budget.

- Resume Builder live readability now surfaces must-have warnings before opening
  the detail modal, so work authorization, language, license, screening, or
  other hard requirements are visible before a user edits a tailored resume.

- Dashboard duplicate-review copy now says possible repeated postings, not proof
  that multiple sources confirmed the same job, and duplicate-check toasts use
  cautious review-first wording.

- Resume Match model types, validators, JSON parsing, fit-status copy, and
  suggestion-category labels moved from `src/pages/ResumeOptimizer.tsx` to
  `src/pages/resumeOptimizerModel.ts`.

- Resume Match model helpers, icons, resume library dropdown, and readable-text
  preview modal moved out of `src/pages/Resume.tsx` into focused helper files
  under `src/pages/`.
- `src/pages/Resume.tsx` is now below the 1,200-line frontend target, so the
  legacy oversized-file exception was removed.

- Resume review job-word overview display moved out of
  `src/pages/ResumeOptimizer.tsx` into
  `src/pages/ResumeOptimizerJobWordsOverview.tsx`.

- Resume Builder template thumbnail previews and export/delete icons moved out
  of `src/pages/ResumeBuilder.tsx` into `src/pages/ResumeBuilderVisuals.tsx`.

## Recent Completed Slices

Detailed implementation history before the current restart window is in the
archived plan docs above and the local git log. Current restart context keeps
only the latest active slice plus the next work list so this file stays below
the active-doc budget.

## Next Best Work

1. Continue resume assistance only where it improves truthful local requirement
   review, hard-constraint handling, readable evidence, or next-action guidance.
2. Continue guided intake only where resume/profile suggestions stay optional,
   reviewed, local, and understandable for non-technical job seekers.
3. Continue job-card protection for stale, risky, duplicate, unclear, or
   pay-problem postings without treating local signals as employer predictions.
4. Continue cleanup only when it blocks critical functionality,
   privacy/security, verification, or user ease.

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
