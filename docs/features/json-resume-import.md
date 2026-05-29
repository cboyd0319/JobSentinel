# JSON Resume Import

JobSentinel can import a resume saved in the
[JSON Resume](https://jsonresume.org/) format and turn it into an editable
local resume draft.

Privacy label: **Local only** and **Sensitive**. Resume content stays on the
user's device. Importing a resume must not send the file, parsed text, contact
details, salary expectations, notes, or application history to any external
service.

## What users can do

- Import a JSON Resume file from the Resume page.
- Review the imported contact, work, education, skills, project, award, and
  certification details before using them.
- Edit or remove imported items in Resume Builder.
- Run local resume/job fit review after import.
- Delete the imported draft later from local resume management.

This feature is for job seekers in any field. Examples and tests should include
office, healthcare, education, service, trades, operations, creative, public
sector, technical, and non-technical resumes.

## Import behavior

| JSON Resume content | JobSentinel draft field |
| ------------------- | ----------------------- |
| `basics.name` | Contact name |
| `basics.email` | Contact email |
| `basics.phone` | Contact phone |
| `basics.url` | Website |
| `basics.summary` | Summary |
| `basics.location` | Location |
| `basics.profiles` | Public profile links |
| `work[]` | Work experience |
| `volunteer[]` | Volunteer experience |
| `education[]` | Education |
| `skills[]` | Skills |
| `certificates[]` | Certifications |
| `awards[]` | Awards or certifications |
| `projects[]` | Project experience |

Unsupported sections are ignored instead of blocking import. The user can add
those details manually after import.

## Safe defaults

- Missing sections are allowed.
- Empty strings are allowed.
- Dates are imported as written when they cannot be parsed.
- Empty end dates are treated as current roles.
- Skill groups import both the group name and listed keywords so the user can
  decide what to keep.
- Imported resume content is saved as a local draft.

## User-facing failure states

| Problem | User-facing action |
| ------- | ------------------ |
| File is not valid JSON | Explain that the file could not be read and let the user choose another file. |
| File uses unsupported JSON Resume fields | Import supported fields and tell the user to review the draft. |
| Imported details look wrong | Let the user edit or delete the draft locally. |
| Import fails unexpectedly | Offer a safe debug report that redacts resume content by default. |

Do not show Rust errors, database terms, stack traces, local file paths, or raw
resume text in user-facing error copy.

## Developer contract

The import command is `import_json_resume`.

Implementation paths:

- `src/pages/Resume.tsx`
- `src-tauri/src/commands/resume.rs`
- `src-tauri/src/core/resume/json_resume.rs`
- `src-tauri/src/core/resume/mod.rs`
- `examples/sample-json-resume.json`

Privacy requirements:

- Do not log resume names, raw JSON strings, parsed resume text, local paths, or
  imported contact details.
- Command logs may record non-identifying counts such as resume-name length and
  JSON character length.
- Renderer DTOs must not expose local file paths or full parsed resume text.
- Safe debug reports must redact resume content unless the user explicitly
  includes it.

Validation requirements:

- Keep import tolerant of partial JSON Resume files.
- Keep unsupported fields non-fatal.
- Keep malformed JSON errors clear and non-technical.
- Keep tests broad enough to cover non-software resumes.

## Verification

Run the focused Rust tests after importer changes:

```bash
cd src-tauri
cargo test core::resume::json_resume
```

Run these broader checks when user-facing copy, privacy behavior, or command
shape changes:

```bash
npm run lint:bloat
npm run lint:docs
cd src-tauri && cargo test --lib
```

## References

- [JSON Resume schema](https://jsonresume.org/schema/)
- [JSON Resume getting started](https://jsonresume.org/getting-started/)
- [JSON Resume registry](https://registry.jsonresume.org/)
