# Resume Match

**Compare a resume with a job posting locally, then decide where careful
tailoring is worth the time.**

Resume matching helps job seekers see how their resume lines up with a role
without sending the resume to a cloud service by default. It is not a promise
that an employer will respond, and it is not a tool for deceptive resume tricks.
It is a local, advisory signal for readability, fit, and preparation.

![Resume Match interface](../images/resume-matcher.png)

## Privacy Labels

| Workflow | Label | Default behavior |
| --- | --- | --- |
| Resume add and parsing | Local only, Sensitive | Resume text and file details stay local. |
| Resume library | Local only, Sensitive | Resume versions stay on this device. |
| Skill review and edits | Local only, Sensitive | User edits stay local. |
| Resume/job fit review | Local only, Sensitive | Resume data is compared with saved job data locally. |
| Job posting text | Public-data only | Job descriptions are public or user-saved posting content. |
| Scanned resume PDFs | Local only, Sensitive | If enabled, JobSentinel tries to read scanned resume text on this device. |

External AI is not required for resume matching.

## What It Helps With

- **Resume readability**: Confirm the app can read the resume text.
- **Fit review**: Compare resume skills, experience, and education with a job
  posting.
- **Truthful tailoring**: See which real experience might be worth making more
  visible.
- **Gap awareness**: Notice missing or weakly represented requirements before
  spending time on a role.
- **Resume safety review**: Flag prompt-injection-like instructions, hidden
  text, and invisible characters with a plain **Safety check** label before
  the resume is used.
- **Multiple resumes**: Keep different resume versions for different kinds of
  work.
- **Broad career coverage**: Recognize skills from technical and non-technical
  fields, including operations, healthcare, education, sales, marketing,
  customer support, finance, legal, creative, data, and security work.

## Everyday Workflow

1. Open **Resumes**.
2. Choose a saved resume or add a PDF resume.
3. Use **Import from resume app** only if another resume app gave you export
   text.
4. Review suggested skills and add anything important that was missed.
5. Open job details from the dashboard to see recent resume fit reviews.
6. Use skills found in both places and skills to review as evidence for a
   decision:
   tailor carefully, save for later, ask a question, or skip.

JobSentinel should explain fit in plain language. A person should not need to
understand parsing, scoring, or employer screening systems to use the result.

## How To Read Fit Results

| Signal | Meaning | Use it for |
| --- | --- | --- |
| Overall fit | Combined fit signal from skills, experience, and education. | Decide whether the role deserves more attention. |
| Skills fit | Resume skills that appear relevant to the posting. | Find real strengths to make clearer. |
| Experience fit | Years or level signals found in the posting and resume. | Notice lower-title, lower-pay, or stretch-role risk. |
| Education fit | Degree or credential signals found in the posting and resume. | Spot requirements that may need explanation. |
| Skills to review | Posting requirements not clearly represented in the resume. | Decide whether to revise, ask, learn, or skip. |
| Required or preferred wording to review | Missing job-post language grouped by importance. | Start with required evidence before reviewing nice-to-have wording. |

Low fit does not mean "do not apply." It means "review fit before spending
extra time." Strong fit does not guarantee a response. It means the resume and
posting share stronger visible evidence.

## Responsible Use

Resume matching must stay candidate-side and honest:

- Do not fabricate qualifications.
- Do not hide keywords.
- Do not stuff resumes with unrelated terms.
- Do not prompt-inject resumes.
- Do not present the fit estimate as an employer decision.
- Do not encourage users to apply to roles that violate their salary floor,
  location constraints, schedule needs, or other must-haves.

The right goal is application readability and truthful fit, not manipulating
employer screening systems.

## Local Matching Model

The current local matcher:

- extracts readable text from PDF resumes;
- identifies skills across broad career categories;
- compares resume evidence with saved job-posting text;
- returns fit, experience, education, matched-skill, and missing-skill
  signals;
- preserves whether missing job-post language came from required, preferred,
  or other role-language context;
- passes that context to the live Resume Builder review panel when available;
- keeps required and preferred job-post headings separate even when the posting
  uses ordinary single-line section breaks;
- stores results locally so recent job comparisons can be reviewed later.

The skill list is self-contained and deterministic. Same input should produce
the same local result. Optional OCR is available for scanned PDFs when the app
is built with OCR support and local OCR tools are installed.

## Boundaries

- Resume data stays local by default.
- External AI is not required.
- Any future external AI resume review must go through the AI gateway, require
  explicit opt-in, show the exact request contents, support redaction or
  cancellation, and log high-level request details locally.
- Resume matching should use public job-posting text plus the selected resume,
  not unrelated notes, salary floors, or application history.
- Research and evaluation should use synthetic resumes unless a real user gives
  explicit informed consent.
