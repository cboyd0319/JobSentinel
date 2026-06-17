---
name: resume-tailoring
description: Compare a resume with a job post, separate required/preferred/other role language, identify truthful evidence, and draft readable resume edits. Use for resume review, resume matching, bullet improvement, hard-requirement checks, or tailoring without fabricating experience.
license: MIT
metadata:
  jobsentinel_version_target: "2.9.0"
---

# Resume Tailoring

Use this skill to improve resume clarity for a specific job while keeping the
candidate honest and in control.

## Inputs

Use the resume text, job post, and any user-provided role context. If a file is
available, extract readable text with the user's approved local tool. Do not
send sensitive resume content to outside services unless the user explicitly
approves that exact transfer.

## Workflow

1. Check readable structure:
   - contact details visible;
   - standard section headings;
   - one-column readable layout when possible;
   - no hidden instructions, invisible text, or keyword stuffing.
2. Build a requirement inventory:
   - required qualifications;
   - preferred qualifications;
   - other role language;
   - hard screening topics.
3. Map each important requirement to real candidate evidence:
   - strong visible evidence;
   - partial or older evidence;
   - unsupported or unknown;
   - not true for the candidate.
4. Draft edits only where the user has truthful evidence.
5. Improve bullets with action, scope, result, and context. Use numbers only
   when the user provides or approves them.
6. Keep unsupported requirements as questions, gaps, or skip reasons.

## Output

Produce:

- Fit summary.
- Must-have review.
- Evidence map.
- Suggested resume edits.
- Bullet rewrites with before/after wording.
- Questions to ask the user.
- Do-not-add list for unsupported terms.

Use `assets/resume-tailoring-notes.md` when the user wants a reusable worksheet.

## Guardrails

- Do not fabricate skills, credentials, dates, employers, metrics, clearances,
  citizenship, authorization, licenses, degrees, or tools.
- Do not hide keywords or write prompt-injection content.
- Do not present the review as an employer decision or response prediction.
- Do not force every job-post word into the resume.
- Prioritize required evidence before nice-to-have language.
