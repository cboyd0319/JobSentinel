# Guided job-search intake

## Goal

Help any job seeker describe what they want without needing job-search jargon,
tech knowledge, or a perfect resume.

The flow should feel like a kind helper asking one useful question at a time,
then turning the answers into JobSentinel search settings.

## Product shape

- Ask one short question per screen.
- Show a recommended answer when JobSentinel can infer one.
- Let users skip any question except the minimum needed to find jobs.
- Explain why a question helps in one sentence or less.
- Use plain examples from many fields, not software-first examples.
- Save answers locally.
- Let users edit the result before job checks start.
- Let users change answers later in Settings.

## Current implementation notes

- Latest local broad-audience copy work changed HR and customer-success profile
  defaults so non-technical people work, onboarding, retention, service
  recovery, customer education, and account support examples appear before
  tech-specific recruiting or support language.
- Latest local saved-search summary work maps raw filter IDs to plain labels
  such as Remote Only, Bookmarked, and With Notes, so guided-intake answers
  remain readable when users save or review a search.
- Priority update on 2026-06-02: guided intake should support optional
  resume-assisted questioning. If a user chooses to use a resume, JobSentinel
  should show extracted skills and experience first, ask what work the user
  wants more or less of, and never let resume evidence leave the device by
  default.

## Research-backed design rules

Source notes reviewed on 2026-05-28 from the job-seeker behavior research
paper list. These rules turn the research into product behavior:

- Reduce the effort to start. Ask only enough to create useful first results,
  then improve the search over time.
- Treat recommendations as invitations, not commands. Explain why a job is
  suggested and what assumption produced the suggestion.
- Separate hard requirements from preferences. Job seekers need to say "must
  have" without accidentally hiding good jobs.
- Make pay adjustable and non-judgmental. Offer "not sure" and "show jobs even
  if pay is missing" paths.
- Treat salary floors and pay transparency as protection, not preference
  trivia. Help users avoid jobs that are below their floor, vague about pay, or
  likely under-leveled.
- Treat ghost-job risk as morale and time protection. Ask whether the user
  wants fresh verified roles first, and warn before deep tailoring when source
  evidence is weak.
- Support long-term unemployment directly. Offer pacing, weekly summaries,
  fresh-role filters, and gap-framing help without shame or pressure language.
- Ask about preferred application routes. Referrals, recruiters, direct company
  postings, hiring-manager signals, and verified active roles should be visible
  as strategy choices, not hidden analytics.
- Ask about adjacent work explicitly. Do not assume users want to leave their
  prior occupation or accept large skill changes.
- Help users interpret qualifications. Distinguish required qualifications from
  preferred or nice-to-have qualifications when JobSentinel can infer that.
- Respect distrust of automation. Scores must be inspectable, editable, and
  described as estimates.
- Design for accessibility and interdependence. The flow must work with screen
  readers, allow user edits, and support shareable summaries without exposing
  private data by default.

## Research signals

| Source | Signal | JobSentinel response |
| ------ | ------ | -------------------- |
| Why Don't Jobseekers Search More? | Lowering the effort to start applications can sharply increase activity when people miss high-return openings because starting feels costly. | Keep setup short, show next actions on job cards, and avoid making users configure everything before first results. |
| Duration Dependence and Job Search over the Spell | Search effort and callbacks change over time, and fatigue is real. | Add later check-ins that ask whether to widen, narrow, pause, or refresh search settings after quiet weeks. |
| The Potential of Recommender Systems for Directing Job Search | Recommendations can work, but only if users act on them. | Pair fit estimates with plain "why this job" and "what to do next" guidance. |
| The Accuracy of Job Seekers' Wage Expectations | Wage expectations can stay anchored even when search evidence changes. | Treat pay as a revisable preference, show market context where available, and avoid shaming copy. |
| Jobseekers' Skills and Job Search Behaviour | Job seekers often prefer roles near prior work and may adjust search based on skill gaps. | Ask about current work, transferable work, and adjacent work separately. |
| Words Matter | Qualification wording changes who applies, and fit perceptions are complex. | Avoid binary "qualified/not qualified" language; show required, preferred, and missing items separately. |
| Navigating Automated Hiring and AI-Mediated Hiring for Blind and Low-Vision Individuals | Job seekers distrust opaque automation, and AI-mediated hiring can harm accessibility and identity representation. | Keep all assumptions visible and editable, keep data local by default, and make accessibility checks required for intake changes. |

Reviewed source links:

- <https://docs.iza.org/dp17520.pdf>
- <https://arxiv.org/abs/2511.03377>
- <https://docs.iza.org/dp16781.pdf>
- <https://docs.iza.org/dp17198.pdf>
- <https://link.springer.com/article/10.1186/s41937-025-00142-9>
- <https://www.sciencedirect.com/science/article/abs/pii/S0167268124002312>
- <https://arxiv.org/abs/2502.05099>
- <https://arxiv.org/abs/2601.11884>

## Intake questions

Start with the lowest-friction questions:

1. What kind of job do you want?
2. Are there job titles you know you want?
3. Where do you want to work?
4. Do you want remote, hybrid, onsite, or any mix?
5. What pay range should JobSentinel look for?
6. What work do you want more of?
7. What work should JobSentinel avoid?
8. Are there companies or industries you prefer?
9. Are there deal breakers, such as schedule, travel, or licensing?
10. Should JobSentinel show fresh and verified roles first?
11. Which application routes should JobSentinel prioritize?
12. Where should JobSentinel send alerts?

## Target question flow

The first version can map to existing settings. A later version should split
the flow into short screens:

1. **Starting point:** "What kind of work should JobSentinel look for first?"
   Offer broad career paths plus "My own search".
2. **Known job names:** "What job titles do you already search for?"
   Let users add titles or skip.
3. **Work wanted:** "What work should show up more often?"
   Accept skills, duties, tools, industries, and strengths.
4. **Resume help:** "Should JobSentinel use a resume to suggest work and skills
   for you to review?"
   Keep this optional, local by default, and review-first.
5. **Work to avoid:** "What work should JobSentinel rank lower?"
   Accept schedule, travel, job type, industry, company, and duty examples.
6. **Must-haves:** "What would make a job impossible for you?"
   Examples: location, schedule, license, commute, travel, pay, sponsorship.
7. **Pay:** "What pay would make a job worth considering?"
   Include "not sure", "show jobs with missing pay", and "warn me below this
   floor".
8. **Location and schedule:** "Where and when can you work?"
   Capture remote, hybrid, on-site, cities, commute, shifts, and travel.
9. **Adjacent roles:** "Should JobSentinel suggest nearby roles?"
   Choices: yes, maybe show separately, no.
10. **Review style:** "How many jobs do you want to review at once?"
   Use this to prevent overwhelming dashboards and alerts.
11. **Freshness:** "Should fresh or verified jobs show first?"
    Capture fresh-only, verified-first, or balanced behavior.
12. **Application route:** "Which routes feel worth your time?"
    Capture company sites, referrals, recruiters, hiring managers, staffing
    agencies, and broad job boards.
13. **Search support:** "Do you want weekly search summaries?"
    Offer pacing, quiet-period review, fresh-role review, and no-summary
    choices.
14. **Alerts:** "Where should JobSentinel tell you about roles that fit?"
    Keep all channels optional.

The review screen should summarize answers in plain language:

- "Look for..."
- "Show more..."
- "Rank lower..."
- "Do not hide unless..."
- "You can change this later."

## Answer handling

Each answer should map to existing settings where possible:

| Answer | JobSentinel setting |
| ------ | ------------------- |
| Target job titles | title allowlist |
| Work to avoid | title blocklist or excluded keywords |
| Skills and preferred work | boosted keywords |
| Optional resume-assisted skill review | reviewed boosted keywords and resume evidence |
| Deal breakers | excluded keywords |
| Remote, hybrid, onsite | location preferences |
| Cities or regions | location city list |
| Minimum pay | salary floor |
| Below-floor warning | pay protection |
| Fresh or verified first | freshness and source priority |
| Preferred application route | channel quality preference |
| Alerts | notification preferences |

Future settings likely need:

- Desired review volume.
- Strictness level for must-haves versus preferences.
- Adjacent-role openness.
- Pay-missing behavior.
- Salary floor warning behavior.
- Fresh-only or verified-first review mode.
- Preferred channel strategy.
- Weekly pacing summary cadence.
- Long-term unemployment support mode that changes pacing and summaries
  without exposing private status outside the app.
- Search check-in cadence.

## Defaults

Use defaults that avoid blocking progress:

- If the user is unsure about pay, use no pay filter.
- If the user is unsure about job titles, suggest broad titles from the chosen
  path and let them edit.
- If the user chooses their own search, start blank and make the next required
  step clear.
- If a resume is available, suggest skills from the resume but never claim the
  resume proves a skill without showing the user first.
- Default search strictness to balanced, not restrictive.
- Default missing-pay jobs to visible but clearly marked.
- Default adjacent roles to "show separately" when the user is unsure.
- Default ghost-risk behavior to visible but ranked lower with a plain
  verification warning.
- Default below-floor jobs to visible but clearly marked unless the user chooses
  to hide them.
- Default weekly summaries to off until the user chooses them.

## Copy rules

- Say "job titles", "skills", "work you want", and "work to avoid".
- Avoid "profile", "query", "allowlist", "blocklist", "weights", and "schema"
  in user-facing copy.
- Prefer "You can change this later" over long explanations.
- Never call the flow an interview.
- Never use pressure language.
- Avoid hollow encouragement. Use practical, protective copy that names the
  issue and the next safe action.
- Avoid "qualified" as a binary judgment. Prefer "strong fit", "missing from
  your current search", or "JobSentinel is not sure yet".
- Explain automation as estimates based on visible inputs, not objective truth.

## Privacy rules

- Do not send intake answers outside the app by default.
- Do not log raw answers.
- Debug reports must redact free-text answers unless the user explicitly
  includes them.
- Importing or using a resume must be optional.
- Resume-assisted intake must show extracted resume evidence before it affects
  search settings.
- Resume text, salary floors, private notes, and application history must not
  be sent to external AI or any external channel by default.

## Success checks

- A non-technical job seeker can finish setup without knowing exact search
  terms.
- A technical job seeker can still enter precise terms.
- The first screen makes it clear JobSentinel is for many kinds of jobs.
- The user can skip uncertain answers and still get useful first results.
- Tests cover the required custom-search path and at least one preset path.
- Screen-reader labels, keyboard flow, focus movement, and error text are
  verified for every new intake screen.
- Match explanations identify source inputs and do not present scores as facts.

## Change contract: review volume setup preference

Problem:
Job seekers have different bandwidth. Some need a small, protective list; some
want broad discovery. Setup should ask this in plain language before scanning
starts.

Scope:
Add a local setup preference for review volume. Map the choice to existing
source limits and alert strength so the first result set matches the user's
chosen bandwidth without adding a new data store or network path.

Out of scope:
Do not add new database fields, a recommendation model, external AI, or a
separate review-queue system in this slice.

Acceptance criteria:

- Setup offers three plain choices: smaller list, balanced list, and broad
  discovery.
- Default stays balanced and preserves existing result limits.
- The final review summarizes the selected review-list behavior before scanning
  starts.
- `complete_setup` receives source limits and alert setting matching the
  selected preference.
- Copy assumes no technical knowledge and supports technical and non-technical
  roles.
- Intake answers remain local and no new network call is introduced.

Progress:

- 2026-05-29: Implemented setup review-volume choices, review summary copy,
  config mapping to existing source limits and alert setting, Quick Start
  guidance, and focused setup tests.
- 2026-05-29: Implemented setup fresh-and-verified choices, review summary
  copy, config mapping to existing ghost-posting warning sensitivity, Settings
  parity, Quick Start guidance, and focused setup tests.

## Change contract: fresh and verified setup preference

Problem:
Job seekers need to protect time and morale by avoiding stale or hard-to-verify
postings early in setup, not only after they find the Settings page.

Scope:
Add a plain setup preference for how strongly JobSentinel should prioritize
fresh and verifiable postings. Persist the choice through existing ghost-job
configuration so first-run setup immediately affects stale/repost warning
sensitivity.

Out of scope:
Do not add new database fields, new external services, company-site closure
verification, source-ranking models, or application-route strategy in this
slice.

Acceptance criteria:

- Setup offers three plain choices: fresh and verified first, balanced, and
  widest search.
- Default protects time without hiding too much: stale or hard-to-verify
  postings remain visible but get earlier warnings.
- Final review summarizes the selected freshness behavior before scanning
  starts.
- `complete_setup` receives a `ghost_config` object matching the selected
  preference.
- Copy assumes no technical knowledge and avoids pressure language.
- Intake answers remain local and no new network call is introduced.

Audience and ease:

- Audience is any job seeker, including non-technical, non-software, unemployed,
  employed, hourly, salaried, and career-change users.
- Technical knowledge assumed: none.
- The user should choose from plain outcomes, not thresholds or scoring terms.

Source-of-truth docs:

- `docs/plans/active/guided-job-search-intake.md`
- `docs/plans/active/research-backed-product-improvements.md`
- `docs/user/QUICK_START.md`

Likely files:

- `src/pages/SetupWizard.tsx`
- `src/pages/SetupWizard.test.tsx`
- `docs/user/QUICK_START.md`

Risks:

- Existing ghost thresholds are imperfect proxies for "verified first"; this
  slice improves first-run risk sensitivity but does not prove employer intent.
- Stricter defaults can over-warn on legitimate jobs with weak public details.

Sensors:

- Focused setup tests for radio selection, review summary, and saved
  `ghost_config`.
- `npm run test:run -- src/pages/SetupWizard.test.tsx`
- `npm run lint:docs`
- `npm run lint:bloat`

Harness impact:

- No new harness script needed.
- This closes the active-plan requirement to write a feature-specific contract
  before code edits for the chosen implementation slice.

Rollback:
Remove the setup preference UI and omit `ghost_config` from setup config; Rust
will fall back to `GhostConfig::default()`.

User story:
As a job seeker with limited energy, I want JobSentinel to warn me sooner about
old or hard-to-verify postings so I can spend tailoring time on stronger
opportunities.

UX states:
The preference is local state only, has no loading or error state, supports
keyboard radio selection, works in narrow width, and is summarized before the
success action.

Support path:
Users can change ghost-job sensitivity later in Settings without editing files
or understanding thresholds.

Data model:
The UI maps one of three setup choices to the existing serialized
`ghost_config`. No migration is required.

## Current implementation

- Status as of 2026-06-02: the implemented setup slices remain active and
  accurate. The latest harness and broad-audience copy slices did not change
  guided-intake behavior.
- Setup asks for job titles, work the user wants, and work to avoid before
  scanning starts.
- Work to avoid maps to `keywords_exclude`, so matching jobs can rank lower
  without adding new backend fields.
- Setup asks for pay floor before scanning starts and keeps missing-pay jobs
  visible with review guidance.
- Setup asks how many jobs the user wants to review at once and maps that
  answer to existing local source limits and alert strength.
- Setup asks how strongly JobSentinel should prioritize fresh and verified
  postings, then maps that plain choice to existing `ghost_config` warning
  sensitivity.
- The field is optional and can be skipped.
- The final setup screen summarizes look-for titles, work to show more often,
  work to rank lower, location, review volume, freshness, and pay before
  scanning starts.
- Settings uses the same plain freshness choices so users can change warning
  behavior later without understanding scoring thresholds. Custom controls stay
  available under warning-focused labels.
