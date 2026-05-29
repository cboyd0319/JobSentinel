# Smart Scoring System

**Understand why a job appears high or low without turning the search into a
black box.**

## Overview

JobSentinel reviews every job against saved preferences and shows a match
percentage. The percentage is a sorting aid, not a verdict. It helps a job
seeker decide which roles deserve careful review, which need verification, and
which are likely poor fits for stated constraints.

The match explanation must stay plain-language:

- What matched.
- What did not match.
- Which setting affected the result.
- What the user can change if the result is not useful.

## Match Factors

JobSentinel uses five visible factors. The default priorities explain how much
each factor contributes to the match percentage.

| Factor | Default priority | What it checks |
| ------ | ---------------- | -------------- |
| **Skills and search words** | 40% | Job title, selected work words, resume skills if enabled |
| **Salary** | 25% | Listed pay, salary floor, target pay, and missing-pay handling |
| **Location** | 20% | Remote, hybrid, onsite, commute, and selected locations |
| **Company** | 10% | Favorite companies and hidden companies |
| **Freshness** | 5% | How recently the posting appeared |

The priority guide is visible in **Settings > Advanced Settings**. Most users
should change job titles, work words, salary floor, location, and company
preferences before touching advanced scoring configuration.

## Reading a Match

Job cards and match details should help users make a decision without guessing.

| Label | Meaning | Next step |
| ----- | ------- | --------- |
| **Strong Match** | The posting fits most saved preferences | Review source, pay, and posting-risk signals before tailoring |
| **Good Match** | The posting has several useful signals | Check weaker factors before spending serious time |
| **Some Match** | The posting fits part of the search | Review only if the role or company is worth extra effort |
| **Low Match** | The posting conflicts with saved preferences | Skip or update preferences if the result is wrong |

High match does not mean the job is real, fair, or worth applying to. Always
review posting risk, salary, source, and application route.

## Factor Details

### Skills And Search Words

Skills and search words compare the job title and posting text against what the
user wants to do more of or avoid.

Inputs include:

- Job titles to show more often.
- Job titles to avoid.
- Work words to show more often.
- Work words to avoid.
- Uploaded resume skills when resume matching is enabled.
- Synonym matching for equivalent words, such as "customer support" and
  "client support."

When resume matching is off, JobSentinel uses saved titles and work words. When
resume matching is on, resume skills add more context without replacing the
user's stated preferences.

### Salary

Salary review compares listed pay to the user's salary floor and target pay.
Missing pay should not hide every job automatically, but it should remain visible
as a warning because missing pay can waste time and increase underpayment risk.

Salary support is evidence-bounded. JobSentinel should help users protect their
floor and ask better questions; it is not a compensation authority or legal
adviser.

### Location

Location review checks remote, hybrid, onsite, commute, and selected city or
state preferences. A remote-only user should see onsite conflicts clearly. A
hybrid-open user should still see commute and location warnings.

### Company

Company review uses user-owned preference lists:

- Favorite companies can raise a role for review.
- Hidden companies can lower or hide roles the user no longer wants to see.

Company matching should explain the visible reason and avoid loaded labels.

### Freshness

Freshness favors newer postings. Older postings can still be useful, but they
should be checked alongside ghost-job and stale-posting signals before a user
spends tailoring time.

## Example

| Detail | Example |
| ------ | ------- |
| Job | Customer Success Manager at Acme Health |
| Location | Denver, CO, hybrid |
| Pay | $95,000 listed |
| Posted | 5 days ago |
| Description | Onboarding, retention, CRM, reporting, account management |

**Saved preferences:**

- Job title: Customer Success Manager.
- Work words to show more often: onboarding, retention, CRM.
- Salary floor: $90,000.
- Work mode: remote preferred, open to hybrid.
- Favorite companies: Acme Health, Northstar Clinic.

**Likely match explanation:**

- Title and work words fit the saved search.
- Listed pay is above the salary floor.
- Hybrid work is acceptable but not the strongest location fit.
- Company is in the user's favorite companies.
- Posting is fresh.

The result should tell the user why the role is worth review, while still
showing source, posting-risk, and pay-transparency signals.

## Settings

Useful settings live in normal language:

| Setting | User-facing purpose |
| ------- | ------------------- |
| Job titles | Show more of the roles the user wants |
| Work words | Raise work the user wants and lower work they want to avoid |
| Salary floor | Warn when listed pay is below the user's minimum |
| Location | Reflect remote, hybrid, onsite, commute, city, and state needs |
| Company preferences | Raise favorite companies and lower hidden companies |
| Resume matching | Include resume skills in match explanations when enabled |
| Match Priority Guide | Explain default factor priorities |

## Boundaries

Smart scoring must not:

- Claim a job is guaranteed to be good.
- Hide salary-floor conflicts.
- Treat missing salary as neutral without explanation.
- Replace ghost-job or source verification.
- Encourage deceptive resume changes.
- Submit applications for the user.
- Send private job-search data to an external provider.

Smart scoring should:

- Explain visible factors.
- Help users recover from bad matches by changing settings.
- Use protective language for stale postings, below-floor pay, and weak source
  signals.
- Stay useful for technical and non-technical roles.

## Developer Notes

Current Tauri commands:

- `get_scoring_config`
- `update_scoring_config`
- `reset_scoring_config_cmd`
- `validate_scoring_config`

The backend `ScoringConfig` stores skills, salary, location, company, and
recency proportions and validates that they form one complete scoring model.
Internal field names may still use scoring terminology for compatibility, but
user-facing copy should explain these as match priorities and preferences.

## Related Documentation

- [Synonym Matching Guide](synonym-matching.md) - Equivalent work and skill words.
- [Remote Work Preference Scoring](remote-preference-scoring.md) - Location and work-mode matching.
- [Resume Match integration](resume-matcher.md) - Resume-based match context.
- [Pay Protection](salary-ai.md) - Salary floor, pay transparency, and offer comparison.
- [Ghost Job Detection](ghost-detection.md) - Stale or low-trust posting warnings.
