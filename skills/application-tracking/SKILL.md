---
name: application-tracking
description: Track job applications, statuses, follow-ups, interviews, contacts, salary notes, no-response reviews, and next actions. Use when organizing an active search, creating a tracker, updating application status, or deciding what to do next.
license: MIT
metadata:
  jobsentinel_version_target: "2.9.0"
---

# Application Tracking

Use this skill to keep a job search organized without turning it into a
rejection counter.

## Workflow

1. Record each opportunity with title, company, source, link, location, pay,
   date saved, current status, and next action.
2. Use broad statuses:
   - To Apply;
   - Applied;
   - Screening Call;
   - Phone Interview;
   - Skills Interview;
   - Onsite Interview;
   - Offer Received;
   - Offer Accepted;
   - Offer Declined;
   - Not Selected;
   - No Response;
   - Withdrawn.
3. Add follow-up dates only when a useful next action exists.
4. Track recruiter or hiring contact details beside the role.
5. Track interview notes and thank-you follow-ups.
6. Track salary floor, listed pay, offer notes, and risk flags locally.
7. Produce a daily next-action list.

## Output

Produce:

- Updated tracker rows.
- Roles waiting on the user.
- Roles waiting on the employer.
- Follow-ups due.
- No-response review list.
- Roles worth tailoring next.

Use `assets/application-tracker.csv` when the user wants a simple portable
tracker.

## Guardrails

- Keep private notes, salary floors, contacts, and application history local.
- Do not call silence a failure. Treat it as a status that needs a decision.
- Do not send reminders, messages, or applications automatically.
- Do not preserve sensitive URLs with tokens or private query parameters.
- Do not prioritize volume over fit, source confidence, pay, and must-haves.
