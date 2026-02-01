import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page object for One-Click Apply functionality
 */
export class OneClickApplyPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateTo() {
    await this.goto("/dashboard");
    await this.skipSetupWizard();
  }

  // Locators
  get jobCards(): Locator {
    return this.page.locator("[data-testid='job-card'], [class*='job-card']");
  }

  get quickApplyButton(): Locator {
    return this.page.locator(
      "button:has-text('Quick Apply'), button:has-text('Apply'), [data-testid='quick-apply-btn']"
    );
  }

  get applyButtons(): Locator {
    return this.page.locator(
      "button:has-text('Quick Apply'), button:has-text('Apply')"
    );
  }

  get applicationPreview(): Locator {
    return this.page.locator("[data-testid='application-preview'], [role='dialog']");
  }

  get startAutomationButton(): Locator {
    return this.page.locator(
      "button:has-text('Start Automation'), button:has-text('Begin')"
    );
  }

  get pauseButton(): Locator {
    return this.page.locator(
      "button:has-text('Pause'), [data-testid='pause-btn']"
    );
  }

  get resumeButton(): Locator {
    return this.page.locator(
      "button:has-text('Resume'), [data-testid='resume-btn']"
    );
  }

  get stopButton(): Locator {
    return this.page.locator(
      "button:has-text('Stop'), [data-testid='stop-btn']"
    );
  }

  get automationStatus(): Locator {
    return this.page.locator(
      "[data-testid='automation-status'], [class*='status']"
    );
  }

  get formFieldsDetected(): Locator {
    return this.page.locator(
      "[data-testid='detected-fields'], [class*='field-list']"
    );
  }

  get profileSetupPrompt(): Locator {
    return this.page.locator(
      "text=set up your profile, text=configure profile"
    );
  }

  get atsBadge(): Locator {
    return this.page.locator(
      "[data-testid='ats-badge'], [class*='ats-']"
    );
  }

  get submitConfirmDialog(): Locator {
    return this.page.locator(
      "[data-testid='submit-confirm'], text=Ready to submit"
    );
  }

  // Actions
  async clickFirstJobCard() {
    const card = this.jobCards.first();
    await card.click();
    await this.waitForReady();
  }

  async clickQuickApply() {
    await this.quickApplyButton.click();
    await this.waitForReady();
  }

  async waitForApplicationPreview(timeout: number = 5000): Promise<boolean> {
    try {
      await this.applicationPreview.waitFor({ state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  }

  async startAutomation() {
    await this.startAutomationButton.click();
    await this.waitForReady();
  }

  async pauseAutomation() {
    await this.pauseButton.click();
    await this.page.waitForTimeout(500);
  }

  async resumeAutomation() {
    await this.resumeButton.click();
    await this.page.waitForTimeout(500);
  }

  async stopAutomation() {
    await this.stopButton.click();
    await this.page.waitForTimeout(500);
  }

  async getDetectedFieldsCount(): Promise<number> {
    try {
      const fields = await this.formFieldsDetected.locator("li, [class*='field-item']");
      return await fields.count();
    } catch {
      return 0;
    }
  }

  async waitForAtsBadge(timeout: number = 3000): Promise<boolean> {
    try {
      await this.atsBadge.waitFor({ state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  }

  async getAtsDetectionText(): Promise<string> {
    try {
      return (await this.atsBadge.textContent()) || "";
    } catch {
      return "";
    }
  }

  async hasProfileSetup(): Promise<boolean> {
    return await this.profileSetupPrompt.isVisible().catch(() => false);
  }

  async waitForSubmitConfirm(timeout: number = 5000): Promise<boolean> {
    try {
      await this.submitConfirmDialog.waitFor({ state: "visible", timeout });
      return true;
    } catch {
      return false;
    }
  }
}
