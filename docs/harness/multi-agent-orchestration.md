# Multi-Agent Orchestration Contract

Use this contract when work becomes broad enough that parallel senior
developer, engineer, reviewer, or researcher agents can reduce elapsed time
without increasing integration risk.

Small tasks can stay with one agent. Larger multi-step plans should optimize
for safe parallelism.

## Rule

The coordinator is the architect and integrator. Sub-agents execute bounded
work. Every sub-agent must follow the same repo harness as the coordinator. No
exceptions.

Sub-agents must obey:

- `AGENTS.md`
- `docs/harness/README.md`
- `docs/harness/change-contract.md`
- `docs/harness/verification-matrix.md`
- Rule 0 privacy and security requirements
- Active plan and handoff docs that apply to their slice

Delegation never bypasses privacy, security, source-boundary, review,
verification, or user-ease rules.

## When To Orchestrate

Use multi-agent orchestration when at least one condition is true:

- Work has two or more independent implementation slices.
- Docs, tests, product review, and code can advance in parallel.
- A specialist review can run while implementation continues.
- Verification can run independently against a completed slice.
- Active plans would otherwise stall on context or elapsed time.

Keep small, tightly coupled, or urgent blocking edits local.

## Coordinator Duties

The coordinator owns:

- Overall architecture, sequencing, and tradeoffs.
- Work decomposition and file ownership.
- Sub-agent prompt quality.
- Conflict prevention.
- Review of every sub-agent diff or conclusion.
- Final integration.
- Final verification.
- Active plan, handoff, and harness updates.

The coordinator remains accountable for correctness. A sub-agent success report
is evidence to review, not proof to accept blindly.

## Sub-Agent Contract

Every delegated task must include:

- Role and scope.
- Owned files or modules.
- Files explicitly off limits.
- Product intent and acceptance criteria.
- Rule 0 and privacy/security constraints.
- Expected tests or docs checks.
- Required final output: files changed, summary, verification, risks.

For code-writing agents, require direct edits only within their owned scope.
Tell each agent that other agents may be editing nearby files and that they
must not revert work they did not create.

## Ownership Rules

- Assign disjoint file sets whenever possible.
- Avoid two writers in the same file unless one is explicitly integration-only.
- Use read-only agents for audits that inform work already owned elsewhere.
- Use reviewer agents after a coherent slice lands, not as a substitute for
  tests.
- Close completed agents promptly.

If scopes collide, stop delegation for that slice and integrate locally.

## Review Rules

Before accepting sub-agent work:

- Inspect the diff.
- Confirm it stayed in scope.
- Confirm user-facing copy matches broad job-seeker and zero-technical-skill
  rules.
- Confirm Rule 0 was not weakened.
- Confirm tests prove the intended behavior, not only rendering.
- Run focused verification for the accepted slice.

Do not claim implementation exists until it is in the local working tree and
verified. Do not claim broad completion from a narrow sub-agent check.

## Handoff Rules

For multi-agent work, record:

- Slices delegated.
- Agents or roles used.
- Files each slice owned.
- Verification each slice ran.
- Coordinator verification after integration.
- Remaining risks or skipped checks.

Durable findings belong in active plans, feature docs, harness docs, or the
debt tracker. Do not leave them only in chat.
