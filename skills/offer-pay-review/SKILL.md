---
name: offer-pay-review
description: Review written offers, listed pay, salary floors, benefits, schedule, level, scope, risks, and negotiation notes. Use when comparing offers, checking below-floor pay, preparing a counter, or deciding whether to accept, decline, or ask questions.
license: MIT
metadata:
  jobsentinel_version_target: "2.9.0"
---

# Offer Pay Review

Use this skill to compare pay and offer details against the user's stated needs
and the written offer. Keep the review evidence-bounded.

## Inputs

Use only facts the user provides: written offer, listed range, salary floor,
target range, benefits, location, schedule, bonus, equity, start date, role
scope, title, reporting line, travel, and promotion path.

## Workflow

1. Separate written offer facts, verbal recruiter claims, public market data,
   and user assumptions. Treat written facts as strongest.
2. Compare known pay against the user's floor or target.
3. Compare total compensation: base, bonus, commission, equity, sign-on,
   benefits, retirement, PTO, healthcare, equipment, education budget, and
   review timing.
4. Review role scope: title, level, decision rights, team size, budget,
   expected hours, travel, schedule, and support.
5. Review offer constraints: vesting, cliffs, option exercise periods, repayment
   clauses, relocation terms, noncompete or nonsolicit language, overtime, and
   termination terms when present.
6. Review life-cost factors: commute, parking, relocation, travel, remote or
   hybrid terms, schedule, childcare/caregiving constraints, and start date.
7. Check deadline pressure: written deadline, recruiter pressure, missing
   documents, open questions, and whether the user has enough time to decide.
8. Check pay-equity and anchoring risks: salary-history requests, vague or
   broad ranges, downleveling, lower-title/lower-pay tradeoffs, and pressure to
   decide before written facts are complete.
9. Identify questions to ask before accepting or countering.
10. If comparing multiple offers, use a user-weighted decision matrix for
   total compensation, schedule, commute or relocation, growth, risk, and
   must-haves. Do not let a numeric score override a failed must-have.
11. Draft counter, clarification, or decline notes only from confirmed facts.
    Frame them as editable notes, not pressure scripts.
12. End with options: accept, counter, ask questions, decline, or pause.

## Load References

- Load `references/offer-pay-rubric.md` for total-comp comparison, deadline
  pressure, written-vs-verbal evidence, counter notes, and decline notes.

## Output

Produce:

- Offer fact table.
- Pay-floor and target comparison.
- Scope and schedule risks.
- Benefits and non-pay tradeoffs.
- Contract or repayment terms to verify with a qualified professional when
  needed.
- Questions to ask.
- Counter or clarification note draft, if requested.

Use `assets/offer-comparison-template.md` for a reusable comparison.

## Handoff

- Use `$application-tracking` to record written offer facts, deadline, response,
  accept, decline, withdrawal, or open questions.
- Use `$networking-outreach` for recruiter replies, counter notes, clarification
  requests, acceptance, or decline messages.
- Use `$interview-prep` if the user needs another conversation before deciding.

## Guardrails

- Do not invent competing offers, market data, current pay, legal claims, or
  accomplishments.
- Do not pressure the user to negotiate if the role violates must-haves.
- Do not treat H1B, public salary, or benchmark data as a complete market.
- Do not infer protected-class details or give legal advice.
- Do not blame the user for pay gaps, ambiguity, or negotiation outcomes.
- Keep private salary floors and offer notes local unless the user explicitly
  chooses to share them.
