# JobSentinel Copilot Instructions

Use [../AGENTS.md](../AGENTS.md) as the source of truth for repo guidance.

This file exists because GitHub Copilot reads `.github/copilot-instructions.md`.
Keep it short and point to durable docs instead of duplicating project manuals.

## Required Reading For Non-Trivial Work

- [Harness engineering](../docs/harness/README.md)
- [Change contract](../docs/harness/change-contract.md)
- [Verification matrix](../docs/harness/verification-matrix.md)
- [Architecture](../docs/developer/ARCHITECTURE.md)
- [Testing](../docs/developer/TESTING.md)

## Core Rules

- JobSentinel is a privacy-first Tauri 2, Rust, React 19, TypeScript app.
- User data stays local unless the user explicitly configures an external
  integration.
- Preserve human-in-the-loop behavior for application submission.
- Preserve scraper rate limits, URL validation, and keyring storage.
- Update relevant docs with behavior, setup, architecture, command, or security
  changes.
- Run the smallest relevant checks from the verification matrix before marking
  work complete.
