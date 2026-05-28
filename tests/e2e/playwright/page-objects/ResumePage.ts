import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Resume matcher page object.
 */
export class ResumePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateTo() {
    await this.goto("/");
    await this.skipSetupWizard();
    await this.navigateToPage("Resumes");
    await expect(this.heading).toBeVisible({ timeout: 15000 });
  }

  get heading(): Locator {
    return this.page.getByRole("heading", { name: "Resume Matcher" });
  }

  get emptyState(): Locator {
    return this.page.getByRole("heading", { name: "No Resume Uploaded" });
  }

  get uploadResumeButton(): Locator {
    return this.page.getByRole("button", { name: /Upload Resume/i }).first();
  }

  get importJsonButton(): Locator {
    return this.page.getByRole("button", { name: /Import JSON Resume/i }).first();
  }

  get activeResumeHeading(): Locator {
    return this.page.getByRole("heading", { name: "Active Resume" });
  }

  get skillsHeading(): Locator {
    return this.page.getByRole("heading", { name: "Skills Management" });
  }

  get recentMatchesHeading(): Locator {
    return this.page.getByRole("heading", { name: "Recent Match Results" });
  }

  get libraryButton(): Locator {
    return this.page.getByRole("button", { name: /Library \(/ });
  }

  get categoryFilter(): Locator {
    return this.page.locator("select").first();
  }

  async openAddSkillForm() {
    await this.openSkillFormWithButton(this.page.getByRole("button", { name: /^Add$/ }));
  }

  async openEmptyStateAddSkillForm() {
    await this.openSkillFormWithButton(this.page.getByRole("button", { name: "Add Skill" }).last());
  }

  private async openSkillFormWithButton(button: Locator) {
    const addSkillHeading = this.page.getByRole("heading", { name: "Add New Skill" });

    await expect(button).toBeVisible({ timeout: 15000 });
    await button.scrollIntoViewIfNeeded();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await button.click({ force: attempt > 0 });

      if (await addSkillHeading.isVisible().catch(() => false)) {
        return;
      }
    }

    await button.evaluate((element: HTMLElement) => element.click());
    await expect(addSkillHeading).toBeVisible({ timeout: 15000 });
  }

  async fillSkillForm(options: {
    name: string;
    proficiency?: string;
    category?: string;
    years?: string;
  }) {
    await this.page.getByLabel("Skill name").fill(options.name);

    if (options.proficiency) {
      await this.page.getByLabel("Proficiency level").selectOption(options.proficiency);
    }

    if (options.category) {
      await this.page.getByLabel("Skill category").selectOption(options.category);
    }

    if (options.years) {
      await this.page.getByLabel("Years of experience").fill(options.years);
    }
  }

  async saveNewSkill() {
    await this.page.getByRole("button", { name: "Add Skill" }).first().click();
    await this.waitForReady();
  }

  async editSkill(skillName: string, nextName: string, nextProficiency: string) {
    await this.page.getByLabel(`Edit skill: ${skillName}`).click();
    await this.page.locator('input[placeholder="Skill name"]').fill(nextName);
    await this.page.locator("select").nth(1).selectOption(nextProficiency);
    await this.page.getByRole("button", { name: "Save" }).click();
    await this.waitForReady();
  }

  async deleteSkill(skillName: string) {
    await this.page.getByLabel(`Delete skill: ${skillName}`).click();
    const dialog = this.page.getByRole("dialog", { name: "Delete Skill?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(dialog).toBeHidden();
    await this.waitForReady();
  }

  async openLibrary() {
    await this.libraryButton.click();
    await expect(this.page.getByRole("heading", { name: "Resume Library" })).toBeVisible();
  }

  async activateResume(name: string) {
    await this.page.getByText(name).click();
    await this.waitForReady();
  }

  async deleteLibraryResume(name: string) {
    await this.page.getByLabel(`Delete resume: ${name}`).click();
    const dialog = this.page.getByRole("dialog", { name: "Delete Resume?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Delete" }).click();
    await expect(dialog).toBeHidden();
    await this.waitForReady();
  }
}
