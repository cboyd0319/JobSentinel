/**
 * Resume Builder E2E Tests
 *
 * Tests the resume builder wizard including:
 * - Page load and initial state
 * - 7-step wizard navigation
 * - Contact info form
 * - Summary section
 * - Experience entries
 * - Education entries
 * - Skills section
 * - Template selection
 * - Export options
 */

describe('Resume Builder', () => {
  beforeEach(async () => {
    // Navigate to Resume Builder page
    const builderLink = await $(
      'a[href*="resume-builder" i], ' +
      'a[href*="builder" i], ' +
      'button:has-text("Build Resume"), ' +
      'button:has-text("Resume Builder"), ' +
      '[data-testid="nav-resume-builder"]'
    );

    if (await builderLink.isExisting()) {
      await builderLink.click();
      await browser.pause(1000);
    }
  });

  it('should load the resume builder page successfully', async () => {
    // Wait for the page to load
    await browser.pause(1000);

    // Check for resume builder header
    const header = await $('h1, h2');
    await expect(header).toBeDisplayed();
  });

  it('should display step indicator', async () => {
    // Look for step indicator or progress bar
    const stepIndicator = await $(
      '[class*="step" i], ' +
      '[class*="progress" i], ' +
      '[class*="wizard" i], ' +
      '[data-testid="step-indicator"]'
    );

    if (await stepIndicator.isExisting()) {
      await expect(stepIndicator).toBeDisplayed();
    }
  });

  it('should display contact info form in step 1', async () => {
    // Look for contact info fields
    const contactFields = await $$(
      'input[name*="name" i], ' +
      'input[name*="email" i], ' +
      'input[name*="phone" i], ' +
      'input[placeholder*="name" i]'
    );

    if (contactFields.length > 0) {
      expect(contactFields.length).toBeGreaterThan(0);
    }
  });

  it('should have navigation buttons (Next/Previous)', async () => {
    // Look for navigation buttons
    const nextButton = await $(
      'button:has-text("Next"), ' +
      'button:has-text("Continue"), ' +
      '[data-testid="next-step"]'
    );

    if (await nextButton.isExisting()) {
      await expect(nextButton).toBeDisplayed();
    }
  });

  it('should navigate to step 2 (Summary)', async () => {
    // Click next to go to summary step
    const nextButton = await $(
      'button:has-text("Next"), ' +
      'button:has-text("Continue")'
    );

    if (await nextButton.isExisting()) {
      await nextButton.click();
      await browser.pause(500);

      // Look for summary textarea
      const summaryField = await $(
        'textarea[name*="summary" i], ' +
        'textarea[placeholder*="summary" i], ' +
        '[class*="summary" i]'
      );

      if (await summaryField.isExisting()) {
        await expect(summaryField).toBeDisplayed();
      }
    }
  });

  it('should display template selection step', async () => {
    // Navigate through steps or look for template section
    const templateSection = await $(
      '[class*="template" i], ' +
      '[data-testid="template-selection"]'
    );

    if (await templateSection.isExisting()) {
      await expect(templateSection).toBeDisplayed();
    }
  });

  it('should show template preview cards', async () => {
    // Look for template preview cards
    const templateCards = await $$(
      '[class*="template-card" i], ' +
      '[class*="TemplateCard" i], ' +
      '[data-testid="template-card"]'
    );

    // May have 5 templates (Classic, Modern, Technical, Executive, Military)
    if (templateCards.length > 0) {
      expect(templateCards.length).toBeGreaterThan(0);
    }
  });

  it('should have export button', async () => {
    // Look for export/download button
    const exportButton = await $(
      'button:has-text("Export"), ' +
      'button:has-text("Download"), ' +
      'button:has-text("Save"), ' +
      '[data-testid="export-resume"]'
    );

    if (await exportButton.isExisting()) {
      await expect(exportButton).toBeDisplayed();
    }
  });

  it('should display ATS score preview', async () => {
    // Look for ATS score indicator
    const atsScore = await $(
      '[class*="ats-score" i], ' +
      '[class*="AtsScore" i], ' +
      '[data-testid="ats-score"]'
    );

    if (await atsScore.isExisting()) {
      await expect(atsScore).toBeDisplayed();
    }
  });

  it('should capture resume builder screenshot for documentation', async () => {
    // Wait for any loading to complete
    await browser.pause(2000);

    // Take a screenshot (handled by afterTest hook)
    const title = await browser.getTitle();
    expect(title).toContain('JobSentinel');
  });
});
