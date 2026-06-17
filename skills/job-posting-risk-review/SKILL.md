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

## Review Steps

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
4. Decide the next action: apply, verify first, save for later, ask a question,
   or skip.
5. Explain the decision using observed evidence and unknowns.

## Output

Use plain labels:

- `Lower risk`: evidence does not show strong warning signs.
- `Needs light review`: open the original page before tailoring deeply.
- `Multiple warning signs`: verify the role before tailoring.
- `Verify before tailoring`: do not spend serious time until the role is
  confirmed.

Use `assets/posting-review-template.md` for a reusable review note.

## Guardrails

- Do not state that a job is fake unless the evidence directly proves it.
- Do not treat missing pay as scam proof. Treat it as a pay-review cue.
- Do not bypass human checks, login gates, robots policies, or site controls.
- Do not infer protected-class information or give legal advice.
- Keep the review candidate-side: time protection, fit, source confidence, and
  next action.
