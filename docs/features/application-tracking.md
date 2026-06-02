# Application Tracking

**Keep each opportunity, follow-up, note, interview, and offer in one local
place.**

JobSentinel's application board is for anyone managing a job search, not only
engineers. It helps job seekers see what is active, what needs follow-up, what
has gone quiet, and which roles are worth more attention without turning the
search into a rejection counter.

Application history is sensitive. It can reveal employment status, job-search
urgency, salary expectations, location constraints, recruiter contacts, and
private notes. JobSentinel keeps this workflow local by default.

![Application Tracking - Kanban Board](../images/application-tracking.png)

## Privacy Labels

| Workflow | Label | Default behavior |
| --- | --- | --- |
| Application board | Local only, Sensitive | Records stay on this device. |
| Notes and contacts | Local only, Sensitive | Private notes and recruiter details stay local. |
| Follow-up reminders | Local only | Reminders are generated locally. |
| Interview tracking | Local only, Sensitive | Interview details stay local unless the user exports them. |
| Offer and pay notes | Local only, Sensitive | Salary floors and offer notes stay local. |
| External notifications | Sensitive | Slack, Discord, Teams, email alerts, or other channels are used only if the user turns them on. |

External AI is not required for application tracking.

## What It Helps With

- **Status clarity**: See applications by status so the next action is clear.
- **Follow-up timing**: Track when a reply, thank-you note, or check-in is due.
- **Quiet-period awareness**: Notice roles that have gone silent without
  treating silence as personal failure.
- **Contact memory**: Keep recruiter names, email addresses, and context beside
  the role.
- **Interview preparation**: Keep scheduled conversations, prep notes, and
  post-interview follow-ups attached to the application.
- **Offer comparison**: Track compensation and offer details with salary-floor
  context.
- **Search pacing**: Review active, stale, rejected, withdrawn, and offer-stage
  work without forcing every role to look equally urgent.

## Everyday Workflow

1. Open **Applications**.
2. Review the board and pending follow-ups.
3. Move each card when status changes.
4. Open a card to add notes, contact details, salary information, or next steps.
5. Use interviews, reminders, local summaries, and no-response review to decide
   where to spend time next.

JobSentinel should make this usable for a person who has never used a project
management tool. The board should answer plain questions:

- What should I do today?
- Which roles are waiting on me?
- Which roles are waiting on the employer?
- Which postings have gone quiet long enough that I should stop spending
  tailoring time on them?
- Which opportunities are worth extra preparation?

## Statuses

The application board supports the full job-search path:

| Status | Meaning |
| --- | --- |
| To Apply | Saved for review, not yet submitted. |
| Applied | Application sent or started. |
| Screening Call | Early recruiter or hiring-team contact. |
| Phone Interview | Phone or video conversation scheduled or completed. |
| Skills Interview | Skills, work-sample, portfolio, writing, trade, case, or assessment round. |
| Onsite Interview | Final, panel, site, or deeper-round conversation. |
| Offer Received | Employer made an offer. |
| Offer Accepted | User accepted an offer. |
| Offer Declined | User declined an offer. |
| Not Selected | Employer declined to continue. |
| No Response | No response after the quiet period you chose. |
| Withdrawn | User chose to stop pursuing the role. |

Stored status keys may use legacy internal names for compatibility. Visible
copy should stay broad enough for technical and non-technical job searches.

## Protective Follow-Up Model

Follow-up reminders should help the user spend energy carefully:

- A reminder suggests a next step; it does not send messages automatically.
- A quiet-period warning means "review this role" rather than "you failed."
- No-response review should help the user stop wasting time on stale or
  non-responsive roles.
- Weekly summaries should favor useful decisions over motivation copy.
- Salary and offer notes should help users avoid accepting below-floor offers.

## Data Boundaries

- Application records, notes, contacts, salary details, and interview details
  stay local by default.
- External notification channels require user configuration.
- No application tracking feature should upload all local job-search data.
- Private notes, salary floors, resumes, and unrelated application history must
  not be sent to any external AI provider by default.
- Research and grant evaluation should use public postings and synthetic
  candidate profiles unless a real user gives explicit informed consent.
