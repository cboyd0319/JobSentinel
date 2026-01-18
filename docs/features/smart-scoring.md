# Smart Scoring System

**Find the best job matches automatically with intelligent multi-factor scoring.**

> **Status:** ENABLED - Module fully functional
> **Version:** 2.2
> **Last Updated:** 2026-01-17

---

## Overview

JobSentinel's Smart Scoring System analyzes every job across five key factors to give you a
single, meaningful score (0-100%). Instead of manually filtering through hundreds of jobs, let the
algorithm prioritize the best matches for you.

### Key Features

- **Multi-factor analysis** - Evaluates skills, salary, location, company, and recency
- **Configurable weights** - Customize how much each factor matters to you
- **Resume integration** - Match jobs against your actual skills
- **Score breakdown** - Click any score to see exactly why it was calculated
- **Real-time preview** - See updated scores instantly when you adjust settings

### Screenshot

![Smart Scoring Dashboard](../images/smart-scoring.png)

---

## The 5-Factor Scoring Algorithm

Every job score is calculated by evaluating five factors and combining them into a single 0-100%
score. Here's what each factor measures:

| Factor | Weight | What It Measures |
|--------|--------|------------------|
| **Skills Match** | 40% | How well your skills match the job requirements |
| **Salary** | 25% | How the job salary compares to your target |
| **Location** | 20% | How well the job matches your remote/onsite preferences |
| **Company** | 10% | Whether you've whitelisted or blacklisted the company |
| **Recency** | 5% | How fresh the job posting is |

**Total always equals 100%.** These weights are defaults—you can customize them in Settings.

---

## 1. Skills Match (40%)

The skills factor measures how well your qualifications align with the job requirements.

### How It Works

JobSentinel analyzes job requirements against your qualifications using three methods:

1. **Title Allowlist/Blocklist** - Match or exclude job titles
2. **Keyword Boost/Exclude** - Reward jobs with desired keywords or penalize those with excluded ones
3. **Synonym Matching** - Recognize equivalent skills (e.g., "JavaScript" = "JS")
4. **Resume-Based Scoring** - If you've uploaded a resume, compare your actual skills to requirements

### Scoring Breakdown

**Without Resume:**

- **Title Match** (40% of skills factor)
  - Title matches allowlist: +100%
  - Title matches blocklist: 0% (filtered out)
  - Neutral title: 50%

- **Keyword Boost** (60% of skills factor)
  - Each boosted keyword found: +10%
  - Each excluded keyword found: -10%
  - Maximum: 100%, minimum: 0%

**With Resume (70% resume match + 30% keyword boost):**

- **Resume Match** (70%)
  - Matching skills ÷ Required skills = score
  - Example: You have 7/10 required skills = 70%

- **Keyword Boost** (30%)
  - Same keyword logic as above

### Configuration in Settings

Navigate to **Settings → Scoring → Skills Matching**:

1. **Title Preferences**
   - Allowed job titles (e.g., "Software Engineer", "Backend Developer")
   - Blocked job titles (e.g., "Salesforce Developer", "Technical Recruiter")

2. **Keyword Boosters**
   - Keywords that increase score if found (e.g., "TypeScript", "AWS", "remote")
   - Include common variations

3. **Excluded Keywords**
   - Keywords that decrease score if found (e.g., "Java", "on-site", "startup")

4. **Resume-Based Scoring** (NEW in v2.2)
   - Toggle "Use Resume for Scoring" ON/OFF
   - Automatically compares your uploaded resume against job requirements
   - Shows exact skills you have vs. skills the job requires

### Example: Software Engineer Position

**Job Requirements:**

- React, Node.js, TypeScript, Docker, AWS

**Your Configuration:**

- Allowed titles: ["Software Engineer", "Backend Developer"]
- Boosted keywords: ["React", "TypeScript", "AWS"]
- Excluded keywords: ["VB.NET"]

**Scoring:**

```text
Title: "Senior Backend Engineer" → Matches "Backend Developer" → 100%

Keyword Match:
  ✓ React (found, boosted)       +10%
  ✓ TypeScript (found, boosted)  +10%
  ✓ AWS (found, boosted)         +10%
  ✗ Node.js (found, not boosted) +5%
  ✗ Docker (found, not boosted)  +5%
  ✗ VB.NET (not found)           (not penalized)

Keywords Score: 40%

Skills Factor: (100% × 0.4) + (40% × 0.6) = 40% + 24% = 64%
```

**With Resume:**

If your resume shows: React ✓, TypeScript ✓, Docker ✓, Node.js ✓, AWS ✓ (5/5 matching)

```text
Resume Match: 5/5 = 100%
Keyword Boost: 40% (as above)

Skills Factor: (100% × 0.7) + (40% × 0.3) = 70% + 12% = 82%
```

### Synonym Matching

The system recognizes equivalent skills and keywords:

| Category | Synonyms |
|----------|----------|
| JavaScript | JS, JavaScript, Node |
| React | React, ReactJS, React.js |
| Python | Python, Py |
| SQL | SQL, T-SQL, MySQL, PostgreSQL |
| AWS | AWS, Amazon Web Services |
| CI/CD | CI/CD, CI-CD, continuous integration |

For complete synonym reference, see [Synonym Matching Guide](synonym-matching.md).

---

## 2. Salary (25%)

The salary factor rewards jobs that match your target salary range and penalizes outliers.

### Graduated Scoring Model

Instead of a simple yes/no, salary scoring is graduated:

| Salary Range | Score | Meaning |
|--------------|-------|---------|
| **120%+** of target | 100% | Excellent, pays premium |
| **100-120%** of target | 100% | Perfect match |
| **80-100%** of target | 80-100% | Good, slightly below target |
| **60-80%** of target | 60-80% | Acceptable but low |
| **30-60%** of target | 20-40% | Significantly below target |
| **<30%** of target | 0-20% | Too low to consider |

### Example

Your target salary: **$150,000**

| Job Salary | Calculation | Score |
|------------|-------------|-------|
| $200,000 | 133% of target | 100% |
| $150,000 | 100% of target | 100% |
| $120,000 | 80% of target | 80% |
| $90,000 | 60% of target | 60% |
| $50,000 | 33% of target | 20% |

### How It Handles Missing Data

If a job doesn't list salary:

- **With target range set:** 60% score (assumes market average)
- **Without target range:** 70% score (neutral, not penalized)

### Configuration in Settings

Navigate to **Settings → Scoring → Salary**:

1. **Target Salary**
   - Your desired annual salary (e.g., $150,000)
   - Used as the baseline for scoring

2. **Minimum Acceptable**
   - Lowest salary you'd consider (e.g., $100,000)
   - Jobs below this get 0% or very low scores

3. **Preferred Range**
   - Set both minimum and maximum for more precise scoring

4. **Currency**
   - Select your currency for accurate calculations

### AI Salary Prediction

If a job doesn't list salary, JobSentinel uses AI to predict it based on:

- Job title and seniority
- Required skills and experience
- Company size and location
- Historical salary data

Predicted salaries are marked with a 🤖 icon and help level the playing field when comparing jobs
with missing salary info.

For details, see [Salary AI Feature](salary-ai.md).

---

## 3. Location (20%)

The location factor prioritizes jobs that match your remote/hybrid/onsite preferences.

### Remote Preference Modes

Choose your ideal work arrangement:

| Preference | Accepts | Best Score Job Type |
|------------|---------|---|
| **Remote Only** | Remote jobs only | Remote |
| **Remote Preferred** | Remote + Hybrid + Onsite | Remote (100%), Hybrid (70%), Onsite (40%) |
| **Hybrid Preferred** | Hybrid + Remote + Onsite | Hybrid (100%), Remote (80%), Onsite (60%) |
| **Onsite Preferred** | Onsite + Hybrid + Remote | Onsite (100%), Hybrid (70%), Remote (50%) |
| **Flexible** | All work arrangements | All (100%) |

### Graduated Scoring Examples

**If you prefer Remote:**

| Job Type | Score | Reasoning |
|----------|-------|-----------|
| Fully Remote | 100% | Perfect match |
| Hybrid | 70% | Mostly remote, acceptable |
| Onsite | 40% | Not what you want, but possible |
| Unspecified | 60% | Unknown, give benefit of doubt |

**If you prefer Hybrid:**

| Job Type | Score | Reasoning |
|----------|-------|-----------|
| Hybrid | 100% | Perfect match |
| Remote | 80% | More flexibility, acceptable |
| Onsite | 60% | Less flexible, acceptable |
| Unspecified | 70% | Unknown, assume reasonable |

### Detection from Job Data

JobSentinel detects work arrangement from multiple sources:

1. **Explicit `remote` field** in job posting (most reliable)
2. **Location string** (e.g., "Remote - US", "New York (Hybrid)")
3. **Job title** (e.g., "Remote Software Engineer")
4. **Job description keywords**:
   - Remote: "remote", "work from home", "WFH", "distributed", "fully remote"
   - Hybrid: "hybrid", "flexible location", "remote + office"
   - Onsite: "on-site", "in-office", "office-based"

### Configuration in Settings

Navigate to **Settings → Scoring → Location Preferences**:

1. **Work Arrangement Preference**
   - Select from 5 modes above
   - Changes live preview showing affected jobs

2. **Preferred Cities/Regions** (for onsite/hybrid)
   - Add preferred locations for jobs you'd relocate to
   - Jobs in preferred locations get small bonuses

3. **Exclude Countries/Regions**
   - Block jobs in certain areas

For deep dive, see [Remote Work Preference Scoring](remote-preference-scoring.md).

---

## 4. Company (10%)

The company factor rewards jobs from companies you want to work for and penalizes those you don't.

### Company Whitelist

Add companies you're interested in:

- Jobs from whitelisted companies: +50% to company score
- Each whitelisted company match: +1% bonus
- Maximum: 100% company score

**Example:**

Your whitelist: ["Google", "Microsoft", "Apple"]

Job from Google: 100% company score (50% base + 50% exact match bonus)

### Company Blacklist

Exclude companies you want to avoid:

- Jobs from blacklisted companies: 0% company score
- Filtered out from dashboard unless you explicitly show them

**Example:**

Your blacklist: ["Contractor Corp", "Spam Recruiting Inc"]

Jobs from these companies won't appear in your job list.

### Fuzzy Matching

The system uses smart fuzzy matching to recognize companies:

**Handles variations:**

- "Microsoft Inc" = "Microsoft Inc." = "Microsoft" = "MSFT"
- "Amazon.com Inc" = "Amazon"
- Strips company suffixes: Inc, LLC, Ltd, Corp, Co, PLC, GmbH, AG

**Prevents false matches:**

- "Apple" doesn't match "Pineapple"
- "Tech Solutions" doesn't match "Solutions Inc"

### Configuration in Settings

Navigate to **Settings → Scoring → Company Preferences**:

1. **Whitelist**
   - Add company names you want to prioritize
   - Companies added get +50% company score bonus

2. **Blacklist**
   - Add company names to exclude
   - Jobs from blacklisted companies are hidden

3. **Fuzzy Matching Sensitivity**
   - Tight: Exact company name match required
   - Loose: Allow variations (Inc, LLC, punctuation differences)

### Integration with Market Intelligence

JobSentinel combines company preferences with company research data:

- **Company ratings** from Glassdoor/Indeed
- **Funding status** (for startups)
- **Industry classification**
- **Size** (startup, small, mid-market, enterprise)

When you research a company in Market Intelligence, you can save it to whitelist/blacklist directly.

---

## 5. Recency (5%)

The recency factor prioritizes fresh job postings over stale ones.

### How It Works

Newer jobs score higher than older ones, with a gradual decline over time:

| Posting Age | Score |
|-------------|-------|
| Posted today | 100% |
| Posted 1 week ago | 90% |
| Posted 2 weeks ago | 80% |
| Posted 1 month ago | 70% |
| Posted 2 months ago | 40% |
| Posted 3+ months ago | 10% |

### Why It Matters

- **Fresh jobs** are more likely to be actively hiring
- **Old postings** are often ghosts or already filled
- **Recency as a signal** of company engagement

Recency also factors into [Ghost Job Detection](ghost-detection.md)—very old jobs get flagged as
potentially fake.

### Configuration in Settings

Navigate to **Settings → Scoring → Recency**:

1. **Recency Weight Impact**
   - By default: 5% of total score
   - Can be adjusted (minimum 1%, maximum 20%)

2. **Decay Curve**
   - Linear: Score decreases steadily
   - Aggressive: Score drops quickly after 1 month
   - Lenient: Score stays high for up to 3 months

3. **Minimum Age to Filter**
   - Hide jobs older than X days (optional)
   - Example: Hide jobs over 60 days old

---

## Score Breakdown Modal

Click any score to see exactly how it was calculated.

### What You'll See

```text
Total Score: 78%

Score Breakdown:
├─ Skills (40%):       64% × 40% = 25.6%
│  ├─ Title Match:     100%
│  ├─ Keywords:        40%
│  └─ Resume Match:    82%
│
├─ Salary (25%):       80% × 25% = 20.0%
│  └─ $145k vs target $150k
│
├─ Location (20%):     90% × 20% = 18.0%
│  └─ Hybrid vs your Remote Preferred
│
├─ Company (10%):     100% × 10% = 10.0%
│  └─ Microsoft on whitelist
│
└─ Recency (5%):       100% × 5% = 5.0%
   └─ Posted 3 days ago
```

### Why Each Factor Was Scored

Each factor shows:

- **Current score** for that factor
- **Weight in overall score** (e.g., 40% for skills)
- **Contribution** to your total (e.g., 64% × 40% = 25.6%)
- **Reason** for the score

This helps you understand what made the algorithm score the job high or low—useful for deciding
whether to override the score and apply anyway.

### Adjusting Weights

In the breakdown modal, you can:

1. **See current weights** (default 40/25/20/10/5)
2. **Click "Customize Weights"** to adjust them
3. **Preview updated scores** across your entire job list
4. **Save changes** to apply permanently

---

## How Scores Are Calculated

### Step-by-Step Example

Let's score a real job:

**Job:** "Senior React Developer at Microsoft"

```text
Title:       Senior React Developer
Company:     Microsoft
Location:    Seattle, WA (Hybrid with 2-3 days/week onsite)
Salary:      $160,000/year
Posted:      5 days ago
Description: 5+ years React, TypeScript, Node.js, Docker, AWS,
            strong communication, mentoring experience
```

**Your Configuration:**

```text
Target Salary:        $150,000
Preferred Location:   Remote Preferred (but open to hybrid)
Skills Allowlist:     Software Engineer, React Developer, Backend Engineer
Skills Boosters:      React, TypeScript, Docker, AWS
Company Whitelist:    Microsoft, Google, Amazon
Resume:              Uploaded (React ✓, TypeScript ✓, Docker ✓, Node.js ✓, AWS ✓)
```

### Calculation

**1. Skills (40% weight)**

```text
Title Match:
  "Senior React Developer" matches "React Developer" → 100%

Resume Match:
  Your skills: React, TypeScript, Docker, Node.js, AWS (5/5 required)
  Match: 5/5 = 100%

Keywords Boost:
  ✓ React       (boosted keyword found)
  ✓ TypeScript  (boosted keyword found)
  ✓ Docker      (boosted keyword found)
  ✓ AWS         (boosted keyword found)
  ✓ Node.js     (found, not boosted) +0%
  Keywords Score: 100%

Skills Factor:
  = (100% title × 0.3) + (100% resume × 0.7) + (100% keywords × adjusted)
  = 100%

Contribution to Total: 100% × 40% = 40%
```

**2. Salary (25% weight)**

```text
Job Salary:      $160,000
Target Salary:   $150,000
Ratio:           160,000 ÷ 150,000 = 107% (above target)

Salary Score:    100% (107% is in the 100-120% range = full score)

Contribution to Total: 100% × 25% = 25%
```

**3. Location (20% weight)**

```text
Your Preference:     Remote Preferred
Job Type:           Hybrid
Score for Hybrid when Remote Preferred: 70%

Contribution to Total: 70% × 20% = 14%
```

**4. Company (10% weight)**

```text
Job Company:     Microsoft
Your Whitelist:  [Microsoft, Google, Amazon]

Company Match:   Yes (exact match)
Company Score:   100% (50% base + 50% whitelist bonus)

Contribution to Total: 100% × 10% = 10%
```

**5. Recency (5% weight)**

```text
Posted:        5 days ago
Score Curve:   Linear decay from 100% at day 0 to 10% at day 90

Days:          5
Score:         100% - (5 ÷ 90 × 90%) = 95%

Contribution to Total: 95% × 5% = 4.75%
```

### Final Score

```text
Total = 40% + 25% + 14% + 10% + 4.75% = 93.75% ≈ 94%
```

---

## Customizing Weights

Not all factors matter equally to you. Customize weights to match your priorities.

### When to Adjust Weights

- **Job hopping?** Increase recency (find fresh opportunities)
- **Salary negotiation?** Increase salary (find high-paying roles)
- **Specific tech stack?** Increase skills (prioritize exact match)
- **Dream companies?** Increase company (prioritize whitelisted)
- **Full remote required?** Increase location (filter aggressively)

### How to Customize

1. **Navigate to Settings → Scoring**
2. **Click "Customize Weights"**
3. **Adjust sliders** for each factor:
   - Skills: 20-60% (default 40%)
   - Salary: 10-40% (default 25%)
   - Location: 10-30% (default 20%)
   - Company: 5-20% (default 10%)
   - Recency: 1-15% (default 5%)
4. **Preview updated scores** on your job list (live)
5. **Save changes**

The system ensures total always equals 100%.

### Weight Presets

Quick shortcuts for common scenarios:

- **Tech Stack Focus** - Skills 50%, Salary 20%, Location 15%, Company 10%, Recency 5%
- **Location Focused** - Skills 30%, Salary 20%, Location 35%, Company 10%, Recency 5%
- **Company Focused** - Skills 30%, Salary 20%, Location 15%, Company 25%, Recency 10%
- **Salary Maximized** - Skills 25%, Salary 40%, Location 15%, Company 10%, Recency 10%
- **Balanced** - Skills 40%, Salary 25%, Location 20%, Company 10%, Recency 5% (default)

---

## API Reference

### Tauri Commands

```typescript
// Get job score and breakdown
invoke('get_job_score', { job_hash: 'abc123' })
// Returns: { total: 0.78, breakdown: {...}, reasons: [...] }

// Score all jobs
invoke('score_all_jobs')

// Get current scoring config
invoke('get_scoring_config')
// Returns: ScoringConfig

// Update scoring weights
invoke('set_scoring_weights', {
  skills_weight: 0.40,
  salary_weight: 0.25,
  location_weight: 0.20,
  company_weight: 0.10,
  recency_weight: 0.05
})

// Get job score breakdown with explanations
invoke('get_score_breakdown', { job_hash: 'abc123' })
// Returns detailed breakdown with human-readable reasons

// Update skills preferences
invoke('set_skills_preferences', {
  allowed_titles: ['Software Engineer', 'Backend Developer'],
  blocked_titles: ['Sales Engineer'],
  boosted_keywords: ['React', 'TypeScript'],
  excluded_keywords: ['VB.NET']
})

// Update salary preferences
invoke('set_salary_preferences', {
  target_salary: 150000,
  minimum_salary: 100000,
  currency: 'USD'
})

// Update location preferences
invoke('set_location_preference', {
  preference: 'RemotePreferred'  // or RemoteOnly, HybridPreferred, OnsitePreferred, Flexible
})

// Update company whitelist/blacklist
invoke('set_company_preferences', {
  whitelist: ['Microsoft', 'Google'],
  blacklist: ['Spam Corp']
})
```

### Rust API

```rust
use jobsentinel::core::scoring::{ScoringEngine, ScoringConfig};

// Create scoring engine
let scoring_config = ScoringConfig::default();
let engine = ScoringEngine::with_scoring_config(config, scoring_config);

// Score a single job
let job_score = engine.score(&job);
println!("Total: {:.0}%", job_score.total * 100.0);
println!("Skills: {:.0}%", job_score.breakdown.skills * 100.0);

// Score with resume matching
let job_score = engine.score_async(&job).await;
```

---

## Score Distribution & Analytics

### View Score Statistics

Navigate to **Analytics** to see:

- **Score distribution** - Histogram of all job scores
- **Average score** - Mean across all jobs
- **High scorers** - Top 10% of jobs by score
- **Trends** - How scores change over time
- **Factor breakdown** - Which factor contributes most to your scores

### Example Report

```text
Total Jobs Analyzed:    437
Average Score:          62%
Score Range:            12% - 98%

Distribution:
  90-100%: 12 jobs    (3%)
  80-89%:  45 jobs    (10%)
  70-79%:  98 jobs    (22%)
  60-69%:  127 jobs   (29%)
  50-59%:  95 jobs    (22%)
  40-49%:  42 jobs    (10%)
  <40%:    18 jobs    (4%)

Most Impactful Factor:  Skills (average 82%)
Least Impactful:       Recency (average 65%)
```

---

## Related Documentation

- [Synonym Matching Guide](synonym-matching.md) - How equivalent skills are recognized
- [Remote Work Preference Scoring](remote-preference-scoring.md) - Deep dive on location scoring
- [Resume Matcher Integration](resume-matcher.md) - Using AI resume matching
- [Salary AI Feature](salary-ai.md) - Salary prediction algorithm
- [Ghost Job Detection](ghost-detection.md) - Identifying fake postings

---

## Troubleshooting

### Why is my score lower than expected?

**Check the breakdown:**

1. Click the job's score
2. View the breakdown modal
3. Identify the lowest-scoring factors
4. Adjust weights or preferences if needed

**Common reasons:**

- Job title doesn't match your allowlist → Adjust title preferences
- Salary is below target → Set realistic target or adjust weight
- Location doesn't match → Adjust location preference or weight
- Old posting → Adjust recency weight if you're desperate

### Why don't I see my resume skills contributing?

**Verify resume-based scoring is enabled:**

1. Go to **Settings → Scoring → Skills**
2. Check that "Use Resume for Scoring" is ON
3. Ensure you've uploaded a resume in the **Resume** tab

Without these, the system falls back to keyword-only matching.

### My top score job turned out poorly

**Manual feedback:**

1. After applying or interviewing, mark the job as "Good" or "Bad"
2. Your feedback helps improve the algorithm
3. Similar jobs will be scored differently next time

**What to adjust:**

- Update your preferences based on what went wrong
- Add skills you discovered to boosters/excluders
- Add company to blacklist if it was problematic

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| **2.2** | 2026-01-17 | Resume integration, score breakdown modal, weight presets |
| **2.1** | 2025-12-01 | Salary AI prediction, graduated scoring for all factors |
| **2.0** | 2025-11-15 | Multi-factor algorithm launch, customizable weights |
| **1.6** | 2025-10-01 | Initial keyword-based scoring |

---

**Last Updated:** 2026-01-17
**Maintained By:** JobSentinel Core Team
**Implementation Status:** ✅ Complete (All features implemented)
**Next Phase:** ML-based skills matching (v2.3)
