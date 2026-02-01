import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page object for Job Detail view and interactions
 */
export class JobDetailPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateTo() {
    await this.goto("/dashboard");
    await this.skipSetupWizard();
  }

  // Job detail panel
  get jobDetailPanel(): Locator {
    return this.page.locator("[data-testid='job-detail'], [class*='job-detail']");
  }

  get jobTitle(): Locator {
    return this.page.locator("[data-testid='job-title'], h1, h2").first();
  }

  get companyName(): Locator {
    return this.page.locator("[data-testid='company-name'], [class*='company']");
  }

  get jobLocation(): Locator {
    return this.page.locator("[data-testid='job-location'], [class*='location']");
  }

  get jobDescription(): Locator {
    return this.page.locator("[data-testid='job-description'], [class*='description']");
  }

  // Job actions
  get bookmarkButton(): Locator {
    return this.page.locator(
      "button:has-text('Bookmark'), button:has-text('Save'), [data-testid='bookmark-btn']"
    );
  }

  get bookmarkedIcon(): Locator {
    return this.page.locator("[data-testid='bookmarked'], [class*='bookmarked']");
  }

  get addNoteButton(): Locator {
    return this.page.locator(
      "button:has-text('Add Note'), button:has-text('Note'), [data-testid='add-note-btn']"
    );
  }

  get notesSection(): Locator {
    return this.page.locator("[data-testid='notes-section'], [class*='notes']");
  }

  get noteTextarea(): Locator {
    return this.page.locator("textarea[placeholder*='note' i], textarea[name='note']");
  }

  get saveNoteButton(): Locator {
    return this.page.locator("button:has-text('Save Note'), button:has-text('Add')");
  }

  get notesList(): Locator {
    return this.page.locator("[data-testid='note-item'], [class*='note-card']");
  }

  // Application status
  get statusDropdown(): Locator {
    return this.page.locator(
      "select[name='status'], [data-testid='status-select']"
    );
  }

  get applyButton(): Locator {
    return this.page.locator("button:has-text('Apply'), button:has-text('Quick Apply')");
  }

  get appliedBadge(): Locator {
    return this.page.locator(
      "[data-testid='applied-badge'], text=Applied, [class*='applied']"
    );
  }

  get moveToAppliedButton(): Locator {
    return this.page.locator("button:has-text('Mark as Applied')");
  }

  // Match score
  get matchScore(): Locator {
    return this.page.locator("[data-testid='match-score'], [class*='match-score']");
  }

  get matchPercentage(): Locator {
    return this.page.locator("[data-testid='match-percentage']");
  }

  // Actions
  async openJobDetail(index: number = 0) {
    const jobCards = this.page.locator(
      "[data-testid='job-card'], [class*='job-card']"
    );
    const card = jobCards.nth(index);

    if (await card.isVisible().catch(() => false)) {
      await card.click();
      await this.waitForReady();
    }
  }

  async waitForDetailPanel(timeout: number = 5000): Promise<boolean> {
    try {
      await this.jobDetailPanel.waitFor({ state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  }

  async getJobTitle(): Promise<string> {
    try {
      return (await this.jobTitle.textContent()) || "";
    } catch {
      return "";
    }
  }

  async getCompanyName(): Promise<string> {
    try {
      return (await this.companyName.textContent()) || "";
    } catch {
      return "";
    }
  }

  async toggleBookmark() {
    if (await this.bookmarkButton.isVisible().catch(() => false)) {
      await this.bookmarkButton.click();
      await this.page.waitForTimeout(300);
    }
  }

  async isBookmarked(): Promise<boolean> {
    return await this.bookmarkedIcon.isVisible().catch(() => false);
  }

  async addNote(noteText: string) {
    // Open note input if needed
    if (await this.addNoteButton.isVisible().catch(() => false)) {
      await this.addNoteButton.click();
      await this.page.waitForTimeout(300);
    }

    if (await this.noteTextarea.isVisible().catch(() => false)) {
      await this.noteTextarea.fill(noteText);
      await this.saveNoteButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  async getNotesCount(): Promise<number> {
    return await this.notesList.count();
  }

  async getNoteText(index: number): Promise<string> {
    try {
      const note = this.notesList.nth(index);
      return (await note.textContent()) || "";
    } catch {
      return "";
    }
  }

  async moveToAppliedStatus() {
    // Try dropdown method first
    if (await this.statusDropdown.isVisible().catch(() => false)) {
      await this.statusDropdown.selectOption("applied");
      await this.page.waitForTimeout(500);
      return;
    }

    // Try button method
    if (await this.moveToAppliedButton.isVisible().catch(() => false)) {
      await this.moveToAppliedButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  async isMarkedAsApplied(): Promise<boolean> {
    return await this.appliedBadge.isVisible().catch(() => false);
  }

  async getMatchScore(): Promise<number | null> {
    try {
      const text = await this.matchScore.textContent();
      const match = text?.match(/(\d+)%?/);
      return match ? parseInt(match[1]) : null;
    } catch {
      return null;
    }
  }
}
