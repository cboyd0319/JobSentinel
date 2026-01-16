import { test, expect } from "@playwright/test";

test.describe("JobSentinel App", () => {
  test("should load the application", async ({ page }) => {
    await page.goto("/");

    // Wait for the app to load
    await expect(page.locator("text=JobSentinel")).toBeVisible({ timeout: 10000 });
  });

  test("should show setup wizard on first run or dashboard", async ({ page }) => {
    await page.goto("/");

    // Either setup wizard or dashboard should be visible
    const hasSetupWizard = await page.locator("text=Welcome to JobSentinel").isVisible().catch(() => false);
    const hasDashboard = await page.locator("text=Privacy-first job search").isVisible().catch(() => false);

    expect(hasSetupWizard || hasDashboard).toBe(true);
  });

  test("should have accessible skip to content link", async ({ page }) => {
    await page.goto("/");

    // The skip link should exist (visible when focused)
    const skipLink = page.locator("a:text('Skip to main content')");
    await expect(skipLink).toHaveCount(1);
  });
});

test.describe("Keyboard Shortcuts", () => {
  test("should open command palette with Cmd+K", async ({ page }) => {
    await page.goto("/");

    // Wait for app to load
    await page.waitForTimeout(1000);

    // Press Cmd+K (Meta+K on Mac, Ctrl+K on Windows/Linux)
    await page.keyboard.press("Meta+k");

    // Command palette should be visible
    await expect(page.locator("text=Type a command or search")).toBeVisible({ timeout: 5000 });
  });

  test("should close command palette with Escape", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Open command palette
    await page.keyboard.press("Meta+k");
    await expect(page.locator("text=Type a command or search")).toBeVisible();

    // Close with Escape
    await page.keyboard.press("Escape");
    await expect(page.locator("text=Type a command or search")).not.toBeVisible();
  });
});

test.describe("Theme Toggle", () => {
  test("should toggle dark mode", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Find the theme toggle button
    const themeToggle = page.locator('button[aria-label="Toggle theme"]').first();

    if (await themeToggle.isVisible()) {
      // Get initial state
      const html = page.locator("html");
      const wasDark = await html.getAttribute("class").then((c) => c?.includes("dark"));

      // Click toggle
      await themeToggle.click();

      // Wait for theme to change
      await page.waitForTimeout(500);

      // Check that class changed
      const isDark = await html.getAttribute("class").then((c) => c?.includes("dark"));
      expect(isDark).not.toBe(wasDark);
    }
  });
});
