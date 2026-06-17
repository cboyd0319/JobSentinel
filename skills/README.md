# JobSentinel Agent Skills

This directory contains downloadable Agent Skills for job-search and resume
workflows. Each subdirectory is a standalone skill package that follows the
Agent Skills specification: the directory name matches the `name` field in
`SKILL.md`, metadata uses YAML frontmatter, and reusable templates live in
`assets/`.

Use these skills with an Agent Skills-compatible assistant when you want
structured help with a job search while preserving JobSentinel's core rules:

- Keep job-search data local unless the user explicitly chooses to share it.
- Review every application, resume edit, screening answer, and offer note
  before using it.
- Do not fabricate qualifications, credentials, offers, referrals, or work
  history.
- Do not automate account access, session cookies, or restricted job-site
  behavior.
- Treat LinkedIn as a user-opened source or user-provided posting context, not
  as a background automation target.

## Included Skills

| Skill | Use it for |
| ----- | ---------- |
| `job-search-plan` | Build a focused weekly job-search plan, target list, source mix, and daily loop. |
| `job-posting-risk-review` | Review stale, thin, repeated, risky, scam-like, missing-pay, or weak-source postings before tailoring. |
| `resume-tailoring` | Compare a resume with a job post and draft truthful, readable resume edits. |
| `application-form-review` | Prepare safe answers and review repeated application-form fields before the user submits manually. |
| `application-tracking` | Maintain application status, follow-ups, notes, contacts, and next actions. |
| `interview-prep` | Build interview briefs, evidence stories, questions, and follow-up notes. |
| `offer-pay-review` | Compare written offers, listed pay, salary floors, benefits, schedule, scope, and negotiation notes. |

Validate packages with:

```bash
npm run lint:skills
```
