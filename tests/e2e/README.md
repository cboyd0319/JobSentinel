# JobSentinel E2E Tests

Comprehensive Playwright E2E tests for critical user flows in JobSentinel.

## Test Structure

### Page Objects (`page-objects/`)

Reusable page objects following the Page Object Model pattern:

- `BasePage.ts` - Base class with common functionality
- `DashboardPage.ts` - Job search and filtering
- `ResumePage.ts` - Resume state, skills, library, and match results
- `ApplicationsPage.ts` - Application tracking kanban
- `SettingsPage.ts` - Settings management
- `OneClickApplyPage.ts` - One-Click Apply settings, profile, and screening answers
- `ResumeBuilderPage.ts` - Resume Builder wizard
- `MarketIntelligencePage.ts` - Market Intelligence features
- `JobDetailPage.ts` - Job detail view and interactions

### Test Suites

1. **job-search-filtering.spec.ts**
   - Search functionality with keywords
   - Filter by location, salary, experience
   - Job card interactions (bookmark, view, apply)
   - Error handling

2. **resume-upload-matching.spec.ts**
   - Empty resume state and native import actions
   - Active resume, extracted skills, and match results
   - Skill add/edit/delete and category filtering
   - Resume library activation and deletion

3. **application-tracking.spec.ts**
   - Kanban board display
   - Application card details and status updates
   - Drag-and-drop status changes
   - Notes persistence, reminders, ghost detection, and toolbar dialogs

4. **settings-save-load.spec.ts**
   - Settings persistence across sessions
   - General, notifications, privacy settings
   - Auto-save and reset functionality
   - Validation and error handling

5. **keyboard-navigation.spec.ts**
   - Global keyboard shortcuts (Ctrl/Cmd+1-8)
   - Command palette (Ctrl/Cmd+K)
   - Keyboard help modal
   - Search focus, focus trap, and skip link behavior

6. **one-click-apply.spec.ts**
   - Settings stats and tabs
   - Application profile validation, save, and reload behavior
   - Screening answer add/edit validation and persistence
   - Human-review and manual-final-submit guardrails

7. **resume-builder.spec.ts**
   - Wizard navigation (7 steps)
   - Contact and summary validation
   - Experience, education, and skills management
   - Skill import from seeded active resume
   - Template selection, ATS preview, and DOCX export

8. **market-intelligence.spec.ts**
   - Overview tab with market metrics
   - Trend charts for skills and companies
   - Skills trends analysis
   - Company activity tracking
   - Location heatmap
   - Market alert read state

9. **job-interactions.spec.ts**
   - Bookmarking jobs
   - Adding notes to jobs
   - Application status tracking
   - Search and filtering
   - Match score display
   - Complete user flow

10. **app.spec.ts**
    - App shell smoke coverage
    - Theme toggle
    - Sidebar destination navigation
    - Responsive shell rendering

11. **screenshots.spec.ts**
    - Documentation screenshot capture
    - Excluded from normal E2E runs
    - Refreshes tracked docs images only through `npm run docs:screenshots`

## Running Tests

### Local Functional Tests

```bash
npm run test:e2e
```

Runs Chromium only and excludes documentation screenshot capture.

### Full Cross-Browser Tests

```bash
npm run test:e2e:all
```

Runs Chromium and WebKit functional E2E tests. `npm run test:e2e:ci` is the
same full-suite command for CI-oriented runs.

### Refresh Documentation Screenshots

```bash
npm run docs:screenshots
```

Pass Playwright flags after `--` when needed:

```bash
npm run docs:screenshots -- --headed
```

### Specific Test Suite

```bash
npm run test:e2e -- tests/e2e/playwright/job-search-filtering.spec.ts
```

### Headed Mode (see browser)

```bash
npm run test:e2e:headed
```

### Debug Mode

```bash
npx playwright test --debug
```

### Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=webkit
```

## Configuration

Tests are configured in `playwright.config.ts`:

- Base URL: `http://localhost:5173`
- Test directory: `tests/e2e/playwright`
- Projects: Chromium, WebKit
- Local default: Chromium functional tests, excluding `screenshots.spec.ts`
- Retries: 2 (CI), 0 (local)
- Mock data: Uses `npm run dev:mock`

## Test Patterns

### Intentional Skipping

Runtime skips are reserved for capabilities that are intentionally unavailable
in browser-only Playwright, such as native file pickers. Current UI flows should
use mock-backed assertions instead of stale element probes:

```typescript
test.skip(browserName === "webkit", "Documented platform gap");
```

### Error Handling

All tests include error boundaries and handle missing elements:

```typescript
const hasElement = await element.isVisible().catch(() => false);
```

### Waiting Strategies

- `waitForLoadState("networkidle")` - Wait for network requests
- `waitForTimeout(ms)` - Wait for animations/transitions
- `expect().toBeVisible()` - Wait for element visibility

### Page Object Pattern

```typescript
const dashboard = new DashboardPage(page);
await dashboard.navigateTo();
await dashboard.searchForJobs("software engineer");
const card = await dashboard.getJobCard(0);
await card.bookmark();
```

## Test Data

### Mock Data

Tests run against mock data defined in `src/mocks/`:

- Mock job listings
- Mock applications
- Mock settings
- Mock resumes, skills, builder drafts, templates, previews, and match results

## CI/CD Integration

Tests run in CI with:

- Retry on failure (2 retries)
- Serial execution (workers: 1)
- HTML report generation
- Screenshot/video on failure

## Best Practices

1. **Test Isolation** - Each test is independent
2. **Page Objects** - Reusable components
3. **Explicit Platform Gaps** - Skip only intentional unavailable capabilities
4. **Error Handling** - All edge cases covered
5. **Accessibility** - Keyboard and screen reader support
6. **Performance** - Fast execution with parallel tests

## Debugging

### View Test Report

```bash
npx playwright show-report
```

### View Trace

```bash
npx playwright show-trace trace.zip
```

### Screenshots on Failure

Screenshots automatically saved to `test-results/` on failure.

## Contributing

When adding new tests:

1. Create page object if needed
2. Follow existing patterns (AAA: Arrange, Act, Assert)
3. Avoid runtime skips for current UI; use seeded mock state instead
4. Test happy paths AND error scenarios
5. Add to this README

## Coverage

Current test coverage:

- Job search and filtering
- Resume upload and matching
- Application tracking
- Settings management
- Keyboard navigation
- One-Click Apply settings and screening answers
- Resume Builder wizard
- Market Intelligence features
- Job interactions (bookmarking, notes, status)
- Theme toggle
- Responsive design
- Accessibility

## Known Issues

- Drag-and-drop can be flaky on some systems (tests include retries)
- Native file-picker coverage belongs in a Tauri-level smoke test, not browser-only Playwright.

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
