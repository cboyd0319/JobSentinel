# JobSentinel Claude Guide

Read [AGENTS.md](AGENTS.md) first. It is the repo-level agent entrypoint.

This file exists for tools that load `CLAUDE.md` instead of `AGENTS.md`.
Do not duplicate long project manuals here.

## Source Of Truth

- [Harness engineering](docs/harness/README.md)
- [Change contract](docs/harness/change-contract.md)
- [Verification matrix](docs/harness/verification-matrix.md)
- [Architecture](docs/developer/ARCHITECTURE.md)
- [Testing](docs/developer/TESTING.md)
- [Contributing](docs/developer/CONTRIBUTING.md)

If this file conflicts with `AGENTS.md` or `docs/harness/`, use `AGENTS.md`
and `docs/harness/`.

## Claude-Specific Notes

- Use repo files as current evidence.
- All development is DRY and lean: YAGNI, standard library and native platform
  first, no new dependency for a few lines, no duplication, documentation is
  product. See [engineering principles](docs/harness/engineering-principles.md).
- Rule 0: user privacy and security are non-negotiable.
- External AI stays optional, disabled by default, and routed through the
  privacy-first AI gateway.
- User-facing flows must assume zero technical knowledge and support technical
  plus non-technical job searches.
- Preserve responsible-use boundaries: truthful application guidance,
  human-in-the-loop submission, and source controls.
- Keep work scoped and verified.
- Update docs when behavior, setup, architecture, commands, or security rules
  change.
- Run `npm run harness:check` after changing agent-facing docs.
