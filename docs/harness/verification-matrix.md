<!-- Routes development checks by changed owner and reserves exhaustive proof for release qualification. -->

# Verification Matrix

Select checks by the claim and changed owner. Run
`npm run harness:plan -- --since <valid-ref>` when the diff is not obvious.
The planner conservatively lists aggregate coverage; its broad test commands
are not an automatic per-edit queue. During development, select the focused
checks below, preserving the full-lane triggers and release gate.

## Fast Lane

Every maintained change:

```bash
npm run harness:check
npm run lint:file-size
git diff --check
```

Add the closest parser, compiler, linter, or focused test for the owner.

## Targeted Owners

| Change | Required checks |
| ------ | --------------- |
| Harness, init, state, scripts, validation | `npm run harness:check` plus the affected `node --test` script/contract files; use `npm run test:scripts` for script-wide changes |
| Documentation or copy | `npm run lint:docs`, `npm run lint:language` |
| Frontend source or config | `npm run lint:architecture`, `npm run typecheck`, `npm run lint`, closest Vitest test |
| Cross-component UI behavior | Frontend checks plus `npm run doctor:e2e` and affected Playwright journey |
| Owned Rust/Tauri source | `npm run lint:architecture`, pinned formatting, the affected crate/test filter through `node scripts/dev/run-cargo.mjs test`, and scoped clippy |
| Cargo workspace, shared Rust contracts, or broad resource changes | Owning checks plus `npm run verify:rust`; use the full lane when the shared boundary requires it |
| SQL or SQLx metadata | Rust checks plus `npm run lint:sqlx`; use `npm run sqlx:prepare` only when metadata must change |
| Security, privacy, credentials, hook, workflow | `npm run lint:security`, `npm run lint:deps`, relevant contract tests |
| Dependency change | `npm run lint:deps`, audit, owning tests, and build |

## Security Claim Matrix

| Surface | Required evidence |
| ------- | ----------------- |
| URL, file path, command, or HTML input | Unit tests for malicious input |
| Credential handling | Keyring behavior check and no plaintext path |
| External network destination | Privacy docs update and explicit user configuration |
| Browser automation | Human-in-the-loop submit behavior preserved |
| Browser extension manifest | least-privilege manifest review and no broad host permissions |
| Scraper behavior | Rate limit and error handling tests |

## Full Local Gate

`npm run verify:full` runs the canonical broad gate: harness and file-size
semantics, read-only doctor, architecture, security, dependency and action
policy, SQLx metadata, duplication and test quality, IPC registration, docs,
language, type checking, lint, script and frontend tests, production and
Storybook builds, the bounded runtime smoke journey, the Rust workspace gate,
and whitespace validation.

Use it for shared contracts, broad refactors, uncertain routing, or a repository
completion claim. A narrow lane cannot claim whole-repository health.
Do not run it merely because a development milestone or checkpoint ends.
Name the shared risk before expanding beyond focused checks. Reuse applicable
evidence while source, environment, and inputs remain unchanged.

## Release Gate

Release execution needs separate authority. Before an authorized release, run:

```bash
npm run verify:full
npm run lint:sqlx
npm run test:e2e:all
node scripts/dev/run-cargo.mjs test --workspace --all-features
npm run release:readiness -- --version <version>
```

Then run platform packaging, signature, notarization, SBOM, checksum, artifact,
and public verification for the selected platforms. Workflow configuration alone
is not execution evidence.
For v3.0, the master plan places this campaign after M9/M10 development and
Gate 5, in M11. Current 8 GiB, installed-platform, production-signing, and
full-workflow evidence remains mandatory there. Earlier integration checks
are limited to a concrete architecture, security, data-loss, or changed-boundary
question; they do not replace final release qualification.

## Evidence

Durable completion evidence records the feature id, repository revision or
explicit working-tree checkpoint, command, exit status, relevant result,
platform, timestamp, and caveat. A skipped required check is a gap. Keep raw
logs and sensitive payloads out of the repository.
