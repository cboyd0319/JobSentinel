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
    return this.page.locator("button[aria-haspopup='listbox']");
  }

  get locationFilter(): Locator {
    return this.dropdownButton("Location");
  }

  get salaryFilter(): Locator {
    return this.page.getByLabel("Minimum salary in thousands");
  }

  get experienceFilter(): Locator {
    return this.page.locator("[data-testid='filter-experience']");
  }

  get clearFiltersButton(): Locator {
    return this.page
      .getByRole("button", {
        name: /Clear all active filters|Clear all filters to show all jobs|Clear Filters/,
      })
      .first();
  }

  get emptyState(): Locator {
    return this.page.getByText(
      /No jobs yet|No jobs match your filters|No jobs found|No results|Try adjusting|Try different/i
    ).first();
  }

  async searchForJobs(query: string) {
    await this.searchInput.fill(query);
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
    await this.dropdownButton(label).click();
    const option = this.page.getByRole("option", { name: optionName });
    await option.waitFor({ state: "visible", timeout: 5000 });
    await option.click({ force: true });
    await this.waitForReady();
  }

  async clearAllFilters() {
    try {
      await this.clearFiltersButton.waitFor({ state: "visible", timeout: 5000 });
      await this.clearFiltersButton.click({ force: true });
      await this.waitForReady();
    } catch {
      return;
    }
  }

  async getJobCount(): Promise<number> {
    return await this.jobCards.count();
  }

  private dropdownButton(label: string): Locator {
    return this.page
      .locator("div.relative")
      .filter({ has: this.page.locator("label", { hasText: label }) })
      .getByRole("button")
      .first();
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
    return attr !== null && attr !== "false";
  }
}
