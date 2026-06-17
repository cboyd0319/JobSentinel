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
5. Flag questions that need user review before continuing.
6. End with a submission checklist. The user submits manually.

## Output

Produce:

- Prepared answers.
- Hard-question review list.
- Resume consistency checks.
- Blank fields that require user input.
- Submission checklist.

Use `assets/form-review-checklist.md` for a reusable checklist.

## Guardrails

- Never submit an application for the user.
- Never answer a hard screening question from assumptions.
- Never invent authorization, citizenship, transportation, degree, license,
  certification, clearance, language fluency, or years of experience.
- Do not store or reuse sensitive answers outside the user's chosen local
  tracker.
- Do not automate restricted application portals or bypass human checks.
