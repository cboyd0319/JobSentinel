# Ghost Job Detection

**Stop wasting time on fake job postings.**

Ever applied to a job and heard nothing back? There's a good chance it was a "ghost job" -
a posting that isn't real. JobSentinel spots these so you can focus on real opportunities.

---

## What's a Ghost Job?

Ghost jobs are job postings that aren't genuine opportunities:

- **Already filled** - The company hired someone but left the posting up
- **Resume harvesting** - Just collecting resumes with no intent to hire
- **Abandoned** - Posted 6 months ago and forgotten
- **Evergreen** - Always posted, rarely actually hiring
- **Internal promotion** - Already know who they're hiring

Studies suggest **30-50% of job postings online are ghosts.** That's a lot of wasted applications.

---

## How JobSentinel Detects Ghosts

Every job gets analyzed against multiple signals. The result is a "ghost score" from 0% to 100%:

| Score | What It Means |
|-------|---------------|
| **0-49%** | Looks legitimate |
| **50-59%** | Some concerns (yellow flag) |
| **60-74%** | Multiple warning signs (orange flag) |
| **75%+** | Probably a ghost (red flag) |

### What We Look For

**Stale Postings**

- Posted 30-60 days ago? Mild concern.
- Posted 60-90 days ago? Getting suspicious.
- Posted 90+ days ago? Almost certainly filled or abandoned.

**Frequent Reposts**

Companies that keep reposting the same job usually aren't serious about hiring.
If we've seen this exact job 3+ times, that's a red flag.

**Vague Descriptions**

Real jobs have specific requirements. Ghost jobs use generic phrases like:

- "Fast-paced environment"
- "Self-starter"
- "Wear many hats"
- "Rockstar developer"
- "Competitive salary" (without actual numbers)

**Missing Salary**

While not definitive, jobs that hide salary info are more likely to be ghosts.
Real employers who want real candidates usually post real numbers.

**Weird Titles**

Generic titles like "Developer" or "Various Positions" often indicate mass-posted,
low-quality listings.

**Too Many Openings**

A company with 200+ open positions for the same role? They're probably not actually
hiring for all of them.

---

## Using Ghost Detection

### On the Dashboard

Ghost jobs show a colored badge:

- 🟡 **Yellow** - Minor concerns (50-59%)
- 🟠 **Orange** - Multiple warning signs (60-74%)
- 🔴 **Red** - Probably fake (75%+)

Hover over the badge to see why it was flagged. Job cards also show "Seen on X sources"
badge to indicate deduplication detection.

### Ghost Filter

Use the dropdown filter above your job list:

- **All Jobs** - Show everything (default)
- **Real Jobs Only** - Hide anything with ghost score ≥ 50%
- **Ghost Jobs** - See only flagged jobs (useful for curiosity)

Most people use "Real Jobs Only" to avoid wasting time.

### Settings UI for Ghost Config

Customize ghost detection sensitivity in **Settings → Detection → Ghost Job Settings**:

- **Stale Job Threshold** - How old a job needs to be before it's flagged as stale (default: 60 days)
- **Repost Threshold** - How many times a job must be reposted to trigger a flag (default: 3)
- **Weight Adjustments** - Fine-tune the importance of each detection signal
  - Stale postings weight (default: 25%)
  - Repost frequency weight (default: 20%)
  - Generic description weight (default: 15%)
  - Vague title weight (default: 15%)
  - Unrealistic requirements weight (default: 15%)
  - Missing salary weight (default: 10%)

Changes take effect immediately with a live preview showing your new ghost job count.

---

## Should You Apply to Flagged Jobs?

It depends on the flag color:

**Yellow (50-59%)** - Probably fine. The job might just be slightly old or have a
generic description. Apply if it interests you.

**Orange (60-74%)** - Be cautious. Something's off. Maybe apply if it's a dream company,
but don't expect much.

**Red (75%+)** - Skip it. Save your energy for real opportunities.

---

## Limitations

Ghost detection isn't perfect:

- **False positives** - Some legitimate jobs may be flagged, especially from large
  companies or staffing agencies
- **False negatives** - Some ghost jobs may slip through
- **Data dependent** - Accuracy improves with more historical data
- **Repost timing matters** - Very old reposts (180+ days) are weighted less heavily
  because they may indicate legitimate evergreen roles

Use ghost scores as one signal, not the only signal. If a job looks great despite a
flag, apply anyway - you know your situation better than an algorithm.

### User Feedback

**Help improve detection accuracy** by marking jobs as real or ghost:

- If you know a flagged job is legitimate, mark it as "real"
- If you find a ghost job we missed, mark it as "ghost"
- Your feedback can be cleared if you change your mind

These corrections help you keep track of which jobs you've vetted.
Future enhancement: we'll use this feedback to improve the detection algorithm.

---

## Technical Details

<details>
<summary><strong>For developers and the curious</strong></summary>

### Signal Weights

| Signal | Weight |
|--------|--------|
| Stale posting (60+ days) | 25% |
| Frequent reposts | 20% |
| Generic description | 15% |
| Vague title | 15% |
| Unrealistic requirements | 15% |
| Missing salary | 10% |

### Database Schema

```sql
-- Ghost-related columns in jobs table
ghost_score REAL,         -- 0.0 to 1.0
ghost_reasons TEXT,       -- JSON array of reasons
first_seen TEXT,          -- When we first found this job
repost_count INTEGER      -- How many times we've seen it
```

### API Commands

```typescript
// Get jobs flagged as ghosts
invoke('get_ghost_jobs', { threshold: 0.5, limit: 100 })

// Get ghost detection statistics
invoke('get_ghost_statistics')
// Returns: { total_analyzed, ghosts, warnings, real, average_score }

// Get jobs with ghost filtering
invoke('get_recent_jobs_filtered', { limit: 50, exclude_ghost: true })

// Ghost configuration commands (NEW)
invoke('get_ghost_config')                        // Get current settings
invoke('set_ghost_config', {                      // Update settings
  stale_threshold_days: 60,
  repost_threshold: 3,
  stale_posting_weight: 0.25,
  repost_frequency_weight: 0.20,
  generic_description_weight: 0.15,
  vague_title_weight: 0.15,
  unrealistic_requirements_weight: 0.15,
  missing_salary_weight: 0.10
})
invoke('reset_ghost_config')                      // Reset to defaults

// User feedback commands
invoke('mark_job_as_real', { job_id: 123 })    // Mark job as legitimate
invoke('mark_job_as_ghost', { job_id: 123 })   // Mark job as fake/ghost
invoke('get_ghost_feedback', { job_id: 123 })  // Get user's verdict ("real", "ghost", or null)
invoke('clear_ghost_feedback', { job_id: 123 }) // Remove user's verdict
```

</details>

---

**Version:** 2.6.3 | **Last Updated:** January 25, 2026
