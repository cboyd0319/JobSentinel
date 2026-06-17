---
name: application-form-review
description: Prepare and review job application form answers before the user submits manually. Use for screening questions, saved answers, work authorization, salary, schedule, location, travel, certifications, background checks, and application-form consistency with the resume.
license: MIT
metadata:
  jobsentinel_version_target: "2.9.0"
---

# Application Form Review

Use this skill to help the user prepare application-form answers without taking
submission control away from them.

## Inputs

Use the exact application question text, resume version, job post, saved
profile details, user-confirmed records, and any application-form context the
user provides. Ask before using sensitive answers such as birth date, identity
numbers, demographic choices, disability, veteran status, authorization
documents, background-check details, salary history, or references.

## Workflow

1. Identify repeated fields: contact details, links, authorization, location,
   salary, start date, availability, travel, relocation, education, licenses,
   certifications, and work history.
2. Identify hard screening questions:
   - citizenship or work authorization;
   - sponsorship;
   - reliable transportation, driver's license, vehicle, or insurance;
   - schedule, overtime, holidays, overnight work, or shift requirements;
   - background check, drug screen, age, language fluency, physical demands,
     clearance, degree, certification, or years of experience.
3. Compare answers with the resume and user-provided records.
4. Draft answer wording only when the answer is true and matches the exact
   question.
5. Preserve exact-question provenance: keep the application question, proposed
   answer, evidence source, and user-confirmation state together.
6. Flag protected, voluntary, demographic, disability, veteran, background, and
   salary-history questions as user-choice items. Explain what is being asked;
   do not choose for the user.
7. Flag questions that need user review before continuing.
8. End with a submission checklist. The user submits manually.
9. Require explicit user approval before connecting accounts, uploading files,
   using automation to fill fields, saving credentials, or saving cookies.

## Output

Produce:

- Prepared answers.
- Hard-question review list.
- Resume consistency checks.
- Blank fields that require user input.
- Submission checklist.

Use `assets/form-review-checklist.md` for a reusable checklist.

## Handoff

- Use `$application-tracking` after the user submits, saves, withdraws, or skips
  the application.
- Use `$resume-tailoring` when the form exposes a resume mismatch that should be
  corrected before submission.
- Use `$offer-pay-review` when pay, relocation, deadline, or benefits questions
  need a decision before answering.

## Guardrails

- Never submit an application for the user.
- Never answer a hard screening question from assumptions.
- Never invent authorization, citizenship, transportation, degree, license,
  certification, clearance, language fluency, or years of experience.
- Do not store or reuse sensitive answers outside the user's chosen local
  tracker.
- Do not automate restricted application portals or bypass human checks.
- Do not connect accounts, save credentials, save cookies, or upload resumes
  without explicit approval for that exact action.
