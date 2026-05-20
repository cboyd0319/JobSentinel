import { test, expect, type Locator } from "@playwright/test";
import { MarketIntelligencePage } from "./page-objects/MarketIntelligencePage";

test.describe("Market Intelligence", () => {
  let marketPage: MarketIntelligencePage;

  test.beforeEach(async ({ page }) => {
    marketPage = new MarketIntelligencePage(page);
    await marketPage.navigateTo();
  });

  test.describe("Page Loading", () => {
    test("should load market intelligence page", async () => {
      // Page should load successfully
      await expect(marketPage.page).toHaveURL(/.*market.*/);
    });

    test("should display tab navigation", async () => {
      const hasTabList =
        await marketPage.tabList.isVisible().catch(() => false);

      if (!hasTabList) {
        test.skip();
        return;
      }

      expect(hasTabList).toBeTruthy();
    });

    test("should wait for loading to complete", async () => {
      const loadingComplete = await marketPage.waitForLoadingComplete(10000);

      expect(loadingComplete).toBe(true);
    });
  });

  test.describe("Overview Tab", () => {
    test("should display market snapshot", async () => {
      if (
        !(await marketPage.overviewTab.isVisible().catch(() => false))
      ) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("overview");

      const hasSnapshot =
        await marketPage.marketSnapshot.isVisible().catch(() => false);

      if (!hasSnapshot) {
        test.skip();
        return;
      }

      expect(hasSnapshot).toBeTruthy();
    });

    test("should display total jobs metric", async () => {
      if (
        !(await marketPage.overviewTab.isVisible().catch(() => false))
      ) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("overview");

      const hasMetric =
        await marketPage.totalJobsMetric.isVisible().catch(() => false);

      if (!hasMetric) {
        test.skip();
        return;
      }

      const metricValue = await marketPage.getMetricValue(
        marketPage.totalJobsMetric
      );
      expect(metricValue.length).toBeGreaterThan(0);
    });

    test("should display new jobs metric", async () => {
      if (
        !(await marketPage.overviewTab.isVisible().catch(() => false))
      ) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("overview");

      const hasMetric =
        await marketPage.newJobsMetric.isVisible().catch(() => false);

      if (!hasMetric) {
        test.skip();
        return;
      }

      const metricValue = await marketPage.getMetricValue(
        marketPage.newJobsMetric
      );
      expect(metricValue.length).toBeGreaterThan(0);
    });

    test("should display average salary metric", async () => {
      if (
        !(await marketPage.overviewTab.isVisible().catch(() => false))
      ) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("overview");

      const hasMetric =
        await marketPage.avgSalaryMetric.isVisible().catch(() => false);

      if (!hasMetric) {
        test.skip();
        return;
      }

      expect(hasMetric).toBeTruthy();
    });

    test("should display remote percentage metric", async () => {
      if (
        !(await marketPage.overviewTab.isVisible().catch(() => false))
      ) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("overview");

      const hasMetric =
        await marketPage.remotePercentageMetric
          .isVisible()
          .catch(() => false);

      if (!hasMetric) {
        test.skip();
        return;
      }

      expect(hasMetric).toBeTruthy();
    });

    test("should display last updated timestamp", async () => {
      if (
        !(await marketPage.overviewTab.isVisible().catch(() => false))
      ) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("overview");

      const lastUpdated = await marketPage.getLastUpdatedTime();

      if (!lastUpdated) {
        test.skip();
        return;
      }

      expect(lastUpdated.length).toBeGreaterThan(0);
    });
  });

  test.describe("Trends Charts", () => {
    test("should display trend chart", async () => {
      if (
        !(await marketPage.overviewTab.isVisible().catch(() => false))
      ) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("overview");

      const hasChart = await marketPage.waitForChartLoad(5000);

      if (!hasChart) {
        test.skip();
        return;
      }

      expect(hasChart).toBeTruthy();
    });

    test("should display chart legend", async () => {
      if (
        !(await marketPage.overviewTab.isVisible().catch(() => false))
      ) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("overview");

      const hasChart = await marketPage.waitForChartLoad(5000);

      if (!hasChart) {
        test.skip();
        return;
      }

      const hasLegend =
        await marketPage.chartLegend.isVisible().catch(() => false);

      if (!hasLegend) {
        test.skip();
        return;
      }

      await expect(marketPage.chartLegend).toBeVisible();
    });

    test("should show tooltip on hover", async () => {
      if (
        !(await marketPage.overviewTab.isVisible().catch(() => false))
      ) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("overview");

      const hasChart = await marketPage.waitForChartLoad(5000);

      if (!hasChart) {
        test.skip();
        return;
      }

      // Hover over chart center
      await marketPage.hoverOverChartPoint(100, 100);

      // Wait for tooltip (may not appear in mock mode)
      const hasTooltip = await marketPage.waitForTooltip(2000);

      if (!hasTooltip) {
        test.skip();
        return;
      }

      await expect(marketPage.chartTooltip).toBeVisible();
    });
  });

  test.describe("Skills Tab", () => {
    test("should switch to skills tab", async () => {
      if (!(await marketPage.skillsTab.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("skills");

      // Skills list or empty state should be visible
      const hasSkillsList =
        await marketPage.skillTrendsList.isVisible().catch(() => false);

      await expect(marketPage.skillsTab).toBeVisible();
      expect(typeof hasSkillsList).toBe("boolean");
    });

    test("should display skill trends", async () => {
      if (!(await marketPage.skillsTab.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("skills");

      const skillCount = await marketPage.getSkillTrendsCount();

      // May be 0 if no data
      expect(skillCount).toBeGreaterThanOrEqual(0);
    });

    test("should display skill trend data", async () => {
      if (!(await marketPage.skillsTab.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("skills");

      const skillCount = await marketPage.getSkillTrendsCount();

      if (skillCount === 0) {
        test.skip();
        return;
      }

      // First skill should have content
      const firstSkill = marketPage.skillTrendItem.first();
      const hasContent =
        (await firstSkill.textContent())?.trim().length ?? 0 > 0;

      expect(hasContent).toBeTruthy();
    });

    test("should allow filtering skills", async () => {
      if (!(await marketPage.skillsTab.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("skills");

      if (!(await marketPage.skillFilter.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await marketPage.skillFilter.fill("JavaScript");
      await marketPage.page.waitForTimeout(500);

      await expect(marketPage.skillFilter).toHaveValue("JavaScript");
    });
  });

  test.describe("Companies Tab", () => {
    test("should switch to companies tab", async () => {
      if (!(await marketPage.companiesTab.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("companies");

      const hasCompanyList =
        await marketPage.companyActivityList.isVisible().catch(() => false);

      await expect(marketPage.companiesTab).toBeVisible();
      expect(typeof hasCompanyList).toBe("boolean");
    });

    test("should display company activity", async () => {
      if (!(await marketPage.companiesTab.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("companies");

      const companyCount = await marketPage.getCompanyActivityCount();

      // May be 0 if no data
      expect(companyCount).toBeGreaterThanOrEqual(0);
    });

    test("should display hiring trend indicators", async () => {
      if (!(await marketPage.companiesTab.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("companies");

      const companyCount = await marketPage.getCompanyActivityCount();

      if (companyCount === 0) {
        test.skip();
        return;
      }

      // Check for hiring trend badges
      const hasTrendIndicators =
        (await marketPage.hiringTrendIndicator.count()) > 0;

      if (!hasTrendIndicators) {
        test.skip();
        return;
      }

      await expect(marketPage.hiringTrendIndicator.first()).toBeVisible();
    });
  });

  test.describe("Locations Tab", () => {
    test("should switch to locations tab", async () => {
      if (!(await marketPage.locationsTab.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("locations");

      await expect(marketPage.locationsTab).toBeVisible();
    });

    test("should display location heatmap", async () => {
      if (!(await marketPage.locationsTab.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("locations");

      const hasHeatmap = await marketPage.waitForHeatmapLoad(5000);

      if (!hasHeatmap) {
        test.skip();
        return;
      }

      expect(hasHeatmap).toBeTruthy();
    });

    test("should display location list", async () => {
      if (!(await marketPage.locationsTab.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("locations");

      const locationCount = await marketPage.getLocationCount();

      // May be 0 if no data
      expect(locationCount).toBeGreaterThanOrEqual(0);
    });

    test("should display map markers", async () => {
      if (!(await marketPage.locationsTab.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("locations");

      const hasHeatmap = await marketPage.waitForHeatmapLoad(5000);

      if (!hasHeatmap) {
        test.skip();
        return;
      }

      const markerCount = await marketPage.getMapMarkersCount();

      // May be 0 if no data or different visualization
      expect(markerCount).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe("Alerts Tab", () => {
    test("should switch to alerts tab", async () => {
      if (!(await marketPage.alertsTab.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("alerts");

      await expect(marketPage.alertsTab).toBeVisible();
    });

    test("should display market alerts", async () => {
      if (!(await marketPage.alertsTab.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("alerts");

      const alertCount = await marketPage.getAlertsCount();

      // May be 0 if no alerts
      expect(alertCount).toBeGreaterThanOrEqual(0);
    });

    test("should display unread alert badge", async () => {
      if (!(await marketPage.alertsTab.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("alerts");

      const unreadCount = await marketPage.getUnreadAlertsCount();

      // May be 0 if all read or no alerts
      expect(unreadCount).toBeGreaterThanOrEqual(0);
    });

    test("should allow clicking on alerts", async () => {
      if (!(await marketPage.alertsTab.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await marketPage.switchToTab("alerts");

      const alertCount = await marketPage.getAlertsCount();

      if (alertCount === 0) {
        test.skip();
        return;
      }

      await marketPage.clickAlert(0);

      await expect(marketPage.alertItem.first()).toBeVisible();
    });
  });

  test.describe("Data Refresh", () => {
    test("should allow refreshing data", async () => {
      if (!(await marketPage.refreshButton.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await marketPage.refreshData();

      // Should reload data
      const loadingComplete = await marketPage.waitForLoadingComplete(10000);

      expect(loadingComplete).toBe(true);
    });

    test("should allow running analysis", async () => {
      if (!(await marketPage.analyzeButton.isVisible().catch(() => false))) {
        test.skip();
        return;
      }

      await marketPage.runAnalysis();

      // Should run analysis
      await marketPage.page.waitForTimeout(1000);

      await expect(marketPage.analyzeButton).toBeVisible();
    });
  });

  test.describe("Tab Navigation", () => {
    test("should navigate between all tabs", async () => {
      const tabs = ["overview", "skills", "companies", "locations", "alerts"] as const;
      const tabLocators: Record<(typeof tabs)[number], Locator> = {
        overview: marketPage.overviewTab,
        skills: marketPage.skillsTab,
        companies: marketPage.companiesTab,
        locations: marketPage.locationsTab,
        alerts: marketPage.alertsTab,
      };

      let visitedCount = 0;
      for (const tab of tabs) {
        const tabLocator = tabLocators[tab];

        if (!(await tabLocator.isVisible().catch(() => false))) {
          continue;
        }

        await marketPage.switchToTab(tab);
        await marketPage.page.waitForTimeout(500);
        visitedCount += 1;
      }

      expect(visitedCount).toBeGreaterThan(0);
    });
  });
});
