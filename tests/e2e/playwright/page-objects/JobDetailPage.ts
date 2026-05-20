import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Job card interactions on the dashboard.
 */
export class JobDetailPage extends BasePage {
  private activeCardIndex = 0;

  constructor(page: Page) {
    super(page);
  }

  async navigateTo() {
    await this.goto("/");
    await this.skipSetupWizard();
  }

  private get jobCards(): Locator {
    return this.page.locator("[data-testid='job-card']");
  }

  private get activeCard(): Locator {
    return this.jobCards.nth(this.activeCardIndex);
  }

  get jobDetailPanel(): Locator {
    return this.activeCard;
  }

  get jobTitle(): Locator {
    return this.activeCard.locator("[data-testid='job-title']");
  }

  get companyName(): Locator {
    return this.activeCard.locator("[data-testid='job-company']");
  }

  get bookmarkButton(): Locator {
    return this.activeCard.locator("[data-testid='btn-bookmark']");
  }

  get addNoteButton(): Locator {
    return this.activeCard.locator("[data-testid='btn-notes']");
  }

  get noteTextarea(): Locator {
    return this.page.getByLabel("Job notes");
  }

  get saveNoteButton(): Locator {
    return this.page.getByRole("button", {
      name: /Save Notes|Remove Notes/,
    });
  }

  get matchScore(): Locator {
    return this.activeCard.getByLabel(/^Match score:/);
  }

  async openJobDetail(index: number = 0) {
    this.activeCardIndex = index;
    await this.activeCard.waitFor({ state: "visible", timeout: 5000 });
    await this.activeCard.scrollIntoViewIfNeeded();
    await this.activeCard.hover();
  }

  async waitForDetailPanel(timeout: number = 5000): Promise<boolean> {
    try {
      await this.activeCard.waitFor({ state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  }

  async getJobTitle(): Promise<string> {
    return (await this.jobTitle.textContent())?.trim() || "";
  }

  async getCompanyName(): Promise<string> {
    return (await this.companyName.textContent())?.trim() || "";
  }

  async toggleBookmark() {
    await this.activeCard.hover();
    await this.bookmarkButton.click();
  }

  async isBookmarked(): Promise<boolean> {
    const bookmarked = await this.bookmarkButton.getAttribute(
      "data-bookmarked",
    );
    return bookmarked !== null && bookmarked !== "false";
  }

  async addNote(noteText: string) {
    await this.activeCard.hover();
    await this.addNoteButton.click({ force: true });
    await this.noteTextarea.waitFor({ state: "visible", timeout: 5000 });
    await this.noteTextarea.fill(noteText);
    await this.saveNoteButton.waitFor({ state: "visible", timeout: 5000 });
    await this.saveNoteButton.click({ force: true });
    await this.noteTextarea.waitFor({ state: "detached", timeout: 5000 });
  }

  async getNotesCount(): Promise<number> {
    const label = await this.addNoteButton.getAttribute("aria-label");
    return label === "Edit notes" ? 1 : 0;
  }

  async getMatchScore(): Promise<number | null> {
    const label = await this.matchScore.getAttribute("aria-label");
    const match = label?.match(/Match score:\s*(\d+)%/);
    return match ? parseInt(match[1], 10) : null;
  }
}
