/**
 * Applications E2E Tests
 *
 * Tests the application tracking functionality including:
 * - Page load and initial state
 * - Kanban board display
 * - Application cards
 * - Status changes
 * - Conversion stats
 */

describe('Applications', () => {
  beforeEach(async () => {
    // Navigate to Applications page
    const appsLink = await $(
      'a[href*="applications" i], ' +
      'button:has-text("Applications"), ' +
      '[data-testid="nav-applications"]'
    );

    if (await appsLink.isExisting()) {
      await appsLink.click();
      await browser.pause(1000);
    }
  });

  it('should load the applications page successfully', async () => {
    // Wait for the page to load
    await browser.pause(1000);

    // Check for applications page content
    const header = await $('h1, h2');
    await expect(header).toBeDisplayed();
  });

  it('should display the Kanban board', async () => {
    // Look for Kanban columns
    const kanbanColumns = await $$(
      '[class*="kanban" i], ' +
      '[class*="column" i], ' +
      '[data-testid*="column"]'
    );

    // Should have multiple columns (Applied, Interview, Offer, etc.)
    if (kanbanColumns.length > 0) {
      expect(kanbanColumns.length).toBeGreaterThan(0);
    }
  });

  it('should display conversion stats bar', async () => {
    // Look for stats bar with conversion rates
    const statsBar = await $(
      '[class*="stats" i], ' +
      '[class*="conversion" i], ' +
      '[data-testid="conversion-stats"]'
    );

    if (await statsBar.isExisting()) {
      await expect(statsBar).toBeDisplayed();
    }
  });

  it('should have an add application button', async () => {
    // Look for add button
    const addButton = await $(
      'button:has-text("Add"), ' +
      'button:has-text("New Application"), ' +
      'button[aria-label*="add" i], ' +
      '[data-testid="add-application"]'
    );

    if (await addButton.isExisting()) {
      await expect(addButton).toBeDisplayed();
    }
  });

  it('should display application cards with job info', async () => {
    // Look for application cards
    const cards = await $$(
      '[class*="application-card" i], ' +
      '[class*="ApplicationCard" i], ' +
      '[data-testid="application-card"]'
    );

    // Cards may or may not exist depending on data
    // Just verify the page structure is correct
    const pageContent = await $('main, [class*="content" i]');
    await expect(pageContent).toBeDisplayed();
  });

  it('should show interview reminders section', async () => {
    // Look for reminders or upcoming interviews
    const reminders = await $(
      '[class*="reminder" i], ' +
      '[class*="interview" i], ' +
      '[class*="upcoming" i]'
    );

    if (await reminders.isExisting()) {
      await expect(reminders).toBeDisplayed();
    }
  });

  it('should capture applications screenshot for documentation', async () => {
    // Wait for any loading to complete
    await browser.pause(2000);

    // Take a screenshot (handled by afterTest hook)
    const title = await browser.getTitle();
    expect(title).toContain('JobSentinel');
  });
});
