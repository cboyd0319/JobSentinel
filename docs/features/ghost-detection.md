# Ghost Job Detection

**Protect your time before you tailor.**

Some job postings are stale, reposted, already closed, evergreen, or hard to
verify. JobSentinel flags those warning signs so you can decide whether to
apply, verify first, or spend your tailoring time elsewhere.

## What This Means

JobSentinel does not claim to know an employer's intent. A "ghost job" warning
means the posting has risk signals, such as:

- **Already closed** - The company may have filled the role but left the posting
  online.
- **Pipeline role** - The employer may be collecting resumes for future needs
  instead of a current opening.
- **Stale listing** - The posting has been open for a long time without fresh
  evidence.
- **Evergreen listing** - The company keeps the same role open all the time.
- **Unclear route** - The listing appears away from the employer or application
  platform source and cannot be verified yet.

Scam warnings are separate. Scam signals include requests for money, gift cards,
early sensitive information, suspicious domains, fake checks, unrealistic pay,
messaging-app interview requests, or non-company communication.

## How JobSentinel Labels Posting Risk

Every job gets checked against multiple signals. The user-facing result is a
plain posting-risk label that helps you decide whether to apply, verify first,
or save your tailoring energy.

| Label | What it means |
| ----- | ------------- |
| **Lower risk** | Available evidence does not show strong warning signs |
| **Needs light review** | Open the original job page before spending much time |
| **Multiple warning signs** | Verify the role before tailoring |
| **Verify before tailoring** | Do not spend serious time until the posting is confirmed |

## What JobSentinel Looks For

### Stale Postings

- Posted 30-60 days ago? Light concern.
- Posted 60-90 days ago? Review before tailoring.
- Posted 90+ days ago? Verify the role is still open before spending serious
  time.
- If a posting date cannot be parsed, dashboard comparisons show **Date not
  shown** instead of treating it as freshness evidence.

### Frequent Reposts

Repeated reposting can mean normal hiring demand, a hard-to-fill role, a
staffing pipeline, or a listing that needs review. JobSentinel treats repeated reposts
as a reason to verify, not as proof the employer is acting badly.

### Vague Descriptions

Low-detail postings are harder to trust. Warning signs include generic
responsibilities, unclear team or reporting line, contradictory remote rules,
missing location details, or broad phrases without concrete work.

### Missing Pay

Missing pay is not proof of a ghost job. It is still useful evidence because
hidden pay can waste time and make it harder to compare roles against your
salary floor.

### Unclear Titles

Very broad titles such as "Various Positions" or single-word role names can
indicate mass-posted listings or low-detail postings that need review.

### Too Many Similar Openings

Many identical openings can mean genuine hiring, staffing activity, evergreen
roles, or repost churn. JobSentinel flags the pattern so you can check the
source before tailoring.

## Using Ghost Detection

### On the Dashboard

Jobs with posting-risk signals show a badge:

- **Yellow** - Needs light review.
- **Orange** - Multiple warning signs.
- **Red** - Verify before tailoring.

Screen-reader labels use low, medium, or high warning levels instead of raw
confidence percentages.

Hover over the badge to see why it was flagged. Job cards can also show when
the same role has been seen more than once. Treat repeated sightings as a
source detail to check, not proof that separate sites confirmed the role.

Some stale or repost evidence can show as a small **Check posting evidence**
cue even when the overall warning score is low or not available. This means the
posting has a specific age or repost signal worth checking before tailoring; it
is not a claim about employer intent.
If the local posting-risk score is not a finite number between `0` and `1`,
JobSentinel treats the score as unavailable. It can still show parsed stale or
repost evidence, but it should not turn an invalid score into a stronger
posting-risk badge.

Broad-title or thin-description jobs can also show **Check role details**. This
includes generic titles such as remote opportunity or entry-level position. It
means the posting text is light enough to review the role, team, and work
details before tailoring; it is not a claim that the employer is fake.

When posting risk is elevated, the job card also shows plain guidance before
the user spends tailoring time:

- **Review before tailoring.**
- **Verify before tailoring.**

High-risk cards also show an **Open Original Posting** action and next-step
checks so users can confirm the source before deep tailoring.

Job cards can also show **Possible scam sign** when the description mentions
money, checks, payment apps, crypto, messaging-app interviews, fees, or
sensitive details early, including requests before an interview or offer. Treat
this as a safety prompt: verify the employer, do not pay fees, and do not share
sensitive information before confirming the job.

Job cards also translate source IDs into plain labels such as "Greenhouse
hiring page", "LinkedIn job board", or "Saved by you." A closer employer source
is stronger evidence, not proof the role is active, so still verify before
spending serious tailoring time.

When a source is a job board, connected feed, saved link, sample, custom label,
or missing label, job cards show a visible source-review cue such as **Verify
employer page**, **Check saved link**, or **Source not shown**. Employer-side
hiring pages stay quieter because they are closer to the source, but they still
remain source evidence to review.

If a saved job link does not pass the local safety check, job cards show
**Check job link** and block every job-open path, including dashboard-provided
open handlers. Use the employer page or a fresh public job link before
tailoring.

### Posting Risk Filter

Use the posting-risk filter above your job list:

- **All Jobs** - Show everything.
- **Lower Risk** - Hide postings that need a warning.
- **Needs Review** - Show only jobs with posting-review alerts.

These filters also include low-detail card warnings such as **Check role
details**, so the list view and card guidance stay consistent.

Use "Lower Risk" when you are low on time or energy. Use "Needs Review" when
you want to check old or suspicious listings before deciding what to do.

### Settings

Choose how cautious JobSentinel should be in **Settings > Sources & Alerts >
Posting Risk and Freshness**:

- **Widest search** - Warns less often so more roles stay in normal review.
- **Balanced** - Keeps most roles visible and warns on older, reposted, vague,
  or hard-to-verify postings.
- **Fresh and verified first** - Warns sooner so older or weak-source postings
  move lower before you spend tailoring time.

Most users can leave the balanced setting on. More controls are available for
people who want exact stale-day, repost-count, or signal-strength settings.
Changes take effect immediately with a live preview showing how many listings
would need review.

## What To Do With Flagged Jobs

Use the warning as a time-protection signal:

**Yellow** - Review quickly. Apply if the role still fits.

**Orange** - Verify first if tailoring would take real effort. Check the company
site, exact title, posting age, and source.

**Red** - Do not spend serious tailoring time until you have stronger evidence
the role is active. Check the employer or application page, look for recent
updates, and consider contacting a recruiter or hiring contact if one is
available.

## Limits

Ghost detection is not perfect:

- **False positives** - Some active jobs may be flagged, especially from large
  companies, staffing agencies, or evergreen hiring teams.
- **False negatives** - Some stale or inactive jobs may not have enough visible
  warning signs.
- **Data dependent** - Accuracy improves when JobSentinel has more history for
  a company, title, source, or repost pattern.
- **Source dependent** - Employer-site or application-platform presence is
  stronger evidence, but it is not absolute proof that hiring is active.
- **Missing source** - If a source is not shown, open the original posting
  before tailoring instead of treating the card as verified.

Use posting-review alerts as one signal. If a flagged role still looks
worthwhile, verify it and decide based on your own situation.

## User Feedback

You can mark a posting based on what you verified:

- Mark it as **verified** if you confirmed the role is active.
- Mark it as **needs review** if you found stale, closed, evergreen, or unclear
  evidence.
- Clear your feedback if you change your mind.

These corrections help you keep track of which jobs you have already checked.
