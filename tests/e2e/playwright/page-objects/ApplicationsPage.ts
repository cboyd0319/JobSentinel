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
    await this.navigateToPage("Applications");
    await this.kanbanBoard.waitFor({ state: "visible", timeout: 15000 });
  }

  get kanbanBoard(): Locator {
    return this.page.locator("[data-testid='kanban-board']");
  }

  get columns(): Locator {
    return this.page.locator("[data-testid='kanban-column']");
  }

  getColumn(status: string): Locator {
    return this.page.locator(`[data-testid='kanban-column'][data-status='${status}']`);
  }

  get applicationCards(): Locator {
    return this.page.locator("[data-testid='application-card']");
  }

  get templatesButton(): Locator {
    return this.page.getByRole("button", { name: "Templates" });
  }

  get interviewsButton(): Locator {
    return this.page.getByRole("button", { name: "Interviews" });
  }

  get analyticsButton(): Locator {
    return this.page.getByRole("button", { name: "Analytics" });
  }

  get detectGhostedButton(): Locator {
    return this.page.getByRole("button", { name: "Detect Ghosted" });
  }

  get pendingReminders(): Locator {
    return this.page.locator("[data-testid='pending-reminders']");
  }

  get pendingReminderRows(): Locator {
    return this.page.locator("[data-testid='pending-reminder']");
  }

  get detailDialog(): Locator {
    return this.page.locator("[data-testid='application-detail-dialog']");
  }

  get statusSelect(): Locator {
    return this.detailDialog.locator("select");
  }

  get notesTextarea(): Locator {
    return this.detailDialog.locator("textarea");
  }

  get saveNotesButton(): Locator {
    return this.detailDialog.getByRole("button", { name: "Save Notes" });
  }

  get closeDialogButton(): Locator {
    return this.detailDialog.getByRole("button", { name: "Close", exact: true });
  }

  getApplicationCardByText(text: string): Locator {
    return this.applicationCards.filter({ hasText: text });
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
    if ((await targetColumn.count()) === 0) {
      return;
    }
    await card.scrollIntoViewIfNeeded();
    const cardBox = await card.boundingBox({ timeout: 1000 });
    if (!cardBox) return;

    await this.page.mouse.move(
      cardBox.x + cardBox.width / 2,
      cardBox.y + cardBox.height / 2,
    );
    await this.page.mouse.down();
    await targetColumn.scrollIntoViewIfNeeded();

    const targetBox = await targetColumn.boundingBox({ timeout: 1000 });
    if (targetBox) {
      await this.page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 90, {
        steps: 12,
      });
    }
    await this.page.mouse.up();

    await this.waitForReady();
  }

  async openApplicationDetails(cardText: string) {
    await this.getApplicationCardByText(cardText).click();
    await this.detailDialog.waitFor({ state: "visible", timeout: 5000 });
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

  async open() {
    await this.locator.click();
  }
}
