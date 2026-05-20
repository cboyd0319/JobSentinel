import { Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Settings modal page object.
 */
export class SettingsPage extends BasePage {
  async navigateTo() {
    await this.goto("/");
    await this.skipSetupWizard();
    await this.page.getByRole("button", { name: "Open settings" }).click();
    await this.dialog.waitFor({ state: "visible", timeout: 15000 });
  }

  get dialog(): Locator {
    return this.page.getByRole("dialog", { name: "Settings" });
  }

  get basicTab(): Locator {
    return this.dialog.getByRole("tab", { name: "Basic Settings" });
  }

  get advancedTab(): Locator {
    return this.dialog.getByRole("tab", { name: "Advanced Settings" });
  }

  get saveButton(): Locator {
    return this.dialog.getByRole("button", { name: "Save Changes" });
  }

  get cancelButton(): Locator {
    return this.dialog.getByRole("button", { name: "Cancel" });
  }

  get closeButton(): Locator {
    return this.dialog.getByRole("button", { name: "Close settings" });
  }

  get titleInput(): Locator {
    return this.dialog.getByPlaceholder("Add a job title...");
  }

  get skillInput(): Locator {
    return this.dialog.getByPlaceholder("Add a skill...");
  }

  get minimumSalaryInput(): Locator {
    return this.dialog.getByPlaceholder("e.g., 60000");
  }

  get targetSalaryInput(): Locator {
    return this.dialog.getByPlaceholder("e.g., 100000");
  }

  get remoteCheckbox(): Locator {
    return this.dialog.getByLabel("Remote", { exact: true });
  }

  get hybridCheckbox(): Locator {
    return this.dialog.getByLabel("Hybrid", { exact: true });
  }

  get onsiteCheckbox(): Locator {
    return this.dialog.getByLabel("On-site", { exact: true });
  }

  get slackWebhookInput(): Locator {
    return this.dialog.getByPlaceholder(/Slack webhook URL/i);
  }

  get fromEmailInput(): Locator {
    return this.dialog.locator("input[autocomplete='email']").nth(1);
  }

  get toEmailInput(): Locator {
    return this.dialog.locator("input[placeholder='you@email.com']");
  }

  get backupButton(): Locator {
    return this.dialog.getByRole("button", { name: "Backup Settings" });
  }

  get restoreButton(): Locator {
    return this.dialog.getByRole("button", { name: "Restore Settings" });
  }

  get feedbackButton(): Locator {
    return this.dialog.getByRole("button", { name: "Send Feedback" });
  }

  async switchTab(tab: "basic" | "advanced") {
    await (tab === "basic" ? this.basicTab : this.advancedTab).click();
    await this.dialog
      .getByRole("tabpanel")
      .filter({ hasText: tab === "basic" ? "Job Titles You Want" : "Get Notified" })
      .waitFor({ state: "visible", timeout: 5000 });
  }

  section(name: string | RegExp): Locator {
    return this.dialog.locator("section").filter({ hasText: name }).first();
  }

  async addListValue(sectionName: string | RegExp, value: string) {
    const section = this.section(sectionName);
    await section.locator("input").first().fill(value);
    await section.getByRole("button", { name: "Add" }).click();
  }

  async removeBadge(value: string) {
    await this.dialog.getByRole("button", { name: `Remove ${value}` }).click();
  }

  async setCheckbox(locator: Locator, checked: boolean) {
    if ((await locator.isChecked()) !== checked) {
      await locator.click();
    }
  }

  async toggleEmailAlerts() {
    await this.dialog.getByTestId("email-alerts-toggle").click();
  }

  async saveSettings() {
    await this.saveButton.click();
    await this.dialog.waitFor({ state: "hidden", timeout: 10000 });
  }
}
