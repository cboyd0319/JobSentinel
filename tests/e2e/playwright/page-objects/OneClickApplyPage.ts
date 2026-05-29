import { expect, Locator, Page } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page object for the Application Assist settings surface.
 */
export class OneClickApplyPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async navigateTo() {
    await this.goto("/");
    await this.skipSetupWizard();
    await this.navigateToPage("Application Assist");
    await expect(this.heading).toBeVisible({ timeout: 15000 });
    await expect(this.profileForm).toBeVisible({ timeout: 15000 });
  }

  get heading(): Locator {
    return this.page.getByRole("heading", { name: "Application Assist Settings" });
  }

  get profileTab(): Locator {
    return this.page.getByRole("tab", { name: "Profile", exact: true });
  }

  get screeningTab(): Locator {
    return this.page.getByRole("tab", { name: "Screening Questions" });
  }

  get profileForm(): Locator {
    return this.page.getByRole("form", { name: "Application profile form" });
  }

  get fullNameInput(): Locator {
    return this.page.getByLabel(/Full Name/);
  }

  get emailInput(): Locator {
    return this.page.getByLabel(/Email/);
  }

  get phoneInput(): Locator {
    return this.page.getByLabel("Phone");
  }

  get linkedInInput(): Locator {
    return this.page.getByRole("textbox", { name: "LinkedIn" });
  }

  get githubInput(): Locator {
    return this.page.getByRole("textbox", { name: "Code profile (if relevant)" });
  }

  get portfolioInput(): Locator {
    return this.page.getByRole("textbox", { name: "Portfolio" });
  }

  get websiteInput(): Locator {
    return this.page.getByRole("textbox", { name: "Personal website or credential page" });
  }

  get resumePathInput(): Locator {
    return this.page.getByLabel("Resume file path");
  }

  get browseResumeButton(): Locator {
    return this.page.getByRole("button", { name: "Browse..." });
  }

  get maxApplicationsSelect(): Locator {
    return this.page.getByLabel("Daily application review limit");
  }

  get manualApprovalCheckbox(): Locator {
    return this.page.getByLabel(/Require manual approval/);
  }

  get saveProfileButton(): Locator {
    return this.page.getByRole("button", { name: "Save Profile" });
  }

  get unsavedChangesIndicator(): Locator {
    return this.page.getByText("You have unsaved changes");
  }

  get screeningHeading(): Locator {
    return this.page.getByRole("heading", { name: "Screening Question Answers" });
  }

  get addAnswerButton(): Locator {
    return this.page.getByRole("button", { name: "Add Answer" });
  }

  get addFirstAnswerButton(): Locator {
    return this.page.getByRole("button", { name: "Add Your First Answer" });
  }

  get screeningAnswerDialog(): Locator {
    return this.page.getByRole("dialog", { name: /Screening Answer/ });
  }

  get questionPatternInput(): Locator {
    return this.page.getByLabel(/Question text to match/);
  }

  get answerTypeSelect(): Locator {
    return this.page.getByLabel("Answer type");
  }

  get answerInput(): Locator {
    return this.page.getByLabel(/Your Answer/);
  }

  get notesInput(): Locator {
    return this.page.getByLabel("Notes (optional)");
  }

  get saveAnswerButton(): Locator {
    return this.screeningAnswerDialog.getByRole("button", { name: /Save Answer|Update Answer/ });
  }

  get editAnswerButtons(): Locator {
    return this.page.getByRole("button", { name: "Edit answer" });
  }

  statCard(label: string): Locator {
    return this.page.getByRole("article", { name: `${label} statistic` });
  }

  statValue(label: string): Locator {
    return this.page.getByLabel(`${label} value:`, { exact: false });
  }

  async switchToScreeningQuestions() {
    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await expect(this.screeningTab).toBeVisible({ timeout: 5000 });
        await this.screeningTab.click();
        await expect(this.screeningTab).toHaveAttribute("aria-selected", "true");
        await expect(this.screeningHeading).toBeVisible({ timeout: 10000 });
        return;
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Unable to switch to screening questions");
  }

  async fillProfile(values: {
    fullName?: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    website?: string;
    maxApplications?: string;
  }) {
    if (values.fullName !== undefined) await this.fullNameInput.fill(values.fullName);
    if (values.email !== undefined) await this.emailInput.fill(values.email);
    if (values.phone !== undefined) await this.phoneInput.fill(values.phone);
    if (values.linkedin !== undefined) await this.linkedInInput.fill(values.linkedin);
    if (values.github !== undefined) await this.githubInput.fill(values.github);
    if (values.portfolio !== undefined) await this.portfolioInput.fill(values.portfolio);
    if (values.website !== undefined) await this.websiteInput.fill(values.website);
    if (values.maxApplications !== undefined) {
      await this.maxApplicationsSelect.selectOption(values.maxApplications);
    }
  }

  async openCommonScreeningAnswer(label: string) {
    await this.page.getByRole("button", { name: `+ ${label}` }).click();
    await expect(this.screeningAnswerDialog).toBeVisible();
  }

  async openBlankScreeningAnswer() {
    await this.addAnswerButton.click();
    await expect(this.screeningAnswerDialog).toBeVisible();
  }

  async saveScreeningAnswer(values: {
    pattern?: string;
    answer?: string;
    type?: string;
    notes?: string;
  }) {
    if (values.pattern !== undefined) await this.questionPatternInput.fill(values.pattern);
    if (values.type !== undefined) await this.answerTypeSelect.selectOption(values.type);
    if (values.answer !== undefined) await this.answerInput.fill(values.answer);
    if (values.notes !== undefined) await this.notesInput.fill(values.notes);
    await this.saveAnswerButton.click();
  }
}
