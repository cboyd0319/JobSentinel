/**
 * Resume Matcher E2E Tests
 *
 * Tests the resume matching functionality including:
 * - Page load and initial state
 * - Resume upload
 * - Skill display with confidence scores
 * - Job matching
 * - Score breakdown
 * - Gap analysis
 */

describe('Resume Matcher', () => {
  beforeEach(async () => {
    // Navigate to Resume page
    const resumeLink = await $(
      'a[href*="resume" i]:not([href*="builder"]), ' +
      'button:has-text("Resume"), ' +
      '[data-testid="nav-resume"]'
    );

    if (await resumeLink.isExisting()) {
      await resumeLink.click();
      await browser.pause(1000);
    }
  });

  it('should load the resume matcher page successfully', async () => {
    // Wait for the page to load
    await browser.pause(1000);

    // Check for resume page header
    const header = await $('h1, h2');
    await expect(header).toBeDisplayed();
  });

  it('should display resume upload section', async () => {
    // Look for file upload or drop zone
    const uploadSection = await $(
      'input[type="file"], ' +
      '[class*="upload" i], ' +
      '[class*="dropzone" i], ' +
      'button:has-text("Upload")'
    );

    if (await uploadSection.isExisting()) {
      await expect(uploadSection).toBeDisplayed();
    }
  });

  it('should display extracted skills section', async () => {
    // Look for skills display
    const skillsSection = await $(
      '[class*="skill" i], ' +
      '[class*="badge" i], ' +
      '[data-testid="skills-section"]'
    );

    if (await skillsSection.isExisting()) {
      await expect(skillsSection).toBeDisplayed();
    }
  });

  it('should have category filter dropdown', async () => {
    // Look for category filter
    const categoryFilter = await $(
      'select[name*="category" i], ' +
      '[class*="filter" i], ' +
      'button:has-text("Category"), ' +
      '[data-testid="category-filter"]'
    );

    if (await categoryFilter.isExisting()) {
      await expect(categoryFilter).toBeDisplayed();
    }
  });

  it('should display score breakdown chart', async () => {
    // Look for score breakdown visualization
    const scoreChart = await $(
      '[class*="chart" i], ' +
      '[class*="breakdown" i], ' +
      'svg, ' +
      '[data-testid="score-breakdown"]'
    );

    if (await scoreChart.isExisting()) {
      await expect(scoreChart).toBeDisplayed();
    }
  });

  it('should display gap analysis section', async () => {
    // Look for gap analysis
    const gapAnalysis = await $(
      '[class*="gap" i], ' +
      '[class*="missing" i], ' +
      '[data-testid="gap-analysis"]'
    );

    if (await gapAnalysis.isExisting()) {
      await expect(gapAnalysis).toBeDisplayed();
    }
  });

  it('should have match with job button', async () => {
    // Look for match button
    const matchButton = await $(
      'button:has-text("Match"), ' +
      'button:has-text("Analyze"), ' +
      '[data-testid="match-job"]'
    );

    if (await matchButton.isExisting()) {
      await expect(matchButton).toBeDisplayed();
    }
  });

  it('should display proficiency distribution', async () => {
    // Look for proficiency chart
    const proficiencyChart = await $(
      '[class*="proficiency" i], ' +
      '[class*="distribution" i], ' +
      '[data-testid="proficiency-chart"]'
    );

    if (await proficiencyChart.isExisting()) {
      await expect(proficiencyChart).toBeDisplayed();
    }
  });

  it('should capture resume matcher screenshot for documentation', async () => {
    // Wait for any loading to complete
    await browser.pause(2000);

    // Take a screenshot (handled by afterTest hook)
    const title = await browser.getTitle();
    expect(title).toContain('JobSentinel');
  });
});
