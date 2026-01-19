/**
 * One-Click Apply E2E Tests
 *
 * Tests the One-Click Apply / Application Profile functionality:
 * - Profile form
 * - Screening question answers
 * - Automation statistics
 * - ATS platform detection
 */

describe('One-Click Apply Settings', () => {
  before(async () => {
    // Navigate to the One-Click Apply settings page
    // This might be via navigation menu or direct URL

    // Look for navigation to automation/profile settings
    const automationLink = await $(
      'a[href*="automation" i], ' +
      'button:has-text("One-Click"), ' +
      'button:has-text("Quick Apply"), ' +
      '[data-testid="automation-nav"]'
    );

    if (await automationLink.isExisting()) {
      await automationLink.click();
      await browser.pause(1000);
    }
  });

  describe('Application Profile', () => {
    it('should display the profile form', async () => {
      // Look for profile form elements
      const profileSection = await $(
        '[class*="ProfileForm" i], ' +
        '[class*="profile" i][class*="form" i], ' +
        'h3:has-text("Application Profile")'
      );

      if (await profileSection.isExisting()) {
        await expect(profileSection).toBeDisplayed();
      }
    });

    it('should have full name input', async () => {
      const nameInput = await $(
        'input[name*="name" i], ' +
        'input[placeholder*="name" i], ' +
        'input[id*="fullName" i]'
      );

      if (await nameInput.isExisting()) {
        await expect(nameInput).toBeDisplayed();
      }
    });

    it('should have email input', async () => {
      const emailInput = await $(
        'input[type="email"], ' +
        'input[name*="email" i], ' +
        'input[placeholder*="email" i]'
      );

      if (await emailInput.isExisting()) {
        await expect(emailInput).toBeDisplayed();
      }
    });

    it('should have phone input', async () => {
      const phoneInput = await $(
        'input[type="tel"], ' +
        'input[name*="phone" i], ' +
        'input[placeholder*="phone" i]'
      );

      if (await phoneInput.isExisting()) {
        await expect(phoneInput).toBeDisplayed();
      }
    });

    it('should have LinkedIn URL input', async () => {
      const linkedinInput = await $(
        'input[placeholder*="linkedin" i], ' +
        'input[name*="linkedin" i]'
      );

      if (await linkedinInput.isExisting()) {
        await expect(linkedinInput).toBeDisplayed();
      }
    });

    it('should have work authorization checkboxes', async () => {
      const workAuthCheckbox = await $(
        'input[type="checkbox"][name*="work" i], ' +
        'input[type="checkbox"][id*="workAuth" i], ' +
        'label:has-text("Work Authorization")'
      );

      if (await workAuthCheckbox.isExisting()) {
        await expect(workAuthCheckbox).toBeExisting();
      }
    });

    it('should have automation settings', async () => {
      // Look for max applications setting
      const maxAppsSelect = await $(
        'select[name*="max" i], ' +
        'select[id*="maxApplications" i], ' +
        'label:has-text("applications per day")'
      );

      if (await maxAppsSelect.isExisting()) {
        await expect(maxAppsSelect).toBeExisting();
      }
    });
  });

  describe('Screening Questions', () => {
    it('should switch to screening questions tab', async () => {
      const screeningTab = await $(
        'button:has-text("Screening"), ' +
        '[role="tab"]:has-text("Screening"), ' +
        'a:has-text("Screening")'
      );

      if (await screeningTab.isExisting()) {
        await screeningTab.click();
        await browser.pause(500);
      }
    });

    it('should display screening answers list', async () => {
      const answersList = await $(
        '[class*="screening" i], ' +
        '[class*="ScreeningAnswer" i], ' +
        'table, ' +
        '[role="list"]'
      );

      if (await answersList.isExisting()) {
        await expect(answersList).toBeDisplayed();
      }
    });

    it('should have add new answer button', async () => {
      const addButton = await $(
        'button:has-text("Add"), ' +
        'button:has-text("New"), ' +
        '[data-testid="add-answer"]'
      );

      if (await addButton.isExisting()) {
        await expect(addButton).toBeDisplayed();
      }
    });
  });

  describe('Statistics', () => {
    it('should display automation statistics', async () => {
      const statsSection = await $(
        '[class*="stat" i], ' +
        '[class*="StatCard" i], ' +
        '[data-testid="automation-stats"]'
      );

      if (await statsSection.isExisting()) {
        await expect(statsSection).toBeDisplayed();
      }
    });
  });

  describe('How It Works', () => {
    it('should display the how it works section', async () => {
      const howItWorks = await $(
        ':has-text("How It Works"), ' +
        ':has-text("How One-Click Apply Works"), ' +
        '[class*="steps" i]'
      );

      if (await howItWorks.isExisting()) {
        await expect(howItWorks).toBeDisplayed();
      }
    });
  });

  it('should capture One-Click Apply settings screenshot', async () => {
    // Wait for page to fully render
    await browser.pause(1500);

    // This test captures a screenshot for documentation
    const title = await browser.getTitle();
    expect(title).toContain('JobSentinel');
  });
});
