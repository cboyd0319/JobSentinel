import { test } from "@playwright/test";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

/**
 * Screenshot capture tests for documentation.
 *
 * Run with: npx playwright test e2e/screenshots.spec.ts --headed
 *
 * Screenshots are saved to docs/images/
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const screenshotDir = join(__dirname, "..", "docs", "images");

test.describe("Documentation Screenshots", () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    colorScheme: "light",
  });

  test("capture dashboard screenshot", async ({ page }) => {
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
      path: join(screenshotDir, "dashboard.png"),
      fullPage: false,
    });
  });

  test("capture settings screenshot", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Skip setup wizard if visible
    const skipButton = page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Open settings
    const settingsButton = page.locator('button[aria-label*="settings" i], button:has-text("Settings")').first();
    if (await settingsButton.isVisible().catch(() => false)) {
      await settingsButton.click();
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: join(screenshotDir, "settings.png"),
        fullPage: false,
      });
    }
  });

  test("capture one-click-apply screenshot", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Skip setup wizard if visible
    const skipButton = page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Navigate to One-Click Apply
    const automationLink = page.locator(
      'a[href*="automation"], button:has-text("One-Click"), button:has-text("Quick Apply"), [data-testid="automation-nav"]'
    ).first();

    if (await automationLink.isVisible().catch(() => false)) {
      await automationLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1000);

      await page.screenshot({
        path: join(screenshotDir, "one-click-apply.png"),
        fullPage: false,
      });
    }
  });

  test("capture keyboard shortcuts screenshot", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Skip setup wizard if visible
    const skipButton = page.locator("text=Skip for now, button:has-text('Skip')").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForLoadState("networkidle");
    }

    // Open keyboard shortcuts help with ? key
    await page.keyboard.press("Shift+/");
    await page.waitForTimeout(500);

    // Check if modal is visible
    const helpModal = page.locator("text=Keyboard Shortcuts");
    if (await helpModal.isVisible().catch(() => false)) {
      await page.screenshot({
        path: join(screenshotDir, "keyboard-shortcuts.png"),
        fullPage: false,
      });
    }
  });

  test("capture dark mode dashboard screenshot", async ({ page }) => {
    // Use dark mode
    await page.emulateMedia({ colorScheme: "dark" });

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
      path: join(screenshotDir, "dashboard-dark.png"),
      fullPage: false,
    });
  });

  test("capture resume matcher screenshot", async ({ page }) => {
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
      path: join(screenshotDir, "resume-matcher.png"),
      fullPage: false,
    });
  });

  test("capture salary ai screenshot", async ({ page }) => {
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
      path: join(screenshotDir, "salary-ai.png"),
      fullPage: false,
    });
  });

  test("capture market intelligence screenshot", async ({ page }) => {
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
      path: join(screenshotDir, "market-intelligence.png"),
      fullPage: false,
    });
  });

  test("capture applications kanban screenshot", async ({ page }) => {
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
      path: join(screenshotDir, "application-tracking.png"),
      fullPage: false,
    });
  });

  test("capture one-click apply screenshot via keyboard", async ({ page }) => {
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
      path: join(screenshotDir, "one-click-apply.png"),
      fullPage: false,
    });
  });

  test("capture resume builder screenshot", async ({ page }) => {
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
      path: join(screenshotDir, "resume-builder.png"),
      fullPage: false,
    });
  });

  test("capture ats optimizer screenshot", async ({ page }) => {
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
      path: join(screenshotDir, "ats-optimizer.png"),
      fullPage: false,
    });
  });
});
