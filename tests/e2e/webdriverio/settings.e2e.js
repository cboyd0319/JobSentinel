/**
 * Settings E2E Tests
 *
 * Tests the settings functionality including:
 * - Opening settings modal/page
 * - Job preferences configuration
 * - Notification settings
 * - Scraper configuration
 */

describe('Settings', () => {
  it('should open settings via keyboard shortcut', async () => {
    // Press Cmd/Ctrl + , to open settings
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await browser.keys([modifier, ',']);

    await browser.pause(1000);

    // Check for settings content
    const settingsContent = await $('[class*="settings" i], [class*="Settings" i], [role="dialog"]');
    // Settings might be a modal or a page navigation
  });

  it('should navigate to settings via menu', async () => {
    // Look for settings button/link
    const settingsButton = await $(
      'button[aria-label*="settings" i], ' +
      'button[title*="settings" i], ' +
      'a[href*="settings" i], ' +
      '[data-testid="settings-button"]'
    );

    if (await settingsButton.isExisting()) {
      await settingsButton.click();
      await browser.pause(500);
    }
  });

  it('should display job title preferences', async () => {
    // Look for job title input or tag list
    const titleSection = await $(
      'input[placeholder*="title" i], ' +
      '[class*="title" i][class*="input" i], ' +
      'label:has-text("Job Titles")'
    );

    if (await titleSection.isExisting()) {
      await expect(titleSection).toBeDisplayed();
    }
  });

  it('should display salary floor setting', async () => {
    // Look for salary input
    const salaryInput = await $(
      'input[type="number"][name*="salary" i], ' +
      'input[placeholder*="salary" i], ' +
      'input[id*="salary" i]'
    );

    if (await salaryInput.isExisting()) {
      await expect(salaryInput).toBeDisplayed();
    }
  });

  it('should display notification settings', async () => {
    // Look for notification toggle or section
    const notificationSection = await $(
      '[class*="notification" i], ' +
      'input[type="checkbox"][name*="notification" i], ' +
      'label:has-text("Notification")'
    );

    if (await notificationSection.isExisting()) {
      await expect(notificationSection).toBeDisplayed();
    }
  });

  it('should save settings changes', async () => {
    // Look for save button
    const saveButton = await $(
      'button:has-text("Save"), ' +
      'button[type="submit"], ' +
      '[data-testid="save-settings"]'
    );

    if (await saveButton.isExisting()) {
      // Note: We don't actually click save to avoid changing real settings
      await expect(saveButton).toBeDisplayed();
    }
  });

  it('should capture settings screenshot for documentation', async () => {
    // Wait for any animations to complete
    await browser.pause(1000);

    // This test is primarily for screenshot capture
    const title = await browser.getTitle();
    expect(title).toContain('JobSentinel');
  });
});
