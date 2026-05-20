import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page object for Market Intelligence workflows.
 */
export class MarketIntelligencePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateTo() {
    await this.goto("/");
    await this.skipSetupWizard();
    await this.navigateToPage("Market Intel");
    await expect(this.heading).toBeVisible({ timeout: 15000 });
  }

  get heading(): Locator {
    return this.page.getByRole("heading", { name: "Market Intelligence" });
  }

  get tabList(): Locator {
    return this.page.getByRole("tablist", {
      name: "Market Intelligence sections",
    });
  }

  tab(name: "Overview" | "Skills" | "Companies" | "Locations" | "Alerts"): Locator {
    return this.page.getByRole("tab", { name });
  }

  get refreshButton(): Locator {
    return this.page.getByRole("button", { name: "Refresh Analysis" });
  }

  get marketSnapshot(): Locator {
    return this.page.getByRole("region", { name: "Market snapshot" });
  }

  get locationRegion(): Locator {
    return this.page.getByRole("region", { name: "Job Market by Location" });
  }

  get alertsFeed(): Locator {
    return this.page.getByRole("feed", { name: "Market alerts" });
  }

  async switchToTab(name: "Overview" | "Skills" | "Companies" | "Locations" | "Alerts") {
    await this.tab(name).evaluate((element: HTMLElement) => element.click());
    await expect(this.tab(name)).toHaveAttribute("aria-selected", "true");
  }

  async runAnalysis() {
    await this.refreshButton.click();
    await expect(this.refreshButton).toBeVisible();
  }

  async openLocation(locationName: string) {
    await this.page.getByRole("listitem", { name: new RegExp(locationName) }).click();
    await expect(this.page.getByRole("region", { name: new RegExp(locationName) })).toBeVisible();
  }
}
