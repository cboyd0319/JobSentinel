<!-- Documents the maintained Playwright mock journeys and their native-evidence limits. -->

# End-to-end testing with Playwright

Playwright exercises the Vite development runtime with repository-owned native
command mocks. These tests prove browser workflows, not installed Tauri behavior,
OS authentication, encrypted storage or real provider calls. See
[Frontend testing](FRONTEND_TESTING.md) for component tests and
[the E2E runner guide](../../tests/e2e/README.md) for its configuration.

## Browser workflow tests

Tests live under `tests/e2e/playwright/`; page objects live in `page-objects/`.
Use the current tests and page objects as executable examples rather than copying
old control labels or inventing globals such as `__MOCK_API_ERROR__`.

The development backend is owned by `src/dev-runtime/`. Seed or modify its actual
fixtures before the relevant page action, then assert a visible outcome. Preserve
startup/setup routing and reset test state between journeys. Production builds
must not activate the mock runtime.

Current suites cover the application shell, job search and interaction, Settings,
applications, keyboard navigation, resume library/builder/matching, Hiring Trends
and human-reviewed Application Assist. Suite presence does not certify complete
coverage; use revision-bound execution evidence.

## Running Playwright tests

The npm scripts use `scripts/dev/run-playwright.mjs`. It selects an available
loopback port and does not reuse a server by default. A reused server must be a
verified JobSentinel mock runtime; never point a test at a personal live profile.

```bash
npm run doctor:e2e
npm run test:e2e -- tests/e2e/playwright/app.spec.ts
npm run test:e2e:smoke
npm run test:e2e:headed -- --debug
```

For planned broad browser qualification:

```bash
npm run test:e2e:all
npm run test:e2e:all:budget
```

Documentation screenshots run separately through `npm run docs:screenshots`.
Inspect the resulting report and actual collected/passed/skipped tests; wrapper
success alone is insufficient. Run only the journeys needed by a development
change. The final release phases own exhaustive installed-platform qualification.
