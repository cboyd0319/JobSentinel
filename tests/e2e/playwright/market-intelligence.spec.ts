import { test, expect } from "@playwright/test";
import { MarketIntelligencePage } from "./page-objects/MarketIntelligencePage";

test.describe("Market Intelligence", () => {
  let marketPage: MarketIntelligencePage;

  test.beforeEach(async ({ page }) => {
    marketPage = new MarketIntelligencePage(page);
    await marketPage.navigateTo();
  });

  test("loads overview snapshot, charts, and location heatmap @smoke", async ({ page }) => {
    await expect(marketPage.tabList).toBeVisible();
    await expect(marketPage.marketSnapshot).toBeVisible();
    await expect(page.getByLabel("911 total jobs")).toBeVisible();
    await expect(page.getByLabel("47 new jobs today")).toBeVisible();
    await expect(page.getByLabel("42 percent remote jobs")).toBeVisible();
    await expect(page.getByText("Top Skill: Customer Support")).toBeVisible();
    await expect(page.getByText("Top Company: CareBridge Health")).toBeVisible();
    await expect(page.getByRole("region", { name: "Skill Demand" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Company Hiring Activity" })).toBeVisible();
    await expect(marketPage.locationRegion).toBeVisible();
    await expect(page.getByRole("listitem", { name: /Remote: 312 jobs/ })).toBeVisible();
  });

  test("opens location details from the heatmap", async ({ page }) => {
    await marketPage.openLocation("Remote");

    await expect(page.getByRole("region", { name: /Remote/ })).toContainText("Total Jobs");
    await expect(page.getByRole("region", { name: /Remote/ })).toContainText("312");
    await expect(page.getByRole("region", { name: /Remote/ })).toContainText("Remote %");
  });

  test("shows skill trends on the skills tab", async ({ page }) => {
    await marketPage.switchToTab("Skills");

    await expect(page.getByRole("region", { name: "Skills by Demand" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Skill Trends" })).toBeVisible();
    await expect(page.getByText("Customer Support", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("512 jobs")).toBeVisible();
    await expect(page.getByText("+24.0%")).toBeVisible();
    await expect(page.getByText("$62,000")).toBeVisible();
  });

  test("shows company hiring activity on the companies tab", async ({ page }) => {
    await marketPage.switchToTab("Companies");

    await expect(page.getByRole("region", { name: "Companies by Hiring Volume" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hiring Activity" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Company" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "CareBridge Health" })).toBeVisible();
    await expect(page.getByRole("cell", { name: "45" })).toBeVisible();
    await expect(page.getByText("+25.0%")).toBeVisible();
  });

  test("shows all locations on the locations tab", async ({ page }) => {
    await marketPage.switchToTab("Locations");

    await expect(marketPage.locationRegion).toBeVisible();
    await expect(page.getByRole("listitem", { name: /Chicago, IL: 245 jobs/ })).toBeVisible();
    await expect(page.getByRole("listitem", { name: /Phoenix, AZ: 198 jobs/ })).toBeVisible();
    await expect(page.getByRole("img", { name: "Job density legend" })).toBeVisible();
  });

  test("marks market alerts as read", async ({ page }) => {
    await marketPage.switchToTab("Alerts");

    await expect(marketPage.alertsFeed).toBeVisible();
    await expect(page.getByText("2 unread alerts")).toBeVisible();
    await expect(page.getByRole("article", { name: /warning alert: Customer support demand is rising/ })).toBeVisible();
    await page.getByRole("button", { name: "Mark Customer support demand is rising as read" }).click();

    await expect(page.getByText("1 unread alert")).toBeVisible();
    await page.getByRole("button", { name: "Mark all 1 alerts as read" }).click();

    await expect(page.getByText(/unread alert/)).not.toBeVisible();
    await expect(page.getByRole("button", { name: /Mark .* as read/ })).not.toBeVisible();
  });

  test("runs market analysis and keeps refreshed data visible", async ({ page }) => {
    await marketPage.runAnalysis();

    await expect(page.getByText("Analysis complete")).toBeVisible();
    await expect(marketPage.marketSnapshot).toBeVisible();
    await expect(page.getByText("Top Skill: Customer Support")).toBeVisible();
  });

  test("navigates all tabs without losing tab state", async () => {
    for (const tab of ["Overview", "Skills", "Companies", "Locations", "Alerts"] as const) {
      await marketPage.switchToTab(tab);
    }

    await expect(marketPage.tab("Alerts")).toHaveAttribute("aria-selected", "true");
  });
});
