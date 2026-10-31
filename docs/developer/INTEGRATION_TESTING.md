<!-- Routes Rust cross-owner testing to current fixtures, boundaries and focused commands. -->

# Integration testing guide

Integration tests prove interactions between owners. They may use real in-memory
SQLite and synthetic providers; classify evidence by the dependencies actually
exercised, not by the test's filename. Use [Testing](TESTING.md) for verification
routing and [Database integration testing](DATABASE_INTEGRATION_TESTING.md) for
storage fixtures.

## Test organization

| Owner | Current tests |
| --- | --- |
| Storage | `crates/jobsentinel-storage/tests/database_integration_test.rs` and owner-local connection/recovery tests |
| Application | `crates/jobsentinel-application/tests/` covers API contracts, scheduling, scoring, persistence, scraping pipelines and Application Assist |
| Sources | `crates/jobsentinel-sources/src/scrapers/tests/` contains parser and explicitly ignored live-source tests |
| Native adapters | `src-tauri/src/ipc/` keeps command tests beside their implementation |
| Browser journeys | `tests/e2e/playwright/`; see [E2E testing](E2E_TESTING.md) |

Application and storage are separate crates; there is no `jobsentinel_core`
crate. SQL belongs to storage. Reuse the owner-local fixture helpers and the
application integration `tests/support/mod.rs` rather than copying large `Job`
or `Config` initializers into documentation or new tests.

## Running integration tests

From the repository root, select the affected target:

```bash
node scripts/dev/run-cargo.mjs test --locked -p jobsentinel-storage --test database_integration_test
node scripts/dev/run-cargo.mjs test --locked -p jobsentinel-application --test scheduler_integration_test
node scripts/dev/run-cargo.mjs test --locked -p jobsentinel-application --test scraping_pipeline_integration
node scripts/dev/run-cargo.mjs test --locked -p jobsentinel --lib credential_integration_tests
```

Use `-- --list` to confirm collected names before narrowing with a test filter.
An empty selection is not proof. `credential_integration_tests` now uses an
isolated vault and fixed key; it does not test native Keychain or Secret Service.

Live-source tests contact external providers and remain separate, explicit work:

```bash
node scripts/dev/run-cargo.mjs test --locked -p jobsentinel-sources scrapers::live_tests -- --ignored --nocapture
```

Do not run all ignored tests indiscriminately: other ignored tests may download
models, require native interaction or depend on external state.

## Database testing

Use production migrations in ordinary repository tests. File-backed tests must
use synthetic keys and private temporary paths, retain the owner lock, and await
connection closure before restart. Test raw SQL only inside the storage owner.

## Testing scrapers

Parser tests use supplied fixture bytes without network access. Controlled-server
tests prove request, cancellation and response boundaries. Live provider tests
establish only the observed provider/date/platform. Preserve rate limits, public
URL validation and source consent in every mode.

## Testing commands

Exercise the command's validation, authorization, storage effect and sanitized
failure result. A renderer mock cannot prove native dialogs, OS authentication,
file permissions or SQLCipher. Shared-computer and portable startup commands
require native admission and cancellation cases in addition to UI coverage.

## Test helpers and fixtures

Reuse existing helpers before adding one. Keep fixture differences and assertions
inside the scenario; expose cross-crate fixtures only through explicit
`test-support` features. Never use real credentials or personal profiles.

## Common patterns

Prove success, refusal and interrupted work at the affected boundary. For concurrent
operations, retain the actual transaction or task until the test controls its
release; avoid sleeps as synchronization. Assert persisted state after the outcome,
including rollback and retry behavior, not only that a function returned `Ok`.

## Troubleshooting

Check the earliest compiler/runtime failure and confirm the test actually ran.
Use the pinned toolchain, offline SQLx metadata and owning manifests. Record missing
platform or external dependencies as gaps. Full suites and installed journeys belong
to the release phases unless a concrete development risk requires broader checks.
