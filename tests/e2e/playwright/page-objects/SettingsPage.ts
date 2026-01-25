import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Settings page object
 */
export class SettingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateTo() {
    await this.goto("/");
    await this.skipSetupWizard();

    // Open settings - usually via gear icon or keyboard shortcut
    const settingsButton = this.page.locator("[data-testid='btn-settings'], button[aria-label*='Settings']");
    if (await settingsButton.isVisible().catch(() => false)) {
      await settingsButton.click();
    } else {
      // Try keyboard shortcut
      await this.page.keyboard.press("Meta+,");
    }

    await this.waitForReady();
  }

  get generalTab(): Locator {
    return this.page.locator("[data-testid='tab-general'], button:has-text('General')");
  }

  get notificationsTab(): Locator {
    return this.page.locator("[data-testid='tab-notifications'], button:has-text('Notifications')");
  }

  get privacyTab(): Locator {
    return this.page.locator("[data-testid='tab-privacy'], button:has-text('Privacy')");
  }

  get advancedTab(): Locator {
    return this.page.locator("[data-testid='tab-advanced'], button:has-text('Advanced')");
  }

  get saveButton(): Locator {
    return this.page.locator("[data-testid='btn-save-settings'], button:has-text('Save')");
  }

  get resetButton(): Locator {
    return this.page.locator("[data-testid='btn-reset-settings'], button:has-text('Reset')");
  }

  get successMessage(): Locator {
    return this.page.locator("[data-testid='settings-success']");
  }

  async switchTab(tab: "general" | "notifications" | "privacy" | "advanced") {
    const tabMap = {
      general: this.generalTab,
      notifications: this.notificationsTab,
      privacy: this.privacyTab,
      advanced: this.advancedTab,
    };

    await tabMap[tab].click();
    await this.waitForReady();
  }

  async updateSetting(name: string, value: string | boolean) {
    const input = this.page.locator(`input[name="${name}"]`);

    if (typeof value === "boolean") {
      // Checkbox or toggle
      const isChecked = await input.isChecked().catch(() => false);
      if (isChecked !== value) {
        await input.click();
      }
    } else {
      // Text input
      await input.fill(value);
    }
  }

  async saveSettings() {
    await this.saveButton.click();
    await this.waitForReady();
  }

  async resetSettings() {
    await this.resetButton.click();

    // Handle confirmation dialog
    const confirmButton = this.page.locator("button:has-text('Reset'), button:has-text('Confirm')");
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
    }

    await this.waitForReady();
  }

  async hasSuccessMessage(): Promise<boolean> {
    return await this.successMessage.isVisible().catch(() => false);
  }

  async getSettingValue(name: string): Promise<string | boolean> {
    const input = this.page.locator(`input[name="${name}"]`);
    const inputType = await input.getAttribute("type");

    if (inputType === "checkbox") {
      return await input.isChecked();
    }

    return (await input.inputValue()) || "";
  }
}
