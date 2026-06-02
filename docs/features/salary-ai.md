# Pay Protection

Pay Protection helps job seekers compare role pay against salary floors, range
evidence, and negotiation notes while keeping sensitive search data local.

The goal is to help users avoid being underpaid, not to imply that pay gaps are
fixed by asking harder.

## What It Does

- Compare a role against public salary records and local benchmark data.
- Let users enter a salary floor as a walk-away number.
- Show "Pay not listed" on job cards when structured salary fields are empty.
- Show a below-floor warning on job cards when listed pay tops out below the
  user's saved floor.
- Flag when a floor is below credible range evidence or when an offer may be
  under-leveled.
- Draft editable negotiation notes grounded in role scope, written ranges, and
  user-confirmed facts.
- Compare offers across pay, benefits, schedule, level, promotion path, and
  risk.

## How to Use It

1. Open **Pay Protection**.
2. Enter a job title, location, role stage, and optional salary floor.
3. Review the range evidence and pay-floor guidance.
4. Draft negotiation notes only after checking that the facts are true.

Salary floors are private user choices. JobSentinel treats them as planning
inputs, not as self-worth scores.

## Pay Protection Rules

- Warn when listed or estimated pay is below the user's floor.
- Warn when the user's target is below the lower-pay part of a credible sample
  or below a credible posted midpoint.
- Treat missing pay as useful evidence about transparency, not as neutral or as
  proof of bad intent.
- Check whether title, scope, decision rights, team size, budget, and promotion
  path match the offered level.
- Help users redirect salary-history questions toward the role range and target
  pay.
- Label source, date, sample size, and coverage limits.
- Avoid protected-class inference for salary guidance.
- Avoid copy that implies marginalized workers caused pay gaps by negotiating
  poorly.

## Data Sources

JobSentinel can use public H1B salary records and local benchmark tables. H1B
records are useful but incomplete. They may overrepresent visa-sponsored roles,
large employers, salaried work, and specific locations.

Future data sources need source review before use. Salary data should show
coverage limits and last-updated dates wherever possible.

## Offer Comparison Guidance

Offer guidance should be evidence-bounded:

- Above current benchmark: compare equity risk, benefits, schedule, level, and
  promotion path before deciding.
- Near current benchmark: review the written range, scope, and promotion timing
  before countering.
- Below current benchmark: ask about range, level, and scope before accepting.

Negotiation notes should never invent competing offers, legal claims, skills,
credentials, accomplishments, or market data.

<details>
<summary><strong>For maintainers</strong></summary>

## Technical Shape

```text
public salary records
  -> aggregated salary benchmarks
  -> pay range evidence
  -> pay-floor guidance
  -> editable negotiation notes
```

Core tables:

- `h1b_salaries`: public salary record imports.
- `salary_benchmarks`: normalized benchmark ranges by title, location, and
  role stage.
- `job_salary_predictions`: cached local predictions for saved jobs.
- `negotiation_templates`: editable note templates.
- `negotiation_history`: local offer and negotiation records.

Core commands:

- `get_salary_benchmark`
- `predict_salary`
- `generate_negotiation_script`
- `compare_offers`

Command logs must not include raw job titles, locations, salary floors, offer
amounts, resume text, or negotiation notes.

</details>

## Verification

```bash
npm run test:run -- src/pages/Salary.test.tsx
npm run lint:bloat
cd src-tauri && cargo fmt --all -- --check
```

Pay guidance changes should also be reviewed against:

- [Pay-equity research](../research/pay-equity.md)
- [Salary-negotiation research](../research/salary-negotiation.md)
- [Responsible AI](../../RESPONSIBLE_AI.md)
