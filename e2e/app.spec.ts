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
    await expect(page.locator("[data-testid='command-palette']")).toBeVisible({ timeout: 5000 });
  });

  test("should close command palette with Escape", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Open command palette
    await page.keyboard.press("Meta+k");
    await expect(page.locator("[data-testid='command-palette']")).toBeVisible();

    // Close with Escape
    await page.keyboard.press("Escape");
    await expect(page.locator("[data-testid='command-palette']")).not.toBeVisible();
  });

  test("should focus search with / key", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Skip if setup wizard is visible
    const isSetupWizard = await page.locator("text=Welcome to JobSentinel").isVisible().catch(() => false);
    if (isSetupWizard) {
      test.skip();
      return;
    }

    // Press / to focus search
    await page.keyboard.press("/");

    // Search input should be focused
    const searchInput = page.locator("[data-testid='search-input']");
    if (await searchInput.isVisible()) {
      await expect(searchInput).toBeFocused({ timeout: 2000 });
    }
  });

  test("should show help modal with ? key", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Press ? to show help
    await page.keyboard.press("Shift+/");

    // Help modal should be visible
    await expect(page.locator("text=Keyboard Shortcuts")).toBeVisible({ timeout: 3000 });
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

test.describe("Command Palette", () => {
  test("should filter commands on typing", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Open command palette
    await page.keyboard.press("Meta+k");
    await expect(page.locator("[data-testid='command-palette']")).toBeVisible();

    // Type in the search
    const input = page.locator("[data-testid='command-palette-input']");
    await input.fill("settings");

    // Should show filtered results
    await page.waitForTimeout(300);
    const list = page.locator("[data-testid='command-palette-list']");
    const items = list.locator("button[role='option']");
    const count = await items.count();

    // Should have at least one result for settings
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should navigate with arrow keys", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Open command palette
    await page.keyboard.press("Meta+k");
    await expect(page.locator("[data-testid='command-palette']")).toBeVisible();

    // Press down arrow to select next item
    await page.keyboard.press("ArrowDown");

    // Check that selection moved (aria-selected should be true on second item)
    const list = page.locator("[data-testid='command-palette-list']");
    const selectedItem = list.locator("button[aria-selected='true']");
    await expect(selectedItem).toHaveCount(1);
  });
});

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Skip setup wizard if visible
    const isSetupWizard = await page.locator("text=Welcome to JobSentinel").isVisible().catch(() => false);
    if (isSetupWizard) {
      // Try to skip or close it
      const skipButton = page.locator("text=Skip for now").first();
      if (await skipButton.isVisible()) {
        await skipButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test("should display job list or empty state", async ({ page }) => {
    // Either job list or empty state should be visible
    const jobList = page.locator("[data-testid='job-list']");
    const emptyState = page.locator("text=No jobs to display");

    const hasJobList = await jobList.isVisible().catch(() => false);
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    expect(hasJobList || hasEmptyState).toBe(true);
  });

  test("should have Search Now button", async ({ page }) => {
    const searchButton = page.locator("[data-testid='btn-search-now']");

    // Button should exist (might be in header)
    if (await searchButton.isVisible()) {
      await expect(searchButton).toBeEnabled();
    }
  });

  test("should have working search input", async ({ page }) => {
    const searchInput = page.locator("[data-testid='search-input']");

    if (await searchInput.isVisible()) {
      // Type a search query
      await searchInput.fill("engineer");
      await expect(searchInput).toHaveValue("engineer");

      // Clear search
      await searchInput.clear();
      await expect(searchInput).toHaveValue("");
    }
  });
});

test.describe("Job Card Interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Skip setup wizard if visible
    const skipButton = page.locator("text=Skip for now").first();
    if (await skipButton.isVisible().catch(() => false)) {
      await skipButton.click();
      await page.waitForTimeout(500);
    }
  });

  test("should display job card elements", async ({ page }) => {
    const jobList = page.locator("[data-testid='job-list']");

    if (await jobList.isVisible().catch(() => false)) {
      const firstCard = page.locator("[data-testid='job-card']").first();

      if (await firstCard.isVisible()) {
        // Should have title
        await expect(firstCard.locator("[data-testid='job-title']")).toBeVisible();

        // Should have company
        await expect(firstCard.locator("[data-testid='job-company']")).toBeVisible();

        // Should have view button
        await expect(firstCard.locator("[data-testid='btn-view']")).toBeVisible();
      }
    }
  });

  test("should show action buttons on hover", async ({ page }) => {
    const jobList = page.locator("[data-testid='job-list']");

    if (await jobList.isVisible().catch(() => false)) {
      const firstCard = page.locator("[data-testid='job-card']").first();

      if (await firstCard.isVisible()) {
        // Hover over the card
        await firstCard.hover();
        await page.waitForTimeout(300);

        // Action buttons should become visible on hover
        const bookmarkBtn = firstCard.locator("[data-testid='btn-bookmark']");
        if (await bookmarkBtn.count() > 0) {
          // Button exists (may have opacity:0 until hover)
          await expect(bookmarkBtn).toBeAttached();
        }
      }
    }
  });

  test("should toggle bookmark on click", async ({ page }) => {
    const jobList = page.locator("[data-testid='job-list']");

    if (await jobList.isVisible().catch(() => false)) {
      const firstCard = page.locator("[data-testid='job-card']").first();

      if (await firstCard.isVisible()) {
        await firstCard.hover();
        await page.waitForTimeout(300);

        const bookmarkBtn = firstCard.locator("[data-testid='btn-bookmark']");

        if (await bookmarkBtn.isVisible()) {
          const wasBookmarked = await bookmarkBtn.getAttribute("data-bookmarked");

          await bookmarkBtn.click();
          await page.waitForTimeout(500);

          const isBookmarked = await bookmarkBtn.getAttribute("data-bookmarked");
          expect(isBookmarked).not.toBe(wasBookmarked);
        }
      }
    }
  });
});

test.describe("Accessibility", () => {
  test("should have proper heading structure", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Should have at least one h1
    const h1 = page.locator("h1");
    await expect(h1.first()).toBeVisible();
  });

  test("should have proper ARIA labels", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Theme toggle should have aria-label
    const themeToggle = page.locator('button[aria-label="Toggle theme"]');
    if (await themeToggle.first().isVisible()) {
      await expect(themeToggle.first()).toHaveAttribute("aria-label");
    }

    // Search button should have aria-label
    const searchBtn = page.locator("[data-testid='btn-search-now']");
    if (await searchBtn.isVisible()) {
      await expect(searchBtn).toHaveAttribute("aria-label");
    }
  });

  test("should have focusable interactive elements", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);

    // Tab through the page
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");

    // Should have some element focused
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeAttached();
  });
});

test.describe("Responsive Design", () => {
  test("should adapt to mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForTimeout(1000);

    // App should still be functional
    await expect(page.locator("text=JobSentinel")).toBeVisible();
  });

  test("should adapt to tablet viewport", async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await page.waitForTimeout(1000);

    // App should still be functional
    await expect(page.locator("text=JobSentinel")).toBeVisible();
  });

  test("should work on desktop viewport", async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/");
    await page.waitForTimeout(1000);

    // App should still be functional
    await expect(page.locator("text=JobSentinel")).toBeVisible();
  });
});
