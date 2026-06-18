# Import and Export Resume App Data

JobSentinel can import a resume app export saved in a supported format and turn
it into an editable local resume draft. Resume Builder can also export a local
draft as a portable resume app file for use in other tools.

Privacy label: **Local only** and **Sensitive**. Resume content stays on the
user's device. Importing a resume must not send the file, parsed text, contact
details, salary expectations, notes, or application history to any external
service.

## What users can do

- Import a resume app export from the Resume page.
- Review the imported contact, work, education, skills, language, project,
  publication, award, and certification details before using them.
- Preserve imported project and credential evidence in Resume Builder preview,
  PDF print, Word export, portable app export, and local resume/job fit review.
- Export Resume Builder contact, work, education, certifications, skills, and
  projects as a local portable resume app file.
- Edit or remove imported items in Resume Builder.
- Run local resume/job fit review after import.
- Delete the imported draft later from local resume management.

This feature is for job seekers in any field. Examples and tests should include
office, healthcare, education, service, trades, operations, creative, public
sector, technical, and non-technical resumes.

## Import Behavior

JobSentinel can bring in common resume sections such as:

- Contact name, email, phone, website, location, and public profile links.
- Summary text.
- Work, volunteer, education, project, award, certification, and publication
  details.
- Skill groups, listed skills, and languages.
- Project descriptions, highlights, keywords, and links.

Unsupported sections, such as interests and references, are ignored instead of
blocking import. The user can add those details manually after import.

## Safe defaults

- Missing sections are allowed.
- Empty strings are allowed.
- Dates are imported as written when they cannot be parsed.
- Empty end dates are treated as current roles.
- Skill groups import both the group name and listed keywords so the user can
  decide what to keep.
- Imported credential and project details stay structured so export and local
  review do not silently drop them.
- Imported resume content is saved as a local draft.

## User-facing failure states

| Problem | User-facing action |
| ------- | ------------------ |
| Resume export cannot be read | Explain that the file could not be read and let the user choose another file. |
| Some resume export sections are not supported | Import supported fields and tell the user to review the draft. |
| Imported details look wrong | Let the user edit or delete the draft locally. |
| Import fails unexpectedly | Offer a safe support report that redacts resume content by default. |

Do not show Rust errors, database terms, stack traces, local file paths, or raw
resume text in user-facing error copy.

## Privacy Requirements

- Do not log resume names, raw export strings, parsed resume text, raw local
  paths, or imported contact details.
- Command logs may record non-identifying counts such as resume-name length,
  export character length, and sanitized path labels.
- App screens must not expose local file paths or full parsed resume text.
- Safe support reports must redact resume content unless the user explicitly
  includes it.

## Validation Requirements

- Keep import tolerant of incomplete resume app export files.
- Keep unsupported fields non-fatal.
- Keep unreadable export errors clear and non-technical.
- Keep tests broad enough to cover non-software resumes.
