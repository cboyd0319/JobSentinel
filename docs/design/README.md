# JobSentinel Design Docs

JobSentinel design docs define how the app should look, feel, and behave for
job seekers. They are product contracts, not inspiration boards.

## Canonical Sources

| Source | Purpose |
| --- | --- |
| [Design System](design-system.md) | Canonical design system entrypoint with tokens, visual stance, and core rules. |
| [Design Spec](design-spec.md) | Maintained product design spec for screens, components, privacy UX, and accessibility. |
| [Local Secret Vault And Keychain Integration](../security/KEYRING.md) | Local secret-vault, encrypted database, Keychain, Touch ID, and passphrase design contract. |
| [Style Guide](../style-guide/README.md) | Product language, glossary, and writing rules. |
| [Frontend Testing](../developer/FRONTEND_TESTING.md) | Visual, responsive, keyboard, and E2E verification expectations. |

## How To Use These Docs

Read [Design System](design-system.md) before changing visual components, user
flows, dashboards, modals, navigation, empty states, toasts, or settings. Use
the design spec when screen-level behavior or product interaction rules are in
scope.

Read [Local Secret Vault And Keychain Integration](../security/KEYRING.md)
before changing saved-secret
flows, alert credentials, USAJobs access-code handling, Settings secure-status
copy, database encryption, backups, or support reports.

For broad UI changes, also read:

- [Change Contract](../harness/change-contract.md)
- [Verification Matrix](../harness/verification-matrix.md)
- [Writing for Job Seekers](../style-guide/WRITING-FOR-JOB-SEEKERS.md)

## Harness Lock

The Quiet Shield redesign is a harness-controlled active-goal acceptance gate.
`scripts/harness/contracts/harness.json` records the harness owners; this design directory,
`design-system.md`, and the compatibility pointer under `docs/developer/` must stay
present and aligned.

Any UI or UX change must say whether it affects the design contract. Broad
visual changes must leave evidence in the active plan or status docs and use
Computer Use or Playwright screenshots for touched routes, modals, toasts,
settings, navigation, keyboard flow, and narrow-width states before release
work resumes.

## Maintenance Rules

- Keep [Design System](design-system.md) as the short canonical design-system
  source.
- Keep long-form product design guidance in this directory.
- Do not paste unreviewed design drafts into `docs/developer/`.
- Keep privacy and saved-secret UX aligned with the encrypted local vault
  contract. Passive screens must not trigger repeated credential prompts.
- Do not claim the full Protective Navy migration is complete until visual
  verification confirms every major route and state.
- Keep docs within harness line budgets so reviewers can keep them current.
