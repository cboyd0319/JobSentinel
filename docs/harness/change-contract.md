# Change Contract

Use this contract before non-trivial feature, bug, security, refactor, or docs
work. It keeps agents scoped and gives reviewers concrete acceptance criteria.

## Required Fields

```text
Problem:
Why this change exists.

Scope:
Files, modules, docs, and behaviors in scope.

Out of scope:
Nearby work intentionally not included.

Lean and DRY:
- Ladder step from docs/harness/engineering-principles.md this change stops at,
  and why nothing smaller works.
- Existing code, stdlib, native platform feature, or installed dependency reused
  instead of new code or a new dependency.
- Duplication removed or avoided.

Product direction:
- How the change maximizes useful job-search automation.
- How it removes arbitrary friction, redundant manual work, or
  engineer-only setup.
- Why any warning, confirmation, disabled state, or block is necessary.
- How user-owned risky paths use warning, consent, review, and a secure local
  path before blocking.

Acceptance criteria:
- Observable behavior or documentation result.
- Edge cases.
- Security or privacy constraints.
- Rule 0 evidence: user privacy and security cannot be weakened.

Audience and ease:
- Who the user is.
- What technical knowledge is assumed.
- How the path stays usable for non-technical job seekers.
- How warnings, confirmations, or disabled states avoid unnecessary friction.
- How the change helps the user get jobs instead of only reducing project risk.
- How the easy path stays automatic when the action is local, reversible, and
  user-reviewed.

Design contract:
- Whether the change touches `docs/design/design-system.md`, `docs/design/README.md`, or
  `docs/design/design-spec.md`.
- Whether the change affects the harness-controlled Quiet Shield redesign
  acceptance gate.
- How it preserves or moves toward Quiet Shield and Protective Navy.
- Visual, responsive, keyboard, accessibility, empty, loading, error, modal,
  toast, settings, and saved-secret UX states to verify.

Source-of-truth docs:
- Existing docs that must stay accurate.
- New docs to create or update.
- Public GitHub wiki pages affected by the change to update, or
  reason no wiki page is affected.

Orchestration:
- Whether this is small enough for one agent or should use the
  architect/coordinator model.
- Sub-agent slices, owned files, off-limits files, and verification each slice
  must run.
- How the coordinator will review and integrate sub-agent work.

Likely files:
- File paths or directories.

Risks:
- Runtime, product, privacy, data, platform, or migration risk.
- Rule 0 risk: any path that could weaken local control, credential safety,
  source boundaries, explicit review, or privacy-preserving defaults.
- Restricted-source risk: whether the change touches sites that may restrict
  scraping, automation, cookies, tokens, browser automation, background access,
  or platform-control bypass.
- Consent path: when risk is account, terms, or source-policy risk rather than
  direct privacy/security risk, document the warning, acknowledgement, and
  secure local path instead of blocking by default.

Sensors:
- Exact commands, manual checks, or reviewer passes needed.

Harness impact:
- Docs, scripts, tests, templates, or recurring checks to update.
- Whether `scripts/harness/contracts/harness.json` needs an owner, startup, platform, or retired-path update to
  keep the design contract from drifting.
- New gap to record if this change exposes missing harness coverage.

Rollback:
- How to undo or disable the change.
```

## Bug Fix Additions

Add:

```text
Reproduction:
Exact steps, command, test, log, screenshot, or user report.

Failure mode:
Observed facts, inferred cause, and unknowns.

User-safe workaround:
Plain-language action a non-technical user can take until the fix ships.

Regression test:
Test or check that fails before the fix and passes after.
```

## Feature Additions

Add:

```text
User story:
Who needs this and why.

UX states:
Loading, empty, error, disabled, narrow-width, keyboard, focus order and
return, accessible names, live-region behavior, contrast, reduced-motion where
relevant, and success states.

Design alignment:
Quiet Shield tone, Protective Navy migration impact, no horizontal scroll,
stable controls, no nested cards, no passive secure-storage prompts, and no
engineer-only UI assumptions.

Support path:
Where a user can recover, copy a safe support report, or get help without
technical knowledge.

Data model:
Input, output, storage, migration, and privacy behavior.
```

## Security Additions

Add:

```text
Trust boundary:
Untrusted input, sensitive output, and privileged operation.

Abuse cases:
What attacker or bad data can do.

Guardrails:
Validation, permissions, rate limits, escaping, sandboxing, and audit evidence.
```

## Completion Handoff

Use this shape in final notes or plan outcomes:

```text
Outcome:
What changed.

Evidence:
Commands or manual checks run.

User-ease evidence:
Copy, screenshot, test, or review proving the flow does not assume technical
knowledge or engineer-only job searches.

Changed files:
Important paths.

Open items:
Remaining gaps, skipped checks, or follow-up risks.
```
