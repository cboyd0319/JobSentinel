import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

const STATUS_LABELS: Record<string, string> = {
  to_apply: "To Apply",
  applied: "Applied",
  screening_call: "Screening Call",
  phone_interview: "Phone Interview",
  technical_interview: "Skills Interview",
  onsite_interview: "Onsite Interview",
  offer_received: "Offer Received",
  offer_accepted: "Offer Accepted",
  offer_rejected: "Offer Declined",
  rejected: "Not Selected",
  withdrawn: "Withdrawn",
  ghosted: "No Response",
};

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

  get summaryButton(): Locator {
    return this.page.getByRole("button", { name: "Summary" });
  }

  get reviewNoResponsesButton(): Locator {
    return this.page.getByRole("button", { name: "Review No Responses" });
  }

  get pendingReminders(): Locator {
    return this.page.locator("[data-testid='pending-reminders']");
  }

  get pendingReminderRows(): Locator {
    return this.page.locator("[data-testid='pending-reminder']");
  }

  get detailDialog(): Locator {
    return this.page
      .getByRole("dialog")
      .filter({ has: this.page.locator("[data-testid='application-detail-dialog']") });
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
    const targetColumn = this.getColumn(targetStatus);
    if ((await targetColumn.count()) === 0) {
      return;
    }

    const initialCard = this.applicationCards.nth(cardIndex);
    const cardTitle = (await initialCard.locator("[data-testid='application-position']").textContent())?.trim();
    const targetLabel = STATUS_LABELS[targetStatus];

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const card = cardTitle
        ? this.getApplicationCardByText(cardTitle).first()
        : this.applicationCards.nth(cardIndex);
      await card.scrollIntoViewIfNeeded();
      const cardBox = await card.boundingBox({ timeout: 5000 });
      const targetBox = await targetColumn.boundingBox({ timeout: 5000 });
      if (!cardBox || !targetBox) return;

      await this.page.mouse.move(
        cardBox.x + cardBox.width / 2,
        cardBox.y + cardBox.height / 2,
      );
      await this.page.mouse.down();
      await this.page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + 100, {
        steps: 16,
      });
      await this.page.mouse.up();
      await this.waitForReady();

      if (!cardTitle || !targetLabel) {
        return;
      }

      const movedStatus = await this.getApplicationCardByText(cardTitle)
        .locator("[data-testid='application-status']")
        .textContent();
      if (movedStatus?.trim() === targetLabel) {
        return;
      }
    }

    if (cardTitle && targetLabel) {
      const movedStatusLocator = this.getApplicationCardByText(cardTitle)
        .locator("[data-testid='application-status']");
      await expect
        .poll(async () => (await movedStatusLocator.textContent())?.trim(), {
          timeout: 15000,
        })
        .toBe(targetLabel);
    }
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
