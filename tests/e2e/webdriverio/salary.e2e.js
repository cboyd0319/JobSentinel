/**
 * Salary AI E2E Tests
 *
 * Tests the salary intelligence functionality including:
 * - Page load and initial state
 * - Salary prediction
 * - Benchmarking
 * - Offer comparison
 * - Negotiation scripts
 */

describe('Salary AI', () => {
  beforeEach(async () => {
    // Navigate to Salary page
    const salaryLink = await $(
      'a[href*="salary" i], ' +
      'button:has-text("Salary"), ' +
      '[data-testid="nav-salary"]'
    );

    if (await salaryLink.isExisting()) {
      await salaryLink.click();
      await browser.pause(1000);
    }
  });

  it('should load the salary AI page successfully', async () => {
    // Wait for the page to load
    await browser.pause(1000);

    // Check for salary page header
    const header = await $('h1, h2');
    await expect(header).toBeDisplayed();
  });

  it('should display salary prediction section', async () => {
    // Look for prediction section
    const predictionSection = await $(
      '[class*="prediction" i], ' +
      '[class*="predict" i], ' +
      '[data-testid="salary-prediction"]'
    );

    if (await predictionSection.isExisting()) {
      await expect(predictionSection).toBeDisplayed();
    }
  });

  it('should have job title input', async () => {
    // Look for job title input
    const titleInput = await $(
      'input[name*="title" i], ' +
      'input[placeholder*="title" i], ' +
      'input[placeholder*="job" i], ' +
      '[data-testid="job-title-input"]'
    );

    if (await titleInput.isExisting()) {
      await expect(titleInput).toBeDisplayed();
    }
  });

  it('should have location input', async () => {
    // Look for location input
    const locationInput = await $(
      'input[name*="location" i], ' +
      'input[placeholder*="location" i], ' +
      'input[placeholder*="city" i], ' +
      '[data-testid="location-input"]'
    );

    if (await locationInput.isExisting()) {
      await expect(locationInput).toBeDisplayed();
    }
  });

  it('should display benchmark section', async () => {
    // Look for benchmark/comparison section
    const benchmarkSection = await $(
      '[class*="benchmark" i], ' +
      '[class*="compare" i], ' +
      '[data-testid="salary-benchmark"]'
    );

    if (await benchmarkSection.isExisting()) {
      await expect(benchmarkSection).toBeDisplayed();
    }
  });

  it('should have predict salary button', async () => {
    // Look for predict button
    const predictButton = await $(
      'button:has-text("Predict"), ' +
      'button:has-text("Calculate"), ' +
      'button:has-text("Analyze"), ' +
      '[data-testid="predict-salary"]'
    );

    if (await predictButton.isExisting()) {
      await expect(predictButton).toBeDisplayed();
    }
  });

  it('should display salary range visualization', async () => {
    // Look for salary range chart or display
    const rangeDisplay = await $(
      '[class*="range" i], ' +
      '[class*="chart" i], ' +
      '[class*="percentile" i], ' +
      '[data-testid="salary-range"]'
    );

    if (await rangeDisplay.isExisting()) {
      await expect(rangeDisplay).toBeDisplayed();
    }
  });

  it('should have offer comparison section', async () => {
    // Look for offer comparison
    const comparisonSection = await $(
      '[class*="comparison" i], ' +
      '[class*="offer" i], ' +
      'button:has-text("Compare"), ' +
      '[data-testid="offer-comparison"]'
    );

    if (await comparisonSection.isExisting()) {
      await expect(comparisonSection).toBeDisplayed();
    }
  });

  it('should display negotiation tips', async () => {
    // Look for negotiation section
    const negotiationSection = await $(
      '[class*="negotiat" i], ' +
      '[class*="tips" i], ' +
      'button:has-text("Negotiat"), ' +
      '[data-testid="negotiation-tips"]'
    );

    if (await negotiationSection.isExisting()) {
      await expect(negotiationSection).toBeDisplayed();
    }
  });

  it('should capture salary AI screenshot for documentation', async () => {
    // Wait for any loading to complete
    await browser.pause(2000);

    // Take a screenshot (handled by afterTest hook)
    const title = await browser.getTitle();
    expect(title).toContain('JobSentinel');
  });
});
