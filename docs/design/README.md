# JobSentinel Design Docs

JobSentinel design docs define how the app should look, feel, and behave for
job seekers. They are product contracts, not inspiration boards.

## Canonical Sources

| Source | Purpose |
| --- | --- |
| [DESIGN.md](../../DESIGN.md) | Canonical design system entrypoint with tokens, visual stance, and core rules. |
| [Design Spec](design-spec.md) | Maintained product design spec for screens, components, privacy UX, and accessibility. |
| [Style Guide](../style-guide/README.md) | Product language, glossary, and writing rules. |
| [Frontend Testing](../developer/FRONTEND_TESTING.md) | Visual, responsive, keyboard, and E2E verification expectations. |

## How To Use These Docs

Read [DESIGN.md](../../DESIGN.md) before changing visual components, user
flows, dashboards, modals, navigation, empty states, toasts, or settings. Use
the design spec when screen-level behavior or product interaction rules are in
scope.

For broad UI changes, also read:

- [Change Contract](../harness/change-contract.md)
- [Verification Matrix](../harness/verification-matrix.md)
- [Writing for Job Seekers](../style-guide/WRITING-FOR-JOB-SEEKERS.md)

## Maintenance Rules

- Keep root [DESIGN.md](../../DESIGN.md) as the short canonical design-system
  source.
- Keep long-form product design guidance in this directory.
- Do not paste unreviewed design drafts into `docs/developer/`.
- Do not claim the full Protective Navy migration is complete until visual
  verification confirms every major route and state.
- Keep docs within harness line budgets so reviewers can keep them current.
