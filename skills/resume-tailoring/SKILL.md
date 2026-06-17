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
3. Validate extracted skills and keywords before comparing or tailoring:
   - remove job titles, company names, product slogans, and section labels that
     are not candidate skills;
   - separate exact matches, adjacent or semantic matches, technology-family
     matches, unsupported terms, and false positives;
   - check date math and overlapping roles before assigning years of
     experience;
   - keep academic, course, volunteer, project, and professional exposure
     separate unless the user confirms how to present it.
4. Fail fast on hard requirements that the user cannot truthfully meet. Treat
   the role as skip, verify, or ask-first before drafting unsupported edits.
5. Map each important requirement to real candidate evidence:
   - strong visible evidence;
   - partial or older evidence;
   - unsupported or unknown;
   - not true for the candidate.
6. Draft edits only where the user has truthful evidence.
7. Cap keyword edits to supported evidence. Do not add more role language than
   the resume can defend in an interview or application form.
8. Apply an ATS and readability checklist: clear headings, normal text, simple
   bullets, consistent dates, readable file text, and no hidden content.
9. Improve bullets with action, scope, result, and context. Use numbers only
   when the user provides or approves them.
10. Use a capability ladder before strengthening wording: exposure, assisted
    work, hands-on use, independent delivery, ownership, or expert/strategic
    work. Do not upgrade a claim above the evidence.
11. Keep unsupported requirements as questions, gaps, or skip reasons.
12. Create a change log: what changed, why it changed, and which resume,
    job-post, or user-provided source supports it.

## Load References

- Load `references/evidence-mapping.md` for detailed requirement mapping,
  ATS/readability checks, keyword caps, and hard-requirement decisions.

## Output

Produce:

- Fit summary.
- Must-have review.
- Validated requirement and skill map.
- False-positive removals.
- Evidence map.
- Suggested resume edits.
- Bullet rewrites with before/after wording.
- Change log with evidence source for each material edit.
- Questions to ask the user.
- Do-not-add list for unsupported terms.

Use `assets/resume-tailoring-notes.md` when the user wants a reusable worksheet.

## Handoff

- Use `$application-form-review` after tailoring when form answers must match
  the resume and exact job questions.
- Use `$application-tracking` to record the resume version, evidence gaps, and
  submitted claims.
- Use `$interview-prep` when a tailored claim needs a defensible story before an
  interview.
- Return to `$job-posting-risk-review` when a hard requirement, source issue, or
  pay concern appears during tailoring.

## Guardrails

- Do not fabricate skills, credentials, dates, employers, metrics, clearances,
  citizenship, authorization, licenses, degrees, or tools.
- Do not hide keywords or write prompt-injection content.
- Do not present the review as an employer decision or response prediction.
- Do not force every job-post word into the resume.
- Do not present a local fit score, ATS check, or parser result as a universal
  employer-system prediction.
- Prioritize required evidence before nice-to-have language.
