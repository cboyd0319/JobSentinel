# Tests

All tests for JobSentinel are organized in this directory.

## Structure

```text
tests/
├── e2e/                    # End-to-end tests
│   ├── playwright/         # Playwright tests (browser automation)
│   │   ├── app.spec.ts         # Main app E2E tests (82 tests)
│   │   └── screenshots.spec.ts # Screenshot capture tests
│   └── webdriverio/        # WebdriverIO + Tauri Driver tests
│       ├── specs/              # Test specifications
│       ├── wdio.conf.js        # WebdriverIO configuration
│       └── package.json        # WebdriverIO dependencies
└── unit/                   # Unit tests (future)
```

## Running Tests

### Playwright E2E Tests

```bash
# From project root
npx playwright test

# With UI
npx playwright test --ui

# Specific test file
npx playwright test tests/e2e/playwright/app.spec.ts
```

### WebdriverIO E2E Tests

```bash
# From tests/e2e/webdriverio
cd tests/e2e/webdriverio
npm install
npm test
```

### Rust Unit Tests

```bash
cd src-tauri
cargo test
```

### Frontend Unit Tests

```bash
npm test
```

## Test Coverage

| Type | Framework | Count | Location |
|------|-----------|-------|----------|
| Rust unit tests | cargo test | 2,257 | `src-tauri/src/` |
| Frontend unit tests | Vitest | 1,828 | `src/**/*.test.tsx` |
| E2E (Playwright) | Playwright | 82 | `tests/e2e/playwright/` |
| E2E (WebdriverIO) | WebdriverIO | 8 | `tests/e2e/webdriverio/` |

**Total: 4,175+ tests**

## Writing Tests

See [Testing Guide](../docs/developer/TESTING.md) for detailed instructions.
