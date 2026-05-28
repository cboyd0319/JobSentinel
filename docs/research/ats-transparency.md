# ATS Transparency Research

This brief condenses research and policy notes about automated resume screening,
resume readability, and candidate-side explainability.

## Key signals

- Automated resume screeners can be brittle, opaque, and inconsistent.
- Hidden text, keyword stuffing, fabricated details, and prompt-like resume
  content create ethical, security, and trust risks.
- Machine readability still matters. Bad formatting, image-only resumes, unusual
  headings, and inaccessible exports can hide real experience.
- Candidate tools should explain what they can see and what remains uncertain.

## Product implications

- Show parsed resume fields before they affect scoring.
- Group job requirements as required, preferred, and nice-to-have.
- Suggest application-readability edits only when they map to user-confirmed
  facts.
- Warn about image-only resumes, hidden text, keyword stuffing, and prompt-like
  instructions.
- Avoid claiming a score predicts hiring success.

## Open evaluation ideas

- Fixture-test resumes across common formats, tables, columns, and scan-only
  PDFs.
- Compare parser output against human-visible resume text.
- User-test whether explanations help non-technical job seekers make edits.
- Audit generated suggestions for unsupported claims.
