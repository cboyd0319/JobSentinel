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

## Scope Discipline

Keep one feature or slice active at a time. Finish it or explicitly park it
before starting another.

- Pick the highest-priority unfinished item from `docs/plans/index.json` or the
  active status, and keep edits inside that scope.
- Use the change contract `Scope` and `Out of scope` fields to draw the
  boundary. Required-only. Nearby work that is not required goes to the
  tech-debt tracker, not into the current change.
- A slice is done only when it clears the relevant layers of
  `completion-gate.md` and has a row in `evidence-log.md`. Do not start a new
  slice to escape an unfinished one.
- This is a discipline rule, not a sensor. JobSentinel tracks workstreams, not a
  single global feature, so scope is held by the change contract and review, not
  by an automated single-active-feature check.

## Implementation Strategy

- Follow the DRY ladder in [engineering principles](engineering-principles.md):
  prefer YAGNI, then the standard library, a native platform feature, or an
  installed dependency before new code, and reduce duplication.
- Match current code patterns before adding abstractions.
- Keep UI, Tauri commands, business logic, and storage boundaries separate.
- Add tests near changed behavior.
- Keep user data local by default.
- Preserve human-in-the-loop submission for applications.
- Preserve scraper rate limits and platform terms awareness.
- Do not commit machine-specific absolute local paths. Use repo-relative paths,
  file names, or `<repo-root>` and `<home>` placeholders. Synthetic absolute
  paths belong only in sanitizer or redaction tests.

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

## Related Harness Docs

- [Engineering principles](engineering-principles.md)
- [Harness map and sensor registry](harness-map.md)
- [Completion gate and clean state](completion-gate.md)
- [Evidence log](evidence-log.md)
- [Reliability and observability](reliability.md)
- [Quality grades](quality-grades.md)
- [Product sense](product-sense.md)
