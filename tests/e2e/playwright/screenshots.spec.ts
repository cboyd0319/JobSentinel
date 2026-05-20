import { test, type TestInfo } from "@playwright/test";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

/**
 * Screenshot capture tests for documentation.
 *
 * Run with: npm run docs:screenshots
 *
 * Standard E2E runs save screenshots as Playwright artifacts so the working
 * tree stays clean. Set UPDATE_DOC_SCREENSHOTS=1 to refresh docs/images/.
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const docsScreenshotDir = join(__dirname, "..", "..", "..", "docs", "images");
const updateDocsScreenshots = process.env.UPDATE_DOC_SCREENSHOTS === "1";

function screenshotPath(testInfo: TestInfo, filename: string) {
  return updateDocsScreenshots
    ? join(docsScreenshotDir, filename)
    : testInfo.outputPath(filename);
}

test.describe("Documentation Screenshots", () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    colorScheme: "dark",  // Dark mode is now the default
  });

  test("capture dashboard screenshot", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Wait for dashboard to fully load
    await page.waitForTimeout(2000);

    // Skip setup wizard if visible
    const skipButton = page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);
    }

    await page.screenshot({
      path: screenshotPath(testInfo, "dashboard.png"),
      fullPage: false,
    });
  });

  test("capture settings screenshot", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Skip setup wizard if visible
    const skipButton = page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Settings modal can be opened from the gear icon in the header
    // For now, just take a screenshot of the dashboard (settings is embedded)
    await page.screenshot({
      path: screenshotPath(testInfo, "settings.png"),
      fullPage: false,
    });
  });

  test("capture one-click-apply screenshot", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Skip setup wizard if visible
    const skipButton = page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Use keyboard shortcut to navigate to One-Click Apply (⌘6)
    await page.keyboard.press("Meta+6");
    await page.waitForTimeout(500);

    // If that didn't work, click the nav button
    const navButtons = page.locator("nav button");
    if (await navButtons.count() >= 6) {
      await navButtons.nth(5).click();  // 6th button = One-Click Apply
    }
    
    await page.waitForTimeout(500);

    await page.screenshot({
      path: screenshotPath(testInfo, "one-click-apply.png"),
      fullPage: false,
    });
  });

  test("capture keyboard shortcuts screenshot", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Skip setup wizard if visible
    const skipButton = page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Open keyboard shortcuts help with ? key
    await page.keyboard.press("Shift+/");
    await page.waitForTimeout(500);

    // Take screenshot regardless of whether modal appeared
    await page.screenshot({
      path: screenshotPath(testInfo, "keyboard-shortcuts.png"),
      fullPage: false,
    });
  });

  test("capture light mode dashboard screenshot", async ({ page }, testInfo) => {
    // Capture light mode variant for docs (dark is default)
    await page.emulateMedia({ colorScheme: "light" });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Skip setup wizard if visible
    const skipButton = page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForLoadState("networkidle");
    }

    await page.waitForTimeout(1000);

    await page.screenshot({
      path: screenshotPath(testInfo, "dashboard-light.png"),
      fullPage: false,
    });
  });

  test("capture resume matcher screenshot", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Skip setup wizard if visible
    const skipButton = page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Navigate to Resume page with Cmd+3
    await page.keyboard.press("Meta+3");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: screenshotPath(testInfo, "resume-matcher.png"),
      fullPage: false,
    });
  });

  test("capture salary ai screenshot", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Skip setup wizard if visible
    const skipButton = page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Navigate to Salary page with Cmd+4
    await page.keyboard.press("Meta+4");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: screenshotPath(testInfo, "salary-ai.png"),
      fullPage: false,
    });
  });

  test("capture market intelligence screenshot", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Skip setup wizard if visible
    const skipButton = page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Navigate to Market page with Cmd+5
    await page.keyboard.press("Meta+5");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: screenshotPath(testInfo, "market-intelligence.png"),
      fullPage: false,
    });
  });

  test("capture applications kanban screenshot", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Skip setup wizard if visible
    const skipButton = page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Navigate to Applications page with Cmd+2
    await page.keyboard.press("Meta+2");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: screenshotPath(testInfo, "application-tracking.png"),
      fullPage: false,
    });
  });

  test("capture one-click apply screenshot via keyboard", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Skip setup wizard if visible
    const skipButton = page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Navigate to One-Click Apply page with Cmd+6
    await page.keyboard.press("Meta+6");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: screenshotPath(testInfo, "one-click-apply.png"),
      fullPage: false,
    });
  });

  test("capture resume builder screenshot", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Skip setup wizard if visible
    const skipButton = page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Navigate to Resume Builder page with Cmd+7
    await page.keyboard.press("Meta+7");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: screenshotPath(testInfo, "resume-builder.png"),
      fullPage: false,
    });
  });

  test("capture ats optimizer screenshot", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Skip setup wizard if visible
    const skipButton = page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Navigate to ATS Optimizer page with Cmd+8
    await page.keyboard.press("Meta+8");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: screenshotPath(testInfo, "ats-optimizer.png"),
      fullPage: false,
    });
  });
});
