import { expect, Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Dashboard page object - main job search and filtering
 */
export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateTo() {
    await this.goto("/");
    await this.skipSetupWizard();
  }

  get searchInput(): Locator {
    return this.page.locator("[data-testid='search-input']");
  }

  get searchButton(): Locator {
    return this.page.locator("[data-testid='btn-search-now']");
  }

  get jobList(): Locator {
    return this.page.locator("[data-testid='job-list']");
  }

  get jobCards(): Locator {
    return this.page.locator("[data-testid='job-card']");
  }

  get filterButtons(): Locator {
    return this.page.locator("button[aria-haspopup='listbox']");
  }

  get locationFilter(): Locator {
    return this.dropdownButton("Location");
  }

  get salaryFilter(): Locator {
    return this.page.getByLabel("Minimum yearly salary");
  }

  get experienceFilter(): Locator {
    return this.page.locator("[data-testid='filter-experience']");
  }

  get clearFiltersButton(): Locator {
    return this.page
      .locator(
        'button[aria-label="Clear all active filters"], button[aria-label="Clear all filters to show all jobs"]',
      )
      .first();
  }

  get emptyState(): Locator {
    return this.page.getByText(
      /No jobs yet|No jobs match your filters|No jobs found|No results|Try adjusting|Try different/i
    ).first();
  }

  async searchForJobs(query: string) {
    await this.setSearchInput(query);

    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      await this.waitForReady();
      return;
    }

    const queryTerms = normalizedQuery.split(/\s+/);
    await expect
      .poll(async () => {
        if (await this.emptyState.isVisible().catch(() => false)) {
          return true;
        }

        const cardTexts = await this.jobCards.allTextContents();
        return cardTexts.length > 0 && cardTexts.every((text) => {
          const normalizedCard = text.toLowerCase();
          return queryTerms.some((term) => normalizedCard.includes(term));
        });
      }, { timeout: 15000 })
      .toBe(true);
  }

  private async setSearchInput(query: string) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await this.searchInput.fill(query);
      if (await this.hasSearchValue(query)) {
        return;
      }

      await this.searchInput.click();
      await this.searchInput.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
      await this.page.keyboard.type(query, { delay: 5 });
      if (await this.hasSearchValue(query)) {
        return;
      }
    }

    await expect(this.searchInput).toHaveValue(query, { timeout: 15000 });
  }

  private async hasSearchValue(query: string) {
    try {
      await expect(this.searchInput).toHaveValue(query, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async clearSearch() {
    await this.searchInput.fill("");
  }

  async getJobCard(index: number = 0): Promise<JobCard> {
    const card = this.jobCards.nth(index);
    return new JobCard(card);
  }

  async applyFilter(filterType: "location" | "salary" | "experience", value: string) {
    if (filterType === "location") {
      const optionLabels: Record<string, string> = {
        all: "All Locations",
        remote: "Remote Only",
        onsite: "On-site Only",
      };
      await this.applyDropdownFilter("Location", optionLabels[value] ?? value);
      return;
    }

    if (filterType === "salary") {
      const salaryMinimums: Record<string, string> = {
        "100k+": "100",
        "150k+": "150",
        "200k+": "200",
      };
      await this.salaryFilter.fill(salaryMinimums[value] ?? value);
      await this.waitForReady();
      return;
    }

    await this.experienceFilter.click();
    await this.waitForReady();
  }

  async applyDropdownFilter(label: string, optionName: string) {
    const button = this.dropdownButton(label);
    const selectedPattern = new RegExp(escapeRegExp(optionName), "i");

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await button.click();
      const option = this.page.getByRole("option", { name: optionName }).first();
      await option.waitFor({ state: "visible", timeout: 5000 });
      await option.click();

      try {
        await expect(button).toContainText(selectedPattern, { timeout: 5000 });
        await this.waitForReady();
        return;
      } catch {
        await this.page.keyboard.press("Escape");
      }
    }

    await expect(button).toContainText(selectedPattern, { timeout: 10000 });
    await this.waitForReady();
  }

  async clearAllFilters() {
    await this.clearFiltersButton.waitFor({ state: "visible", timeout: 5000 });
    await this.clearFiltersButton.click({ force: true });
    await expect(this.searchInput).toHaveValue("", { timeout: 10000 });
    await expect(this.locationFilter).toContainText("All Locations", {
      timeout: 10000,
    });
    await this.waitForReady();
  }

  async getJobCount(): Promise<number> {
    return await this.jobCards.count();
  }

  async getVisibleJobCount(): Promise<number> {
    let count = 0;
    await expect
      .poll(async () => {
        count = await this.getJobCount();
        return count;
      })
      .toBeGreaterThan(0);
    return count;
  }

  private dropdownButton(label: string): Locator {
    return this.page
      .locator("div.relative")
      .filter({ has: this.page.locator("label", { hasText: label }) })
      .getByRole("button")
      .first();
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Job card component object
 */
export class JobCard {
  readonly locator: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
  }

  get title(): Locator {
    return this.locator.locator("[data-testid='job-title']");
  }

  get company(): Locator {
    return this.locator.locator("[data-testid='job-company']");
  }

  get viewButton(): Locator {
    return this.locator.locator("[data-testid='btn-view']");
  }

  get bookmarkButton(): Locator {
    return this.locator.locator("[data-testid='btn-bookmark']");
  }

  get applyButton(): Locator {
    return this.locator.locator("[data-testid='btn-apply']");
  }

  async hover() {
    await this.locator.hover();
  }

  async bookmark() {
    await this.hover();
    await this.bookmarkButton.click();
  }

  async view() {
    await this.viewButton.click();
  }

  async apply() {
    await this.hover();
    await this.applyButton.click();
  }

  async isBookmarked(): Promise<boolean> {
    const attr = await this.bookmarkButton.getAttribute("data-bookmarked");
    return attr !== null && attr !== "false";
  }
}
