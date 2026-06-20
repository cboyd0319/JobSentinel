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

    await page.getByRole("button", { name: "Open settings" }).click();
    await page.getByRole("dialog", { name: "Settings" }).waitFor({ state: "visible" });
    await page.getByRole("tab", { name: "Search Preferences" }).waitFor({ state: "visible" });

    await page.screenshot({
      path: screenshotPath(testInfo, "settings.png"),
      fullPage: false,
    });
  });

  test("capture application-assist screenshot", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    // Skip setup wizard if visible
    const skipButton = page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Use keyboard shortcut to navigate to Application Assist (Cmd/Ctrl+6)
    await page.keyboard.press("Meta+6");
    await page.waitForTimeout(500);

    // If that didn't work, click the nav button
    const navButtons = page.locator("nav button");
    if (await navButtons.count() >= 6) {
      await navButtons.nth(5).click();  // 6th button = Application Assist
    }
    
    await page.waitForTimeout(500);

    await page.screenshot({
      path: screenshotPath(testInfo, "application-assist.png"),
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

  test("capture pay protection screenshot", async ({ page }, testInfo) => {
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
      path: screenshotPath(testInfo, "pay-protection.png"),
      fullPage: false,
    });
  });

  test("capture hiring trends screenshot", async ({ page }, testInfo) => {
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
      path: screenshotPath(testInfo, "hiring-trends.png"),
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

  test("capture hiring-system transparency screenshot", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Skip setup wizard if visible
    const skipButton = page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Navigate to Resume Match page with Cmd+8
    await page.keyboard.press("Meta+8");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    await page.screenshot({
      path: screenshotPath(testInfo, "hiring-system-transparency.png"),
      fullPage: false,
    });
  });
});
