# Verification Matrix

Select checks by the claim and changed owner. Run
`npm run harness:plan -- --since <valid-ref>` when the diff is not obvious.

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
| Harness, init, state, scripts, validation | `npm run harness:check`, `npm run test:scripts`, launcher contract tests |
| Documentation or copy | `npm run lint:docs`, `npm run lint:language` |
| Frontend source or config | `npm run lint:architecture`, `npm run typecheck`, `npm run lint`, closest Vitest test |
| Cross-component UI behavior | Frontend checks plus `npm run doctor:e2e` and affected Playwright journey |
| Rust, Cargo, Tauri, or resources | `npm run lint:architecture`, `npm run verify:rust` |
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

## Release Gate

Release execution needs separate authority. Before an authorized release, run:

```bash
npm run verify:full
npm run lint:sqlx
npm run test:e2e:all
cargo test --workspace --all-features
npm run release:readiness -- --version <version>
```

Then run platform packaging, signature, notarization, SBOM, checksum, artifact,
and public verification for the selected platforms. Workflow configuration alone
is not execution evidence.

## Evidence

Durable completion evidence records the feature id, repository revision or
explicit working-tree checkpoint, command, exit status, relevant result,
platform, timestamp, and caveat. A skipped required check is a gap. Keep raw
logs and sensitive payloads out of the repository.
