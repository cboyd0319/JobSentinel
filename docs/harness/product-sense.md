# Product Sense

Durable product judgment that agents cannot reliably infer from code alone. This
file captures cross-cutting priorities and no-go patterns. Concrete flows live in
`docs/features/` and the design contracts; this file is the priority lens above
them.

Source framework: WalkingLabs learn-harness-engineering, OpenAI advanced
repo-template product-sense document. See
<https://walkinglabs.github.io/learn-harness-engineering/>.

## Product Core

- Primary user: any job seeker, including people with zero technical knowledge,
  not only engineers.
- Job to be done: help people find and pursue jobs in every secure, local,
  user-directed way JobSentinel can support.
- Main frustration to remove: tedious, manual, repetitive job-search work and
  engineer-only setup.
- Quality bar for acceptance: a non-technical user can complete the flow without
  reading code, a terminal, or developer tools, and their data stays local.

## Product Rules

- Favor user-visible reliability over feature count.
- Treat ambiguous behavior as a spec gap, not permission to guess. Escalate.
- Prefer informed consent, plain-language warnings, and secure enablement over
  arbitrary product blocks when privacy and security boundaries stay intact.
- When a change alters what users see or trust, update the matching feature or
  design doc in the same pass.
- Keep the easy path automatic when the action is local, reversible, and
  user-reviewed.

## No-Go Patterns

- Hidden destructive actions, or any external side effect the user did not
  choose.
- Silent failure with no user-visible recovery path.
- Unclear source of truth for visible state.
- Engineer-only UI: terminal output, raw logs, stack traces, or debugging steps
  shown to end users.
- Credential or session-cookie capture, hidden background access, or
  platform-control bypass. These remain hard stops under Rule 0.
- A feature that cannot be explained to a non-technical job seeker in one
  sentence.

## How To Use This File

- Read it before product or UX decisions, alongside `AGENTS.md` and the design
  contracts.
- If a change conflicts with a rule here, resolve toward Rule 0 and broad-
  audience usability, or escalate the tradeoff to the human.

## Related Docs

- [Agent operating model](agent-operating-model.md)
- [Change contract](change-contract.md)
- [Design contract](../design/design-system.md)
- [Experience guide](../style-guide/README.md)
