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
- Rule 0: user privacy and security are non-negotiable. No feature, shortcut,
  support flow, external AI provider, or source adapter may weaken local-first
  storage, credential safety, explicit user review, or privacy-preserving
  defaults.
- User data stays local unless the user explicitly configures an external
  integration.
- External AI stays optional, disabled by default, and routed through the
  privacy-first AI gateway.
- User-facing flows must assume zero technical knowledge and support technical
  plus non-technical job searches.
- Preserve responsible-use boundaries: truthful application guidance,
  human-in-the-loop submission, and source controls.
- Preserve human-in-the-loop behavior for application submission.
- Preserve scraper rate limits, URL validation, and keyring storage.
- Update relevant docs with behavior, setup, architecture, command, or security
  changes.
- Run the smallest relevant checks from the verification matrix before marking
  work complete.
