import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Applications page object - application tracking kanban
 */
export class ApplicationsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateTo() {
    await this.goto("/");
    await this.skipSetupWizard();
    await this.navigateWithKeyboard(2); // Cmd+2 for Applications page
  }

  get kanbanBoard(): Locator {
    return this.page.locator("[data-testid='kanban-board']");
  }

  get columns(): Locator {
    return this.page.locator("[data-testid='kanban-column']");
  }

  getColumn(status: string): Locator {
    return this.page.locator(`[data-testid='kanban-column-${status}']`);
  }

  get applicationCards(): Locator {
    return this.page.locator("[data-testid='application-card']");
  }

  get addButton(): Locator {
    return this.page.locator("[data-testid='btn-add-application']");
  }

  get filterButton(): Locator {
    return this.page.locator("[data-testid='btn-filter-applications']");
  }

  get sortButton(): Locator {
    return this.page.locator("[data-testid='btn-sort-applications']");
  }

  async getApplicationCard(index: number = 0): Promise<ApplicationCard> {
    const card = this.applicationCards.nth(index);
    return new ApplicationCard(card);
  }

  async getCardsInColumn(status: string): Promise<number> {
    const column = this.getColumn(status);
    const cards = column.locator("[data-testid='application-card']");
    return await cards.count();
  }

  async dragCardToColumn(cardIndex: number, targetStatus: string) {
    const card = this.applicationCards.nth(cardIndex);
    const targetColumn = this.getColumn(targetStatus);

    await card.hover();
    await this.page.mouse.down();

    const targetBox = await targetColumn.boundingBox();
    if (targetBox) {
      await this.page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 50);
      await this.page.waitForTimeout(300);
      await this.page.mouse.up();
    }

    await this.waitForReady();
  }

  async addApplication(data: {
    company: string;
    position: string;
    status?: string;
    url?: string;
  }) {
    await this.addButton.click();
    await this.page.waitForTimeout(200);

    // Fill form
    await this.page.locator("input[name='company']").fill(data.company);
    await this.page.locator("input[name='position']").fill(data.position);

    if (data.status) {
      await this.page.locator("select[name='status']").selectOption(data.status);
    }

    if (data.url) {
      await this.page.locator("input[name='url']").fill(data.url);
    }

    // Submit
    const submitButton = this.page.locator("button[type='submit'], button:has-text('Add'), button:has-text('Save')");
    await submitButton.click();
    await this.waitForReady();
  }

  async filterByStatus(status: string) {
    await this.filterButton.click();
    await this.page.waitForTimeout(200);

    const statusOption = this.page.locator(`[data-value="${status}"]`);
    await statusOption.click();
    await this.waitForReady();
  }

  async sortBy(field: "date" | "company" | "position") {
    await this.sortButton.click();
    await this.page.waitForTimeout(200);

    const sortOption = this.page.locator(`[data-sort="${field}"]`);
    await sortOption.click();
    await this.waitForReady();
  }
}

/**
 * Application card component object
 */
export class ApplicationCard {
  readonly locator: Locator;

  constructor(locator: Locator) {
    this.locator = locator;
  }

  get company(): Locator {
    return this.locator.locator("[data-testid='application-company']");
  }

  get position(): Locator {
    return this.locator.locator("[data-testid='application-position']");
  }

  get status(): Locator {
    return this.locator.locator("[data-testid='application-status']");
  }

  get date(): Locator {
    return this.locator.locator("[data-testid='application-date']");
  }

  get viewButton(): Locator {
    return this.locator.locator("[data-testid='btn-view-application']");
  }

  get editButton(): Locator {
    return this.locator.locator("[data-testid='btn-edit-application']");
  }

  get deleteButton(): Locator {
    return this.locator.locator("[data-testid='btn-delete-application']");
  }

  async view() {
    await this.viewButton.click();
  }

  async edit() {
    await this.editButton.click();
  }

  async delete() {
    await this.deleteButton.click();

    // Handle confirmation
    const confirmButton = this.locator.page().locator("button:has-text('Delete'), button:has-text('Confirm')");
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
    }
  }

  async updateStatus(newStatus: string) {
    await this.status.click();
    const statusOption = this.locator.page().locator(`[data-value="${newStatus}"]`);
    await statusOption.click();
  }
}
