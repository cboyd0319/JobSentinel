# Tests

JobSentinel keeps browser-level tests under `tests/`. Frontend unit tests live
beside source files in `src/`, and Rust tests live under `src-tauri/`.

## Structure

```text
tests/
├── e2e/
│   ├── playwright/            # Playwright browser tests
│   │   ├── page-objects/      # Page Object Model helpers
│   │   ├── app.spec.ts
│   │   ├── application-tracking.spec.ts
│   │   ├── job-interactions.spec.ts
│   │   ├── job-search-filtering.spec.ts
│   │   ├── keyboard-navigation.spec.ts
│   │   ├── market-intelligence.spec.ts
│   │   ├── one-click-apply.spec.ts
│   │   ├── resume-builder.spec.ts
│   │   ├── resume-upload-matching.spec.ts
│   │   ├── screenshots.spec.ts
│   │   └── settings-save-load.spec.ts
│   └── README.md
└── README.md
```

## Running Tests

### Frontend Unit Tests

```bash
npm run test:run
```

List the current test count with:

```bash
npm run test:run -- --list
```

### Playwright E2E Tests

```bash
npm run test:e2e
```

Local E2E runs use Chromium and skip documentation screenshots. Full
cross-browser E2E uses:

```bash
npm run test:e2e:all
```

The CI-oriented alias uses the same full Playwright suite when invoked:

```bash
npm run test:e2e:ci
```

List the current full E2E test count with:

```bash
npm run test:e2e:ci -- --list
```

Run one file:

```bash
npm run test:e2e -- tests/e2e/playwright/app.spec.ts
```

### Documentation Screenshots

Normal E2E runs exclude documentation screenshots. Refresh tracked docs
screenshots with:

```bash
npm run docs:screenshots
```

Pass Playwright flags after `--` when needed:

```bash
npm run docs:screenshots -- --headed
```

### Rust Tests

```bash
cd src-tauri
cargo test
```

## Verification Baseline

Use the repo verification matrix for current required checks:

- [Verification matrix](../docs/harness/verification-matrix.md)
- [Testing guide](../docs/developer/TESTING.md)

Do not copy fixed test counts into this file. Use the commands above for
current counts.
