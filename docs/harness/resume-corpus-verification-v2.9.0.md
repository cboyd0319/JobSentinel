# Resume Corpus Verification v2.9.0

Updated: 2026-06-19.

This record tracks privacy-safe local verification against a private resume
corpus. Do not add names, local absolute paths, parsed resume text, skill names,
profile details, or screenshots from private resumes to this file.

## 2026-06-19 Aggregate Probe

Scope:

- Private local corpus only; source files were not copied into the repository.
- 12 files total.
- Formats: 3 DOCX, 7 Markdown, 2 PDF.
- Probe ran from a temporary directory outside the repository as a path
  dependency on `src-tauri`.
- Output was aggregate-only.

Surfaces exercised:

- `ResumeParser::parse_resume` across DOCX, Markdown, and PDF files.
- `SkillExtractor::extract_skills` on parsed text.
- `AtsAnalyzer::analyze_text_for_job` against three broad job descriptions:
  security, content/customer education, and operations/customer service.
- `AtsAnalyzer::improve_bullet` on one local line per parsed document without
  printing the input or output.
- `ResumeExporter::export_html`, `export_docx`, and `export_text` with
  privacy-safe synthetic data across all export templates.

Result:

| Check | Result |
| ----- | ------ |
| Files scanned | 12 |
| Parsed successfully | 12 |
| Parse failures | 0 |
| Total readable characters | 89,489 |
| Readable character range | 3,368 to 12,047 |
| Total extracted skill hits | 304 |
| Skill hit range | 11 to 37 |
| ATS/readability runs | 36 |
| Keyword matches counted | 52 |
| Missing keyword records counted | 104 |
| Format issues counted | 78 |
| Suggestions counted | 167 |
| Bullet-improvement checks | 12 |
| Export template checks | 7 |
| Private output policy | Aggregate-only |

Interpretation:

- Local parser coverage succeeded for all current private corpus formats.
- ATS/readability and bullet-review code accepted every parsed resume without
  crashing or exposing private content.
- Export checks passed with synthetic data; private corpus content was not used
  for generated export artifacts.

Remaining v2.9.0 resume verification:

- Manually exercise the UI flows for import, match review, tailoring guidance,
  builder/export, application-form assistance, cover-letter review, and
  screening-answer review.
- Confirm web and Tauri behavior for keyboard, loading, error, empty, and
  narrow-width states.
- Record final UI evidence in
  [UI manual verification](ui-manual-verification-v2.9.0.md) without adding
  private resume content.
