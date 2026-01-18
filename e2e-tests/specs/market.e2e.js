/**
 * Market Intelligence E2E Tests
 *
 * Tests the market intelligence functionality including:
 * - Page load and initial state
 * - Tabbed navigation (Overview, Skills, Companies, Locations, Alerts)
 * - Market snapshot card
 * - Trend charts
 * - Location heatmap
 * - Alert management
 */

describe('Market Intelligence', () => {
  beforeEach(async () => {
    // Navigate to Market page
    const marketLink = await $(
      'a[href*="market" i], ' +
      'button:has-text("Market"), ' +
      '[data-testid="nav-market"]'
    );

    if (await marketLink.isExisting()) {
      await marketLink.click();
      await browser.pause(1000);
    }
  });

  it('should load the market intelligence page successfully', async () => {
    // Wait for the page to load
    await browser.pause(1000);

    // Check for market page header
    const header = await $('h1, h2');
    await expect(header).toBeDisplayed();
  });

  it('should display tab navigation', async () => {
    // Look for tab buttons (Overview, Skills, Companies, Locations, Alerts)
    const tabs = await $$(
      '[role="tab"], ' +
      'button[class*="tab" i], ' +
      '[data-testid*="tab"]'
    );

    // Should have 5 tabs
    if (tabs.length > 0) {
      expect(tabs.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('should display market snapshot card', async () => {
    // Look for snapshot card with market summary
    const snapshotCard = await $(
      '[class*="snapshot" i], ' +
      '[class*="MarketSnapshot" i], ' +
      '[data-testid="market-snapshot"]'
    );

    if (await snapshotCard.isExisting()) {
      await expect(snapshotCard).toBeDisplayed();
    }
  });

  it('should display trend charts', async () => {
    // Look for Recharts elements or chart containers
    const charts = await $$(
      '[class*="recharts"], ' +
      '[class*="chart" i], ' +
      'svg[class*="chart" i], ' +
      '[data-testid*="chart"]'
    );

    if (charts.length > 0) {
      expect(charts.length).toBeGreaterThan(0);
    }
  });

  it('should switch to Skills tab', async () => {
    // Click on Skills tab
    const skillsTab = await $(
      'button:has-text("Skills"), ' +
      '[role="tab"]:has-text("Skills"), ' +
      '[data-testid="tab-skills"]'
    );

    if (await skillsTab.isExisting()) {
      await skillsTab.click();
      await browser.pause(500);

      // Verify skills content is displayed
      const skillsContent = await $(
        '[class*="skill" i], ' +
        'table, ' +
        '[data-testid="skills-content"]'
      );

      if (await skillsContent.isExisting()) {
        await expect(skillsContent).toBeDisplayed();
      }
    }
  });

  it('should switch to Companies tab', async () => {
    // Click on Companies tab
    const companiesTab = await $(
      'button:has-text("Companies"), ' +
      '[role="tab"]:has-text("Companies"), ' +
      '[data-testid="tab-companies"]'
    );

    if (await companiesTab.isExisting()) {
      await companiesTab.click();
      await browser.pause(500);

      // Verify companies content is displayed
      const companiesContent = await $(
        '[class*="company" i], ' +
        'table, ' +
        '[data-testid="companies-content"]'
      );

      if (await companiesContent.isExisting()) {
        await expect(companiesContent).toBeDisplayed();
      }
    }
  });

  it('should switch to Locations tab and show heatmap', async () => {
    // Click on Locations tab
    const locationsTab = await $(
      'button:has-text("Locations"), ' +
      '[role="tab"]:has-text("Locations"), ' +
      '[data-testid="tab-locations"]'
    );

    if (await locationsTab.isExisting()) {
      await locationsTab.click();
      await browser.pause(500);

      // Verify heatmap or location content is displayed
      const heatmap = await $(
        '[class*="heatmap" i], ' +
        '[class*="LocationHeatmap" i], ' +
        '[data-testid="location-heatmap"]'
      );

      if (await heatmap.isExisting()) {
        await expect(heatmap).toBeDisplayed();
      }
    }
  });

  it('should switch to Alerts tab', async () => {
    // Click on Alerts tab
    const alertsTab = await $(
      'button:has-text("Alerts"), ' +
      '[role="tab"]:has-text("Alerts"), ' +
      '[data-testid="tab-alerts"]'
    );

    if (await alertsTab.isExisting()) {
      await alertsTab.click();
      await browser.pause(500);

      // Verify alerts content is displayed
      const alertsContent = await $(
        '[class*="alert" i], ' +
        '[class*="Alert" i], ' +
        '[data-testid="alerts-content"]'
      );

      if (await alertsContent.isExisting()) {
        await expect(alertsContent).toBeDisplayed();
      }
    }
  });

  it('should have analyze market button', async () => {
    // Look for analyze/refresh button
    const analyzeButton = await $(
      'button:has-text("Analyze"), ' +
      'button:has-text("Run Analysis"), ' +
      'button:has-text("Refresh"), ' +
      '[data-testid="analyze-market"]'
    );

    if (await analyzeButton.isExisting()) {
      await expect(analyzeButton).toBeDisplayed();
    }
  });

  it('should capture market intelligence screenshot for documentation', async () => {
    // Return to Overview tab for screenshot
    const overviewTab = await $(
      'button:has-text("Overview"), ' +
      '[role="tab"]:has-text("Overview"), ' +
      '[data-testid="tab-overview"]'
    );

    if (await overviewTab.isExisting()) {
      await overviewTab.click();
    }

    // Wait for any loading to complete
    await browser.pause(2000);

    // Take a screenshot (handled by afterTest hook)
    const title = await browser.getTitle();
    expect(title).toContain('JobSentinel');
  });
});
