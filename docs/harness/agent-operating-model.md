# Agent Operating Model

This file describes how agents should work inside JobSentinel.

## Roles

Human role:

- Set product intent and risk tolerance.
- Approve security-sensitive and irreversible behavior.
- Review tradeoffs when tests cannot prove correctness.

Agent role:

- Gather live repo context.
- Make scoped changes.
- Run relevant sensors.
- Update durable repo knowledge.
- Escalate unclear product, privacy, security, or destructive choices.

## Context Strategy

Use progressive disclosure:

1. Start with `AGENTS.md`.
2. Open `docs/harness/README.md`.
3. Open one architecture or feature doc for the touched area.
4. Open code and tests.
5. Open broader docs only when the first pass exposes ambiguity.

Avoid loading large docs only to search for one fact. Use `rg` first, then read
the exact section.

## Planning Strategy

Tiny change:

- State scope in chat.
- Inspect files.
- Edit.
- Verify.

Non-trivial change:

- Use `docs/harness/change-contract.md`.
- Add or update an exec plan under `docs/plans/active/`.
- Track progress and decisions in the plan.
- Move plan to `docs/plans/completed/` after completion.

Multi-step or broad change:

- Treat the lead agent as architect, orchestrator, reviewer, and integrator.
- Use `docs/harness/multi-agent-orchestration.md`.
- Delegate disjoint code, docs, tests, audit, or verification slices when this
  reduces elapsed time without creating file conflicts.
- Keep tightly coupled or immediate blocking edits local.
- Require every sub-agent to follow `AGENTS.md`, this harness, Rule 0, active
  plans, and relevant verification sensors. No exceptions.
- Review every sub-agent diff or conclusion before accepting it.

## Implementation Strategy

- Match current code patterns before adding abstractions.
- Keep UI, Tauri commands, business logic, and storage boundaries separate.
- Add tests near changed behavior.
- Keep user data local by default.
- Preserve human-in-the-loop submission for applications.
- Preserve scraper rate limits and platform terms awareness.

## Verification Strategy

Use `docs/harness/verification-matrix.md`.

Default docs-only checks:

```bash
npm run harness:check
npm run lint:md
```

Default frontend checks:

```bash
npm run lint
npm run test:run
```

Default Rust checks:

```bash
cd src-tauri && cargo fmt --all -- --check
cd src-tauri && cargo clippy -- -D warnings
cd src-tauri && cargo test --lib
```

## Handoff Strategy

Every substantial final update should include:

- Files changed.
- Sub-agent slices accepted or rejected when orchestration was used.
- Verification run.
- Known gaps or skipped checks.
- Next best step when work remains.

Do not claim broad system health from narrow checks. Name what was verified.
