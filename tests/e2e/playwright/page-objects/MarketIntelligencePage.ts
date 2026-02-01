import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page object for Market Intelligence features
 */
export class MarketIntelligencePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateTo() {
    await this.goto("/market");
    await this.skipSetupWizard();
  }

  // Tab navigation
  get tabList(): Locator {
    return this.page.locator("[role='tablist'], [class*='tab']");
  }

  get overviewTab(): Locator {
    return this.page.locator("button:has-text('Overview'), [data-tab='overview']");
  }

  get skillsTab(): Locator {
    return this.page.locator("button:has-text('Skills'), [data-tab='skills']");
  }

  get companiesTab(): Locator {
    return this.page.locator("button:has-text('Companies'), [data-tab='companies']");
  }

  get locationsTab(): Locator {
    return this.page.locator("button:has-text('Locations'), [data-tab='locations']");
  }

  get alertsTab(): Locator {
    return this.page.locator("button:has-text('Alerts'), [data-tab='alerts']");
  }

  // Overview tab
  get marketSnapshot(): Locator {
    return this.page.locator("[data-testid='market-snapshot'], [class*='snapshot']");
  }

  get totalJobsMetric(): Locator {
    return this.page.locator(
      "text=Total Jobs, [data-metric='total-jobs']"
    ).locator("..");
  }

  get newJobsMetric(): Locator {
    return this.page.locator(
      "text=New Jobs, [data-metric='new-jobs']"
    ).locator("..");
  }

  get avgSalaryMetric(): Locator {
    return this.page.locator(
      "text=Avg Salary, text=Average Salary"
    ).locator("..");
  }

  get remotePercentageMetric(): Locator {
    return this.page.locator(
      "text=Remote, [data-metric='remote-percent']"
    ).locator("..");
  }

  // Trends charts
  get trendChart(): Locator {
    return this.page.locator(
      "[data-testid='trend-chart'], [class*='recharts'], svg[class*='chart']"
    );
  }

  get chartLegend(): Locator {
    return this.page.locator(".recharts-legend-wrapper, [class*='legend']");
  }

  get chartTooltip(): Locator {
    return this.page.locator(".recharts-tooltip-wrapper");
  }

  // Skills tab
  get skillTrendsList(): Locator {
    return this.page.locator("[data-testid='skill-trends'], [class*='skill-trend']");
  }

  get skillTrendItem(): Locator {
    return this.page.locator("[data-testid='skill-item'], [class*='skill-row']");
  }

  get skillFilter(): Locator {
    return this.page.locator("input[placeholder*='filter' i], input[placeholder*='search' i]");
  }

  // Companies tab
  get companyActivityList(): Locator {
    return this.page.locator("[data-testid='company-activity'], [class*='company-list']");
  }

  get companyActivityItem(): Locator {
    return this.page.locator("[data-testid='company-item'], [class*='company-row']");
  }

  get hiringTrendIndicator(): Locator {
    return this.page.locator(
      "[data-testid='hiring-trend'], [class*='trend-badge']"
    );
  }

  // Locations tab
  get locationHeatmap(): Locator {
    return this.page.locator(
      "[data-testid='location-heatmap'], [class*='heatmap']"
    );
  }

  get locationList(): Locator {
    return this.page.locator("[data-testid='location-list'], [class*='location-item']");
  }

  get mapMarker(): Locator {
    return this.page.locator(
      "[data-testid='map-marker'], circle, [class*='marker']"
    );
  }

  // Alerts tab
  get alertsList(): Locator {
    return this.page.locator("[data-testid='market-alerts'], [class*='alert-list']");
  }

  get alertItem(): Locator {
    return this.page.locator("[data-testid='alert-item'], [class*='alert-card']");
  }

  get unreadAlertBadge(): Locator {
    return this.page.locator("[data-testid='unread-badge'], [class*='badge']");
  }

  // Refresh and actions
  get refreshButton(): Locator {
    return this.page.locator("button:has-text('Refresh'), [data-testid='refresh-btn']");
  }

  get analyzeButton(): Locator {
    return this.page.locator("button:has-text('Analyze'), button:has-text('Run Analysis')");
  }

  get loadingIndicator(): Locator {
    return this.page.locator("[data-testid='loading'], [class*='spinner']");
  }

  get lastUpdatedText(): Locator {
    return this.page.locator(
      "text=last updated, text=Updated, [data-testid='last-updated']"
    );
  }

  // Actions
  async switchToTab(tabName: "overview" | "skills" | "companies" | "locations" | "alerts") {
    const tabs = {
      overview: this.overviewTab,
      skills: this.skillsTab,
      companies: this.companiesTab,
      locations: this.locationsTab,
      alerts: this.alertsTab,
    };

    const tab = tabs[tabName];
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await this.waitForReady();
    }
  }

  async getMetricValue(metricLocator: Locator): Promise<string> {
    try {
      const text = await metricLocator.textContent();
      return text?.trim() || "";
    } catch {
      return "";
    }
  }

  async waitForChartLoad(timeout: number = 5000): Promise<boolean> {
    try {
      await this.trendChart.waitFor({ state: "visible", timeout });
      // Wait for chart animation to complete
      await this.page.waitForTimeout(500);
      return true;
    } catch {
      return false;
    }
  }

  async hoverOverChartPoint(x: number, y: number) {
    const chart = this.trendChart.first();
    const box = await chart.boundingBox();

    if (box) {
      await this.page.mouse.move(box.x + x, box.y + y);
      await this.page.waitForTimeout(300);
    }
  }

  async waitForTooltip(timeout: number = 3000): Promise<boolean> {
    try {
      await this.chartTooltip.waitFor({ state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  }

  async getSkillTrendsCount(): Promise<number> {
    return await this.skillTrendItem.count();
  }

  async getSkillTrendByName(skillName: string): Promise<Locator | null> {
    const items = await this.skillTrendItem.all();
    for (const item of items) {
      const text = await item.textContent();
      if (text?.toLowerCase().includes(skillName.toLowerCase())) {
        return item;
      }
    }
    return null;
  }

  async getCompanyActivityCount(): Promise<number> {
    return await this.companyActivityItem.count();
  }

  async getCompanyByName(companyName: string): Promise<Locator | null> {
    const items = await this.companyActivityItem.all();
    for (const item of items) {
      const text = await item.textContent();
      if (text?.toLowerCase().includes(companyName.toLowerCase())) {
        return item;
      }
    }
    return null;
  }

  async waitForHeatmapLoad(timeout: number = 5000): Promise<boolean> {
    try {
      await this.locationHeatmap.waitFor({ state: "visible", timeout });
      await this.page.waitForTimeout(500);
      return true;
    } catch {
      return false;
    }
  }

  async getLocationCount(): Promise<number> {
    return await this.locationList.count();
  }

  async getMapMarkersCount(): Promise<number> {
    return await this.mapMarker.count();
  }

  async getAlertsCount(): Promise<number> {
    return await this.alertItem.count();
  }

  async getUnreadAlertsCount(): Promise<number> {
    try {
      const badge = this.unreadAlertBadge.first();
      const text = await badge.textContent();
      const match = text?.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    } catch {
      return 0;
    }
  }

  async clickAlert(index: number) {
    const alert = this.alertItem.nth(index);
    if (await alert.isVisible().catch(() => false)) {
      await alert.click();
      await this.page.waitForTimeout(300);
    }
  }

  async refreshData() {
    if (await this.refreshButton.isVisible().catch(() => false)) {
      await this.refreshButton.click();
      await this.waitForReady();
    }
  }

  async runAnalysis() {
    if (await this.analyzeButton.isVisible().catch(() => false)) {
      await this.analyzeButton.click();
      await this.waitForReady();
    }
  }

  async waitForLoadingComplete(timeout: number = 10000): Promise<boolean> {
    try {
      await this.loadingIndicator.waitFor({ state: "hidden", timeout });
      return true;
    } catch {
      return false;
    }
  }

  async getLastUpdatedTime(): Promise<string> {
    try {
      const text = await this.lastUpdatedText.textContent();
      return text?.trim() || "";
    } catch {
      return "";
    }
  }
}
