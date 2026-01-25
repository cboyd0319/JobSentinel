import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Resume page object - resume upload and matching
 */
export class ResumePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateTo() {
    await this.goto("/");
    await this.skipSetupWizard();
    await this.navigateWithKeyboard(3); // Cmd+3 for Resume page
  }

  get uploadArea(): Locator {
    return this.page.locator("[data-testid='resume-upload-area']");
  }

  get uploadInput(): Locator {
    return this.page.locator("input[type='file']");
  }

  get uploadButton(): Locator {
    return this.page.locator("[data-testid='btn-upload-resume']");
  }

  get resumePreview(): Locator {
    return this.page.locator("[data-testid='resume-preview']");
  }

  get matchButton(): Locator {
    return this.page.locator("[data-testid='btn-match-resume']");
  }

  get matchResults(): Locator {
    return this.page.locator("[data-testid='match-results']");
  }

  get matchScore(): Locator {
    return this.page.locator("[data-testid='match-score']");
  }

  get suggestions(): Locator {
    return this.page.locator("[data-testid='match-suggestions']");
  }

  get deleteButton(): Locator {
    return this.page.locator("[data-testid='btn-delete-resume']");
  }

  async uploadResume(filePath: string) {
    // Check if upload input exists
    const inputExists = await this.uploadInput.count() > 0;

    if (inputExists) {
      await this.uploadInput.setInputFiles(filePath);
    } else {
      // Click upload area to trigger file dialog
      await this.uploadArea.click();
      await this.page.waitForTimeout(200);
      await this.uploadInput.setInputFiles(filePath);
    }

    await this.waitForReady();
  }

  async matchWithJob(jobTitle?: string) {
    if (jobTitle) {
      // Select specific job from dropdown if provided
      const jobSelector = this.page.locator("[data-testid='job-selector']");
      await jobSelector.click();
      await this.page.locator(`text=${jobTitle}`).click();
    }

    await this.matchButton.click();
    await this.waitForReady();
  }

  async getMatchScore(): Promise<number> {
    const scoreText = await this.matchScore.textContent();
    const match = scoreText?.match(/(\d+)%?/);
    return match ? parseInt(match[1]) : 0;
  }

  async getSuggestions(): Promise<string[]> {
    const items = this.suggestions.locator("li");
    const count = await items.count();
    const suggestions: string[] = [];

    for (let i = 0; i < count; i++) {
      const text = await items.nth(i).textContent();
      if (text) suggestions.push(text);
    }

    return suggestions;
  }

  async deleteResume() {
    if (await this.deleteButton.isVisible().catch(() => false)) {
      await this.deleteButton.click();

      // Handle confirmation dialog
      const confirmButton = this.page.locator("button:has-text('Delete'), button:has-text('Confirm')");
      if (await confirmButton.isVisible().catch(() => false)) {
        await confirmButton.click();
      }

      await this.waitForReady();
    }
  }

  async hasResume(): Promise<boolean> {
    return await this.resumePreview.isVisible().catch(() => false);
  }
}
