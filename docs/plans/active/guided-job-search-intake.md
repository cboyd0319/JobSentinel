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

## Defaults

Use defaults that avoid blocking progress:

- If the user is unsure about pay, use no pay filter.
- If the user is unsure about job titles, suggest broad titles from the chosen
  path and let them edit.
- If the user chooses their own search, start blank and make the next required
  step clear.
- If a resume is available, suggest skills from the resume but never claim the
  resume proves a skill without showing the user first.

## Copy rules

- Say "job titles", "skills", "work you want", and "work to avoid".
- Avoid "profile", "query", "allowlist", "blocklist", "weights", and "schema"
  in user-facing copy.
- Prefer "You can change this later" over long explanations.
- Never call the flow an interview.
- Never use pressure language.

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

## Current implementation

- Setup asks for job titles, work the user wants, and work to avoid before
  scanning starts.
- Work to avoid maps to `keywords_exclude`, so matching jobs can rank lower
  without adding new backend fields.
- The field is optional and can be skipped.
