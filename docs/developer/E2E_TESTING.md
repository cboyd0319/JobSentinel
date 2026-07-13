# End-to-End Testing with Playwright

This guide owns browser-level workflow coverage. See
[Frontend Testing Guide](FRONTEND_TESTING.md) for React component, hook,
context, and Tauri command tests.

## Browser Workflow Tests

### Test Organization

E2E tests live in `tests/e2e/playwright` and test complete user workflows:

```text
tests/e2e/playwright/
- app.spec.ts: app shell smoke coverage
- application-tracking.spec.ts: application board flows
- job-interactions.spec.ts: job card interactions
- job-search-filtering.spec.ts: search and filter flows
- keyboard-navigation.spec.ts: keyboard shortcuts and focus
- hiring-trends.spec.ts: hiring trends flows
- application-assist.spec.ts: human-reviewed apply settings
- resume-builder.spec.ts: Resume Builder wizard
- resume-upload-matching.spec.ts: resume library and matching
- screenshots.spec.ts: documentation screenshots only
- settings-save-load.spec.ts: settings persistence
- page-objects/: Page Object Model helpers
```

### Pattern 1: Complete User Flow

**Test**: User navigates app and performs actions

```typescript
import { test, expect } from "@playwright/test";

test.describe("Job Search Workflow", () => {
  test.beforeEach(async ({ page }) => {
    // Visit app before each test
    await page.goto("/");
    await expect(page.getByTestId("job-list")).toBeVisible();
  });

  test("should search jobs and apply filters", async ({ page }) => {
    // Search for jobs
    const searchBox = page.getByRole("searchbox", { name: "Search jobs" });
    await searchBox.fill("Care Coordinator");
    await searchBox.press("Enter");

    // Wait for results
    await expect(page.getByText(/showing.*results/i)).toBeVisible();

    // Apply filter
    await page.getByRole("button", { name: "Ghost Filter" }).click();
    await page.getByRole("option", { name: "Hide Ghost Jobs" }).click();

    // Verify filter applied
    await expect(page.getByText(/no ghost jobs/i)).toBeVisible();
  });
});
```

### Pattern 2: API Mocking in E2E Tests

**Test**: Mock backend responses for consistent testing

```typescript
test("should handle backend errors gracefully", async ({ page }) => {
  // Intercept Tauri command and return error
  await page.evaluate(() => {
    window.__MOCK_API_ERROR__ = "Database connection failed";
  });

  await page.goto("/");

  // Verify error message displayed
  await expect(page.getByText(/database connection failed/i)).toBeVisible();

  // Verify user can retry
  await page.getByRole("button", { name: "Retry" }).click();

  // Mock successful response for retry
  await page.evaluate(() => {
    window.__MOCK_API_ERROR__ = null;
  });

  await expect(page.getByText(/jobs loaded/i)).toBeVisible();
});
```

### Pattern 3: Visual Regression Testing

**Test**: Ensure UI hasn't changed unexpectedly

```typescript
test("should render dashboard with correct layout", async ({ page }) => {
  await page.goto("/");

  // Take screenshot and compare to baseline
  await expect(page).toHaveScreenshot("dashboard.png");
});

test("should maintain layout on mobile", async ({ page }) => {
  // Test mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });

  await page.goto("/");

  await expect(page).toHaveScreenshot("dashboard-mobile.png");
});
```

### Running Playwright Tests

The npm commands below route through `scripts/run-playwright.mjs`, which keeps
Playwright output clean on current Node versions without hiding test failures.
The wrapper automatically selects an available loopback port and does not reuse
an existing server unless `PLAYWRIGHT_REUSE_EXISTING_SERVER=1` is explicitly
set. Run `npm run doctor:e2e` first when setting up Playwright locally or
diagnosing browser-launch failures.

```bash
# Check local E2E readiness
npm run doctor:e2e

# Run local Chromium functional E2E tests
npm run test:e2e

# Run full cross-browser E2E tests
npm run test:e2e:all

# Run specific test file
npm run test:e2e -- tests/e2e/playwright/app.spec.ts

# Refresh documentation screenshots
npm run docs:screenshots

# Debug with inspector
npm run test:e2e:headed -- --debug

# Generate HTML report
npm run test:e2e
# Open: playwright-report/index.html
```

---
