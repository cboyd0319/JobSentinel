import { Page, Locator } from "@playwright/test";
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
    return this.page.locator("[data-testid^='filter-']");
  }

  get locationFilter(): Locator {
    return this.page.locator("[data-testid='filter-location']");
  }

  get salaryFilter(): Locator {
    return this.page.locator("[data-testid='filter-salary']");
  }

  get experienceFilter(): Locator {
    return this.page.locator("[data-testid='filter-experience']");
  }

  get clearFiltersButton(): Locator {
    return this.page.locator("[data-testid='btn-clear-filters']");
  }

  async searchForJobs(query: string) {
    await this.searchInput.fill(query);
    await this.searchButton.click();
    await this.waitForReady();
  }

  async clearSearch() {
    await this.searchInput.clear();
  }

  async getJobCard(index: number = 0): Promise<JobCard> {
    const card = this.jobCards.nth(index);
    return new JobCard(card);
  }

  async applyFilter(filterType: "location" | "salary" | "experience", value: string) {
    const filter = {
      location: this.locationFilter,
      salary: this.salaryFilter,
      experience: this.experienceFilter,
    }[filterType];

    await filter.click();
    await this.page.waitForTimeout(200);

    const option = this.page.locator(`[data-value="${value}"]`);
    await option.click();
    await this.waitForReady();
  }

  async clearAllFilters() {
    if (await this.clearFiltersButton.isVisible().catch(() => false)) {
      await this.clearFiltersButton.click();
      await this.waitForReady();
    }
  }

  async getJobCount(): Promise<number> {
    return await this.jobCards.count();
  }
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
    return attr === "true";
  }
}
