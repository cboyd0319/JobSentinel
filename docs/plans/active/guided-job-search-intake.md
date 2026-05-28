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
- Let users edit the result before scanning starts.
- Let users change answers later in Settings.

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
| The Potential of Recommender Systems for Directing Job Search | Recommendations can work, but only if users act on them. | Pair match scores with plain "why this job" and "what to do next" guidance. |
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
10. Where should JobSentinel send alerts?

## Target question flow

The first version can map to existing settings. A later version should split
the flow into short screens:

1. **Starting point:** "What kind of work should JobSentinel look for first?"
   Offer broad career paths plus "My own search".
2. **Known job names:** "What job titles do you already search for?"
   Let users add titles or skip.
3. **Work wanted:** "What work should show up more often?"
   Accept skills, duties, tools, industries, and strengths.
4. **Work to avoid:** "What work should JobSentinel rank lower?"
   Accept schedule, travel, job type, industry, company, and duty examples.
5. **Must-haves:** "What would make a job impossible for you?"
   Examples: location, schedule, license, commute, travel, pay, sponsorship.
6. **Pay:** "What pay would make a job worth considering?"
   Include "not sure" and "show jobs with missing pay".
7. **Location and schedule:** "Where and when can you work?"
   Capture remote, hybrid, on-site, cities, commute, shifts, and travel.
8. **Adjacent roles:** "Should JobSentinel suggest nearby roles?"
   Choices: yes, maybe show separately, no.
9. **Review style:** "How many jobs do you want to review at once?"
   Use this to prevent overwhelming dashboards and alerts.
10. **Alerts:** "Where should JobSentinel tell you about strong matches?"
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
| Deal breakers | excluded keywords |
| Remote, hybrid, onsite | location preferences |
| Cities or regions | location city list |
| Minimum pay | salary floor |
| Alerts | notification preferences |

Future settings likely need:

- Desired review volume.
- Strictness level for must-haves versus preferences.
- Adjacent-role openness.
- Pay-missing behavior.
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

## Copy rules

- Say "job titles", "skills", "work you want", and "work to avoid".
- Avoid "profile", "query", "allowlist", "blocklist", "weights", and "schema"
  in user-facing copy.
- Prefer "You can change this later" over long explanations.
- Never call the flow an interview.
- Never use pressure language.
- Avoid "qualified" as a binary judgment. Prefer "strong match", "missing from
  your current search", or "JobSentinel is not sure yet".
- Explain automation as estimates based on visible inputs, not objective truth.

## Privacy rules

- Do not send intake answers outside the app by default.
- Do not log raw answers.
- Debug reports must redact free-text answers unless the user explicitly
  includes them.
- Importing or using a resume must be optional.

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

## Current implementation

- Setup asks for job titles, work the user wants, and work to avoid before
  scanning starts.
- Work to avoid maps to `keywords_exclude`, so matching jobs can rank lower
  without adding new backend fields.
- The field is optional and can be skipped.
- The final setup screen summarizes look-for titles, work to show more often,
  work to rank lower, location, and pay before scanning starts.
