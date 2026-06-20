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

## 2026-06-19 UI And Semantic Refresh

Scope:

- UI verification used seeded mock data and public synthetic content only.
- Private corpus proof stayed aggregate-only; no private resume content,
  screenshots, traces, or parsed details were checked into the repo.

Verification:

| Check | Result |
| ----- | ------ |
| `cargo test --lib resume` | 427 passed, 1 local-path smoke test ignored |
| Focused resume/application frontend tests | 23 files, 345 passed |
| Resume upload, builder, and Application Assist Chromium E2E | 25 passed |
| App shell and keyboard Chromium E2E | 33 passed |
| `embedded-ml` semantic matching tests | 1 passed, 2 model-download tests ignored |
| `embedded-ml` eval fixture tests | 9 passed |
| `embedded-ml` contract tests | 6 passed |
| Desktop route sweep | Resumes, Resume Builder, Resume Match, and Application Assist loaded with no console/page errors and no overflow |
| Mobile route sweep | Same four routes loaded at 390 x 844 with no console/page errors and no overflow |
| Settings Local Match Check | Desktop and mobile Sources & Alerts panel showed the diagnostics section, status, Refresh, scoring signals, and quality checks with no console/page errors and no overflow |

Outcome:

- Backend private-corpus parsing, extraction, ATS/readability review,
  bullet-review, and export-template checks are complete locally.
- UI-level import, match review, tailoring guidance, builder/export,
  application-form assistance, cover-letter review, screening-answer review,
  and semantic diagnostics are covered by focused unit, E2E, and manual-style
  desktop/mobile passes.

Remaining v2.9.0 verification:

- Run final whole-UI proof after docs, screenshots, and any remaining UI
  changes land.
- Confirm packaged Tauri behavior separately from the local web mock pass.
- Record final UI evidence in
  [UI manual verification](ui-manual-verification-v2.9.0.md) without adding
  private resume content.
