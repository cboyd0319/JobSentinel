# Posting Risk Scoring

Use this rubric when a posting has multiple warnings or the next action is not
obvious. It protects time without overclaiming employer intent.

## Source Hierarchy

| Confidence | Source evidence |
| ---------- | --------------- |
| High | Official company career page or named ATS page, current posting, matching company domain, clear application route |
| Medium | Reputable job board, recruiter message with identifiable company context, enough role detail, but not all facts confirmed |
| Low | Scraped, reposted, anonymous, expired, redirected, unverifiable, or missing basic facts |

## Evidence Labels

- `Observed`: visible in the posting, official page, recruiter message, or user
  artifact.
- `User-provided`: stated by the user but not independently verified.
- `Unknown`: not present or not confirmed.
- `Do not infer`: protected-class information, employer intent, eligibility,
  salary flexibility, or legitimacy beyond the evidence.

## Risk Categories

| Category | Higher-risk evidence | Not enough by itself |
| -------- | -------------------- | -------------------- |
| Scam evidence | money request, fake check, crypto, payment app, SSN or bank data before offer, messaging-app-only interview, impersonated domain | missing pay, vague copy, or third-party board |
| Source risk | domain mismatch, broken route, suspicious redirects, no company trace, expired posting | role appears on a board before the company site is checked |
| Fit risk | hard requirement the user cannot meet, location/schedule mismatch, below floor pay | preferred qualification gap |
| Effort risk | unpaid extensive test, unclear deliverable ownership, repeated repost with no contact | normal application questions |

## Decision Rules

- `Apply`: high or medium source confidence, must-haves workable, no direct scam
  evidence, and tailoring effort is reasonable.
- `Verify first`: low source confidence, missing hard facts, broad pay risk, or
  unclear route.
- `Network first`: role looks relevant but source, team, or recruiter context
  needs confirmation.
- `Save for later`: reasonable fit but lower urgency or incomplete context.
- `Skip`: direct scam evidence, failed hard requirement, below-floor pay, or
  effort is not justified by confidence.

Always separate scam evidence from poor fit and low confidence.
