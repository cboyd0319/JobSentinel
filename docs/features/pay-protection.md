# Pay Protection

Pay Protection helps job seekers compare role pay against salary floors, range
evidence, and negotiation notes while keeping sensitive search data local.

The goal is to help users avoid being underpaid, not to imply that pay gaps are
fixed by asking harder.

## What It Does

- Compare a role against public salary records and local benchmark data.
- Let users enter a salary floor as a walk-away number.
- Show "Pay not listed" on job cards when structured salary fields are empty,
  and, when a salary floor exists, ask the user to compare the role before
  tailoring.
- Show a regional pay-range review cue when a saved job has no complete pay
  range and its location matches a supported pay-transparency region.
- Show missing listed-pay cues during job import preview so users know to
  verify pay before saving and tailoring a posting.
- Show listed-pay comparison rows in the dashboard using the same malformed-pay
  fallback as job cards.
- Show a below-floor warning on job cards when listed pay tops out below the
  user's saved floor.
- Keep open-ended minimum-only pay ranges visible without a below-floor warning,
  because a listed minimum alone does not prove the role tops out below the
  user's floor.
- Show minimum-only listed pay as open-ended range evidence even when the user
  has not saved a salary floor, so the realistic top range is still checked
  before tailoring.
- Show top-only listed pay as weak range evidence even when the user has not
  saved a salary floor, so the starting pay is confirmed before tailoring.
- When open-ended starting pay is below the user's floor, show it as a range
  review cue rather than a below-floor claim.
- Flag very wide listed pay ranges as weaker range evidence to check before
  tailoring.
- Flag when a floor is below credible range evidence or when a role may be
  listed at too low a title or pay level.
- Show a past-pay question guardrail that redirects toward role range and
  target pay instead of old compensation.
- Show a level and scope checklist before users accept a pay range at face
  value.
- Draft editable negotiation notes grounded in role scope, written ranges, and
  user-confirmed facts.
- Separate verbal or recruiter-stated numbers from written offer amounts before
  drafting negotiation notes.
- Draft negotiation notes only from a user-entered written offer and
  user-entered target range. Benchmark medians or higher-range points must not
  become the current offer.
- Show offer decision fields for deadline, total compensation, commute,
  relocation, and deadline pressure before the user accepts, counters, or
  declines.
- Provide local counter and decline starter templates without sending them.
- Compare offers across pay, benefits, schedule, level, promotion path, and
  risk.

## How to Use It

1. Open **Pay Protection**.
2. Enter a job title, location, role stage, and optional salary floor.
3. Review the range evidence and pay-floor guidance.
4. Separate verbal numbers from the written offer amount.
5. Review deadline, total compensation, commute, relocation, and pressure
   notes.
6. Draft negotiation notes only after checking that the facts are true.

Salary floors are private user choices. JobSentinel treats them as planning
inputs, not as self-worth scores.

## Pay Protection Rules

- Warn when listed or estimated pay is below the user's floor. For job cards,
  use the warning only when the known top listed pay is below the floor.
- Warn when the user's target is below the lower-pay part of a credible sample
  or below a credible posted midpoint.
- Treat a user-entered floor below the lower-pay part of a credible sample as
  anchoring-prone pay guidance. Ask the user to check title, level, and written
  ranges before lowering expectations.
- Treat missing pay as useful evidence about transparency, not as neutral or as
  proof of bad intent. Missing-pay job-card and import-preview guidance is a
  review cue, not a stale-posting or scam claim.
- Treat regional pay-range guidance as a plain user reminder, not legal advice
  and not proof that an employer or job board did anything wrong. The user
  should open the employer posting and confirm the written range before
  tailoring or applying.
- Treat malformed listed-pay values, such as non-finite, negative, or reversed
  structured ranges, as unavailable instead of showing them as real pay
  evidence in job cards or dashboard comparisons.
- Treat very wide listed pay ranges as weaker evidence about the real role
  level, schedule, and realistic pay.
- Treat top-only listed pay, such as "up to" amounts, as weaker evidence until
  the starting pay is confirmed.
- When first-run setup accepts an hourly pay floor, convert it to the saved
  yearly pay floor for comparisons and keep hourly copy visible in setup
  review.
- Check whether title, scope, decision rights, team size, budget, and promotion
  path match the offered level.
- Check schedule, travel, expected hours, location, benefits, review timing,
  and support before treating a range as enough evidence.
- Treat verbal numbers as context. Ask for written base pay, bonus, equity,
  benefits, work location, start date, and decision deadline before countering
  or deciding.
- Show deadline pressure as a review cue, especially when the user reports a
  same-day or exploding deadline.
- Include commute, parking, transit, childcare, travel days, relocation, and
  move costs in offer review prompts.
- Help users redirect current-pay or past-pay questions toward the role range
  and target pay without making jurisdiction-specific legal claims.
- Label source, date, sample size, and coverage limits.
- Label benchmark sample quality as thin, useful, or stronger. Thin samples are
  weak signals and should be checked against written ranges, role scope, and
  current postings.
- Avoid protected-class inference for salary guidance.
- Avoid copy that implies marginalized workers caused pay gaps by negotiating
  poorly.

## Regional Pay Range Checks

As of the 2026-06-19 official-source review, JobSentinel has pay-range review
rules for Colorado, California, Washington, New York, Illinois, Minnesota,
Maryland, Massachusetts, New Jersey, Vermont, Hawaii, and the District of
Columbia.

When a saved job in one of those regions has no complete structured pay range,
job cards show **Check pay range**. This is a review cue only. It does not
decide whether a posting is legally covered, whether an exemption applies, or
whether a source omitted information that exists on the employer page.

Current source links are kept with the shared taxonomy in
`src/shared/payTransparencyRules.ts` and should be rechecked before adding
regions or changing jurisdiction-specific copy. The 2026-06-19 review used
official sources from Colorado CDLE, California DIR, Washington L&I, New York
DOL, Illinois DOL, Minnesota Revisor of Statutes, Maryland Labor,
Massachusetts Attorney General, New Jersey DOL, Vermont General Assembly,
Hawaii Civil Rights Commission, and the Council of the District of Columbia.

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

Negotiation notes should also never invent the current offer. The user must
enter the written offer and target range before notes are drafted, and
unreplaced template placeholders should stay hidden instead of appearing as
ready-to-use text.

Counter and decline starters are local drafts. They should remind the user to
confirm written terms, total compensation, commute or relocation costs, and the
decision deadline. They must not submit anything or imply that JobSentinel has
chosen the user's answer.

Pay guidance changes should also be reviewed against:

- [Pay-equity research](../research/pay-equity.md)
- [Salary-negotiation research](../research/salary-negotiation.md)
- [Responsible AI](../../RESPONSIBLE_AI.md)
