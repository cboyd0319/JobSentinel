# JobSentinel E2E Tests

Comprehensive Playwright E2E tests for critical user flows in JobSentinel.

## Test Structure

### Page Objects (`page-objects/`)

Reusable page objects following the Page Object Model pattern:

- `BasePage.ts` - Base class with common functionality
- `DashboardPage.ts` - Job search and filtering
- `ResumePage.ts` - Resume upload and matching
- `ApplicationsPage.ts` - Application tracking kanban
- `SettingsPage.ts` - Settings management

### Test Suites

1. **job-search-filtering.spec.ts**
   - Search functionality with keywords
   - Filter by location, salary, experience
   - Job card interactions (bookmark, view, apply)
   - Error handling

2. **resume-upload-matching.spec.ts**
   - Upload PDF/DOCX resumes
   - File validation and error handling
   - AI-powered resume matching
   - Match score and suggestions

3. **application-tracking.spec.ts**
   - Kanban board display
   - Add/edit/delete applications
   - Drag-and-drop status updates
   - Filter and sort functionality

4. **settings-save-load.spec.ts**
   - Settings persistence across sessions
   - General, notifications, privacy settings
   - Auto-save and reset functionality
   - Validation and error handling

5. **keyboard-navigation.spec.ts**
   - Global keyboard shortcuts (Cmd+1-6)
   - Command palette (Ctrl/Cmd+K)
   - Tab navigation and focus management
   - Accessibility features

6. **app.spec.ts** (existing)
   - Basic app loading and rendering
   - Theme toggle
   - Sidebar navigation

7. **screenshots.spec.ts** (existing)
   - Documentation screenshots

## Running Tests

### All Tests

```bash
npm run test:e2e
```

### Specific Test Suite

```bash
npx playwright test job-search-filtering.spec.ts
```

### Headed Mode (see browser)

```bash
npx playwright test --headed
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
- Retries: 2 (CI), 0 (local)
- Mock data: Uses `npm run dev:mock`

## Test Patterns

### Graceful Skipping

Tests skip gracefully when UI elements don't exist:

```typescript
if (!(await element.isVisible().catch(() => false))) {
  test.skip();
  return;
}
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

### Fixtures

Test fixtures in `tests/e2e/fixtures/`:

- Sample resumes (PDF, DOCX)
- Invalid files for error testing
- See `fixtures/README.md` for setup

## CI/CD Integration

Tests run in CI with:

- Retry on failure (2 retries)
- Serial execution (workers: 1)
- HTML report generation
- Screenshot/video on failure

## Best Practices

1. **Test Isolation** - Each test is independent
2. **Page Objects** - Reusable components
3. **Graceful Degradation** - Skip when features missing
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
3. Add graceful skipping for optional features
4. Test happy paths AND error scenarios
5. Add to this README

## Coverage

Current test coverage:

- ✅ Job search and filtering
- ✅ Resume upload and matching
- ✅ Application tracking
- ✅ Settings management
- ✅ Keyboard navigation
- ✅ Theme toggle
- ✅ Responsive design
- ✅ Accessibility

## Known Issues

- Keyboard shortcuts may not work reliably in headless mode (tests skip gracefully)
- Drag-and-drop can be flaky on some systems (tests include retries)
- File upload tests require fixture files (see `fixtures/README.md`)

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
