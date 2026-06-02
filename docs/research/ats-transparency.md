# ATS Transparency Research

This brief condenses research and policy notes about automated resume screening,
resume readability, and candidate-side explainability.

## Key signals

- Automated resume screeners can be brittle, opaque, and inconsistent.
- Hidden text, keyword stuffing, fabricated details, and prompt-like resume
  content create ethical, security, and trust risks.
- Machine readability still matters. Bad formatting, image-only resumes, unusual
  headings, and inaccessible exports can hide real experience.
- Current resume-formatting guidance favors simple reverse-chronological,
  single-column resumes with standard headings, contact details in the document
  body, selectable text, and clean PDF or DOCX files that follow employer
  instructions.
- Plain-text preview is a practical candidate-side check: contact information,
  headings, jobs, dates, bullets, and skills should remain readable in order.
- Candidate tools should explain what they can see and what remains uncertain.

## Product implications

- Show parsed resume fields before they affect scoring.
- Group job requirements as required, preferred, and nice-to-have.
- Suggest application-readability edits only when they map to user-confirmed
  facts.
- Warn about image-only resumes, hidden text, keyword stuffing, and prompt-like
  instructions.
- Warn when readable text lacks top contact details, lacks standard section
  headings, or appears table-like after extraction.
- Treat resume quality rubrics as transparent preparation aids, not universal
  employer algorithms.
- Avoid claiming a score predicts hiring success.
- Use the dedicated
  [resume formatting and application readability note](resume-formatting-ats-2026.md)
  as the detailed source for resume structure, requirement mapping, ethical
  confidence, knockout-question consistency, and profession-specific prompts.
- Use the dedicated [resume alignment scoring note](resume-alignment-scoring.md)
  as the detailed source for transparent component rubrics, match states,
  evidence strength, hard-constraint caps, section weighting, recency, and
  score humility.

## Open evaluation ideas

- Fixture-test resumes across common formats, tables, columns, and scan-only
  PDFs.
- Compare parser output against human-visible resume text.
- User-test whether explanations help non-technical job seekers make edits.
- Audit generated suggestions for unsupported claims.

## Local Source Notes

- `/Users/c/Downloads/updated_resume_formatting_ats_guidance_2026(2).md`
  was reviewed on 2026-06-02 for resume formatting, file type, plain-text
  testing, AI-screening hygiene, transparent resume-quality rubrics, and
  profession-specific resume guidance. Use synthetic fixtures when turning
  this guidance into tests.
- `/Users/c/Downloads/ats_scoring_algorithm.md` was reviewed on 2026-06-02
  for transparent alignment rubrics, hard-constraint caps, match-state
  explanations, evidence strength, seniority alignment, recency, section
  placement, and profession-specific weighting. Keep these as local diagnostic
  aids, not employer-decision claims.
