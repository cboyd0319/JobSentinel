# Resume Matcher

**Compare a resume with a job posting locally, then decide where careful
tailoring is worth the time.**

Resume matching helps job seekers see how their resume lines up with a role
without sending the resume to a cloud service by default. It is not a promise
that an employer will respond, and it is not a tool for deceptive resume tricks.
It is a local, advisory signal for readability, fit, and preparation.

![Resume Matcher Interface](../images/resume-matcher.png)

## Privacy Labels

| Workflow | Label | Default behavior |
| --- | --- | --- |
| Resume upload and parsing | Local only, Sensitive | Resume text and file details stay local. |
| Resume library | Local only, Sensitive | Resume versions stay in the local database. |
| Skill review and edits | Local only, Sensitive | User edits stay local. |
| Resume/job fit review | Local only, Sensitive | Resume data is compared with saved job data locally. |
| Job posting text | Public-data only | Job descriptions are public or user-saved posting content. |
| OCR for scanned PDFs | Local only, Sensitive | Optional local OCR uses system tools when enabled. |

External AI is not required for resume matching.

## What It Helps With

- **Resume readability**: Confirm the app can read the resume text.
- **Fit review**: Compare resume skills, experience, and education with a job
  posting.
- **Truthful tailoring**: See which real experience might be worth making more
  visible.
- **Gap awareness**: Notice missing or weakly represented requirements before
  spending time on a role.
- **Multiple resumes**: Keep different resume versions for different kinds of
  work.
- **Broad career coverage**: Recognize skills from technical and non-technical
  fields, including operations, healthcare, education, sales, marketing,
  customer support, finance, legal, creative, data, and security work.

## Everyday Workflow

1. Open **Resumes**.
2. Upload a PDF resume or import structured resume data.
3. Review detected skills and add anything important that was missed.
4. Open job details from the dashboard to see recent match results.
5. Use matched and missing skills as evidence for a decision:
   tailor carefully, save for later, ask a question, or skip.

JobSentinel should explain fit in plain language. A person should not need to
understand parsing, scoring, or ATS internals to use the result.

## How To Read Match Results

| Signal | Meaning | Use it for |
| --- | --- | --- |
| Overall match | Combined fit signal from skills, experience, and education. | Decide whether the role deserves more attention. |
| Skills match | Resume skills that appear relevant to the posting. | Find real strengths to make clearer. |
| Experience match | Years or level signals found in the posting and resume. | Notice under-leveling or stretch-role risk. |
| Education match | Degree or credential signals found in the posting and resume. | Spot requirements that may need explanation. |
| Missing skills | Posting requirements not clearly represented in the resume. | Decide whether to revise, ask, learn, or skip. |

Low match does not mean "do not apply." It means "review fit before spending
extra time." Strong match does not guarantee a response. It means the resume and
posting share stronger visible evidence.

## Responsible Use

Resume matching must stay candidate-side and honest:

- Do not fabricate qualifications.
- Do not hide keywords.
- Do not stuff resumes with unrelated terms.
- Do not prompt-inject resumes.
- Do not present the match score as an employer decision.
- Do not encourage users to apply to roles that violate their salary floor,
  location constraints, schedule needs, or other must-haves.

The right goal is application readability and truthful fit, not ATS
manipulation.

## Local Matching Model

The current local matcher:

- extracts readable text from PDF resumes;
- identifies skills across broad career categories;
- compares resume evidence with saved job-posting text;
- returns match, experience, education, matched-skill, and missing-skill
  signals;
- stores results locally so recent job comparisons can be reviewed later.

The skill list is self-contained and deterministic. Same input should produce
the same local result. Optional OCR is available for scanned PDFs when the app
is built with OCR support and local OCR tools are installed.

## Boundaries

- Resume data stays local by default.
- External AI is not required.
- Any future external AI resume review must go through the AI gateway, require
  explicit opt-in, show the exact payload, support redaction or cancellation,
  and log high-level request metadata locally.
- Resume matching should use public job-posting text plus the selected resume,
  not unrelated notes, salary floors, or application history.
- Research and evaluation should use synthetic resumes unless a real user gives
  explicit informed consent.

## Developer Notes

<details>
<summary>Implementation references</summary>

Primary surfaces:

- UI: `src/pages/Resume.tsx`
- Match details: `src/components/ResumeMatchScoreBreakdown.tsx`
- Backend core: `src-tauri/src/core/resume/`
- Tauri commands: `src-tauri/src/commands/resume.rs`

Renderer-facing resume summaries must stay limited to non-secret metadata:

```rust
pub struct ResumeSummary {
    pub id: i64,
    pub name: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

Focused checks:

```bash
npm run test:run -- src/pages/Resume.test.tsx
npm run test:run -- src/components/ResumeMatchScoreBreakdown.test.tsx
cd src-tauri && cargo test --lib resume
npm run lint:docs
```

Implementation rule:

- Keep renderer-facing resume summaries free of raw local file paths and full
  parsed resume text.
- Keep visible copy advisory and protective.
- Keep stored backend field names separate from user-facing explanations.
- Do not add external AI or external upload behavior without the documented AI
  gateway and explicit user approval.

</details>
