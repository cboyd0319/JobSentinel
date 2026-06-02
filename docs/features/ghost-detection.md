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

Scam warnings are separate. Scam signals include requests for money, early
sensitive information, suspicious domains, fake checks, unrealistic pay, or
non-company communication.

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

Hover over the badge to see why it was flagged. Job cards can also show "Seen
on X sources" when the same role appears in more than one place.

When posting risk is elevated, the job card also shows plain guidance before
the user spends tailoring time:

- **Review before tailoring.**
- **Verify before tailoring.**

Job cards also translate source IDs into plain labels such as "Greenhouse
hiring page", "LinkedIn job board", or "Saved by you." A closer employer source
is stronger evidence, not proof the role is active, so still verify before
spending serious tailoring time.

### Posting Risk Filter

Use the posting-risk filter above your job list:

- **All Jobs** - Show everything.
- **Lower Risk** - Hide postings that need a warning.
- **Needs Review** - Show only jobs with posting-review alerts.

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

Use posting-review alerts as one signal. If a flagged role still looks
worthwhile, verify it and decide based on your own situation.

## User Feedback

You can mark a posting based on what you verified:

- Mark it as **verified** if you confirmed the role is active.
- Mark it as **needs review** if you found stale, closed, evergreen, or unclear
  evidence.
- Clear your feedback if you change your mind.

These corrections help you keep track of which jobs you have already checked.

## Technical Details

<details>
<summary><strong>For developers and the curious</strong></summary>

### Signal Weights

| Signal                   | Weight |
| ------------------------ | ------ |
| Stale posting (60+ days) | 25%    |
| Frequent reposts         | 20%    |
| Generic description      | 15%    |
| Vague title              | 15%    |
| Unrealistic requirements | 15%    |
| Missing salary           | 10%    |

### Database Schema

```sql
-- Ghost-related columns in jobs table
ghost_score REAL,         -- 0.0 to 1.0 posting-risk estimate
ghost_reasons TEXT,       -- JSON array of reasons
first_seen TEXT,          -- When we first found this job
repost_count INTEGER      -- How many times we've seen it
```

### API Commands

```typescript
// Get jobs above a posting-risk threshold
invoke("get_ghost_jobs", { threshold: 0.5, limit: 100 });

// Get ghost detection statistics
invoke("get_ghost_statistics");
// Returns: { total_analyzed, ghosts, warnings, real, average_score }

// Get jobs with posting-risk filtering
invoke("get_recent_jobs_filtered", { limit: 50, exclude_ghost: true });

// Ghost configuration commands
invoke("get_ghost_config"); // Get current settings
invoke("set_ghost_config", {
  // Update settings
  stale_threshold_days: 60,
  repost_threshold: 3,
  stale_posting_weight: 0.25,
  repost_frequency_weight: 0.2,
  generic_description_weight: 0.15,
  vague_title_weight: 0.15,
  unrealistic_requirements_weight: 0.15,
  missing_salary_weight: 0.1,
});
invoke("reset_ghost_config"); // Reset to defaults

// User feedback commands
invoke("mark_job_as_real", { job_id: 123 }); // User verified the role is active
invoke("mark_job_as_ghost", { job_id: 123 }); // User marked stale or unverified
invoke("get_ghost_feedback", { job_id: 123 }); // Get user's verdict
invoke("clear_ghost_feedback", { job_id: 123 }); // Remove user's verdict
```

</details>
