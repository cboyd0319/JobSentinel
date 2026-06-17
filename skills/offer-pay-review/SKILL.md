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

1. Separate written offer facts from assumptions.
2. Compare known pay against the user's floor or target.
3. Review role scope: title, level, decision rights, team size, budget,
   expected hours, travel, schedule, and support.
4. Review total package: base pay, bonus, equity, benefits, leave, retirement,
   healthcare, remote/hybrid terms, commute, relocation, and review timing.
5. Identify questions to ask before accepting or countering.
6. Draft negotiation notes only from confirmed facts.
7. End with options: accept, counter, ask questions, decline, or pause.

## Output

Produce:

- Offer fact table.
- Pay-floor and target comparison.
- Scope and schedule risks.
- Benefits and non-pay tradeoffs.
- Questions to ask.
- Counter or clarification note draft, if requested.

Use `assets/offer-comparison-template.md` for a reusable comparison.

## Guardrails

- Do not invent competing offers, market data, current pay, legal claims, or
  accomplishments.
- Do not pressure the user to negotiate if the role violates must-haves.
- Do not treat H1B, public salary, or benchmark data as a complete market.
- Do not infer protected-class details or give legal advice.
- Keep private salary floors and offer notes local unless the user explicitly
  chooses to share them.
