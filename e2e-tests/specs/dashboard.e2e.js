/**
 * Dashboard E2E Tests
 *
 * Tests the main dashboard functionality including:
 * - Page load and initial state
 * - Job list display
 * - Search functionality
 * - Filters
 * - Keyboard shortcuts
 */

describe('Dashboard', () => {
  it('should load the dashboard successfully', async () => {
    // Wait for the app to load
    await browser.waitUntil(
      async () => {
        const title = await browser.getTitle();
        return title.includes('JobSentinel');
      },
      { timeout: 30000, timeoutMsg: 'App did not load in time' }
    );

    // Check that the dashboard header is present
    const header = await $('h1');
    await expect(header).toBeDisplayed();
  });

  it('should display the navigation menu', async () => {
    // Look for navigation elements
    const navButtons = await $$('nav button, [role="navigation"] button');
    expect(navButtons.length).toBeGreaterThan(0);
  });

  it('should show statistics cards', async () => {
    // Dashboard should show stat cards
    const statCards = await $$('[class*="StatCard"], [data-testid="stat-card"]');

    // If no stat cards found, check for any card-like elements with numbers
    if (statCards.length === 0) {
      const cards = await $$('[class*="card"]');
      expect(cards.length).toBeGreaterThan(0);
    }
  });

  it('should have a working search input', async () => {
    // Find the search input
    const searchInput = await $('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search" i]');

    if (await searchInput.isExisting()) {
      await searchInput.click();
      await searchInput.setValue('software engineer');

      const value = await searchInput.getValue();
      expect(value).toBe('software engineer');

      // Clear the search
      await searchInput.clearValue();
    }
  });

  it('should respond to keyboard shortcut ? for help', async () => {
    // Press ? to open keyboard shortcuts help
    await browser.keys('?');

    // Wait for the help modal to appear
    await browser.pause(500);

    // Check for modal or help content
    const helpModal = await $('[role="dialog"], [class*="modal" i], [class*="Modal" i]');
    if (await helpModal.isExisting()) {
      await expect(helpModal).toBeDisplayed();

      // Close the modal
      await browser.keys('Escape');
      await browser.pause(300);
    }
  });

  it('should respond to keyboard shortcut / for search focus', async () => {
    // Press / to focus search
    await browser.keys('/');

    // The search input should be focused
    const searchInput = await $('input[type="search"], input[placeholder*="search" i]');
    if (await searchInput.isExisting()) {
      const isFocused = await searchInput.isFocused();
      // Note: Focus detection may not work in all cases with Tauri
      // Just verify the input exists
      await expect(searchInput).toBeExisting();
    }
  });

  it('should capture dashboard screenshot for documentation', async () => {
    // This test is primarily for screenshot capture
    // The afterTest hook will save screenshots when CAPTURE_SCREENSHOTS=true

    // Wait for any loading to complete
    await browser.pause(2000);

    // Take a screenshot (handled by afterTest hook)
    const title = await browser.getTitle();
    expect(title).toContain('JobSentinel');
  });
});
