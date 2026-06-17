---
name: job-posting-risk-review
description: Review job postings for stale, reposted, low-detail, scam-like, weak-source, unclear-location, hard-requirement, and missing-pay risks before tailoring. Use when deciding whether to apply, verify first, save, or skip a job post.
license: MIT
metadata:
  jobsentinel_version_target: "2.9.0"
---

# Job Posting Risk Review

Use this skill before spending serious time tailoring a resume or application.
The goal is to protect the user's time, not to claim employer intent.

## Inputs

Use the job post, saved job details, or user-provided page context. If the user
only has a link, ask for the visible posting text or details instead of logging
in, scraping restricted pages, or collecting session cookies.

## Workflow

1. Confirm basic facts: title, company, source, location, schedule, pay, posting
   date, closing date, and application route.
2. Check hard requirements: authorization, citizenship, location, travel,
   commute, schedule, screening, age, license, certification, degree, language,
   physical requirements, and years of experience.
3. Check posting-risk signals:
   - stale or missing posting date;
   - repeated or evergreen-looking role;
   - vague title or thin responsibilities;
   - weak or unclear source;
   - broken, redirected, or unsafe-looking link;
   - missing, very broad, top-only, or below-floor pay;
   - money requests, gift cards, fake checks, payment apps, crypto, messaging
     app interviews, or sensitive information requested too early.
4. Label evidence confidence:
   - high confidence: official employer or ATS page, written details, current
     date, and matching application route;
   - medium confidence: reputable board or recruiter context with enough role
     detail but open questions;
   - low confidence: scraped, reposted, anonymous, stale, thin, or unverifiable
     context.
5. Separate scam evidence, low confidence, and poor fit. A role can be
   legitimate but low fit, or low confidence without direct scam evidence.
6. Decide the next action: apply, verify first, save for later, ask a question,
   or skip.
7. Explain the decision using observed evidence and unknowns.

## Load References

- Load `references/posting-risk-scoring.md` when the role has multiple warnings,
  disputed source quality, compensation uncertainty, or hard-requirement risk.

## Output

Use plain labels:

- `Lower risk`: evidence does not show strong warning signs.
- `Needs light review`: open the original page before tailoring deeply.
- `Multiple warning signs`: verify the role before tailoring.
- `Verify before tailoring`: do not spend serious time until the role is
  confirmed.

Use `assets/posting-review-template.md` for a reusable review note.

## Handoff

- Use `$resume-tailoring` when the next action is apply or light tailoring.
- Use `$application-form-review` when the application form has hard screening
  questions or exact-answer risk.
- Use `$application-tracking` to record apply, verify-first, save, skip, risk
  level, and unknowns.
- Use `$networking-outreach` when source confidence depends on recruiter,
  referral, or insider clarification.

## Guardrails

- Do not state that a job is fake unless the evidence directly proves it.
- Do not treat missing pay as scam proof. Treat it as a pay-review cue.
- Do not bypass human checks, login gates, robots policies, or site controls.
- Do not infer protected-class information or give legal advice.
- Keep the review candidate-side: time protection, fit, source confidence, and
  next action.
