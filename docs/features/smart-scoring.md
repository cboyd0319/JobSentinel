# Fit Review

**Understand why a job appears high or low without turning the search into a
black box.**

## Overview

JobSentinel reviews every job against saved preferences and shows a fit
estimate. The estimate is a sorting aid, not a verdict. It helps a job
seeker decide which roles deserve careful review, which need verification, and
which are likely poor fits for stated constraints.

The match explanation must stay plain-language:

- What matched.
- What did not match.
- Which setting affected the result.
- What the user can change if the result is not useful.

## Fit Factors

JobSentinel uses five visible factors. The review roles explain which areas are
most prominent without asking users to reason about model weights.

| Factor | Review role | What it checks |
| ------ | ----------- | -------------- |
| **Skills and search words** | Primary | Job title, selected work words, resume skills if enabled |
| **Salary** | Important | Listed pay, salary floor, target pay, and missing-pay handling |
| **Location** | Important | Remote, hybrid, onsite, commute, and selected locations |
| **Company** | Supporting | Favorite companies and hidden companies |
| **Freshness** | Supporting | How recently the posting appeared |

The review guide is visible in **Settings > Sources & Alerts**. Most users
should change job titles, work words, salary floor, location, and company
preferences before touching extra fit settings.

Fit details name the saved input or posting field each factor uses, such as
saved job titles, work words, listed pay, salary floor, location choices,
company preferences, posting date, and freshness settings.

## Reading a Fit Estimate

Job cards and fit details should help users make a decision without guessing.

| Label | Meaning | Next step |
| ----- | ------- | --------- |
| **Strong Fit** | The posting fits most saved preferences | Review source, pay, and posting-risk signals before tailoring |
| **Good Fit** | The posting has several useful signals | Check weaker factors before spending serious time |
| **Possible Fit** | The posting fits part of the search | Review only if the role or company is worth extra effort |
| **Needs Review** | The posting conflicts with saved preferences | Skip or update preferences if the result is wrong |

High fit does not mean the job is real, fair, or worth applying to. Always
review posting risk, salary, source, and application route.

Dashboard comparison rows and duplicate-source groups pair the percentage with
the fit label instead of showing a number alone.

Fit details also show an evidence-status label:

| Evidence status | Meaning |
| --------------- | ------- |
| **Clear fit evidence** | Saved reasons support the local fit estimate |
| **Mixed evidence** | Some factors fit and some need review |
| **Not enough information** | Saved reason details are missing or unclear |
| **Check preferences first** | Saved reasons conflict with user preferences |

## Factor Details

### Skills And Search Words

Skills and search words compare the job title and posting text against what the
user wants to do more of or avoid.

Inputs include:

- Job titles to show more often.
- Job titles to avoid.
- Work words to show more often.
- Work words to avoid.
- Reviewed resume skills after the user turns on resume-skill sorting from the
  Resume page or Settings.
- Synonym matching for equivalent words, such as "customer support" and
  "client support."

When resume-skill sorting is off, JobSentinel uses saved titles and work
words. When it is on, reviewed local resume skills add more context without
replacing the user's stated preferences.

Saved settings apply to the running app after they save. Turning resume-based
matching on or off does not require closing and reopening JobSentinel, and
cached match results are kept separate for base scoring and active-resume
scoring.

### Salary

Salary review compares listed pay to the user's salary floor and target pay.
Missing pay should not hide every job automatically, but it should remain visible
as a warning because missing pay can waste time and increase underpayment risk.
Open-ended minimum-only pay should remain visible without a below-floor warning
unless a known maximum or top listed pay is below the user's floor.

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
| Salary floor | Warn when known top listed pay is below the user's minimum |
| Location | Reflect remote, hybrid, onsite, commute, city, and state needs |
| Company preferences | Raise favorite companies and lower hidden companies |
| Resume matching | Include resume skills in match explanations when enabled |
| Match Review Guide | Explain default review areas |

## Boundaries

Fit review must not:

- Claim a job is guaranteed to be good.
- Hide salary-floor conflicts.
- Treat missing salary as neutral without explanation.
- Replace ghost-job or source verification.
- Encourage deceptive resume changes.
- Submit applications for the user.
- Send private job-search data to an external provider.

Fit review should:

- Explain visible factors.
- Help users recover from bad matches by changing settings.
- Use protective language for stale postings, below-floor pay, and weak source
  signals.
- Stay useful for technical and non-technical roles.

## Related Documentation

- [Synonym Matching Guide](synonym-matching.md) - Equivalent work and skill words.
- [Remote Work Preference Scoring](remote-preference-scoring.md) - Location and work-mode matching.
- [Resume Match integration](resume-matcher.md) - Resume-based match context.
- [Pay Protection](salary-ai.md) - Salary floor, pay transparency, and offer comparison.
- [Ghost Job Detection](ghost-detection.md) - Stale or low-trust posting warnings.
