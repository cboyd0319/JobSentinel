# Hiring Trends

**Use the jobs JobSentinel has already found to spot useful hiring signals,
without treating the sample as the whole labor market.**

Hiring Trends summarizes jobs JobSentinel found or jobs you saved so job seekers
can see patterns in roles, skills, companies, locations, remote work, and listed pay.
It is a local decision aid, not a prediction engine and not a substitute for
checking the actual job posting.

![Hiring Trends dashboard](../images/hiring-trends.png)

## Privacy Labels

| Workflow | Label | Default behavior |
| --- | --- | --- |
| Hiring Trends snapshots | Local only | Aggregates are computed from local job records. |
| Skill, role, company, and location trends | Local only | Trend records stay on this device. |
| Salary trend review | Local only, Sensitive | Salary-floor context stays local. |
| Hiring trend alerts | Local only | Alerts are created locally from saved job data. |
| External notifications | Sensitive | Optional notification channels are used only if the user turns them on. |
| Job posting data | Public-data only | Source postings are public or user-saved job content. |

External AI is not required for Hiring Trends.

## What It Helps With

- **Freshness review**: See whether the local job pool is growing or going
  stale.
- **Skills showing up more often**: Notice skills, tools, credentials, or work
  areas appearing more often in saved postings.
- **Company activity**: Identify employers with repeated or active listings,
  then verify important roles at the official source.
- **Location and remote patterns**: Compare local, hybrid, remote, and
  location-specific signals.
- **Salary transparency**: Review listed pay trends and missing-pay patterns
  before spending time on a role.
- **Protective alerts**: Surface notable changes without turning the search
  into noise.

## Everyday Workflow

1. Open **Hiring Trends**.
2. Review the overview for the current local job pool.
3. Check skills, companies, locations, and alerts.
4. Treat every signal as evidence to verify, not as proof.
5. Use the result to refine searches, decide what to tailor, or avoid weak
   markets that do not match salary, location, or work-mode constraints.

For example, a spike in care-coordination postings can help a healthcare job
seeker adjust search wording. A cluster of below-floor salaries can signal that
a location or title may need a different search strategy. A company with many
reposted roles may deserve extra verification before heavy tailoring.

## Reading Signals Carefully

| Signal | What it can mean | What to check |
| --- | --- | --- |
| More new jobs | Local source activity increased. | Confirm roles are fresh and official-source listings still exist. |
| Skills appearing more often | A skill or tool appears more often in jobs JobSentinel found or you saved. | Check whether several sources show the same pattern before changing your resume or search. |
| Active company | Employer has repeated or many postings. | Check official company pages and repost history. |
| Salary trend | Listed pay changed in the local sample. | Check sample size, location, role level, and missing-pay rates. |
| Location density | More postings mention a place or work mode. | Check commute, hybrid schedule, licensing, or remote eligibility. |
| Alert | A local metric moved enough to flag. | Review the underlying postings before changing strategy. |

Hiring Trends only knows about jobs JobSentinel found or you saved. Missing
salary, stale postings, duplicated listings, source outages, and one job site
showing only a narrow slice can all distort results.

Hidden or dismissed jobs still count as market evidence because hiding is a
personal view choice, not proof that an employer closed the role. JobSentinel
does not currently infer filled or closed jobs for Hiring Trends; filled-count
metrics stay neutral until a source-backed closure signal exists.

## Protective Use

Hiring Trends should help job seekers make decisions with less wasted
effort:

- Prioritize fresh, official-source postings when possible.
- Avoid treating repost volume as proof of real hiring.
- Use salary trends to protect salary floors and spot lower-title or lower-pay
  risk.
- Use location and work-mode trends to protect commute, caregiving, disability,
  licensing, and schedule constraints.
- Keep alerts calm and actionable.
- Avoid motivational claims when the data is thin or noisy.

## Data Boundaries

- Market metrics are computed from local job data by default.
- Market metrics use local job records and creation timestamps. Hidden or
  dismissed jobs remain part of aggregate hiring evidence.
- Notification delivery is optional and works only after the user turns it on.
- No market feature should upload the user's local job database.
- Market summaries should not include private notes, resumes, salary floors, or
  application history unless the user explicitly chooses to combine them in a
  future feature.
- Research and grant evaluation should use public postings and synthetic
  candidate profiles unless a real user gives explicit informed consent.
