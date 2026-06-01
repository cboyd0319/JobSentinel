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

Acceptance criteria:
- Observable behavior or documentation result.
- Edge cases.
- Security or privacy constraints.
- Rule 0 evidence: user privacy and security cannot be weakened.

Audience and ease:
- Who the user is.
- What technical knowledge is assumed.
- How the path stays usable for non-technical job seekers.

Source-of-truth docs:
- Existing docs that must stay accurate.
- New docs to create or update.

Likely files:
- File paths or directories.

Risks:
- Runtime, product, privacy, data, platform, or migration risk.
- Rule 0 risk: any path that could weaken local control, credential safety,
  source boundaries, explicit review, or privacy-preserving defaults.

Sensors:
- Exact commands, manual checks, or reviewer passes needed.

Harness impact:
- Docs, scripts, tests, templates, or recurring checks to update.
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
Loading, empty, error, disabled, narrow-width, keyboard, and success states.

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
