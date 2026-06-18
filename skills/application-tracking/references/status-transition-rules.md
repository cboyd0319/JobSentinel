# Application Status Transition Rules

Use this reference when a tracker needs status normalization, follow-up timing,
URL cleanup, or material-version evidence.

## Status Groups

| Group | Statuses | Required evidence |
| ----- | -------- | ----------------- |
| Discovery | Saved, Researching, Networking, To Apply, Verify First | Source, role, company, link or pasted context, next action. |
| Submitted | Applied | Receipt, date applied, application route, material versions, submitted-claim note when available. |
| Active process | Screening Call, Phone Interview, Skills Interview, Onsite Interview | Contact, date, expected timeline, prep or follow-up action. |
| Decision | Offer Received, Offer Accepted, Offer Declined | Written facts, deadline, response, open questions. |
| Terminal | Not Selected, No Response, Closed, Skip, Withdrawn | Reason and no follow-up date unless the user gives a new reason. |

## Transition Rules

- `Saved` can move to `Researching`, `Networking`, `To Apply`,
  `Verify First`, `Skip`, or `Withdrawn`.
- `Verify First` must move to `To Apply`, `Skip`, or stay open with a concrete
  verification action.
- `Applied` requires a submitted date or user-confirmed application event.
- `Applied` moves forward only after contact, rejection, interview, offer,
  no-response review, or user withdrawal.
- Interview statuses should keep the previous stage notes; do not collapse them
  into one generic active status when details matter.
- Terminal statuses require `status_reason` and should clear follow-up dates.
- Unknown incoming labels should map to the nearest broad status while keeping
  the original text in `original_status`.

## Follow-Up And Stale Thresholds

| Situation | Review timing | Next action |
| --------- | ------------- | ----------- |
| Applied with a real contact | 7-10 business days | One useful follow-up, then wait or close. |
| Applied with no real contact | 10-14 business days | Prefer new applications or networking over repeated cold follow-up. |
| Recruiter screen or interview | Within 24 hours | Thank-you note or promised material if appropriate. |
| Post-interview waiting | Stated timeline plus 1-2 business days | Follow up once with context. |
| Offer received | Same day | Record written deadline and open questions. |
| Saved or verify-first role | Before tailoring | Recheck source liveness and hard requirements. |

After two unanswered follow-ups, recommend `No Response`, `Closed`, `Skip`, or
deprioritized unless the user gives a new fact that changes the decision.

## URL And Source Hygiene

- Store a scrubbed link, not a copied URL with private tokens.
- Remove query parameters that look like application IDs, tracking IDs,
  session IDs, invite tokens, email addresses, or referral codes unless the
  user explicitly says the parameter is needed.
- Keep source liveness separate from fit. A live role can still be a poor fit;
  a pasted role can have unknown liveness without being suspicious.
- Preserve source, first seen, last seen, repost count, and last verified
  active date when available.

## Material Versioning

Track the exact material names used:

- resume version;
- cover letter version or `none`;
- outreach message version or `none`;
- submitted-claims snapshot when form answers or resume claims matter;
- salary or offer notes only when the user chose to record them.

Do not infer what was submitted from the current resume or tracker state. If
the submitted version is unknown, mark it unknown and ask the user.
